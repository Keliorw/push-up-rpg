import {DEFAULT_CONFIG} from '../src/pose/config';
import {RepDetector} from '../src/pose/RepDetector';
import {KP, Pose} from '../src/pose/types';

// Отключаем сглаживание и дрейф базовой линии, чтобы поведение было
// детерминированным в тестах.
const CFG = {
  ...DEFAULT_CONFIG,
  angleSmoothing: 1,
  descentSmoothing: 1,
  baselineRelaxAlpha: 0,
  positionHoldMs: 1000,
  gateLostGraceMs: 0,
};

function blankPose(): Pose {
  return Array.from({length: 17}, () => ({x: 0, y: 0, score: 0}));
}

/**
 * Поза только с руками (без ног) под заданный угол локтя; запястья ниже плеч.
 * → срабатывает ЗАПАСНОЙ гейт, счёт ведётся по углу локтя.
 */
function armPose(angle: number, score = 0.9): Pose {
  const rad = (angle * Math.PI) / 180;
  const pose = blankPose();
  const L = 0.2;
  const mk = (sx: number, dir: number) => {
    const shoulder = {x: sx, y: 0.3, score};
    const elbow = {x: sx, y: 0.3 + L, score};
    const wrist = {
      x: sx + dir * L * Math.sin(rad),
      y: 0.3 + L - L * Math.cos(rad),
      score,
    };
    return {shoulder, elbow, wrist};
  };
  const l = mk(0.35, -1);
  const r = mk(0.65, 1);
  pose[KP.leftShoulder] = l.shoulder;
  pose[KP.leftElbow] = l.elbow;
  pose[KP.leftWrist] = l.wrist;
  pose[KP.rightShoulder] = r.shoulder;
  pose[KP.rightElbow] = r.elbow;
  pose[KP.rightWrist] = r.wrist;
  return pose;
}

/**
 * Поза упора лёжа с реальной геометрией камеры на полу (по замерам с видео):
 * близкие приподнятые плечи проецируются в кадре ВЫШЕ далёких колен на полу,
 * поэтому «колени↑плечи» = (плечи.y − колени.y)/торс умеренно отрицательный
 * (здесь −0.74; на видео −2.6…−0.7). Точки плечо–бедро–колено коллинеарны →
 * корпус прямой (180°). shoulderY задаёт высоту плеч для проседания.
 * bent=true — «на коленях»: корпус согнут И плечи взлетают над коленями
 * (сигнал −3.9, вне полосы), как при вставании.
 */
function bodyPose(shoulderY: number, bent = false, score = 0.9): Pose {
  const pose = blankPose();
  const sy = shoulderY;
  pose[KP.leftShoulder] = {x: 0.25, y: sy, score};
  pose[KP.rightShoulder] = {x: 0.35, y: sy, score};
  if (bent) {
    // Сидя на коленях: бедро согнуто (~129°), колени далеко под плечами.
    pose[KP.leftHip] = {x: 0.4, y: sy + 0.12, score};
    pose[KP.rightHip] = {x: 0.5, y: sy + 0.12, score};
    pose[KP.leftKnee] = {x: 0.4, y: sy + 0.75, score};
    pose[KP.rightKnee] = {x: 0.5, y: sy + 0.75, score};
  } else {
    // Планка: плечи–бёдра–колени на одной прямой, колени чуть ниже в кадре.
    pose[KP.leftHip] = {x: 0.4, y: sy + 0.06, score};
    pose[KP.rightHip] = {x: 0.5, y: sy + 0.06, score};
    pose[KP.leftKnee] = {x: 0.55, y: sy + 0.12, score};
    pose[KP.rightKnee] = {x: 0.65, y: sy + 0.12, score};
  }
  return pose;
}

/** Добавляет к позе обе руки с заданным углом локтя (для планки с руками). */
function withArms(pose: Pose, elbowAngle: number, score = 0.9): Pose {
  const bent = elbowAngle <= 150;
  for (const side of [
    {shoulder: KP.leftShoulder, elbow: KP.leftElbow, wrist: KP.leftWrist},
    {shoulder: KP.rightShoulder, elbow: KP.rightElbow, wrist: KP.rightWrist},
  ]) {
    const s = pose[side.shoulder];
    pose[side.elbow] = {x: s.x, y: s.y + 0.1, score};
    // Прямая рука: запястье продолжает линию (180°); согнутая: вбок (90°).
    pose[side.wrist] = bent
      ? {x: s.x + 0.1, y: s.y + 0.1, score}
      : {x: s.x, y: s.y + 0.2, score};
  }
  return pose;
}

