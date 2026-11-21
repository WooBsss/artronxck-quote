// Light / dark theme: applied before first paint (no flash), remembered per browser,
// follows the system setting until the user picks one.
// Switching (minimal): the knob slides, then a clean circle in the new background colour expands
// from the switch (under the header, so the switch stays visible) and fades to reveal the new theme.
(function () {
  const KEY = 'cncq.theme';
  const root = document.documentElement;
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const BG = { light: '#f5f5f6', dark: '#09090a' };
  let busy = false;

  const stored = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const save = (v) => { try { localStorage.setItem(KEY, v); } catch { /* storage unavailable */ } };
  const current = () => root.dataset.theme || (media.matches ? 'dark' : 'light');

  function syncSwitch(theme) {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    const dark = theme === 'dark';
    btn.classList.toggle('is-dark', dark);
    btn.setAttribute('aria-checked', String(dark));
    const L = (th, en) => (window.I18N?.lang === 'en' ? en : th);
    const next = dark ? L('โหมดสว่าง', 'light mode') : L('โหมดมืด', 'dark mode');
    btn.setAttribute('aria-label', L('โหมดมืด', 'Dark mode')); // role=switch: aria-checked carries the on/off state
    btn.title = L(`เปลี่ยนเป็น${next}`, `Switch to ${next}`);
  }

  function apply(theme) {
    root.dataset.theme = theme;
    syncSwitch(theme);
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  }

  apply(stored() || (media.matches ? 'dark' : 'light'));
  media.addEventListener?.('change', (e) => { if (!stored()) apply(e.matches ? 'dark' : 'light'); });

  /** a clean circle in the new background colour expands over the page, then fades out */
  function sweep(x, y, theme) {
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 20;
    const c = document.createElement('div');
    c.className = 'theme-ring';
    c.style.cssText = `left:${x}px;top:${y}px;width:${r * 2}px;height:${r * 2}px;--wipe-bg:${BG[theme]}`;
    document.body.appendChild(c);
    return c.animate(
      [{ transform: 'translate(-50%, -50%) scale(0)' }, { transform: 'translate(-50%, -50%) scale(1)' }],
      { duration: 520, easing: 'cubic-bezier(.4, 0, .2, 1)', fill: 'forwards' },
    ).finished.then(() => {
      apply(theme); // page re-colours underneath the full-screen circle
      return c.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, easing: 'ease-out', fill: 'forwards' }).finished;
    }).finally(() => c.remove());
  }

  function toggle(e) {
    if (busy) return;
    const next = current() === 'dark' ? 'light' : 'dark';
    save(next);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !Element.prototype.animate) { apply(next); return; }

    busy = true;
    const btn = e.currentTarget;
    syncSwitch(next); // knob starts sliding now
    // where the knob ends up: right end when going dark, left end when going light
    const t = btn.getBoundingClientRect();
    const knobR = t.height / 2;
    const x = next === 'dark' ? t.right - knobR : t.left + knobR;
    const y = t.top + knobR;
    setTimeout(() => { sweep(x, y, next).finally(() => { busy = false; }); }, 120);
  }

  document.addEventListener('DOMContentLoaded', () => {
    syncSwitch(current()); // labels + knob position for the server-rendered button
    document.getElementById('themeToggle')?.addEventListener('click', toggle);
    window.addEventListener('langchange', () => syncSwitch(current())); // re-label in the new language
  });
})();
