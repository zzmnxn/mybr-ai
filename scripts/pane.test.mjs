import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PANE_DEFAULT, PANE_MAX, PANE_MIN, clampPaneWidth } from '../src/lib/pane.ts';

test('pane width stays inside its limits and falls back for bad values', () => {
  assert.equal(clampPaneWidth(10), PANE_MIN);
  assert.equal(clampPaneWidth(9999), PANE_MAX);
  assert.equal(clampPaneWidth(333.6), 334);
  for (const bad of [undefined, null, 'wide', Number.NaN, Infinity]) assert.equal(clampPaneWidth(bad), PANE_DEFAULT);
});

import { HISTORY_GRAPH_MIN, HISTORY_MIN, clampHistoryHeight } from '../src/lib/pane.ts';

test('history panel height keeps the graph visible and falls back for bad values', () => {
  assert.equal(clampHistoryHeight(10, 800), HISTORY_MIN);
  assert.equal(clampHistoryHeight(9999, 800), 800 - HISTORY_GRAPH_MIN);
  assert.equal(clampHistoryHeight(333.4, 800), 333);
  assert.equal(clampHistoryHeight(500, 300), HISTORY_MIN);
  for (const bad of [undefined, null, 'tall', Number.NaN, Infinity]) assert.equal(clampHistoryHeight(bad, 800), null);
});
