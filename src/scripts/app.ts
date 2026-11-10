import { navigate } from 'astro:transitions/client';
import { createBrain, type Brain, type Kind, type NodeInput } from './brain';
import type { GraphData } from '../lib/graph';
import './mermaid';

const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<T>(s)];
const narrow = () => innerWidth < 900;
const local = {
  get<T>(k: string, d: T): T { try { return (JSON.parse(localStorage.getItem(k) ?? 'null') as T) ?? d; } catch { return d; } },
  set(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 저장소 없이도 동작한다 */ } },
};
const KIND: Record<string, Kind> = { section: 'hub', kind: 'tag', domain: 'tag', tag: 'tag', growth: 'tag', heading: 'real', planned: 'ghost' };
const FILTERS = ['growth', 'kind', 'domain', 'tag'] as const;
type Filter = (typeof FILTERS)[number];

let graph: GraphData = { nodes: [], edges: [], viewNodes: [], viewLinks: [] };
let brain: Brain | null = null;
let view = 'map';
let trail: string[] = local.get('mybr-trail', []);
const threadPaths = new Map<HTMLElement, SVGPathElement>();
const NS = 'http://www.w3.org/2000/svg';

/* 글 제목과 점을 잇는 실. 첫 화면에서는 늘, 목록에서는 가리킬 때만 보인다. */
function threads() {
  if (!brain) return;
  const svg = $<SVGSVGElement>('#threads');
  if (!svg) return;
  const hide = view === 'note' || view === 'about';
  svg.classList.toggle('off', hide);
  if (hide) return;
  threadPaths.forEach((p, r) => {
    const id = r.dataset.row!, o = r.getBoundingClientRect();
    const on = r.classList.contains('lit') || r.matches(':hover,:focus-within');
    if (!r.isConnected || !o.width || !brain!.has(id) || !(on || (view === 'map' && r.dataset.written && !narrow()))) { p.setAttribute('d', ''); return; }
    const [x2, y2] = brain!.screen(id), up = y2 < o.top && Math.abs(x2 - o.left) < o.width;
    const x1 = up ? o.left + 24 : o.right, y1 = up ? o.top : o.top + o.height / 2, w = (x2 - x1) * 0.5;
    p.setAttribute('d', up ? `M${x1} ${y1} C${x1} ${(y1 + y2) / 2} ${x2} ${(y1 + y2) / 2} ${x2} ${y2}` : `M${x1} ${y1} C${x1 + w} ${y1} ${x2 - w} ${y2} ${x2} ${y2}`);
    p.classList.toggle('lit', on);
  });
}
function tieRows() {
  const svg = $<SVGSVGElement>('#threads');
  threadPaths.forEach((p) => p.remove()); threadPaths.clear();
  if (!svg || !brain) return;
  for (const r of $$('[data-row]')) {
    const p = svg.appendChild(document.createElementNS(NS, 'path'));
    p.setAttribute('class', 'thread'); threadPaths.set(r, p);
    const id = r.dataset.row!, link = $('a', r);
    r.addEventListener('pointerenter', () => brain!.light(id));
    r.addEventListener('pointerleave', () => brain!.light(null));
    link?.addEventListener('focus', () => brain!.light(id));
    link?.addEventListener('blur', () => brain!.light(null));
  }
}

/* 필터: 주소의 쿼리가 상태다. 같은 묶음은 OR, 묶음끼리는 AND. */
function readFilters() {
  const q = new URLSearchParams(location.search);
  return Object.fromEntries(FILTERS.map((f) => [f, new Set((q.get(f) ?? '').split('|').filter(Boolean))])) as Record<Filter, Set<string>>;
}
function writeQuery(f: Record<Filter, Set<string>>) {
  const q = new URLSearchParams();
  FILTERS.forEach((k) => { if (f[k].size) q.set(k, [...f[k]].join('|')); });
  const s = q.toString();
  return s ? `?${s}` : '';
}
type Item = { growth: string; kind: string; domains: string[]; tags: string[] };
const values = (n: Item, f: Filter) => (f === 'growth' ? [n.growth] : f === 'kind' ? [n.kind] : f === 'domain' ? n.domains : n.tags);
const passes = (n: Item, f: Record<Filter, Set<string>>, skip?: Filter) =>
  FILTERS.every((k) => k === skip || !f[k].size || values(n, k).some((v) => f[k].has(v)));

