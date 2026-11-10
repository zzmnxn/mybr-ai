import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const script = ts.transpileModule(
  readFileSync(new URL('../src/scripts/mermaid.ts', import.meta.url), 'utf8')
    .replace("await import('mermaid')", 'await loadMermaid()'),
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } },
).outputText;
const settle = () => new Promise((resolve) => setImmediate(resolve));

function setup({ fail = false, empty = false } = {}) {
  const canvas = { innerHTML: '', textContent: '' };
  const details = { open: false };
  const source = { textContent: 'flowchart LR\nA-->B' };
  const figure = {
    isConnected: true, dataset: {},
    querySelector: (selector) => selector === 'pre' ? source : selector === 'details' ? details : canvas,
  };
  const root = { dataset: { theme: 'light' } };
  const events = {};
  const calls = [];
  let observer;
  let loads = 0;
  const document = {
    documentElement: root, fonts: { ready: Promise.resolve() },
    querySelectorAll: (selector) => selector === '.mermaid-figure' && !empty ? [figure] : [],
    addEventListener: (name, callback) => { events[name] = callback; },
  };
  runInNewContext(script, {
    document,
    MutationObserver: class { constructor(callback) { observer = callback; } observe() {} },
    getComputedStyle: () => ({ getPropertyValue: () => '#4568A0' }),
    loadMermaid: async () => {
      loads++;
      return { default: {
        initialize: (config) => calls.push(config),
        render: async (_id, text) => {
          assert.equal(text, source.textContent);
          if (fail) throw new Error('Invalid diagram');
          return { svg: '<svg></svg>' };
        },
      } };
    },
  });
  return { canvas, details, figure, root, events, calls, change: () => observer(), loads: () => loads };
}

test('renders SVG, refreshes after theme changes and Astro navigation', async () => {
  const page = setup();
  await settle();
  assert.equal(page.canvas.innerHTML, '<svg></svg>');
  assert.equal(page.figure.dataset.renderTheme, 'light');
  assert.equal(page.calls[0].securityLevel, 'strict');
  page.root.dataset.theme = 'dark';
  page.change();
  await settle();
  assert.equal(page.figure.dataset.renderTheme, 'dark');
  assert.equal(page.calls.at(-1).themeVariables.darkMode, true);
  delete page.figure.dataset.renderTheme;
  page.events['astro:page-load']();
  await settle();
  assert.equal(page.figure.dataset.renderTheme, 'dark');
});

test('invalid diagram exposes the preserved source', async () => {
  const page = setup({ fail: true });
  await settle();
  assert.equal(page.details.open, true);
  assert.match(page.canvas.textContent, /표시하지 못했습니다/);
  assert.equal(page.figure.dataset.renderTheme, undefined);
});

test('pages without diagrams do not load Mermaid', async () => {
  const page = setup({ empty: true });
  await settle();
  assert.equal(page.loads(), 0);
});

