// LibraFlow Mobile-First · Test-Prototyp 11.11.2026. Gemeinsame Konfiguration fuer Handy, Wand und Steuerung.
// Ablauf hier anpassen: mode = wait | one | many | scribe | away.  show = Schritte, deren Post-its die Wand in diesem Schritt zeigt.
const API = 'https://yxdayqzsefbcqkdcadmt.supabase.co/rest/v1/rpc/';
const KEY = 'sb_publishable_6rC8dThCa0lJhXe5_g9M-Q_OLUvlRVJ';
const MAX = 500;
const TOPIC = 'Was macht für dich ein Treffen aus, aus dem du mit mehr Energie herausgehst, als du hineingegangen bist?';

const STEPS = [
  { id: 0, mode: 'wait', label: 'Ankommen', q: 'Gleich geht es los.', show: [] },
  { id: 1, mode: 'one', label: 'Ankommen', q: 'Womit kommst du heute hier an?',
    how: 'Ein Satz oder ein paar Stichworte. Schreib so, dass andere deinen Gedanken nachvollziehen können.', show: [1], solo: true },
  { id: 2, mode: 'many', label: '1-2-4-All · allein', q: TOPIC,
    how: 'Zwei stille Minuten für dich. Ein Gedanke pro Post-it, so viele du magst.', show: [2], solo: true },
  { id: 3, mode: 'away', label: '1-2-4-All · zu zweit', q: TOPIC,
    how: 'Erzählt euch, was ihr notiert habt. Was ist ähnlich, was überrascht euch?', show: [2] },
  { id: 4, mode: 'scribe', label: '1-2-4-All · zu viert', q: 'Was ist euch als Gruppe am wichtigsten?',
    how: 'Sprecht miteinander. Eine Person hält am Ende fest, was der Gruppe wichtig ist.', show: [4] },
  { id: 5, mode: 'away', label: '1-2-4-All · alle', q: 'Was fällt euch auf, wenn ihr auf die Wand schaut?',
    how: 'Schaut nach vorn.', show: [2, 4] },
  { id: 6, mode: 'many', label: '15% Solutions · allein', q: 'Was kannst du beim nächsten Treffen selbst dafür tun, ohne Erlaubnis und ohne zusätzliche Mittel?',
    how: 'Deine 15 Prozent: das, was in deiner Hand liegt. Ein Schritt pro Post-it.', show: [6], solo: true },
  { id: 7, mode: 'away', label: '15% Solutions · Beratung', q: 'Stellt euch reihum eure Schritte vor und beratet einander.',
    how: 'Eine Person stellt vor, die anderen fragen nach und geben Ideen.', show: [6] },
  { id: 8, mode: 'one', label: 'Rückblick', q: 'Wie war es für dich, am Handy zu schreiben? Was hat geholfen, was hat gestört?',
    how: 'Deine ehrliche Rückmeldung hilft uns beim Weiterbauen.', show: [8], solo: true },
];
const stepById = id => STEPS.find(s => s.id === id) || STEPS[0];

function rpc(fn, args, ms = 8000) {
  const ac = new AbortController(), timer = setTimeout(() => ac.abort(), ms);
  return fetch(API + fn, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' },
                           body: JSON.stringify(args || {}), signal: ac.signal })
    .then(r => r.json().then(j => r.ok ? j : Promise.reject(j.message || String(r.status))))
    .finally(() => clearTimeout(timer));
}
function uuid() {
  return crypto.randomUUID ? crypto.randomUUID()
    : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
}
const $ = id => document.getElementById(id);
