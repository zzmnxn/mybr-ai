export type CalendarDate = { day: string; precision: 'date' | 'instant' };
export type Activity = CalendarDate & {
  id: string; kind: 'publish' | 'revise' | 'review' | 'link' | 'path-create' | 'path-update';
  source: 'frontmatter' | 'manual'; noteUids: string[]; relation?: string; detail?: string; pathId?: string;
};
type NoteData = { uid: string; publishedAt?: unknown; related?: { uid: string; relation: string }[]; prerequisites?: string[]; projectRefs?: string[] };
type NoteSource = { data: NoteData };
export type ManualActivity = {
  id: string; kind: 'revise' | 'review' | 'link' | 'path-create' | 'path-update'; on: string; visibility?: 'public';
  noteUid?: string; fromUid?: string; toUid?: string; relation?: string; detail?: string; pathId?: string; evidenceKey?: string;
};

function validDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === value;
}
export function calendarDate(raw: unknown): CalendarDate {
  if (typeof raw !== 'string') throw new Error('날짜 원문이 필요합니다');
  if (validDay(raw)) return { day: raw, precision: 'date' };
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/);
  if (!match || !validDay(match[1]) || +match[2] > 23 || +match[3] > 59 || +match[4] > 59) throw new Error(`유효하지 않은 날짜: ${raw}`);
  if (match[5] !== 'Z' && (+match[5].slice(1, 3) > 23 || +match[5].slice(4) > 59)) throw new Error(`유효하지 않은 offset: ${raw}`);
  const instant = new Date(raw);
  if (!Number.isFinite(+instant)) throw new Error(`유효하지 않은 시각: ${raw}`);
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', era: 'short' }).formatToParts(instant);
  const part = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  const day = `${part('year').padStart(4, '0')}-${part('month')}-${part('day')}`;
  if (part('era') !== 'AD' || !validDay(day)) throw new Error(`지원 범위 밖 날짜: ${raw}`);
  return { day, precision: 'instant' };
}
export function buildActivities(notes: readonly NoteSource[], rawSources: readonly NoteSource[], manualActivities: readonly ManualActivity[], paths: readonly { id: string; publishedOn: string }[] = [], today = calendarDate(new Date().toISOString()).day): Activity[] {
  const byUid = new Map(notes.map(n => [n.data.uid, n.data]));
  const raw = new Map(rawSources.map(n => [n.data.uid, n.data]));
  const events: Activity[] = [];
  const ids = new Set<string>(), evidence = new Set<string>(), reviews = new Set<string>();
  for (const { data } of notes) {
    const date = calendarDate(raw.get(data.uid)?.publishedAt);
    if (date.day > today) throw new Error(`미래 발행일: ${data.uid}`);
    const id = `publish:${data.uid}`;
    if (ids.has(id)) throw new Error(`중복 발행 UID: ${data.uid}`);
    ids.add(id);
    events.push({ id, kind: 'publish', ...date, source: 'frontmatter', noteUids: [data.uid] });
  }
  for (const event of manualActivities) {
    const isPath = event.kind === 'path-create' || event.kind === 'path-update';
    const common = ['id', 'kind', 'on', 'visibility', 'detail'];
    const fields = isPath ? ['pathId'] : event.kind === 'link' ? ['fromUid', 'toUid', 'relation'] : event.kind === 'revise' ? ['noteUid', 'evidenceKey'] : event.kind === 'review' ? ['noteUid'] : [];
    if (!['revise', 'review', 'link', 'path-create', 'path-update'].includes(event.kind) || Object.keys(event).some(k => ![...common, ...fields].includes(k))) throw new Error('허용하지 않는 활동 필드 또는 종류');
    if (!/^act-[a-z0-9]+(-[a-z0-9]+)*$/.test(event.id) || ids.has(event.id)) throw new Error(`활동 ID 오류 또는 중복: ${event.id}`);
    ids.add(event.id);
    if (event.visibility !== undefined && event.visibility !== 'public') throw new Error('공개 활동만 허용합니다');
    if (event.detail !== undefined && (typeof event.detail !== 'string' || event.detail.length > 280 || /[\r\n\x00-\x1f]/.test(event.detail))) throw new Error('detail은 280자 이내 평문이어야 합니다');
    const date = calendarDate(event.on);
    if (date.precision !== 'date' || date.day > today) throw new Error(`활동 날짜 오류: ${event.id}`);
    const noteUids = isPath ? [] : event.kind === 'link' ? [event.fromUid!, event.toUid!] : [event.noteUid!];
    if (noteUids.some(uid => !byUid.has(uid))) throw new Error(`없는 활동 대상: ${event.id}`);
    if (isPath) {
      const path = paths.find(path => path.id === event.pathId);
      if (!path || event.kind === 'path-create' && path.publishedOn !== event.on) throw new Error(`경로 활동 참조·발행일 오류: ${event.id}`);
    }
    if (event.kind === 'link') {
      const source = byUid.get(event.fromUid!)!;
      const relations = [...(source.related ?? []), ...(source.prerequisites ?? []).map(uid => ({ uid, relation: 'prerequisite' })), ...(source.projectRefs ?? []).map(uid => ({ uid, relation: 'part-of' }))];
      if (event.fromUid === event.toUid || !relations.some(r => r.uid === event.toUid && r.relation === event.relation)) throw new Error(`선언되지 않은 관계: ${event.id}`);
    }
    if (event.kind === 'review') {
      const key = `${event.noteUid}:${event.on}`;
      if (reviews.has(key)) throw new Error(`같은 글·날짜 복습 중복: ${key}`);
      reviews.add(key);
    }
    if (event.evidenceKey !== undefined) {
      if (typeof event.evidenceKey !== 'string' || !event.evidenceKey.trim() || evidence.has(event.evidenceKey)) throw new Error('근거 키 오류 또는 중복');
      evidence.add(event.evidenceKey);
    }
    events.push({ id: event.id, kind: event.kind, ...date, source: 'manual', noteUids, ...(isPath ? { pathId: event.pathId } : {}), ...(event.relation ? { relation: event.relation } : {}), ...(event.detail !== undefined ? { detail: event.detail } : {}) });
  }
  return events.sort((a, b) => a.day.localeCompare(b.day) || a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id));
}

export function groupActivitiesByDay(events: readonly Activity[]): Map<string, Activity[]> {
  const days = new Map<string, Activity[]>();
  for (const event of events) {
    const day = days.get(event.day) ?? [];
    day.push(event);
    days.set(event.day, day);
  }
  return days;
}
