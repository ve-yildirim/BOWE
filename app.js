'use strict';

/* ---------- Constants ---------- */

const DB_KEY = 'bowe.db.v2';
const LEGACY_KEY = 'mooby.v1';
const COLLECTIONS = ['exercises', 'routines', 'history'];
const AREAS = ['Neck', 'Shoulders', 'Upper back', 'Spine', 'Core', 'Hips', 'Legs', 'Ankles & feet', 'Wrists', 'Full body'];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const COLORS = ['#6F8F78', '#C9A27E', '#B98B82', '#8A9DB0', '#A39BB5', '#9C9A8E'];
const SECS_OPTS = [10, 15, 20, 30, 45, 60, 75, 90, 120, 180, 240, 300];
const DEFAULT_SETTINGS = { voice: true, sound: true, getReady: 5, updatedAt: 0 };

/* ---------- Helpers ---------- */

const $ = (s, r = document) => r.querySelector(s);
const uid = () => Math.random().toString(36).slice(2, 10);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);

function readJSON(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }
function writeJSON(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); return true; } catch { return false; } }

function dateKey(d) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}
function fmtClock(s) {
  s = Math.max(0, Math.ceil(s));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
function fmtMins(s) {
  const m = Math.round(s / 60);
  return m < 1 ? `${Math.round(s)} sec` : `${m} min`;
}
function fmtSecsOpt(s) { return s < 60 ? `${s}s` : fmtClock(s); }

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2000);
}

/* ---------- Database ----------
   Exercises and starter routines live in data/starter.json, so every device
   gets the same library. Anything edited in the app is saved on this device
   on top of that file: records from the file carry updatedAt 0, so a local
   edit (updatedAt > 0) wins, and deletions are kept as { deleted: true }. */

const emptyDb = () => ({ exercises: {}, routines: {}, history: {}, settings: { ...DEFAULT_SETTINGS } });

function blankExercise() {
  return { id: '', name: '', area: AREAS[0], muscles: '', level: 'Beginner', equipment: 'None', sided: false, defaultSecs: 30, cue: '', steps: [], media: '', notes: '' };
}

function migrateLegacy() {
  const old = readJSON(LEGACY_KEY);
  if (!old) return null;
  const d = emptyDb();
  const now = Date.now();
  (old.custom || []).forEach((m) => {
    d.exercises[m.id] = { ...blankExercise(), ...m, updatedAt: now };
  });
  (old.routines || []).forEach((r, i) => {
    d.routines[r.id] = { id: r.id, name: r.name, color: r.color, rest: r.rest, items: r.items, createdAt: i + 1, updatedAt: now };
  });
  // The old app seeded its own copies of the starter routines; don't show them twice.
  ['r-morning', 'r-desk', 'r-hips'].forEach((id) => { d.routines[id] = { id, deleted: true, updatedAt: 1 }; });
  (old.history || []).forEach((h) => { const id = 'h-' + uid(); d.history[id] = { id, ...h, updatedAt: now }; });
  if (old.settings) d.settings = { ...DEFAULT_SETTINGS, ...old.settings, updatedAt: now };
  return d;
}

let db = readJSON(DB_KEY) || migrateLegacy() || emptyDb();

function saveLocal() {
  if (!writeJSON(DB_KEY, db)) toast('Could not save on this device');
}
function put(col, rec) {
  rec.updatedAt = Date.now();
  db[col][rec.id] = rec;
  saveLocal();
}
function remove(col, id) {
  db[col][id] = { id, deleted: true, updatedAt: Date.now() };
  saveLocal();
}
function setSetting(key, value) {
  db.settings = { ...db.settings, [key]: value, updatedAt: Date.now() };
  saveLocal();
}
const list = (col) => Object.values(db[col]).filter((r) => !r.deleted);
const exById = (id) => { const e = db.exercises[id]; return e && !e.deleted ? e : undefined; };
const routineById = (id) => { const r = db.routines[id]; return r && !r.deleted ? r : undefined; };
const routines = () => list('routines').sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
const history = () => list('history').sort((a, b) => new Date(a.date) - new Date(b.date));
const settings = () => db.settings || DEFAULT_SETTINGS;
const isEdited = (rec) => rec.updatedAt > 0;

// Pull in data/starter.json. Untouched records follow the file; records
// edited or deleted on this device keep the local version.
async function loadStarter() {
  try {
    const res = await fetch('data/starter.json', { cache: 'no-cache' });
    const starter = await res.json();
    let changed = false;
    for (const col of ['exercises', 'routines']) {
      for (const rec of starter[col] || []) {
        const cur = db[col][rec.id];
        if (cur && cur.updatedAt !== 0) continue;
        const next = { ...rec, updatedAt: 0 };
        if (JSON.stringify(cur) !== JSON.stringify(next)) { db[col][rec.id] = next; changed = true; }
      }
    }
    if (changed) saveLocal();
    return changed;
  } catch {
    return false;
  }
}

// Used by backup import: per record, the newer copy wins.
function merge(local, incoming) {
  const out = emptyDb();
  for (const col of COLLECTIONS) {
    const a = local[col] || {};
    const b = incoming[col] || {};
    for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) {
      out[col][id] = !b[id] ? a[id] : !a[id] ? b[id] : b[id].updatedAt > a[id].updatedAt ? b[id] : a[id];
    }
  }
  const sa = local.settings || DEFAULT_SETTINGS;
  const sb = incoming.settings || DEFAULT_SETTINGS;
  out.settings = sb.updatedAt > sa.updatedAt ? sb : sa;
  return out;
}

