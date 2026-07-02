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
