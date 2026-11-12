// Darstellungs-Baustein 'pairs' (Gegensatz-Paare) für Wicked Questions. Stand 12.11.2026.
// Die Gruppe sammelt, was beides wahr ist und sich scheinbar widerspricht. Die KI ordnet Post-its zwei Polen zu
// und formuliert je Paar eine paradoxe Frage „Wie können wir zugleich A und B?“.
//
// Payload (von der KI):
// { viz: 'pairs',
//   pairs: [ { question: 'Wie können wir zugleich … und …?',
//              a: { label: 'Pol A (2–4 Wörter)', ids: [Post-it-IDs] },
//              b: { label: 'Pol B (2–4 Wörter)', ids: [Post-it-IDs] },
//              color: 'grün' | 'blau' | 'rosa' | 'orange' | 'lila' | 'türkis' | 'koralle' | 'gelb' } ],   // color optional, sonst reihum
//   rest: [IDs ohne Paar] }   // optional (gibt die Reihenfolge vor); Post-its ohne Paar kommen immer zu den Einzelstimmen, auch wenn rest sie nicht nennt. IDs als Zahl oder Text.
// Empfohlen: 3 bis 6 Paare. Beide Pole werden gleichwertig gezeigt (gleiche Farbe, gespiegelt), kein Gut/Schlecht.
//
// Übersicht: je Paar eine Karte, oben die Frage, darunter Pol A ↔ Pol B; „Einzelstimmen“ klein darunter.
// Fokus k: Paar k füllt die Wand, Frage sehr groß. count = Zahl der Paare.
// Show-Effekt: Paar für Paar färben sich die Post-its im Mosaik, fliegen zu ihren Polen, dann erscheint die Frage dazwischen.
(() => {
  const P = 'vz-pairs-';
  const COLORS = ['grün', 'blau', 'rosa', 'orange', 'lila', 'türkis', 'koralle', 'gelb'];
  const DARK = { gelb: '#D9AE1E', grün: '#4FA36F', blau: '#4F82CC', rosa: '#CC6690', orange: '#E08A3C', lila: '#8C70C4', türkis: '#409E9F', koralle: '#D9735C', none: '#9A9A92' };
  const FLOOR = { all: 9, one: 15 }, HI = { all: 30, one: 34 };
  const Q = { all: 1.3, one: 1.75 };   // Frage relativ zur Post-it-Schrift

  const css = document.createElement('style');
  css.textContent = `
  .${P}wrap { position: absolute; inset: 0; display: grid; gap: .7em .9em; --lines: 3; grid-auto-rows: auto; align-content: stretch; }
  .${P}wrap.${P}measure { bottom: auto; align-content: start; }
  .${P}card { min-width: 0; min-height: 0; display: flex; flex-direction: column; background: #fff; border-radius: .55em; padding: .45em .7em .6em;
              border-top: .32em solid var(--acc); justify-content: center; box-shadow: 0 1px 4px rgba(0,0,0,.10); overflow: hidden;
              transition: background-color .5s, box-shadow .5s, border-color .5s; }
  .${P}top { flex: none; display: flex; align-items: flex-start; gap: .6em; margin: 0 0 .4em; }
  .${P}q { flex: 1; min-width: 0; margin: 0; font-weight: 800; line-height: 1.18; text-align: center; color: #1C1917; cursor: pointer; overflow-wrap: anywhere;
           transition: opacity .8s ease-out, transform .8s cubic-bezier(.2,.8,.2,1); }
  .${P}one .${P}q { cursor: default; }
  .${P}back { flex: none; border: 1px solid #C9C9C2; background: none; cursor: pointer; font: inherit; font-size: 15px; color: #5F5F5F; padding: 3px 12px; border-radius: 999px; margin-top: .3em; }
  .${P}body { flex: 0 1 auto; min-height: 0; display: grid; grid-template-columns: minmax(0,1fr) 2.4em minmax(0,1fr); }
  .${P}pole { min-width: 0; min-height: 0; display: flex; flex-direction: column; }
  .${P}pole.a { align-items: flex-end; } .${P}pole.b { align-items: flex-start; }
  .${P}lab { flex: none; max-width: 100%; font-weight: 700; padding: .05em .7em; border-radius: .75em; margin: 0 0 .3em; overflow-wrap: anywhere;
             transition: opacity .5s; }
  .${P}lab span { font-weight: 400; color: #5F5F5F; }
  .${P}tiles { flex: 1; min-height: 0; width: 100%; overflow: hidden; }
  .${P}inner { display: flex; flex-wrap: wrap; align-content: flex-start; gap: .28em; }
  .${P}pole.a .${P}inner { justify-content: flex-end; }
  .${P}mid { position: relative; transition: opacity .5s; }
  .${P}mid::before { content: ''; position: absolute; left: 50%; top: .2em; bottom: .2em; border-left: .14em dashed var(--acc); transform: translateX(-50%); opacity: .7; }
  .${P}mid b { position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%); width: 1.9em; height: 1.9em; border-radius: 50%; background: var(--acc); color: #fff;
               display: flex; align-items: center; justify-content: center; font-size: 1.05em; line-height: 1; }
  .${P}dot { flex: none; width: 1.15em; height: 1.15em; padding: 0; border-radius: .2em; }
  .${P}wrap .${P}dot { height: 1.15em; }
  .${P}unclamp .tile { flex-grow: 0 !important; flex-shrink: 0 !important; }
  .${P}unclamp .tile span { display: block; -webkit-line-clamp: unset; overflow: visible; }
  .${P}rest { grid-column: 1 / -1; min-height: 0; display: flex; flex-direction: column; font-size: .9em; }
  .${P}rest .${P}lab { align-self: flex-start; }
  .${P}nt, .${P}nt * { transition: none !important; }
  .${P}hid { background: transparent; box-shadow: none; border-top-color: transparent; }
  .${P}hid .${P}lab, .${P}hid .${P}mid { opacity: 0; }
  .${P}qhid { opacity: 0; transform: scale(.82); }
  .${P}ghosts { position: absolute; inset: 0; pointer-events: none; }   /* ohne z-index: die Geister ordnen sich einzeln unter/ueber den Karten ein */
  .${P}ghosts .tile { position: absolute; --lines: 3; z-index: 0; transition: background-color .3s, opacity .6s; }
  .${P}ghosts.${P}wait .tile { opacity: .45; }
  .${P}ghosts .tile.${P}up { z-index: 2; opacity: 1; }
  .${P}pulse { animation: ${P}pulse .9s ease-out; }
  @keyframes ${P}pulse { 35% { transform: translate(-50%,-50%) scale(1.45); } }
  `;
  document.head.append(css);

  const emWidth = (text, lines, cap) => Math.max(8, Math.min(text.length, cap)) / lines * 0.5 + 1.7;

  // Payload auflösen: Paare mit echten Post-its, Einzelstimmen
  function model(ctx) {
    const d = ctx.data || {}, byId = new Map(ctx.rows.map(r => [String(r.id), r])), used = new Set();   // IDs als Text: '5' und 5 sind dasselbe Post-it
    const pick = ids => (Array.isArray(ids) ? ids : []).map(i => byId.get(String(i))).filter(r => r && !used.has(r.id) && used.add(r.id));
    const pairs = (d.pairs || []).map((p, k) => ({ k, question: p.question || '', color: COLORS.includes(p.color) ? p.color : COLORS[k % COLORS.length],
      a: { label: (p.a || {}).label || 'Pol A', rows: pick((p.a || {}).ids) }, b: { label: (p.b || {}).label || 'Pol B', rows: pick((p.b || {}).ids) } }));
    const rest = pick(d.rest).concat(ctx.rows.filter(r => !used.has(r.id)));   // kein Post-it verschwindet: nicht zugeordnete kommen ans Ende der Einzelstimmen
    return { pairs, rest };
  }

  function tile(r, cls, lines, cap) {
    if (!lines) { const d = ctx_el('div', null, 'tile ' + cls + ' ' + P + 'dot'); d.dataset.id = r.id; d.title = r.body; return d; }   // Fragen-Übersicht: ein Punkt je Post-it
    const long = Math.max(...r.body.split(/\s+/).map(x => x.length));   // längstes Wort soll nicht zerbrechen
    const e = ctx_el('div', null, 'tile ' + cls), w = Math.max(emWidth(r.body, lines, cap), Math.min(long * .55 + 1.2, 12));
    e.dataset.id = r.id; e.title = r.body; e.append(ctx_el('span', r.body));
    setW(e, w); return e;
  }
  const setW = (e, w) => { e.dataset.w = w; e.style.flex = `${Math.round(w * 10)} 1 ${w}em`; e.style.maxWidth = w * 2.4 + 'em'; };
  // Schätzung der Breite reicht nicht immer: Post-its, deren Text abgeschnitten würde, bekommen mehr Breite (alles in em, also schriftunabhängig)
  function widen(wrap) {
    wrap.style.fontSize = '16px'; wrap.classList.add(P + 'unclamp');
    const max = parseFloat(wrap.style.getPropertyValue('--lines')) * 1.25 * 16 + 1;
    for (let k = 0; k < 5; k++) {
      const cut = [...wrap.querySelectorAll('.tile[data-w]')].filter(e => e.firstChild && e.firstChild.offsetHeight > max);
      if (!cut.length) break;
      cut.forEach(e => setW(e, +e.dataset.w * 1.2));
    }
    wrap.classList.remove(P + 'unclamp');
  }
  let ctx_el = (tag, text, cls) => { const e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; };

  function label(text, n, cls) { const l = ctx_el('div', text + ' ', P + 'lab ' + cls); l.append(ctx_el('span', '· ' + n)); return l; }

  // Eine Paar-Karte. rowsA/rowsB können bei Seiten im Fokus Ausschnitte sein.
  function card(p, rowsA, rowsB, ctx, one, lines, cap) {
    const c = ctx_el('div', null, P + 'card'); c.style.setProperty('--acc', DARK[p.color]); c.dataset.pair = p.k;
    const top = ctx_el('div', null, P + 'top'), q = ctx_el('p', p.question, P + 'q');
    q.style.fontSize = (one ? Q.one : Q.all) + 'em';
    if (one) { const back = ctx_el('button', '← Alle', P + 'back'); back.onclick = () => ctx.go(null); top.append(back, q); const pad = ctx_el('div'); pad.style.width = '90px'; pad.style.flex = 'none'; top.append(pad); }
    else { q.onclick = () => ctx.go(p.k); top.append(q); }
    const body = ctx_el('div', null, P + 'body'), mid = ctx_el('div', null, P + 'mid');
    mid.append(ctx_el('b', '↔'));
    const pole = (side, pl, rows) => { const d = ctx_el('div', null, P + 'pole ' + side), t = ctx_el('div', null, P + 'tiles'), inner = ctx_el('div', null, P + 'inner');
      d.append(label(pl.label, pl.rows.length, 'c-' + p.color)); rows.forEach(r => inner.append(tile(r, 'c-' + p.color, lines, cap))); t.append(inner); d.append(t); return d; };
    body.append(pole('a', p.a, rowsA), mid, pole('b', p.b, rowsB));
    c.append(top, body);
    return c;
  }
  function restBlock(rows, lines, cap, title) {
    const b = ctx_el('div', null, P + 'rest'), t = ctx_el('div', null, P + 'tiles'), inner = ctx_el('div', null, P + 'inner');
    b.append(label(title || 'Einzelstimmen', rows.length, 'c-none')); rows.forEach(r => inner.append(tile(r, 'c-none', lines, cap))); t.append(inner); b.append(t);
    return b;
  }

  // Größte Schrift in [lo, hi], bei der alles passt; null, wenn selbst lo nicht reicht.
  // Gemessen wird die natürliche Höhe (Zeilen 'auto'); danach dehnt sich das Raster wieder auf die ganze Fläche.
  function fit(wrap, lo, hi) {
    const box = wrap.parentNode, H = box.clientHeight, W = box.clientWidth;
    wrap.classList.add(P + 'measure');
    const fits = f => { wrap.style.fontSize = f + 'px'; return wrap.offsetHeight <= H + 1 && wrap.scrollWidth <= W + 1; };
    let r = lo;
    if (!fits(lo)) r = null;
    else if (fits(hi)) r = hi;
    else { for (let k = 0; k < 8; k++) { const mid = (lo + hi) / 2; if (fits(mid)) lo = mid; else hi = mid; } r = lo; }
    wrap.classList.remove(P + 'measure'); wrap.style.fontSize = (r || lo) + 'px';
    return r;
  }

  // Übersicht einer Seite bauen: Paare in cols Spalten, Einzelstimmen als schmale Leiste darunter
  function buildAll(box, ctx, list, rest, cols, lines) {
    const cap = 150, wrap = ctx_el('div', null, P + 'wrap');
    wrap.style.setProperty('--lines', lines);
    wrap.style.gridTemplateColumns = `repeat(${cols}, minmax(0,1fr))`;
    list.forEach((p, i) => { const c = card(p, p.a.rows, p.b.rows, ctx, false, lines, cap);
      if (cols > 1 && i === list.length - 1 && list.length % cols) c.style.gridColumn = '1 / -1';   // letztes Paar allein in der Zeile: volle Breite
      wrap.append(c); });
    if (rest.length) wrap.append(restBlock(rest, lines, cap, list.length ? '' : 'Noch ohne Paar'));
    box.textContent = ''; box.append(wrap); if (lines) widen(wrap);
    return wrap;
  }
  function overview(box, ctx, m) {
    const n = m.pairs.length;
    // Beste Anordnung je Seite: 1 oder 2 Spalten, Post-its 3- oder notfalls 2-zeilig. Seiten nur, wenn selbst die kleinste Schrift nicht reicht.
    const best = (list, rest, ls) => { let top = null;
      for (const lines of ls) for (const cols of list.length >= 3 ? [1, 2] : [1]) {
        const f = fit(buildAll(box, ctx, list, rest, cols, lines), FLOOR.all, HI.all);
        if (f !== null && (!top || f > top.f * (lines < top.lines ? 1.15 : 1.04))) top = { cols, lines, f }; }
      return top; };
    for (let pages = 1; pages <= Math.max(1, n); pages++) {
      const per = Math.ceil(n / pages), chunks = [];
      for (let i = 0; i < n; i += per) chunks.push(m.pairs.slice(i, i + per));
      let tops = chunks.map((list, pi) => best(list, pi === chunks.length - 1 ? m.rest : [], [3, 2]));
      // Zu viel Text für einen Bildschirm: lieber alle Fragen auf einen Blick, Post-its als Punkte (voller Text im Fokus), als blättern
      if (pages === 1 && !tops[0]) tops = [best(chunks[0], m.rest, [0])];
      if (tops.every(Boolean) || pages >= n) {
        const page = Math.min(ctx.page || 0, chunks.length - 1), b = tops[page] || { cols: 1, lines: 3, f: FLOOR.all };
        const wrap = buildAll(box, ctx, chunks[page], page === chunks.length - 1 ? m.rest : [], b.cols, b.lines);
        wrap.style.fontSize = b.f + 'px';
        return { count: n, pages: chunks.length, wrap };
      }
    }
  }
  function focusView(box, ctx, m, k) {
    const p = m.pairs[k], cap = 400;
    const build = (ra, rb, lines) => { const wrap = ctx_el('div', null, P + 'wrap ' + P + 'one'); wrap.style.setProperty('--lines', lines);
      wrap.style.gridTemplateColumns = '1fr';
      wrap.append(card(p, ra, rb, ctx, true, lines, cap)); box.textContent = ''; box.append(wrap); widen(wrap); return wrap; };
    const slice = (rows, pages, i) => { const per = Math.ceil(rows.length / pages); return rows.slice(i * per, (i + 1) * per); };
    for (let pages = 1; ; pages++) {
      // Post-its 4-zeilig; auf einer Seite auch 3-zeilig probieren, wenn das die Schrift deutlich größer macht
      let lines = 4, fs = [];
      for (let i = 0; i < pages; i++) fs.push(fit(build(slice(p.a.rows, pages, i), slice(p.b.rows, pages, i), 4), FLOOR.one, HI.one));
      if (pages === 1) { const f3 = fit(build(p.a.rows, p.b.rows, 3), FLOOR.one, HI.one); if (f3 !== null && (fs[0] === null || f3 > fs[0] * 1.08)) { lines = 3; fs = [f3]; } }
      if (fs.every(f => f !== null) || pages >= Math.max(p.a.rows.length, p.b.rows.length, 1)) {
        const page = Math.min(ctx.page || 0, pages - 1), wrap = build(slice(p.a.rows, pages, page), slice(p.b.rows, pages, page), lines);
        wrap.style.fontSize = Math.min(...fs.map(f => f || FLOOR.one)) + 'px';   // alle Seiten gleich groß
        return { count: m.pairs.length, pages, wrap };
      }
    }
  }

  function draw(box, ctx) {
    if (ctx.el) ctx_el = ctx.el;
    const m = model(ctx);
    if (!m.pairs.length) {   // keine Paare (KI-Antwort leer): die Post-its trotzdem zeigen statt einer leeren Wand
      box.textContent = ''; if (!m.rest.length) return { count: 0, pages: 1 };
      let f = null, lines = 3;
      for (lines of [3, 2]) { f = fit(buildAll(box, ctx, [], m.rest, 1, lines), FLOOR.all, HI.all); if (f !== null) break; }
      if (f === null) box.firstChild.style.fontSize = FLOOR.all + 'px';
      return { count: 0, pages: 1 };
    }
    const k = ctx.focus != null && ctx.focus < m.pairs.length ? ctx.focus : null;
    const r = k === null ? overview(box, ctx, m) : focusView(box, ctx, m, k);
    if (ctx.dir) r.wrap.animate([{ transform: `translateX(${ctx.dir * 90}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: 'ease-out' });
    return { count: r.count, pages: r.pages };
  }

  async function reveal(box, ctx) {
    const sleep = ctx.sleep || (ms => new Promise(r => setTimeout(r, ms)));
    const m = model(ctx), flipFn = ctx.flip || window.flip;
    draw(box, { ...ctx, focus: null, page: 0, dir: 0 });
    const wrap = box.firstChild; if (!wrap) return;
    const from = ctx.from || new Map(), bb = box.getBoundingClientRect(), byId = new Map(ctx.rows.map(r => [String(r.id), r]));
    // Geister: die Post-its stehen zunächst noch dort, wo sie im Mosaik hingen
    const layer = ctx_el('div', null, P + 'ghosts'), ghosts = new Map();
    from.forEach((r, id) => { const row = byId.get(id); if (!row || !r.width) return;
      const g = ctx_el('div', null, 'tile'); g.append(ctx_el('span', row.body));
      g.style.cssText = `left:${r.left - bb.left}px;top:${r.top - bb.top}px;width:${r.width}px;height:${r.height}px;font-size:${r.height / 4.45}px;margin:0`;
      layer.append(g); ghosts.set(id, g); });
    box.append(layer); wrap.style.zIndex = 1;   // Karten liegen ueber den wartenden Post-its
    const cards = [...wrap.querySelectorAll('.' + P + 'card')], restEl = wrap.querySelector('.' + P + 'rest');
    cards.forEach(c => { c.classList.add(P + 'hid'); c.querySelector('.' + P + 'q').classList.add(P + 'qhid'); });
    if (restEl) restEl.querySelector('.' + P + 'lab').style.opacity = 0;
    wrap.querySelectorAll('[data-id]').forEach(e => e.style.visibility = 'hidden');
    wrap.classList.add(P + 'nt'); void wrap.offsetWidth; wrap.classList.remove(P + 'nt');   // Ausgangslage sofort, ohne die fertigen Karten kurz aufblitzen zu lassen
    await sleep(500);
    layer.classList.add(P + 'wait');
    // Paar für Paar: Post-its färben sich, fliegen zu ihren Polen; erst stehen sich die Pole gegenüber, dann erscheint die Frage
    const land = (host, cls) => { const ids = [...host.querySelectorAll('[data-id]')].map(e => e.dataset.id), first = new Map();
      ids.forEach(id => { const g = ghosts.get(id); if (g) { g.className = 'tile ' + cls + ' ' + P + 'up'; first.set(id, g.getBoundingClientRect()); } });
      return { ids, first }; };
    const fly = (host, { ids, first }) => { ids.forEach(id => { const g = ghosts.get(id); if (g) g.remove(); ghosts.delete(id); });
      host.querySelectorAll('[data-id]').forEach(e => e.style.visibility = ''); flipFn(host, first); };
    const pending = [];
    for (const c of cards) {
      const p = m.pairs[+c.dataset.pair], got = land(c, 'c-' + p.color);
      await sleep(380);
      c.classList.remove(P + 'hid'); fly(c, got);
      pending.push((async () => { await sleep(1150);
        const mid = c.querySelector('.' + P + 'mid b'); mid.classList.add(P + 'pulse');
        c.querySelector('.' + P + 'q').classList.remove(P + 'qhid'); })());
      await sleep(800);
    }
    if (restEl) { const got = land(restEl, 'c-none'); await sleep(300); restEl.querySelector('.' + P + 'lab').style.opacity = ''; fly(restEl, got); }
    // Post-its von Paaren auf späteren Seiten verblassen
    ghosts.forEach(g => g.animate([{ opacity: 0 }], { duration: 600, fill: 'forwards' }));
    await Promise.all(pending);
    await sleep(1400);
    layer.remove(); wrap.style.zIndex = '';
  }

  VIZ.pairs = { draw, reveal };
})();
