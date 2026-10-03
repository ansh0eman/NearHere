import assert from 'node:assert/strict';
import test from 'node:test';
import { createProfileRequestScope } from './profile-request-scope.ts';

test('an old account callback cannot start or complete a request after switching', () => {
  const scope = createProfileRequestScope();
  scope.switchAccount('A');
  const pendingSave = scope.begin('A');
  scope.switchAccount('B');
  assert.equal(scope.begin('A'), null);
  assert.equal(scope.isCurrent(pendingSave), false);
  const newLoad = scope.begin('B');
  assert.equal(scope.isCurrent(newLoad), true);
  scope.switchAccount(null);
  assert.equal(scope.isCurrent(newLoad), false);
});

test('returning to the same account does not revive its older request', () => {
  const scope = createProfileRequestScope();
  scope.switchAccount('A');
  const first = scope.begin('A');
  scope.switchAccount('B');
  scope.switchAccount('A');
  assert.equal(scope.isCurrent(first), false);
  const second = scope.begin('A');
  const latest = scope.begin('A');
  assert.equal(scope.isCurrent(second), false);
  assert.equal(scope.isCurrent(latest), true);
  scope.invalidate();
  assert.equal(scope.isCurrent(latest), false);
});
