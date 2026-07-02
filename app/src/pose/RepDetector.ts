import {DEFAULT_CONFIG, DetectorConfig} from './config';
import {angleDeg} from './geometry';
import {KP, Keypoint, Pose} from './types';

export type DetectorEvent = 'positionAcquired' | 'positionLost' | 'repCounted';

/** Каким гейтом подтверждена позиция (для отладки/калибровки). */
export type GateMode = 'plank' | 'fallback' | 'none';
export type Phase = 'up' | 'down';

/** Живые значения сигналов — демо/отладка читают их после каждого process(). */
export interface DetectorDebug {
  inPosition: boolean;
  gateMode: GateMode;
  /** Угол корпуса плечо–бедро–колено (гейт планки); null если ноги не видны. */
  torsoAngle: number | null;
  /** Сглаженный средний угол локтя; null если руки не видны. */
  elbowAngle: number | null;
  /** Сглаженное проседание корпуса в долях длины торса; null если нет торса. */
  descent: number | null;
  phase: Phase;
}

type State = 'noPosition' | 'holding' | 'up' | 'down';

interface Pt {
  x: number;
  y: number;
}

const ARMS = [
  {shoulder: KP.leftShoulder, elbow: KP.leftElbow, wrist: KP.leftWrist},
  {shoulder: KP.rightShoulder, elbow: KP.rightElbow, wrist: KP.rightWrist},
] as const;

/**
 * Считает отжимания из потока póz. Позиция подтверждается «горизонтальным»
 * гейтом (планка по плечам/бёдрам/коленям; запасной гейт по рукам, если ноги
 * не в кадре). Повтор засчитывается по конечному автомату вверх→вниз→вверх,
 * где «вниз» даёт ЛЮБОЙ из сигналов: вертикальное проседание корпуса
 * (основной, устойчив для фронтального ракурса) ИЛИ сгибание локтя (запасной).
 */
export class RepDetector {
  private state: State = 'noPosition';
  private holdStartMs = 0;
  private lastRepMs = Number.NEGATIVE_INFINITY;

  private smoothedElbow: number | null = null;
  private smoothedDescent = 0;
  private baselineTopY: number | null = null;

  debug: DetectorDebug = {
    inPosition: false,
    gateMode: 'none',
    torsoAngle: null,
    elbowAngle: null,
    descent: null,
    phase: 'up',
  };

  constructor(private readonly cfg: DetectorConfig = DEFAULT_CONFIG) {}

