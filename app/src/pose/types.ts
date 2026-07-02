export interface Keypoint {
  x: number;
  y: number;
  score: number;
}

/** Массив ключевых точек, индексация по схеме MoveNet (используем 0–10). */
export type Pose = Keypoint[];

/** Индексы ключевых точек MoveNet. */
export const KP = {
  nose: 0,
  leftEye: 1,
  rightEye: 2,
  leftEar: 3,
  rightEar: 4,
  leftShoulder: 5,
  rightShoulder: 6,
  leftElbow: 7,
  rightElbow: 8,
  leftWrist: 9,
  rightWrist: 10,
} as const;
