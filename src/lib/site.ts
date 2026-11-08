export const SECTIONS = {
  knowledge: { label: 'Knowledge', path: '/knowledge' },
  experience: { label: 'Experience', path: '/experience' },
  'ai-hub': { label: 'AI Hub', path: '/ai-hub' },
} as const;
export type SectionKey = keyof typeof SECTIONS;

export const GROWTH = { impulse: 'Impulse', synapse: 'Synapse', engram: 'Engram' } as const;
export type Growth = keyof typeof GROWTH;

export const KIND_LABEL: Record<string, string> = {
  concept: 'Concept', comparison: 'Comparison', guide: 'Guide',
  troubleshooting: 'Troubleshooting', project: 'Project', problem: 'Problem', retrospective: 'Retrospective',
  'build-log': 'Build Log', 'plugin-review': 'Plugin Review', 'skill-review': 'Skill Review', workflow: 'Workflow', experiment: 'Experiment',
};
export const KINDS_BY_SECTION: Record<SectionKey, string[]> = {
  knowledge: ['concept', 'comparison', 'guide'],
  experience: ['troubleshooting', 'project', 'problem', 'retrospective'],
  'ai-hub': ['build-log', 'plugin-review', 'skill-review', 'workflow', 'experiment'],
};
export const DOMAINS = ['backend', 'frontend', 'database', 'cloud', 'power-platform', 'ai-llm', 'algorithm', 'cs', 'devtools'];

export const url = (path: string) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}${path}`;
export const month = (d?: Date) => (d ? `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, '0')}` : '');