function applyFilters() {
  const main = $('[data-view]'), section = main?.dataset.section, f = readFilters();
  const pool = graph.nodes.filter((n) => !section || n.section === section);
  const active = FILTERS.some((k) => f[k].size);
  for (const b of $$('.f')) {
    const name = b.dataset.f as Filter, v = b.dataset.v!;
    const n = pool.filter((x) => passes(x, f, name) && values(x, name).includes(v)).length;
    b.setAttribute('aria-pressed', String(f[name].has(v)));
    b.classList.toggle('f-zero', n === 0);
    $('em', b)!.textContent = String(n);
  }
  $$('.f-clear').forEach((c) => { c.hidden = !active; });
  const listing = $('#listbody');
  if (!listing || !$('.filter-box')) return;
  let shown = 0;
  for (const e of $$('[data-posts] .entry', listing)) {
    const item: Item = { growth: e.dataset.growth!, kind: e.dataset.kind!, domains: (e.dataset.domains ?? '').split(' ').filter(Boolean), tags: JSON.parse(e.dataset.tags ?? '[]') };
    e.hidden = !passes(item, f); if (!e.hidden) shown++;
  }
  const none = $('.no-match', listing), plans = $('.plans', listing), note = $('#list-note');
  if (none) none.hidden = !(active && shown === 0);
  if (plans) plans.hidden = active;
  if (note) note.textContent = `글 ${shown}편`;
}
function bindFilters() {
  for (const b of $$('.f')) b.addEventListener('click', () => {
    const f = readFilters(), name = b.dataset.f as Filter, v = b.dataset.v!;
    if (f[name].has(v)) f[name].delete(v); else f[name].add(v);
    if ($('.filter-box')) { history.replaceState(history.state, '', location.pathname + writeQuery(f)); applyFilters(); }
    else navigate(`${$<HTMLAnchorElement>('.cat')!.getAttribute('href')}${writeQuery(f)}`);
  });
  for (const c of $$('.f-clear')) c.addEventListener('click', () => {
    history.replaceState(history.state, '', location.pathname); applyFilters();
    $('#list-title')?.focus({ preventScroll: true });
  });
}

/* 읽은 자리를 잇는 길 */
function walk(id: string) {
  if (!brain || trail[trail.length - 1] === id) return;
  if (trail.length) brain.fire(trail[trail.length - 1], id, 0);
  trail = [...trail, id].slice(-40);
  local.set('mybr-trail', trail); brain.trail(trail); showClear();
}
function showClear() { $$('.trail-clear').forEach((b) => { b.hidden = !trail.length; }); }

function frameMap(focusId: string | null) {
  if (!brain || narrow()) return;
  const [W, H] = brain.size();
  if (view === 'list') brain.miniOn(focusId, W - 170, H / 2, 0.6);
  else brain.miniOn(focusId, W - 170, 170, 0.72);
}
function focusSet(id: string | undefined) {
  if (!brain || !id || !brain.has(id)) return null;
  return new Set([id, ...brain.adj.get(id)!]);
}

let spy: (() => void) | null = null;
function bindReader() {
  const reader = $('.reader'), bar = $('.progress');
  if (!reader) return;
  const note = $('#note'), uid = note?.dataset.uid;
  const heads = note ? $$('.prose h2[id]', note) : [];
  let current = -1;
  spy = () => {
    bar?.style.setProperty('--progress', String(reader.scrollTop / Math.max(1, reader.scrollHeight - reader.clientHeight)));
    threads();
    if (!uid) return;
    let i = -1; const t = reader.getBoundingClientRect().top + reader.clientHeight * 0.4;
    heads.forEach((h, n) => { if (h.getBoundingClientRect().top < t) i = n; });
    if (i === current) return;
    current = i;
    const id = i >= 0 ? `heading-${uid}-${heads[i].id}` : null;
    brain?.mark(id); if (id) walk(id);
  };
  reader.addEventListener('scroll', spy, { passive: true });
  const prose = $('.prose', reader);
  if (prose) {
    for (const link of $$<HTMLAnchorElement>('a[href]', prose)) {
      if (!['http:', 'https:'].includes(link.protocol) || link.origin === location.origin || link.dataset.external) continue;
      link.dataset.external = 'true';
      const icon = document.createElement('span');
      icon.className = 'external-icon'; icon.textContent = '↗'; icon.setAttribute('aria-hidden', 'true');
      const hint = document.createElement('span');
      hint.className = 'visually-hidden'; hint.textContent = ' (외부 링크)';
      link.append(icon, hint);
    }
    document.documentElement.classList.add('ink');
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('inked'); io.unobserve(e.target); } }), { root: reader, rootMargin: '0px 0px -18% 0px' });
    $$('strong', prose).forEach((s) => io.observe(s));
    for (const pre of $$('pre', prose)) {
      if (pre.dataset.language === 'mermaid' || pre.querySelector('code.language-mermaid')) continue;
      if (pre.parentElement?.classList.contains('code')) continue;
      const box = document.createElement('div'); box.className = 'code';
      pre.replaceWith(box); box.append(pre); pre.tabIndex = 0;
      const label = document.createElement('span');
      label.className = 'code-label'; label.textContent = pre.dataset.language || 'code';
      box.prepend(label);
      const copy = document.createElement('button');
      copy.type = 'button'; copy.className = 'copy'; copy.textContent = '복사'; box.prepend(copy);
      copy.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(pre.textContent ?? ''); copy.textContent = '복사됨'; } catch { copy.textContent = '복사 실패'; }
        setTimeout(() => { copy.textContent = '복사'; }, 1500);
      });
    }
  }
  for (const a of $$('[data-row-hover]', document)) {
    const id = a.dataset.rowHover!;
    a.addEventListener('pointerenter', () => brain?.light(id)); a.addEventListener('pointerleave', () => brain?.light(null));
    a.addEventListener('focus', () => brain?.light(id)); a.addEventListener('blur', () => brain?.light(null));
  }
}

