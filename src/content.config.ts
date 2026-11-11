import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

export const SECTION_KINDS = {
  knowledge: ['concept', 'comparison', 'guide'],
  experience: ['troubleshooting', 'implementation', 'project', 'problem', 'retrospective'],
  'ai-hub': ['build-log', 'plugin-review', 'skill-review', 'workflow', 'experiment'],
} as const;

const SECTIONS = ['knowledge', 'experience', 'ai-hub'] as const;
const KINDS = [...new Set(Object.values(SECTION_KINDS).flat())] as [string, ...string[]];
const DOMAINS = ['backend', 'frontend', 'database', 'cloud', 'power-platform', 'ai-llm', 'algorithm', 'cs', 'devtools'] as const;
const RELATIONS = ['references', 'explains', 'applied-in', 'part-of', 'prerequisite', 'related'] as const;

const tested = ['testedAt', 'verification', 'evidence'];
const FIELDS_BY_KIND: Record<string, string[]> = {
  concept: ['prerequisites'],
  comparison: ['prerequisites', 'compared'],
  guide: ['prerequisites'],
  troubleshooting: ['environment', 'outcome', 'projectRefs'],
  implementation: ['environment', 'stack', 'projectRefs'],
  project: ['period', 'role', 'stack', 'repoUrl', 'demoUrl'],
  problem: ['platform', 'problemUrl', 'difficulty', 'complexity'],
  retrospective: ['period', 'projectRefs'],
  'build-log': tested,
  workflow: tested,
  experiment: tested,
  'plugin-review': [...tested, 'tool', 'vendor', 'toolUrl', 'toolVersion', 'model', 'evaluation'],
  'skill-review': [...tested, 'tool', 'vendor', 'toolUrl', 'toolVersion', 'model', 'evaluation'],
};
const KIND_FIELDS = [...new Set(Object.values(FIELDS_BY_KIND).flat())];

const date = z.coerce.date();
const period = z.object({ start: z.string(), end: z.string().optional() }).strict();

const note = z
  .object({
    uid: z.string().regex(/^(know|exp|hub)-[a-z0-9]+(-[a-z0-9]+)*$/),
    permalink: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    title: z.string().min(1),
    summary: z.string().min(1),
    section: z.enum(SECTIONS),
    kind: z.enum(KINDS),
    domains: z.array(z.enum(DOMAINS)),
    growth: z.enum(['impulse', 'synapse', 'engram']),
    publication: z.enum(['published', 'archived']),
    publishedAt: date.optional(),
    createdAt: date.optional(),
    updatedAt: date.optional(),
    originalPublishedAt: date.optional(),
    tags: z.array(z.string()).default([]),
    related: z.array(z.object({ uid: z.string(), relation: z.enum(RELATIONS) }).strict()).optional(),
    redirectFrom: z.array(z.string()).optional(),
    source: z.object({ type: z.string(), url: z.string().nullable().optional() }).strict().optional(),
    references: z.array(z.object({ title: z.string(), url: z.url() }).strict()).optional(),
    prerequisites: z.array(z.string()).optional(),
    compared: z.array(z.string()).optional(),
    environment: z.string().optional(),
    outcome: z.enum(['resolved', 'workaround', 'unresolved']).optional(),
    projectRefs: z.array(z.string()).optional(),
    period: period.optional(),
    role: z.string().optional(),
    stack: z.array(z.string()).optional(),
    repoUrl: z.url().optional(),
    demoUrl: z.url().optional(),
    platform: z.string().optional(),
    problemUrl: z.url().optional(),
    difficulty: z.string().optional(),
    complexity: z.object({ time: z.string(), space: z.string() }).strict().optional(),
    testedAt: date.optional(),
    verification: z.enum(['verified', 'partial', 'untested']).optional(),
    evidence: z.array(z.string()).optional(),
    tool: z.string().optional(),
    vendor: z.string().optional(),
    toolUrl: z.url().optional(),
    toolVersion: z.string().optional(),
    model: z.string().optional(),
    evaluation: z
      .object({
        useCase: z.string(),
        environment: z.string(),
        strengths: z.array(z.string()),
        limitations: z.array(z.string()),
        verdict: z.string(),
        alternatives: z.array(z.string()),
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (!(SECTION_KINDS[data.section] as readonly string[]).includes(data.kind)) {
      ctx.addIssue({ code: 'custom', path: ['kind'], message: `${data.section}에서 허용하지 않는 kind: ${data.kind}` });
    }
    if (!data.publishedAt) {
      ctx.addIssue({ code: 'custom', path: ['publishedAt'], message: 'published와 archived에는 publishedAt이 필요합니다' });
    }
    const allowed = FIELDS_BY_KIND[data.kind] ?? [];
    for (const field of KIND_FIELDS) {
      if ((data as Record<string, unknown>)[field] !== undefined && !allowed.includes(field)) {
        ctx.addIssue({ code: 'custom', path: [field], message: `${data.kind}에서 쓸 수 없는 필드: ${field}` });
      }
    }
  });

const planned = z
  .object({
    id: z.string().regex(/^plan-[a-z0-9]+(-[a-z0-9]+)*$/),
    title: z.string().min(1),
    section: z.enum(SECTIONS),
    domains: z.array(z.enum(DOMAINS)).default([]),
    near: z.array(z.string()).default([]),
  })
  .strict();

const pinned = z.object({ id: z.string().regex(/^pin-[a-z0-9]+(-[a-z0-9]+)*$/), noteUid: z.string().min(1) }).strict();

const path = z.object({
  id: z.string().regex(/^path-[a-z0-9]+(-[a-z0-9]+)*$/),
  title: z.string().trim().min(1), summary: z.string().trim().min(1),
  publishedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  steps: z.array(z.object({
    id: z.string().regex(/^step-[a-z0-9]+(-[a-z0-9]+)*$/),
    title: z.string().trim().min(1), description: z.string().trim().min(1),
    noteUids: z.array(z.string()),
  }).strict()).min(1),
}).strict();

const activityCommon = {
  id: z.string().regex(/^act-[a-z0-9]+(-[a-z0-9]+)*$/),
  on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  visibility: z.literal('public').default('public'),
  detail: z.string().max(280).regex(/^[^\r\n\x00-\x1f]*$/).optional(),
};
const activity = z.discriminatedUnion('kind', [
  z.object({ ...activityCommon, kind: z.literal('path-create'), pathId: z.string() }).strict(),
  z.object({ ...activityCommon, kind: z.literal('path-update'), pathId: z.string() }).strict(),
  z.object({ ...activityCommon, kind: z.literal('revise'), noteUid: z.string(), evidenceKey: z.string().trim().min(1).optional() }).strict(),
  z.object({ ...activityCommon, kind: z.literal('review'), noteUid: z.string() }).strict(),
  z.object({ ...activityCommon, kind: z.literal('link'), fromUid: z.string(), toUid: z.string(), relation: z.enum(RELATIONS) }).strict(),
]);

export const collections = {
  paths: defineCollection({ loader: file('src/data/paths.yaml'), schema: path }),
  activities: defineCollection({ loader: file('src/data/activities.yaml'), schema: activity }),
  notes: defineCollection({ loader: glob({ pattern: '**/*.md', base: './src/content/notes' }), schema: note }),
  pinned: defineCollection({ loader: file('src/data/pinned.yaml'), schema: pinned }),
  planned: defineCollection({ loader: file('src/data/planned.yaml'), schema: planned }),
};
