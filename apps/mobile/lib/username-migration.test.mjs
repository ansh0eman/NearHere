import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migration = await readFile(new URL('../../../supabase/migrations/202610030001_username_claim.sql', import.meta.url), 'utf8');

test('username migration leaves old accounts valid and enforces canonical unique handles', () => {
  assert.match(migration, /add column username text\s*,/i);
  assert.match(migration, /username is null\s+or username collate "C" ~ '\^\[a-z\]\[a-z0-9_\]\{2,19\}\$'/i);
  assert.match(migration, /create unique index profiles_username_unique[\s\S]*where username is not null/i);
});

test('username claim RPC derives owner, serializes profile writes, and protects direct updates', () => {
  assert.match(migration, /create function public\.claim_my_username\(\s*p_username text,\s*p_expected_revision integer\s*\)/i);
  assert.match(migration, /security definer\s+set search_path = ''/i);
  assert.match(migration, /owner_id uuid := auth\.uid\(\)/i);
  assert.match(migration, /from public\.profiles\s+where id = owner_id\s+for update/i);
  assert.match(migration, /p_expected_revision is distinct from current_profile\.profile_revision/i);
  assert.match(migration, /update public\.profiles\s+set username = next_username\s+where id = owner_id/i);
  assert.match(migration, /when unique_violation[\s\S]*username is unavailable/i);
  assert.match(migration, /revoke update \(username\)[\s\S]*from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function public\.claim_my_username\(text, integer\) to authenticated/i);
});
