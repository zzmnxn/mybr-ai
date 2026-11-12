import { groupActivitiesByDay } from '../lib/activity';
import { ACTIVITY_LABELS, dateLabel, daysInMonth, layoutMonth, monthNetwork, monthSummary, selectActivityDate, seoulToday, shiftMonth, shortDateLabel, symbolLevel, weekdayShort, validateActivityPayload, type ActivityPayload } from '../lib/activity-calendar';

export function mountActivity(root: HTMLElement): () => void {
  const $ = <T extends Element = HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const lifetime = new AbortController();
  let request: AbortController | undefined;
  let active = true;
  let generation = 0;
  let data: ActivityPayload | undefined;
  let selection: ReturnType<typeof selectActivityDate>;
  let listMode = false;
  const interactive = $('.activity-interactive'), fallback = $('[data-activity-fallback]');
  const error = $('[data-activity-error]');
  const map = $('[data-activity-map]'), days = $<HTMLOListElement>('[data-activity-days]');
  const monthInput = $<HTMLInputElement>('[data-month-input]');
  const curve = $<SVGSVGElement>('[data-activity-curve]');
  const today = seoulToday();
  const canonical = root.dataset.canonical!;
  const symbol = (count: number) => $<HTMLTemplateElement>(`template[data-activity-symbol="${symbolLevel(count)}"]`).content.cloneNode(true);
  function writeSelection(replace = false) {
    const url = `${canonical}?month=${selection.month}&day=${selection.day}`;
    if (replace) history.replaceState(history.state, '', url);
    else history.pushState(history.state, '', url);
  }
  function positionDays() {
    if (!selection || !active || listMode || map.clientWidth < 56) return;
    const layout = layoutMonth(Number(selection.month.slice(0, 4)), Number(selection.month.slice(5)), map.clientWidth);
    curve.setAttribute('viewBox', `0 0 ${layout.width} ${layout.height}`);
    for (const path of curve.querySelectorAll('.line, .ribbon')) path.setAttribute('d', layout.segments.join(' '));
    curve.querySelector('.turn')!.setAttribute('d', layout.turns.join(' '));
    map.style.setProperty('--map-height', `${layout.height}px`);
    layout.days.forEach((p, i) => {
      const element = days.children[i] as HTMLElement;
      element.style.left = `${p.x}px`; element.style.top = `${p.y}px`;
    });
    map.classList.add('is-positioned');
  }
  const observer = new ResizeObserver(positionDays);
  observer.observe(map);
  function renderNetwork(svg: SVGSVGElement, net: ReturnType<typeof monthNetwork>, example = false) {
    const NS = 'http://www.w3.org/2000/svg';
    svg.replaceChildren(); svg.classList.toggle('has-nodes', net.nodes.length > 0);
    svg.setAttribute('aria-label', example ? '매일 1개씩 30일 활동한 예시 네트워크' : `이번 달 활동한 날 ${net.nodes.length}일의 시간 순서 네트워크`);
    svg.closest('[data-network-view]')!.querySelector('[data-network-detail]')!.textContent = net.nodes.length ? '점에 마우스를 올리거나 선택하면 날짜와 활동 수가 나옵니다.' : '이 달에는 활동한 날이 없습니다.';
    if (net.nodes.length > 1) {
      const line = document.createElementNS(NS, 'path'); line.setAttribute('class', 'net-line');
      line.setAttribute('d', net.path);
      svg.append(line);
    }
    for (const p of net.nodes) {
      const c = document.createElementNS(NS, 'circle');
      const label = `${example ? `${Number(p.day.slice(-2))}일차` : shortDateLabel(p.day)} · 활동 ${p.count}개${example ? ' (예시)' : p.peak ? ' · 최다 활동일' : ''}`;
      c.setAttribute('class', p.peak ? 'net-node is-peak' : 'net-node');
      c.setAttribute('cx', String(p.x)); c.setAttribute('cy', String(p.y)); c.setAttribute('r', String(p.r));
      c.setAttribute('tabindex', '0'); c.setAttribute('role', 'img'); c.setAttribute('aria-label', label);
      c.dataset.networkLabel = label;
      const title = document.createElementNS(NS, 'title'); title.textContent = label; c.append(title);
      svg.append(c);
    }
  }
  function describeNetwork(event: Event) {
    const node = (event.target as Element).closest<SVGElement>('[data-network-label]');
    if (node) node.closest('[data-network-view]')!.querySelector('[data-network-detail]')!.textContent = node.dataset.networkLabel!;
  }
  for (const type of ['pointerover', 'focusin', 'click']) root.addEventListener(type, describeNetwork, { signal: lifetime.signal });
  const exampleDays = Array.from({ length: 30 }, (_, i) => ({ day: `2000-04-${String(i + 1).padStart(2, '0')}` }));
  renderNetwork($<SVGSVGElement>('[data-example-network]'), monthNetwork(exampleDays, '2000-04'), true);
  function render(announce = false) {
    if (!data || !active) return;
    const grouped = groupActivitiesByDay(data.events);
    monthInput.value = selection.month;
    const monthEvents = data.events.filter(e => e.day.startsWith(selection.month));
    const summary = monthSummary(data.events, selection.month);
    $('[data-month-title]').textContent = `${selection.month.slice(0, 4)}년 ${Number(selection.month.slice(5))}월`;
    $('[data-month-total]').textContent = `${summary.total}개`;
    $('[data-month-days]').textContent = `${summary.activeDays}일`;
    renderNetwork($<SVGSVGElement>('[data-month-network]'), monthNetwork(data.events, selection.month));
    $('[data-month-peak]').textContent = summary.peak ? `${shortDateLabel(summary.peak.day)} · ${summary.peak.count}개` : '없음';
    $('[data-month-empty]').hidden = monthEvents.length > 0;
    for (const button of root.querySelectorAll<HTMLButtonElement>('[data-month-shift]')) button.disabled = !shiftMonth(selection.month, Number(button.dataset.monthShift));
    days.replaceChildren();
    for (let i = 1; i <= daysInMonth(selection.month); i++) {
      const day = `${selection.month}-${String(i).padStart(2, '0')}`, count = grouped.get(day)?.length ?? 0;
      const li = document.createElement('li'), button = document.createElement('button');
      button.type = 'button'; button.dataset.day = day;
      button.classList.toggle('has-activity', count > 0);
      button.setAttribute('aria-pressed', String(day === selection.day));
      button.setAttribute('aria-label', `${dateLabel(day)}, 공개 활동 ${count}건`);
      button.title = button.getAttribute('aria-label')!;
      if (day === today) button.setAttribute('aria-current', 'date');
      if (day > today) button.classList.add('is-future');
      const number = document.createElement('span'); number.textContent = day === selection.day ? `${i} (${weekdayShort(day)})` : String(i); number.className = 'activity-day-number'; button.append(number);
      button.append(symbol(count));
      const listLabel = document.createElement('span'); listLabel.className = 'activity-day-list-label'; listLabel.textContent = `${dateLabel(day)} · ${count}건`; button.append(listLabel);
      li.append(button); days.append(li);
    }
    const selected = [...(grouped.get(selection.day) ?? [])].sort((a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id));
    $('[data-detail-title]').textContent = shortDateLabel(selection.day);
    $('[data-detail-count]').textContent = `활동 ${selected.length}개`;
    $('[data-detail-symbol]').replaceChildren(symbol(selected.length));
    $('[data-detail-empty]').textContent = selection.day > today ? '아직 도래하지 않은 날짜입니다' : selected.length ? '' : '공개 기록이 없습니다';
    const list = $('[data-detail-events]'); list.replaceChildren();
    for (const event of selected) {
      const fragment = $<HTMLTemplateElement>('[data-activity-item]').content.cloneNode(true) as DocumentFragment;
      fragment.querySelector('[data-event-meta]')!.textContent = `${ACTIVITY_LABELS[event.kind]} · ${event.source === 'frontmatter' ? '기재된 발행일 기준' : '직접 남긴 기록'}`;
      for (const note of [...event.noteUids.map(uid => data!.notes[uid]), ...(event.pathId && data.paths?.[event.pathId] ? [data.paths[event.pathId]] : [])]) {
        const link = document.createElement('a');
        link.textContent = note.title; link.href = note.url;
        fragment.querySelector('[data-event-links]')!.append(link);
      }
      const detail = fragment.querySelector<HTMLElement>('[data-event-detail]')!;
      detail.hidden = !event.detail; detail.textContent = event.detail ?? '';
      list.append(fragment);
    }
    if (announce) $('[data-activity-notice]').textContent = `${dateLabel(selection.day)}, 공개 활동 ${selected.length}건`;
    positionDays();
  }
  function fromUrl() {
    if (!data) return;
    const pathMonth = location.pathname.replace(/\/$/, '').split('/').at(-1);
    selection = selectActivityDate(new URLSearchParams(location.search), data.events, today, pathMonth === root.dataset.pathMonth ? root.dataset.pathMonth : undefined);
    $('[data-activity-notice]').textContent = selection.corrected ? '주소의 날짜를 확인해 기본 날짜로 이동했습니다.' : '';
    if (selection.corrected) writeSelection(true);
    render();
  }
  async function load() {
    request?.abort(); request = new AbortController();
    const token = ++generation;
    error.hidden = true;
    root.setAttribute('aria-busy', 'true');
    try {
      const response = await fetch(root.dataset.endpoint!, { signal: request.signal });
      if (!response.ok) throw new Error('활동 기록 응답 오류');
      const payload = validateActivityPayload(await response.json(), import.meta.env.BASE_URL.replace(/\/$/, ''));
      if (!active || token !== generation) return;
      data = payload;
      interactive.hidden = false; fallback.hidden = true;
      fromUrl();
    } catch (cause) {
      if (!active || token !== generation || request.signal.aborted) return;
      interactive.hidden = true; fallback.hidden = false; error.hidden = false;
    } finally {
      if (active && token === generation) root.removeAttribute('aria-busy');
    }
  }
  root.addEventListener('click', event => {
    const target = (event.target as Element).closest<HTMLElement>('button');
    if (!target || !data) return;
    if (target.dataset.day) {
      selection = { ...selection, day: target.dataset.day, corrected: false };
      writeSelection(); render(true);
      days.querySelector<HTMLButtonElement>(`[data-day="${selection.day}"]`)?.focus({ preventScroll: true });
    } else if (target.dataset.monthShift) {
      const month = shiftMonth(selection.month, Number(target.dataset.monthShift));
      if (month) { selection = selectActivityDate(new URLSearchParams({ month }), data.events, today); writeSelection(); render(true); }
    }
  }, { signal: lifetime.signal });
  monthInput.addEventListener('change', () => {
    if (!data) return;
    selection = selectActivityDate(new URLSearchParams({ month: monthInput.value }), data.events, today);
    writeSelection(); render(true);
  }, { signal: lifetime.signal });
  $('[data-list-toggle]').addEventListener('click', () => {
    listMode = !listMode;
    map.classList.toggle('is-list', listMode);
    $('[data-list-toggle]').setAttribute('aria-pressed', String(listMode));
    $('[data-list-toggle]').textContent = listMode ? '지도 보기' : '목록 보기';
    positionDays();
  }, { signal: lifetime.signal });
  $('[data-activity-retry]').addEventListener('click', load, { signal: lifetime.signal });
  window.addEventListener('popstate', fromUrl, { signal: lifetime.signal });
  void load();
  return () => { active = false; generation++; lifetime.abort(); request?.abort(); observer.disconnect(); };
}
