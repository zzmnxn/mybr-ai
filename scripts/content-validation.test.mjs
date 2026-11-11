import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseNoteSource, readNoteSources } from './content-sources.mjs';

test('raw frontmatter preserves date precision and reports missing frontmatter', () => {
  assert.equal(parseNoteSource('---\nuid: know-one\npublishedAt: 2026-01-01\n---\nbody').publishedAt, '2026-01-01');
  assert.throws(() => parseNoteSource('body'), /프런트매터/);
});
test('verifier retains duplicate, draft, dangling and planned-reference failures', () => {
  const root = mkdtempSync(join(tmpdir(), 'mybr-content-'));
  try {
    mkdirSync(join(root, 'src/content/notes'), { recursive: true });
    mkdirSync(join(root, 'src/data'), { recursive: true });
    writeFileSync(join(root, 'src/data/planned.yaml'), '- id: plan-next\n  near: [missing]\n');
    writeFileSync(join(root, 'src/data/activities.yaml'), '[]\n');
    writeFileSync(join(root, 'src/data/paths.yaml'), '[]\n');
    for (const name of ['one', 'two']) writeFileSync(join(root, `src/content/notes/${name}.md`), '---\nuid: know-one\npermalink: one\npublication: draft\npublishedAt: 2026-01-01\nrelated:\n  - uid: plan-next\n    relation: related\nprerequisites: [missing]\n---\n');
    assert.equal(readNoteSources(root).length, 2);
    const result = spawnSync(process.execPath, ['scripts/verify-content.mjs', root], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    for (const text of ['uid 중복', 'permalink 중복', 'draft', '관계 대상', '없는 대상', 'near 대상']) assert.ok(result.stderr.includes(text), result.stderr);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