/* ---------- Derived data ---------- */

const swatch = (r) => (COLORS.includes(r.color) ? r.color : COLORS[0]);

function routineSecs(r) {
  const items = r.items.filter((i) => exById(i.exId));
  const work = items.reduce((t, i) => t + i.secs * (exById(i.exId).sided ? 2 : 1), 0);
  return work + Math.max(0, items.length - 1) * (r.rest || 0);
}
function activeDays() { return new Set(history().map((h) => dateKey(h.date))); }
function streak() {
  const days = activeDays();
  const d = new Date();
  if (!days.has(dateKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(dateKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function thisWeek() {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // Monday
  const l = history().filter((h) => new Date(h.date) >= start);
  return { sessions: l.length, secs: l.reduce((t, h) => t + h.secs, 0) };
}
function areas() {
  const used = new Set(list('exercises').map((e) => e.area || 'Other'));
  return [...AREAS.filter((a) => used.has(a)), ...[...used].filter((a) => !AREAS.includes(a)).sort()];
}
function searchMoves(query, area = '') {
  const q = query.trim().toLowerCase();
  return list('exercises')
    .filter((e) => !area || (e.area || 'Other') === area)
    .filter((e) => !q || [e.name, e.area, e.muscles, e.equipment, e.level].join(' ').toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name));
}

const logo = (cls = '') => `<img class="logo ${cls}" src="icons/logo.png" alt="" aria-hidden="true">`;

const svgI = (d, fill = false) => `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" ${fill ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"'}>${d}</svg>`;
const ICON = {
  play: svgI('<path d="M8 5.5v13l11-6.5z"/>', true),
  pause: svgI('<rect x="6.5" y="5" width="4" height="14" rx="1.2"/><rect x="13.5" y="5" width="4" height="14" rx="1.2"/>', true),
  prev: svgI('<path d="M18 6l-8 6 8 6z" fill="currentColor"/><path d="M6 6v12"/>'),
  next: svgI('<path d="M6 6l8 6-8 6z" fill="currentColor"/><path d="M18 6v12"/>'),
  plus: svgI('<path d="M12 5v14M5 12h14"/>'),
  search: svgI('<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/>'),
  grip: svgI('<circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/>', true),
};

const GREETINGS = [
  // General
  "Hi bish",
  "Hey betch",
  "Sup, loser",
  "Hello, menace",
  "Hey, you little gremlin",
  "What’s up, chaos goblin",
  "Hey, hot mess",
  "Greetings, peasant",
  "Well, well, well… this bitch again",
  "Welcome back, you stiff bastard",
  "What’s cracking? Besides your knees",
  "Rise and whine",
  "Sup, stretch goblin",
  "Hey, tight ass",
  "Alright, you magnificent disaster",
  // General, extra schofferend
  "Morning, you orthopedic shitshow.",
  "Oi, you anatomically correct disaster.",
  "Welcome back, you fucking folding-chair reject.",
  "Hey, you bag of unresolved tension.",
  "Get up, you sedentary little shit.",
  "Alright, you overpriced sack of back pain.",
  "Hello, you walking warranty claim.",
  "Back again, you smug, inflexible bastard?",
  "Hey, you absolute waste of cartilage.",
  "Morning, you creaky fuck.",
  "Still built like a question mark, I see.",
  "Your posture’s fucked. Lovely to see you.",
  "Oi, you human before-picture.",
  "Welcome back, you load-bearing bitch.",
  "Stretch, you miserable IKEA assembly error.",
  // Lord of the Rings
  "Look who crawled out of Mordor",
  "Hey, hobbit",
  "Greetings, my precious",
  "You shall not… skip today",
  "Back again, you absolute orc",
  // Lord of the Rings, extra schofferend
  "Morning, you stiff little hobbit bastard.",
  "Oi, you Mordor-grade shitshow.",
  "Look what crawled out of Saruman’s arse.",
  "Welcome back, you bargain-bin Balrog.",
  "Alright, you absolute fucking Took.",
  "Hey, you Nazgûl with a desk job.",
  "Sup, you sack of orc shit.",
  "Back again, you rejected Uruk-hai?",
  "Even Gollum thinks your posture’s fucked.",
  "Gondor calls for aid. Your hamstrings call for fucking help.",
  "One does not simply sit on their arse all day.",
  "You have my sword. And my bow. And your fucked-up back.",
  "Hey, you Ent with a stick up your arse.",
  "Middle-earth called. You’re lowering the fucking average.",
  "Welcome back, you fool of a twat.",
  // Harry Potter
  "’Sup, muggle",
  "Hi, bish Who Lived",
  "Alright, you filthy little mudstretch",
  "Hey, you stiff Slytherin",
  "Welcome back, Professor McGonnaStretch",
  "Oh look, He Who Must Not Be Bendy",
  "Greetings, you unfortunate Hufflepuff",
  "Hey, Dumble-dork",
  "Back again, Draco Malstiff?",
  "Hello, Nearly Headless Hip",
  "’Sup, Prisoner of Ass-to-Grass",
  "Morning, Moaning Myrtle",
  "Oi, Voldy. Touch your toes.",
  "Welcome to the Chamber of Stiffness",
  "Hey, Defence Against the Dark Arse",
  "Ten points to Gryffin-dork",
  "You’re a stiff one, Harry",
  "Mischief managed. Mobility pending.",
  "I solemnly swear my hips are up to no good",
  "After all this time? Still stiff.",
  // Harry Potter, extra schofferend
  "Oi, you wand-waving twat.",
  "Morning, you disappointing little muggle.",
  "Back again, you absolute squib?",
  "Alright, you bargain-bin Death Eater.",
  "Look what the dementor dragged in.",
  "Hey, you pound-shop Potter.",
  "Welcome back, you sentient Sorting Hat reject.",
  "Sup, you Horcrux of bad decisions.",
  "Even Dobby has better posture, you prick.",
  "All those spells and you’re still a fucking liability.",
  "Hey, you Ministry-certified dumbass.",
  "You’ve got the flexibility of a fucking broomstick.",
  "Salazar Slytherin called. He said stop being a little bitch.",
  "You’re the reason Hogwarts needs safeguarding.",
  "Not even a dementor wants a piece of that mess.",
  "Morning, you unfuckable Hufflepuff.",
];
// Picked once per app launch so it doesn't change every time you switch tabs.
const GREETING = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];

/* ---------- Views ---------- */

function routineCard(r) {
  const n = r.items.filter((i) => exById(i.exId)).length;
  return `<div class="card routine">
    <div class="swatch" style="--c:${swatch(r)}">${esc((r.name || '?').trim().charAt(0).toUpperCase())}</div>
    <a class="grow" href="#edit/${esc(r.id)}" style="color:inherit;text-decoration:none">
      <h3>${esc(r.name)}</h3>
      <div class="meta">${n} move${n === 1 ? '' : 's'} · ${fmtMins(routineSecs(r))}</div>
    </a>
    <button class="play" data-act="play" data-id="${esc(r.id)}" aria-label="Start ${esc(r.name)}" ${n ? '' : 'disabled'}>${ICON.play}</button>
  </div>`;
}

function viewHome() {
  const w = thisWeek();
  const days = activeDays();
  const today = new Date();
  const monday = new Date(today); monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const week = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i);
    const k = dateKey(d);
    const cls = days.has(k) ? 'on' : k === dateKey(today) ? 'today' : '';
    return `<div><div class="d">${label}</div><div class="dot ${cls}"></div></div>`;
  }).join('');
  const rs = routines();

  return `
    <header class="hero">
      ${logo('hero-logo')}
      <div class="brand"><b>BOWE:</b> Bend-over with Emre</div>
    </header>
    <h1 class="display greeting">${esc(GREETING)}</h1>
    <div class="stats">
      <div class="stat"><b>${streak()}</b><span>day streak</span></div>
      <div class="stat"><b>${w.sessions}</b><span>this week</span></div>
      <div class="stat"><b>${Math.round(w.secs / 60)}</b><span>minutes</span></div>
    </div>
    <div class="week">${week}</div>
    <div class="section-title"><h2>Routines</h2><a class="link" href="#edit/new">New</a></div>
    <div class="stack">${rs.length ? rs.map(routineCard).join('') : `<div class="empty">No routines yet. Make your first one.</div>`}</div>`;
}

