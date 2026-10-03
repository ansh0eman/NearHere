import test from 'node:test';
import assert from 'node:assert/strict';
import { parseEmailAuthLink } from './auth-link.ts';

test('accepts only the NearHere email callback and extracts its code', () => {
  assert.deepEqual(parseEmailAuthLink('nearhere://auth/callback?code=one-time-code'), {
    kind: 'code',
    code: 'one-time-code',
  });
  assert.deepEqual(parseEmailAuthLink('nearhere://auth/callback?error_description=Link%20expired'), {
    kind: 'error',
    message: 'Link expired',
  });
});

test('does not exchange arbitrary, malformed, or incomplete links', () => {
  for (const value of [
    undefined,
    'https://example.com/auth/callback?code=secret',
    'nearhere://different/callback?code=secret',
    'nearhere://auth/other?code=secret',
    'nearhere://auth/callback',
    'not a url',
  ]) {
    const result = parseEmailAuthLink(value);
    if (value === 'nearhere://auth/callback') {
      assert.equal(result.kind, 'error');
    } else {
      assert.equal(result.kind, 'ignored');
    }
  }
});
