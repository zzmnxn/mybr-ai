import { calendarDate } from './activity.ts';
import type { GraphData } from './graph';
import type { NodeInput } from '../scripts/brain';
export type HistoryIndex = { basis: 'mybr-published'; nodes: { uid: string; publishedOn: string }[]; currentCount: number };
export const nodesAt = (index: HistoryIndex, day: string) => new Set(index.nodes.filter(node => node.publishedOn <= day).map(node => node.uid));
export const compareSelections = (before: ReadonlySet<string>, after: ReadonlySet<string>) => ({ addedUids: [...after].filter(uid => !before.has(uid)).sort(), removedUids: [...before].filter(uid => !after.has(uid)).sort() });
export function temporalInput(graph: Pick<GraphData, 'nodes'>, uids: ReadonlySet<string>): { nodes: NodeInput[]; links: [] } {
  return { nodes: graph.nodes.filter(node => uids.has(node.uid)).map(node => ({ id: node.uid, label: node.title, url: node.url, kind: 'post' })), links: [] };
}
export function selectHistoryDay(raw: string | null, today: string) {
  if (raw === null) return { day: today, corrected: false };
  try { if (calendarDate(raw).precision === 'date' && raw <= today) return { day: raw, corrected: false }; } catch { /* 현재 날짜로 복구한다 */ }
  return { day: today, corrected: true };
}
export function validateHistoryIndex(value: unknown, uids: ReadonlySet<string>): HistoryIndex {
  if (!value || typeof value !== 'object') throw new Error('시간 기록 형식 오류');
  const index = value as HistoryIndex;
  if (index.basis !== 'mybr-published' || !Array.isArray(index.nodes) || index.currentCount !== index.nodes.length || index.currentCount !== uids.size) throw new Error('시간 기록 형식·글 수 오류');
  const seen = new Set();
  for (const node of index.nodes) {
    if (!node || !uids.has(node.uid) || seen.has(node.uid) || calendarDate(node.publishedOn).precision !== 'date') throw new Error('시간 기록 글 참조·날짜 오류');
    seen.add(node.uid);
  }
  return index;
}
