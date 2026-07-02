export interface DetectorConfig {
  /** Минимальный score ключевой точки, чтобы считать её видимой. */
  minKeypointScore: number;
  /** Сколько мс поза должна стабильно держаться до positionAcquired. */
  positionHoldMs: number;
  /** Угол локтя, при котором руки считаются выпрямленными. */
  elbowExtendedDeg: number;
  /** Угол локтя, при котором руки считаются согнутыми. */
  elbowFlexedDeg: number;
  /** Минимум мс между засчитанными повторами (защита от дребезга). */
  minRepDurationMs: number;
  /** EMA-коэффициент нового замера угла (1 = без сглаживания). */
  angleSmoothing: number;
}

export const DEFAULT_CONFIG: DetectorConfig = {
  minKeypointScore: 0.3,
  positionHoldMs: 1000,
  elbowExtendedDeg: 155,
  elbowFlexedDeg: 95,
  minRepDurationMs: 700,
  angleSmoothing: 0.4,
};
