#!/usr/bin/env node
// 문서 하나로는 알 수 없는 규칙을 빌드 전에 검사한다. 필드 형식은 src/content.config.ts가 맡는다.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readNoteSources } from './content-sources.mjs';
import { buildActivities } from '../src/lib/activity.ts';
import { validatePathReferences } from '../src/lib/paths.ts';
import { parse } from 'yaml';

const root = process.argv[2] ?? '.';
const errors = [];
let notes;
try { notes = readNoteSources(root); }
catch (error) { console.error(`✗ ${error.message}`); process.exit(1); }
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

let paths = [];
try {
  paths = parse(readFileSync(join(root, 'src/data/paths.yaml'), 'utf8'));
  if (!Array.isArray(paths)) throw new Error('paths는 배열이어야 합니다');
  validatePathReferences(paths, uids);
} catch (error) { errors.push(`경로: ${error.message}`); }

try {
  const pinnedPath = join(root, 'src/data/pinned.yaml');
  const pinned = existsSync(pinnedPath) ? parse(readFileSync(pinnedPath, 'utf8')) ?? [] : [];
  if (!Array.isArray(pinned)) throw new Error('pinned는 배열이어야 합니다');
  const pinIds = new Set(), pinUids = new Set();
  for (const pin of pinned) {
    if (!uids.has(pin?.noteUid)) errors.push(`src/data/pinned.yaml: ${pin?.id}의 글이 없습니다: ${pin?.noteUid}`);
    if (pinIds.has(pin?.id)) errors.push(`src/data/pinned.yaml: id 중복 ${pin.id}`);
    if (pinUids.has(pin?.noteUid)) errors.push(`src/data/pinned.yaml: 같은 글을 두 번 고정했습니다: ${pin.noteUid}`);
    pinIds.add(pin?.id); pinUids.add(pin?.noteUid);
  }
} catch (error) { errors.push(`고정: ${error.message}`); }

let activityCount = 0;
try {
  const manual = parse(readFileSync(join(root, 'src/data/activities.yaml'), 'utf8'));
  if (!Array.isArray(manual)) throw new Error('activities는 배열이어야 합니다');
  activityCount = buildActivities(notes, notes, manual, paths).length;
} catch (error) { errors.push(`활동: ${error.message}`); }

if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join('\n'));
  process.exit(1);
}
console.log(`verify-content: 글 ${notes.length}편, 앞으로 쓸 글 ${planned.length}개, 공개 활동 ${activityCount}건 통과`);
