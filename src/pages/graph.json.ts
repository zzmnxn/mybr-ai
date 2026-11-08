import type { APIRoute } from 'astro';
import { getGraph } from '../lib/graph';

export const GET: APIRoute = async () =>
  new Response(JSON.stringify(await getGraph()), { headers: { 'Content-Type': 'application/json' } });
