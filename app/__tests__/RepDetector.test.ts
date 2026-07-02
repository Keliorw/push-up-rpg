import {DEFAULT_CONFIG} from '../src/pose/config';
import {RepDetector} from '../src/pose/RepDetector';
import {KP, Pose} from '../src/pose/types';

// В тестах отключаем сглаживание, чтобы угол применялся мгновенно.
const CFG = {...DEFAULT_CONFIG, angleSmoothing: 1};

/** Поза с заданным углом в обоих локтях; запястья гарантированно ниже плеч. */
function armPose(angle: number, score = 0.9): Pose {
  const rad = (angle * Math.PI) / 180;
  const pose: Pose = Array.from({length: 11}, () => ({x: 0.5, y: 0.1, score}));
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

function emptyPose(): Pose {
  return Array.from({length: 11}, () => ({x: 0, y: 0, score: 0}));
}

function feed(d: RepDetector, angle: number, t: number) {
  return d.process(armPose(angle), t);
}

/**
 * Поза, где у каждой руки свой угол и свой score — чтобы проверить, что
 * meanElbowAngle учитывает только "видимые" (score >= minKeypointScore) руки.
 * Геометрия та же, что в armPose, но параметризована отдельно по руке.
 */
function mixedArmPose(
  rightAngle: number,
  leftAngle: number,
  rightScore: number,
  leftScore: number,
): Pose {
  const pose: Pose = Array.from({length: 11}, () => ({x: 0.5, y: 0.1, score: 0}));
  const L = 0.2;
  const mk = (sx: number, dir: number, angle: number, score: number) => {
    const rad = (angle * Math.PI) / 180;
    const shoulder = {x: sx, y: 0.3, score};
    const elbow = {x: sx, y: 0.3 + L, score};
    const wrist = {
      x: sx + dir * L * Math.sin(rad),
      y: 0.3 + L - L * Math.cos(rad),
      score,
    };
    return {shoulder, elbow, wrist};
  };
  const l = mk(0.35, -1, leftAngle, leftScore);
  const r = mk(0.65, 1, rightAngle, rightScore);
  pose[KP.leftShoulder] = l.shoulder;
  pose[KP.leftElbow] = l.elbow;
  pose[KP.leftWrist] = l.wrist;
  pose[KP.rightShoulder] = r.shoulder;
  pose[KP.rightElbow] = r.elbow;
  pose[KP.rightWrist] = r.wrist;
  return pose;
}

test('пустая поза — нет событий', () => {
  const d = new RepDetector(CFG);
  expect(d.process(emptyPose(), 0)).toEqual([]);
});

test('positionAcquired после удержания позиции 1 секунду', () => {
  const d = new RepDetector(CFG);
  expect(feed(d, 170, 0)).toEqual([]);
  expect(feed(d, 170, 500)).toEqual([]);
  expect(feed(d, 170, 1000)).toEqual(['positionAcquired']);
});

test('полный цикл вниз-вверх — один repCounted', () => {
  const d = new RepDetector(CFG);
  feed(d, 170, 0);
  feed(d, 170, 1000);
  expect(feed(d, 80, 1400)).toEqual([]);
  expect(feed(d, 170, 2200)).toEqual(['repCounted']);
});

test('дрожание угла между порогами не считается повтором', () => {
  const d = new RepDetector(CFG);
  feed(d, 170, 0);
  feed(d, 170, 1000);
  feed(d, 120, 1400);
  feed(d, 150, 1800);
  feed(d, 120, 2200);
  expect(feed(d, 170, 2600)).toEqual([]);
});

test('слишком быстрый повтор игнорируется', () => {
  const d = new RepDetector(CFG);
  feed(d, 170, 0);
  feed(d, 170, 1000);
  feed(d, 80, 1400);
  expect(feed(d, 170, 2200)).toEqual(['repCounted']);
  feed(d, 80, 2300);
  expect(feed(d, 170, 2400)).toEqual([]); // 200 мс после прошлого повтора
  feed(d, 80, 2600);
  expect(feed(d, 170, 3000)).toEqual(['repCounted']); // 800 мс — уже честно
});

test('потеря позиции даёт positionLost, возврат — заново positionAcquired', () => {
  const d = new RepDetector(CFG);
  feed(d, 170, 0);
  feed(d, 170, 1000);
  expect(d.process(emptyPose(), 1500)).toEqual(['positionLost']);
  expect(feed(d, 170, 2000)).toEqual([]);
  expect(feed(d, 170, 3000)).toEqual(['positionAcquired']);
});

test('потеря во время удержания не даёт positionLost', () => {
  const d = new RepDetector(CFG);
  feed(d, 170, 0);
  expect(d.process(emptyPose(), 500)).toEqual([]);
});

test('запястья выше плеч — не упор лёжа', () => {
  const d = new RepDetector(CFG);
  const p = armPose(170);
  p[KP.leftWrist] = {...p[KP.leftWrist], y: 0.1};
  p[KP.rightWrist] = {...p[KP.rightWrist], y: 0.1};
  expect(d.process(p, 0)).toEqual([]);
  expect(d.process(p, 1500)).toEqual([]);
});

test('сглаживание EMA (α=0.4, DEFAULT_CONFIG) гасит одиночный "провал" угла и не даёт repCounted', () => {
  // В отличие от всех тестов выше, тут НЕ переопределяем angleSmoothing —
  // используется DEFAULT_CONFIG с α = 0.4, чтобы одиночный "провальный" кадр
  // не мог мгновенно протолкнуть сглаженный угол ниже elbowFlexedDeg.
  const d = new RepDetector(DEFAULT_CONFIG);

  // Удержание разогнутой позиции 1 секунду -> positionAcquired.
  expect(feed(d, 170, 0)).toEqual([]);
  expect(feed(d, 170, 500)).toEqual([]);
  expect(feed(d, 170, 1000)).toEqual(['positionAcquired']);
  // К этому моменту smoothedAngle стабилизировался на 170 (все предыдущие
  // кадры были одинаковыми, поэтому raw == smoothed == 170).

  // Один одиночный "провальный" кадр 80° (например, ошибка позовой сети):
  //   smoothed' = 0.4 * 80 + 0.6 * 170 = 32 + 102 = 134
  // 134 > elbowFlexedDeg (95) -> сглаженный угол НЕ пересекает порог сгиба,
  // состояние остаётся 'up', repCounted не появляется.
  // (При angleSmoothing = 1, как в CFG выше, 80 <= 95 сразу перевело бы
  // детектор в 'down' — см. тест "полный цикл вниз-вверх" выше, где именно
  // это и происходит.)
  expect(feed(d, 80, 1400)).toEqual([]);

  // Возврат к разогнутым кадрам подтягивает smoothed обратно к 170, но раз
  // состояние ни разу не становилось 'down', повтор невозможен:
  //   0.4*170 + 0.6*134   = 68 + 80.4  = 148.4
  //   0.4*170 + 0.6*148.4 = 68 + 89.04 = 157.04
  expect(feed(d, 170, 1800)).toEqual([]);
  expect(feed(d, 170, 2200)).toEqual([]);
});

test('видна только одна рука (score второй руки < minKeypointScore) — угол считается по видимой руке', () => {
  const d = new RepDetector(CFG);

  // "Скрытая" левая рука зафиксирована в разогнутом положении (170°), но с
  // score = 0.1 < minKeypointScore (0.3) — должна полностью игнорироваться
  // в meanElbowAngle. Видимая правая рука (score 0.9) проходит обычный цикл
  // вниз-вверх.
  //
  // Если бы фильтр по score был сломан (учитывал обе руки), неподвижная
  // разогнутая "фантомная" рука не дала бы среднему углу опуститься до
  // elbowFlexedDeg при сгибе видимой руки (mean(80, 170) = 125 > 95), и
  // детектор никогда не перешёл бы в 'down' — repCounted не появился бы.
  // Тест ниже проверяет, что этого не происходит.
  const up = () => mixedArmPose(170, 170, 0.9, 0.1);
  const down = () => mixedArmPose(80, 170, 0.9, 0.1);

  expect(d.process(up(), 0)).toEqual([]);
  expect(d.process(up(), 500)).toEqual([]);
  expect(d.process(up(), 1000)).toEqual(['positionAcquired']);
  expect(d.process(down(), 1400)).toEqual([]);
  expect(d.process(up(), 2200)).toEqual(['repCounted']);
});
