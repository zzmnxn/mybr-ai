import type { GraphData } from '../lib/graph';
import { seoulToday } from '../lib/activity-calendar';
import { compareSelections, nodesAt, selectHistoryDay, validateHistoryIndex, type HistoryIndex } from '../lib/temporal-graph';
import { HISTORY_KEY, clampHistoryHeight } from '../lib/pane';
export function mountHistory(root: HTMLElement, options: { graph: GraphData; showAt(uids: Set<string>): void; restoreCurrent(): void; refit?(): void }): () => void {
  const $ = <T extends Element = HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const lifetime = new AbortController();
  let request: AbortController | undefined, active = true, generation = 0;
  let index: HistoryIndex | undefined, previous: Set<string> | undefined, selectedDay: string | undefined;
  const today = seoulToday();
  const input = $<HTMLInputElement>('[data-history-day]');
  const notes = new Map(options.graph.nodes.map(note => [note.uid, note]));
  function list(selector: string, uids: Iterable<string>) {
    const target = $(selector); target.replaceChildren();
    for (const uid of uids) {
      const note = notes.get(uid)!;
      const li = document.createElement('li'), link = document.createElement('a'); link.href = note.url; link.textContent = note.title; li.append(link); target.append(li);
    }
  }
  function show(day: string, write = false) {
    if (!index || !active) return;
    input.value = day;
    if (write) {
      const next = new URL(location.href); next.search = new URLSearchParams({ at: day }).toString();
      if (next.href !== location.href) history.pushState(history.state, '', next);
    }
    if (selectedDay === day) return;
    const selected = nodesAt(index, day);
    options.showAt(selected);
    const comparison = previous ? compareSelections(previous, selected) : undefined;
    $('[data-history-count]').textContent = `${day}까지 발행한 글 ${selected.size}편`;
    $('[data-history-comparison]').textContent = comparison ? `직전 선택 대비 추가 ${comparison.addedUids.length}편 · 제외 ${comparison.removedUids.length}편` : '첫 선택입니다.';
    const missing = [...notes.keys()].filter(uid => !selected.has(uid));
    $('[data-history-missing-count]').textContent = `오늘의 ${index.currentCount}편 중 선택일에 아직 발행되지 않은 글 ${missing.length}편`;
    list('[data-history-selected]', selected); list('[data-history-missing]', missing);
    $('[data-history-status]').textContent = selected.size ? `${selected.size}편을 표시했습니다.` : '선택일까지 발행한 글이 없습니다.';
    const dates = index.nodes.map(node => node.publishedOn);
    $<HTMLButtonElement>('[data-history-previous]').disabled = !dates.some(date => date < day);
    $<HTMLButtonElement>('[data-history-next]').disabled = !dates.some(date => date > day);
    previous = selected; selectedDay = day;
  }
  function fromUrl() {
    const selected = selectHistoryDay(new URLSearchParams(location.search).get('at'), today);
    if (selected.corrected) {
      const next = new URL(location.href); next.search = new URLSearchParams({ at: selected.day }).toString();
      history.replaceState(history.state, '', next);
    }
    show(selected.day);
    if (selected.corrected) $('[data-history-status]').textContent = '날짜를 확인해 오늘로 이동했습니다.';
  }
  async function load() {
    request?.abort(); request = new AbortController(); const token = ++generation;
    $('[data-history-error]').hidden = true; root.setAttribute('aria-busy', 'true');
    try {
      const response = await fetch(root.dataset.endpoint!, { signal: request.signal });
      if (!response.ok) throw new Error('시간 기록 응답 오류');
      const data = validateHistoryIndex(await response.json(), new Set(notes.keys()));
      if (!active || token !== generation) return;
      index = data;
      $('[data-history-form]').hidden = false; $('[data-history-result]').hidden = false; $('[data-history-fallback]').hidden = true;
      fromUrl();
    } catch {
      if (!active || token !== generation || request.signal.aborted) return;
      $('[data-history-error]').hidden = false;
    } finally { if (active && token === generation) root.removeAttribute('aria-busy'); }
  }
  function commit() { const selected = selectHistoryDay(input.value, today); show(selected.day, true); if (selected.corrected) $('[data-history-status]').textContent = '날짜를 확인해 오늘로 이동했습니다.'; }
  $('[data-history-form]').addEventListener('submit', event => { event.preventDefault(); commit(); }, { signal: lifetime.signal });
  input.addEventListener('change', commit, { signal: lifetime.signal });
  for (const [selector, direction] of [['[data-history-previous]', -1], ['[data-history-next]', 1]] as const) {
    $(selector).addEventListener('click', () => {
      if (!index || !selectedDay) return;
      const dates = [...new Set(index.nodes.map(node => node.publishedOn))].sort();
      const date = direction < 0 ? dates.filter(date => date < selectedDay!).at(-1) : dates.find(date => date > selectedDay!);
      if (date) show(date, true);
    }, { signal: lifetime.signal });
  }
  bindResize(root, lifetime.signal, () => options.refit?.());
  $('[data-history-retry]').addEventListener('click', load, { signal: lifetime.signal });
  window.addEventListener('popstate', fromUrl, { signal: lifetime.signal });
  void load();
  return () => { active = false; generation++; lifetime.abort(); request?.abort(); options.restoreCurrent(); };
}

