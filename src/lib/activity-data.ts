import { getCollection } from 'astro:content';
import { getNotes, noteUrl } from './graph';
import { buildActivities } from './activity';
import { readNoteSources } from '../../scripts/content-sources.mjs';
import { url } from './site';
import { seoulToday, type ActivityPayload } from './activity-calendar';

export async function getActivityData(): Promise<ActivityPayload> {
  const notes = await getNotes();
  const manual = await getCollection('activities');
  const paths = await getCollection('paths');
  const data: ActivityPayload = {
    events: buildActivities(notes, readNoteSources(), manual.map(entry => entry.data), paths.map(entry => entry.data)),
    paths: Object.fromEntries(paths.map(path => [path.id, { title: path.data.title, url: url(`/paths/${path.id}/`) }])),
    notes: Object.fromEntries(notes.map(note => [note.data.uid, { title: note.data.title, url: noteUrl(note) }])),
  };
  // 아이콘 비교용 임시 데이터는 개발 서버에서만 사용한다.
  if (import.meta.env.DEV && notes.length) {
    const month = seoulToday().slice(0, 7);
    data.events = [0, 1, 2, 3, 4, 6].flatMap((count, index) =>
      Array.from({ length: count }, (_, item) => ({
        id: `preview-${index}-${item}`, kind: 'review' as const, source: 'manual' as const,
        day: `${month}-${String(index + 1).padStart(2, '0')}`, precision: 'date' as const,
        noteUids: [notes[item % notes.length].data.uid], detail: '아이콘 확인용 임시 데이터입니다.',
      })),
    );
  }
  return data;
}
