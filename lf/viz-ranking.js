// Darstellungs-Baustein 'ranking' (Rangliste) fuer 25/10 Crowd Sourcing. Stand 12.11.2026.
//
// Payload (von der KI bzw. aus der Auszaehlung):
//   { viz: 'ranking',
//     top: 10,                 // Zahl der Top-Plaetze (Standard 10). Gleichstand auf dem letzten Platz: alle Gleichplatzierten kommen mit hinein.
//     max: 25,                 // hoechste moegliche Punktzahl (Standard 25 = 5 Runden x 5 Punkte)
//     items: [{ id, votes: [5,4,3,5,4], score? }],   // score optional, sonst Summe der votes. id = Post-it-id aus rows.
//     themes?: [{ label, color, ids }] }             // optional: Kachelfarbe nach Thema (color = gelb|grün|blau|rosa|orange|lila|türkis|koralle)
// Post-its ohne Eintrag in items gelten als unbewertet und stehen am Ende der weiteren Ideen (Punktzahl „–“). Ist noch gar nichts bewertet: nur „Alle Ideen“.
// Einzelwertungen ausserhalb 1..5 werden auf 0..5 begrenzt; score ohne votes ergibt einen durchgehenden Balken.
// Rangfolge: Punkte absteigend, Gleichstand = gleicher Rang (1, 2, 3, 3, 5 …).
//
// Modus 'upvotes' (Celebrity Interview, Fragen mit Zustimmung):
//   { viz: 'ranking', mode: 'upvotes', top: 8,      // Zahl der Top-Fragen (Standard 8, Gleichstand auf dem letzten Platz kommt mit hinein; nur Fragen mit Stimmen)
//     items: [{ id, votes: 23, asked?: true }],      // votes = Zahl der Stimmen; Post-its ohne Eintrag haben 0 Stimmen; asked = schon gestellt
//     themes?: [{ label, color, ids }] }             // optional: schmaler Farbstreifen links an der Zeile, sonst neutral
//   Links „Meistgewuenscht“: Platz, Frage im Volltext, Balken relativ zur meistgewaehlten Frage, Zahl; gestellte Fragen mit ✓ und gedaempft.
//   Rechts „Weitere Fragen“: ruhige Liste gleicher Zeilenhoehe (2 Zeilen), nach Stimmen; blaettert bei vielen Fragen (Schrift >= 14 px).
//   Fokus k = Frage k gross. Show-Effekt wie bei 25/10, aber ohne Sieger-Akzent.
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
  .${P}row { flex: 1 0 auto; display: grid; grid-template-columns: 1.75em minmax(0, 1fr) auto minmax(1.9em, max-content); align-items: center; gap: .65em;
             padding: .28em .7em .28em .4em; border-radius: .3em; box-shadow: 0 1px 2px rgba(0,0,0,.16); cursor: pointer; line-height: 1.22; }
  .${P}row:hover { box-shadow: 0 2px 8px rgba(0,0,0,.22); }
  .${P}rank { width: 1.65em; height: 1.65em; border-radius: 50%; display: grid; place-items: center; background: rgba(255,255,255,.85); font-weight: 800; font-variant-numeric: tabular-nums; }
  .${P}txt span { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: var(--clamp, 3); overflow: hidden; overflow-wrap: anywhere; }
  .${P}bar { --u: .56em; display: flex; height: 1.3em; width: calc(var(--max) * var(--u)); background: rgba(28,25,23,.08); border-radius: .25em; overflow: hidden; }
  .${P}bar i { flex: none; width: calc(var(--v) * var(--u)); background: #40BFC0; display: grid; place-items: center; font-style: normal;
               box-shadow: inset -2px 0 0 rgba(255,255,255,.9); transform-origin: 0 50%; }
  .${P}bar b { font-size: .7em; font-weight: 700; color: #1C1917; }
  .${P}score { font-weight: 800; font-size: 1.3em; text-align: right; font-variant-numeric: tabular-nums; }
  .${P}first { box-shadow: 0 0 0 3px ${AMBER}, 0 3px 10px rgba(0,0,0,.18); }
  .${P}first .${P}rank, .${P}first .${P}bar i { background: ${AMBER}; }
  .${P}plain { background: #FFF4C7; }
  .${P}dense { gap: .12em; } .${P}dense .${P}row { padding-top: .04em; padding-bottom: .04em; } .${P}dense .${P}rank { width: 1.25em; height: 1.25em; } .${P}dense .${P}bar { height: 1em; }
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

  const COLORS = ['gelb', 'grün', 'blau', 'rosa', 'orange', 'lila', 'türkis', 'koralle'];
  const num = v => (v === null || v === '' || !Number.isFinite(+v)) ? null : +v;
  const arr = a => Array.isArray(a) ? a : [];
  function model(ctx) {
    const d = ctx.data || {}, max = num(d.max) > 0 ? +d.max : 25, top = num(d.top) >= 1 ? Math.round(d.top) : 10;
    const byId = new Map(arr(d.items).filter(it => it && it.id != null).map(it => [String(it.id), it]));
    const theme = new Map(); arr(d.themes).forEach(t => t && arr(t.ids).forEach(id => theme.set(String(id), t)));
    // Wertungen 1..5 je Runde; Werte ausserhalb werden auf 0..5 begrenzt, Unlesbares faellt weg
    const all = ctx.rows.map(r => { const id = String(r.id), it = byId.get(id), votes = it ? arr(it.votes).map(num).filter(v => v !== null).map(v => Math.max(0, Math.min(5, v))) : [];
      const score = it ? (num(it.score) !== null ? +it.score : votes.reduce((a, b) => a + b, 0)) : null;
      return { id, body: r.body, votes, score, theme: theme.get(id) || null }; });
    const scored = all.filter(x => x.score != null).sort((a, b) => b.score - a.score || (+a.id - +b.id) || (a.id < b.id ? -1 : 1));
    scored.forEach((x, i) => { x.rank = i && x.score === scored[i - 1].score ? scored[i - 1].rank : i + 1; });
    const best = scored.filter(x => x.rank <= top);
    const rest = scored.filter(x => x.rank > top).concat(all.filter(x => x.score == null));
    const ones = scored.filter(x => x.rank === 1).length, win = ones > 0 && ones < scored.length;   // Sieger-Akzent fuer Platz 1, aber nicht, wenn alle gleichauf sind
    return { max, top, all, best, rest, win, unscored: all.length - scored.length };
  }
  const colorCls = x => x.theme && COLORS.includes(x.theme.color) ? 'c-' + x.theme.color : P + 'plain';
  const isFirst = (x, m) => x.rank === 1 && m.win;

  // groesste Schrift in [lo, hi], bei der ok() gilt; null, wenn nicht einmal lo reicht
  function fit(set, ok, lo, hi) {
    set(lo); if (!ok()) return null;
    set(hi); if (ok()) return hi;
    for (let k = 0; k < 8; k++) { const mid = (lo + hi) / 2; set(mid); if (ok()) lo = mid; else hi = mid; }
    set(lo); return lo;
  }

  function bar(x, max) {
    const b = document.createElement('div'); b.className = P + 'bar'; b.style.setProperty('--max', max);
    if (!x.votes.length && x.score > 0) { const i = document.createElement('i'); i.style.setProperty('--v', Math.min(x.score, max)); b.append(i); }
    x.votes.forEach(v => { if (!v) return; const i = document.createElement('i'); i.style.setProperty('--v', v); const n = document.createElement('b'); n.textContent = v; i.append(n); b.append(i); });
    return b;
  }
  function row(x, m, ctx, k) {
    const e = ctx.el('div', null, P + 'row ' + colorCls(x) + (isFirst(x, m) ? ' ' + P + 'first' : ''));
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
    const W = box.clientWidth, mos = pre ? m.all : m.rest, none = !m.best.length;   // none: noch keine Wertung, keine leere Rangliste zeigen
    const left = ctx.el('div', null, P + 'col'); left.style.flex = `0 0 ${Math.round(frac * W - (frac < 1 ? 14 : 0))}px`; if (none) left.style.display = 'none';
    const h = ctx.el('div', m.best.length < m.all.length ? 'Top ' + m.top : 'Rangliste', P + 'h');
    const same = m.best.length > 1 && m.best.every(x => x.rank === 1);
    h.append(ctx.el('span', same ? '· ' + m.best.length + ' Ideen gleichauf mit je ' + m.best[0].score + ' Punkten'
                         : m.best.length > m.top ? '· ' + m.best.length + ' Ideen, Gleichstand auf den letzten Plätzen'
                         : m.best.length < m.all.length ? '· von ' + m.all.length + ' Ideen, höchstens ' + m.max + ' Punkte'
                         : '· ' + m.all.length + ' Ideen, höchstens ' + m.max + ' Punkte'));
    const list = ctx.el('div', null, P + 'list');
    const rows = m.best.map((x, k) => { const r = row(x, m, ctx, k); if (pre) r.style.visibility = 'hidden'; else r.dataset.id = x.id; list.append(r); return r; });
    left.append(h, list); wrap.append(left);
    // Rangliste: groesste Schrift, bei der alles hineinpasst, moeglichst ohne gekuerzte Ideen
    const spans = [...list.querySelectorAll('span')], setL = f => { left.style.fontSize = f + 'px'; };
    // Text der Idee mind. 10em breit, sonst druecken Balken und Punkte ihn bei schmaler Spalte (Hochformat) auf null
    const txt0 = list.querySelector('.' + P + 'txt'), wide = () => !txt0 || txt0.clientWidth >= 10 * parseFloat(left.style.fontSize);
    const fitsL = () => list.scrollHeight <= list.clientHeight + 1 && wide(), whole = () => fitsL() && spans.every(s => s.scrollHeight <= s.clientHeight + 1);
    const hiL = Math.min(44, Math.max(14, list.clientHeight / Math.max(m.best.length, 4) / 1.9));
    let fL = fit(setL, whole, 12, hiL); if (fL === null) fL = fit(setL, fitsL, 9, hiL);
    for (const c of [2, 1]) { if (fL !== null) break; list.style.setProperty('--clamp', c); fL = fit(setL, fitsL, 9, hiL); }
    if (fL === null) { list.classList.add(P + 'dense'); fL = fit(setL, fitsL, 9, hiL); }   // sehr viele Plaetze (Gleichstand): Zeilen enger
    if (fL === null) fL = 9; setL(fL);
    let pages = 1, fR = null;
    const tiles = new Map();
    if (mos.length && frac < 1) {
      const right = ctx.el('div', null, P + 'col ' + P + 'right'), rh = ctx.el('div', pre || none ? 'Alle Ideen' : 'Weitere Ideen', P + 'h');
      rh.append(ctx.el('span', '· ' + mos.length + (none ? ', noch ohne Wertung' : !pre && m.unscored ? ', davon ' + m.unscored + ' ohne Wertung' : '')));
      const area = ctx.el('div', null, P + 'tiles'), inner = ctx.el('div', null, P + 'inner');
      mos.forEach(x => { const t = tile(x, ctx, !pre && !none); tiles.set(x.id, t); inner.append(t); });
      area.append(inner); right.append(rh, area); wrap.append(right);
      const setR = f => { right.style.fontSize = f + 'px'; }, fitsR = () => inner.offsetHeight <= area.clientHeight + 1;
      const hiR = none ? 22 : Math.max(10, Math.min(22, fL * .8));
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
    const x = m.best[k], card = ctx.el('div', null, P + 'focus ' + colorCls(x) + (isFirst(x, m) ? ' ' + P + 'first' : ''));
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

  // ---------- Modus 'upvotes' (Celebrity Interview): Fragen mit Stimmen, keine Sieger-Inszenierung ----------
  const U = P + 'u-';
  const INK = { gelb: '#E0B000', grün: '#3FA66B', blau: '#4A86D6', rosa: '#D45C8A', orange: '#E68A2E', lila: '#8D69CC', türkis: '#2FA9AA', koralle: '#E06A52' };
  document.head.append(Object.assign(document.createElement('style'), { textContent: `
  .${U}wrap { position: absolute; inset: 0; display: flex; gap: 28px; }
  .${U}list { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: .32em; overflow: hidden; padding: 3px; }
  .${U}row { flex: 1 0 auto; display: grid; grid-template-columns: 1.7em minmax(0, 1fr) 5.5em minmax(1.7em, max-content); align-items: center; gap: .7em; cursor: pointer;
             padding: .3em .8em .3em .5em; border-radius: .3em; background: #fff; box-shadow: 0 0 0 1px #E6E3D9, 0 1px 2px rgba(0,0,0,.06);
             border-left: .3em solid var(--uink, #D6D3C8); line-height: 1.25; }
  .${U}row:hover { box-shadow: 0 0 0 1px #CFCBBE, 0 2px 8px rgba(0,0,0,.12); }
  .${U}rank { width: 1.6em; height: 1.6em; border-radius: 50%; display: grid; place-items: center; background: #EAF9F9; color: #409E9F; font-weight: 800; font-variant-numeric: tabular-nums; }
  .${U}txt { overflow-wrap: anywhere; }
  .${U}clamp .${U}txt { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
  .${U}dense { gap: .12em; } .${U}dense .${U}row { padding-top: .04em; padding-bottom: .04em; } .${U}dense .${U}rank { width: 1.25em; height: 1.25em; } .${U}dense .${U}txt { -webkit-line-clamp: 1; }
  .${U}vbar { height: .55em; background: #EEECE5; border-radius: 1em; overflow: hidden; }
  .${U}vbar i { display: block; height: 100%; width: calc(var(--f) * 100%); background: #40BFC0; border-radius: 1em; transform-origin: 0 50%; }
  .${U}n { font-weight: 800; text-align: right; font-variant-numeric: tabular-nums; }
  .${U}asked .${U}txt, .${U}asked .${U}n, .${U}asked .${U}vbar { opacity: .45; }
  .${U}asked .${U}rank { background: #409E9F; color: #fff; }
  .${U}tag { display: inline-block; margin-right: .5em; padding: 0 .55em; border-radius: 1em; background: #EAF9F9; color: #409E9F; font-size: .72em; font-weight: 700; vertical-align: .1em; opacity: 1; }
  .${U}side { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; }
  .${U}area { flex: 1; min-height: 0; overflow: hidden; }
  .${U}rest { display: flex; flex-direction: column; gap: 3px; }
  .${U}line { display: flex; align-items: center; gap: .8em; height: calc(2 * 1.25em + .6em); padding: 0 .8em 0 .6em; background: #fff; border-radius: .25em;
              box-shadow: 0 0 0 1px #ECE9E0; border-left: .3em solid var(--uink, #DDDAD0); line-height: 1.25; }
  .${U}line span { flex: 1; min-width: 0; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; overflow-wrap: anywhere; }
  .${U}line.${U}one { height: calc(1.25em + .5em); } .${U}line.${U}one span { -webkit-line-clamp: 1; }
  .${U}line b { flex: none; min-width: 1.6em; text-align: right; font-variant-numeric: tabular-nums; color: #5F5F5F; }
  .${U}card { position: absolute; inset: 6px; display: flex; flex-direction: column; gap: 2.2vh; padding: 2.2vh 2.4vw; border-radius: 10px; background: #fff;
              box-shadow: 0 0 0 1px #E6E3D9, 0 2px 10px rgba(0,0,0,.08); border-left: 12px solid var(--uink, #D6D3C8); }
  .${U}card .${U}vbar { flex: 1; height: .8em; }
  .${U}card.${U}asked p { opacity: .55; }
  ` }));

  function modelU(ctx) {
    const d = ctx.data || {}, top = num(d.top) >= 1 ? Math.round(d.top) : 8;
    const byId = new Map(arr(d.items).filter(it => it && it.id != null).map(it => [String(it.id), it]));
    const theme = new Map(); arr(d.themes).forEach(t => t && arr(t.ids).forEach(id => { if (!theme.has(String(id))) theme.set(String(id), t); }));
    const all = ctx.rows.map((r, i) => { const id = String(r.id), it = byId.get(id) || {}, v = Array.isArray(it.votes) ? it.votes.length : Math.max(0, Math.round(num(it.votes) || 0));
      const t = theme.get(id); return { id, i, body: r.body, votes: v, asked: !!it.asked, ink: t ? (INK[t.color] || null) : null, theme: t ? t.label : null }; });
    const sorted = all.slice().sort((a, b) => b.votes - a.votes || a.i - b.i);
    sorted.forEach((x, i) => { x.rank = i && x.votes === sorted[i - 1].votes ? sorted[i - 1].rank : i + 1; });
    const best = sorted.filter(x => x.rank <= top && x.votes > 0);   // Gleichstand auf dem letzten Platz: alle Gleichplatzierten mit hinein
    const rest = sorted.slice(best.length);
    return { top, all, best, rest, max: Math.max(1, ...all.map(x => x.votes)) };
  }
  const ink = (e, x) => { if (x.ink) e.style.setProperty('--uink', x.ink); return e; };
  function rowU(x, m, ctx, k) {
    const e = ink(ctx.el('div', null, U + 'row' + (x.asked ? ' ' + U + 'asked' : '')), x), t = ctx.el('div', null, U + 'txt');
    if (x.asked) t.append(ctx.el('span', '✓ gestellt', U + 'tag'));
    t.append(document.createTextNode(x.body));
    const bar = ctx.el('div', null, U + 'vbar'), i = ctx.el('i'); i.style.setProperty('--f', x.votes / m.max); bar.append(i);
    e.append(ctx.el('div', String(x.rank), U + 'rank'), t, bar, ctx.el('div', String(x.votes), U + 'n'));
    e.title = x.body; e.onclick = () => ctx.go(k);
    return e;
  }
  function lineU(x, ctx, pre, count) {
    const e = ink(ctx.el('div', null, U + 'line' + (pre ? ' ' + U + 'one' : '')), x); e.dataset.id = x.id; e.title = x.body;
    e.append(ctx.el('span', x.body)); if (count) e.append(ctx.el('b', String(x.votes)));
    return e;
  }

  // pre = Ausgangslage des Show-Effekts: Top-Zeilen unsichtbar, rechts alle Fragen einzeilig in Eingangsreihenfolge
  function overviewU(box, ctx, m, pre, frac) {
    box.textContent = '';
    const wrap = ctx.el('div', null, U + 'wrap'); box.append(wrap);
    const side = pre ? m.all : m.rest, none = !m.best.length, two = side.length && (frac < 1 || none), W = box.clientWidth;   // none: noch keine Stimmen
    const left = ctx.el('div', null, P + 'col'); left.style.flex = `0 0 ${Math.round(two ? frac * W - 14 : W)}px`; if (none) left.style.display = 'none';
    const h = ctx.el('div', 'Meistgewünscht', P + 'h');
    h.append(ctx.el('span', '· ' + (m.best.length === m.all.length ? 'alle ' + m.all.length + ' Fragen nach Stimmen'
      : 'die ' + m.best.length + ' Fragen mit den meisten Stimmen' + (m.best.length > m.top ? ' (Gleichstand)' : ''))));
    const list = ctx.el('div', null, U + 'list');
    const rows = m.best.map((x, k) => { const r = rowU(x, m, ctx, k); if (pre) r.style.visibility = 'hidden'; else r.dataset.id = x.id; list.append(r); return r; });
    left.append(h, list); wrap.append(left);
    const txt0 = list.querySelector('.' + U + 'txt'), wide = () => !txt0 || txt0.clientWidth >= 10 * parseFloat(left.style.fontSize);   // Frage mind. 10em breit
    const setL = f => { left.style.fontSize = f + 'px'; }, fitsL = () => list.scrollHeight <= list.clientHeight + 1 && wide();
    const hiL = Math.min(40, Math.max(16, list.clientHeight / Math.max(m.best.length, 4) / 1.6));
    let fL = fit(setL, fitsL, 12, hiL);
    if (fL === null) { list.classList.add(U + 'clamp'); fL = fit(setL, fitsL, 9, hiL); }   // kleine Flaeche: Fragen auf 2 Zeilen kuerzen statt Zeilen unten abzuschneiden
    if (fL === null) { list.classList.add(U + 'dense'); fL = fit(setL, fitsL, 9, hiL); }   // sehr viele Fragen gleichauf: einzeilig und enger
    if (fL === null) fL = 9; setL(fL);
    let pages = 1, fR = null; const lines = new Map();
    if (two) {
      const right = ctx.el('div', null, U + 'side'), rh = ctx.el('div', pre || none ? 'Alle Fragen' : 'Weitere Fragen', P + 'h');
      rh.append(ctx.el('span', '· ' + side.length + (none ? ', noch ohne Stimmen' : pre ? '' : ', nach Stimmen')));
      const area = ctx.el('div', null, U + 'area'), inner = ctx.el('div', null, U + 'rest'), cols = pre || none ? 2 : 1;
      side.forEach(x => { const l = lineU(x, ctx, pre, !pre && !none); lines.set(x.id, l); inner.append(l); });
      if (cols > 1) inner.style.cssText = 'display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3px 8px';   // Durchgangsliste zweispaltig, damit sie lesbar bleibt
      area.append(inner); right.append(rh, area); wrap.append(right);
      const setR = f => { right.style.fontSize = f + 'px'; }, fitsR = () => inner.offsetHeight <= area.clientHeight + 1;
      const hiR = none ? 22 : Math.max(14, Math.min(22, fL * .85));
      fR = fit(setR, fitsR, pre ? 6 : 14, hiR);
      if (fR === null && !pre) {   // passt zweizeilig nicht: einzeilig (gleiche Hoehe, Volltext im Tooltip und im Fokus)
        inner.querySelectorAll('.' + U + 'line').forEach(l => l.classList.add(U + 'one')); fR = fit(setR, fitsR, 14, hiR); }
      if (fR === null && pre) setR(6);
      else if (fR === null) {   // viele Fragen: die Liste blaettert in ganzen Zeilen, Schrift bleibt lesbar
        setR(14);
        const gap = 3, rowH = inner.firstElementChild.getBoundingClientRect().height + gap, per = Math.max(1, Math.floor((area.clientHeight + gap) / rowH));
        pages = Math.ceil(side.length / (per * cols)); const pg = Math.min(ctx.page, pages - 1);
        area.style.flex = 'none'; area.style.height = (per * rowH - gap) + 'px'; inner.style.transform = `translateY(${-pg * per * rowH}px)`;
        if (ctx.dir) area.animate([{ transform: `translateX(${ctx.dir * 60}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: 'ease-out' });
      }
    }
    return { rows, lines, pages, fL, fR };
  }
  function fracU(box, ctx, m) {
    if (!m.rest.length) return 1;
    let best = .62, score = -1e9;
    for (const f of [.66, .62, .58, .54]) { const r = overviewU(box, ctx, m, false, f), v = r.fR === null ? -r.pages : Math.min(r.fL, r.fR / .85);
      if (v > score + .3) { score = v; best = f; } }
    return best;
  }
  function focusU(box, ctx, m, k) {
    box.textContent = '';
    const x = m.best[k], card = ink(ctx.el('div', null, U + 'card' + (x.asked ? ' ' + U + 'asked' : '')), x); card.dataset.id = x.id;
    const top = ctx.el('div', null, P + 'top'), back = ctx.el('button', '← Alle'); back.onclick = () => ctx.go(null);
    const same = m.best.filter(y => y.rank === x.rank).length;
    top.append(back, ctx.el('span', 'Platz ' + x.rank + (same > 1 ? ' (geteilt)' : ''), P + 'pill'));
    if (x.asked) top.append(ctx.el('span', '✓ gestellt', U + 'tag'));
    if (x.theme) top.append(ctx.el('span', x.theme, P + 'muted'));
    top.append(ctx.el('span', (k + 1) + ' von ' + m.best.length, P + 'muted'));
    top.querySelectorAll('.' + P + 'pill').forEach(p => p.style.background = '#EAF9F9');
    const big = ctx.el('div', null, P + 'big'), p = ctx.el('p', x.body); big.append(p);
    const foot = ctx.el('div', null, P + 'foot'), bar = ctx.el('div', null, U + 'vbar'), i = ctx.el('i'); i.style.setProperty('--f', x.votes / m.max); bar.append(i);
    const tot = ctx.el('div', String(x.votes), P + 'total'); tot.append(ctx.el('small', x.votes === 1 ? 'Stimme' : 'Stimmen'));
    foot.append(bar, tot); card.append(top, big, foot); box.append(card);
    fit(f => { p.style.fontSize = f + 'px'; }, () => p.offsetHeight <= big.clientHeight + 1 && p.scrollWidth <= big.clientWidth + 1, 15, 96);
  }
  function drawU(box, ctx) {
    const m = modelU(ctx);
    if (ctx.focus != null && m.best.length) { focusU(box, ctx, m, Math.min(ctx.focus, m.best.length - 1)); return { count: m.best.length, pages: 1 }; }
    return { count: m.best.length, pages: overviewU(box, ctx, m, false, fracU(box, ctx, m)).pages };
  }
  // Show-Effekt: Fragen fliegen aus dem Mosaik in die Liste rechts, dann laufen die meistgewuenschten von unten nach oben
  // in die Rangliste, Balken wachsen, Stimmen zaehlen hoch. Kein Sieger-Moment: nur eine Reihenfolge.
  async function playU(box, ctx) {
    const m = modelU(ctx), frac = fracU(box, ctx, m), { rows, lines } = overviewU(box, ctx, m, true, frac < 1 ? frac : .62);
    ctx.flip(box, ctx.from);
    await ctx.sleep(1700);
    const step = Math.min(420, 4200 / Math.max(1, m.best.length));
    for (let k = m.best.length - 1; k >= 0; k--) {
      const x = m.best[k], r = rows[k], t = lines.get(x.id), a = t ? t.getBoundingClientRect() : null;
      if (t) { t.style.visibility = 'hidden'; delete t.dataset.id; }
      r.style.visibility = 'visible'; r.dataset.id = x.id;
      const b = r.getBoundingClientRect(), dur = 750;
      if (a && a.width) r.animate([{ transform: `translate(${a.left - b.left}px,${a.top - b.top}px) scale(${a.width / b.width},${a.height / b.height})`, transformOrigin: '0 0', opacity: .6 },
                                   { transform: 'none', transformOrigin: '0 0', opacity: 1 }], { duration: dur, easing: 'cubic-bezier(.2,.8,.2,1)' });
      r.querySelector('.' + U + 'vbar i').animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 500, delay: dur * .6, easing: 'ease-out', fill: 'backwards' });
      const n = r.querySelector('.' + U + 'n'), steps = 12; n.textContent = '0';
      for (let s = 1; s <= steps; s++) setTimeout(() => { n.textContent = String(Math.round(x.votes * s / steps)); }, dur * .6 + s * 45);
      await ctx.sleep(k <= 2 ? 650 : step);
    }
    await ctx.sleep(700);
    const before = new Map([...box.querySelectorAll('[data-id]')].filter(e => e.style.visibility !== 'hidden').map(e => [e.dataset.id, e.getBoundingClientRect()]));
    overviewU(box, ctx, m, false, frac);
    ctx.flip(box, before);
    await ctx.sleep(1400);
  }

  // Die Wand zeichnet nur bei Fenster-Resize neu. Aendert sich die Flaeche anders (Kopfzeile bricht um, Browser passt das Fenster an),
  // zeichnet der Baustein selbst nach, damit die gemessenen Schriftgroessen stimmen.
  let last = null, revealing = false;
  // Aendert sich dabei die Seitenzahl, erfaehrt die Wand das ueber ctx.go (gleicher Fokus: zeichnet neu und zaehlt die Seiten).
  const ro = new ResizeObserver(() => { if (!last || revealing) return; const { box, ctx, w, h, pages } = last;
    if (!box.clientWidth || (Math.abs(box.clientWidth - w) <= 2 && Math.abs(box.clientHeight - h) <= 2)) return;
    const cur = box.firstElementChild; if (!cur || !String(cur.className).startsWith(P)) return;   // anderer Baustein in #custom: nicht hineinzeichnen
    const r = VIZ.ranking.draw(box, ctx); if (r.pages !== pages) ctx.go(ctx.focus); });

  function drawAny(box, ctx) {
      if (!last || last.box !== box) ro.observe(box);
      last = { box, ctx: { ...ctx, dir: 0 }, w: box.clientWidth, h: box.clientHeight };
      if ((ctx.data || {}).mode === 'upvotes') return drawU(box, ctx);
      const m = model(ctx);
      if (ctx.focus != null && m.best.length) {
        focusView(box, ctx, m, Math.min(ctx.focus, m.best.length - 1));
        return { count: m.best.length, pages: 1 };
      }
      return { count: m.best.length, pages: overview(box, ctx, m, false, bestFrac(box, ctx, m)).pages };
  }

  VIZ.ranking = {
    draw(box, ctx) { const r = drawAny(box, ctx); last.pages = r.pages; return r; },

    // Show-Effekt: alle Post-its fliegen ins Mosaik rechts, dann steigen die Top-Plaetze von unten nach oben einzeln auf,
    // Balken wachsen, Punkte zaehlen hoch; Platz 1 zuletzt mit Amber-Akzent. Am Ende ruecken alle an den Platz der Endansicht.
    async reveal(box, ctx) {
      revealing = true; try { await ((ctx.data || {}).mode === 'upvotes' ? playU : play)(box, ctx); } finally { revealing = false; }
    },
  };

  async function play(box, ctx) {
      const m = model(ctx), frac = bestFrac(box, ctx, m), { rows, tiles } = overview(box, ctx, m, true, frac < 1 ? frac : .62);
      ctx.flip(box, ctx.from);
      await ctx.sleep(1700);
      const n = m.best.length, step = Math.min(380, 4200 / n);   // viele Plaetze (Gleichstand, top 30): schneller nacheinander
      for (let k = n - 1; k >= 0; k--) {
        const x = m.best[k], r = rows[k], t = tiles.get(x.id), first = isFirst(x, m), ones = m.best.filter(y => isFirst(y, m)).length;
        if (first && k === ones - 1) await ctx.sleep(900);   // kurze Pause vor Platz 1 (bei geteiltem Platz 1 nur einmal)
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
        await ctx.sleep(first && k === 0 ? 2600 : k <= 2 ? 750 : step);
      }
      const before = new Map([...box.querySelectorAll('[data-id]')].filter(e => e.style.visibility !== 'hidden').map(e => [e.dataset.id, e.getBoundingClientRect()]));
      overview(box, ctx, m, false, frac);
      ctx.flip(box, before);
      await ctx.sleep(1400);
  }
})();
