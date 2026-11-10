// Runs in the head so the first painted frame uses the chosen theme.
(() => {
  const system = matchMedia('(prefers-color-scheme: dark)');
  let preference = 'system';
  try {
    const saved = localStorage.getItem('mybr-theme');
    if (saved === 'light' || saved === 'dark') preference = saved;
  } catch { /* System preference also works when storage is unavailable. */ }

  function apply(root = document.documentElement) {
    root.dataset.theme = preference === 'system' ? (system.matches ? 'dark' : 'light') : preference;
  }
  function sync() {
    apply();
    const control = document.querySelector('#theme-choice');
    if (control) control.textContent = { system: '시스템', light: '라이트', dark: '다크' }[preference];
    document.querySelectorAll('[data-theme-option]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.themeOption === preference));
    });
  }

  apply();
  system.addEventListener('change', sync);
  document.addEventListener('astro:before-swap', (event) => apply(event.newDocument.documentElement));
  document.addEventListener('astro:page-load', sync);
  document.addEventListener('DOMContentLoaded', sync);
  document.addEventListener('click', (event) => {
    const dropdown = document.querySelector('.theme-control');
    const option = event.target.closest('[data-theme-option]');
    if (!option) {
      if (dropdown && !dropdown.contains(event.target)) dropdown.open = false;
      return;
    }
    preference = option.dataset.themeOption;
    try { localStorage.setItem('mybr-theme', preference); } catch { /* Keep the choice for this page session. */ }
    sync();
    if (dropdown) {
      dropdown.open = false;
      dropdown.querySelector('summary').focus();
    }
  });
  document.addEventListener('keydown', (event) => {
    const dropdown = document.querySelector('.theme-control');
    if (event.key !== 'Escape' || !dropdown?.open) return;
    event.preventDefault();
    event.stopPropagation();
    dropdown.open = false;
    dropdown.querySelector('summary').focus();
  }, true);
})();