/**
 * Момент вставания из упора (регресс с видео): корпус ещё прямой (180°) и тело
 * горизонтальное, НО плечи уже высоко над коленями — «колени↑плечи» = −3.7,
 * ниже полосы (на видео при вставании −3.4…−5). Не должно считаться упором.
 */
function gettingUpPose(score = 0.9): Pose {
  const pose = blankPose();
  pose[KP.leftShoulder] = {x: 0.25, y: 0.25, score};
  pose[KP.rightShoulder] = {x: 0.35, y: 0.25, score};
  pose[KP.leftHip] = {x: 0.31, y: 0.4, score};
  pose[KP.rightHip] = {x: 0.41, y: 0.4, score};
  pose[KP.leftKnee] = {x: 0.49, y: 0.85, score};
  pose[KP.rightKnee] = {x: 0.59, y: 0.85, score};
  return pose;
}

/** Стоящий человек: точки вытянуты вертикально, узкая рамка (аспект большой). */
function standingPose(score = 0.9): Pose {
  const pose = blankPose();
  pose[KP.leftShoulder] = {x: 0.48, y: 0.2, score};
  pose[KP.rightShoulder] = {x: 0.52, y: 0.2, score};
  pose[KP.leftHip] = {x: 0.48, y: 0.5, score};
  pose[KP.rightHip] = {x: 0.52, y: 0.5, score};
  pose[KP.leftKnee] = {x: 0.48, y: 0.75, score};
  pose[KP.rightKnee] = {x: 0.52, y: 0.75, score};
  return pose;
}

test('пустая поза — нет позиции и событий', () => {
  const d = new RepDetector(CFG);
  expect(d.process(blankPose(), 0)).toEqual([]);
  expect(d.process(blankPose(), 1500)).toEqual([]);
});

test('планка (прямой корпус) даёт positionAcquired после удержания', () => {
  const d = new RepDetector(CFG);
  expect(d.process(bodyPose(0.3), 0)).toEqual([]);
  expect(d.process(bodyPose(0.3), 500)).toEqual([]);
  expect(d.process(bodyPose(0.3), 1000)).toEqual(['positionAcquired']);
  expect(d.debug.gateMode).toBe('plank');
  expect(d.debug.inPosition).toBe(true);
  expect(d.debug.legsBehind).toBe(true);
});

test('вставание из упора (плечи высоко над коленями) НЕ даёт позицию', () => {
  const d = new RepDetector(CFG);
  expect(d.process(gettingUpPose(), 0)).toEqual([]);
  expect(d.process(gettingUpPose(), 1500)).toEqual([]);
  expect(d.debug.inPosition).toBe(false);
  expect(d.debug.gateMode).toBe('plank'); // тело+ноги видны → режим планки
  expect(d.debug.legsBehind).toBe(false); // но сигнал ниже полосы → не упор
  expect(d.debug.legsBehindFrac).not.toBeNull();
  expect(d.debug.legsBehindFrac! < CFG.legsBehindMinFrac).toBe(true);
});

test('вставание с прямыми руками: проседание есть, локоть прямой → повтора НЕТ', () => {
  const d = new RepDetector(CFG);
  // Планка с видимыми ПРЯМЫМИ руками (180°).
  d.process(withArms(bodyPose(0.3), 180), 0);
  expect(d.process(withArms(bodyPose(0.3), 180), 1000)).toEqual(['positionAcquired']);
  // Плечи ушли вниз (descent ~0.93 ≥ 0.14), но локоть прямой → «вниз» не наступает.
  expect(d.process(withArms(bodyPose(0.45), 180), 1400)).toEqual([]);
  expect(d.debug.phase).toBe('up');
  // Возврат вверх — повтора не было.
  expect(d.process(withArms(bodyPose(0.3), 180), 2200)).toEqual([]);
});

test('реальный повтор с руками: проседание + согнутый локоть → повтор', () => {
  const d = new RepDetector(CFG);
  d.process(withArms(bodyPose(0.3), 180), 0);
  expect(d.process(withArms(bodyPose(0.3), 180), 1000)).toEqual(['positionAcquired']);
  // Вниз: проседание + локоть согнут (90° ≤ 150°).
  expect(d.process(withArms(bodyPose(0.45), 90), 1400)).toEqual([]);
  expect(d.debug.phase).toBe('down');
  expect(d.process(withArms(bodyPose(0.3), 180), 2200)).toEqual(['repCounted']);
});

test('согнутый корпус (сидя) НЕ даёт позицию', () => {
  const d = new RepDetector(CFG);
  expect(d.process(bodyPose(0.3, true), 0)).toEqual([]);
  expect(d.process(bodyPose(0.3, true), 1500)).toEqual([]);
  expect(d.debug.inPosition).toBe(false);
});