function viewRoutines() {
  const rs = routines();
  return `
    <div class="row between"><h1 class="display">Routines</h1><a class="btn primary" href="#edit/new">New routine</a></div>
    <p class="muted small">Tap a routine to edit it.</p>
    <div class="stack">${rs.length ? rs.map(routineCard).join('') : `<div class="empty">No routines yet.</div>`}</div>`;
}

let draft = null;

function viewEdit(id) {
  if (!draft || draft._for !== id) {
    const src = id === 'new' ? null : routineById(id);
    if (id !== 'new' && !src) { location.hash = '#routines'; return ''; }
    draft = src
      ? JSON.parse(JSON.stringify(src))
      : { id: 'r-' + uid(), name: '', color: COLORS[0], rest: 5, items: [], createdAt: Date.now() };
    draft._for = id;
  }
  const d = draft;
  const items = d.items.map((it, i) => {
    const ex = exById(it.exId);
    if (!ex) return '';
    const opts = SECS_OPTS.includes(it.secs) ? SECS_OPTS : [...SECS_OPTS, it.secs].sort((a, b) => a - b);
    return `<div class="item" data-i="${i}">
      <button class="handle" data-handle aria-label="Drag to reorder">${ICON.grip}</button>
      <div class="grow"><div class="name">${esc(ex.name)}</div>${ex.sided ? '<span class="tag">each side</span>' : ''}</div>
      <select class="input" data-act="secs" data-i="${i}" aria-label="Seconds">
        ${opts.map((s) => `<option value="${s}" ${s === it.secs ? 'selected' : ''}>${fmtSecsOpt(s)}</option>`).join('')}
      </select>
      <button class="iconbtn" data-act="remove" data-i="${i}" aria-label="Remove">✕</button>
    </div>`;
  }).join('');

  return `
    <div class="row between">
      <a class="link" href="#routines">‹ Back</a>
      <button class="btn primary" data-act="save-routine">Save</button>
    </div>
    <div class="stack" style="margin-top:8px">
      <label class="field">Name<input class="input" id="r-name" maxlength="40" placeholder="e.g. Morning Wake-Up" value="${esc(d.name)}"></label>
      <div>
        <div class="field">Color</div>
        <div class="row" style="flex-wrap:wrap;margin-top:8px">
          ${COLORS.map((c) => `<button data-act="color" data-v="${c}" aria-label="Color" style="width:32px;height:32px;border-radius:50%;background:${c};border:0;box-shadow:${c === swatch(d) ? '0 0 0 2px var(--bg), 0 0 0 4px var(--ink)' : 'none'}"></button>`).join('')}
        </div>
      </div>
      <label class="field">Rest between moves
        <select class="input" id="r-rest">${[0, 3, 5, 10, 15, 20, 30, 45, 60].map((s) => `<option value="${s}" ${s === d.rest ? 'selected' : ''}>${s ? s + ' seconds' : 'No rest'}</option>`).join('')}</select>
      </label>
    </div>
    <div class="section-title"><h2>Moves</h2><span class="muted small">${fmtMins(routineSecs(d))} total</span></div>
    <div class="card" style="padding:4px 14px">${items || `<div class="empty">No moves yet.</div>`}</div>
    <button class="btn block" style="margin-top:12px" data-act="open-picker">Add moves</button>
    ${id !== 'new' ? `<button class="btn block" style="margin-top:10px" data-act="duplicate-routine">Duplicate</button>
    <button class="btn danger block" style="margin-top:6px" data-act="delete-routine">Delete routine</button>` : ''}`;
}

