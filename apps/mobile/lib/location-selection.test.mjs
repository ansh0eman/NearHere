import assert from 'node:assert/strict';
import test from 'node:test';
import { locationFailurePresentation, restoreManualSelection } from './location-selection.ts';

test('failed GPS keeps the chosen region label but never keeps a current-location dot', () => {
  assert.deepEqual(locationFailurePresentation('manual', 'Bellandur Lake'), {
    deviceLocation: null,
    label: 'Bellandur Lake',
  });
  assert.deepEqual(locationFailurePresentation('device', 'Near you'), {
    deviceLocation: null,
    label: 'Last known area',
  });
  assert.deepEqual(locationFailurePresentation('default', 'Bengaluru'), {
    deviceLocation: null,
    label: 'Bengaluru',
  });
});

test('empty storage permits startup GPS; a saved selection is applied', async () => {
  assert.equal(await restoreManualSelection(async () => null, () => true, assert.fail), 'empty');
  const point = { label: 'Chosen area' };
  let applied;
  assert.equal(await restoreManualSelection(async () => point, () => true, value => { applied = value; }), 'applied');
  assert.equal(applied, point);
});

for (const outcome of ['empty', 'saved', 'error']) {
  test(`newer user intent supersedes a delayed ${outcome} storage read without restarting GPS`, async () => {
    let current = true;
    let resolve, reject;
    const read = new Promise((yes, no) => { resolve = yes; reject = no; });
    const restoring = restoreManualSelection(() => read, () => current, assert.fail);
    current = false; // recenter, manual save, or unmount wins while storage waits
    if (outcome === 'error') reject(new Error('storage unavailable'));
    else resolve(outcome === 'saved' ? { label: 'Old area' } : null);
    assert.equal(await restoring, 'superseded');
  });
}

test('storage failure while still current permits GPS fallback', async () => {
  assert.equal(await restoreManualSelection(async () => { throw Error('disk'); }, () => true, assert.fail), 'empty');
});
