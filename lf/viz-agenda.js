// Baustein 'agenda' · Agenda-Wand fuer Open Space Technology (Marktplatz). Stand 12.11.2026.
// Am Handy schlagen Teilnehmende Sessions vor (row.body = Titel und wer einlaedt, so wie getippt).
// Die KI legt aehnliche Vorschlaege zusammen und verteilt die Sessions auf Zeitfenster × Raeume,
// so dass verwandte Sessions nicht gleichzeitig laufen.
//
// Payload (von der KI):
// { viz: 'agenda',
//   slots: [                                   // Zeitfenster von oben nach unten (Zeilen der Wand)
//     { label: '10:00–10:50' },                // Session-Runde
//     { label: '12:00–13:00', kind: 'break',   // durchgehende Zeile: kind 'break' (Pause) oder 'plenum' (alle zusammen)
//       title: 'Mittagspause' } ],             //   title = Text in der Zeile (Standard: 'Pause' bzw. 'Plenum')
//   spaces: [{ label: 'Raum Birke' }],         // Raeume (Spalten), links nach rechts
//   themes: [{ label: 'Lernen und Wissen', color: 'grün' }],   // optional: Themenstraenge; color gelb grün blau rosa orange lila türkis koralle
//   sessions: [
//     { ids: [20, 17, 29],                     // ein oder mehrere zusammengelegte Vorschlaege (row.id); der erste ist der Titelgeber
//       title: 'ChatGPT & Co: Wer nutzt was?',  // Titel der Session (sonst body des ersten Vorschlags)
//       host: 'Jonas, Tobi, Marek',            // wer einlaedt
//       slot: 0,                               // Index in slots (Pausen mitgezaehlt) oder dessen label
//       space: 0,                              // Index in spaces oder dessen label
//       theme: 2,                              // optional: Index in themes oder dessen label
//       interest: 19 } ],                      // optional: Zahl der Interessierten
//   open: [15, 34] }                           // optional: Vorschlaege noch ohne Platz
// count = Zahl der Session-Runden (ohne Pausen/Plenum); Fokus k = Runde k gross: je Raum Titel, Einladende, Strang,
// Interesse und die Originalvorschlaege im Volltext; rechts oben eine Mini-Agenda zur Orientierung.
// Uebersicht: Raster Zeiten (Zeilen) × Raeume (Spalten), ruhige Karten getoent nach Strang, darunter „Noch ohne Platz“.
// Show-Effekt: leeres Raster erscheint, dann fliegen die Vorschlaege Runde fuer Runde aus dem Mosaik in ihre Zellen;
// zusammengelegte fliegen sichtbar in eine Karte zusammen. Zuletzt die Vorschlaege ohne Platz.
(() => {
const N = 'vz-agenda-';
const INK = { gelb: '#B98D00', grün: '#2F9A5C', blau: '#3B78CF', rosa: '#CC4A7C', orange: '#D07A22', lila: '#7A5CC2', türkis: '#24999A', koralle: '#D9573F' };
const PASTEL = { gelb: '#FFF1B8', grün: '#D3EFDD', blau: '#D6E6FB', rosa: '#FAD9E6', orange: '#FFDDBB', lila: '#E6DBF7', türkis: '#CDEEEE', koralle: '#FFD5CC' };
const PALETTE = ['blau', 'grün', 'orange', 'lila', 'rosa', 'türkis', 'koralle', 'gelb'];
const NONE = { label: '', color: null, ink: '#A9A9A0', pastel: '#F1F1EC' };

const css = `
.${N}all { position: absolute; inset: 0; display: flex; flex-direction: column; }
.${N}grid { flex: 1; min-height: 0; display: grid; }
.${N}room { align-self: end; font-weight: 800; color: #1C1917; padding: 0 .15em .25em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            border-bottom: 2px solid #D9D9D2; }
.${N}time { display: flex; flex-direction: column; justify-content: center; align-items: flex-end; padding-right: .55em; line-height: 1.15; cursor: pointer;
            text-align: right; overflow-wrap: anywhere; min-width: 0; border-right: 2px solid #D9D9D2; transition: color .3s; }
.${N}time b { font-size: 1.12em; font-weight: 800; }
.${N}time small { color: #5F5F5F; font-size: .82em; }
.${N}time.${N}brkt { cursor: default; flex-direction: row; gap: .2em; align-items: center; justify-content: flex-end; color: #5F5F5F; font-size: .85em; }
.${N}time.${N}lit b { color: #409E9F; }
.${N}cell { min-width: 0; min-height: 0; display: flex; flex-direction: column; gap: .3em; }
.${N}empty { border: 1.5px dashed #D6D6CF; border-radius: .45em; display: flex; align-items: center; justify-content: center; color: #9A9A90; font-size: .85em; }
.${N}card { position: relative; flex: 1 1 0; min-height: 0; overflow: hidden; border-radius: .45em; border-left: .3em solid; padding: .4em .6em .4em .55em;
            display: flex; flex-direction: column; gap: .15em; box-shadow: 0 1px 3px rgba(0,0,0,.11); cursor: pointer; background: #fff; }
.${N}title { flex: none; font-weight: 750; line-height: 1.2; display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; hyphens: auto; }
.${N}host { flex: none; color: #4A4A45; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: .86em; }
.${N}foot { flex: none; margin-top: auto; display: flex; align-items: center; gap: .5em; font-size: .78em; white-space: nowrap; min-width: 0; }
.${N}merged { color: #409E9F; font-weight: 700; overflow: hidden; text-overflow: ellipsis; }
.${N}int { margin-left: auto; display: inline-flex; align-items: center; gap: .25em; color: #5F5F5F; font-weight: 700; }
.${N}int svg { width: 1em; height: 1em; }
.${N}brk { grid-column: 2 / -1; border-radius: .45em; display: flex; align-items: center; justify-content: center; color: #5F5F5F; font-weight: 700;
           letter-spacing: .04em; padding: .28em; font-size: .9em;
           background: repeating-linear-gradient(135deg, #F1F1EC 0 10px, #EAEAE3 10px 20px); }
.${N}brk.${N}plenum { background: #EAF9F9; color: #409E9F; }
.${N}strip { flex: none; display: flex; align-items: center; gap: .5em; min-width: 0; }
.${N}slabel { flex: none; font-weight: 800; color: #5F5F5F; font-size: .9em; }
.${N}open { flex: none; min-width: 0; max-width: 26em; background: #FFF4C7; padding: .28em .6em; border-radius: .25em; box-shadow: 0 1px 2px rgba(0,0,0,.16);
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: .9em; }
.${N}more { flex: none; color: #5F5F5F; font-size: .85em; font-weight: 700; }
.${N}cmore { flex: none; color: #5F5F5F; font-size: .82em; font-weight: 700; text-align: center; cursor: pointer; border-radius: .45em; background: #F1F1EC; padding: .15em .4em; white-space: nowrap; }
.${N}ghost { position: absolute; inset: 0; z-index: 3; pointer-events: none; transition: opacity .6s; }
.${N}ghost .tile { position: absolute; }
/* Fokus */
.${N}one { position: absolute; inset: 0; display: flex; flex-direction: column; }
.${N}head { flex: none; display: flex; align-items: center; gap: 14px; margin: 0 0 12px; min-width: 0; }
.${N}back { flex: none; border: 1px solid #C9C9C2; background: none; cursor: pointer; font: inherit; font-size: 15px; color: #5F5F5F; padding: 3px 12px; border-radius: 999px; }
.${N}pill { display: flex; align-items: baseline; gap: .45em; font-weight: 800; font-size: clamp(20px, 2vw, 34px); padding: 4px 22px 5px 18px; border-radius: 999px;
            background: #EAF9F9; min-width: 0; white-space: nowrap; }
.${N}pill small { font-weight: 400; color: #5F5F5F; font-size: .66em; }
.${N}mini { margin-left: auto; flex: none; display: grid; gap: 3px; align-items: stretch; }
.${N}mini i { display: block; border-radius: 2px; cursor: pointer; }
.${N}mini .${N}mt { font-size: 13px; color: #8A8A80; line-height: 1; padding-right: 4px; text-align: right; cursor: pointer; align-self: center; font-style: normal; }
.${N}mini .${N}mt.${N}on { color: #409E9F; font-weight: 800; }
.${N}cols { flex: 1; min-height: 0; display: grid; }
.${N}fcard { min-height: 0; min-width: 0; overflow: hidden; border-radius: .5em; border-top: .32em solid; padding: .65em .8em .7em; display: flex; flex-direction: column;
             gap: .4em; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
.${N}froom { font-size: .78em; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; color: #5F5F5F; }
.${N}ftitle { font-size: 1.3em; font-weight: 800; line-height: 1.2; overflow-wrap: anywhere; hyphens: auto; }
.${N}fhost { color: #3A3A36; }
.${N}fhost span { color: #5F5F5F; }
.${N}fmeta { display: flex; flex-wrap: wrap; align-items: center; gap: .35em .6em; font-size: .82em; }
.${N}tag { padding: .05em .6em .1em; border-radius: .55em; font-weight: 700; background: #fff; line-height: 1.25; }
.${N}fsub { font-size: .78em; font-weight: 800; color: #409E9F; letter-spacing: .03em; margin-top: .25em; }
.${N}orig { background: #FFFDF6; border: 1px solid #E8E2CF; border-radius: .3em; padding: .35em .6em; line-height: 1.3; font-size: .95em; overflow-wrap: anywhere; }
.${N}fempty { border: 1.5px dashed #D6D6CF; border-radius: .5em; display: flex; align-items: center; justify-content: center; color: #9A9A90; }
`;
document.head.append(Object.assign(document.createElement('style'), { textContent: css }));

const PERSON = '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="4.6" r="3" fill="currentColor"/><path d="M2.2 15c0-3.5 2.6-5.6 5.8-5.6s5.8 2.1 5.8 5.6z" fill="currentColor"/></svg>';

function model(ctx) {
  const d = ctx.data || {}, rows = ctx.rows || [], byId = new Map(rows.map(r => [String(r.id), r]));
  const slots = (d.slots || []).map((s, i) => ({ i, label: s.label || '', kind: s.kind === 'break' || s.kind === 'plenum' ? s.kind : null,
    title: s.title || (s.kind === 'plenum' ? 'Plenum' : 'Pause') }));
  const spaces = (d.spaces || []).map((s, i) => ({ i, label: s.label || '' }));
  const themes = (d.themes || []).map((t, i) => { const color = INK[t.color] ? t.color : PALETTE[i % PALETTE.length];
    return { i, label: t.label || '', color, ink: INK[color], pastel: PASTEL[color] }; });
  const idx = (v, list) => typeof v === 'number' ? (list[v] ? v : -1) : list.findIndex(x => x.label === v);
  const used = new Set();
  const sessions = (d.sessions || []).map((s, j) => {
    const ids = [...new Set((s.ids || []).map(String))].filter(i => byId.has(i) && !used.has(i)); ids.forEach(i => used.add(i));
    const t = s.theme == null ? -1 : idx(s.theme, themes);
    return { j, ids, title: s.title || (ids[0] ? byId.get(ids[0]).body : ''), host: s.host || '', slot: idx(s.slot, slots), space: idx(s.space, spaces),
             theme: t >= 0 ? themes[t] : NONE, interest: Number.isFinite(+s.interest) && s.interest != null ? +s.interest : null };
  }).filter(s => s.ids.length || s.title);
  // Sessions ohne gueltigen Platz landen bei „Noch ohne Platz“
  const placed = sessions.filter(s => s.slot >= 0 && !slots[s.slot].kind && s.space >= 0);
  const open = [...new Set((d.open || []).map(String))].filter(i => byId.has(i) && !used.has(i));
  sessions.filter(s => !placed.includes(s)).forEach(s => s.ids.forEach(i => open.push(i)));
  const rounds = slots.filter(s => !s.kind);   // fokussierbare Zeitfenster
  const at = new Map(); placed.forEach(s => { const k = s.slot + ',' + s.space; if (!at.has(k)) at.set(k, []); at.get(k).push(s); });
  return { rows, byId, slots, spaces, themes, sessions: placed, open, rounds, at };
}
const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);
const splitTime = l => { const m = String(l).match(/^\s*(.+?)\s*[–—-]\s*(.+?)\s*$/); return m ? [m[1], '– ' + m[2]] : [l, '']; };

// ---------- Uebersicht
function cardEl(s, m, ctx) {
  const c = el('div', null, N + 'card'); c.style.borderLeftColor = s.theme.ink;
  c.style.background = `linear-gradient(100deg, ${s.theme.pastel}, ${s.theme.pastel}88 55%, #fff)`;
  const t = el('div', s.title, N + 'title'); c.append(t);
  if (s.host) c.append(el('div', s.host, N + 'host'));
  const foot = el('div', null, N + 'foot');
  if (s.ids.length > 1) foot.append(el('span', 'aus ' + s.ids.length + ' Vorschlägen', N + 'merged'));
  if (s.interest != null) { const n = el('span', null, N + 'int'); n.innerHTML = PERSON; n.append(String(s.interest)); n.title = plural(s.interest, 'Interessierte Person', 'Interessierte'); foot.append(n); }
  if (foot.childNodes.length) c.append(foot);
  c.title = s.ids.map(i => m.byId.get(i).body).join('\n');
  c.onclick = () => ctx.go(m.rounds.indexOf(m.slots[s.slot]));
  c._s = s; c._t = t; c._foot = foot; return c;
}

function overview(box, ctx, m) {
  box.textContent = '';
  const W = box.clientWidth, H = box.clientHeight, R = Math.max(1, m.spaces.length);
  const wrap = el('div', null, N + 'all'), grid = el('div', null, N + 'grid'); wrap.append(grid); box.append(wrap);
  const gap = Math.max(6, Math.round(Math.min(W / 160, H / 80)));
  grid.style.gridTemplateColumns = `fit-content(22%) repeat(${R}, minmax(0, 1fr))`;   // sehr lange Zeit-Labels brechen um, statt die Raeume zu quetschen
  grid.style.gridTemplateRows = 'auto ' + m.slots.map(s => s.kind ? 'auto' : 'minmax(0, 1fr)').join(' ');
  grid.style.gap = `${gap}px ${gap}px`;
  grid.append(el('div'));
  const rooms = m.spaces.map(sp => { const r = el('div', sp.label, N + 'room'); grid.append(r); return r; });
  const times = [], bands = [], cells = [], cards = [], mores = [];
  m.slots.forEach(sl => {
    if (sl.kind) { const t = el('div', null, N + 'time ' + N + 'brkt'); t.append(el('span', sl.label)); grid.append(t); times.push(t);
      const b = el('div', sl.title, N + 'brk' + (sl.kind === 'plenum' ? ' ' + N + 'plenum' : '')); grid.append(b); bands.push(b); return; }
    const [a, z] = splitTime(sl.label), t = el('div', null, N + 'time'); t.append(el('b', a)); if (z) t.append(el('small', z));
    t.onclick = () => ctx.go(m.rounds.indexOf(sl)); t._slot = sl.i; grid.append(t); times.push(t);
    m.spaces.forEach(sp => { const list = m.at.get(sl.i + ',' + sp.i) || [], c = el('div', null, N + 'cell');
      if (!list.length) { c.classList.add(N + 'empty'); c.append(el('span', 'frei')); }
      // mehr als drei Sessions in einer Zelle: zwei Karten, der Rest als „+ n weitere“ (alle stehen in der Runden-Ansicht)
      const shown = list.length > 3 ? list.slice(0, 2) : list;
      shown.forEach(s => { const k = cardEl(s, m, ctx); c.append(k); cards.push(k); });
      if (shown.length < list.length) { const x = el('div', '+ ' + (list.length - shown.length) + ' weitere', N + 'cmore'); x._slot = sl.i;
        x._ids = list.slice(shown.length).flatMap(s => s.ids); x.title = list.slice(shown.length).map(s => s.title).join('\n');
        x.onclick = () => ctx.go(m.rounds.indexOf(sl)); c.append(x); mores.push(x); }
      c._slot = sl.i; grid.append(c); cells.push(c); });
  });
  // Noch ohne Platz
  let strip = null; const opens = [];
  if (m.open.length) {
    strip = el('div', null, N + 'strip'); strip.style.marginTop = gap * 1.6 + 'px'; strip.append(el('span', 'Noch ohne Platz', N + 'slabel'));
    m.open.forEach(i => { const o = el('div', m.byId.get(i).body, N + 'open'); o.title = m.byId.get(i).body; o.dataset.mid = i; strip.append(o); opens.push(o); });
    wrap.append(strip);
  }
  // Schrift: groesste gemeinsame Groesse, bei der jede Karte ganz in ihre Zelle passt. Titel 3 Zeilen; wird es zu klein, 2 Zeilen.
  const ok = (f, L) => { wrap.style.fontSize = f + 'px'; cards.forEach(c => c._t.style.webkitLineClamp = L);
    return grid.scrollHeight <= grid.clientHeight + 1 && cards.every(c => c.scrollHeight <= c.clientHeight + 1); };
  const fit = (L, lo, hi) => { if (!ok(lo, L)) return null; if (ok(hi, L)) return hi;
    for (let i = 0; i < 7; i++) { const mid = (lo + hi) / 2; if (ok(mid, L)) lo = mid; else hi = mid; } return lo; };
  const hi = Math.max(15, Math.min(30, Math.round(Math.min(H / 24, W / 48))));
  let L = 3, f = fit(3, 13, hi);
  if (f === null) { L = 2; f = fit(2, 13, hi); }
  if (f === null) { L = 1; f = fit(1, 13, hi) || 13; }
  f = Math.floor(f * 2) / 2; ok(f, L);
  // Leiste: was nicht in eine Zeile passt, wird zu „+ n weitere“
  if (strip) { const more = el('span', null, N + 'more'); strip.append(more); let n = 0;
    const over = () => strip.scrollWidth > strip.clientWidth + 1;
    while (over() && n < opens.length - 1) { opens[opens.length - 1 - n].hidden = true; n++; more.textContent = '+ ' + n + ' weitere'; }
    if (!n) more.remove(); }
  if (ctx.dir) wrap.animate([{ transform: `translateX(${ctx.dir * 90}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: 'ease-out' });
  return { wrap, grid, rooms, times, bands, cells, cards, mores, strip, opens };
}

// ---------- Fokus: eine Runde gross
function mini(m, ctx, slotI) {
  const g = el('div', null, N + 'mini'), R = m.spaces.length, cw = R > 6 ? 12 : 16;
  g.style.gridTemplateColumns = `auto repeat(${R}, ${cw}px)`;
  g.style.gridTemplateRows = m.slots.map(s => s.kind ? '5px' : '13px').join(' ');
  m.slots.forEach(sl => {
    const on = sl.i === slotI, k = m.rounds.indexOf(sl);
    const t = el('i', sl.kind ? '' : splitTime(sl.label)[0], N + 'mt' + (on ? ' ' + N + 'on' : '')); if (!sl.kind) t.onclick = () => ctx.go(k); g.append(t);
    if (sl.kind) { const b = el('i'); b.style.cssText = `grid-column: 2 / -1; background: #E3E3DC; cursor: default`; g.append(b); return; }
    m.spaces.forEach(sp => { const s = (m.at.get(sl.i + ',' + sp.i) || [])[0], c = el('i');
      c.style.background = s ? (on ? s.theme.ink : s.theme.pastel) : 'transparent';
      if (!s) c.style.boxShadow = 'inset 0 0 0 1px #DCDCD4';
      c.title = sl.label + ' · ' + sp.label + (s ? ' · ' + s.title : ''); c.onclick = () => ctx.go(k); g.append(c); });
  });
  return g;
}
function focusCard(s, sp, m) {
  const c = el('div', null, N + 'fcard');
  if (!s) { c.className = N + 'fempty'; c.append(el('span', sp.label + ' · frei')); return c; }
  c.style.borderTopColor = s.theme.ink; c.style.background = `linear-gradient(180deg, ${s.theme.pastel}, #fff 75%)`;
  c.append(el('div', sp.label, N + 'froom'), el('div', s.title, N + 'ftitle'));
  if (s.host) { const h = el('div', null, N + 'fhost'); h.append(el('span', 'lädt ein: '), document.createTextNode(s.host)); c.append(h); }
  const meta = el('div', null, N + 'fmeta');
  if (s.theme.label) { const t = el('span', s.theme.label, N + 'tag'); t.style.color = s.theme.ink; t.style.boxShadow = `inset 0 0 0 1.5px ${s.theme.ink}`; meta.append(t); }
  if (s.interest != null) { const n = el('span', null, N + 'int'); n.style.marginLeft = '0'; n.innerHTML = PERSON; n.append(plural(s.interest, 'Interessierte Person', 'Interessierte')); meta.append(n); }
  if (meta.childNodes.length) c.append(meta);
  c.append(el('div', s.ids.length > 1 ? 'Aus ' + s.ids.length + ' Vorschlägen' : 'Vorschlag', N + 'fsub'));
  s.ids.forEach(i => c.append(el('div', m.byId.get(i).body, N + 'orig')));
  return c;
}
function focusView(box, ctx, m, k) {
  const sl = m.rounds[k]; box.textContent = '';
  const wrap = el('div', null, N + 'one'), head = el('div', null, N + 'head'), back = el('button', '← Alle', N + 'back'); back.onclick = () => ctx.go(null);
  const here = m.spaces.map(sp => ({ sp, s: (m.at.get(sl.i + ',' + sp.i) || []) })).flatMap(x => x.s.length ? x.s.map(s => ({ sp: x.sp, s })) : [{ sp: x.sp, s: null }]);
  const n = here.filter(x => x.s).length, [a, z] = splitTime(sl.label);
  const pill = el('div', null, N + 'pill'); pill.append(el('span', 'Runde ' + (k + 1)), el('small', a + ' ' + z), el('small', '· ' + plural(n, 'Session', 'Sessions')));
  head.append(back, pill, mini(m, ctx, sl.i)); wrap.append(head);
  const cols = el('div', null, N + 'cols'); wrap.append(cols); box.append(wrap);
  const W = cols.clientWidth, gap = Math.max(10, Math.round(W / 110)); cols.style.gap = gap + 'px';
  const make = (list, f) => { cols.textContent = ''; cols.style.fontSize = f + 'px'; // Spalten nach Textmenge gewichtet: eine Session mit vier Vorschlaegen bekommt mehr Breite als eine mit einem
    cols.style.gridTemplateColumns = list.map(x => `minmax(0, ${weight(x).toFixed(2)}fr)`).join(' ');
    list.forEach(x => cols.append(focusCard(x.s, x.sp, m))); return [...cols.children]; };
  const fits = (list, f) => make(list, f).every(c => c.scrollHeight <= c.clientHeight + 1 && c.scrollWidth <= c.clientWidth + 1);
  const chars = x => x.s ? x.s.title.length * 1.6 + x.s.ids.reduce((a, i) => a + m.byId.get(i).body.length + 25, 0) : 40;
  const avg = here.reduce((a, x) => a + chars(x), 0) / here.length, weight = x => Math.max(.6, Math.min(1.8, Math.sqrt(chars(x) / avg)));
  const LO = 15, HI = 28;
  // Seiten: hoechstens so viele Spalten, wie mit ~15 Zeichen Breite nebeneinander passen (sonst Wortbrei), dann nach Hoehe
  const split = p => { const per = Math.ceil(here.length / p), out = []; for (let i = 0; i < here.length; i += per) out.push(here.slice(i, i + per)); return out; };
  let p = Math.max(1, Math.ceil(here.length / Math.max(1, Math.floor(W / 230)))), parts = split(p);
  while (!parts.every(x => fits(x, LO)) && p < here.length) parts = split(++p);
  const page = Math.min(ctx.page || 0, parts.length - 1), list = parts[page];
  let lo = LO, hi = HI;
  if (fits(list, hi)) lo = hi; else for (let i = 0; i < 8; i++) { const mid = (lo + hi) / 2; if (fits(list, mid)) lo = mid; else hi = mid; }
  make(list, Math.floor(lo * 2) / 2);
  if (ctx.dir) cols.animate([{ transform: `translateX(${ctx.dir * 90}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: 'ease-out' });
  return parts.length;
}

// Eigenes Nachmessen wie in viz-map: aendert sich die Flaeche nach dem Zeichnen (Headless-Chrome rechnet anfangs kleiner),
// zeichnet der Baustein sofort im Beobachter neu, sonst steht bis zum verzoegerten Neuzeichnen des Rahmens eine zu kleine Schrift.
// Nicht waehrend des Show-Effekts.
let last = null, revealing = false;
const ro = new ResizeObserver(() => {
  if (!last || revealing || !last.box.isConnected || last.box.hidden) return;
  const { box, ctx, w, h } = last; if (Math.abs(box.clientWidth - w) < 2 && Math.abs(box.clientHeight - h) < 2) return;
  draw(box, { ...ctx, dir: 0 }); });
function draw(box, ctx) {
  if (!last || last.box !== box) ro.observe(box);
  last = { box, ctx, w: box.clientWidth, h: box.clientHeight };
  const m = model(ctx);
  if (!m.slots.length || !m.spaces.length) { box.textContent = ''; return { count: 0, pages: 1 }; }
  if (ctx.focus != null && m.rounds[ctx.focus]) return { count: m.rounds.length, pages: focusView(box, ctx, m, ctx.focus) };
  overview(box, ctx, m);
  return { count: m.rounds.length, pages: 1 };
}

// ---------- Show-Effekt
async function reveal(box, ctx) {
  const m = model(ctx), sleep = ctx.sleep, from = ctx.from || new Map();
  if (!m.slots.length || !m.spaces.length) return;
  const v = overview(box, ctx, m);
  const fade = (e, ms, delay = 0, dy = 0) => e.animate([{ opacity: 0, transform: `translateY(${dy}px)` }, { opacity: 1, transform: 'none' }], { duration: ms, delay, easing: 'ease-out', fill: 'backwards' });
  const frame = [...v.rooms, ...v.times, ...v.bands, ...v.cells];
  frame.forEach(e => e.style.opacity = 0);
  v.cards.forEach(c => { c.style.visibility = 'hidden'; c.style.zIndex = 4; }); v.mores.forEach(x => x.style.visibility = 'hidden');
  v.opens.forEach(o => o.style.visibility = 'hidden'); if (v.strip) v.strip.firstChild.style.visibility = 'hidden';
  // Geister-Mosaik an den alten Plaetzen
  const B = box.getBoundingClientRect(), ghost = el('div', null, N + 'ghost'), ghosts = new Map();
  const mb = document.querySelector('#mosaic .block'); ghost.style.fontSize = (mb && mb.style.fontSize) || '12px'; ghost.style.setProperty('--lines', 3);
  from.forEach((a, id) => { const r = m.byId.get(id); if (!r || !a.width) return;
    const g = el('div', null, 'tile'); g.append(el('span', r.body));
    g.style.cssText = `left:${a.left - B.left}px;top:${a.top - B.top}px;width:${a.width}px;height:${a.height}px`; ghost.append(g); ghosts.set(id, g); });
  box.append(ghost);
  await sleep(350);
  // 1. Das leere Raster: Raeume, Zeiten, Zellen
  ghost.style.opacity = .45;
  v.rooms.forEach((e, i) => { e.style.opacity = ''; fade(e, 450, i * 90, 8); });
  v.times.forEach((e, i) => { e.style.opacity = ''; fade(e, 450, 250 + i * 90, 0); });
  [...v.cells, ...v.bands].forEach((e, i) => { e.style.opacity = ''; fade(e, 500, 350 + i * 18); });
  await sleep(1100);
  ghost.style.opacity = 1; ghosts.forEach(g => g.style.opacity = .3);
  // Geister fliegen auf ein Ziel (Karte, „+ n weitere“) und gehen darin auf
  const into = (b, ids, color) => ids.forEach((id, j) => { j = Math.min(j, 10); const g = ghosts.get(id); if (!g) return; ghosts.delete(id);
    const a = g.getBoundingClientRect(); g.style.opacity = 1; g.style.zIndex = 5; g.classList.add('c-' + (color || 'none'));
    const T = `translate(${b.left - a.left}px,${b.top - a.top}px) scale(${b.width / a.width},${b.height / a.height})`;
    g.animate([{ transform: 'none', transformOrigin: '0 0' }, { transform: T, transformOrigin: '0 0' }], { duration: 1200, delay: 60 + j * 70, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
    g.animate([{ opacity: 1 }, { opacity: 1, offset: .78 }, { opacity: 0 }], { duration: 1200, delay: 60 + j * 70, fill: 'forwards' });
    setTimeout(() => g.remove(), 1400 + j * 70); });
  // 2. Runde fuer Runde fliegen die Vorschlaege in ihre Zellen; zusammengelegte fliegen in eine Karte
  const per = Math.max(900, Math.min(1500, 5600 / Math.max(1, m.rounds.length)));
  for (const sl of m.rounds) {
    const t = v.times.find(x => x._slot === sl.i); if (t) t.classList.add(N + 'lit');
    const mine = v.cards.filter(c => c._s.slot === sl.i);
    const merged = mine.filter(c => c._s.ids.length > 1);
    merged.forEach(c => c._foot.querySelector('.' + N + 'merged').style.visibility = 'hidden');
    const targets = new Map(mine.map(c => [c, c.getBoundingClientRect()]));
    mine.forEach(c => { c.style.visibility = ''; c.dataset.id = c._s.ids[0];
      const g = ghosts.get(c._s.ids[0]); if (g) { g.remove(); ghosts.delete(c._s.ids[0]); } });
    ctx.flip(box, from);
    mine.forEach(c => delete c.dataset.id);
    mine.forEach(c => into(targets.get(c), c._s.ids.slice(1), c._s.theme.color));   // weitere Vorschlaege derselben Session gehen in der Karte auf
    // Zelle mit „+ n weitere“: deren Vorschlaege fliegen in diesen Hinweis
    v.mores.filter(x => x._slot === sl.i).forEach(x => { x.style.visibility = ''; fade(x, 400, 300); into(x.getBoundingClientRect(), x._ids, null); });
    await sleep(Math.min(1250, per));
    merged.forEach(c => { const h = c._foot.querySelector('.' + N + 'merged'); h.style.visibility = ''; fade(h, 400);
      c.animate([{ boxShadow: '0 0 0 3px #40BFC0, 0 1px 3px rgba(0,0,0,.11)' }, { boxShadow: '0 1px 3px rgba(0,0,0,.11)' }], { duration: 900, easing: 'ease-out' }); });
    await sleep(Math.max(0, per - 1250) + 150);
    if (t) t.classList.remove(N + 'lit');
  }
  // 3. Vorschlaege ohne Platz
  if (v.strip) { const lab = v.strip.firstChild; lab.style.visibility = ''; fade(lab, 400);
    const shown = v.opens.filter(o => !o.hidden), more = v.strip.querySelector('.' + N + 'more');
    shown.forEach(o => { o.style.visibility = ''; o.style.position = 'relative'; o.style.zIndex = 4; o.dataset.id = o.dataset.mid;
      const g = ghosts.get(o.dataset.mid); if (g) { g.remove(); ghosts.delete(o.dataset.mid); } });
    if (more) into(more.getBoundingClientRect(), v.opens.filter(o => o.hidden).map(o => o.dataset.mid), 'gelb');   // was nicht in die Leiste passt, geht in „+ n weitere“ auf
    ctx.flip(box, from); shown.forEach(o => delete o.dataset.id);
    await sleep(more ? 1700 : 1200); }
  ghost.style.opacity = 0; await sleep(500); ghost.remove();
  await sleep(300);
}

VIZ.agenda = { draw, reveal: async (b, c) => { revealing = true; try { await reveal(b, c); } catch (e) { console.error('viz-agenda reveal', e); } finally { revealing = false; } } };
})();