function syncDraftFields() {
  if (!draft) return;
  const n = $('#r-name'); if (n) draft.name = n.value;
  const r = $('#r-rest'); if (r) draft.rest = Number(r.value);
}

let movesQuery = '';
let movesArea = '';

function movesListHtml() {
  const found = searchMoves(movesQuery, movesArea);
  if (!found.length) return `<div class="empty">No moves match.</div>`;
  return areas().map((area) => {
    const l = found.filter((e) => (e.area || 'Other') === area);
    if (!l.length) return '';
    return `<div class="section-title"><h2>${esc(area)}</h2><span class="muted small">${l.length}</span></div>
      <div class="card" style="padding:2px 14px">${l.map((e) => `
        <button class="moverow" data-act="show-move" data-id="${esc(e.id)}">
          <span class="grow"><span class="name">${esc(e.name)}</span>
          <span class="muted small">${esc([e.level, e.equipment && e.equipment !== 'None' ? e.equipment : '', e.sided ? 'each side' : ''].filter(Boolean).join(' · '))}</span></span>
          <span class="chev">›</span>
        </button>`).join('')}</div>`;
  }).join('');
}

function viewMoves() {
  return `<div class="row between"><h1 class="display">Moves</h1><button class="btn primary" data-act="new-move">New move</button></div>
    <p class="muted small">${list('exercises').length} moves</p>
    <label class="search">${ICON.search}<input id="moves-search" type="search" placeholder="Search moves, muscles, equipment" value="${esc(movesQuery)}" autocomplete="off"></label>
    <div class="chips">
      <button class="chip ${movesArea ? '' : 'on'}" data-act="area" data-v="">All</button>
      ${areas().map((a) => `<button class="chip ${movesArea === a ? 'on' : ''}" data-act="area" data-v="${esc(a)}">${esc(a)}</button>`).join('')}
    </div>
    <div id="moves-list">${movesListHtml()}</div>`;
}

function viewProgress() {
  const days = activeDays();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(today.getDate() - ((today.getDay() + 6) % 7) - 7 * 4); // 5 weeks, Monday start
  const cells = [];
  for (let i = 0; i < 35; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const k = dateKey(d);
    const cls = [days.has(k) ? 'on' : '', d > today ? 'future' : '', k === dateKey(today) ? 'today' : ''].join(' ');
    cells.push(`<div class="c ${cls}" title="${k}"></div>`);
  }
  const hs = history();
  const total = hs.reduce((t, h) => t + h.secs, 0);
  const recent = [...hs].reverse().slice(0, 30).map((h) => `
    <div class="item"><div class="grow"><div class="name">${esc(h.name)}</div>
    <div class="muted small">${new Date(h.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · ${fmtMins(h.secs)}</div></div>
    <button class="iconbtn" data-act="delete-session" data-id="${esc(h.id)}" aria-label="Delete session">✕</button></div>`).join('');
  const st = settings();

  return `<h1 class="display">Progress</h1>
    <div class="stats">
      <div class="stat"><b>${streak()}</b><span>day streak</span></div>
      <div class="stat"><b>${hs.length}</b><span>sessions</span></div>
      <div class="stat"><b>${Math.round(total / 60)}</b><span>minutes</span></div>
    </div>
    <div class="section-title"><h2>Last 5 weeks</h2></div>
    <div class="card"><div class="cal">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((l) => `<div class="h">${l}</div>`).join('')}${cells.join('')}</div></div>
    <div class="section-title"><h2>Recent sessions</h2></div>
    <div class="card" style="padding:4px 14px">${recent || `<div class="empty">Finish a routine and it shows up here.</div>`}</div>
    <div class="section-title"><h2>Settings</h2></div>
    <div class="card" style="padding:4px 14px">
      <label class="switch"><span>Voice cues</span><input type="checkbox" data-set="voice" ${st.voice ? 'checked' : ''}></label>
      <label class="switch"><span>Beeps</span><input type="checkbox" data-set="sound" ${st.sound ? 'checked' : ''}></label>
      <label class="switch"><span>Get-ready countdown</span>
        <select class="input" data-set="getReady" style="width:auto;margin:0">${[0, 3, 5, 10, 15].map((s) => `<option value="${s}" ${s === st.getReady ? 'selected' : ''}>${s ? s + 's' : 'Off'}</option>`).join('')}</select>
      </label>
    </div>
    <div class="section-title"><h2>Backup</h2></div>
    <p class="muted small" style="margin:-4px 0 12px">History and in-app edits are saved on this device. Export a backup to move them to another device.</p>
    <div class="row">
      <button class="btn grow" data-act="export">Export</button>
      <label class="btn grow">Import<input type="file" id="import-file" accept="application/json,.json" hidden></label>
    </div>`;
}

