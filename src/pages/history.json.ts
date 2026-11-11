import type { APIRoute } from 'astro';
import { getActivityData } from '../lib/activity-data';
export const GET: APIRoute = async () => {
  const data = await getActivityData();
  const nodes = data.events.filter(event => event.kind === 'publish').map(event => ({ uid: event.noteUids[0], publishedOn: event.day })).sort((a,b) => a.publishedOn.localeCompare(b.publishedOn) || a.uid.localeCompare(b.uid));
  return new Response(JSON.stringify({ basis: 'mybr-published', nodes, currentCount: nodes.length }), { headers: { 'Content-Type': 'application/json' } });
};
