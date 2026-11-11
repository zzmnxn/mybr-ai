import { drag } from 'd3-drag';
import { easeCubicOut } from 'd3-ease';
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type SimulationLinkDatum, type SimulationNodeDatum } from 'd3-force';
import { select, selectAll } from 'd3-selection';
import 'd3-transition';
import { zoom, zoomIdentity, type ZoomTransform } from 'd3-zoom';

export type Kind = 'post' | 'hub' | 'real' | 'tag' | 'ghost';
export type NodeInput = { id: string; label: string; short?: string; kind: Kind; url?: string; growth?: string };
type Node = NodeInput & SimulationNodeDatum & { x: number; y: number; r: number; ph: number; ox: number; oy: number; px: number; py: number; g: SVGElement };
type Link = SimulationLinkDatum<Node> & { line: SVGLineElement; source: string | Node; target: string | Node };
type Pulse = { a: Node; b: Node; t: number; hops: number; c: SVGCircleElement };

export type BrainOptions = {
  nodes: NodeInput[]; links: { source: string; target: string }[];
  initiallyPaused?: boolean;
  spread: number; scale: number; margin: number; startK: number;
  inset(): number;
  onNode(d: NodeInput, e: Event): void; onHover(id: string | null): void; onFrame(): void; onResize(): void;
};

const NS = 'http://www.w3.org/2000/svg';
const el = <K extends keyof SVGElementTagNameMap>(name: K, attrs: Record<string, string | number> = {}) => {
  const e = document.createElementNS(NS, name);
  for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  return e;
};
// Obsidian식: 기본 점은 작게, 연결이 많을수록 sqrt로 커진다.
const SIZE: Record<Kind, number> = { post: 4.2, hub: 6, real: 2.2, tag: 2.8, ghost: 2.6 };
const GROWTH: Record<string, number> = { impulse: 4.2, synapse: 5.2, engram: 6.4 };

export type Brain = ReturnType<typeof createBrain>;

