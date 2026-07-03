import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeNick, validateNick, nickToEmail} from './nickname.ts';

test('нормализация: trim + нижний регистр', () => {
  assert.equal(normalizeNick('  CoolGuy '), 'coolguy');
});

test('валидный ник проходит', () => {
  assert.equal(validateNick('cool_guy-1'), null);
});

test('слишком короткий — ошибка', () => {
  assert.notEqual(validateNick('ab'), null);
});

test('недопустимые символы — ошибка', () => {
  assert.notEqual(validateNick('превед'), null);
});

test('маппинг в технический e-mail', () => {
  assert.equal(nickToEmail('CoolGuy'), 'coolguy@pushuprpg.app');
});
