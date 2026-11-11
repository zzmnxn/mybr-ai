import { getCollection } from 'astro:content';
import { getNotes, noteUrl } from './graph';
import { buildActivities } from './activity';
import { readNoteSources } from '../../scripts/content-sources.mjs';
import { url } from './site';
import type { ActivityPayload } from './activity-calendar';

export async function getActivityData(): Promise<ActivityPayload> {
  const notes = await getNotes();
  const manual = await getCollection('activities');
  const paths = await getCollection('paths');
  return {
    events: buildActivities(notes, readNoteSources(), manual.map(entry => entry.data), paths.map(entry => entry.data)),
    paths: Object.fromEntries(paths.map(path => [path.id, { title: path.data.title, url: url(`/paths/${path.id}/`) }])),
    notes: Object.fromEntries(notes.map(note => [note.data.uid, { title: note.data.title, url: noteUrl(note) }])),
  };
}
