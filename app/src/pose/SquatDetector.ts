import {angleDeg} from './geometry';
import {DEFAULT_SQUAT_CONFIG, SquatConfig} from './squat-config';
import {KP, Keypoint, Pose} from './types';
import type {DetectorEvent} from './RepDetector';

export type SquatPhase = 'up' | 'down';

/** Живые сигналы — тестовая страничка читает их после каждого process(). */
export interface SquatDebug {
  inPosition: boolean;
  /** Сглаженный зазор таз↔колени в долях торса; null если точек нет. */
  gap: number | null;
  /** Вертикальность торса (бёдра.y − плечи.y)/торс; null если нет плеч/бёдер. */
  torsoUprightFrac: number | null;
  /** Сглаженный средний угол колена (бедро–колено–лодыжка); null без лодыжек. */
  kneeAngle: number | null;
  /**
   * Сглаженный разброс колен по высоте в долях торса. В приседе ≈ 0,
   * в выпаде заднее колено у пола — разброс большой (повтор не считается).
   */
  kneeSplit: number | null;
  /** Сглаженная просадка таза от верхней базовой линии, в долях торса. */
  hipDescent: number | null;
  phase: SquatPhase;
  visibleKeypoints: number;
  /** Отношение высота/ширина рамки тела (стоя велико, в планке мало). */
  bodyAspect: number | null;
}

type State = 'noPosition' | 'holding' | 'up' | 'down';

interface Pt {
  x: number;
  y: number;
}

const LEGS = [
  {hip: KP.leftHip, knee: KP.leftKnee, ankle: KP.leftAnkle},
  {hip: KP.rightHip, knee: KP.rightKnee, ankle: KP.rightAnkle},
] as const;

/**
 * Считает приседания из потока поз. Позиция подтверждается гейтом «стою в
 * полный рост» (торс вертикален, видны плечи/бёдра/колени). Повтор — конечный
 * автомат вверх→вниз→вверх по зазору таз↔колени: стоя бёдра значительно выше
 * колен, в нижней точке приседа таз опускается к их уровню. Зазор нормирован
 * на длину торса, поэтому не зависит от расстояния до камеры и одинаково
 * работает для фронтального ракурса и вида сбоку (угол колена во фронтальной
 * 2D-проекции почти не меняется — он остаётся вторичным сигналом для отладки).
 */
export class SquatDetector {
  private state: State = 'noPosition';
  private holdStartMs = 0;
  private lastRepMs = Number.NEGATIVE_INFINITY;
  private lastGoodMs = Number.NEGATIVE_INFINITY;

  private smoothedGap: number | null = null;
  private smoothedKnee: number | null = null;
  private smoothedSplit: number | null = null;
  // Счётчики валидных кадров фазы «вниз»: разброс колен выше/не выше порога.
  // По большинству на выходе из «вниз» повтор либо присед, либо выпад.
  private downSplitHigh = 0;
  private downSplitLow = 0;
  private smoothedDescent = 0;
  private baselineTopY: number | null = null;

  debug: SquatDebug = {
    inPosition: false,
    gap: null,
    torsoUprightFrac: null,
    kneeAngle: null,
    kneeSplit: null,
    hipDescent: null,
    phase: 'up',
    visibleKeypoints: 0,
    bodyAspect: null,
  };

  constructor(private readonly cfg: SquatConfig = DEFAULT_SQUAT_CONFIG) {}

  process(pose: Pose, tMs: number): DetectorEvent[] {
    this.debug.visibleKeypoints = this.countVisible(pose);
    this.debug.bodyAspect = this.bodyAspect(pose);

    const shoulder = this.mid(pose, KP.leftShoulder, KP.rightShoulder);
    const hip = this.mid(pose, KP.leftHip, KP.rightHip);
    const knee = this.mid(pose, KP.leftKnee, KP.rightKnee);
    const torsoLen =
      shoulder && hip ? Math.hypot(shoulder.x - hip.x, shoulder.y - hip.y) : 0;

    const upright =
      shoulder && hip && torsoLen > 1e-6
        ? (hip.y - shoulder.y) / torsoLen
        : null;
    this.debug.torsoUprightFrac = upright;

    const rawGap =
      hip && knee && torsoLen > 1e-6 ? (knee.y - hip.y) / torsoLen : null;

    const inGate =
      upright !== null &&
      rawGap !== null &&
      Math.abs(rawGap) <= this.cfg.maxPlausibleGap &&
      upright >= this.cfg.torsoUprightMinFrac &&
      rawGap >= this.cfg.gapGateMinFrac;

    if (!inGate) {
      // Кратковременная пропажа точек не должна рвать позицию — «коастим»
      // в течение grace-окна, сохраняя состояние и базовые линии.
      if (
        this.state !== 'noPosition' &&
        tMs - this.lastGoodMs <= this.cfg.gateLostGraceMs
      ) {
        return [];
      }
      return this.dropPosition();
    }
    this.lastGoodMs = tMs;

    const gap = this.updateGap(rawGap!);
    this.debug.gap = gap;
    this.debug.kneeAngle = this.updateKnee(pose);
    const split = this.updateSplit(pose, torsoLen);
    this.debug.kneeSplit = split;
    this.debug.hipDescent = this.updateDescent(hip!, torsoLen);

    switch (this.state) {
      case 'noPosition':
        this.state = 'holding';
        this.holdStartMs = tMs;
        this.debug.inPosition = false;
        return [];
      case 'holding':
        if (tMs - this.holdStartMs >= this.cfg.positionHoldMs) {
          this.state = 'up';
          this.debug.inPosition = true;
          this.debug.phase = 'up';
          return ['positionAcquired'];
        }
        return [];
      case 'up':
        if (gap <= this.cfg.gapDownFrac) {
          this.state = 'down';
          this.debug.phase = 'down';
          this.downSplitHigh = 0;
          this.downSplitLow = 0;
        }
        return [];
      case 'down':
        if (split !== null) {
          if (split > this.cfg.maxKneeSplitFrac) {
            this.downSplitHigh++;
          } else {
            this.downSplitLow++;
          }
        }
        if (gap >= this.cfg.gapUpFrac) {
          this.state = 'up';
          this.debug.phase = 'up';
          // Выпад, а не присед: колени были разъехавшимися по высоте
          // большинство фазы «вниз» (заднее колено у пола утягивает
          // середину колен вниз, и зазор проваливается без приседа).
          const isLunge = this.downSplitHigh > this.downSplitLow;
          if (!isLunge && tMs - this.lastRepMs >= this.cfg.minRepDurationMs) {
            this.lastRepMs = tMs;
            return ['repCounted'];
          }
        }
        return [];
    }
  }

