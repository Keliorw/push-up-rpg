import {MONSTER_SEQUENCE} from './monsters';
import {Monster} from './types';

export interface ArenaConfig {
  /** HP первого моба (= число отжиманий на убийство). */
  baseHp: number;
  /** Прирост HP за каждого следующего моба. */
  hpStep: number;
  /** Минимум секунд на одно отжимание — задаёт нижнюю границу таймера. */
  secondsPerRep: number;
  /** Базовый таймер моба, сек (пока HP·secondsPerRep не превысит его). */
  baseTimerSec: number;
  /** Отдых между мобами, сек. */
  restSec: number;
}

export const ARENA_CONFIG: ArenaConfig = {
  baseHp: 5,
  hpStep: 2,
  secondsPerRep: 4,
  baseTimerSec: 60,
  restSec: 30,
};

/** HP моба n (1-based): baseHp + hpStep·(n−1). */
export function mobHp(n: number, cfg: ArenaConfig = ARENA_CONFIG): number {
  return cfg.baseHp + cfg.hpStep * (n - 1);
}

/**
 * Таймер моба n, сек: не меньше baseTimerSec и не меньше HP·secondsPerRep —
 * то есть на каждое отжимание гарантированно даётся >= secondsPerRep секунд,
 * а с ростом HP таймер увеличивается.
 */
export function mobTimerSec(n: number, cfg: ArenaConfig = ARENA_CONFIG): number {
  return Math.max(cfg.baseTimerSec, mobHp(n, cfg) * cfg.secondsPerRep);
}

/** Монстр (арт/имя) для моба n: монстры кампании по порядку, по кругу после последнего. */
export function arenaMonster(n: number): Monster {
  return MONSTER_SEQUENCE[(n - 1) % MONSTER_SEQUENCE.length];
}

export type ArenaPhase = 'fighting' | 'resting' | 'over';

export interface ArenaState {
  /** 1-based номер текущего моба. */
  mobIndex: number;
  /** Осталось HP у текущего моба. */
  hpLeft: number;
  /** Убито мобов за забег. */
  kills: number;
  phase: ArenaPhase;
}

export function newRun(cfg: ArenaConfig = ARENA_CONFIG): ArenaState {
  return {mobIndex: 1, hpLeft: mobHp(1, cfg), kills: 0, phase: 'fighting'};
}

export type ArenaEvent = 'hit' | 'mobKilled' | 'noop';

/**
 * Учитывает один засчитанный повтор. Только в фазе fighting: −1 HP; при 0 —
 * моб убит (kills+1, фаза resting). В resting/over — no-op.
 */
export function onRep(
  s: ArenaState,
  _cfg: ArenaConfig = ARENA_CONFIG,
): {state: ArenaState; event: ArenaEvent} {
  if (s.phase !== 'fighting') return {state: s, event: 'noop'};
  const hpLeft = s.hpLeft - 1;
  if (hpLeft <= 0) {
    return {
      state: {...s, hpLeft: 0, kills: s.kills + 1, phase: 'resting'},
      event: 'mobKilled',
    };
  }
  return {state: {...s, hpLeft}, event: 'hit'};
}

/** Отдых закончился → следующий моб с новым HP, фаза fighting. Вне resting — no-op. */
export function onRestDone(s: ArenaState, cfg: ArenaConfig = ARENA_CONFIG): ArenaState {
  if (s.phase !== 'resting') return s;
  const mobIndex = s.mobIndex + 1;
  return {...s, mobIndex, hpLeft: mobHp(mobIndex, cfg), phase: 'fighting'};
}

/** Таймер моба истёк во время боя → забег окончен. Вне fighting — no-op. */
export function onTimeout(s: ArenaState): ArenaState {
  if (s.phase !== 'fighting') return s;
  return {...s, phase: 'over'};
}
