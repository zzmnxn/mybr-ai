import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { FAVORITES_MAX, sanitizeFavorites, toggleFavorite } from '../src/lib/favorites.ts';

test('toggle adds once, removes on second call and never mutates the input', () => {
  const start = ['know-a'];
  assert.deepEqual(toggleFavorite(start, 'exp-b'), ['know-a', 'exp-b']);
  assert.deepEqual(toggleFavorite(['know-a', 'exp-b'], 'know-a'), ['exp-b']);
  assert.deepEqual(start, ['know-a']);
});
test('sanitize keeps only known string uids, without duplicates, and survives bad storage', () => {
  const valid = new Set(['know-a', 'exp-b']);
  assert.deepEqual(sanitizeFavorites(['know-a', 'gone', 3, null, 'know-a', 'exp-b'], valid), ['know-a', 'exp-b']);
  for (const bad of [null, undefined, 'know-a', {}, 7]) assert.deepEqual(sanitizeFavorites(bad, valid), []);
});
test('favorites are capped to the most recent entries', () => {
  const ids = Array.from({ length: FAVORITES_MAX + 5 }, (_, i) => `know-${i}`);
  const kept = sanitizeFavorites(ids, new Set(ids));
  assert.equal(kept.length, FAVORITES_MAX);
  assert.equal(kept.at(-1), ids.at(-1));
  assert.equal(toggleFavorite(kept, 'know-new').length, FAVORITES_MAX);
});
test('verifier rejects pins that point at missing notes or repeat a note', () => {
  const root = mkdtempSync(join(tmpdir(), 'mybr-pinned-'));
  try {
    mkdirSync(join(root, 'src/content/notes'), { recursive: true });
    mkdirSync(join(root, 'src/data'), { recursive: true });
    writeFileSync(join(root, 'src/data/planned.yaml'), '[]\n');
    writeFileSync(join(root, 'src/data/activities.yaml'), '[]\n');
    writeFileSync(join(root, 'src/data/paths.yaml'), '[]\n');
    writeFileSync(join(root, 'src/data/pinned.yaml'), '- id: pin-a\n  noteUid: know-one\n- id: pin-b\n  noteUid: know-one\n- id: pin-c\n  noteUid: know-missing\n');
    writeFileSync(join(root, 'src/content/notes/one.md'), '---\nuid: know-one\npermalink: one\npublication: published\npublishedAt: 2026-01-01\n---\nbody\n');
    const result = spawnSync(process.execPath, ['scripts/verify-content.mjs', root], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    for (const text of ['같은 글을 두 번 고정', '글이 없습니다']) assert.ok(result.stderr.includes(text), result.stderr);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
