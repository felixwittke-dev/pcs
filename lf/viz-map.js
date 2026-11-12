// Baustein 'map' · Karte mit zwei Achsen fuer die LibraFlow-Wand. Stand 12.11.2026.
// Fuer Strukturen, die Beitraege auf einer Flaeche mit zwei Achsen verorten:
//   Agreement & Certainty Matrix (Herausforderungen mit Position, Zonen als Baender vom einigen/sicheren Eck aus)
//   Critical Uncertainties (zwei Unsicherheiten spannen ein 2×2 auf, jedes Feld ein Szenario mit seinen Strategien)
//
// Payload (von der KI):
// { viz: 'map',
//   layout: 'bands' | 'grid',        // optional. bands = Zonen als Viertelringe um das Eck (lo, lo) (Agreement & Certainty);
//                                    // grid = 2×2. Standard: bands, wenn items Positionen tragen, sonst grid.
//   x: { label: 'Wie sicher wissen wir, was wirkt?', lo: 'sicher', hi: 'unklar' },   // waagrecht, lo links
//   y: { label: 'Wie einig sind wir uns?', lo: 'einig', hi: 'uneinig' },             // senkrecht, lo unten
//   zones: [                         // genau die Zonen der Struktur, hoechstens 4. Reihenfolge:
//                                    //   bands: vom Eck (lo, lo) nach aussen, z. B. Simple, Complicated, Complex, Chaotic
//                                    //   grid:  oben links, oben rechts, unten links, unten rechts (wie man liest)
//     { label: 'Complicated',        // Name (Struktur-Zonen im englischen Original; Szenarien: Name der Gruppe)
//       hint: 'Kompliziert',         // optional: Untertitel (deutsch bzw. Kombination der Pole)
//       color: 'blau',               // optional: gelb grün blau rosa orange lila türkis koralle
//       summary: 'Ein Satz der KI.', // optional
//       ids: [5, 6, 7] } ],          // Beitraege (row.id) dieser Zone; jeder Beitrag hoechstens in einer Zone
//   items: [{ id: 5, x: .55, y: .2,  // optional: Position 0..1 (x: lo→hi, y: lo→hi, also 0 = unten). Mit Positionen liegen die
//             short: 'S/4 bis 2027' }],   //   Beitraege als Punkt + Kurztext auf der Karte; short (≤ 30 Zeichen) ist der Kurztext, sonst der Anfang von body.
//   bands: [.38, .75, 1.1],          // optional (nur bands): Grenzradien zwischen den Zonen, Abstand √(x²+y²) vom Eck (lo, lo)
//   marks: { "12": "robust", "17": "hedge" } }   // optional: robust = traegt in mehreren Szenarien, hedge = Absicherung nur fuer eines
// Beitraege ohne Zone zeigt der Baustein nicht. count = Zahl der Zonen; Fokus k = Zone k gross im Volltext, daneben die Karte klein.
// Uebersicht mit Positionen: Karte links (Baender bzw. Quadranten, Punkte mit Kurztext, kollisionsfrei gesetzt, bei Abstand mit Fuehrungslinie),
// rechts je Zone eine Karte (Name, Untertitel, Zahl, KI-Satz). Ohne Positionen: 2×2, jedes Feld traegt Name, KI-Satz und seine Kacheln.
// Show-Effekt: Achsen erscheinen, das Mosaik verblasst, Zone fuer Zone faerben sich die Kacheln und fliegen an ihren Ort, dann Namen und KI-Saetze.
(() => {
const N = 'vz-map-';
const INK = { gelb: '#B98D00', grün: '#2F9A5C', blau: '#3B78CF', rosa: '#CC4A7C', orange: '#D07A22', lila: '#7A5CC2', türkis: '#24999A', koralle: '#D9573F' };
const PASTEL = { gelb: '#FFF1B8', grün: '#D3EFDD', blau: '#D6E6FB', rosa: '#FAD9E6', orange: '#FFDDBB', lila: '#E6DBF7', türkis: '#CDEEEE', koralle: '#FFD5CC' };
const DEF = { bands: ['grün', 'blau', 'lila', 'koralle'], grid: ['blau', 'grün', 'orange', 'lila'] };
const MARK = { robust: { text: 'robust', cls: 'robust' }, hedge: { text: 'Absicherung', cls: 'hedge' } };

const css = `
.${N}all { position: absolute; inset: 0; display: flex; gap: 22px; }
.${N}plot { flex: 1; min-width: 0; display: grid; grid-template-columns: auto 1fr; grid-template-rows: 1fr auto; }
.${N}yax { grid-row: 1; grid-column: 1; writing-mode: vertical-rl; transform: rotate(180deg); display: flex; justify-content: space-between; align-items: center;
           gap: 12px; padding: 4px 0; margin-right: 8px; white-space: nowrap; font-size: clamp(14px, .95vw, 19px); }
.${N}xax { grid-row: 2; grid-column: 2; display: flex; justify-content: space-between; align-items: baseline; gap: 12px; padding: 0 4px; margin-top: 7px;
           white-space: nowrap; font-size: clamp(14px, .95vw, 19px); }
.${N}ax b { font-weight: 800; color: #1C1917; overflow: hidden; text-overflow: ellipsis; }
.${N}pole { color: #5F5F5F; }
.${N}pole::before, .${N}pole::after { color: #409E9F; font-weight: 800; }
.${N}xax .${N}pole:first-child::before { content: '◂ '; } .${N}xax .${N}pole:last-child::after { content: ' ▸'; }
.${N}yax .${N}pole:first-child::before { content: '◂ '; } .${N}yax .${N}pole:last-child::after { content: ' ▸'; }
.${N}field { grid-row: 1; grid-column: 2; position: relative; min-height: 0; border-left: 2px solid #8A8A80; border-bottom: 2px solid #8A8A80; }
.${N}bg, .${N}leads { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.${N}bg { overflow: hidden; }
.${N}leads { pointer-events: none; }
.${N}dot { position: absolute; width: 12px; height: 12px; margin: -6px 0 0 -6px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 0 1px rgba(0,0,0,.25);
           cursor: pointer; transition: opacity .3s; }
.${N}lab { position: absolute; left: 0; top: 0; padding: .14em .42em .16em; border-radius: .25em; background: rgba(255,255,255,.93); border-left: 3px solid;
           box-shadow: 0 1px 2px rgba(0,0,0,.14); line-height: 1.2; overflow-wrap: anywhere; cursor: pointer; white-space: normal; width: max-content;
           display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; transition: opacity .3s; text-wrap: balance; }
.${N}hl .${N}dot:not(.${N}on), .${N}hl .${N}lab:not(.${N}on) { opacity: .18; }
.${N}hl .${N}leads line:not(.${N}on) { opacity: .1; }
.${N}cards { flex: none; display: flex; flex-direction: column; gap: 10px; }
.${N}card { flex: 1 1 0; min-height: 0; overflow: hidden; background: #fff; border-left: .3em solid; border-radius: 8px; padding: .45em .75em .5em;
            box-shadow: 0 1px 3px rgba(0,0,0,.1); cursor: pointer; display: flex; flex-direction: column; gap: .25em; transition: opacity .3s; }
.${N}hlc .${N}card:not(.${N}on) { opacity: .45; }
.${N}name { display: flex; align-items: baseline; gap: .4em; font-weight: 800; font-size: 1.25em; line-height: 1.12; }
.${N}name small { font-weight: 400; font-size: .68em; color: #5F5F5F; white-space: nowrap; }
.${N}name .${N}cnt { margin-left: auto; font-weight: 700; font-size: .7em; color: #5F5F5F; white-space: nowrap; }
.${N}sum { line-height: 1.3; color: #1C1917; }
.${N}sum b, .${N}ksum b { color: #409E9F; font-weight: 800; margin-right: .35em; font-size: .85em; letter-spacing: .03em; }
.${N}clamp .${N}sum { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; }
/* 2×2 mit Kacheln */
.${N}grid { grid-row: 1; grid-column: 2; min-height: 0; display: grid; gap: 10px; border-left: 2px solid #8A8A80; border-bottom: 2px solid #8A8A80; padding: 0 0 10px 10px; }
.${N}cell { position: relative; min-width: 0; min-height: 0; display: flex; flex-direction: column; background: #fff; border-radius: 10px; border-top: 6px solid;
            box-shadow: 0 1px 3px rgba(0,0,0,.09); padding: 8px 12px 9px; }
.${N}chead { flex: none; cursor: pointer; font-size: clamp(17px, 1.45vw, 28px); }
.${N}chead .${N}name { font-size: 1em; }
.${N}chint { flex: none; color: #5F5F5F; font-size: clamp(13px, .82vw, 16px); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px; }
.${N}csum { flex: none; margin: 6px 0 0; padding: 4px 10px 5px; border-radius: 6px; background: #EAF9F9; border-left: 3px solid #40BFC0; line-height: 1.28;
            font-size: clamp(13px, .86vw, 17px); }
.${N}csum b { color: #409E9F; font-weight: 800; margin-right: .35em; }
.${N}body { flex: 1; min-height: 0; overflow: hidden; margin-top: 8px; scrollbar-width: thin; }
.${N}tiles { display: flex; flex-wrap: wrap; align-content: flex-start; gap: .28em; --lines: 2; }
.${N}morebtn { border: 1px dashed #8A8A80; background: #fff; color: #5F5F5F; font: inherit; font-weight: 700; padding: .35em .8em; border-radius: .25em; cursor: pointer; white-space: nowrap; }
.${N}tight .${N}chint { display: none; }
.${N}tight .${N}csum { margin-top: 4px; padding: 3px 8px 4px; }
.${N}mk { display: inline-block; font-style: normal; font-weight: 800; font-size: .74em; line-height: 1.25; padding: 0 .45em; border-radius: 999px; margin-right: .35em;
          vertical-align: .08em; letter-spacing: .02em; }
.${N}mk.robust { background: #409E9F; color: #fff; }
.${N}mk.hedge { background: #FBBF24; color: #1C1917; }
.tile.${N}robust { box-shadow: 0 0 0 2px #40BFC0, 0 1px 2px rgba(0,0,0,.16); }
/* Fokus */
.${N}one { position: absolute; inset: 0; display: flex; gap: 26px; }
.${N}side { flex: none; display: flex; flex-direction: column; gap: 8px; }
.${N}mini { position: relative; flex: none; }
.${N}mini .${N}field { border-width: 0 0 2px 2px; }
.${N}mpole { font-size: 13px; color: #5F5F5F; white-space: nowrap; }
.${N}mgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; border-left: 2px solid #8A8A80; border-bottom: 2px solid #8A8A80; padding: 0 0 5px 5px; }
.${N}mcell { border-radius: 6px; padding: 6px 8px; font-size: 14px; font-weight: 700; line-height: 1.15; cursor: pointer; background: #F1F1EC; color: #8A8A80; overflow: hidden; }
.${N}mcell.${N}on { color: #1C1917; }
.${N}mcell small { display: block; font-weight: 400; font-size: 12px; margin-top: 2px; }
.${N}main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.${N}head { flex: none; display: flex; align-items: center; gap: 14px; margin: 0 0 10px; min-width: 0; }
.${N}back { flex: none; border: 1px solid #C9C9C2; background: none; cursor: pointer; font: inherit; font-size: 15px; color: #5F5F5F; padding: 3px 12px; border-radius: 999px; }
.${N}pill { display: flex; align-items: baseline; gap: .45em; font-weight: 800; font-size: clamp(20px, 2vw, 34px); padding: 4px 22px 5px 18px; border-radius: 999px; min-width: 0; }
.${N}pill span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.${N}pill small { font-weight: 400; color: #5F5F5F; font-size: .66em; white-space: nowrap; }
.${N}ksum { flex: none; margin: 0 0 14px; padding: 7px 14px 8px; border-radius: 6px; background: #EAF9F9; border-left: 4px solid #40BFC0; line-height: 1.3;
            font-size: clamp(16px, 1.35vw, 25px); }
.${N}area { flex: 1; min-height: 0; overflow: hidden; position: relative; }
.${N}cols { column-width: 17em; column-gap: 1em; column-fill: balance; overflow: hidden; }
.${N}item { break-inside: avoid; background: #FFFDF6; border: 1px solid #E8E2CF; border-left: 4px solid; border-radius: .3em; padding: .45em .7em; margin: 0 0 .6em;
            box-shadow: 0 1px 2px rgba(0,0,0,.07); line-height: 1.32; overflow-wrap: anywhere; }
.${N}item b { display: block; margin-bottom: .1em; }
.${N}ghost { position: absolute; inset: 0; z-index: 3; pointer-events: none; transition: opacity .6s; }
.${N}ghost .tile { position: absolute; }
`;
document.head.append(Object.assign(document.createElement('style'), { textContent: css }));

const clamp01 = v => Math.max(0, Math.min(1, +v));
function model(ctx) {
  const d = ctx.data || {}, rows = ctx.rows || [], byId = new Map(rows.map(r => [String(r.id), r]));
  const pos = new Map((d.items || []).filter(i => i && isFinite(i.x) && isFinite(i.y)).map(i => [String(i.id), { x: clamp01(i.x), y: clamp01(i.y), short: i.short }]));
  const shorts = new Map((d.items || []).filter(i => i && i.short).map(i => [String(i.id), i.short]));
  const layout = d.layout === 'grid' || d.layout === 'bands' ? d.layout : pos.size ? 'bands' : 'grid';
  const seen = new Set(), zoneOf = new Map();
  const zones = (d.zones || []).slice(0, 4).map((z, k) => {
    const color = INK[z.color] ? z.color : DEF[layout][k % 4];
    const ids = (z.ids || []).map(String).filter(i => byId.has(i) && !seen.has(i) && seen.add(i));
    ids.forEach(i => zoneOf.set(i, k));
    return { k, label: z.label || '', hint: z.hint || '', summary: z.summary || '', color, ink: INK[color], pastel: PASTEL[color], ids, rows: ids.map(i => byId.get(i)) };
  });
  const marks = new Map();
  Object.entries(d.marks || {}).forEach(([id, v]) => { const t = String(v).toLowerCase();
    const m = t === 'robust' ? 'robust' : (t === 'hedge' || t.startsWith('absicher')) ? 'hedge' : null; if (m) marks.set(String(id), m); });
  // KI-Markierungen zuerst (robust, dann Absicherung), sonst Reihenfolge der KI
  const rank = i => ({ robust: 0, hedge: 1 })[marks.get(i)] ?? 2;
  zones.forEach(z => { z.ids.sort((a, b) => rank(a) - rank(b)); z.rows = z.ids.map(i => byId.get(i)); });
  const bands = (Array.isArray(d.bands) && d.bands.length >= zones.length - 1 ? d.bands : [.38, .75, 1.1]).map(Number);
  const points = layout === 'bands' || pos.size > 0;
  // Beitraege ohne Position bekommen einen Platz mitten in ihrer Zone (gleichmaessig verteilt)
  if (points) zones.forEach(z => { const miss = z.ids.filter(i => !pos.has(i));
    miss.forEach((i, j) => { const t = (j + 1) / (miss.length + 1);
      if (layout === 'bands') { const r0 = z.k ? bands[z.k - 1] : 0, r1 = z.k < bands.length ? bands[z.k] : 1.38, r = (r0 + r1) / 2, a = t * Math.PI / 2;
        pos.set(i, { x: clamp01(r * Math.cos(a)), y: clamp01(r * Math.sin(a)) }); }
      else { const cx = z.k % 2 ? .75 : .25, cy = z.k < 2 ? .75 : .25; pos.set(i, { x: cx - .18 + .36 * t, y: cy + .12 * Math.sin(t * 9) }); } }); });
  // gleiche Positionen leicht auseinanderziehen, damit kein Punkt einen anderen verdeckt
  const taken = new Map();
  [...zoneOf.keys()].forEach(i => { const p = pos.get(i); if (!p) return; const key = Math.round(p.x * 60) + ',' + Math.round(p.y * 60), n = taken.get(key) || 0;
    if (n) { p.x = clamp01(p.x + .014 * Math.cos(n * 2.4) * Math.ceil(n / 6)); p.y = clamp01(p.y + .014 * Math.sin(n * 2.4) * Math.ceil(n / 6)); } taken.set(key, n + 1); });
  const noun = (ctx.s && ctx.s.lsDef && ctx.s.lsDef.noun) || 'Beiträge';
  return { d, rows, byId, pos, shorts, layout, points, zones, zoneOf, marks, bands, noun, x: d.x || {}, y: d.y || {} };
}
const shortOf = (m, id) => { const s = m.shorts.get(id); if (s) return s; const b = (m.byId.get(id).body || '').trim(); return b.length > 48 ? b.slice(0, 46).replace(/\s+\S*$/, '') + ' …' : b; };
const many = (m, n) => n + ' ' + (n === 1 ? 'Beitrag' : m.noun);
function markEl(m, id) { const k = m.marks.get(id); if (!k) return null; return el('i', MARK[k].text, N + 'mk ' + MARK[k].cls); }

// ---------- Achsen
function axes(m, small) {
  const ax = (o, cls) => { const a = el('div', null, N + 'ax ' + cls); a.append(el('span', o.lo || '', N + 'pole'), el('b', o.label || ''), el('span', o.hi || '', N + 'pole')); return a; };
  const xa = ax(m.x, N + 'xax'), ya = ax(m.y, N + 'yax');
  if (small) [xa, ya].forEach(a => { a.style.fontSize = '13px'; a.querySelector('b').remove(); });
  return { xa, ya };
}

// ---------- Hintergrund der Karte (Baender oder Quadranten) als SVG in Pixeln des Feldes
const SVG = 'http://www.w3.org/2000/svg';
function svgEl(tag, at) { const e = document.createElementNS(SVG, tag); Object.entries(at).forEach(([k, v]) => e.setAttribute(k, v)); return e; }
function background(m, W, H, k, onPick) {
  const svg = svgEl('svg', { class: N + 'bg', viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none' }), dim = k != null;
  const paint = (z, e) => { e.setAttribute('fill', dim && z.k !== k ? '#F1F1EC' : z.pastel); if (dim && z.k === k) { e.setAttribute('stroke', z.ink); e.setAttribute('stroke-width', '2'); }
    if (onPick) { e.style.cursor = 'pointer'; e.addEventListener('click', () => onPick(z.k)); } svg.append(e); };
  if (m.layout === 'bands') {
    const zs = m.zones;
    // aussen zuerst: die aeusserste Zone fuellt das Feld, jede innere liegt als Viertel-Ellipse um das Eck unten links darueber
    zs.slice().reverse().forEach(z => {
      if (z.k === zs.length - 1) return paint(z, svgEl('rect', { x: 0, y: 0, width: W, height: H }));
      const r = m.bands[z.k], rx = r * W, ry = r * H;
      paint(z, svgEl('path', { d: `M0,${H} L${rx},${H} A${rx},${ry} 0 0 0 0,${H - ry} Z` }));
    });
    if (dim) { const z = zs[k]; if (z) {   // gewaehlte Zone obenauf nachzeichnen, damit ihr Rand ganz sichtbar ist
      const r1 = k < zs.length - 1 ? m.bands[k] : 3, r0 = k ? m.bands[k - 1] : 0, P = r => `${r * W},${H} A${r * W},${r * H} 0 0 0 0,${H - r * H}`;
      const p = svgEl('path', { d: r0 ? `M${r0 * W},${H} L${r1 * W},${H} A${r1 * W},${r1 * H} 0 0 0 0,${H - r1 * H} L0,${H - r0 * H} A${r0 * W},${r0 * H} 0 0 1 ${r0 * W},${H} Z` : `M0,${H} L${P(r1)} Z`,
        fill: z.pastel, stroke: z.ink, 'stroke-width': 2 });
      if (k === zs.length - 1) { p.setAttribute('d', `M0,0 L${W},0 L${W},${H} L${r0 * W},${H} A${r0 * W},${r0 * H} 0 0 0 0,${H - r0 * H} Z`); }
      svg.append(p); } }
  } else m.zones.forEach(z => { const c = z.k % 2, r = z.k < 2 ? 0 : 1;
    paint(z, svgEl('rect', { x: c * W / 2 + 2, y: r * H / 2 + 2, width: W / 2 - 4, height: H / 2 - 4, rx: 8 })); });
  return svg;
}

// ---------- Punkte mit Kurztext, kollisionsfrei gesetzt
const PAD = 14;
function place(m, field, W, H, k, small) {
  const ids = [...m.zoneOf.keys()], at = id => { const p = m.pos.get(id); return [PAD + p.x * (W - 2 * PAD), PAD + (1 - p.y) * (H - 2 * PAD)]; };
  const dots = new Map(), labs = new Map();
  ids.forEach(id => { const z = m.zones[m.zoneOf.get(id)], [x, y] = at(id), d = el('div', null, N + 'dot');
    d.style.cssText = `left:${x}px;top:${y}px;background:${z.ink}`; d.dataset.mid = id; d._z = z.k;
    if (small) { d.style.width = d.style.height = '9px'; d.style.margin = '-4.5px 0 0 -4.5px'; d.style.borderWidth = '1.5px';
      if (k != null && z.k !== k) d.style.background = '#C9C9C2'; }
    field.append(d); dots.set(id, d); });
  if (small) return { dots, labs, lines: new Map(), font: 0 };
  const leads = svgEl('svg', { class: N + 'leads' }); field.append(leads);
  ids.forEach(id => { const z = m.zones[m.zoneOf.get(id)], l = el('div', shortOf(m, id), N + 'lab'); l.style.borderColor = z.ink; l.title = m.byId.get(id).body;
    l.dataset.mid = id; l._z = z.k; field.append(l); labs.set(id, l); });
  const dotR = ids.map(id => { const [x, y] = at(id); return [x - 7, y - 7, x + 7, y + 7]; });
  const hit = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
  // dichte Stellen zuerst setzen, dann haben sie die naechsten Plaetze
  const crowd = id => { const [x, y] = at(id); return ids.reduce((s, j) => { const [a, b] = at(j); return s + (Math.hypot(a - x, b - y) < 120 ? 1 : 0); }, 0); };
  const order = ids.slice().sort((a, b) => crowd(b) - crowd(a));
  // Breite je Kurztext: kurze einzeilig, laengere (oder alle im Modus 'two') auf zwei ausgewogene Zeilen
  const widths = f => { labs.forEach(l => { l.style.fontSize = f + 'px'; l.style.maxWidth = 'none'; l.style.whiteSpace = 'nowrap'; });
    const nw = new Map(ids.map(id => [id, labs.get(id).offsetWidth])); labs.forEach(l => l.style.whiteSpace = ''); return nw; };
  const tryAll = (f, nw, two) => {
    labs.forEach((l, id) => { const w = nw.get(id); l.style.maxWidth = (w <= f * (two ? 8 : 15) ? w + 1 : Math.max(f * 6, w * .58 + f)) + 'px'; });
    const size = new Map(ids.map(id => [id, [labs.get(id).offsetWidth, labs.get(id).offsetHeight]])), done = [], res = new Map(); let miss = 0, dist = 0;
    for (const id of order) {
      const [x, y] = at(id), [w, h] = size.get(id), cands = [];
      for (let ring = 0; ring < 9; ring++) { const dd = 7 + ring * Math.max(10, h * .7), steps = ring ? 16 : 8;
        for (let s = 0; s < steps; s++) { const a = s / steps * 2 * Math.PI, c = Math.cos(a), sn = Math.sin(a);
          // Rechteck so, dass seine naechste Kante im Abstand dd in Richtung a liegt
          const cx = x + c * (dd + w / 2), cy = y + sn * (dd + h / 2);
          cands.push([cx - w / 2, cy - h / 2, ring + (Math.abs(sn) > .9 ? .15 : 0) + (c < -.3 ? .1 : 0), dd]); } }
      cands.sort((a, b) => a[2] - b[2]);
      let ok = null;
      for (const [l, t, , dd] of cands) { const r = [l - 2, t - 2, l + w + 2, t + h + 2];
        if (l < 2 || t < 2 || l + w > W - 2 || t + h > H - 2) continue;
        if (dotR.some(d => hit(r, d))) continue; if (done.some(d => hit(r, d))) continue; ok = [l, t, dd]; break; }
      if (!ok) { miss++; res.set(id, null); continue; }
      dist += ok[2] - 7; done.push([ok[0], ok[1], ok[0] + w, ok[1] + h]); res.set(id, [ok[0], ok[1], w, h]);
    }
    return { miss, res, dist: dist / Math.max(1, ids.length) / f };
  };
  // Schrift so gross wie moeglich, aber nicht auf Kosten langer Fuehrungslinien: bewertet Schrift minus mittleren Abstand (in Schrifthoehen)
  const hi = Math.max(14, Math.min(20, Math.round(Math.min(W / 52, H / 30)))); let best = null;
  for (let f = hi; f >= 14; f--) { const nw = widths(f);
    for (const two of [false, true]) { const r = tryAll(f, nw, two), score = f - 1.2 * r.dist;
      const better = !best || r.miss < best.miss || (r.miss === best.miss && score > best.score);
      if (better) best = { ...r, f, two, nw, score }; } }
  labs.forEach(l => l.style.fontSize = best.f + 'px'); tryAll(best.f, best.nw, best.two);
  const lines = new Map();
  best.res.forEach((r, id) => { const l = labs.get(id);
    if (!r) { l.remove(); labs.delete(id); return; }   // kein Platz: nur der Punkt (Volltext im Fokus)
    l.style.left = r[0] + 'px'; l.style.top = r[1] + 'px';
    const [x, y] = at(id), nx = Math.max(r[0], Math.min(x, r[0] + r[2])), ny = Math.max(r[1], Math.min(y, r[1] + r[3]));
    if (Math.hypot(nx - x, ny - y) > 12) { const z = m.zones[m.zoneOf.get(id)];
      const ln = svgEl('line', { x1: x, y1: y, x2: nx, y2: ny, stroke: z.ink, 'stroke-width': 1.5, opacity: .7 }); ln.dataset.mid = id; leads.append(ln); lines.set(id, ln); } });
  return { dots, labs, lines, font: best.f, miss: best.miss };
}

function light(v, k) {
  v.field.classList.toggle(N + 'hl', k != null); v.cardsBox.classList.toggle(N + 'hlc', k != null);
  [...v.dots.values(), ...v.labs.values()].forEach(e => e.classList.toggle(N + 'on', e._z === k));
  v.lines.forEach((ln, id) => ln.classList.toggle(N + 'on', v.m.zoneOf.get(id) === k));
  v.cards.forEach((c, i) => c.classList.toggle(N + 'on', i === k));
}

function zoneHead(z, m, tag) {
  const n = el(tag || 'div', null, N + 'name'); n.append(el('span', z.label));
  if (z.hint) n.append(el('small', z.hint));
  n.append(el('span', String(z.ids.length), N + 'cnt')); return n;
}
function sumEl(z, cls) { const s = el('div', null, cls); s.append(el('b', 'KI'), document.createTextNode(z.summary)); return s; }

// ---------- Uebersicht mit Punkten
function pointsView(box, ctx, m) {
  box.textContent = '';
  const W = box.clientWidth, H = box.clientHeight;
  const wrap = el('div', null, N + 'all'), plot = el('div', null, N + 'plot'), field = el('div', null, N + 'field'), { xa, ya } = axes(m);
  plot.append(ya, field, xa);
  const cardsBox = el('div', null, N + 'cards'); cardsBox.style.width = Math.round(Math.max(270, Math.min(500, W * .27))) + 'px';
  wrap.append(plot, cardsBox); box.append(wrap);
  const order = m.layout === 'bands' ? m.zones.slice().reverse() : m.zones;   // Baender: aeusserste Zone oben, wie auf der Karte
  const cards = [];
  order.forEach(z => { const c = el('div', null, N + 'card'); c.style.borderColor = z.ink; c.style.background = `linear-gradient(90deg, ${z.pastel}, #fff 70%)`;
    c.append(zoneHead(z, m)); if (z.summary) c.append(sumEl(z, N + 'sum'));
    c.onclick = () => ctx.go(z.k); cardsBox.append(c); cards[z.k] = c; });
  const fw = field.clientWidth, fh = field.clientHeight;
  field.append(background(m, fw, fh));
  const pl = place(m, field, fw, fh);
  const v = { m, wrap, field, cardsBox, cards, axes: [xa, ya], ...pl };
  // Karten: groesste gemeinsame Schrift, bei der jede ganz hineinpasst; sonst KI-Satz auf 3 Zeilen kuerzen
  const fit = (lo, hi) => { const ok = f => { cardsBox.style.fontSize = f + 'px'; return cards.every(c => !c || c.scrollHeight <= c.clientHeight + 1); };
    if (!ok(lo)) return null; if (ok(hi)) return hi; for (let i = 0; i < 7; i++) { const mid = (lo + hi) / 2; if (ok(mid)) lo = mid; else hi = mid; } return lo; };
  const cap = Math.max(16, Math.min(26, Math.round(H / 26)));
  let f = fit(14, cap); if (f === null) { cardsBox.classList.add(N + 'clamp'); f = fit(13, cap) || 13; }
  cardsBox.style.fontSize = Math.floor(f * 2) / 2 + 'px';
  cards.forEach((c, k) => { if (!c) return; c.onmouseenter = () => light(v, k); c.onmouseleave = () => light(v, null); });
  [...pl.dots.values(), ...pl.labs.values()].forEach(e => { e.onclick = () => ctx.go(e._z); });
  return v;
}

// ---------- Uebersicht 2×2 mit Kacheln
const emW = (t, lines, cap) => Math.max(8, Math.min(t.length, cap)) / lines * 0.55 + 1.7;
function tileEl(m, r, color, lines) {
  const id = String(r.id), e = el('div', null, 'tile c-' + color), mk = markEl(m, id), s = el('span'), w = emW(r.body + (mk ? '          ' : ''), lines, 150);
  if (mk) s.append(mk); s.append(document.createTextNode(r.body)); e.append(s);
  if (m.marks.get(id) === 'robust') e.classList.add(N + 'robust');
  e.dataset.mid = id; e.title = r.body; e.style.flex = `${Math.round(w * 10)} 1 ${w}em`; e.style.maxWidth = `min(${(w * 2.4).toFixed(2)}em, 100%)`;
  return e;
}
function gridView(box, ctx, m) {
  box.textContent = '';
  const H = box.clientHeight, wrap = el('div', null, N + 'all'), plot = el('div', null, N + 'plot'), grid = el('div', null, N + 'grid'), { xa, ya } = axes(m);
  const rowsN = Math.ceil(m.zones.length / 2);
  grid.style.gridTemplateColumns = '1fr 1fr'; grid.style.gridTemplateRows = `repeat(${rowsN}, 1fr)`;
  plot.append(ya, grid, xa); wrap.append(plot); box.append(wrap);
  const build = tight => { grid.textContent = ''; wrap.classList.toggle(N + 'tight', tight);
    return m.zones.map(z => { const c = el('div', null, N + 'cell'); c.style.borderTopColor = z.ink; c.style.background = `linear-gradient(180deg, ${z.pastel}55, #fff 40%)`;
      const h = el('div', null, N + 'chead'); h.append(zoneHead(z, m)); h.onclick = () => ctx.go(z.k);
      const hint = z.hint ? el('div', z.hint, N + 'chint') : null; if (hint) h.querySelector('small').remove();
      const sum = z.summary ? sumEl(z, N + 'csum') : null;
      const body = el('div', null, N + 'body'), inner = el('div', null, N + 'tiles');
      z.rows.forEach(r => inner.append(tileEl(m, r, z.color, 2)));
      body.append(inner); c.append(h); if (hint) c.append(hint); if (sum) c.append(sum); c.append(body); grid.append(c);
      return { z, c, h, hint, sum, body, inner }; }); };
  const fit = (x, lo, hi) => { const ok = f => { x.inner.style.fontSize = f + 'px'; return x.inner.offsetHeight <= x.body.clientHeight + 1; };
    if (!ok(lo)) return null; if (ok(hi)) return hi; for (let i = 0; i < 7; i++) { const mid = (lo + hi) / 2; if (ok(mid)) lo = mid; else hi = mid; } return lo; };
  const hi = Math.max(18, Math.min(28, Math.round(H / 34)));
  let xs = build(false), fs = xs.map(x => fit(x, 14, hi));
  if (fs.some(f => f === null)) { xs = build(true); fs = xs.map(x => fit(x, 14, hi)); }
  // alle Felder in gleicher Schrift (ruhiges Bild). Passt ein Feld bei 14 px nicht, zeigt es die ersten Kacheln und „+ n weitere“ (fuehrt in den Fokus).
  const least = Math.floor(Math.min(...fs.map(f => f || 14)) * 2) / 2;
  xs.forEach(x => { x.inner.style.fontSize = least + 'px';
    const ts = [...x.inner.querySelectorAll('.tile')], over = () => x.inner.offsetHeight > x.body.clientHeight + 1;
    if (!over()) return;
    const more = el('button', null, N + 'morebtn'); more.onclick = () => ctx.go(x.z.k); x.inner.append(more);
    let n = 0; while (over() && n < ts.length) { ts[ts.length - 1 - n].hidden = true; n++; more.textContent = '+ ' + n + ' weitere'; } });
  const tiles = new Map(); xs.forEach(x => x.inner.querySelectorAll('.tile').forEach(t => { t._z = x.z.k; tiles.set(t.dataset.mid, t); }));
  return { m, wrap, grid, xs, axes: [xa, ya], tiles };
}

// ---------- Fokus: Zone k gross, Karte klein daneben
function mini(m, ctx, k, w) {
  const side = el('div', null, N + 'mini');
  if (m.points) {
    const h = Math.round(w * .78), plot = el('div', null, N + 'plot'), field = el('div', null, N + 'field'), { xa, ya } = axes(m, true);
    field.style.width = w + 'px'; field.style.height = h + 'px'; plot.append(ya, field, xa); side.append(plot);
    field.append(background(m, w, h, k, ctx.go)); place(m, field, w, h, k, true);
  } else {
    const g = el('div', null, N + 'mgrid'), { xa, ya } = axes(m, true), plot = el('div', null, N + 'plot');
    g.style.cssText += `grid-row:1;grid-column:2;width:${w}px;height:${Math.round(w * .62)}px`;
    m.zones.forEach(z => { const c = el('div', null, N + 'mcell' + (z.k === k ? ' ' + N + 'on' : ''));
      if (z.k === k) { c.style.background = z.pastel; c.style.boxShadow = `inset 0 0 0 2px ${z.ink}`; }
      c.append(document.createTextNode(z.label), el('small', many(m, z.ids.length))); c.onclick = () => ctx.go(z.k); g.append(c); });
    plot.append(ya, g, xa); side.append(plot);
  }
  return side;
}
function itemEl(m, r, z) {
  const id = String(r.id), e = el('div', null, N + 'item'), mk = markEl(m, id), s = m.shorts.get(id);
  e.style.borderLeftColor = z.ink; if (s && !r.body.startsWith(s)) e.append(el('b', s));
  if (mk) e.append(mk); e.append(document.createTextNode(r.body)); return e;
}
function focusView(box, ctx, m, k) {
  const z = m.zones[k]; box.textContent = '';
  const W = box.clientWidth, H = box.clientHeight, wrap = el('div', null, N + 'one'), sideCol = el('div', null, N + 'side'), main = el('div', null, N + 'main');
  const mw = Math.round(Math.max(200, Math.min(380, W * .2, H * .62)));
  sideCol.append(mini(m, ctx, k, mw));
  const head = el('div', null, N + 'head'), back = el('button', '← Alle', N + 'back'); back.onclick = () => ctx.go(null);
  const pill = el('div', null, N + 'pill'); pill.style.background = z.pastel;
  pill.append(el('span', z.label)); if (z.hint) pill.append(el('small', z.hint)); pill.append(el('small', '· ' + many(m, z.ids.length)));
  head.append(back, pill); main.append(head);
  if (z.summary) main.append(sumEl(z, N + 'ksum'));
  const area = el('div', null, N + 'area'); main.append(area); wrap.append(sideCol, main); box.append(wrap);
  const AH = area.clientHeight;
  const make = (rs, f) => { area.textContent = ''; const c = el('div', null, N + 'cols'); c.style.height = AH + 'px'; c.style.fontSize = f + 'px';
    rs.forEach(r => c.append(itemEl(m, r, z))); area.append(c); return c; };
  const fits = (rs, f) => { const c = make(rs, f); return c.scrollWidth <= c.clientWidth + 1; };
  const LO = 15, HI = 28; let parts = [z.rows];
  if (!fits(z.rows, LO)) { parts = [[]];
    z.rows.forEach(r => { const cur = parts[parts.length - 1]; if (cur.length && !fits(cur.concat(r), LO)) parts.push([r]); else cur.push(r); }); }
  const page = Math.min(ctx.page || 0, parts.length - 1), rs = parts[page];
  let lo = LO, hi = HI;
  if (fits(rs, hi)) lo = hi; else for (let i = 0; i < 8; i++) { const mid = (lo + hi) / 2; if (fits(rs, mid)) lo = mid; else hi = mid; }
  make(rs, Math.floor(lo * 2) / 2);
  if (ctx.dir) area.animate([{ transform: `translateX(${ctx.dir * 90}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: 'ease-out' });
  return parts.length;
}

// Eigenes Nachmessen: aendert sich die Flaeche nach dem Zeichnen (Headless-Chrome rechnet anfangs kleiner, Schrift laedt nach),
// zeichnet der Baustein selbst neu, denn Punkte liegen in Pixeln. Nicht waehrend des Show-Effekts.
// Sofort im Beobachter (vor dem naechsten Bild), nicht verzoegert: sonst zeigt ein Bildschirmfoto die alte Lage.
let last = null, revealing = false;
const ro = new ResizeObserver(() => {
  if (!last || revealing || !last.box.isConnected || last.box.hidden) return;
  const { box, ctx, w, h } = last; if (Math.abs(box.clientWidth - w) < 2 && Math.abs(box.clientHeight - h) < 2) return;
  draw(box, { ...ctx, dir: 0 }); });
function draw(box, ctx) {
  if (!last || last.box !== box) ro.observe(box);
  last = { box, ctx, w: box.clientWidth, h: box.clientHeight };
  const m = model(ctx);
  if (!m.zones.length) { box.textContent = ''; return { count: 0, pages: 1 }; }
  if (ctx.focus != null && m.zones[ctx.focus]) return { count: m.zones.length, pages: focusView(box, ctx, m, ctx.focus) };
  const v = m.points ? pointsView(box, ctx, m) : gridView(box, ctx, m);
  // Material bekommt data-id erst hier am Ende: fuer Uebergaenge des Rahmens (flip) sind alle Beitraege auffindbar
  box.querySelectorAll('[data-mid]').forEach(e => { if (!e.classList.contains(N + 'dot') && e.tagName !== 'line') e.dataset.id = e.dataset.mid; });
  if (ctx.dir) v.wrap.animate([{ transform: `translateX(${ctx.dir * 90}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: 'ease-out' });
  return { count: m.zones.length, pages: 1 };
}

// ---------- Show-Effekt
async function reveal(box, ctx) {
  const { sleep } = ctx, from = ctx.from || new Map(), m = model(ctx);
  if (!m.zones.length) return;
  revealing = true; try { await show(box, ctx, m, sleep, from); } finally { revealing = false; }
}
async function show(box, ctx, m, sleep, from) {
  const v = m.points ? pointsView(box, ctx, m) : gridView(box, ctx, m);
  const fade = (e, ms, delay = 0, dy = 0) => e.animate([{ opacity: 0, transform: `translateY(${dy}px)` }, { opacity: 1, transform: 'none' }], { duration: ms, delay, easing: 'ease-out', fill: 'backwards' });
  // Material je Zone (das, was fliegt) und Beiwerk (Punkte, Fuehrungslinien), Namen und KI-Saetze
  const mat = new Map(m.zones.map(z => [z.k, []])), extra = new Map(m.zones.map(z => [z.k, []])), names = [];
  if (m.points) { v.labs.forEach(l => mat.get(l._z).push(l)); v.dots.forEach(d => extra.get(d._z).push(d));
    v.lines.forEach((ln, id) => extra.get(m.zoneOf.get(id)).push(ln));
    v.dots.forEach((d, id) => { if (!v.labs.has(id)) mat.get(d._z).push(d); });   // Punkt ohne Kurztext fliegt selbst
    v.cards.forEach(c => c && names.push(c)); }
  else { v.tiles.forEach(t => mat.get(t._z).push(t)); v.xs.forEach(x => names.push(...[x.h, x.hint, x.sum].filter(Boolean))); }
  const bg = m.points ? v.field.querySelector('.' + N + 'bg') : null;
  if (m.points) { const ld = v.field.querySelector('.' + N + 'leads'); if (ld) ld.style.zIndex = 4; }
  const cells = m.points ? [] : v.xs.map(x => x.c);
  mat.forEach(a => a.forEach(e => e.style.visibility = 'hidden')); extra.forEach(a => a.forEach(e => e.style.visibility = 'hidden'));
  names.forEach(e => e.style.visibility = 'hidden');
  v.axes.forEach(a => a.style.opacity = 0); if (bg) bg.style.opacity = 0; cells.forEach(c => c.style.opacity = 0);
  (m.points ? [v.field] : [v.grid]).forEach(f => f.style.borderColor = 'transparent');
  // Geister-Mosaik an den alten Plaetzen
  const B = box.getBoundingClientRect(), ghost = el('div', null, N + 'ghost'), ghosts = new Map();
  const mb = document.querySelector('#mosaic .block'); ghost.style.fontSize = (mb && mb.style.fontSize) || '12px'; ghost.style.setProperty('--lines', 3);
  from.forEach((a, id) => { const r = m.byId.get(id); if (!r || !a.width) return;
    const g = el('div', null, 'tile'); g.append(el('span', r.body));
    g.style.cssText = `left:${a.left - B.left}px;top:${a.top - B.top}px;width:${a.width}px;height:${a.height}px`; ghost.append(g); ghosts.set(id, g); });
  box.append(ghost);
  await sleep(400);
  // 1. Achsen und Flaeche erscheinen, das Mosaik tritt zurueck
  ghost.style.opacity = .5;
  (m.points ? [v.field] : [v.grid]).forEach(f => { f.style.transition = 'border-color .6s'; f.style.borderColor = ''; });
  v.axes.forEach((a, i) => { a.style.opacity = 1; fade(a, 600, i * 200, 8); });
  if (bg) { bg.style.opacity = 1; fade(bg, 900, 300); }
  cells.forEach((c, i) => { c.style.opacity = 1; fade(c, 500, 300 + i * 120); });
  await sleep(1100);
  // 2. Zone fuer Zone: Kacheln faerben sich im Mosaik und fliegen an ihren Ort
  const per = m.zones.length > 3 ? 1250 : 1500;
  for (const z of m.zones) {
    const els = mat.get(z.k); if (!els.length) continue;
    z.ids.forEach((id, j) => { const g = ghosts.get(id); if (g) { g.className = 'tile pop c-' + z.color; g.style.opacity = 1; g.style.zIndex = 2; } });
    ghost.style.opacity = 1; ghosts.forEach((g, id) => { if (m.zoneOf.get(id) !== z.k) g.style.opacity = .25; });
    await sleep(450);
    els.forEach(e => { e.style.visibility = ''; e.dataset.id = e.dataset.mid; if (!e.style.position && getComputedStyle(e).position === 'static') e.style.position = 'relative'; e.style.zIndex = 4; });   // ueber dem Geister-Mosaik
    z.ids.forEach(id => { const g = ghosts.get(id); if (g) { g.remove(); ghosts.delete(id); } });
    ctx.flip(box, from);
    els.forEach(e => delete e.dataset.id);
    await sleep(per - 450);
    extra.get(z.k).forEach(e => { e.style.visibility = ''; if (e.tagName !== 'line') e.style.zIndex = 4; fade(e, 350); });
    await sleep(250);
  }
  ghost.style.opacity = 0; await sleep(400); ghost.remove();
  // 3. Namen und KI-Saetze
  for (const n of (m.points && m.layout === 'bands' ? names.slice() : names)) { n.style.visibility = ''; fade(n, 450, 0, 10); await sleep(m.points ? 380 : 140); }
  await sleep(500);
}

VIZ.map = { draw, reveal: (b, c) => reveal(b, c).catch(e => console.error('viz-map reveal', e)) };
})();
