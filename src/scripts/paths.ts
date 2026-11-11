export function mountPaths(root: HTMLElement, options: { focusNodes(uids: Set<string>): void; clearFocus(): void }): () => void {
  const steps = [...root.querySelectorAll<HTMLElement>('[data-path-step]')];
  function selectStep() {
    const id = location.hash.slice(1);
    const step = steps.find(step => step.id === id);
    root.querySelectorAll<HTMLAnchorElement>('[data-path-anchor]').forEach(link => {
      if (link.dataset.pathAnchor === step?.id) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    });
    options.focusNodes(new Set((step ? [step] : steps).flatMap(step => JSON.parse(step.dataset.noteUids ?? '[]') as string[])));
  }
  window.addEventListener('hashchange', selectStep);
  selectStep();
  return () => { window.removeEventListener('hashchange', selectStep); options.clearFocus(); };
}
