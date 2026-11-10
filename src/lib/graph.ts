import { getCollection, render, type CollectionEntry } from 'astro:content';
import { GROWTH, KIND_LABEL, SECTIONS, url, type Growth, type SectionKey } from './site';

export type Note = CollectionEntry<'notes'>;
export type GraphNode = {
  uid: string; title: string; url: string; section: string; kind: string;
  domains: string[]; growth: Growth; tags: string[];
};
export type Relation = 'references' | 'explains' | 'applied-in' | 'part-of' | 'prerequisite' | 'related';
export type Edge = { source: string; target: string; relation: Relation; origin: 'body-link' | 'frontmatter' | 'approved-inference' };
export type ViewNode = { id: string; label: string; url?: string; type: 'section' | 'kind' | 'domain' | 'tag' | 'growth' | 'heading' | 'planned' };
export type ViewLink = { source: string; target: string };
export type GraphData = { nodes: GraphNode[]; edges: Edge[]; viewNodes: ViewNode[]; viewLinks: ViewLink[] };

const slug = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '-');
export const sectionId = (s: string) => `section-${s}`;
export const domainId = (d: string) => `domain-${d}`;
export const tagId = (t: string) => `tag-${slug(t)}`;
export const kindId = (k: string) => `kind-${k}`;
export const growthId = (g: string) => `growth-${g}`;
export const noteUrl = (n: Note) => url(`/notes/${n.data.permalink}`);

export async function getNotes(): Promise<Note[]> {
  const notes = await getCollection('notes');
  return notes.sort((a, b) =>
    (b.data.publishedAt?.getTime() ?? 0) - (a.data.publishedAt?.getTime() ?? 0) ||
    ((b.data.originalPublishedAt ?? b.data.publishedAt)?.getTime() ?? 0) -
    ((a.data.originalPublishedAt ?? a.data.publishedAt)?.getTime() ?? 0),
  );
}

let cached: Promise<GraphData> | undefined;
export function getGraph() {
  if (!import.meta.env.PROD) return build();
  return (cached ??= build());
}

async function build(): Promise<GraphData> {
  const notes = await getNotes();
  const planned = await getCollection('planned');
  const view = new Map<string, ViewNode>();
  const viewLinks: ViewLink[] = [];
  const edges: Edge[] = [];
  const add = (n: ViewNode) => { if (!view.has(n.id)) view.set(n.id, n); return n.id; };
  const link = (source: string, target: string) => viewLinks.push({ source, target });
  const topic = (id: string) => url(`/topics/${encodeURIComponent(id)}`);

  for (const key of Object.keys(SECTIONS) as SectionKey[]) add({ id: sectionId(key), label: SECTIONS[key].label, type: 'section', url: url(SECTIONS[key].path) });
  const stages = Object.keys(GROWTH) as Growth[];
  for (const g of stages) add({ id: growthId(g), label: GROWTH[g], type: 'growth', url: topic(growthId(g)) });
  stages.slice(1).forEach((g, i) => link(growthId(stages[i]), growthId(g)));

  for (const note of notes) {
    const { uid, section, kind, domains, tags, growth, related, prerequisites, projectRefs } = note.data;
    link(uid, sectionId(section));
    link(uid, add({ id: kindId(kind), label: KIND_LABEL[kind] ?? kind, type: 'kind', url: topic(kindId(kind)) }));
    link(uid, growthId(growth));
    for (const d of domains) link(uid, add({ id: domainId(d), label: d, type: 'domain', url: topic(domainId(d)) }));
    for (const t of tags) link(uid, add({ id: tagId(t), label: t, type: 'tag', url: topic(tagId(t)) }));
    const { headings } = await render(note);
    for (const h of headings.filter((x) => x.depth === 2)) {
      link(uid, add({ id: `heading-${uid}-${h.slug}`, label: h.text, type: 'heading', url: `${noteUrl(note)}#${h.slug}` }));
    }
    for (const r of related ?? []) edges.push({ source: uid, target: r.uid, relation: r.relation, origin: 'frontmatter' });
    for (const p of prerequisites ?? []) edges.push({ source: uid, target: p, relation: 'prerequisite', origin: 'frontmatter' });
    for (const p of projectRefs ?? []) edges.push({ source: uid, target: p, relation: 'part-of', origin: 'frontmatter' });
  }

  for (const { data } of planned) {
    add({ id: data.id, label: data.title, type: 'planned', url: topic(data.id) });
    link(data.id, sectionId(data.section));
    for (const d of data.domains) link(data.id, add({ id: domainId(d), label: d, type: 'domain', url: topic(domainId(d)) }));
    for (const n of data.near) link(data.id, n);
  }

  const seen = new Set<string>();
  const unique = edges.filter((e) => {
    const key = [e.source, e.target].sort().join(' ');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    nodes: notes.map((n) => ({
      uid: n.data.uid, title: n.data.title, url: noteUrl(n), section: n.data.section, kind: n.data.kind,
      domains: n.data.domains, growth: n.data.growth, tags: n.data.tags,
    })),
    edges: unique, viewNodes: [...view.values()], viewLinks,
  };
}

function neighbours(g: GraphData) {
  const map = new Map<string, Set<string>>();
  const put = (a: string, b: string) => { (map.get(a) ?? map.set(a, new Set()).get(a)!).add(b); };
  for (const { source, target } of [...g.edges, ...g.viewLinks]) { put(source, target); put(target, source); }
  return map;
}

/** 이어진 글: 문서 Edge, 보기용 층의 두 단계, 앞으로 쓸 글 순서. section, kind, growth 점은 지나가지 않는다. */
export function connected(g: GraphData, id: string) {
  const near = neighbours(g);
  const types = new Map(g.viewNodes.map((n) => [n.id, n.type]));
  const notes = new Set(g.nodes.map((n) => n.uid));
  const broad = (n: string) => ['section', 'kind', 'growth'].includes(types.get(n) ?? '');
  const direct = g.edges.flatMap((e) => (e.source === id ? [e.target] : e.target === id ? [e.source] : []));
  const seen = new Set([id]);
  let frontier = [id];
  for (let step = 0; step < 2; step++) {
    const next: string[] = [];
    for (const n of frontier) {
      if (n !== id && broad(n)) continue;
      for (const m of near.get(n) ?? []) if (!seen.has(m)) { seen.add(m); next.push(m); }
    }
    frontier = next;
  }
  seen.delete(id);
  const reached = [...seen];
  const posts = [...new Set([...direct, ...reached.filter((n) => notes.has(n))])].filter((n) => notes.has(n));
  const plans = reached.filter((n) => types.get(n) === 'planned');
  return { posts, plans };
}