export function createBrain(svg: SVGSVGElement, opt: BrainOptions) {
  let destroyed = false;
  let frameId = 0;
  const listeners = new AbortController();
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sc = opt.scale;
  const world = svg.appendChild(el('g', { class: 'world' }));
  const gT = world.appendChild(el('g')), gE = world.appendChild(el('g')), gP = world.appendChild(el('g')), gN = world.appendChild(el('g'));
  const trailLine = gT.appendChild(el('polyline', { class: 'trail' }));

  const deg = new Map<string, number>();
  opt.links.forEach((l) => { deg.set(l.source, (deg.get(l.source) ?? 0) + 1); deg.set(l.target, (deg.get(l.target) ?? 0) + 1); });
  const nodes = opt.nodes.map((d, i) => ({ ...d, r: ((d.growth ? GROWTH[d.growth] : SIZE[d.kind]) + Math.min(5, Math.sqrt(deg.get(d.id) ?? 0) * 0.7)) * sc, ph: i * 1.7, ox: 0, oy: 0, px: 0, py: 0, x: 0, y: 0 })) as Node[];
  const byId = new Map(nodes.map((d) => [d.id, d]));
  const usable = opt.links.filter((l) => byId.has(l.source) && byId.has(l.target));
  const links = usable.map((l) => ({ ...l, line: gE.appendChild(el('line', { class: 'edge' })) })) as Link[];
  const adj = new Map<string, string[]>(nodes.map((d) => [d.id, []]));
  usable.forEach((l) => { adj.get(l.source)!.push(l.target); adj.get(l.target)!.push(l.source); });

  let W = 0, H = 0, cx = 0, cy = 0;
  let mouse: [number, number] | null = null, hover: string | null = null, pin: Set<string> | null = null, gathered: Set<string> | null = null;
  let trail: string[] = [], view: ZoomTransform = zoomIdentity, saved: ZoomTransform | null = null;
  let mini = false, touched = false, fitted = false, paused = opt.initiallyPaused ?? reduce, pulses: Pulse[] = [], running = true, last = 0, idle = 0, loopOn = false;

  for (const [i, d] of nodes.entries()) {
    const g = el(d.url ? 'a' : 'g', { class: `n n-${d.kind}`, style: `--i:${i}` }) as SVGElement;
    if (d.url) g.setAttribute('href', d.url);
    g.appendChild(el('circle', { class: 'node-aura', r: d.r + 7 * sc }));
    g.appendChild(el('circle', { class: 'ring', r: d.r }));
    if (d.growth && d.growth !== 'impulse') g.appendChild(el('circle', { class: `halo halo-${d.growth}`, r: d.r + 3 * sc }));
    g.appendChild(el('circle', { class: 'dot', r: d.r }));
    g.appendChild(el('text', { y: d.r + 12 * sc + 2, 'text-anchor': 'middle' })).textContent = d.short ?? d.label;
    g.appendChild(el('title')).textContent = d.label + (d.kind === 'ghost' ? ', 아직 쓰지 않은 글' : '');
    d.g = g; gN.appendChild(g);
    g.addEventListener('pointerenter', () => setHover(d.id), { signal: listeners.signal });
    g.addEventListener('pointerleave', () => setHover(null), { signal: listeners.signal });
    if (d.url) { g.addEventListener('focus', () => setHover(d.id), { signal: listeners.signal }); g.addEventListener('blur', () => setHover(null), { signal: listeners.signal }); }
    g.addEventListener('click', (e) => opt.onNode(d, e), { signal: listeners.signal });
  }

  const idOf = (x: string | Node) => (typeof x === 'string' ? x : x.id);
  function paint() {
    if (destroyed) return;
    const near = hover ? new Set([hover, ...adj.get(hover)!]) : pin;
    svg.classList.toggle('focusing', !!near);
    nodes.forEach((d) => d.g.classList.toggle('lit', !!near && near.has(d.id)));
    links.forEach((l) => {
      const a = idOf(l.source), b = idOf(l.target);
      l.line.classList.toggle('lit', !!near && (hover ? a === hover || b === hover : near.has(a) && near.has(b)));
    });
  }
  function setHover(id: string | null) {
    if (destroyed) return;
    if (id && !byId.has(id)) id = null;
    hover = id; paint(); opt.onHover(id);
    if (id && !paused) adj.get(id)!.forEach((n) => fire(id!, n, 1));
  }
  function fire(a: string, b: string, hops: number) {
    const from = byId.get(a), to = byId.get(b);
    if (destroyed || paused || pulses.length > 28 || !from || !to) return;
    pulses.push({ a: from, b: to, t: 0, hops, c: gP.appendChild(el('circle', { class: 'pulse', r: 2.4, cx: from.px, cy: from.py })) });
  }
  function flash(d: Node) { d.g.classList.remove('fire'); void d.g.getBoundingClientRect(); d.g.classList.add('fire'); }

  function size() {
    const b = svg.getBoundingClientRect(); W = b.width; H = b.height;
    if (!W || !H) return;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); cx = W / 2; cy = H / 2;
  }
  size();
  nodes.forEach((d, i) => { d.x = cx + Math.cos(i) * 6; d.y = cy + Math.sin(i) * 6; d.px = d.x; d.py = d.y; });

  const keep = () => nodes.forEach((d) => {
    const m = 30, v = d as Required<SimulationNodeDatum>;
    if (d.x < m) v.vx += 1.2; if (d.x > W - m) v.vx -= 1.2; if (d.y < m) v.vy += 1.2; if (d.y > H - m) v.vy -= 1.2;
    if (gathered) { const s = gathered.has(d.id) ? 0.012 : -0.012; v.vx += (cx - d.x) * s; v.vy += (cy - d.y) * s; }
  });
  // 뇌 윤곽: 타원 밖으로 나간 점을 안쪽으로 밀고, 가운데 세로 틈(대뇌 종열)에서는 좌우로 갈라 두 반구를 만든다.
  const ry = Math.sqrt(nodes.length) * 9.5 * opt.spread, rx = ry * 1.3;
  const shape = (a: number) => nodes.forEach((d) => {
    const v = d as Required<SimulationNodeDatum>, dx = d.x - cx, dy = d.y - cy, e = (dx / rx) ** 2 + (dy / ry) ** 2;
    if (e > 1) { const f = Math.min(1.5, (Math.sqrt(e) - 1) * 0.35 + 0.05) * a * 6; v.vx -= dx * f / Math.sqrt(e) * 0.08 * 6; v.vy -= dy * f / Math.sqrt(e) * 0.08 * 6; }
    const gap = 16 * opt.spread, t = ry ? 1 - Math.min(1, Math.abs(dy) / ry) : 0;
    if (Math.abs(dx) < gap) v.vx += (dx >= 0 ? 1 : -1) * (gap - Math.abs(dx)) * 0.04 * t;
  });
  const near = (l: Link) => (l.source as Node).kind === 'post' || (l.target as Node).kind === 'post';
  const sim = forceSimulation<Node>(nodes)
    .force('link', forceLink<Node, Link>(links).id((d) => d.id).distance((l) => (near(l) ? 76 : 54) * opt.spread).strength(0.55))
    .force('charge', forceManyBody<Node>().strength(-170 * opt.spread))
    .force('collide', forceCollide<Node>((d) => d.r + 6))
    .force('x', forceX<Node>(cx).strength(0.05)).force('y', forceY<Node>(cy).strength(0.065)).force('keep', keep).force('shape', shape as never)
    .alphaDecay(0.022).stop();
  if (paused) { for (let i = 0; i < 360; i++) sim.tick(); sim.alpha(0); }

  function nudge(a: number) {
    if (destroyed) return;
    sim.alpha(a);
    if (paused) { for (let i = 0; i < 200; i++) sim.tick(); sim.alpha(0); draw(0); opt.onFrame(); } else start();
  }
  const resizeObserver = new ResizeObserver(() => {
    if (destroyed) return;
    const w = W, h = H; size();
    if (w !== W || h !== H) {
      (sim.force('x') as ReturnType<typeof forceX<Node>>).x(cx); (sim.force('y') as ReturnType<typeof forceY<Node>>).y(cy);
      nudge(0.5); if (!touched && !mini) fit(0); opt.onResize();
    }
  });
  resizeObserver.observe(svg);

  selectAll<SVGElement, Node>(nodes.map((d) => d.g)).data(nodes).call(
    drag<SVGElement, Node>().clickDistance(5).filter((e) => !destroyed && !e.button && !mini)
      .on('start', (_e, d) => { sim.alpha(0.5).alphaTarget(0.25); d.fx = d.x; d.fy = d.y; start(); })
      .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
      .on('end', (_e, d) => { sim.alphaTarget(0); d.fx = null; d.fy = null; }),
  );
  svg.addEventListener('pointermove', (e) => { const b = svg.getBoundingClientRect(); mouse = [e.clientX - b.left, e.clientY - b.top]; }, { signal: listeners.signal });
  svg.addEventListener('pointerleave', () => { mouse = null; }, { signal: listeners.signal });

  function draw(now: number) {
    if (destroyed) return;
    const s = now / 1000;
    for (const d of nodes) {
      let tx = 0, ty = 0;
      if (!paused) {
        tx = Math.sin(s * 0.5 + d.ph) * 3.5; ty = Math.cos(s * 0.42 + d.ph) * 3.5;
        if (mouse && !hover && !mini) {
          const dx = d.x - (mouse[0] - view.x) / view.k, dy = d.y - (mouse[1] - view.y) / view.k, q = Math.hypot(dx, dy) || 1;
          if (q > 30 && q < 140) { const f = Math.sin(((q - 30) / 110) * Math.PI) * 16; tx += (dx / q) * f; ty += (dy / q) * f; }
        }
      }
      d.ox += (tx - d.ox) * 0.09; d.oy += (ty - d.oy) * 0.09; d.px = d.x + d.ox; d.py = d.y + d.oy;
      d.g.setAttribute('transform', `translate(${d.px.toFixed(1)} ${d.py.toFixed(1)})`);
    }
    for (const l of links) {
      const a = l.source as Node, b = l.target as Node;
      l.line.setAttribute('x1', String(a.px)); l.line.setAttribute('y1', String(a.py)); l.line.setAttribute('x2', String(b.px)); l.line.setAttribute('y2', String(b.py));
    }
    trailLine.setAttribute('points', trail.map((id) => { const d = byId.get(id); return d ? `${d.px},${d.py}` : ''; }).join(' '));
  }
  function loop(now: number) {
    if (destroyed) return;
    if (running) {
      const dt = Math.min(48, now - last); last = now;
      if (sim.alpha() > sim.alphaMin()) sim.tick();
      draw(now); opt.onFrame();
      if (!fitted && !touched && !mini && sim.alpha() < 0.08) { fitted = true; fit(900); }
      const moving = pulses; pulses = [];
      for (const p of moving) {
        p.t += dt / 460; const k = Math.min(1, p.t);
        p.c.setAttribute('cx', String(p.a.px + (p.b.px - p.a.px) * k)); p.c.setAttribute('cy', String(p.a.py + (p.b.py - p.a.py) * k));
        if (p.t < 1) { pulses.push(p); continue; }
        p.c.remove(); flash(p.b);
        if (p.hops > 0) adj.get(p.b.id)!.filter((n) => n !== p.a.id).sort(() => Math.random() - 0.5).slice(0, 2).forEach((n) => fire(p.b.id, n, p.hops - 1));
      }
      idle += dt;
      if (!paused && !hover && !mini && idle > 1500) {
        idle = 0;
        const c = nodes.filter((d) => d.kind !== 'ghost' && adj.get(d.id)!.length);
        if (c.length) { const a = c[(Math.random() * c.length) | 0], n = adj.get(a.id)!; fire(a.id, n[(Math.random() * n.length) | 0], 2); }
      }
    } else last = now;
    if (!paused || sim.alpha() > sim.alphaMin()) frameId = requestAnimationFrame(loop);
    else { loopOn = false; draw(0); opt.onFrame(); }
  }
  function start() { if (!destroyed && !loopOn) { loopOn = true; last = performance.now(); frameId = requestAnimationFrame(loop); } }
  const intersectionObserver = new IntersectionObserver((es) => { if (!destroyed) running = es[0].isIntersecting; });
  intersectionObserver.observe(svg);

  const sel = select<SVGSVGElement, unknown>(svg);
  const zoomer = zoom<SVGSVGElement, unknown>().scaleExtent([0.5, 5])
    .filter((e) => {
      if (destroyed || mini) return false;
      if (e.type === 'wheel') return true;
      if (e.type === 'touchstart') return e.touches.length > 1;
      return !e.button && !(e.target as Element).closest('.n');
    })
    .on('zoom', (e) => {
      if (destroyed) return;
      view = e.transform; world.setAttribute('transform', String(view));
      svg.classList.toggle('zoomed', view.k >= 2.4);
      if (e.sourceEvent) touched = true;
      opt.onFrame();
    });
  sel.call(zoomer).on('dblclick.zoom', null);
  function go(t: ZoomTransform, ms: number) {
    if (destroyed) return;
    sel.interrupt();
    if (ms && !reduce) sel.transition().duration(ms).ease(easeCubicOut).call(zoomer.transform, t);
    else sel.call(zoomer.transform, t);
  }
  function fit(ms: number) {
    if (!nodes.length) return;
    const xs = nodes.map((d) => d.x), ys = nodes.map((d) => d.y), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), m = opt.margin;
    const left = opt.inset(), room = W - left;
    const k = Math.max(0.6, Math.min(2.4, (room - m * 2) / (x1 - x0 || 1), (H - m * 2) / (y1 - y0 || 1)));
    go(zoomIdentity.translate(left + room / 2 - ((x0 + x1) / 2) * k, H / 2 - ((y0 + y1) / 2) * k).scale(k), ms);
  }
  go(zoomIdentity.translate(cx - cx * opt.startK, cy - cy * opt.startK).scale(opt.startK), 0);
  draw(0);
  if (paused) { fitted = true; fit(0); opt.onFrame(); } else start();

  return {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelAnimationFrame(frameId); loopOn = false;
      sim.stop(); resizeObserver.disconnect(); intersectionObserver.disconnect(); listeners.abort();
      sel.interrupt().on('.zoom', null);
      selectAll<SVGElement, unknown>([...svg.querySelectorAll<SVGElement>('*')]).interrupt().on('.drag', null);
      select(window).on('.drag', null);
      world.remove(); pulses = [];
      svg.classList.remove('mini', 'focusing', 'zoomed');
    },
    adj, has: (id: string) => byId.has(id), fire, light: setHover, isPaused: () => paused,
    focus(set: Set<string> | null) { pin = set; paint(); },
    gather(set: Set<string> | null) { gathered = set; nudge(0.6); },
    fit(ms: number) { touched = false; fit(ms); },
    zoomBy(f: number) { touched = true; sel.interrupt(); if (reduce) sel.call(zoomer.scaleBy, f); else sel.transition().duration(220).call(zoomer.scaleBy, f); },
    miniOn(id: string | null, mx: number, my: number, k: number) {
      if (destroyed || !nodes.length) return;
      // 전체 그래프를 박스(약 300px) 안에 맞춘다. 선택한 글에 중심을 두면 바깥 점이 영역 밖으로 번진다.
      void id;
      if (!mini) saved = view;
      mini = true; svg.classList.add('mini');
      const xs = nodes.map((d) => d.x), ys = nodes.map((d) => d.y), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const fitK = Math.min(k, 290 / (x1 - x0 || 1), 290 / (y1 - y0 || 1));
      go(zoomIdentity.translate(mx - ((x0 + x1) / 2) * fitK, my - ((y0 + y1) / 2) * fitK).scale(fitK), 420);
    },
    miniOff() { if (!mini) return; mini = false; svg.classList.remove('mini'); go(saved ?? view, 420); },
    trail(list: string[]) { trail = list; nodes.forEach((d) => d.g.classList.toggle('walked', list.includes(d.id))); draw(performance.now()); },
    mark(id: string | null) { nodes.forEach((d) => d.g.classList.toggle('here', d.id === id)); },
    screen(id: string): [number, number] { const d = byId.get(id)!, b = svg.getBoundingClientRect(); return [b.left + view.x + d.px * view.k, b.top + view.y + d.py * view.k]; },
    size: () => [W, H] as const,
    setPaused(v: boolean) { if (destroyed) return; paused = v; if (v) { sim.alpha(0); pulses.forEach((p) => p.c.remove()); pulses = []; } else start(); },
  };
}
