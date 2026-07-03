import {applyEvent, INITIAL_SESSION} from '../src/session/sessionState';

test('начальное состояние — ноль повторов, вне позиции', () => {
  expect(INITIAL_SESSION).toEqual({reps: 0, inPosition: false});
});

test('repCounted увеличивает счёт', () => {
  expect(applyEvent({reps: 2, inPosition: true}, 'repCounted')).toEqual({
    reps: 3,
    inPosition: true,
  });
});

test('positionAcquired и positionLost переключают inPosition', () => {
  const acquired = applyEvent(INITIAL_SESSION, 'positionAcquired');
  expect(acquired.inPosition).toBe(true);
  expect(applyEvent(acquired, 'positionLost').inPosition).toBe(false);
});
