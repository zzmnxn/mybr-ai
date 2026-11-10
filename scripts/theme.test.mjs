import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../src/scripts/theme.js', import.meta.url), 'utf8');

function setup({ dark = false, saved = null, blocked = false } = {}) {
  const events = new Map();
  const control = { id: 'theme-choice', textContent: '시스템' };
  const options = ['system', 'light', 'dark'].map((themeOption) => ({
    dataset: { themeOption }, pressed: null,
    setAttribute(name, value) { if (name === 'aria-pressed') this.pressed = value; },
    closest() { return this; },
  }));
  const summary = { focused: false, focus() { this.focused = true; } };
  const dropdown = { open: false, contains: (target) => options.includes(target), querySelector: () => summary };
  const root = { dataset: {} };
  let onSystemChange;
  const system = { matches: dark, addEventListener: (_, handler) => { onSystemChange = handler; } };
  const storage = new Map(saved === null ? [] : [['mybr-theme', saved]]);
  runInNewContext(source, {
    matchMedia: () => system,
    localStorage: {
      getItem: (key) => { if (blocked) throw Error('blocked'); return storage.get(key); },
      setItem: (key, value) => { if (blocked) throw Error('blocked'); storage.set(key, value); },
    },
    document: {
      documentElement: root,
      querySelector: (selector) => selector === '#theme-choice' ? control : dropdown,
      querySelectorAll: () => options,
      addEventListener: (name, handler) => events.set(name, handler),
    },
  });
  return { root, control, storage, events, options, dropdown, summary,
    systemChange(value) { system.matches = value; onSystemChange(); },
    choose(value) { events.get('click')({ target: options.find((option) => option.dataset.themeOption === value) }); },
  };
}

test('system preference applies before the first paint and follows OS changes', () => {
  const page = setup({ dark: true });
  assert.equal(page.root.dataset.theme, 'dark');
  page.systemChange(false);
  assert.equal(page.root.dataset.theme, 'light');
});

test('saved choice overrides the OS, persists changes, and supports returning to system', () => {
  const page = setup({ dark: true, saved: 'light' });
  assert.equal(page.root.dataset.theme, 'light');
  page.events.get('DOMContentLoaded')();
  assert.equal(page.control.textContent, '라이트');
  page.choose('dark');
  assert.equal(page.root.dataset.theme, 'dark');
  assert.equal(page.storage.get('mybr-theme'), 'dark');
  page.systemChange(false);
  assert.equal(page.root.dataset.theme, 'dark');
  page.choose('system');
  assert.equal(page.root.dataset.theme, 'light');
  assert.equal(page.storage.get('mybr-theme'), 'system');
});

test('Astro navigation applies the theme before swap and restores the dropdown', () => {
  const page = setup({ saved: 'dark' });
  const nextRoot = { dataset: {} };
  page.events.get('astro:before-swap')({ newDocument: { documentElement: nextRoot } });
  assert.equal(nextRoot.dataset.theme, 'dark');
  page.control.textContent = '시스템';
  page.events.get('astro:page-load')();
  assert.equal(page.control.textContent, '다크');
});

test('unavailable storage and invalid stored values fall back safely', () => {
  const page = setup({ dark: true, blocked: true });
  assert.equal(page.root.dataset.theme, 'dark');
  page.choose('light');
  assert.equal(page.root.dataset.theme, 'light');
  assert.equal(setup({ dark: true, saved: 'unexpected' }).root.dataset.theme, 'dark');
});


test('selecting a theme marks it selected, closes the dropdown, and returns focus', () => {
  const page = setup();
  page.dropdown.open = true;
  page.choose('dark');
  assert.equal(page.options[2].pressed, 'true');
  assert.equal(page.options[0].pressed, 'false');
  assert.equal(page.control.textContent, '다크');
  assert.equal(page.dropdown.open, false);
  assert.equal(page.summary.focused, true);
});

test('outside clicks and Escape dismiss the dropdown without closing the reader', () => {
  const page = setup();
  page.dropdown.open = true;
  page.events.get('click')({ target: { closest: () => null } });
  assert.equal(page.dropdown.open, false);
  page.dropdown.open = true;
  let prevented = false, stopped = false;
  page.events.get('keydown')({ key: 'Escape', preventDefault() { prevented = true; }, stopPropagation() { stopped = true; } });
  assert.equal(page.dropdown.open, false);
  assert.equal(page.summary.focused, true);
  assert.ok(prevented && stopped);
});
