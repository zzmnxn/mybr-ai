import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calendarDate, buildActivities, groupActivitiesByDay } from '../src/lib/activity.ts';
import { readNoteSources } from './content-sources.mjs';
const notes = [{ data: { uid: 'know-one', publishedAt: '2026-01-01', related: [{ uid: 'know-two', relation: 'references' }] } }, { data: { uid: 'know-two', publishedAt: '2026-01-02' } }];
const manual = { id: 'act-review', kind: 'review', on: '2026-01-03', noteUid: 'know-one' };
test('date-only remains unchanged; instants use Seoul and validate calendar dates', () => {
  assert.deepEqual(calendarDate('0001-01-01'), { day: '0001-01-01', precision: 'date' });
  assert.equal(calendarDate('2026-01-01T15:00:00Z').day, '2026-01-02');
  assert.equal(calendarDate('2024-02-29').day, '2024-02-29');
  for (const bad of ['2026-02-29', '0000-01-01', '2026-01-01T00:00:00', '2026-02-30T12:00:00Z']) assert.throws(() => calendarDate(bad));
});
test('current notes yield exactly eleven stable publish records without private fields', () => {
  const raw = readNoteSources();
  const first = buildActivities(raw, raw, []);
  assert.equal(first.length, 11);
  assert.deepEqual(first, buildActivities(raw, raw, []));
  assert.ok(first.every(e => e.kind === 'publish' && !('file' in e) && !('publishedAt' in e)));
});
test('manual records reject private, duplicates, missing references and wrong link direction', () => {
  assert.equal(buildActivities(notes, notes, [manual]).length, 3);
  for (const events of [
    [{ ...manual, visibility: 'private' }], [manual, { ...manual, id: 'act-other' }],
    [{ ...manual, noteUid: 'missing' }], [{ ...manual, on: '9999-01-01' }],
    [{ ...manual, secret: 'sentinel' }],
    [{ id: 'act-link', kind: 'link', on: manual.on, fromUid: 'know-two', toUid: 'know-one', relation: 'references' }],
  ]) assert.throws(() => buildActivities(notes, notes, events));
  const link = { id: 'act-link', kind: 'link', on: manual.on, fromUid: 'know-one', toUid: 'know-two', relation: 'references' };
  assert.deepEqual(buildActivities(notes, notes, [link]).find(e => e.kind === 'link').noteUids, ['know-one', 'know-two']);
  const revise = { id: 'act-revise', kind: 'revise', on: manual.on, noteUid: 'know-one', evidenceKey: 'private-key' };
  assert.ok(!JSON.stringify(buildActivities(notes, notes, [revise])).includes('private-key'));
  assert.throws(() => buildActivities(notes, notes, [revise, { ...revise, id: 'act-other' }]));
});

test('daily counts and month totals use the same verified events', () => {
  const events = buildActivities(notes, notes, [manual]);
  const days = groupActivitiesByDay(events);
  assert.equal([...days.values()].reduce((total, day) => total + day.length, 0), events.length);
  assert.equal(days.get('2026-01-03').length, 1);
});
test('publish dates never fall back to imported, created or updated dates', () => {
  assert.throws(() => buildActivities(notes, [{ data: { uid: 'know-one', originalPublishedAt: '2026-01-01', createdAt: '2026-01-01' } }], []));
  assert.throws(() => buildActivities([{ data: { uid: 'know-one' } }], [{ data: { uid: 'know-one', publishedAt: '9999-01-01' } }], []));
});
test('same-day events use stable kind then ID order', () => {
  const raw = [{ data: { uid: 'know-one', publishedAt: '2026-01-03' } }];
  const events = buildActivities(raw, raw, [manual]);
  assert.deepEqual(events.map(event => event.kind), ['publish', 'review']);
});
test('path activities resolve real paths and validate creation date', () => {
  const paths = [{id:'path-real',publishedOn:'2026-01-03'}];
  const event = {id:'act-path',kind:'path-create',on:'2026-01-03',pathId:'path-real'};
  assert.equal(buildActivities(notes,notes,[event],paths).find(e=>e.pathId==='path-real').kind,'path-create');
  assert.throws(()=>buildActivities(notes,notes,[{...event,on:'2026-01-02'}],paths));
  assert.throws(()=>buildActivities(notes,notes,[{...event,pathId:'path-missing'}],paths));
});
