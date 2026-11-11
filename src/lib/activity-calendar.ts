import { calendarDate, type Activity } from './activity.ts';

export const ACTIVITY_LABELS = { publish: '발행', revise: '수정', review: '복습', link: '연결', 'path-create': '경로 발행', 'path-update': '경로 수정' } as const;
export type ActivityPayload = { paths?: Record<string, { title: string; url: string }>; events: Activity[]; notes: Record<string, { title: string; url: string }> };
export const symbolLevel = (count: number) => Math.min(5, Math.max(0, Math.floor(count)));
export const validMonth = (month: string) => /^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(month);
export const seoulToday = () => calendarDate(new Date().toISOString()).day;
export function dateLabel(day: string): string {
  const date = calendarDate(day);
  const weekday = new Intl.DateTimeFormat('ko-KR', { timeZone: 'UTC', weekday: 'long' }).format(new Date(`${date.day}T00:00:00Z`));
  return `${day.slice(0, 4)}년 ${Number(day.slice(5, 7))}월 ${Number(day.slice(8))}일 ${weekday}`;
}
export const weekdayShort = (day: string) => new Intl.DateTimeFormat('ko-KR', { timeZone: 'UTC', weekday: 'short' }).format(new Date(`${calendarDate(day).day}T00:00:00Z`));
export const shortDateLabel = (day: string) => `${Number(day.slice(5, 7))}월 ${Number(day.slice(8))}일 (${weekdayShort(day)})`;
export function monthSummary(events: readonly { day: string }[], month: string) {
  const counts = new Map<string, number>();
  for (const e of events) if (e.day.startsWith(month)) counts.set(e.day, (counts.get(e.day) ?? 0) + 1);
  let peak: { day: string; count: number } | null = null;
  for (const [day, count] of [...counts].sort(([a], [b]) => a.localeCompare(b))) if (!peak || count > peak.count) peak = { day, count };
  return { total: [...counts.values()].reduce((a, b) => a + b, 0), activeDays: counts.size, peak };
}
export function daysInMonth(month: string) {
  if (!validMonth(month)) throw new Error('유효하지 않은 월');
  const [y, m] = month.split('-').map(Number);
  return [31, y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
}
export function shiftMonth(month: string, delta: number): string | null {
  if (!validMonth(month)) return null;
  const index = Number(month.slice(0, 4)) * 12 + Number(month.slice(5)) - 1 + delta;
  const year = Math.floor(index / 12);
  return year < 1 || year > 9999 ? null : `${String(year).padStart(4, '0')}-${String(index % 12 + 1).padStart(2, '0')}`;
}
export function selectActivityDate(query: URLSearchParams, events: readonly Activity[], today = seoulToday(), fallbackMonth?: string) {
  const requested = query.get('month');
  const month = requested && validMonth(requested) ? requested : fallbackMonth && validMonth(fallbackMonth) ? fallbackMonth : today.slice(0, 7);
  const requestedDay = query.get('day');
  let validDay = false;
  try { validDay = !!requestedDay && calendarDate(requestedDay).precision === 'date' && requestedDay.slice(0, 7) === month; } catch { /* 기본 선택으로 복구한다 */ }
  const day = validDay ? requestedDay! : month === today.slice(0, 7) ? today : events.filter(e => e.day.startsWith(month)).map(e => e.day).sort()[0] ?? `${month}-01`;
  return { month, day, corrected: requested !== null && !validMonth(requested) || requestedDay !== null && !validDay };
}

type Point = { day: number; x: number; y: number };
export function layoutMonth(year: number, month: number, availableWidth: number) {
  const key = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
  const count = daysInMonth(key);
  if (!Number.isFinite(availableWidth) || availableWidth < 56) throw new Error('달력을 배치할 공간이 부족합니다');
  const width = availableWidth, padding = 28;
  const columns = Math.max(1, Math.min(8, Math.floor((width - padding * 2) / 80) + 1));
  const days: Point[] = [];
  for (let start = 0, row = 0; start < count; start += columns, row++) {
    const length = Math.min(columns, count - start);
    for (let i = 0; i < length; i++) {
      const t = length === 1 ? 0.5 : i / (length - 1), n = start + i;
      days.push({ day: n + 1, x: padding + t * (width - padding * 2), y: 64 + row * 156 + 18 * Math.sin(n * 1.3 + row * 2.1) + 8 * Math.sin(n * 2.7 + row) });
    }
  }
  const segments: string[] = [], turns: string[] = [];
  for (let i = 1; i < days.length; i++) {
    const a = days[i - 1], b = days[i];
    if (Math.floor((i - 1) / columns) === Math.floor(i / columns)) {
      // Catmull-Rom 접선으로 각 점을 부드럽게 지난다. 줄의 양끝은 자기 자신을 접선 기준으로 쓴다.
      const rowStart = Math.floor(i / columns) * columns, rowEnd = Math.min(rowStart + columns, days.length) - 1;
      const p0 = days[Math.max(i - 2, rowStart)], p3 = days[Math.min(i + 1, rowEnd)];
      segments.push(`M${a.x},${a.y} C${a.x + (b.x - p0.x) / 6},${a.y + (b.y - p0.y) / 6} ${b.x - (p3.x - a.x) / 6},${b.y - (p3.y - a.y) / 6} ${b.x},${b.y}`);
    } else {
      const midY = (a.y + b.y) / 2;
      turns.push(`M${a.x},${a.y} C${width - 4},${a.y} ${width - 4},${midY} ${width / 2},${midY} C4,${midY} 4,${b.y} ${b.x},${b.y}`);
    }
  }
  return { width, height: Math.max(...days.map(d => d.y)) + 44, days, segments, turns };
}

export function validateActivityPayload(value: unknown, base: string): ActivityPayload {
  const fail = () => { throw new Error('활동 데이터 형식이 올바르지 않습니다'); };
  if (!value || typeof value !== 'object') return fail();
  const data = value as ActivityPayload;
  if (!Array.isArray(data.events) || !data.notes || typeof data.notes !== 'object' || Array.isArray(data.notes)) return fail();
  const allowed = ['id', 'kind', 'day', 'precision', 'source', 'noteUids', 'relation', 'detail', 'pathId'];
  const ids = new Set();
  for (const event of data.events) {
    if (!event || Object.keys(event).some(k => !allowed.includes(k)) || typeof event.id !== 'string' || ids.has(event.id) || !Object.hasOwn(ACTIVITY_LABELS, event.kind)) return fail();
    ids.add(event.id);
    if (calendarDate(event.day).precision !== 'date' || !['date', 'instant'].includes(event.precision) || !['frontmatter', 'manual'].includes(event.source)) return fail();
    const isPath = event.kind === 'path-create' || event.kind === 'path-update';
    if (isPath && (!event.pathId || !Object.hasOwn(data.paths ?? {}, event.pathId))) return fail();
    if (!Array.isArray(event.noteUids) || event.noteUids.length !== (isPath ? 0 : event.kind === 'link' ? 2 : 1) || event.noteUids.some(uid => typeof uid !== 'string' || !Object.hasOwn(data.notes, uid))) return fail();
    if (event.detail !== undefined && (typeof event.detail !== 'string' || event.detail.length > 280)) return fail();
    if (event.relation !== undefined && typeof event.relation !== 'string') return fail();
  }
  for (const note of Object.values(data.notes)) {
    if (!note || typeof note.title !== 'string' || typeof note.url !== 'string' || !new RegExp(`^${base}/notes/[a-z0-9]+(?:-[a-z0-9]+)*/?$`).test(note.url)) return fail();
  }
  for (const path of Object.values(data.paths ?? {})) {
    if (!path || typeof path.title !== 'string' || typeof path.url !== 'string' || !path.url.startsWith(`${base}/paths/`) || !/^path-[a-z0-9]+(-[a-z0-9]+)*\/?$/.test(path.url.slice(`${base}/paths/`.length))) return fail();
  }
  return data;
}

/** 활동한 날을 시간 순서의 굽은 선 위에 놓는다. 선은 날짜 순서일 뿐 글 사이의 관계가 아니다. */
export function monthNetwork(events: readonly { day: string }[], month: string, width = 280, height = 170) {
  const counts = new Map<string, number>();
  for (const e of events) if (e.day.startsWith(month)) counts.set(e.day, (counts.get(e.day) ?? 0) + 1);
  const entries = [...counts].sort(([a], [b]) => a.localeCompare(b));
  const peak = Math.max(0, ...entries.map(([, c]) => c));
  const cx = width / 2, cy = height / 2, n = entries.length;
  const nodes = entries.map(([day, count], i) => {
    const t = n === 1 ? 0.5 : i / (n - 1), angle = (-0.9 + t * 4.4) * Math.PI / 1.4 - Math.PI / 2;
    const wobble = 1 + 0.16 * Math.sin(i * 2.3);
    const r = Math.min(3 + count * 1.8, 11);
    const rx = (width / 2 - 16 - r) * wobble, ry = (height / 2 - 14 - r) * wobble;
    return { day, count, r, peak: count === peak, x: n === 1 ? cx : cx + Math.cos(angle) * Math.min(rx, width / 2 - 16 - r), y: n === 1 ? cy : cy + Math.sin(angle) * Math.min(ry, height / 2 - 14 - r) };
  });
  return { width, height, nodes, edges: nodes.slice(1).map((_, i) => [i, i + 1] as const) };
}
