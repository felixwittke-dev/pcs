// Darstellungs-Baustein 'ranking' (Rangliste) fuer 25/10 Crowd Sourcing. Stand 12.11.2026.
//
// Payload (von der KI bzw. aus der Auszaehlung):
//   { viz: 'ranking',
//     top: 10,                 // Zahl der Top-Plaetze (Standard 10). Gleichstand auf dem letzten Platz: alle Gleichplatzierten kommen mit hinein.
//     max: 25,                 // hoechste moegliche Punktzahl (Standard 25 = 5 Runden x 5 Punkte)
//     items: [{ id, votes: [5,4,3,5,4], score? }],   // score optional, sonst Summe der votes. id = Post-it-id aus rows.
//     themes?: [{ label, color, ids }] }             // optional: Kachelfarbe nach Thema (color = gelb|grün|blau|rosa|orange|lila|türkis|koralle)
// Post-its ohne Eintrag in items gelten als unbewertet und stehen am Ende der weiteren Ideen (Punktzahl „–“).
// Rangfolge: Punkte absteigend, Gleichstand = gleicher Rang (1, 2, 3, 3, 5 …).
//
// Ansicht: links die Top-Plaetze als Rangliste (Platz, Idee, Balken aus den 5 Einzelwertungen, Punkte), rechts alle uebrigen Ideen
// klein als Mosaik (absteigend nach Punkten), damit keine Idee verschwindet. Fokus k = Eintrag k der Rangliste ganz gross.
// count = Zahl der Eintraege in der Rangliste. Passt das Mosaik nicht, blaettert nur das Mosaik (pages).
(() => {
  const P = 'vz-ranking-', AMBER = '#FBBF24';
  const css = `
  .${P}wrap { position: absolute; inset: 0; display: flex; gap: 28px; }
  .${P}col { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
  .${P}right { flex: 1 1 0; }
  .${P}h { flex: none; display: flex; align-items: baseline; gap: .45em; margin: 0 0 8px; font-weight: 800; font-size: clamp(16px, 1.45vw, 26px); white-space: nowrap; overflow: hidden; }
  .${P}h span { font-weight: 400; color: #5F5F5F; font-size: .8em; overflow: hidden; text-overflow: ellipsis; }
  .${P}list { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: .3em; overflow: hidden; padding: 4px 4px 4px 3px; }
  .${P}row { flex: 1 0 auto; display: grid; grid-template-columns: 1.75em minmax(0, 1fr) auto 1.9em; align-items: center; gap: .65em;
             padding: .28em .7em .28em .4em; border-radius: .3em; box-shadow: 0 1px 2px rgba(0,0,0,.16); cursor: pointer; line-height: 1.22; }
  .${P}row:hover { box-shadow: 0 2px 8px rgba(0,0,0,.22); }
  .${P}rank { width: 1.65em; height: 1.65em; border-radius: 50%; display: grid; place-items: center; background: rgba(255,255,255,.85); font-weight: 800; font-variant-numeric: tabular-nums; }
  .${P}txt span { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; overflow-wrap: anywhere; }
  .${P}bar { --u: .56em; display: flex; height: 1.3em; width: calc(var(--max) * var(--u)); background: rgba(28,25,23,.08); border-radius: .25em; overflow: hidden; }
  .${P}bar i { flex: none; width: calc(var(--v) * var(--u)); background: #40BFC0; display: grid; place-items: center; font-style: normal;
               box-shadow: inset -2px 0 0 rgba(255,255,255,.9); transform-origin: 0 50%; }
  .${P}bar b { font-size: .7em; font-weight: 700; color: #1C1917; }
  .${P}score { font-weight: 800; font-size: 1.3em; text-align: right; font-variant-numeric: tabular-nums; }
  .${P}first { box-shadow: 0 0 0 3px ${AMBER}, 0 3px 10px rgba(0,0,0,.18); }
  .${P}first .${P}rank, .${P}first .${P}bar i { background: ${AMBER}; }
  .${P}plain { background: #FFF4C7; }
  .${P}tiles { flex: 1; min-height: 0; overflow: hidden; }
  .${P}inner { display: flex; flex-wrap: wrap; align-content: flex-start; gap: .28em; --lines: 3; }
  .${P}sc { float: right; margin: 0 0 0 .35em; padding: 0 .4em; border-radius: .7em; background: rgba(255,255,255,.75); font-weight: 800; font-variant-numeric: tabular-nums; }
  .${P}focus { position: absolute; inset: 6px; display: flex; flex-direction: column; gap: 2.2vh; padding: 2.2vh 2.4vw; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,.12); }
  .${P}focus.${P}first { box-shadow: 0 0 0 5px ${AMBER}, 0 4px 18px rgba(0,0,0,.18); }
  .${P}top { flex: none; display: flex; align-items: center; gap: 14px; flex-wrap: wrap; font-size: clamp(15px, 1.3vw, 22px); }
  .${P}top button { border: 1px solid #C9C9C2; background: rgba(255,255,255,.6); cursor: pointer; font: inherit; font-size: .8em; color: #5F5F5F; padding: 3px 12px; border-radius: 999px; }
  .${P}pill { font-weight: 800; padding: 2px 16px; border-radius: 999px; background: rgba(255,255,255,.8); }
  .${P}first .${P}pill.${P}place { background: ${AMBER}; }
  .${P}muted { color: #5F5F5F; }
  .${P}big { flex: 1; min-height: 0; display: flex; align-items: center; overflow: hidden; }
  .${P}big p { margin: 0; font-weight: 700; line-height: 1.22; overflow-wrap: anywhere; }
  .${P}foot { flex: none; display: flex; align-items: center; gap: 1.2em; font-size: clamp(16px, min(3vh, 1.8vw), 34px); }
  .${P}foot .${P}bar { --u: calc((100% / var(--max))); flex: 1; width: auto; height: 1.9em; border-radius: .3em; }
  .${P}foot .${P}bar i { width: calc(var(--v) / var(--max) * 100%); }
  .${P}foot .${P}bar b { font-size: .9em; }
  .${P}total { font-weight: 800; font-size: 2.2em; line-height: 1; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .${P}total small { font-size: .38em; font-weight: 400; color: #5F5F5F; margin-left: .3em; }
  .${P}note { flex: none; margin: -1vh 0 0; color: #5F5F5F; font-size: clamp(14px, 1.1vw, 19px); }
  `;
  document.head.append(Object.assign(document.createElement('style'), { textContent: css }));

  function model(ctx) {
    const d = ctx.data || {}, max = d.max || 25, top = d.top || 10;
    const byId = new Map((d.items || []).map(it => [String(it.id), it]));
    const theme = new Map(); (d.themes || []).forEach(t => (t.ids || []).forEach(id => theme.set(String(id), t)));
    const all = ctx.rows.map(r => { const id = String(r.id), it = byId.get(id), votes = (it && it.votes) || [];
      const score = it ? (it.score != null ? it.score : votes.reduce((a, b) => a + b, 0)) : null;
      return { id, body: r.body, votes, score, theme: theme.get(id) || null }; });
    const scored = all.filter(x => x.score != null).sort((a, b) => b.score - a.score || (+a.id - +b.id) || (a.id < b.id ? -1 : 1));
    scored.forEach((x, i) => { x.rank = i && x.score === scored[i - 1].score ? scored[i - 1].rank : i + 1; });
    const best = scored.filter(x => x.rank <= top);
    const rest = scored.filter(x => x.rank > top).concat(all.filter(x => x.score == null));
    return { max, top, all, best, rest, unscored: all.length - scored.length };
  }
  const colorCls = x => x.theme ? 'c-' + x.theme.color : P + 'plain';

  // groesste Schrift in [lo, hi], bei der ok() gilt; null, wenn nicht einmal lo reicht
  function fit(set, ok, lo, hi) {
    set(lo); if (!ok()) return null;
    set(hi); if (ok()) return hi;
    for (let k = 0; k < 8; k++) { const mid = (lo + hi) / 2; set(mid); if (ok()) lo = mid; else hi = mid; }
    set(lo); return lo;
  }

  function bar(x, max) {
    const b = document.createElement('div'); b.className = P + 'bar'; b.style.setProperty('--max', max);
    x.votes.forEach(v => { const i = document.createElement('i'); i.style.setProperty('--v', v); const n = document.createElement('b'); n.textContent = v; i.append(n); b.append(i); });
    return b;
  }
  function row(x, m, ctx, k) {
    const e = ctx.el('div', null, P + 'row ' + colorCls(x) + (x.rank === 1 ? ' ' + P + 'first' : ''));
    const t = ctx.el('div', null, P + 'txt'); t.append(ctx.el('span', x.body));
    e.append(ctx.el('div', String(x.rank), P + 'rank'), t, bar(x, m.max), ctx.el('div', String(x.score), P + 'score'));
    e.title = x.body; e.onclick = () => ctx.go(k);
    return e;
  }
  function tile(x, ctx, badge) {
    const e = ctx.el('div', null, 'tile ' + colorCls(x)); e.dataset.id = x.id; e.title = x.body;
    if (badge) e.append(ctx.el('b', x.score == null ? '–' : String(x.score), P + 'sc'));
    e.append(ctx.el('span', x.body));
    const w = Math.max(8, Math.min(x.body.length, 150)) / 3 * 0.5 + 1.7 + (badge ? 1.2 : 0);
    e.style.flex = `${Math.round(w * 10)} 1 ${w}em`; e.style.maxWidth = w * 2.4 + 'em';
    return e;
  }

  // Uebersicht. pre = Ausgangslage des Show-Effekts: Rangliste leer (Zeilen unsichtbar), alle Ideen im Mosaik, ohne Punkte.
  function overview(box, ctx, m, pre, frac) {
    box.textContent = '';
    const wrap = ctx.el('div', null, P + 'wrap'); box.append(wrap);
    const W = box.clientWidth, mos = pre ? m.all : m.rest;
    const left = ctx.el('div', null, P + 'col'); left.style.flex = `0 0 ${Math.round(frac * W - (frac < 1 ? 14 : 0))}px`;
    const h = ctx.el('div', m.best.length < m.all.length ? 'Top ' + m.top : 'Rangliste', P + 'h');
    h.append(ctx.el('span', m.best.length > m.top ? '· ' + m.best.length + ' Ideen, Gleichstand auf den letzten Plätzen'
                         : m.best.length < m.all.length ? '· von ' + m.all.length + ' Ideen, höchstens ' + m.max + ' Punkte'
                         : '· ' + m.all.length + ' Ideen, höchstens ' + m.max + ' Punkte'));
    const list = ctx.el('div', null, P + 'list');
    const rows = m.best.map((x, k) => { const r = row(x, m, ctx, k); if (pre) r.style.visibility = 'hidden'; else r.dataset.id = x.id; list.append(r); return r; });
    left.append(h, list); wrap.append(left);
    // Rangliste: groesste Schrift, bei der alles hineinpasst, moeglichst ohne gekuerzte Ideen
    const spans = [...list.querySelectorAll('span')], setL = f => { left.style.fontSize = f + 'px'; };
    const fitsL = () => list.scrollHeight <= list.clientHeight + 1, whole = () => fitsL() && spans.every(s => s.scrollHeight <= s.clientHeight + 1);
    const hiL = Math.min(44, Math.max(14, list.clientHeight / Math.max(m.best.length, 4) / 1.9));
    let fL = fit(setL, whole, 12, hiL); if (fL === null) fL = fit(setL, fitsL, 9, hiL) || 9; setL(fL);
    let pages = 1, fR = null;
    const tiles = new Map();
    if (mos.length && frac < 1) {
      const right = ctx.el('div', null, P + 'col ' + P + 'right'), rh = ctx.el('div', pre ? 'Alle Ideen' : 'Weitere Ideen', P + 'h');
      rh.append(ctx.el('span', '· ' + mos.length + (!pre && m.unscored ? ', davon ' + m.unscored + ' ohne Wertung' : '')));
      const area = ctx.el('div', null, P + 'tiles'), inner = ctx.el('div', null, P + 'inner');
      mos.forEach(x => { const t = tile(x, ctx, !pre); tiles.set(x.id, t); inner.append(t); });
      area.append(inner); right.append(rh, area); wrap.append(right);
      const setR = f => { right.style.fontSize = f + 'px'; }, fitsR = () => inner.offsetHeight <= area.clientHeight + 1;
      const hiR = Math.max(10, Math.min(22, fL * .8));
      fR = fit(setR, fitsR, 9, hiR);
      if (fR === null && pre) fR = fit(setR, fitsR, 4, 9) || 4;
      if (fR !== null) setR(fR);
      else {   // zu viele weitere Ideen: nur das Mosaik blaettert, die Rangliste bleibt stehen
        setR(9);
        const gap = parseFloat(getComputedStyle(inner).rowGap) || 0, rowH = inner.firstElementChild.offsetHeight + gap;
        const pageH = Math.max(1, Math.floor((area.clientHeight + gap) / rowH)) * rowH;
        pages = Math.ceil((inner.offsetHeight + gap) / pageH);
        const pg = Math.min(ctx.page, pages - 1);
        area.style.flex = 'none'; area.style.height = (pageH - gap) + 'px'; inner.style.transform = `translateY(${-pg * pageH}px)`;
        if (ctx.dir) area.animate([{ transform: `translateX(${ctx.dir * 60}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: 'ease-out' });
      }
    }
    return { rows, tiles, pages, fL, fR };
  }

  // Aufteilung Rangliste | Mosaik: die Breite, bei der beide am besten lesbar sind (Mosaik etwa 3/4 der Ranglisten-Schrift).
  // Fehlende Schrift-Untergrenze im Mosaik (= Blaettern) zaehlt schlechter als jede passende Aufteilung.
  function bestFrac(box, ctx, m) {
    if (!m.rest.length) return 1;
    let best = .62, score = -1;
    for (const f of [.66, .61, .56, .51, .46]) { const r = overview(box, ctx, m, false, f), v = r.fR === null ? -r.pages : Math.min(r.fL, r.fR / .72);   // blaettert das Mosaik ueberall: moeglichst wenige Seiten
      if (v > score + .3) { score = v; best = f; } }
    return best;
  }

  function focusView(box, ctx, m, k) {
    box.textContent = '';
    const x = m.best[k], card = ctx.el('div', null, P + 'focus ' + colorCls(x) + (x.rank === 1 ? ' ' + P + 'first' : ''));
    card.dataset.id = x.id;
    const top = ctx.el('div', null, P + 'top'), back = ctx.el('button', '← Alle'); back.onclick = () => ctx.go(null);
    const same = m.best.filter(y => y.rank === x.rank).length;
    top.append(back, ctx.el('span', 'Platz ' + x.rank + (same > 1 ? ' (geteilt)' : ''), P + 'pill ' + P + 'place'));
    if (x.theme) top.append(ctx.el('span', x.theme.label, P + 'pill'));
    top.append(ctx.el('span', (k + 1) + ' von ' + m.best.length, P + 'muted'));
    const big = ctx.el('div', null, P + 'big'), p = ctx.el('p', x.body); big.append(p);
    const foot = ctx.el('div', null, P + 'foot'), tot = ctx.el('div', String(x.score), P + 'total'); tot.append(ctx.el('small', 'von ' + m.max + ' Punkten'));
    foot.append(bar(x, m.max), tot);
    card.append(top, big, foot);
    const lo = Math.min(...x.votes), hi = Math.max(...x.votes);
    if (x.votes.length && hi - lo >= 3) card.append(ctx.el('p', 'Die Wertungen gehen auseinander: von ' + lo + ' bis ' + hi + ' Punkten.', P + 'note'));
    box.append(card);
    fit(f => { p.style.fontSize = f + 'px'; }, () => p.offsetHeight <= big.clientHeight + 1 && p.scrollWidth <= big.clientWidth + 1, 15, 84);
    return card;
  }

  // Die Wand zeichnet nur bei Fenster-Resize neu. Aendert sich die Flaeche anders (Kopfzeile bricht um, Browser passt das Fenster an),
  // zeichnet der Baustein selbst nach, damit die gemessenen Schriftgroessen stimmen.
  let last = null, revealing = false;
  const ro = new ResizeObserver(() => { if (!last || revealing) return; const { box, ctx, w, h } = last;
    if (Math.abs(box.clientWidth - w) > 2 || Math.abs(box.clientHeight - h) > 2) VIZ.ranking.draw(box, ctx); });

  VIZ.ranking = {
    draw(box, ctx) {
      if (!last || last.box !== box) ro.observe(box);
      last = { box, ctx: { ...ctx, dir: 0 }, w: box.clientWidth, h: box.clientHeight };
      const m = model(ctx);
      if (ctx.focus != null && m.best.length) {
        focusView(box, ctx, m, Math.min(ctx.focus, m.best.length - 1));
        return { count: m.best.length, pages: 1 };
      }
      return { count: m.best.length, pages: overview(box, ctx, m, false, bestFrac(box, ctx, m)).pages };
    },

    // Show-Effekt: alle Post-its fliegen ins Mosaik rechts, dann steigen die Top-Plaetze von unten nach oben einzeln auf,
    // Balken wachsen, Punkte zaehlen hoch; Platz 1 zuletzt mit Amber-Akzent. Am Ende ruecken alle an den Platz der Endansicht.
    async reveal(box, ctx) {
      revealing = true; try { await play(box, ctx); } finally { revealing = false; }
    },
  };

  async function play(box, ctx) {
      const m = model(ctx), frac = bestFrac(box, ctx, m), { rows, tiles } = overview(box, ctx, m, true, frac < 1 ? frac : .62);
      ctx.flip(box, ctx.from);
      await ctx.sleep(1700);
      const n = m.best.length;
      for (let k = n - 1; k >= 0; k--) {
        const x = m.best[k], r = rows[k], t = tiles.get(x.id), first = x.rank === 1;
        if (first) await ctx.sleep(900);   // kurze Pause vor Platz 1
        const a = t ? t.getBoundingClientRect() : null;
        if (t) { t.style.visibility = 'hidden'; delete t.dataset.id; }
        r.style.visibility = 'visible'; r.dataset.id = x.id;
        const b = r.getBoundingClientRect(), dur = first ? 1100 : 750;
        if (a && a.width) r.animate([{ transform: `translate(${a.left - b.left}px,${a.top - b.top}px) scale(${a.width / b.width},${a.height / b.height})`, transformOrigin: '0 0', opacity: .6 },
                                     { transform: 'none', transformOrigin: '0 0', opacity: 1 }], { duration: dur, easing: 'cubic-bezier(.2,.8,.2,1)' });
        r.querySelectorAll('.' + P + 'bar i').forEach((i, j) => i.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
          { duration: 260, delay: dur * .6 + j * 110, easing: 'ease-out', fill: 'backwards' }));
        const sc = r.querySelector('.' + P + 'score'), steps = 12;
        sc.textContent = '0';
        for (let s = 1; s <= steps; s++) setTimeout(() => { sc.textContent = String(Math.round(x.score * s / steps)); }, dur * .6 + s * 48);
        if (first) r.animate([{ boxShadow: `0 0 0 3px ${AMBER}, 0 0 0 0 rgba(251,191,36,.7)` }, { boxShadow: `0 0 0 3px ${AMBER}, 0 0 0 26px rgba(251,191,36,0)` }],
          { duration: 900, delay: dur + 500, iterations: 2 });
        await ctx.sleep(first ? 2600 : k <= 2 ? 750 : 380);
      }
      const before = new Map([...box.querySelectorAll('[data-id]')].filter(e => e.style.visibility !== 'hidden').map(e => [e.dataset.id, e.getBoundingClientRect()]));
      overview(box, ctx, m, false, frac);
      ctx.flip(box, before);
      await ctx.sleep(1400);
  }
})();