function syncPage() {
  const main = $('[data-view]');
  view = main?.dataset.view ?? 'map';
  const focusId = main?.dataset.focus;
  $$('.fold').forEach((b) => b.addEventListener('click', () => setFold(true)));
  $$('.cat').forEach((a) => {
    const s = a.dataset.section; if (!s) return;
    a.addEventListener('pointerenter', () => { if (view === 'map') brain?.light(`section-${s}`); });
    a.addEventListener('pointerleave', () => brain?.light(null));
  });
  $('.trail-clear')?.addEventListener('click', () => { trail = []; local.set('mybr-trail', []); brain?.trail([]); showClear(); });
  showClear(); bindFilters(); applyFilters(); tieRows(); bindReader();
  if (brain) {
    brain.mark(null);
    if (view === 'map') { brain.miniOff(); brain.focus(null); }
    else { brain.focus(focusSet(focusId)); frameMap(focusId && brain.has(focusId) ? focusId : null); }
    if (view === 'note' && focusId) walk(focusId);
  }
  if (view !== 'map' && !$('.f[aria-pressed="true"]:focus')) $<HTMLElement>('.reader h1')?.focus({ preventScroll: true });
  threads();
}

function setFold(v: boolean) {
  document.documentElement.toggleAttribute('data-fold', v);
  local.set('mybr-fold', v);
  (v ? $('.unfold') : $('.fold'))?.focus();
}

async function boot() {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL.replace(/\/$/, '')}/graph.json`);
    if (res.ok) graph = await res.json();
  } catch { /* 그래프가 없어도 목록과 글은 동작한다 */ }
  const svg = $<SVGSVGElement>('#brain');
  const nodes: NodeInput[] = [
    ...graph.nodes.map((n) => ({ id: n.uid, label: n.title, kind: 'post' as Kind, url: n.url, growth: n.growth })),
    ...graph.viewNodes.map((n) => ({ id: n.id, label: n.label, kind: KIND[n.type], url: n.url })),
  ];
  if (svg) {
    brain = createBrain(svg, {
      nodes, links: [...graph.edges, ...graph.viewLinks],
      spread: narrow() ? 0.62 : 1.3, scale: narrow() ? 0.82 : 1, margin: narrow() ? 30 : 84, startK: narrow() ? 1 : 1.4,
      inset() { const r = $('.recent'), s = $('.stage'); return r && s && !narrow() ? Math.max(0, r.getBoundingClientRect().right - s.getBoundingClientRect().left) : 0; },
      onNode(d, e) { e.preventDefault(); if (d.url) navigate(d.url); },
      onHover(id) { $$('[data-row]').forEach((r) => r.classList.toggle('lit', r.dataset.row === id)); threads(); },
      onFrame: threads,
      onResize() { threads(); },
    });
    brain.trail(trail.filter((id) => brain!.has(id)));
    $('.z-in')?.addEventListener('click', () => brain!.zoomBy(1.4));
    $('.z-out')?.addEventListener('click', () => brain!.zoomBy(1 / 1.4));
    $('.z-fit')?.addEventListener('click', () => brain!.fit(420));
    $('.unfold')?.addEventListener('click', () => setFold(false));
    const stop = $('.stop')!, label = () => { stop.textContent = brain!.isPaused() ? '다시 움직이기' : '움직임 멈추기'; stop.setAttribute('aria-pressed', String(brain!.isPaused())); };
    stop.addEventListener('click', () => { brain!.setPaused(!brain!.isPaused()); label(); }); label();
  }
  syncPage();
  document.addEventListener('astro:page-load', syncPage);
}

document.addEventListener('astro:before-preparation', () => { document.documentElement.dataset.from = view; });
document.addEventListener('astro:after-swap', () => { document.documentElement.dataset.from = view; });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && view !== 'map') $<HTMLAnchorElement>('.reader .close')?.click();
});
boot();
