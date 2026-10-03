import assert from 'node:assert/strict';
import test from 'node:test';

import { isThemePreference, resolveTheme } from './theme-core.mjs';

test('system theme follows the device and safely treats unknown device state as dark', () => {
  assert.equal(resolveTheme('system', 'light'), 'light');
  assert.equal(resolveTheme('system', 'dark'), 'dark');
  assert.equal(resolveTheme('system', null), 'dark');
});

test('explicit theme preferences override the system appearance', () => {
  assert.equal(resolveTheme('light', 'dark'), 'light');
  assert.equal(resolveTheme('dark', 'light'), 'dark');
});

test('only known appearance values are restored from storage', () => {
  for (const value of ['system', 'light', 'dark']) assert.equal(isThemePreference(value), true);
  for (const value of [null, undefined, '', 'automatic', 'LIGHT', 1]) assert.equal(isThemePreference(value), false);
});
