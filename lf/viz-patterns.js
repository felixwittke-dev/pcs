// Baustein 'patterns' · Geschichten zu Mustern (Appreciative Interviews). Stand 12.11.2026.
// Paare erzaehlen sich Erfolgsgeschichten, am Handy landet je Geschichte eine Kurzfassung (row.body, 2 bis 5 Saetze).
// Die KI findet Erfolgsbedingungen, die sich durch mehrere Geschichten ziehen. Eine Geschichte darf mehrere Bedingungen belegen (n:m).
//
// Payload (Ergebnis der KI unter THEMES + Schritt):
// { viz: 'patterns',
//   patterns: [                                  // Reihenfolge = Reihenfolge auf der Wand (staerkste Bedingung zuerst), 2 bis 8
//     { label: 'Früh um Hilfe gebeten',          // Erfolgsbedingung, kurz (bis ca. 45 Zeichen)
//       color: 'blau',                           // optional: gelb | grün | blau | rosa | orange | lila | türkis | koralle; fehlt sie, wird reihum vergeben
//       ids: [1, 6, 14],                         // Geschichten (row.id), die die Bedingung belegen
//       quote: 'wörtlich aus einer Geschichte',  // optional, ohne Anfuehrungszeichen
//       quoteId: 14 } ] }                        // optional: Geschichte, aus der das Zitat stammt (wird im Fokus markiert)
// Geschichten ohne Bedingung bleiben grau sichtbar.
//
// Uebersicht: oben die Bedingungen als Karten (Nummer, Name, Zahl der Geschichten, Zitat), darunter alle Geschichten als Kacheln
// (gekuerzt). Jede Kachel traegt nummerierte Farbpunkte ihrer Bedingungen; Maus ueber einer Karte hebt ihre Geschichten hervor.
// Fokus k: Bedingung k gross mit Zitat, darunter ihre Geschichten im Volltext (bei Bedarf Seiten).
// Show-Effekt: Geschichten fliegen aus dem Mosaik an ihren Platz; dann leuchten je Bedingung ihre Geschichten auf,
// Linien wachsen von ihnen nach oben und dort erscheint die Karte.
(() => {
const N = 'vz-patterns-';
const INK = { gelb: '#C99700', grün: '#2F9A5C', blau: '#3B78CF', rosa: '#CC4A7C', orange: '#DD7A1F', lila: '#8159C4', türkis: '#24999A', koralle: '#D9573F' };
const PALETTE = ['blau', 'grün', 'orange', 'rosa', 'lila', 'türkis', 'koralle', 'gelb'];

const style = document.createElement('style');
style.textContent = `
.${N}all { position: absolute; inset: 0; display: flex; flex-direction: column; }
.${N}cards { flex: none; display: grid; position: relative; z-index: 1; }
.${N}card { position: relative; border-left: .34em solid; border-radius: .35em; padding: .5em .75em .55em; overflow: hidden; cursor: pointer;
            display: flex; flex-direction: column; gap: .25em; box-shadow: 0 1px 3px rgba(0,0,0,.13); transition: opacity .35s; }
.${N}ctitle { display: flex; gap: .45em; align-items: flex-start; font-weight: 800; line-height: 1.15; font-size: 1.15em; }
.${N}n { color: #5F5F5F; font-size: .78em; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
.${N}q { font-style: italic; line-height: 1.3; overflow-wrap: anywhere; }
.${N}clamp .${N}q { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; }
.${N}dot { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 1.6em; height: 1.6em; border-radius: 50%;
           color: #fff; font-weight: 800; font-size: .7em; line-height: 1; font-style: normal; transition: opacity .4s; }
.${N}ctitle .${N}dot { font-size: .72em; margin-top: .08em; }
.${N}stories { flex: 1; min-height: 0; display: flex; flex-wrap: wrap; justify-content: center; align-content: flex-start; position: relative; z-index: 1; }
.${N}tile { display: flex; gap: .4em; padding: .35em .5em; background: #FFFDF6; border: 1px solid #E8E2CF; border-radius: .3em;
            box-shadow: 0 1px 2px rgba(0,0,0,.1); overflow: hidden; transition: opacity .35s, box-shadow .35s; }
.${N}tile.${N}none { background: #F1F1EC; color: #5F5F5F; }
.${N}dots { flex: none; display: flex; flex-direction: column; gap: .2em; padding-top: .1em; }
.${N}dots .${N}dot { font-size: .62em; }
.${N}txt { align-self: flex-start; display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.25; overflow-wrap: anywhere; }
.${N}hl .${N}tile:not(.${N}on) { opacity: .25; }
.${N}hl .${N}card:not(.${N}on) { opacity: .45; }
.${N}tile.${N}on { box-shadow: 0 0 0 3px var(--ink), 0 4px 12px rgba(0,0,0,.18); }
.${N}lines { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; overflow: visible; }
.${N}one { position: absolute; inset: 0; display: flex; flex-direction: column; }
.${N}head { flex: none; display: flex; align-items: center; gap: 14px; margin: 0 0 10px; }
.${N}back { flex: none; border: 1px solid #C9C9C2; background: none; cursor: pointer; font: inherit; font-size: 15px; color: #5F5F5F; padding: 3px 12px; border-radius: 999px; }
.${N}pill { display: flex; align-items: center; gap: .45em; font-weight: 800; font-size: clamp(20px, 2vw, 34px); padding: 4px 22px 4px 10px; border-radius: 999px; min-width: 0; }
.${N}pill span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.${N}pill small { font-weight: 400; color: #5F5F5F; font-size: .7em; white-space: nowrap; }
.${N}bigq { flex: none; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; font-style: italic; font-weight: 600;
            font-size: clamp(19px, 1.9vw, 32px); line-height: 1.3; border-left: .22em solid; padding: 0 0 0 .7em; margin: 0 0 14px; }
.${N}area { flex: 1; min-height: 0; overflow: hidden; position: relative; }
.${N}cols { column-width: 21em; column-gap: 1.1em; column-fill: balance; overflow: hidden; }
.${N}story { break-inside: avoid; background: #FFFDF6; border: 1px solid #E8E2CF; border-radius: .3em; padding: .5em .75em; margin: 0 0 .65em;
             box-shadow: 0 1px 2px rgba(0,0,0,.08); line-height: 1.33; overflow-wrap: anywhere; }
.${N}story .${N}dots { display: inline-flex; flex-direction: row; gap: .2em; vertical-align: .08em; margin-right: .45em; padding: 0; }
.${N}story mark { color: inherit; padding: 0 .1em; border-radius: .15em; font-style: italic; }
`;
document.head.append(style);

function model(ctx) {
  const rows = ctx.rows || [], have = new Set(rows.map(r => String(r.id)));
  const pats = ((ctx.data && ctx.data.patterns) || []).map((p, k) => {
    const color = INK[p.color] ? p.color : PALETTE[k % PALETTE.length];
    return { k, label: p.label || '', color, ink: INK[color], quote: p.quote || '', quoteId: p.quoteId != null ? String(p.quoteId) : null,
             ids: [...new Set((p.ids || []).map(String))].filter(i => have.has(i)) };
  });
  const of = new Map(rows.map(r => [String(r.id), []]));
  pats.forEach(p => p.ids.forEach(i => of.get(i).push(p.k)));
  return { rows, pats, of, byId: new Map(rows.map(r => [String(r.id), r])) };
}
function dot(p) { const d = el('span', String(p.k + 1), N + 'dot'); d.style.background = p.ink; d.dataset.k = p.k; return d; }
const many = n => n + (n === 1 ? ' Geschichte' : ' Geschichten');

// Raster fuer die Geschichten-Kacheln: Spaltenzahl und Zeilen je Kachel so, dass die Schrift moeglichst gross wird;
// bei gleicher Schrift das Raster, in dem die laengste Geschichte am wenigsten leeren Platz laesst.
// Reicht es selbst mit 2 Zeilen nicht fuer 9 px, kommen weniger Geschichten auf eine Seite.
function gridFor(lens, W, H, g) {
  const n = Math.max(1, lens.length), longest = Math.max(20, ...lens);
  const best = (cnt, L) => { const cs = [];
    for (let c = 1; c <= cnt; c++) { const r = Math.ceil(cnt / c), w = (W - g * (c - 1)) / c, h = (H - g * (r - 1)) / r;
      const f = Math.min(h / (L * 1.25 + .75), w / 14.5, 26), need = Math.ceil(longest * .55 * f / Math.max(1, w - 2.4 * f));
      cs.push({ c, r, w, h, f, waste: Math.max(0, h - (need * 1.25 + .75) * f) }); }
    const top = Math.max(...cs.map(x => x.f));
    return cs.filter(x => x.f >= top - .5).sort((a, b) => a.waste - b.waste)[0]; };
  const done = (b, per) => { const f = Math.floor(b.f * 2) / 2, L = Math.max(2, Math.min(9, Math.floor((b.h / f - .75) / 1.25)));
    return { ...b, f, L, per }; };
  for (const [L, min] of [[4, 13], [3, 11], [2, 9]]) { const b = best(n, L); if (b && b.f >= min) return done(b, n); }
  for (let per = n - 1; per >= 1; per--) { const b = best(per, 2); if (b.f >= 9) return done(b, per); }
  return done(best(1, 2), 1);
}

function light(wrap, k) {
  wrap.classList.toggle(N + 'hl', k != null);
  wrap.querySelectorAll('.' + N + 'card').forEach((c, i) => c.classList.toggle(N + 'on', i === k));
  wrap.querySelectorAll('.' + N + 'tile').forEach(t => { const on = k != null && t._ks.includes(k); t.classList.toggle(N + 'on', on);
    if (on) t.style.setProperty('--ink', t._ink[k]); });
}

function overview(box, ctx, m) {
  box.textContent = '';
  const W = box.clientWidth, H = box.clientHeight, P = m.pats.length;
  const wrap = el('div', null, N + 'all'); box.append(wrap);
  const crow = P > 4 ? 2 : 1, cols = Math.max(1, Math.ceil(P / crow)), gap = Math.max(8, Math.round(Math.min(W, H * 1.6) * 0.009));
  const g = Math.max(6, Math.round(gap * .8)), lens = m.rows.map(r => (r.body || '').length);
  const cards = el('div', null, N + 'cards');
  cards.style.cssText = `grid-template-columns:repeat(${cols},1fr);grid-template-rows:repeat(${crow},1fr);gap:${gap}px;margin-bottom:${P ? gap * 2 : 0}px`;
  const cardEls = m.pats.map(p => { const c = el('div', null, N + 'card c-' + p.color); c.style.borderColor = p.ink;
    const t = el('div', null, N + 'ctitle'); t.append(dot(p), el('span', p.label)); c.append(t, el('div', many(p.ids.length), N + 'n'));
    if (p.quote) c.append(el('q', p.quote, N + 'q'));
    c.onclick = () => ctx.go(p.k); c.onmouseenter = () => light(wrap, p.k); c.onmouseleave = () => light(wrap, null);
    cards.append(c); return c; });
  if (P) wrap.append(cards);
  // Karten: groesste gemeinsame Schrift, bei der jede Karte ganz hineinpasst; wird es zu klein, Zitat auf 3 Zeilen kuerzen.
  const fitCards = (lo, hi) => { const ok = f => { cards.style.fontSize = f + 'px'; return cardEls.every(c => c.scrollHeight <= c.clientHeight + 1); };
    if (!ok(lo)) return null; if (ok(hi)) return hi;
    for (let i = 0; i < 7; i++) { const mid = (lo + hi) / 2; if (ok(mid)) lo = mid; else hi = mid; }
    return lo; };
  // Aufteilung der Hoehe: Karten sind die Einsichten und sollen deutlich groesser sein als die Geschichten (Faktor ~1,5),
  // aber nicht auf Kosten unlesbarer Geschichten. Probiert einige Aufteilungen und nimmt die ausgewogenste.
  let best = null;
  const fracs = !P ? [0] : crow === 1 ? [.24, .28, .32, .36, .40, .45, .50, .55] : [.34, .38, .42, .46, .50, .55, .60];
  for (const fr of fracs) {
    const cardsH = Math.round(H * fr); let cf = 0, clamp = false;
    if (P) { cards.classList.remove(N + 'clamp'); cards.style.height = cardsH + 'px'; cf = fitCards(13, 44);
      if (cf === null) { clamp = true; cards.classList.add(N + 'clamp'); cf = fitCards(9, 44) || 9; } }
    const lay = gridFor(lens, W, H - cardsH - (P ? gap * 2 : 0), g), score = P ? Math.min(cf / 1.5 - (clamp ? 3 : 0), lay.f) : lay.f;
    if (!best || score > best.score + .01) best = { fr, cardsH, cf, clamp, lay, score };
  }
  if (P) { cards.style.height = best.cardsH + 'px'; cards.classList.toggle(N + 'clamp', best.clamp); cards.style.fontSize = best.cf + 'px'; }
  // Brauchen die Karten bei dieser Schrift weniger Hoehe, bekommen die Geschichten den Rest.
  if (P) { cards.style.height = 'auto'; const need = cards.offsetHeight;
    if (need < best.cardsH - 8) best.lay = gridFor(lens, W, H - need - gap * 2, g); else cards.style.height = best.cardsH + 'px'; }
  // Geschichten
  const stories = el('div', null, N + 'stories'); wrap.append(stories);
  const lay = best.lay, pages = Math.ceil(m.rows.length / lay.per), page = Math.min(ctx.page || 0, pages - 1);
  stories.style.cssText = `gap:${g}px;font-size:${lay.f}px`;   // letzte Zeile mittig
  const tiles = new Map();
  m.rows.slice(page * lay.per, (page + 1) * lay.per).forEach(r => { const id = String(r.id), ks = m.of.get(id) || [];
    const t = el('div', null, N + 'tile' + (ks.length ? '' : ' ' + N + 'none')); t.dataset.id = id; t.title = r.body; t.style.width = Math.floor(lay.w) + 'px'; t.style.height = Math.floor(lay.h) + 'px';
    t._ks = ks; t._ink = Object.fromEntries(ks.map(k => [k, m.pats[k].ink]));
    const ds = el('div', null, N + 'dots'); ks.forEach(k => ds.append(dot(m.pats[k])));
    if (ks.length > lay.L) ds.style.cssText = 'display:grid;grid-template-columns:auto auto;align-content:start';
    const tx = el('span', r.body, N + 'txt'); tx.style.webkitLineClamp = lay.L;
    if (ks.length) t.append(ds); t.append(tx); t.onclick = () => ks.length && ctx.go(ks[0]);
    stories.append(t); tiles.set(id, t); });
  if (ctx.dir) stories.animate([{ transform: `translateX(${ctx.dir * 90}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: 'ease-out' });
  return { wrap, cardEls, tiles, pages };
}

function storyEl(r, p, m) {
  const id = String(r.id), s = el('div', null, N + 'story'), ds = el('span', null, N + 'dots');
  (m.of.get(id) || []).forEach(k => ds.append(dot(m.pats[k]))); s.append(ds);
  const i = p.quote && id === p.quoteId ? r.body.indexOf(p.quote) : -1;
  if (i < 0) s.append(document.createTextNode(r.body));
  else { const mk = el('mark', p.quote);
    mk.className = 'c-' + p.color;
    s.append(document.createTextNode(r.body.slice(0, i)), mk, document.createTextNode(r.body.slice(i + p.quote.length))); }
  return s;
}

function focusView(box, ctx, m, k) {
  const p = m.pats[k]; box.textContent = '';
  const wrap = el('div', null, N + 'one'), head = el('div', null, N + 'head'), back = el('button', '← Alle', N + 'back');
  back.onclick = () => ctx.go(null);
  const pill = el('div', null, N + 'pill c-' + p.color); pill.append(dot(p), el('span', p.label), el('small', '· ' + many(p.ids.length)));
  head.append(back, pill); wrap.append(head);
  if (p.quote) { const q = el('q', p.quote, N + 'bigq'); q.style.borderColor = p.ink; wrap.append(q); }
  const area = el('div', null, N + 'area'); wrap.append(area); box.append(wrap);
  const list = p.ids.map(i => m.byId.get(i)).filter(Boolean), H = area.clientHeight;
  const make = (rs, f) => { area.textContent = ''; const c = el('div', null, N + 'cols'); c.style.height = H + 'px'; c.style.fontSize = f + 'px';
    rs.forEach(r => c.append(storyEl(r, p, m))); area.append(c); return c; };
  const fits = (rs, f) => { const c = make(rs, f); return c.scrollWidth <= c.clientWidth + 1; };
  const LO = 15, HI = 30;
  let parts = [list];
  if (!fits(list, LO)) { parts = [[]];
    list.forEach(r => { const cur = parts[parts.length - 1]; if (cur.length && !fits(cur.concat(r), LO)) parts.push([r]); else cur.push(r); }); }
  const page = Math.min(ctx.page || 0, parts.length - 1), rs = parts[page];
  let lo = LO, hi = HI;
  if (fits(rs, hi)) lo = hi; else for (let i = 0; i < 8; i++) { const mid = (lo + hi) / 2; if (fits(rs, mid)) lo = mid; else hi = mid; }
  make(rs, Math.floor(lo * 2) / 2);
  if (ctx.dir) area.animate([{ transform: `translateX(${ctx.dir * 90}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: 'ease-out' });
  return parts.length;
}

// Linien von den Geschichten zur Karte (nur im Show-Effekt). Lage per offsetTop/-Left, damit laufende Flug-Transformationen nicht mitzaehlen.
function drawLines(wrap, card, tiles, ink) {
  const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg'), pos = e => [e.offsetLeft + e.offsetParent.offsetLeft, e.offsetTop + e.offsetParent.offsetTop];
  svg.setAttribute('class', N + 'lines');
  const [cx, cy] = pos(card), x2 = cx + card.offsetWidth / 2, y2 = cy + card.offsetHeight;
  tiles.forEach((t, i) => { const [tx, ty] = pos(t), x1 = tx + t.offsetWidth / 2, y1 = ty, ym = (y1 + y2) / 2;
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', `M${x1},${y1} C${x1},${ym} ${x2},${ym} ${x2},${y2}`); path.setAttribute('pathLength', '1');
    path.setAttribute('fill', 'none'); path.setAttribute('stroke', ink); path.setAttribute('stroke-width', '3'); path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-dasharray', '1'); path.setAttribute('opacity', '.75');
    path.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 520, delay: i * 25, easing: 'ease-out', fill: 'both' });
    svg.append(path); });
  wrap.prepend(svg); return svg;
}

VIZ['patterns'] = {
  draw(box, ctx) {
    const m = model(ctx);
    if (ctx.focus != null && m.pats[ctx.focus]) return { count: m.pats.length, pages: focusView(box, ctx, m, ctx.focus) };
    return { count: m.pats.length, pages: overview(box, ctx, m).pages };
  },
  async reveal(box, ctx) {
    const m = model(ctx), v = overview(box, ctx, m), P = m.pats.length;
    v.cardEls.forEach(c => c.style.visibility = 'hidden');
    v.tiles.forEach(t => t.querySelectorAll('.' + N + 'dot').forEach(d => d.style.opacity = 0));
    ctx.flip(box, ctx.from);
    await ctx.sleep(1700);
    const per = Math.max(650, Math.min(1300, 6500 / Math.max(1, P)));
    for (const p of m.pats) {
      const mine = [...v.tiles.values()].filter(t => t._ks.includes(p.k));
      light(v.wrap, p.k);
      mine.forEach(t => { t.querySelectorAll(`.${N}dot[data-k="${p.k}"]`).forEach(d => d.style.opacity = 1);
        t.animate([{ backgroundColor: '#FFFDF6' }, { backgroundColor: '#FFF1B8' }, { backgroundColor: '#FFFDF6' }], { duration: 700, easing: 'ease-out' }); });
      const svg = drawLines(v.wrap, v.cardEls[p.k], mine, p.ink);
      await ctx.sleep(per * .4);
      const c = v.cardEls[p.k]; c.style.visibility = '';
      c.animate([{ opacity: 0, transform: 'translateY(18px) scale(.92)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
      await ctx.sleep(per * .6);
      svg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }); setTimeout(() => svg.remove(), 320);
    }
    light(v.wrap, null);
    await ctx.sleep(600);
  },
};
})();
