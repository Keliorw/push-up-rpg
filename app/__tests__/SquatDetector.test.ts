import {DEFAULT_SQUAT_CONFIG} from '../src/pose/squat-config';
import {SquatDetector} from '../src/pose/SquatDetector';
import {KP, Pose} from '../src/pose/types';

// Отключаем сглаживание и дрейф базовой линии для детерминизма.
const CFG = {
  ...DEFAULT_SQUAT_CONFIG,
  gapSmoothing: 1,
  kneeAngleSmoothing: 1,
  descentSmoothing: 1,
  baselineRelaxAlpha: 0,
  positionHoldMs: 1000,
  gateLostGraceMs: 0,
};

function blankPose(): Pose {
  return Array.from({length: 17}, () => ({x: 0, y: 0, score: 0}));
}

/**
 * Фронтальная поза стоя/в приседе. Колени зафиксированы (y=0.75), таз задаётся
 * hipY и опускается к ним при приседе; торс жёсткий (плечи на 0.3 выше таза),
 * длина торса = 0.3. Зазор таз↔колени = (0.75 − hipY) / 0.3:
 * стоя (hipY=0.5) → 0.83; нижняя точка (hipY=0.72) → 0.1.
 * scale — равномерное масштабирование всей позы (человек ближе/дальше).
 */
function squatPose(hipY: number, opts: {shoulderY?: number; scale?: number} = {}): Pose {
  const s = opts.scale ?? 1;
  const shoulderY = opts.shoulderY ?? hipY - 0.3;
  const pose = blankPose();
  const score = 0.9;
  const set = (idx: number, x: number, y: number) => {
    pose[idx] = {x: x * s, y: y * s, score};
  };
  set(KP.leftShoulder, 0.4, shoulderY);
  set(KP.rightShoulder, 0.6, shoulderY);
  set(KP.leftHip, 0.45, hipY);
  set(KP.rightHip, 0.55, hipY);
  set(KP.leftKnee, 0.45, 0.75);
  set(KP.rightKnee, 0.55, 0.75);
  set(KP.leftAnkle, 0.45, 1.0);
  set(KP.rightAnkle, 0.55, 1.0);
  return pose;
}

const STAND = 0.5; // hipY стоя
const BOTTOM = 0.72; // hipY в нижней точке (зазор 0.1)

/** Захват позиции: стоим дольше positionHoldMs. */
function acquire(d: SquatDetector, t0 = 0): number {
  d.process(squatPose(STAND), t0);
  const t1 = t0 + CFG.positionHoldMs + 100;
  const events = d.process(squatPose(STAND), t1);
  expect(events).toContain('positionAcquired');
  return t1;
}

describe('SquatDetector: гейт «стою в полный рост»', () => {
  it('подтверждает позицию после удержания стоя', () => {
    const d = new SquatDetector(CFG);
    expect(d.process(squatPose(STAND), 0)).toEqual([]);
    expect(d.process(squatPose(STAND), 500)).toEqual([]);
    expect(d.process(squatPose(STAND), 1100)).toEqual(['positionAcquired']);
    expect(d.debug.inPosition).toBe(true);
  });

  it('НЕ подтверждает позицию лёжа/в планке (торс горизонтален)', () => {
    const d = new SquatDetector(CFG);
    // Плечи на высоте таза: вертикальность торса ≈ 0 < порога.
    const plank = squatPose(STAND, {shoulderY: STAND});
    expect(d.process(plank, 0)).toEqual([]);
    expect(d.process(plank, 1500)).toEqual([]);
    expect(d.debug.inPosition).toBe(false);
  });

  it('теряет позицию, когда человек лёг (positionLost)', () => {
    const d = new SquatDetector(CFG);
    const t = acquire(d);
    const events = d.process(squatPose(STAND, {shoulderY: STAND}), t + 100);
    expect(events).toEqual(['positionLost']);
  });

  it('гейт держится в нижней точке приседа (позиция не рвётся)', () => {
    const d = new SquatDetector(CFG);
    const t = acquire(d);
    expect(d.process(squatPose(BOTTOM), t + 500)).toEqual([]);
    expect(d.debug.inPosition).toBe(true);
  });
});