/* ---------- Sheets ---------- */

function openSheet(html) {
  $('#sheet-panel').innerHTML = html;
  $('#sheet').hidden = false;
  $('#sheet-panel').scrollTop = 0;
}
function closeSheet() { $('#sheet').hidden = true; }

let pickQuery = '';

function pickListHtml() {
  const found = searchMoves(pickQuery);
  if (!found.length) return `<div class="empty">No moves match.</div>`;
  return areas().map((area) => {
    const l = found.filter((e) => (e.area || 'Other') === area);
    if (!l.length) return '';
    return `<div class="section-title"><h3>${esc(area)}</h3></div>${l.map((e) => `
      <button class="pick" data-act="add-move" data-id="${esc(e.id)}">
        <span><span style="font-weight:500">${esc(e.name)}</span> <span class="tag">${fmtSecsOpt(e.defaultSecs || 30)}${e.sided ? ' each side' : ''}</span></span>
        <span class="plus">${ICON.plus}</span>
      </button>`).join('')}`;
  }).join('');
}

function pickerHtml() {
  pickQuery = '';
  return `<div class="row between"><h2>Add moves</h2><button class="btn primary" data-act="close-sheet">Done</button></div>
    <label class="search">${ICON.search}<input id="pick-search" type="search" placeholder="Search moves" autocomplete="off"></label>
    <div id="pick-list">${pickListHtml()}</div>`;
}

function isImage(url) { return /\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i.test(url); }