test('стоящий (вытянут вертикально) НЕ даёт позицию, даже если корпус прямой', () => {
  const d = new RepDetector(CFG);
  expect(d.process(standingPose(), 0)).toEqual([]);
  expect(d.process(standingPose(), 1500)).toEqual([]);
  expect(d.debug.inPosition).toBe(false);
  expect(d.debug.bodyAspect).not.toBeNull();
  expect(d.debug.bodyAspect! > CFG.maxBodyAspect).toBe(true);
});

test('повтор по вертикальному проседанию корпуса (без рук в кадре)', () => {
  const d = new RepDetector(CFG);
  d.process(bodyPose(0.3), 0);
  expect(d.process(bodyPose(0.3), 1000)).toEqual(['positionAcquired']);
  // вниз: плечи опустились (descent ~0.75 >= 0.14)
  expect(d.process(bodyPose(0.45), 1400)).toEqual([]);
  // вверх: плечи вернулись (descent 0 <= 0.05) → повтор
  expect(d.process(bodyPose(0.3), 2200)).toEqual(['repCounted']);
});

test('малое проседание (ниже порога) не считается повтором', () => {
  const d = new RepDetector(CFG);
  d.process(bodyPose(0.3), 0);
  d.process(bodyPose(0.3), 1000);
  // descent = (0.32-0.3)/0.1616 ≈ 0.124 < downFrac 0.14
  expect(d.process(bodyPose(0.32), 1400)).toEqual([]);
  expect(d.process(bodyPose(0.3), 2200)).toEqual([]);
});

test('слишком быстрый второй повтор игнорируется (проседание)', () => {
  const d = new RepDetector(CFG);
  d.process(bodyPose(0.3), 0);
  d.process(bodyPose(0.3), 1000);
  d.process(bodyPose(0.45), 1400);
  expect(d.process(bodyPose(0.3), 2200)).toEqual(['repCounted']);
  d.process(bodyPose(0.45), 2300);
  expect(d.process(bodyPose(0.3), 2400)).toEqual([]); // 200 мс после повтора
  d.process(bodyPose(0.45), 2600);
  expect(d.process(bodyPose(0.3), 3100)).toEqual(['repCounted']); // 900 мс — ок
});

test('потеря позиции (корпус согнулся) даёт positionLost', () => {
  const d = new RepDetector(CFG);
  d.process(bodyPose(0.3), 0);
  expect(d.process(bodyPose(0.3), 1000)).toEqual(['positionAcquired']);
  expect(d.process(bodyPose(0.3, true), 1500)).toEqual(['positionLost']);
});

test('запасной гейт: без ног считает по углу локтя', () => {
  const d = new RepDetector(CFG);
  d.process(armPose(170), 0);
  expect(d.process(armPose(170), 1000)).toEqual(['positionAcquired']);
  expect(d.debug.gateMode).toBe('fallback');
  expect(d.process(armPose(80), 1400)).toEqual([]); // локоть согнут → вниз
  expect(d.process(armPose(170), 2200)).toEqual(['repCounted']); // разогнут → повтор
});

test('кратковременная пропажа точек не рвёт позицию (grace), долгая — рвёт', () => {
  const d = new RepDetector({...CFG, gateLostGraceMs: 700});
  d.process(bodyPose(0.3), 0);
  expect(d.process(bodyPose(0.3), 1000)).toEqual(['positionAcquired']);
  // один «пустой» кадр внутри grace-окна — без positionLost
  expect(d.process(blankPose(), 1200)).toEqual([]);
  // позиция сохранилась, повтор по проседанию продолжает считаться
  expect(d.process(bodyPose(0.45), 1400)).toEqual([]); // вниз
  expect(d.process(bodyPose(0.3), 2200)).toEqual(['repCounted']); // вверх
  // пропажа дольше grace (>700 мс от 2200) — позиция теряется
  d.process(blankPose(), 2300);
  expect(d.process(blankPose(), 3100)).toEqual(['positionLost']);
});

test('запасной гейт работает и по одной видимой руке', () => {
  const d = new RepDetector(CFG);
  const oneArm = (angle: number): Pose => {
    const p = armPose(angle);
    p[KP.rightShoulder] = {...p[KP.rightShoulder], score: 0};
    p[KP.rightElbow] = {...p[KP.rightElbow], score: 0};
    p[KP.rightWrist] = {...p[KP.rightWrist], score: 0};
    return p;
  };
  d.process(oneArm(170), 0);
  expect(d.process(oneArm(170), 1000)).toEqual(['positionAcquired']);
  d.process(oneArm(80), 1400);
  expect(d.process(oneArm(170), 2200)).toEqual(['repCounted']);
});
