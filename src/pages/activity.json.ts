import type { APIRoute } from 'astro';
import { getActivityData } from '../lib/activity-data';
export const GET: APIRoute = async () => new Response(JSON.stringify(await getActivityData()), { headers: { 'Content-Type': 'application/json' } });