function moveDetailHtml(e) {
  const meta = [e.area, e.level, e.equipment, e.sided ? 'each side' : ''].filter(Boolean);
  const media = e.media
    ? isImage(e.media)
      ? `<img class="media" src="${esc(e.media)}" alt="${esc(e.name)}" loading="lazy">`
      : `<a class="btn block" href="${esc(e.media)}" target="_blank" rel="noopener">Open video / link</a>`
    : '';
  return `<div class="row between"><button class="link" data-act="close-sheet">Close</button><button class="btn" data-act="edit-move" data-id="${esc(e.id)}">Edit</button></div>
    <h1 class="display" style="font-size:30px;margin-top:8px">${esc(e.name)}</h1>
    <p class="muted small" style="margin:6px 0 0">${esc(meta.join(' · '))} · ${fmtSecsOpt(e.defaultSecs || 30)} default</p>
    ${media ? `<div style="margin-top:16px">${media}</div>` : ''}
    ${e.cue ? `<p class="cue">${esc(e.cue)}</p>` : ''}
    ${e.steps?.length ? `<div class="section-title"><h3>How to</h3></div><ol class="steps">${e.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>` : ''}
    ${e.muscles ? `<div class="section-title"><h3>Muscles</h3></div><p class="muted" style="margin:0">${esc(e.muscles)}</p>` : ''}
    ${e.notes ? `<div class="section-title"><h3>Notes</h3></div><p class="muted" style="margin:0;white-space:pre-wrap">${esc(e.notes)}</p>` : ''}
    ${isEdited(e) ? `<p class="muted small" style="margin-top:24px">Edited on this device.</p>` : ''}`;
}

function moveFormHtml(e) {
  const isNew = !e.id;
  return `<div class="row between"><button class="link" data-act="close-sheet">Cancel</button><button class="btn primary" data-act="save-move" data-id="${esc(e.id)}">Save</button></div>
    <h2 style="margin-top:8px">${isNew ? 'New move' : 'Edit move'}</h2>
    <div class="stack" style="margin-top:14px">
      <label class="field">Name<input class="input" id="m-name" maxlength="60" value="${esc(e.name)}" placeholder="e.g. Banded shoulder stretch"></label>
      <div class="grid2">
        <label class="field">Area<input class="input" id="m-area" list="area-list" value="${esc(e.area)}"></label>
        <label class="field">Level<select class="input" id="m-level">${LEVELS.map((l) => `<option ${l === e.level ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      </div>
      <datalist id="area-list">${[...new Set([...AREAS, ...areas()])].map((a) => `<option value="${esc(a)}">`).join('')}</datalist>
      <div class="grid2">
        <label class="field">Equipment<input class="input" id="m-equipment" value="${esc(e.equipment)}" placeholder="None"></label>
        <label class="field">Default time<select class="input" id="m-secs">${SECS_OPTS.map((s) => `<option value="${s}" ${s === e.defaultSecs ? 'selected' : ''}>${fmtSecsOpt(s)}</option>`).join('')}</select></label>
      </div>
      <label class="switch" style="border:0;padding:4px 0"><span>Do each side separately</span><input type="checkbox" id="m-sided" ${e.sided ? 'checked' : ''}></label>
      <label class="field">Muscles<input class="input" id="m-muscles" value="${esc(e.muscles)}" placeholder="e.g. Hamstrings, calves"></label>
      <label class="field">Timer cue <span class="muted">(shown during the routine)</span><textarea class="input" id="m-cue" maxlength="300">${esc(e.cue)}</textarea></label>
      <label class="field">Steps <span class="muted">(one per line)</span><textarea class="input" id="m-steps" style="min-height:110px">${esc((e.steps || []).join('\n'))}</textarea></label>
      <label class="field">Image or video link<input class="input" id="m-media" type="url" value="${esc(e.media)}" placeholder="https://…"></label>
      <label class="field">Notes<textarea class="input" id="m-notes">${esc(e.notes)}</textarea></label>
      ${isNew ? '' : `<button class="btn danger block" data-act="delete-move" data-id="${esc(e.id)}">Delete move</button>`}
    </div>`;
}

/* ---------- Player ---------- */

let player = null;
let audioCtx = null;
let wakeLock = null;

async function requestWakeLock() {
  try {
    wakeLock = (await navigator.wakeLock?.request('screen')) || null;
    wakeLock?.addEventListener('release', () => { wakeLock = null; });
  } catch { wakeLock = null; }
}

function beep(freq = 880, ms = 140, vol = 0.18) {
  if (!settings().sound || !audioCtx) return;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.frequency.value = freq; o.type = 'sine';
  g.gain.setValueAtTime(vol, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + ms / 1000);
  o.connect(g).connect(audioCtx.destination);
  o.start(); o.stop(audioCtx.currentTime + ms / 1000);
}
function say(text) {
  if (!settings().voice || !('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.02;
  speechSynthesis.speak(u);
}

function buildSteps(r) {
  const items = r.items.filter((i) => exById(i.exId));
  const steps = [];
  items.forEach((it, idx) => {
    const ex = exById(it.exId);
    (ex.sided ? ['Left side', 'Right side'] : [null]).forEach((side) => steps.push({ type: 'work', ex, side, secs: it.secs }));
    if (r.rest > 0 && idx < items.length - 1) steps.push({ type: 'rest', secs: r.rest });
  });
  steps.forEach((s, i) => { s.next = steps.slice(i + 1).find((n) => n.type === 'work') || null; });
  const ready = settings().getReady;
  if (ready && steps.length) steps.unshift({ type: 'ready', secs: ready, next: steps[0] });
  return steps;
}

async function startPlayer(id) {
  const r = routineById(id);
  if (!r || !r.items.some((i) => exById(i.exId))) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') await audioCtx.resume();
  } catch { audioCtx = null; }
  await requestWakeLock();

  const steps = buildSteps(r);
  const total = steps.reduce((t, s) => t + s.secs, 0);
  player = { r, steps, total, i: -1, endAt: 0, left: 0, paused: false, timer: null, lastWhole: null };
  $('#player').hidden = false;
  $('#tabbar').hidden = true;
  goStep(0);
  player.timer = setInterval(tick, 200);
}

function stepLabel(s) {
  if (s.type === 'ready') return 'Get ready';
  if (s.type === 'rest') return 'Rest';
  return 'Move';
}

function announce(s) {
  if (s.type === 'ready') say(`Get ready. First up, ${s.next.ex.name}${s.next.side ? ', ' + s.next.side.toLowerCase() : ''}`);
  else if (s.type === 'rest') say(`Rest. Next, ${s.next?.ex.name || ''}`);
  else {
    const prev = player.steps[player.i - 1];
    if (s.side === 'Right side' && prev?.ex === s.ex) say('Switch sides');
    else say(`${s.ex.name}${s.side ? ', ' + s.side.toLowerCase() : ''}`);
  }
}

function goStep(i) {
  if (i >= player.steps.length) return finishPlayer();
  player.i = Math.max(0, i);
  const s = player.steps[player.i];
  player.left = s.secs;
  player.endAt = Date.now() + s.secs * 1000;
  player.lastWhole = null;
  renderPlayer();
  announce(s);
  if (i > 0) beep(s.type === 'work' ? 1040 : 660, 220);
}

function tick() {
  if (!player || player.paused) return;
  player.left = (player.endAt - Date.now()) / 1000;
  const whole = Math.ceil(player.left);
  if (whole !== player.lastWhole) {
    player.lastWhole = whole;
    if (whole <= 3 && whole > 0) beep(740, 90, 0.12);
  }
  if (player.left <= 0) return goStep(player.i + 1);
  updatePlayerTime();
}

function elapsedBefore(i) { return player.steps.slice(0, i).reduce((t, s) => t + s.secs, 0); }

function renderPlayer() {
  const s = player.steps[player.i];
  const el = $('#player');
  el.classList.toggle('rest', s.type !== 'work');
  const title = s.type === 'work' ? s.ex.name : s.type === 'rest' ? 'Breathe' : player.r.name;
  const cue = s.type === 'work' ? s.ex.cue : s.next ? `Up next: ${s.next.ex.name}` : '';
  const next = s.type === 'work' && s.next ? `Next: ${esc(s.next.ex.name)}${s.next.side ? ' (' + s.next.side.toLowerCase() + ')' : ''}` : s.type === 'work' ? 'Last move' : '';
  const img = s.type === 'work' && s.ex.media && isImage(s.ex.media) ? `<img class="p-media" src="${esc(s.ex.media)}" alt="">` : '';
  el.innerHTML = `
    <div class="p-top">
      <button class="link" data-act="stop">End</button>
      <span class="muted small">${player.i + 1} / ${player.steps.length}</span>
      <span class="muted small" id="p-remaining" style="min-width:64px;text-align:right"></span>
    </div>
    <div class="p-progress"><i id="p-bar"></i></div>
    <div class="p-label">${stepLabel(s)}</div>
    <div class="p-name">${esc(title)}</div>
    <div class="p-side">${esc(s.side || '')}</div>
    ${img}
    <div class="p-ring ${img ? 'small' : ''}">
      <svg viewBox="0 0 100 100"><circle class="track" cx="50" cy="50" r="45" fill="none" stroke-width="7"/>
      <circle class="bar" id="p-ring" cx="50" cy="50" r="45" fill="none" stroke-width="7" stroke-linecap="round" stroke-dasharray="282.74" stroke-dashoffset="0"/></svg>
      <div class="p-time" id="p-time"></div>
    </div>
    ${s.type === 'work' ? '' : `<div class="breath" aria-hidden="true"></div>`}
    <p class="p-cue">${esc(cue)}</p>
    <div class="p-next">${next}</div>
    <div class="p-controls">
      <button class="ctl" data-act="prev" aria-label="Previous">${ICON.prev}</button>
      <button class="ctl main" data-act="pause" aria-label="Pause" id="p-pause">${player.paused ? ICON.play : ICON.pause}</button>
      <button class="ctl" data-act="next" aria-label="Skip">${ICON.next}</button>
    </div>`;
  updatePlayerTime();
}

function updatePlayerTime() {
  const s = player.steps[player.i];
  const left = Math.max(0, player.left);
  $('#p-time').textContent = fmtClock(left);
  $('#p-ring').style.strokeDashoffset = String(282.74 * (1 - left / s.secs));
  const done = elapsedBefore(player.i) + (s.secs - left);
  $('#p-bar').style.width = `${(done / player.total) * 100}%`;
  $('#p-remaining').textContent = `${fmtClock(player.total - done)} left`;
}

function togglePause() {
  if (!player) return;
  if (player.paused) {
    player.endAt = Date.now() + player.left * 1000;
    player.paused = false;
  } else {
    player.left = (player.endAt - Date.now()) / 1000;
    player.paused = true;
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }
  $('#p-pause').innerHTML = player.paused ? ICON.play : ICON.pause;
}

function closePlayer() {
  if (player) clearInterval(player.timer);
  player = null;
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  wakeLock?.release?.().catch(() => {});
  wakeLock = null;
  $('#player').hidden = true;
  $('#player').innerHTML = '';
  $('#tabbar').hidden = false;
  render();
}

function finishPlayer() {
  clearInterval(player.timer);
  const r = player.r;
  const secs = player.steps.filter((s) => s.type !== 'ready').reduce((t, s) => t + s.secs, 0);
  const id = 'h-' + uid();
  put('history', { id, routineId: r.id, name: r.name, date: new Date().toISOString(), secs });
  beep(880, 160); setTimeout(() => beep(1175, 260), 180);
  say('Well done. Routine complete.');
  const el = $('#player');
  el.classList.remove('rest');
  el.innerHTML = `
    <div style="margin:auto 0;display:flex;flex-direction:column;align-items:center;gap:10px">
      ${logo('done-logo')}
      <h1 class="display">Well done</h1>
      <p class="muted" style="margin:0">${esc(r.name)} · ${fmtMins(secs)}</p>
      <p class="small" style="margin:6px 0 0">${streak()} day streak</p>
    </div>
    <button class="btn primary block" data-act="stop" style="max-width:420px">Done</button>`;
}

/* ---------- Router & events ---------- */

function render() {
  const [route, arg] = (location.hash.slice(1) || 'home').split('/');
  if (route !== 'edit') draft = null;
  const views = { home: viewHome, routines: viewRoutines, moves: viewMoves, progress: viewProgress, edit: () => viewEdit(decodeURIComponent(arg || '')) };
  const v = views[route] || viewHome;
  $('#view').innerHTML = v();
  const tab = route === 'edit' ? 'routines' : (views[route] ? route : 'home');
  document.querySelectorAll('.tabbar a').forEach((a) => a.classList.toggle('active', a.dataset.tab === tab));
}

window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });

function readMoveForm(id) {
  const name = $('#m-name').value.trim();
  if (!name) { toast('Give the move a name'); return null; }
  const base = id ? { ...exById(id) } : blankExercise();
  return {
    ...base,
    id: id || `${slug(name) || 'move'}-${uid().slice(0, 4)}`,
    name,
    area: $('#m-area').value.trim() || 'Other',
    level: $('#m-level').value,
    equipment: $('#m-equipment').value.trim() || 'None',
    defaultSecs: Number($('#m-secs').value),
    sided: $('#m-sided').checked,
    muscles: $('#m-muscles').value.trim(),
    cue: $('#m-cue').value.trim(),
    steps: $('#m-steps').value.split('\n').map((s) => s.trim()).filter(Boolean),
    media: $('#m-media').value.trim(),
    notes: $('#m-notes').value.trim(),
  };
}

function exportData() {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `bowe-backup-${dateKey(new Date())}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function importData(file) {
  try {
    const data = JSON.parse(await file.text());
    if (!data || !data.exercises || !data.routines) throw new Error();
    db = merge(db, data);
    saveLocal();
    render();
    toast('Backup imported');
  } catch {
    toast('That file is not a BOWE backup');
  }
}

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-act]');
  if (!t) {
    if (e.target.id === 'sheet') closeSheet();
    return;
  }
  const act = t.dataset.act;
  const i = Number(t.dataset.i);
  switch (act) {
    case 'play': startPlayer(t.dataset.id); break;
    case 'pause': togglePause(); break;
    case 'next': goStep(player.i + 1); break;
    case 'prev': goStep(player.left < player.steps[player.i].secs - 2 ? player.i : player.i - 1); break;
    case 'stop': closePlayer(); break;

    case 'color': syncDraftFields(); draft.color = t.dataset.v; render(); break;
    case 'remove': syncDraftFields(); draft.items.splice(i, 1); render(); break;
    case 'open-picker': syncDraftFields(); openSheet(pickerHtml()); break;
    case 'add-move': {
      const ex = exById(t.dataset.id);
      draft.items.push({ exId: ex.id, secs: ex.defaultSecs || 30 });
      toast(`Added ${ex.name}`);
      break;
    }
    case 'close-sheet': closeSheet(); render(); break;
    case 'save-routine': {
      syncDraftFields();
      const name = draft.name.trim();
      if (!name) { toast('Give your routine a name'); $('#r-name').focus(); break; }
      if (!draft.items.length) { toast('Add at least one move'); break; }
      const { _for, ...clean } = draft;
      clean.name = name;
      put('routines', clean);
      draft = null; toast('Routine saved'); location.hash = '#routines';
      break;
    }
    case 'duplicate-routine': {
      syncDraftFields();
      const { _for, ...src } = draft;
      put('routines', { ...JSON.parse(JSON.stringify(src)), id: 'r-' + uid(), name: `${src.name} copy`, createdAt: Date.now() });
      draft = null; toast('Duplicated'); location.hash = '#routines';
      break;
    }
    case 'delete-routine':
      if (confirm('Delete this routine?')) {
        remove('routines', draft.id);
        draft = null; location.hash = '#routines';
      }
      break;

    case 'area': movesArea = t.dataset.v; render(); break;
    case 'show-move': openSheet(moveDetailHtml(exById(t.dataset.id))); break;
    case 'new-move': openSheet(moveFormHtml(blankExercise())); break;
    case 'edit-move': openSheet(moveFormHtml(exById(t.dataset.id))); break;
    case 'save-move': {
      const rec = readMoveForm(t.dataset.id);
      if (!rec) break;
      put('exercises', rec);
      openSheet(moveDetailHtml(rec));
      render();
      toast('Move saved');
      break;
    }
    case 'delete-move': {
      const id = t.dataset.id;
      const used = routines().filter((r) => r.items.some((it) => it.exId === id));
      const msg = used.length ? `Delete this move? It will also be removed from ${used.map((r) => r.name).join(', ')}.` : 'Delete this move?';
      if (confirm(msg)) {
        used.forEach((r) => put('routines', { ...r, items: r.items.filter((it) => it.exId !== id) }));
        remove('exercises', id);
        closeSheet(); render();
      }
      break;
    }

    case 'delete-session':
      if (confirm('Delete this session from your history?')) { remove('history', t.dataset.id); render(); }
      break;
    case 'export': exportData(); break;
  }
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.act === 'secs') { syncDraftFields(); draft.items[Number(t.dataset.i)].secs = Number(t.value); render(); }
  if (t.dataset.set) setSetting(t.dataset.set, t.type === 'checkbox' ? t.checked : Number(t.value));
  if (t.id === 'import-file' && t.files[0]) { importData(t.files[0]); t.value = ''; }
});