  private updateGap(raw: number): number {
    this.smoothedGap =
      this.smoothedGap === null
        ? raw
        : this.cfg.gapSmoothing * raw +
          (1 - this.cfg.gapSmoothing) * this.smoothedGap;
    return this.smoothedGap;
  }

  /** Сглаженный разброс колен по высоте; null если видно меньше двух колен. */
  private updateSplit(pose: Pose, torsoLen: number): number | null {
    const l = this.vis(pose, KP.leftKnee);
    const r = this.vis(pose, KP.rightKnee);
    if (!l || !r || torsoLen < 1e-6) {
      this.smoothedSplit = null;
      return null;
    }
    const raw = Math.abs(l.y - r.y) / torsoLen;
    this.smoothedSplit =
      this.smoothedSplit === null
        ? raw
        : this.cfg.gapSmoothing * raw +
          (1 - this.cfg.gapSmoothing) * this.smoothedSplit;
    return this.smoothedSplit;
  }

  /** Сглаженный средний угол колена по ногам с видимой лодыжкой. */
  private updateKnee(pose: Pose): number | null {
    const angles: number[] = [];
    for (const leg of LEGS) {
      const h = this.vis(pose, leg.hip);
      const k = this.vis(pose, leg.knee);
      const a = this.vis(pose, leg.ankle);
      if (h && k && a) {
        angles.push(angleDeg(h, k, a));
      }
    }
    if (angles.length === 0) {
      this.smoothedKnee = null;
      return null;
    }
    const raw = angles.reduce((sum, v) => sum + v, 0) / angles.length;
    this.smoothedKnee =
      this.smoothedKnee === null
        ? raw
        : this.cfg.kneeAngleSmoothing * raw +
          (1 - this.cfg.kneeAngleSmoothing) * this.smoothedKnee;
    return this.smoothedKnee;
  }

  /** Просадка таза от «верхней» базовой линии, в долях торса (вторичный). */
  private updateDescent(hip: Pt, torsoLen: number): number | null {
    if (torsoLen < 1e-6) {
      return null;
    }
    const y = hip.y;
    if (this.baselineTopY === null || y < this.baselineTopY) {
      this.baselineTopY = y;
    } else {
      this.baselineTopY += (y - this.baselineTopY) * this.cfg.baselineRelaxAlpha;
    }
    const raw = Math.max(0, (y - this.baselineTopY) / torsoLen);
    if (raw > this.cfg.maxPlausibleDescent) {
      return null;
    }
    this.smoothedDescent =
      this.cfg.descentSmoothing * raw +
      (1 - this.cfg.descentSmoothing) * this.smoothedDescent;
    return this.smoothedDescent;
  }

  private bodyAspect(pose: Pose): number | null {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let n = 0;
    for (let i = 0; i < pose.length; i++) {
      const p = pose[i];
      if (!p || p.score < this.cfg.minKeypointScore) {
        continue;
      }
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
      n++;
    }
    if (n < 4) {
      return null;
    }
    const w = maxX - minX;
    if (w < 1e-6) {
      return null;
    }
    return (maxY - minY) / w;
  }

  private countVisible(pose: Pose): number {
    let n = 0;
    for (let i = 0; i < pose.length; i++) {
      if (pose[i] && pose[i].score >= this.cfg.minKeypointScore) {
        n++;
      }
    }
    return n;
  }

  private dropPosition(): DetectorEvent[] {
    const wasAcquired = this.state === 'up' || this.state === 'down';
    this.state = 'noPosition';
    this.smoothedGap = null;
    this.smoothedKnee = null;
    this.smoothedSplit = null;
    this.smoothedDescent = 0;
    this.baselineTopY = null;
    this.debug.inPosition = false;
    this.debug.phase = 'up';
    this.debug.gap = null;
    this.debug.kneeAngle = null;
    this.debug.kneeSplit = null;
    this.debug.hipDescent = null;
    return wasAcquired ? ['positionLost'] : [];
  }

  private vis(pose: Pose, idx: number): Keypoint | null {
    const p = pose[idx];
    if (!p || p.score < this.cfg.minKeypointScore) {
      return null;
    }
    return p;
  }

  /** Среднее видимых точек из списка; null если ни одной. */
  private mid(pose: Pose, ...idxs: number[]): Pt | null {
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (const i of idxs) {
      const p = this.vis(pose, i);
      if (p) {
        sx += p.x;
        sy += p.y;
        n++;
      }
    }
    return n === 0 ? null : {x: sx / n, y: sy / n};
  }
}
