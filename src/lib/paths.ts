import { calendarDate } from './activity.ts';
export type KnowledgePath = {
  id: string; title: string; summary: string; publishedOn: string;
  steps: { id: string; title: string; description: string; noteUids: string[] }[];
};
export function validatePathReferences(paths: readonly KnowledgePath[], uids: ReadonlySet<string>, today = calendarDate(new Date().toISOString()).day) {
  const ids = new Set<string>();
  for (const path of paths) {
    if (!/^path-[a-z0-9]+(-[a-z0-9]+)*$/.test(path.id) || ids.has(path.id)) throw new Error(`경로 ID 오류 또는 중복: ${path.id}`);
    ids.add(path.id);
    if (calendarDate(path.publishedOn).precision !== 'date' || path.publishedOn > today) throw new Error(`경로 발행일 오류: ${path.id}`);
    if (!path.title?.trim() || !path.summary?.trim() || !Array.isArray(path.steps) || !path.steps.length) throw new Error(`경로 필수 정보 누락: ${path.id}`);
    const steps = new Set<string>();
    for (const step of path.steps) {
      if (!/^step-[a-z0-9]+(-[a-z0-9]+)*$/.test(step.id) || steps.has(step.id) || !step.title?.trim() || !step.description?.trim()) throw new Error(`경로 단계 오류: ${path.id}/${step.id}`);
      steps.add(step.id);
      if (!Array.isArray(step.noteUids) || new Set(step.noteUids).size !== step.noteUids.length || step.noteUids.some(uid => !uids.has(uid))) throw new Error(`경로 글 참조 오류: ${path.id}/${step.id}`);
    }
  }
}
export const pathsForNote = (uid: string, paths: readonly KnowledgePath[]) => paths.filter(path => path.steps.some(step => step.noteUids.includes(uid)));
