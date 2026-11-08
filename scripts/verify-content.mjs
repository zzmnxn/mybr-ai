#!/usr/bin/env node
// 문서 하나로는 알 수 없는 규칙을 빌드 전에 검사한다. 필드 형식은 src/content.config.ts가 맡는다.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse } from 'yaml';

const root = process.argv[2] ?? '.';
const notesDir = join(root, 'src/content/notes');
const errors = [];

function markdownFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return markdownFiles(path);
    return name.endsWith('.md') ? [path] : [];
  });
}

const notes = markdownFiles(notesDir).map((path) => {
  const match = readFileSync(path, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const file = relative(root, path);
  if (!match) {
    errors.push(`${file}: 프런트매터가 없습니다`);
    return { file, data: {} };
  }
  return { file, data: parse(match[1]) ?? {} };
});
const planned = parse(readFileSync(join(root, 'src/data/planned.yaml'), 'utf8')) ?? [];

function unique(items, key, label) {
  const seen = new Map();
  for (const { file, data } of items) {
    const value = data[key];
    if (value === undefined) continue;
    if (seen.has(value)) errors.push(`${file}: ${label} 중복 ${value} (${seen.get(value)})`);
    seen.set(value, file);
  }
}
unique(notes, 'uid', 'uid');
unique(notes, 'permalink', 'permalink');

const uids = new Set(notes.map((n) => n.data.uid));
const planIds = new Set(planned.map((p) => p.id));
const permalinks = new Set(notes.map((n) => n.data.permalink));

for (const { file, data } of notes) {
  if (data.publication === 'draft') errors.push(`${file}: draft는 공개 저장소에 둘 수 없습니다`);
  const targets = [...(data.related ?? []).map((r) => r.uid), ...(data.prerequisites ?? []), ...(data.projectRefs ?? [])];
  for (const target of targets) {
    if (planIds.has(target)) errors.push(`${file}: 앞으로 쓸 글은 관계 대상이 될 수 없습니다: ${target}`);
    else if (!uids.has(target)) errors.push(`${file}: 없는 대상을 참조합니다: ${target}`);
  }
  for (const old of data.redirectFrom ?? []) {
    if (permalinks.has(old)) errors.push(`${file}: redirectFrom이 다른 글의 permalink와 충돌합니다: ${old}`);
  }
}

const seenPlans = new Set();
for (const plan of planned) {
  if (seenPlans.has(plan.id)) errors.push(`src/data/planned.yaml: id 중복 ${plan.id}`);
  seenPlans.add(plan.id);
  for (const target of plan.near ?? []) {
    if (!uids.has(target) && !planIds.has(target)) errors.push(`src/data/planned.yaml: ${plan.id}의 near 대상이 없습니다: ${target}`);
  }
}

if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join('\n'));
  process.exit(1);
}
console.log(`verify-content: 글 ${notes.length}편, 앞으로 쓸 글 ${planned.length}개 통과`);
