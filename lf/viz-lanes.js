// Darstellungs-Baustein 'lanes' (feste Bahnen) fuer die LibraFlow-Wand. Stand 12.11.2026.
// Fuer Strukturen mit festen Kategorien nebeneinander: What, So What, Now What? (Was? → Na und? → Was nun?),
// TRIZ (3 Schritte), Min Specs („Muss“ / „Darf nicht“). 2 bis 4 Bahnen.
//
// Payload (von der KI):
// { viz: 'lanes',
//   flow: true,                      // optional, Standard true: Pfeile von links nach rechts zwischen den Bahnen. false = gleichrangige Bahnen (z. B. Min Specs).
//   lanes: [                         // 2–4 Bahnen, Reihenfolge = links nach rechts
//     { label: 'Was?',               // Ueberschrift der Bahn
//       hint: 'Beobachtungen',       // optional: Untertitel (was in die Bahn gehoert)
//       color: 'blau',               // optional: gelb grün blau rosa orange lila türkis koralle; Standard blau, lila, grün, orange
//       ids: [1, 2, 3],              // Post-its dieser Bahn (Zuordnung durch die KI, nicht row.step)
//       summary: 'Ein Satz der KI.', // optional: dezenter KI-Satz unter der Ueberschrift
//       themes: [{ label: 'Unterthema', ids: [1, 2] }]   // optional: Gruppen innerhalb der Bahn; Rest erscheint unter „Weitere“
//     } ] }
//
// Erweiterungen (12.11., fuer Min Specs und WINFY; beide optional, ohne sie bleibt alles wie bei What, So What, Now What?):
//   lanes[k].emphasis: 'muted' | 'strong'
//       'muted'  = Material: Post-its grau und gedaempft (z. B. „Max Specs“, alle gesammelten Regeln).
//                  Post-its, die zusaetzlich in einer anderen Bahn stehen, behalten dort die Farbe jener Bahn: so sieht man, was ausgesiebt wurde.
//       'strong' = Ergebnis: Schrift wird nicht an die anderen Bahnen angeglichen, sondern so gross wie es passt (z. B. die wenigen Min Specs).
//                  Steht ein Post-it schon in einer frueheren Bahn, fliegt es im Show-Effekt von dort herueber.
//   badges: { '<id>': 'Yes' }   // kleines Text-Abzeichen unten im Post-it (z. B. WINFY-Antworten „Yes“, „No“, „I will try“, „Whatever“).
//       Bekannte Antworten bekommen eine dezente Toenung, jeder andere Text ein neutrales Abzeichen.
//   banner: { label: 'Purpose', hint: 'Warum ist diese Arbeit wichtig?', color: 'türkis', ids: [..], summary: '…', statement: '…' }
//       (12.11., fuer Purpose-to-Practice; optional) Dach-Karte ueber allen Bahnen: links der von der KI verdichtete Satz (statement) gross,
//       rechts die einzelnen Beitraege klein. Zaehlt als Ding 0 (count = Bahnen + 1, Bahn k ist dann Ding k + 1).
//       Fokus 0: Satz gross, KI-Satz (summary), alle Beitraege im Volltext.
//       Fokus auf eine Bahn: die Dach-Karte bleibt als schmale Zeile oben stehen. Show-Effekt: erst das Dach, dann Bahn fuer Bahn.
//       Hinweis: Die Verweise der KI-Auswertung im Rahmen (Label = Bahn-Label) zielen auf Ding k; mit banner muesste der Rahmen k + 1 rufen.
// Post-its, die in keiner Bahn stehen, zeigt der Baustein nicht. Ein Post-it erscheint hoechstens einmal je Bahn.
// count = Zahl der Bahnen. Fokus k = nur Bahn k, ueber die ganze Breite; rechts ein Pfeil mit Nummer und Name des naechsten Dings,
// links dezent einer zum vorigen (Felix, 12.11.: keine zusammengeklappten Streifen mehr).
(() => {
  const P = 'vz-lanes-';
  const css = `
  .${P}row { position: absolute; inset: 0; display: flex; align-items: stretch; }
  .${P}lane { position: relative; min-width: 0; display: flex; flex-direction: column; background: #fff; border-radius: 10px;
              box-shadow: 0 1px 3px rgba(0,0,0,.09); border-top: 6px solid var(--acc); padding: 10px 12px 10px; }
  .${P}head { flex: none; display: flex; align-items: center; gap: .4em; font-weight: 800; line-height: 1.15; cursor: pointer; white-space: nowrap; min-width: 0;
              font-size: clamp(18px, 1.55vw, 30px); }
  .${P}one .${P}head { font-size: clamp(22px, 2.2vw, 40px); cursor: default; }
  .${P}num { flex: none; display: inline-grid; place-items: center; width: 1.3em; height: 1.3em; border-radius: 50%; background: var(--acc); color: #fff; font-size: .78em; }
  .${P}label { overflow: hidden; text-overflow: ellipsis; }
  .${P}n { font-weight: 400; color: #5F5F5F; }
  .${P}back { flex: none; border: 1px solid #C9C9C2; background: none; cursor: pointer; font: inherit; font-weight: 400; font-size: 15px; color: #5F5F5F;
              padding: 3px 12px; border-radius: 999px; margin-right: .3em; }
  .${P}hint { flex: none; color: #5F5F5F; font-size: clamp(12px, .85vw, 16px); margin: 1px 0 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .${P}one .${P}hint { font-size: clamp(14px, 1.1vw, 20px); }
  .${P}sum { flex: none; margin: 7px 0 0; padding: 5px 10px 6px; border-radius: 6px; background: #EAF9F9; color: #1C1917; line-height: 1.3;
             font-size: clamp(12px, .9vw, 18px); border-left: 3px solid #40BFC0; }
  .${P}one .${P}sum { font-size: clamp(15px, 1.3vw, 24px); padding: 7px 14px 8px; }
  .${P}row:not(.${P}one) .${P}lane .${P}sum { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 4; overflow: hidden; }   /* sehr lange KI-Saetze verdraengen in der Uebersicht nicht die Post-its */
  .${P}sum b { color: #409E9F; font-weight: 700; margin-right: .35em; }
  .${P}body { flex: 1; min-height: 0; overflow: hidden; margin-top: 9px; scrollbar-width: thin; scrollbar-color: var(--acc) transparent; }
  .${P}more { flex: none; text-align: center; font-size: 13px; color: #5F5F5F; padding-top: 4px; }
  .${P}grp + .${P}grp { margin-top: .6em; }
  .${P}glabel { font-weight: 700; font-size: .95em; color: var(--acc); margin: 0 0 .25em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .${P}glabel span { font-weight: 400; color: #5F5F5F; }
  .${P}tiles { display: flex; flex-wrap: wrap; align-content: flex-start; gap: .28em; --lines: 3; }
  .${P}one .${P}tiles { --lines: 4; }
  .${P}one.${P}tight .${P}tiles { --lines: 3; }
  .${P}arrow { flex: none; width: 30px; position: relative; }
  .${P}arrow svg { position: absolute; left: 3px; width: 24px; height: 24px; }
  .${P}gap { flex: none; width: 14px; }
  /* Einzelansicht: nur ein Ding gross; am Rand ein ruhiger Pfeil zum naechsten (rechts) bzw. vorigen (links) (Felix, 12.11.) */
  .${P}nav { flex: none; width: clamp(80px, 6vw, 120px); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
             cursor: pointer; color: #5F5F5F; font-size: clamp(14px, .9vw, 17px); text-align: center; border-radius: 10px; padding: 0 4px; transition: background .2s; }
  .${P}nav:hover { background: rgba(0,0,0,.035); }
  .${P}nav .${P}num { font-size: clamp(18px, 1.4vw, 26px); font-weight: 800; }
  .${P}chev { font-size: clamp(34px, 2.6vw, 52px); line-height: .8; color: #409E9F; font-weight: 300; }
  .${P}nlab { line-height: 1.2; max-width: 100%; overflow-wrap: break-word; hyphens: auto; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; }
  .${P}nav:empty { cursor: default; background: none; }
  .${P}prev { opacity: .7; }
  .${P}prev .${P}num { font-size: clamp(15px, 1.1vw, 20px); }
  /* eng: wenn es sonst nicht passt, erst Rand und Untertitel sparen, dann blaettern */
  .${P}tight .${P}lane { padding: 7px 10px 8px; }
  .${P}tight .${P}hint { display: none; }
  .${P}tight .${P}sum { margin-top: 5px; padding: 3px 8px 4px; }
  .${P}tight .${P}body { margin-top: 6px; }
  .${P}tight .${P}grp + .${P}grp { margin-top: .4em; }
  /* Erweiterungen: gedaempfte Material-Bahn, Abzeichen */
  .${P}muted { border-top-color: #C9C9C2; }
  .${P}muted .${P}head, .${P}muted .${P}glabel { color: #5F5F5F; }
  .${P}strong .tile { flex: 1 1 100% !important; max-width: 100% !important; height: auto; }
  .${P}strong .tile span:first-child { display: block; }   /* wenige Ergebnisse: ganzer Text, keine Kuerzung */
  .${P}strong .${P}head { display: block; white-space: normal; }
  .${P}strong .${P}num { vertical-align: .12em; margin-right: .3em; }
  .${P}strong .${P}n { margin-left: .25em; white-space: nowrap; }
  .tile.${P}dim { background: #F1F1EC; color: #6B6B66; box-shadow: none; outline: 1px solid #E2E2DA; }
  .tile.${P}kept { box-shadow: 0 0 0 2px var(--kacc), 0 1px 2px rgba(0,0,0,.16); font-weight: 600; }
  .tile.${P}badged { display: flex; flex-direction: column; height: calc(var(--lines) * 1.25em + 1.95em); }
  .${P}badge { flex: none; margin-top: auto; align-self: flex-start; font-size: .82em; font-weight: 700; line-height: 1.2; padding: .1em .6em; border-radius: 999px;
               background: rgba(255,255,255,.75); color: #5F5F5F; border: 1px solid rgba(0,0,0,.12); white-space: nowrap; max-width: 100%; box-sizing: border-box; overflow: hidden; text-overflow: ellipsis; }
  .tile .${P}badge { display: block; white-space: nowrap; -webkit-line-clamp: none; }   /* gegen die Kachel-Regel „.tile span“ des Rahmens: Abzeichen einzeilig, langer Text mit … */
  .${P}b-yes { color: #2F6F70; border-color: #9FD8D8; background: #F1FBFB; }
  .${P}b-no { color: #6B6B66; border-color: #C9C9C2; background: #FAFAF7; }
  .${P}b-try { color: #8A6400; border-color: #F3D27A; background: #FFF8E2; }
  .${P}b-whatever { color: #6B6B66; border-color: #DADAD2; background: transparent; font-weight: 400; font-style: italic; }
  /* Dach-Karte (banner) */
  .${P}ban { position: absolute; left: 0; right: 0; top: 0; display: flex; gap: 20px; background: #fff; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,.09);
             border-left: 6px solid var(--acc); padding: 10px 14px 10px 16px; }
  .${P}bleft { flex: 1.2 1 0; min-width: 0; display: flex; flex-direction: column; }
  .${P}bright { flex: 1 1 0; min-width: 0; position: relative; }
  .${P}bright > .${P}body { position: absolute; inset: 0; margin: 0; }
  .${P}stmt { font-weight: 700; line-height: 1.25; color: #1C1917; margin: 8px 0 0; font-size: clamp(19px, 1.6vw, 32px); }
  .${P}stmt b, .${P}bslim b { color: #409E9F; font-size: .62em; vertical-align: .2em; margin-right: .45em; letter-spacing: .03em; }
  .${P}ban .${P}more { position: absolute; left: 0; right: 0; bottom: 0; padding: 0; }
  .${P}bslim { position: absolute; left: 0; right: 0; top: 0; display: flex; align-items: center; gap: .45em; background: #fff; border-radius: 10px;
               box-shadow: 0 1px 3px rgba(0,0,0,.09); border-left: 6px solid var(--acc); padding: 7px 14px; cursor: pointer; white-space: nowrap;
               font-size: clamp(15px, 1.05vw, 21px); }
  .${P}bslim:hover { box-shadow: 0 2px 8px rgba(0,0,0,.2); }
  .${P}bslim .${P}label { font-weight: 800; flex: none; }
  .${P}bslim .${P}stmt b { font-size: .8em; vertical-align: .05em; }
  .${P}bslim .${P}stmt { margin: 0; font-size: 1em; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
  .${P}bbig { position: relative; flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; background: #fff; border-radius: 10px;
              box-shadow: 0 1px 3px rgba(0,0,0,.09); border-top: 6px solid var(--acc); padding: 10px 14px; }
  .${P}bbig .${P}head { font-size: clamp(22px, 2.2vw, 40px); cursor: default; }
  .${P}bbig .${P}hint { font-size: clamp(14px, 1.1vw, 20px); }
  .${P}bbig .${P}stmt { font-size: clamp(24px, 2.4vw, 46px); margin: 10px 0 2px; }
  .${P}bbig .${P}sum { font-size: clamp(15px, 1.2vw, 22px); }
  .${P}bbig .${P}tiles { --lines: 4; }
  .${P}bbig .tile { height: auto; min-height: calc(2 * 1.25em + .7em); }
  .${P}bbig .tile span:first-child { display: block; }   /* Fokus auf das Dach: alle Beitraege im Volltext */
  .${P}ghost { position: absolute; inset: 0; z-index: 2; pointer-events: none; --lines: 3; }
  .${P}ghost .tile { position: absolute; }
  `;
  document.head.append(Object.assign(document.createElement('style'), { textContent: css }));

  const ACC = { gelb: '#B98D00', 'grün': '#3E9B63', blau: '#3F73C4', rosa: '#C4507F', orange: '#D07A22', lila: '#7A5CC2', 'türkis': '#409E9F', koralle: '#D9644A', none: '#8A8A80' };
  const DEF = ['blau', 'lila', 'grün', 'orange'];
  const FLOOR = { all: 14, one: 17 }, CEIL = { all: 32, one: 44 };
  const emW = (t, lines, cap) => Math.max(8, Math.min(t.length, cap)) / lines * 0.5 + 1.7;
  const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#EAF9F9"/><path d="M10 7l5 5-5 5" fill="none" stroke="#409E9F" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function lanesOf(ctx) {
    const byId = new Map(ctx.rows.filter(r => String(r.body || '').trim()).map(r => [String(r.id), r]));   // leere Post-its nicht als leere Kachel zeigen
    return ((ctx.data && ctx.data.lanes) || []).slice(0, 4).map((l, k) => {
      const color = ACC[l.color] ? l.color : DEF[k], seen = new Set();
      const rows = (l.ids || []).map(String).filter(i => byId.has(i) && !seen.has(i) && seen.add(i)).map(i => byId.get(i));
      let groups = [{ label: null, rows }];
      if (l.themes && l.themes.length) {
        const inLane = new Set(rows.map(r => String(r.id))), used = new Set();
        groups = l.themes.map(t => ({ label: t.label, rows: (t.ids || []).map(String).filter(i => inLane.has(i) && !used.has(i) && used.add(i)).map(i => byId.get(i)) }))
          .filter(g => g.rows.length);
        const rest = rows.filter(r => !used.has(String(r.id)));
        if (rest.length) groups.push({ label: 'Weitere', rows: rest });
      }
      return { ...l, k, color, rows, groups };
    });
  }

  // Wo ein Post-it einer gedaempften Bahn sonst noch steht: id → Farbe der ersten nicht gedaempften Bahn
  function keptOf(lanes) {
    const m = new Map();
    lanes.forEach(l => { if (l.emphasis !== 'muted') l.rows.forEach(r => { if (!m.has(String(r.id))) m.set(String(r.id), l.color); }); });
    return m;
  }
  const BADGE = { yes: 'yes', ja: 'yes', no: 'no', nein: 'no', 'i will try': 'try', 'ich versuche es': 'try', whatever: 'whatever' };

  // Seite p von n einer Bahn: Post-its in Reihenfolge der Gruppen gleichmaessig verteilt, Gruppenkoepfe wiederholt
  function chunk(lane, n, p) {
    if (n <= 1) return lane.groups;
    const flat = lane.groups.flatMap(g => g.rows.map(r => ({ g, r }))), size = Math.ceil(flat.length / n), out = [];
    flat.slice(p * size, (p + 1) * size).forEach(({ g, r }) => {
      const last = out[out.length - 1];
      if (last && last.src === g) last.rows.push(r); else out.push({ src: g, label: g.label, rows: [r], total: g.rows.length });
    });
    return out;
  }

  function tile(r, cls, lines, cap, badge) {
    const e = document.createElement('div'), w = emW(r.body, lines, cap) + (badge ? .4 : 0);
    e.className = 'tile ' + cls; e.dataset.id = r.id; e.title = r.body;
    e.style.flex = `${Math.round(w * 10)} 1 ${w}em`; e.style.maxWidth = `min(${(w * 2.4).toFixed(2)}em, 100%)`;
    const s = document.createElement('span'); s.textContent = r.body; e.append(s);
    if (badge) { const b = document.createElement('span'); b.textContent = badge;
      b.className = P + 'badge' + (BADGE[String(badge).trim().toLowerCase()] ? ' ' + P + 'b-' + BADGE[String(badge).trim().toLowerCase()] : '');
      e.classList.add(P + 'badged'); e.append(b); }
    return e;
  }

  function laneEl(lane, groups, one, ctx, tight, kept) {
    const { el } = ctx, L = el('div', null, P + 'lane' + (lane.emphasis === 'muted' || lane.emphasis === 'strong' ? ' ' + P + lane.emphasis : ''));
    L.style.setProperty('--acc', ACC[lane.color]); L.dataset.lane = lane.k;
    const head = el('div', null, P + 'head');
    if (one) { const b = el('button', '← Alle', P + 'back'); b.onclick = () => ctx.go(null); head.append(b); }
    else head.onclick = () => ctx.go(lane.k);
    head.append(el('span', String(lane.k + 1 + (ctx.off || 0)), P + 'num'), el('span', lane.label, P + 'label'), el('span', '· ' + lane.rows.length, P + 'n'));
    L.append(head);
    if (lane.hint) L.append(el('div', lane.hint, P + 'hint'));
    if (lane.summary) { const s = el('div', null, P + 'sum'); s.title = lane.summary; s.append(el('b', 'KI'), document.createTextNode(lane.summary)); L.append(s); }
    const body = el('div', null, P + 'body'), inner = el('div', null, P + 'inner');
    const lines = one && !tight ? 4 : 3, cap = one ? 400 : 150;
    groups.forEach(g => {
      const G = el('div', null, P + 'grp');
      if (g.label) { const gl = el('div', g.label + ' ', P + 'glabel'); gl.append(el('span', '· ' + (g.total || g.rows.length))); G.append(gl); }
      const T = el('div', null, P + 'tiles');
      const badges = (ctx.data && ctx.data.badges) || {};
      g.rows.forEach(r => {
        const id = String(r.id), keep = lane.emphasis === 'muted' && kept.get(id);
        const t = tile(r, lane.emphasis === 'muted' ? (keep ? 'c-' + keep + ' ' + P + 'kept' : P + 'dim') : 'c-' + lane.color, lines, cap, badges[id]);
        if (keep) t.style.setProperty('--kacc', ACC[keep]);
        T.append(t);
      });
      G.append(T); inner.append(G);
    });
    body.append(inner); L.append(body);
    return { L, body, inner, head };
  }

  // groesste Schrift in [lo, hi], bei der die Bahn ganz hineinpasst; null, wenn selbst lo nicht reicht
  function fit(x, lo, hi) {
    const ok = f => { x.inner.style.fontSize = f + 'px'; return x.inner.offsetHeight <= x.body.clientHeight + 1; };
    if (!ok(lo)) return null;
    if (ok(hi)) return hi;
    for (let k = 0; k < 7; k++) { const mid = (lo + hi) / 2; if (ok(mid)) lo = mid; else hi = mid; }
    return lo;
  }

  // Textmenge je Bahn → Breitenanteil (gedaempft, damit die Bahnen als feste Spalten erkennbar bleiben)
  const weight = (lane, all) => {
    const v = l => l.rows.reduce((a, r) => a + emW(r.body, 3, 150) + .3, 0) + 20;
    const max = Math.max(...all.map(v));
    return lane.emphasis === 'strong' ? 0.42 : Math.max(0.55, Math.sqrt(v(lane) / max));   // wenige Ergebnisse: schmal, dafuer grosse Schrift
  };

  function build(box, ctx, lanes, n, p, tight) {
    const one = ctx.focus != null && lanes[ctx.focus], flow = ctx.data.flow !== false;
    box.textContent = '';
    const row = ctx.el('div', null, P + 'row' + (one ? ' ' + P + 'one' : '') + (tight ? ' ' + P + 'tight' : '')), xs = [], kept = keptOf(lanes);
    if (one || ctx.bannerFocus) {   // Einzelansicht: nur dieses eine Ding, die anderen nur als Pfeil am Rand (Felix, 12.11.)
      if (one) { const x = laneEl(one, chunk(one, n, p), true, ctx, tight, kept); x.lane = one; x.L.style.flex = '1 1 0'; row.append(x.L); xs.push(x); }
      box.append(row);
      const ban = ctx.ban ? bannerEl(box, row, ctx, one) : null;
      navs(row, ctx, lanes);
      return { row, xs, one: !!one, ban };
    }
    lanes.forEach((lane, k) => {
      if (k) row.append(flow ? Object.assign(ctx.el('div', null, P + 'arrow'), { innerHTML: ARROW }) : ctx.el('div', null, P + 'gap'));
      const x = laneEl(lane, chunk(lane, n, p), false, ctx, tight, kept);
      x.lane = lane;
      x.L.style.flex = `${weight(lane, lanes).toFixed(3)} 1 0`;
      row.append(x.L); xs.push(x);
    });
    box.append(row);
    const ban = ctx.ban ? bannerEl(box, row, ctx, false) : null;
    // Pfeile auf Hoehe der Ueberschriften
    const h = row.querySelector('.' + P + 'lane .' + P + 'head');
    if (h) { const top = h.offsetTop + h.offsetHeight / 2 - 12 + (h.closest('.' + P + 'lane') || h).offsetTop;
      row.querySelectorAll('.' + P + 'arrow svg').forEach(s => s.style.top = top + 'px'); }
    return { row, xs, one: false, ban };
  }

  // Pfeile der Einzelansicht: rechts zum naechsten Ding (Nummer in dessen Farbe, Name klein darunter), links dezent zum vorigen.
  // Ding-Nummern wie in der Uebersicht: mit Dach-Karte ist das Dach Ding 0, Bahn k ist Ding k + 1.
  function navs(row, ctx, lanes) {
    const off = ctx.ban ? 1 : 0, go = ctx.go0 || ctx.go, cur = ctx.bannerFocus ? 0 : ctx.focus + off, total = lanes.length + off;
    const thing = t => off && t === 0 ? { label: ctx.ban.label, color: ACC[ctx.ban.color] ? ctx.ban.color : 'türkis' } : lanes[t - off];
    const nav = (t, d) => { const x = thing(t), e = ctx.el('div', null, P + 'nav ' + P + (d > 0 ? 'next' : 'prev'));
      e.title = x.label; e.onclick = () => go(t, d); e.style.setProperty('--acc', ACC[x.color]);
      const num = ctx.el('span', String(t + 1), P + 'num'), chev = ctx.el('span', d > 0 ? '›' : '‹', P + 'chev');
      e.append(...(d > 0 ? [num, chev] : [chev, num]), ctx.el('span', x.label, P + 'nlab')); return e; };
    if (cur > 0) row.prepend(nav(cur - 1, -1)); else row.prepend(ctx.el('div', null, P + 'nav'));   // leerer Platz links: Ding bleibt mittig
    row.append(cur + 1 < total ? nav(cur + 1, 1) : ctx.el('div', null, P + 'nav'));
  }

  // Dach-Karte: 'big' (Fokus 0, allein in der Zeile), 'slim' (Fokus auf eine Bahn), sonst volle Karte ueber den Bahnen
  function bannerEl(box, row, ctx, laneFocus) {
    const { el } = ctx, b = ctx.ban, acc = ACC[b.color] ? b.color : 'türkis';
    const stmt = (cls, big) => { const e = el('div', null, P + 'stmt'); if (b.statement) { e.append(el('b', 'KI'), document.createTextNode(b.statement)); } else e.textContent = b.summary || ''; return e; };
    const head = big => { const h = el('div', null, P + 'head');
      if (big) { const x = el('button', '← Alle', P + 'back'); x.onclick = () => ctx.go0(null); h.append(x); } else h.onclick = () => ctx.go0(0);
      h.append(el('span', '1', P + 'num'), el('span', b.label, P + 'label'), el('span', '· ' + b.rows.length, P + 'n')); return h; };
    const tiles = (lines, cap) => { const body = el('div', null, P + 'body'), inner = el('div', null, P + 'inner'), T = el('div', null, P + 'tiles');
      b.rows.forEach(r => T.append(tile(r, 'c-' + acc, lines, cap))); inner.append(T); body.append(inner); return { body, inner }; };
    if (laneFocus) {
      const e = el('div', null, P + 'bslim'); e.style.setProperty('--acc', ACC[acc]); e.title = b.label; e.onclick = () => ctx.go0(0);
      e.append(el('span', '1', P + 'num'), el('span', b.label, P + 'label'), stmt()); box.append(e);
      row.style.top = (e.offsetHeight + 10) + 'px'; return null;
    }
    if (ctx.bannerFocus) {
      const e = el('div', null, P + 'bbig'); e.style.setProperty('--acc', ACC[acc]);
      e.append(head(true)); if (b.hint) e.append(el('div', b.hint, P + 'hint')); if (b.statement) e.append(stmt());
      if (b.summary) { const s = el('div', null, P + 'sum'); s.append(el('b', 'KI'), document.createTextNode(b.summary)); e.append(s); }
      const x = tiles(4, 400); e.append(x.body); row.prepend(e);
      // sehr langer Satz: kleiner setzen (nicht unter 18 px), dann auf hoechstens 45 % der Karte kuerzen, damit die Beitraege sichtbar bleiben
      const st = e.querySelector('.' + P + 'stmt'), sm = e.querySelector('.' + P + 'sum'), H = e.clientHeight;
      if (st) { for (let fz = parseFloat(getComputedStyle(st).fontSize); st.offsetHeight > H * .45 && fz > 18; fz -= 2) st.style.fontSize = (fz - 2) + 'px'; clampTo(st, H * .45); }
      if (sm) clampTo(sm, H * .2);
      return { ...x, el: e, big: true };
    }
    const e = el('div', null, P + 'ban'), L = el('div', null, P + 'bleft'), R = el('div', null, P + 'bright');
    e.style.setProperty('--acc', ACC[acc]);
    L.append(head(false)); if (b.hint) L.append(el('div', b.hint, P + 'hint')); L.append(stmt());
    const x = tiles(3, 150); R.append(x.body); e.append(L, R); box.append(e);
    // Hoehe: so viel wie der Satz braucht, hoechstens ein Drittel; sonst den Satz etwas kleiner setzen (nicht unter 16 px)
    const H = box.clientHeight, cap = H * 0.34, st = L.querySelector('.' + P + 'stmt');
    for (let fz = parseFloat(getComputedStyle(st).fontSize); L.offsetHeight + 22 > cap && fz > 16; fz -= 1) st.style.fontSize = (fz - 1) + 'px';
    if (L.offsetHeight + 22 > cap) clampTo(st, cap - 22 - (L.offsetHeight - st.offsetHeight));   // passt selbst bei 16 px nicht: kuerzen statt ueber die Bahnen zu laufen
    const bh = Math.round(Math.min(Math.max(L.offsetHeight + 22, H * 0.2), cap));
    e.style.height = bh + 'px'; row.style.top = (bh + 14) + 'px';
    return { ...x, el: e, big: false };
  }

  // Text auf hoechstens maxH Pixel kuerzen (ganze Zeilen, mit …); voller Text im Tooltip
  function clampTo(e, maxH) {
    if (e.offsetHeight <= maxH + 1) return;
    const lh = parseFloat(getComputedStyle(e).lineHeight) || parseFloat(getComputedStyle(e).fontSize) * 1.25;
    Object.assign(e.style, { display: '-webkit-box', webkitBoxOrient: 'vertical', webkitLineClamp: String(Math.max(1, Math.floor(maxH / lh))), overflow: 'hidden' });
    e.title = e.textContent;
  }

  function bannerOf(ctx) {
    const b = ctx.data && ctx.data.banner; if (!b) return null;
    const byId = new Map(ctx.rows.filter(r => String(r.body || '').trim()).map(r => [String(r.id), r])), seen = new Set();
    return { ...b, label: b.label || 'Purpose', rows: (b.ids || []).map(String).filter(i => byId.has(i) && !seen.has(i) && seen.add(i)).map(i => byId.get(i)) };
  }

  function draw(box, ctx) {
    const ban = bannerOf(ctx);
    if (!ban) return drawLanes(box, ctx);
    // mit Dach-Karte: Ding 0 = Dach, Ding k + 1 = Bahn k
    const f = ctx.focus, sub = { ...ctx, ban, off: 1, go0: ctx.go, go: k => ctx.go(k == null ? null : k + 1), out: {}, bannerFocus: f === 0, focus: f == null || f === 0 ? null : f - 1 };
    const r = drawLanes(box, sub), x = sub.out.b && sub.out.b.ban;
    if (x) {
      const lo = x.big ? FLOOR.one : FLOOR.all, fs = fit(x, lo, x.big ? 30 : 18);
      x.inner.style.fontSize = (fs || lo) + 'px';
      if (x.inner.offsetHeight > x.body.clientHeight + 1) { x.body.style.overflowY = 'auto'; if (!x.big) x.body.style.bottom = '18px'; (x.big ? x.el : x.body.parentNode).append(ctx.el('div', '↓ weiter nach unten scrollen', P + 'more')); }
    }
    return { count: r.count + 1, pages: 1 };
  }

  function drawLanes(box, ctx) {
    const lanes = lanesOf(ctx);
    if (!lanes.length) { box.textContent = ''; return { count: 0, pages: 1 }; }
    if (ctx.focus != null && !lanes[ctx.focus]) ctx = { ...ctx, focus: null };
    const one = ctx.focus != null, lo = one ? FLOOR.one : FLOOR.all, hi = one ? CEIL.one : CEIL.all;
    // Schrift nie unter die lesbare Untergrenze: passt eine Bahn dann nicht, ist sie nach unten scrollbar (Felix, 12.11.). Kein Blaettern.
    const b = build(box, ctx, lanes, 1, 0, false); if (ctx.out) ctx.out.b = b;
    // Bahnen mit emphasis 'strong' werden nur untereinander angeglichen, nicht an die anderen (die wenigen Ergebnisse duerfen gross sein)
    const fs = b.xs.map(x => fit(x, lo, hi)), isS = i => b.xs[i].lane.emphasis === 'strong';
    const low = want => Math.min(...fs.filter((f, i) => isS(i) === want).map(f => f || lo));
    const least = low(false), leastS = low(true);
    b.xs.forEach((x, i) => { x.inner.style.fontSize = (fs[i] === null ? lo : Math.min(fs[i], (isS(i) ? leastS : least) * 1.25)) + 'px';
      if (x.inner.offsetHeight > x.body.clientHeight + 1) { x.body.style.overflowY = 'auto'; x.L.append(ctx.el('div', '↓ weiter nach unten scrollen', P + 'more')); } });
    if (ctx.dir) b.row.animate([{ transform: `translateX(${ctx.dir * 90}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: 'ease-out' });
    return { count: lanes.length, pages: 1 };
  }

  // Show-Effekt: das ungeordnete Mosaik bleibt als Bild liegen; Bahn fuer Bahn erscheint die Ueberschrift,
  // ihre Post-its faerben sich im Mosaik und fliegen in die Bahn. Zum Schluss Pfeile und die KI-Saetze.
  async function reveal(box, ctx) {
    const { sleep } = ctx, from = ctx.from || new Map(), lanes = lanesOf(ctx);
    draw(box, { ...ctx, focus: null, page: 0, dir: 0 });
    const row = box.querySelector('.' + P + 'row'); if (!row) return;
    const laneEls = [...row.querySelectorAll('.' + P + 'lane')];
    const fade = (e, ms, delay = 0, dx = 0) => e.animate([{ opacity: 0, transform: `translateX(${dx}px)` }, { opacity: 1, transform: 'none' }], { duration: ms, delay, easing: 'ease-out', fill: 'backwards' });
    laneEls.forEach(L => { L.style.opacity = 0; L.querySelectorAll('.tile').forEach(t => t.style.visibility = 'hidden');
      const s = L.querySelector('.' + P + 'sum'); if (s) s.style.opacity = 0; });
    row.querySelectorAll('.' + P + 'arrow').forEach(a => a.style.opacity = 0);
    const ban = box.querySelector('.' + P + 'ban'), bst = ban && ban.querySelector('.' + P + 'stmt');
    const bmore = ban && ban.querySelector('.' + P + 'more');
    if (ban) { ban.style.opacity = 0; ban.querySelectorAll('.tile').forEach(t => t.style.visibility = 'hidden'); if (bst) bst.style.opacity = 0; if (bmore) bmore.style.opacity = 0; }
    // Geister-Mosaik an den alten Plaetzen
    const B = box.getBoundingClientRect(), ghost = ctx.el('div', null, P + 'ghost'), ghosts = new Map();
    const mb = document.querySelector('#mosaic .block'); ghost.style.fontSize = (mb && mb.style.fontSize) || '12px';
    const byId = new Map(ctx.rows.map(r => [String(r.id), r]));
    from.forEach((a, id) => { const r = byId.get(id); if (!r || !a.width) return;
      const g = ctx.el('div', null, 'tile' + (ctx.s && ctx.s.show && r.step !== ctx.s.show[0] ? ' alt' : '')); g.append(ctx.el('span', r.body));
      g.style.cssText = `left:${a.left - B.left}px;top:${a.top - B.top}px;width:${a.width}px;height:${a.height}px`;
      ghost.append(g); ghosts.set(id, g); });
    box.append(ghost);
    // Restliches Mosaik liegt unter den schon erschienenen Bahnen (nichts ueberdeckt fertige Bahnen); fliegende Kacheln liegen darueber
    ghost.style.zIndex = 'auto'; laneEls.forEach(L => L.style.zIndex = 1); if (ban) ban.style.zIndex = 1;
    const lift = g => { g.style.zIndex = 3; };
    await sleep(400);
    // Mosaik rueckt unter die Kopfzeilen der Bahnen, damit die Ueberschriften frei erscheinen koennen
    const top = Math.max(...laneEls.map(L => L.querySelector('.' + P + 'body').getBoundingClientRect().top)) - B.top, sc = Math.min(1, (B.height - top) / B.height);
    if (ghosts.size && sc < 1) {   // jede Kachel bekommt sofort ihren neuen Platz und gleitet dorthin (Endlage haengt nicht an der Animation)
      const dx = B.width * (1 - sc) / 2;
      ghost.style.fontSize = parseFloat(ghost.style.fontSize) * sc + 'px';
      ghosts.forEach(g => { const x = parseFloat(g.style.left), y = parseFloat(g.style.top), w = parseFloat(g.style.width), h = parseFloat(g.style.height);
        g.style.cssText = `left:${dx + x * sc}px;top:${top + y * sc}px;width:${w * sc}px;height:${h * sc}px;transform-origin:0 0`;
        g.animate([{ transform: `translate(${x - dx - x * sc}px,${y - top - y * sc}px) scale(${1 / sc})` }, { transform: 'none' }], { duration: 700, easing: 'ease-in-out' }); });
      await sleep(760);
    }
    await sleep(200);
    if (ban) {   // erst das Dach: Beitraege fliegen zusammen, dann erscheint der verdichtete Satz
      ban.style.opacity = 1; fade(ban, 500, 0, 0);
      const tiles = [...ban.querySelectorAll('.tile')], vb = ban.querySelector('.' + P + 'body').getBoundingClientRect();
      tiles.forEach((t, j) => { const g = ghosts.get(t.dataset.id); if (g) { lift(g); setTimeout(() => { g.className = t.className + ' pop'; }, Math.min(j * 25, 500)); } });
      await sleep(Math.min(tiles.length * 25, 500) + 650);
      tiles.forEach((t, j) => {
        const g = ghosts.get(t.dataset.id), b = t.getBoundingClientRect(), delay = Math.min(j * 8, 400);
        if (!g) { t.style.visibility = ''; fade(t, 400, delay); return; }
        if (b.top > vb.bottom || b.bottom < vb.top) { g.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, delay, fill: 'forwards' }); return; }   // weggescrollt: verblassen
        const a = g.getBoundingClientRect(); g.style.transformOrigin = '0 0';
        g.animate([{ transform: 'none' }, { transform: `translate(${b.left - a.left}px,${b.top - a.top}px) scale(${b.width / a.width},${b.height / a.height})` }],
                  { duration: 1000, delay, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
      });
      await sleep(1450);
      tiles.forEach(t => { t.style.visibility = ''; const g = ghosts.get(t.dataset.id); if (g) { g.remove(); ghosts.delete(t.dataset.id); } });
      if (bmore) bmore.style.opacity = 1;
      if (bst) { bst.style.opacity = 1; bst.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 900, easing: 'ease-out', fill: 'backwards' }); await sleep(1300); }
    }
    for (const lane of lanes) {
      const L = laneEls[lane.k]; if (!L) continue;
      const tiles = [...L.querySelectorAll('.tile')];
      tiles.forEach(t => { const g = ghosts.get(t.dataset.id); if (g) lift(g); });   // eigene Kacheln vor dem Einblenden der Bahn anheben, sonst verschwinden sie kurz darunter
      L.style.opacity = 1; fade(L, 500, 0, -24);
      tiles.forEach((t, j) => { const g = ghosts.get(t.dataset.id); if (g) setTimeout(() => { g.className = t.className.replace(P + 'badged', '') + ' pop';
        if (t.style.getPropertyValue('--kacc')) g.style.setProperty('--kacc', t.style.getPropertyValue('--kacc')); }, Math.min(j * 25, 500)); });
      // Post-its, die schon in einer frueheren Bahn stehen (Auswahl, z. B. Min Specs aus Max Specs): Kopie fliegt von dort herueber
      tiles.forEach(t => { if (ghosts.has(t.dataset.id)) return;
        const src = [...row.querySelectorAll('.tile[data-id="' + t.dataset.id + '"]')].find(o => o !== t && o.style.visibility !== 'hidden' && !L.contains(o));
        if (!src) return; const a = src.getBoundingClientRect(), vb = src.closest('.' + P + 'body').getBoundingClientRect();
        if (a.top < vb.top || a.bottom > vb.bottom + 1) return;   // weggescrollte Quelle: lieber einblenden als aus dem Nichts fliegen
        const g = src.cloneNode(true);
        g.style.cssText = `left:${a.left - B.left}px;top:${a.top - B.top}px;width:${a.width}px;height:${a.height}px;font-size:${getComputedStyle(src).fontSize};z-index:3`;
        ghost.append(g); ghosts.set(t.dataset.id, g); });
      await sleep(Math.min(tiles.length * 25, 500) + 650);
      const vb = L.querySelector('.' + P + 'body').getBoundingClientRect();
      tiles.forEach((t, j) => {
        const g = ghosts.get(t.dataset.id), b = t.getBoundingClientRect(), delay = Math.min(j * 8, 400);
        if (!g) { t.style.visibility = ''; fade(t, 400, delay); return; }
        if (b.top > vb.bottom || b.bottom < vb.top) { g.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, delay, fill: 'forwards' }); return; }   // unterhalb der Bahn (scrollbar): verblassen statt aus dem Bild fliegen
        const a = g.getBoundingClientRect(); g.style.transformOrigin = '0 0';
        g.animate([{ transform: 'none' }, { transform: `translate(${b.left - a.left}px,${b.top - a.top}px) scale(${b.width / a.width},${b.height / a.height})` }],
                  { duration: 1000, delay, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
      });
      await sleep(1450);
      tiles.forEach(t => { t.style.visibility = ''; const g = ghosts.get(t.dataset.id); if (g) { g.remove(); ghosts.delete(t.dataset.id); } });
    }
    ghost.querySelectorAll('.tile').forEach(g => g.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: 'forwards' }));
    row.querySelectorAll('.' + P + 'arrow').forEach((a, i) => { a.style.opacity = 1; fade(a, 500, i * 150, -10); });
    await sleep(600); ghost.remove();
    for (const L of laneEls) { const s = L.querySelector('.' + P + 'sum'); if (s) { s.style.opacity = 1; fade(s, 600); await sleep(550); } }
    await sleep(600);
  }

  VIZ.lanes = { draw, reveal: (b, c) => reveal(b, c).catch(e => console.error('viz-lanes reveal', e)) };   // Fehler im Show-Effekt: Rahmen zeichnet trotzdem den Endzustand
})();