/** 패널 위쪽 손잡이를 끌어 그래프와 패널의 높이 비율을 바꾼다. 값은 루트의 --history-h에 두고 브라우저에 저장한다. */
function bindResize(root: HTMLElement, signal: AbortSignal, refit: () => void) {
  const panel = root.closest<HTMLElement>('.history-panel'), handle = panel?.querySelector<HTMLElement>('[data-history-resize]');
  if (!handle || !panel) return;
  const doc = document.documentElement;
  const store = { get: () => { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? 'null') as unknown; } catch { return null; } }, set: (v: number | null) => { try { v === null ? localStorage.removeItem(HISTORY_KEY) : localStorage.setItem(HISTORY_KEY, JSON.stringify(v)); } catch { /* 저장소 없이도 동작한다 */ } } };
  const current = () => panel.getBoundingClientRect().height;
  const set = (h: number, save: boolean) => {
    const height = clampHistoryHeight(h, window.innerHeight);
    if (height === null) return;
    doc.style.setProperty('--history-h', `${height}px`);
    handle.setAttribute('aria-valuenow', String(height)); handle.setAttribute('aria-valuemax', String(clampHistoryHeight(Infinity, window.innerHeight) ?? height));
    if (save) { store.set(height); refit(); }
  };
  const reset = () => { doc.style.removeProperty('--history-h'); store.set(null); handle.setAttribute('aria-valuenow', String(Math.round(current()))); refit(); };
  const saved = clampHistoryHeight(store.get(), window.innerHeight);
  if (saved !== null) set(saved, false); else handle.setAttribute('aria-valuenow', String(Math.round(current())));
  handle.addEventListener('pointerdown', e => { e.preventDefault(); handle.setPointerCapture(e.pointerId); doc.classList.add('history-resizing'); }, { signal });
  handle.addEventListener('pointermove', e => { if (handle.hasPointerCapture(e.pointerId)) set(window.innerHeight - e.clientY, false); }, { signal });
  const end = (e: PointerEvent) => { if (!handle.hasPointerCapture(e.pointerId)) return; handle.releasePointerCapture(e.pointerId); doc.classList.remove('history-resizing'); set(window.innerHeight - e.clientY, true); };
  handle.addEventListener('pointerup', end, { signal }); handle.addEventListener('pointercancel', end, { signal });
  handle.addEventListener('dblclick', reset, { signal });
  handle.addEventListener('keydown', e => {
    const step = e.shiftKey ? 48 : 16;
    if (e.key === 'ArrowUp') set(current() + step, true);
    else if (e.key === 'ArrowDown') set(current() - step, true);
    else if (e.key === 'Home') set(Infinity, true);
    else if (e.key === 'End') set(0, true);
    else return;
    e.preventDefault();
  }, { signal });
  window.addEventListener('resize', () => { if (doc.style.getPropertyValue('--history-h')) set(current(), false); }, { signal });
  signal.addEventListener('abort', () => doc.classList.remove('history-resizing'));
}
