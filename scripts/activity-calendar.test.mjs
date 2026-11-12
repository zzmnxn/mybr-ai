import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monthNetwork, monthSummary, shortDateLabel, layoutMonth, selectActivityDate, shiftMonth, symbolLevel, dateLabel, validateActivityPayload } from '../src/lib/activity-calendar.ts';
const events = [{ id: 'publish:know-one', kind: 'publish', source: 'frontmatter', day: '2026-10-12', precision: 'date', noteUids: ['know-one'] }];
test('month selection respects URL, Seoul today, conflicts and boundaries', () => {
  assert.deepEqual(selectActivityDate(new URLSearchParams(), events, '2026-11-11'), { month: '2026-11', day: '2026-11-11', corrected: false });
  assert.equal(selectActivityDate(new URLSearchParams('month=2026-10'), events, '2026-11-11').day, '2026-10-12');
  assert.equal(selectActivityDate(new URLSearchParams('month=2026-10&day=2026-11-01'), events, '2026-11-11').day, '2026-10-12');
  assert.equal(selectActivityDate(new URLSearchParams('month=2026-02&day=2026-02-30'), events, '2026-11-11').day, '2026-02-01');
  assert.equal(selectActivityDate(new URLSearchParams('month=0000-01'), events, '2026-11-11').corrected, true);
  assert.equal(shiftMonth('0001-01', -1), null);
  assert.equal(shiftMonth('9999-12', 1), null);
  assert.equal(shiftMonth('2026-12', 1), '2027-01');
  assert.match(dateLabel('2026-11-11'), /수요일/);
  assert.deepEqual([0, 1, 2, 3, 4, 5, 8].map(symbolLevel), [0, 1, 2, 3, 4, 5, 5]);
});
test('layout is deterministic, date ordered and keeps 44px targets apart at every size', () => {
  for (const width of [140, 288, 320, 390, 768, 1050]) for (const [year, month, count] of [[2026, 2, 28], [2024, 2, 29], [2026, 4, 30], [2026, 1, 31]]) {
    const layout = layoutMonth(year, month, width);
    assert.deepEqual(layout, layoutMonth(year, month, width));
    assert.equal(layout.days.length, count);
    layout.days.forEach((p, i) => {
      assert.equal(p.day, i + 1);
      assert.ok(p.x >= 22 && p.x <= width - 22);
      assert.ok(p.y >= 22 && p.y <= layout.height - 22);
      for (const q of layout.days.slice(i + 1)) assert.ok(Math.abs(p.x - q.x) >= 56 || Math.abs(p.y - q.y) >= 56);
    });
    assert.ok(!JSON.stringify(layout).includes('NaN'));
  }
});
test('payload boundary rejects bad data instead of treating it as an empty month', () => {
  const payload = { events, notes: { 'know-one': { title: '현재 글', url: '/mybr-ai/notes/one' } } };
  assert.deepEqual(validateActivityPayload(payload, '/mybr-ai'), payload);
  for (const bad of [null, {}, { ...payload, events: [{}] }, { ...payload, notes: { 'know-one': { title: 'X', url: 'javascript:alert(1)' } } }, { ...payload, events: [{ ...events[0], private: 'sentinel' }] }]) assert.throws(() => validateActivityPayload(bad, '/mybr-ai'));
});

test('month summary and short labels come from one event array', () => {
  const list = [{ day: '2026-11-11' }, { day: '2026-11-11' }, { day: '2026-11-10' }, { day: '2026-10-31' }];
  assert.deepEqual(monthSummary(list, '2026-11'), { total: 3, activeDays: 2, peak: { day: '2026-11-11', count: 2 } });
  assert.deepEqual(monthSummary(list, '2026-09'), { total: 0, activeDays: 0, peak: null });
  assert.equal(shortDateLabel('2026-11-11'), '11월 11일 (수)');
});

test('month network keeps one node per active day inside bounds and in date order', () => {
  const list = [{ day: '2026-11-11' }, { day: '2026-11-11' }, { day: '2026-11-03' }, { day: '2026-11-20' }, { day: '2026-10-31' }];
  const net = monthNetwork(list, '2026-11');
  assert.deepEqual(net.nodes.map(n => n.day), ['2026-11-03', '2026-11-11', '2026-11-20']);
  assert.equal(net.nodes.reduce((a, n) => a + n.count, 0), 4);
  assert.deepEqual(net.edges, [[0, 1], [1, 2]]);
  assert.deepEqual(net.nodes.filter(n => n.peak).map(n => n.day), ['2026-11-11']);
  for (const n of net.nodes) assert.ok(n.x >= n.r && n.x <= net.width - n.r && n.y >= n.r && n.y <= net.height - n.r);
  assert.deepEqual(monthNetwork(list, '2026-09').nodes, []);
  assert.equal(monthNetwork(list.slice(0, 1), '2026-11').edges.length, 0);
});

test('month network scatters a full month through the interior without overlapping nodes', () => {
  for (const activitiesPerDay of [1, 6]) {
    const days = Array.from({ length: 30 }, (_, i) => ({ day: `2026-11-${String(i + 1).padStart(2, '0')}` }));
    const events = days.flatMap(day => Array.from({ length: activitiesPerDay }, () => day));
    const net = monthNetwork(events, '2026-11');
    assert.deepEqual(net, monthNetwork([...events].reverse(), '2026-11'));
    const interior = net.nodes.filter(node => Math.abs(node.x - net.width / 2) < net.width * .3 && Math.abs(node.y - net.height / 2) < net.height * .3);
    assert.ok(interior.length >= 6, 'the center should contain days instead of an empty oval');
    for (const [i, node] of net.nodes.entries()) {
      assert.ok(node.x >= node.r && node.x <= net.width - node.r);
      assert.ok(node.y >= node.r && node.y <= net.height - node.r);
      for (const other of net.nodes.slice(i + 1)) assert.ok(Math.hypot(node.x - other.x, node.y - other.y) >= node.r + other.r + 3, 'date nodes should stay apart');
    }
    assert.equal(net.path.match(/M/g)?.length, 29);
    assert.equal(net.path.match(/Q/g)?.length, 29);
    assert.ok(!net.path.includes('NaN'));
  }
});

test('month network keeps the largest nodes apart in a 31-day month', () => {
  const events = Array.from({ length: 31 }, (_, i) => Array.from({ length: 6 }, () => ({ day: `2026-03-${String(i + 1).padStart(2, '0')}` }))).flat();
  const { nodes } = monthNetwork(events, '2026-03');
  for (const [i, node] of nodes.entries()) for (const other of nodes.slice(i + 1)) assert.ok(Math.hypot(node.x - other.x, node.y - other.y) >= node.r + other.r + 3);
});