  process(pose: Pose, tMs: number): DetectorEvent[] {
    const gate = this.evaluateGate(pose);
    this.debug.gateMode = gate.mode;
    this.debug.torsoAngle = gate.torsoAngle;

    if (!gate.inPosition) {
      return this.dropPosition();
    }

    const elbow = this.updateElbow(pose);
    const descent = this.updateDescent(pose);
    this.debug.elbowAngle = elbow;
    this.debug.descent = descent;

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
        if (this.isDown(elbow, descent)) {
          this.state = 'down';
          this.debug.phase = 'down';
        }
        return [];
      case 'down':
        if (this.isUp(elbow, descent)) {
          this.state = 'up';
          this.debug.phase = 'up';
          if (tMs - this.lastRepMs >= this.cfg.minRepDurationMs) {
            this.lastRepMs = tMs;
            return ['repCounted'];
          }
        }
        return [];
    }
  }

  private isDown(elbow: number | null, descent: number | null): boolean {
    const elbowDown = elbow !== null && elbow <= this.cfg.elbowFlexedDeg;
    const descentDown = descent !== null && descent >= this.cfg.descentDownFrac;
    return elbowDown || descentDown;
  }

  private isUp(elbow: number | null, descent: number | null): boolean {
    const elbowUp = elbow !== null && elbow >= this.cfg.elbowExtendedDeg;
    const descentUp = descent !== null && descent <= this.cfg.descentUpFrac;
    return elbowUp || descentUp;
  }

  private dropPosition(): DetectorEvent[] {
    const wasAcquired = this.state === 'up' || this.state === 'down';
    this.state = 'noPosition';
    this.smoothedElbow = null;
    this.smoothedDescent = 0;
    this.baselineTopY = null;
    this.debug.inPosition = false;
    this.debug.phase = 'up';
    this.debug.elbowAngle = null;
    this.debug.descent = null;
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

  private evaluateGate(pose: Pose): {
    inPosition: boolean;
    mode: GateMode;
    torsoAngle: number | null;
  } {
    const shoulder = this.mid(pose, KP.leftShoulder, KP.rightShoulder);
    const hip = this.mid(pose, KP.leftHip, KP.rightHip);
    const knee = this.mid(pose, KP.leftKnee, KP.rightKnee);

    // Строгий гейт планки — тело и ноги видны: корпус должен быть прямым.
    if (shoulder && hip && knee) {
      const torsoAngle = angleDeg(shoulder, hip, knee);
      return {
        inPosition: torsoAngle >= this.cfg.plankBodyMinAngleDeg,
        mode: 'plank',
        torsoAngle,
      };
    }

    // Запасной гейт — ноги вне кадра: плечи + хотя бы одна рука с запястьем
    // ниже плеча (иначе строгое требование ног обнулило бы счёт).
    if (shoulder) {
      for (const arm of ARMS) {
        const s = this.vis(pose, arm.shoulder);
        const e = this.vis(pose, arm.elbow);
        const w = this.vis(pose, arm.wrist);
        if (s && e && w && w.y > s.y) {
          return {inPosition: true, mode: 'fallback', torsoAngle: null};
        }
      }
    }
    return {inPosition: false, mode: 'none', torsoAngle: null};
  }

  /** Сглаженный средний угол локтя по видимым рукам; null если рук нет. */
  private updateElbow(pose: Pose): number | null {
    const angles: number[] = [];
    for (const arm of ARMS) {
      const s = this.vis(pose, arm.shoulder);
      const e = this.vis(pose, arm.elbow);
      const w = this.vis(pose, arm.wrist);
      if (s && e && w) {
        angles.push(angleDeg(s, e, w));
      }
    }
    if (angles.length === 0) {
      this.smoothedElbow = null;
      return null;
    }
    const raw = angles.reduce((sum, v) => sum + v, 0) / angles.length;
    this.smoothedElbow =
      this.smoothedElbow === null
        ? raw
        : this.cfg.angleSmoothing * raw +
          (1 - this.cfg.angleSmoothing) * this.smoothedElbow;
    return this.smoothedElbow;
  }

  /**
   * Проседание корпуса: насколько плечи опустились относительно «верхней»
   * (наивысшей) позиции, нормировано на длину торса (плечо–бедро). Возвращает
   * null, если не видно плеч+бёдер. Базовая линия следует за наивысшей точкой
   * и медленно сползает, чтобы адаптироваться к сдвигам позы.
   */
  private updateDescent(pose: Pose): number | null {
    const shoulder = this.mid(pose, KP.leftShoulder, KP.rightShoulder);
    const hip = this.mid(pose, KP.leftHip, KP.rightHip);
    if (!shoulder || !hip) {
      return null;
    }
    const torsoLen = Math.hypot(shoulder.x - hip.x, shoulder.y - hip.y);
    if (torsoLen < 1e-6) {
      return null;
    }
    const y = shoulder.y;
    if (this.baselineTopY === null || y < this.baselineTopY) {
      // Новая «верхняя» точка (плечи выше всего = наименьший y).
      this.baselineTopY = y;
    } else {
      this.baselineTopY += (y - this.baselineTopY) * this.cfg.baselineRelaxAlpha;
    }
    const raw = Math.max(0, (y - this.baselineTopY) / torsoLen);
    this.smoothedDescent =
      this.cfg.descentSmoothing * raw +
      (1 - this.cfg.descentSmoothing) * this.smoothedDescent;
    return this.smoothedDescent;
  }
}
