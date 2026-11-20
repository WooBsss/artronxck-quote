// Light / dark theme: applied before first paint (no flash), remembered per browser,
// follows the system setting until the user picks one. Switching animates with a
// circular reveal from the button (View Transitions API) or a colour cross-fade.
(function () {
  const KEY = 'cncq.theme';
  const root = document.documentElement;
  const media = window.matchMedia('(prefers-color-scheme: dark)');

  const stored = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const save = (v) => { try { localStorage.setItem(KEY, v); } catch { /* storage unavailable */ } };
  const current = () => root.dataset.theme || (media.matches ? 'dark' : 'light');

  function apply(theme) {
    root.dataset.theme = theme;
    const btn = document.getElementById('themeToggle');
    if (btn) {
      const next = theme === 'dark' ? 'โหมดสว่าง' : 'โหมดมืด';
      btn.setAttribute('aria-label', `เปลี่ยนเป็น${next}`);
      btn.title = `เปลี่ยนเป็น${next}`;
      btn.setAttribute('aria-pressed', String(theme === 'dark'));
    }
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  }

  apply(stored() || (media.matches ? 'dark' : 'light'));
  media.addEventListener?.('change', (e) => { if (!stored()) apply(e.matches ? 'dark' : 'light'); });

  function toggle(e) {
    const next = current() === 'dark' ? 'light' : 'dark';
    save(next);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { apply(next); return; }

    if (document.startViewTransition) {
      const btn = e.currentTarget.getBoundingClientRect();
      const x = btn.left + btn.width / 2;
      const y = btn.top + btn.height / 2;
      const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      root.classList.add('vt-theme');
      const t = document.startViewTransition(() => apply(next));
      t.ready.then(() => {
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
          { duration: 650, easing: 'cubic-bezier(.65,0,.35,1)', pseudoElement: '::view-transition-new(root)' },
        );
      }).catch(() => {});
      t.finished.finally(() => root.classList.remove('vt-theme'));
    } else {
      // fallback: smooth colour cross-fade
      root.classList.add('theme-fade');
      apply(next);
      setTimeout(() => root.classList.remove('theme-fade'), 500);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    apply(current()); // refresh button labels
    document.getElementById('themeToggle')?.addEventListener('click', toggle);
  });
})();
