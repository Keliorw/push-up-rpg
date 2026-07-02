import {DEFAULT_CONFIG, DetectorConfig} from './config';
import {angleDeg} from './geometry';
import {KP, Pose} from './types';

export type DetectorEvent = 'positionAcquired' | 'positionLost' | 'repCounted';

type State = 'noPosition' | 'holding' | 'up' | 'down';

const ARMS = [
  {shoulder: KP.leftShoulder, elbow: KP.leftElbow, wrist: KP.leftWrist},
  {shoulder: KP.rightShoulder, elbow: KP.rightElbow, wrist: KP.rightWrist},
] as const;

export class RepDetector {
  private state: State = 'noPosition';
  private holdStartMs = 0;
  private lastRepMs = Number.NEGATIVE_INFINITY;
  private smoothedAngle: number | null = null;

  constructor(private readonly cfg: DetectorConfig = DEFAULT_CONFIG) {}

  process(pose: Pose, tMs: number): DetectorEvent[] {
    const angle = this.meanElbowAngle(pose);
    if (angle === null) {
      return this.dropPosition();
    }
    this.smoothedAngle =
      this.smoothedAngle === null
        ? angle
        : this.cfg.angleSmoothing * angle +
          (1 - this.cfg.angleSmoothing) * this.smoothedAngle;
    const a = this.smoothedAngle;

    switch (this.state) {
      case 'noPosition':
        this.state = 'holding';
        this.holdStartMs = tMs;
        return [];
      case 'holding':
        if (tMs - this.holdStartMs >= this.cfg.positionHoldMs) {
          this.state = 'up';
          return ['positionAcquired'];
        }
        return [];
      case 'up':
        if (a <= this.cfg.elbowFlexedDeg) {
          this.state = 'down';
        }
        return [];
      case 'down':
        if (a >= this.cfg.elbowExtendedDeg) {
          this.state = 'up';
          if (tMs - this.lastRepMs >= this.cfg.minRepDurationMs) {
            this.lastRepMs = tMs;
            return ['repCounted'];
          }
        }
        return [];
    }
  }

  private dropPosition(): DetectorEvent[] {
    const wasAcquired = this.state === 'up' || this.state === 'down';
    this.state = 'noPosition';
    this.smoothedAngle = null;
    return wasAcquired ? ['positionLost'] : [];
  }

  /**
   * Средний угол в локтях по рукам, у которых плечо, локоть и запястье
   * видны (score выше порога) и запястье ниже плеча в кадре.
   * null — пользователь не в положении для отжиманий.
   */
  private meanElbowAngle(pose: Pose): number | null {
    const min = this.cfg.minKeypointScore;
    const angles: number[] = [];
    for (const arm of ARMS) {
      const s = pose[arm.shoulder];
      const e = pose[arm.elbow];
      const w = pose[arm.wrist];
      if (!s || !e || !w) {
        continue;
      }
      if (s.score < min || e.score < min || w.score < min) {
        continue;
      }
      if (w.y <= s.y) {
        continue;
      }
      angles.push(angleDeg(s, e, w));
    }
    if (angles.length === 0) {
      return null;
    }
    return angles.reduce((sum, v) => sum + v, 0) / angles.length;
  }
}