document.addEventListener('input', (e) => {
  if (e.target.id === 'moves-search') {
    movesQuery = e.target.value;
    $('#moves-list').innerHTML = movesListHtml();
  }
  if (e.target.id === 'pick-search') {
    pickQuery = e.target.value;
    $('#pick-list').innerHTML = pickListHtml();
  }
});

/* Drag to reorder moves in the routine editor. Only the grip handle starts a
   drag, so the list still scrolls normally everywhere else. */
let drag = null;

document.addEventListener('pointerdown', (e) => {
  const handle = e.target.closest('[data-handle]');
  if (!handle || !draft) return;
  e.preventDefault();
  syncDraftFields();
  const row = handle.closest('.item');
  const rows = [...row.parentElement.querySelectorAll('.item')];
  // Positions are in page coordinates so they stay valid while auto-scrolling.
  const rects = rows.map((r) => { const b = r.getBoundingClientRect(); return { top: b.top + scrollY, height: b.height }; });
  const from = rows.indexOf(row);
  drag = { row, rows, rects, from, to: from, startY: e.clientY + scrollY, h: rects[from].height, id: e.pointerId };
  handle.setPointerCapture(e.pointerId);
  row.classList.add('dragging');
  row.parentElement.classList.add('sorting');
});

document.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  // Scroll when dragging near the top, or near the bottom above the tab bar.
  if (e.clientY < 70) scrollBy(0, -12);
  else if (e.clientY > innerHeight - 110) scrollBy(0, 12);
  const dy = e.clientY + scrollY - drag.startY;
  drag.row.style.transform = `translateY(${dy}px)`;
  const r0 = drag.rects[drag.from];
  const center = r0.top + r0.height / 2 + dy;
  let to = 0;
  drag.rects.forEach((r, j) => { if (j !== drag.from && r.top + r.height / 2 < center) to++; });
  drag.to = to;
  drag.rows.forEach((r, j) => {
    if (j === drag.from) return;
    let shift = 0;
    if (drag.from < to && j > drag.from && j <= to) shift = -drag.h;
    if (to < drag.from && j >= to && j < drag.from) shift = drag.h;
    r.style.transform = shift ? `translateY(${shift}px)` : '';
  });
});

function endDrag(e) {
  if (!drag || e.pointerId !== drag.id) return;
  const { from, to, rows } = drag;
  drag = null;
  if (from !== to) {
    const order = rows.map((r) => Number(r.dataset.i));
    const [moved] = order.splice(from, 1);
    order.splice(to, 0, moved);
    // Moves whose exercise was deleted aren't shown; keep them at the end.
    const hidden = draft.items.filter((_, i) => !order.includes(i));
    draft.items = [...order.map((i) => draft.items[i]), ...hidden];
  }
  render();
}
document.addEventListener('pointerup', endDrag);
document.addEventListener('pointercancel', endDrag);

document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible' && player && !wakeLock) await requestWakeLock();
});

/* ---------- Start ---------- */

render();
loadStarter().then((changed) => {
  if (changed && !player && !draft && $('#sheet').hidden) render();
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
