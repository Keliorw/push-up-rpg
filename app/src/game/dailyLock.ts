import {Progression} from './progression';

/**
 * true, если сегодня уже была завершена тренировка (один бой в день).
 * Дата передаётся снаружи (локальная дата устройства или подмена в тестах/
 * dev-панели), а не берётся из Date внутри ядра.
 */
export function isLockedToday(p: Progression, today: string): boolean {
  return p.lastWorkoutDate === today;
}
