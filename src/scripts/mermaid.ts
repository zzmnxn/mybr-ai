let pending = false;
let running = false;
let nextId = 0;

async function renderDiagrams() {
  for (const pre of document.querySelectorAll<HTMLElement>('.prose pre')) {
    if (pre.closest('.mermaid-figure') || !(pre.dataset.language === 'mermaid' || pre.querySelector('code.language-mermaid'))) continue;
    const figure = document.createElement('figure');
    figure.className = 'mermaid-figure';
    const canvas = document.createElement('div');
    canvas.className = 'mermaid-canvas';
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'region');
    canvas.setAttribute('aria-label', '다이어그램. 넓은 도식은 가로로 스크롤할 수 있습니다.');
    const source = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = '다이어그램 원문';
    pre.replaceWith(figure);
    source.append(summary, pre);
    figure.append(canvas, source);
  }
  const figures = document.querySelectorAll<HTMLElement>('.mermaid-figure');
  if (!figures.length) return;
  try {
    const { default: mermaid } = await import('mermaid');
    await document.fonts.ready;
    const theme = document.documentElement.dataset.theme ?? 'light';
    const style = getComputedStyle(document.documentElement);
    const color = (name: string) => style.getPropertyValue(name).trim();
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'base',
      themeVariables: {
        darkMode: theme === 'dark',
        fontFamily: 'Arial, sans-serif',
        primaryColor: color('--color-marker'),
        primaryTextColor: color('--color-ink'),
        primaryBorderColor: color('--color-trail'),
        lineColor: color('--color-trail'),
        secondaryColor: color('--color-paper-2'),
        tertiaryColor: color('--color-paper'),
        background: color('--color-paper'),
        textColor: color('--color-ink'),
      },
      flowchart: { htmlLabels: false },
    });
    for (const figure of figures) {
      if (!figure.isConnected || figure.dataset.renderTheme === theme) continue;
      const canvas = figure.querySelector<HTMLElement>('.mermaid-canvas')!;
      const source = figure.querySelector('pre')!;
      try {
        const { svg, bindFunctions } = await mermaid.render(`diagram-${++nextId}`, source.textContent ?? '', canvas);
        if (!figure.isConnected) continue;
        canvas.innerHTML = svg;
        bindFunctions?.(canvas);
        figure.dataset.renderTheme = theme;
      } catch {
        canvas.textContent = '다이어그램을 표시하지 못했습니다. 아래 원문을 확인해 주세요.';
        figure.querySelector('details')!.open = true;
      }
    }
  } catch {
    for (const figure of figures) {
      figure.querySelector('.mermaid-canvas')!.textContent = '다이어그램을 불러오지 못했습니다. 아래 원문을 확인해 주세요.';
      figure.querySelector('details')!.open = true;
    }
  }
}

async function refresh() {
  pending = true;
  if (running) return;
  running = true;
  try {
    while (pending) { pending = false; await renderDiagrams(); }
  } finally { running = false; }
}

new MutationObserver(() => { void refresh(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
document.addEventListener('astro:page-load', () => { void refresh(); });
void refresh();