describe('SquatDetector: счёт повторов', () => {
  it('присед → встал = один повтор', () => {
    const d = new SquatDetector(CFG);
    const t = acquire(d);
    expect(d.process(squatPose(BOTTOM), t + 400)).toEqual([]);
    expect(d.debug.phase).toBe('down');
    const events = d.process(squatPose(STAND), t + 1200);
    expect(events).toEqual(['repCounted']);
    expect(d.debug.phase).toBe('up');
  });

  it('несколько приседаний считаются по одному', () => {
    const d = new SquatDetector(CFG);
    let t = acquire(d);
    let reps = 0;
    for (let i = 0; i < 3; i++) {
      t += 500;
      d.process(squatPose(BOTTOM), t);
      t += 800;
      reps += d.process(squatPose(STAND), t).filter(e => e === 'repCounted').length;
    }
    expect(reps).toBe(3);
  });

  it('неглубокий присед (зазор выше порога) не считается', () => {
    const d = new SquatDetector(CFG);
    const t = acquire(d);
    // hipY=0.6 → зазор 0.5 > gapDownFrac=0.45 — фаза «вниз» не наступает.
    d.process(squatPose(0.6), t + 400);
    expect(d.debug.phase).toBe('up');
    expect(d.process(squatPose(STAND), t + 1200)).toEqual([]);
  });

  it('наклон корпуса без приседа не считается (таз не опускается)', () => {
    const d = new SquatDetector(CFG);
    const t = acquire(d);
    // Наклон: плечи опустились к тазу (торс укоротился в проекции), но таз на
    // месте — зазор таз↔колени вырос, а не упал. Повтора нет.
    const bow = squatPose(STAND, {shoulderY: STAND - 0.16});
    d.process(bow, t + 400);
    expect(d.debug.phase).toBe('up');
    expect(d.process(squatPose(STAND), t + 1200)).toEqual([]);
  });

  it('подход к камере (равномерный масштаб) не даёт фантомного повтора', () => {
    const d = new SquatDetector(CFG);
    const t = acquire(d);
    // Человек стал «крупнее» в 1.6 раза — пропорции те же, зазор тот же.
    d.process(squatPose(STAND, {scale: 1.3}), t + 400);
    d.process(squatPose(STAND, {scale: 1.6}), t + 800);
    expect(d.debug.phase).toBe('up');
    expect(d.process(squatPose(STAND, {scale: 1.6}), t + 1200)).toEqual([]);
  });

  it('ВЫПАД не считается приседом (колени разъехались по высоте)', () => {
    const d = new SquatDetector(CFG);
    const t = acquire(d);
    // Выпад: таз опустился (зазор до середины колен мал), но заднее колено
    // у пола — разброс колен 0.24/0.3 = 0.8 торса, выше порога всю фазу.
    const lunge = squatPose(BOTTOM);
    lunge[KP.leftKnee] = {x: 0.45, y: 0.63, score: 0.9};
    lunge[KP.rightKnee] = {x: 0.55, y: 0.87, score: 0.9};
    d.process(lunge, t + 400);
    d.process(lunge, t + 600);
    d.process(lunge, t + 800);
    expect(d.debug.phase).toBe('down');
    expect(d.process(squatPose(STAND), t + 1200)).toEqual([]);
    expect(d.debug.phase).toBe('up');
  });

  it('шумовой выброс разброса колен НЕ отменяет настоящий присед', () => {
    const d = new SquatDetector(CFG);
    const t = acquire(d);
    // Нижняя точка: большинство кадров колени ровно, один кадр — выброс.
    const noisy = squatPose(BOTTOM);
    noisy[KP.leftKnee] = {x: 0.45, y: 0.63, score: 0.9};
    noisy[KP.rightKnee] = {x: 0.55, y: 0.87, score: 0.9};
    d.process(squatPose(BOTTOM), t + 400);
    d.process(noisy, t + 500);
    d.process(squatPose(BOTTOM), t + 600);
    d.process(squatPose(BOTTOM), t + 700);
    expect(d.process(squatPose(STAND), t + 1200)).toEqual(['repCounted']);
  });

  it('дребезг быстрее minRepDurationMs не даёт второго повтора', () => {
    const d = new SquatDetector(CFG);
    const t = acquire(d);
    d.process(squatPose(BOTTOM), t + 400);
    expect(d.process(squatPose(STAND), t + 1200)).toEqual(['repCounted']);
    // Мгновенный «повтор» через 100 мс — игнорируется.
    d.process(squatPose(BOTTOM), t + 1250);
    expect(d.process(squatPose(STAND), t + 1300)).toEqual([]);
  });
});

describe('SquatDetector: отладочные сигналы', () => {
  it('зазор и вертикальность считаются верно для позы стоя', () => {
    const d = new SquatDetector(CFG);
    acquire(d);
    // Стоя: зазор = (0.75-0.5)/0.3 = 0.83, торс вертикален (1.0).
    expect(d.debug.gap).toBeCloseTo(0.83, 1);
    expect(d.debug.torsoUprightFrac).toBeCloseTo(1.0, 5);
    expect(d.debug.kneeAngle).toBeCloseTo(180, 0);
  });

  it('просадка таза растёт в нижней точке', () => {
    const d = new SquatDetector(CFG);
    const t = acquire(d);
    d.process(squatPose(BOTTOM), t + 400);
    // Таз опустился на 0.22 при торсе 0.3 → просадка ≈ 0.73.
    expect(d.debug.hipDescent).toBeCloseTo(0.73, 1);
  });
});
