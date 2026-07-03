export interface Keypoint {
  x: number;
  y: number;
  score: number;
}

/** Массив ключевых точек, индексация по схеме MoveNet (17 точек, 0–16). */
export type Pose = Keypoint[];

/** Индексы ключевых точек MoveNet (все 17). */
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
  leftHip: 11,
  rightHip: 12,
  leftKnee: 13,
  rightKnee: 14,
  leftAnkle: 15,
  rightAnkle: 16,
} as const;
