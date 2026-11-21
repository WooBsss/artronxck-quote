// Light / dark theme: applied before first paint (no flash), remembered per browser,
// follows the system setting until the user picks one.
// Switching: the slider knob slides (sun → moon), a burst of sparks / stars flies out of it,
// and a circle in the new theme's colour with a glowing cyan rim sweeps across the page
// (under the header, so the switch keeps animating on top), then fades to reveal the new theme.
(function () {
  const KEY = 'cncq.theme';
  const root = document.documentElement;
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const BG = { light: '#f3f7f8', dark: '#050607' };
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
    const next = dark ? 'โหมดสว่าง' : 'โหมดมืด';
    btn.setAttribute('aria-label', 'โหมดมืด'); // role=switch: aria-checked carries the on/off state
    btn.title = `เปลี่ยนเป็น${next}`;
  }

  function apply(theme) {
    root.dataset.theme = theme;
    syncSwitch(theme);
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  }

  apply(stored() || (media.matches ? 'dark' : 'light'));
  media.addEventListener?.('change', (e) => { if (!stored()) apply(e.matches ? 'dark' : 'light'); });

  /** sparks (going light) or stars (going dark) flying out of the knob */
  function burst(x, y, theme) {
    const n = 12;
    const colors = theme === 'dark' ? ['#ffffff', '#bfe9ff', '#22dddc'] : ['#ffd84a', '#ffae00', '#fff3b0'];
    for (let i = 0; i < n; i++) {
      const p = document.createElement('span');
      p.className = 'theme-spark' + (theme === 'dark' ? ' star' : '');
      p.style.left = `${x}px`; p.style.top = `${y}px`;
      p.style.background = colors[i % colors.length];
      document.body.appendChild(p);
      const ang = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 34 + Math.random() * 40;
      const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist;
      p.animate([
        { transform: 'translate(-50%, -50%) scale(.2) rotate(0deg)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx * 0.7}px), calc(-50% + ${dy * 0.7}px)) scale(1.1) rotate(90deg)`, opacity: 1, offset: 0.55 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.2) rotate(180deg)`, opacity: 0 },
      ], { duration: 650 + Math.random() * 250, easing: 'cubic-bezier(.2, .8, .3, 1)', delay: Math.random() * 60 })
        .finished.then(() => p.remove(), () => p.remove());
    }
  }

  /** a circle in the new background colour with a glowing rim sweeps over the page */
  function sweep(x, y, theme) {
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 60;
    const c = document.createElement('div');
    c.className = 'theme-ring';
    c.style.cssText = `left:${x}px;top:${y}px;width:${r * 2}px;height:${r * 2}px;--wipe-bg:${BG[theme]}`;
    document.body.appendChild(c);
    return c.animate(
      [{ transform: 'translate(-50%, -50%) scale(0)' }, { transform: 'translate(-50%, -50%) scale(1)' }],
      { duration: 720, easing: 'cubic-bezier(.7, 0, .25, 1)', fill: 'forwards' },
    ).finished.then(() => {
      apply(theme); // page re-colours underneath the full-screen circle
      return c.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 380, easing: 'ease-out', fill: 'forwards' }).finished;
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
    setTimeout(() => burst(x, y, next), 280);
    setTimeout(() => { sweep(x, y, next).finally(() => { busy = false; }); }, 160);
  }

  document.addEventListener('DOMContentLoaded', () => {
    syncSwitch(current()); // labels + knob position for the server-rendered button
    document.getElementById('themeToggle')?.addEventListener('click', toggle);
  });
})();
