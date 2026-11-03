'use strict';

/* ---------- Data ---------- */

const AREAS = ['Neck', 'Shoulders', 'Spine', 'Hips', 'Legs', 'Wrists', 'Other'];

const BUILTIN = [
  { id: 'neck-rolls', name: 'Neck rolls', area: 'Neck', sided: false, cue: 'Slow circles: ear toward shoulder, chin toward chest. Keep your shoulders relaxed.' },
  { id: 'chin-tucks', name: 'Chin tucks', area: 'Neck', sided: false, cue: 'Glide your chin straight back into a double chin, pause, then release.' },
  { id: 'shoulder-circles', name: 'Shoulder circles', area: 'Shoulders', sided: true, cue: 'Straight arm, draw the biggest slow circle you can without twisting your body.' },
  { id: 'arm-circles', name: 'Arm circles', area: 'Shoulders', sided: false, cue: 'Arms out wide, small circles growing bigger. Reverse direction halfway.' },
  { id: 'wall-slides', name: 'Wall slides', area: 'Shoulders', sided: false, cue: 'Back and forearms on the wall, slide your arms up into a Y and back down.' },
  { id: 'thread-needle', name: 'Thread the needle', area: 'Shoulders', sided: true, cue: 'On all fours, slide one arm under your body and rest that shoulder on the floor.' },
  { id: 'cat-cow', name: 'Cat-cow', area: 'Spine', sided: false, cue: 'On all fours, round your back up, then let your belly drop and look up. Move with your breath.' },
  { id: 'open-book', name: 'Open book', area: 'Spine', sided: true, cue: 'Lie on your side with knees bent. Sweep the top arm open and follow it with your eyes.' },
  { id: 'childs-pose', name: "Child's pose", area: 'Spine', sided: false, cue: 'Knees wide, hips back toward your heels, arms long. Breathe into your back.' },
  { id: 'seated-twist', name: 'Seated twist', area: 'Spine', sided: true, cue: 'Sit tall and rotate from your mid-back, one hand behind you for support.' },
  { id: '90-90', name: '90/90 switches', area: 'Hips', sided: false, cue: 'Seated with both knees bent at 90°. Rotate your knees side to side while staying tall.' },
  { id: 'hip-flexor', name: 'Kneeling hip flexor', area: 'Hips', sided: true, cue: 'Half-kneeling, squeeze the back glute and gently shift your hips forward.' },
  { id: 'pigeon', name: 'Pigeon', area: 'Hips', sided: true, cue: 'Front shin across the mat, back leg long. Fold forward if it feels good.' },
  { id: 'deep-squat', name: 'Deep squat hold', area: 'Hips', sided: false, cue: 'Sink into a deep squat, heels down, elbows nudging knees out. Hold onto something if needed.' },
  { id: 'frog', name: 'Frog stretch', area: 'Hips', sided: false, cue: 'Knees wide on the floor, ankles in line with knees. Gently rock your hips back.' },
  { id: 'hip-circles', name: 'Hip circles', area: 'Hips', sided: true, cue: 'On all fours, draw the biggest slow circle you can with your knee.' },
  { id: 'worlds-greatest', name: "World's greatest stretch", area: 'Legs', sided: true, cue: 'Step into a lunge, drop the inside elbow toward your foot, then rotate and reach up.' },
  { id: 'hamstring', name: 'Hamstring stretch', area: 'Legs', sided: true, cue: 'Heel forward, leg straight, hinge at the hips with a flat back.' },
  { id: 'ankle-rocks', name: 'Ankle rocks', area: 'Legs', sided: true, cue: 'Half-kneeling, drive your front knee out over your toes while the heel stays down.' },
  { id: 'calf-stretch', name: 'Calf stretch', area: 'Legs', sided: true, cue: 'Hands on a wall, back leg straight, heel pressed into the floor.' },
  { id: 'wrist-circles', name: 'Wrist circles', area: 'Wrists', sided: false, cue: 'Interlace your fingers and roll your wrists in both directions.' },
  { id: 'wrist-rocks', name: 'Wrist rocks', area: 'Wrists', sided: false, cue: 'On all fours, fingers forward, gently rock forward and back over your hands.' },
];

const COLORS = ['#6F8F78', '#C9A27E', '#B98B82', '#8A9DB0', '#A39BB5', '#9C9A8E'];
const SECS_OPTS = [10, 15, 20, 30, 45, 60, 75, 90, 120, 180];

const STORE_KEY = 'mooby.v1';

function seed() {
  const r = (name, emoji, color, rest, items) => ({
    id: uid(), name, emoji, color, rest,
    items: items.map(([exId, secs]) => ({ exId, secs })),
  });
  return {
    custom: [],
    routines: [
      r('Morning Wake-Up', '🌅', COLORS[1], 5, [['cat-cow', 45], ['neck-rolls', 30], ['arm-circles', 30], ['worlds-greatest', 30], ['deep-squat', 45], ['hip-circles', 30]]),
      r('Desk Reset', '💻', COLORS[3], 5, [['chin-tucks', 30], ['shoulder-circles', 30], ['seated-twist', 30], ['wrist-circles', 30], ['hip-flexor', 45]]),
      r('Hip Opener', '🦵', COLORS[2], 10, [['90-90', 60], ['hip-flexor', 60], ['pigeon', 60], ['frog', 60], ['deep-squat', 60], ['childs-pose', 60]]),
    ],
    history: [],
    settings: { voice: true, sound: true, getReady: 5 },
  };
}

function load() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)); } catch { return null; }
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { toast('Could not save on this device'); }
}

let state = load() || seed();

/* ---------- Helpers ---------- */

const $ = (s, r = document) => r.querySelector(s);
function uid() { return Math.random().toString(36).slice(2, 10); }
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const allExercises = () => [...BUILTIN, ...state.custom];
const exById = (id) => allExercises().find((e) => e.id === id);
const routineById = (id) => state.routines.find((r) => r.id === id);

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
function routineSecs(r) {
  const items = r.items.filter((i) => exById(i.exId));
  const work = items.reduce((t, i) => t + i.secs * (exById(i.exId).sided ? 2 : 1), 0);
  return work + Math.max(0, items.length - 1) * (r.rest || 0);
}

function activeDays() { return new Set(state.history.map((h) => dateKey(h.date))); }
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
  const list = state.history.filter((h) => new Date(h.date) >= start);
  return { sessions: list.length, secs: list.reduce((t, h) => t + h.secs, 0) };
}

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 1800);
}

function mark() {
  return `<svg viewBox="0 0 512 512" aria-hidden="true">
    <path d="M190 404 L190 252 C190 176 236 132 292 140 C340 147 356 196 350 262" fill="none" stroke="currentColor" stroke-width="40" stroke-linecap="round"/>
    <circle cx="344" cy="330" r="30" fill="currentColor"/>
  </svg>`;
}
const swatch = (r) => (COLORS.includes(r.color) ? r.color : COLORS[0]);

const svgI = (d, fill = false) => `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" ${fill ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"'}>${d}</svg>`;
const ICON = {
  play: svgI('<path d="M8 5.5v13l11-6.5z"/>', true),
  pause: svgI('<rect x="6.5" y="5" width="4" height="14" rx="1.2"/><rect x="13.5" y="5" width="4" height="14" rx="1.2"/>', true),
  prev: svgI('<path d="M18 6l-8 6 8 6z" fill="currentColor"/><path d="M6 6v12"/>'),
  next: svgI('<path d="M6 6l8 6-8 6z" fill="currentColor"/><path d="M18 6v12"/>'),
  plus: svgI('<path d="M12 5v14M5 12h14"/>'),
};

/* ---------- Views ---------- */

function routineCard(r) {
  const n = r.items.length;
  return `<div class="card routine">
    <div class="swatch" style="--c:${swatch(r)}">${esc((r.name || '?').trim().charAt(0).toUpperCase())}</div>
    <div class="grow">
      <h3>${esc(r.name)}</h3>
      <div class="meta">${n} move${n === 1 ? '' : 's'} · ${fmtMins(routineSecs(r))}</div>
    </div>
    <button class="play" data-act="play" data-id="${r.id}" aria-label="Start ${esc(r.name)}" ${n ? '' : 'disabled'}>${ICON.play}</button>
  </div>`;
}

function viewHome() {
  const h = new Date().getHours();
  const greet = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const s = streak();
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

  return `
    <header class="brandbar"><span class="brand">${mark()}BOWE</span><span class="muted small">${today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span></header>
    <h1 class="display">${greet}</h1>
    <p class="lede">A few quiet minutes for your body.</p>
    <div class="stats">
      <div class="stat"><b>${s}</b><span>day streak</span></div>
      <div class="stat"><b>${w.sessions}</b><span>this week</span></div>
      <div class="stat"><b>${Math.round(w.secs / 60)}</b><span>minutes</span></div>
    </div>
    <div class="week">${week}</div>
    <div class="section-title"><h2>Routines</h2><a class="link" href="#edit/new">New</a></div>
    <div class="stack">${state.routines.length ? state.routines.map(routineCard).join('') : `<div class="empty">No routines yet. Make your first one!</div>`}</div>`;
}

function viewRoutines() {
  const list = state.routines.map((r) => `
    <div class="card routine">
      <div class="swatch" style="--c:${swatch(r)}">${esc((r.name || '?').trim().charAt(0).toUpperCase())}</div>
      <a class="grow" href="#edit/${r.id}" style="color:inherit;text-decoration:none">
        <h3>${esc(r.name)}</h3>
        <div class="meta">${r.items.map((i) => esc(exById(i.exId)?.name || '')).filter(Boolean).join(' · ') || 'No moves yet'}</div>
      </a>
      <button class="play" data-act="play" data-id="${r.id}" aria-label="Start ${esc(r.name)}" ${r.items.length ? '' : 'disabled'}>${ICON.play}</button>
    </div>`).join('');
  return `
    <div class="row between"><h1 class="display">Routines</h1><a class="btn primary" href="#edit/new">New routine</a></div>
    <p class="muted small">Tap a routine to edit it.</p>
    <div class="stack">${list || `<div class="empty">No routines yet.</div>`}</div>`;
}

let draft = null;

function viewEdit(id) {
  if (!draft || draft._for !== id) {
    const src = id === 'new' ? null : routineById(id);
    if (id !== 'new' && !src) { location.hash = '#routines'; return ''; }
    draft = src
      ? JSON.parse(JSON.stringify(src))
      : { id: uid(), name: '', color: COLORS[0], rest: 5, items: [] };
    draft._for = id;
  }
  const d = draft;
  const items = d.items.map((it, i) => {
    const ex = exById(it.exId);
    if (!ex) return '';
    return `<div class="item">
      <div class="grow"><div class="name">${esc(ex.name)}</div>${ex.sided ? '<span class="tag">each side</span>' : ''}</div>
      <select class="input" data-act="secs" data-i="${i}" aria-label="Seconds">
        ${SECS_OPTS.map((s) => `<option value="${s}" ${s === it.secs ? 'selected' : ''}>${s < 60 ? s + 's' : fmtClock(s)}</option>`).join('')}
      </select>
      <button class="iconbtn" data-act="up" data-i="${i}" aria-label="Move up" ${i === 0 ? 'disabled' : ''}>↑</button>
      <button class="iconbtn" data-act="remove" data-i="${i}" aria-label="Remove">✕</button>
    </div>`;
  }).join('');

  return `
    <div class="row between">
      <a class="btn ghost" href="#routines">‹ Back</a>
      <button class="btn primary" data-act="save-routine">Save</button>
    </div>
    <div class="stack" style="margin-top:8px">
      <label class="field">Name<input class="input" id="r-name" maxlength="40" placeholder="e.g. Morning Wake-Up" value="${esc(d.name)}"></label>
      <div>
        <div class="field muted small" style="font-weight:600">Color</div>
        <div class="row" style="flex-wrap:wrap;margin-top:8px">
          ${COLORS.map((c) => `<button data-act="color" data-v="${c}" aria-label="Color" style="width:32px;height:32px;border-radius:50%;background:${c};border:0;box-shadow:${c === swatch(d) ? '0 0 0 2px var(--bg), 0 0 0 4px var(--ink)' : 'none'}"></button>`).join('')}
        </div>
      </div>
      <label class="field">Rest between moves
        <select class="input" id="r-rest">${[0, 3, 5, 10, 15, 20, 30].map((s) => `<option value="${s}" ${s === d.rest ? 'selected' : ''}>${s ? s + ' seconds' : 'No rest'}</option>`).join('')}</select>
      </label>
    </div>
    <div class="section-title"><h2>Moves</h2><span class="muted small">${fmtMins(routineSecs(d))} total</span></div>
    <div class="card" style="padding:4px 14px">${items || `<div class="empty">No moves yet.</div>`}</div>
    <button class="btn block" style="margin-top:12px" data-act="open-picker">Add moves</button>
    ${id !== 'new' ? `<button class="btn danger block" style="margin-top:18px" data-act="delete-routine">Delete routine</button>` : ''}`;
}

function syncDraftFields() {
  if (!draft) return;
  const n = $('#r-name'); if (n) draft.name = n.value;
  const r = $('#r-rest'); if (r) draft.rest = Number(r.value);
}

function viewMoves() {
  const groups = AREAS.map((area) => {
    const list = allExercises().filter((e) => e.area === area);
    if (!list.length) return '';
    return `<div class="section-title"><h2>${area}</h2></div>
      <div class="card" style="padding:2px 14px">${list.map((e) => `
        <details class="move">
          <summary><span class="grow">${esc(e.name)}</span>${e.sided ? '<span class="tag">each side</span>' : ''}${e.custom ? '<span class="tag">mine</span>' : ''}</summary>
          <p>${esc(e.cue || 'No notes.')}</p>
          ${e.custom ? `<button class="btn danger" data-act="delete-move" data-id="${e.id}" style="margin-top:6px">Delete move</button>` : ''}
        </details>`).join('')}</div>`;
  }).join('');
  return `<div class="row between"><h1 class="display">Moves</h1><button class="btn primary" data-act="new-move">New move</button></div>
    <p class="muted small">Tap a move to see how to do it.</p>${groups}`;
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
  const total = state.history.reduce((t, h) => t + h.secs, 0);
  const recent = [...state.history].reverse().slice(0, 20).map((h) => `
    <div class="item"><div class="grow"><div class="name">${esc(h.name)}</div>
    <div class="muted small">${new Date(h.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · ${fmtMins(h.secs)}</div></div></div>`).join('');
  const st = state.settings;

  return `<h1 class="display">Progress</h1>
    <div class="stats" style="margin-top:14px">
      <div class="stat"><b>${streak()}</b><span>day streak</span></div>
      <div class="stat"><b>${state.history.length}</b><span>sessions</span></div>
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
        <select class="input" data-set="getReady" style="width:auto;margin:0">${[0, 3, 5, 10].map((s) => `<option value="${s}" ${s === st.getReady ? 'selected' : ''}>${s ? s + 's' : 'Off'}</option>`).join('')}</select>
      </label>
    </div>
    <button class="btn danger block" style="margin-top:18px" data-act="reset">Reset all data</button>
    <p class="muted small" style="text-align:center;margin-top:16px">Your data is stored only on this device.</p>`;
}

/* ---------- Sheets ---------- */

function openSheet(html) {
  $('#sheet-panel').innerHTML = html;
  $('#sheet').hidden = false;
}
function closeSheet() { $('#sheet').hidden = true; }

function pickerHtml() {
  return `<div class="row between"><h2>Add moves</h2><button class="btn primary" data-act="close-sheet">Done</button></div>
    ${AREAS.map((area) => {
      const list = allExercises().filter((e) => e.area === area);
      if (!list.length) return '';
      return `<div class="section-title"><h3>${area}</h3></div>${list.map((e) => `
        <button class="pick" data-act="add-move" data-id="${e.id}">
          <span><b style="font-weight:600">${esc(e.name)}</b>${e.sided ? ' <span class="tag">each side</span>' : ''}</span>
          <span class="plus">${ICON.plus}</span>
        </button>`).join('')}`;
    }).join('')}`;
}

function newMoveHtml() {
  return `<div class="row between"><h2>New move</h2><button class="btn ghost" data-act="close-sheet">Cancel</button></div>
    <div class="stack" style="margin-top:12px">
      <label class="field">Name<input class="input" id="m-name" maxlength="40" placeholder="e.g. Banded shoulder stretch"></label>
      <label class="field">Area<select class="input" id="m-area">${AREAS.map((a) => `<option>${a}</option>`).join('')}</select></label>
      <label class="field">How to do it<textarea class="input" id="m-cue" maxlength="240" placeholder="Short reminder shown during the routine"></textarea></label>
      <label class="switch" style="border:0"><span>Do each side separately</span><input type="checkbox" id="m-sided"></label>
      <button class="btn primary block" data-act="save-move">Save move</button>
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
  if (!state.settings.sound || !audioCtx) return;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.frequency.value = freq; o.type = 'sine';
  g.gain.setValueAtTime(vol, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + ms / 1000);
  o.connect(g).connect(audioCtx.destination);
  o.start(); o.stop(audioCtx.currentTime + ms / 1000);
}
function say(text) {
  if (!state.settings.voice || !('speechSynthesis' in window)) return;
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
  if (state.settings.getReady && steps.length) steps.unshift({ type: 'ready', secs: state.settings.getReady, next: steps[0] });
  return steps;
}

async function startPlayer(id) {
  const r = routineById(id);
  if (!r || !r.items.length) return;
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
  const next = s.type === 'work' && s.next ? `Next: ${esc(s.next.ex.name)}${s.next.side ? ' (' + s.next.side.toLowerCase() + ')' : ''}` : s.type === 'work' ? 'Last move!' : '';
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
    <div class="p-ring">
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
  state.history.push({ routineId: r.id, name: r.name, date: new Date().toISOString(), secs });
  save();
  beep(880, 160); setTimeout(() => beep(1175, 260), 180);
  say('Well done. Routine complete.');
  const el = $('#player');
  el.classList.remove('rest');
  el.innerHTML = `
    <div style="margin:auto 0;display:flex;flex-direction:column;align-items:center;gap:10px">
      <div class="done-mark">${mark()}</div>
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
  const views = { home: viewHome, routines: viewRoutines, moves: viewMoves, progress: viewProgress, edit: () => viewEdit(arg) };
  const v = views[route] || viewHome;
  $('#view').innerHTML = v();
  const tab = route === 'edit' ? 'routines' : (views[route] ? route : 'home');
  document.querySelectorAll('.tabbar a').forEach((a) => a.classList.toggle('active', a.dataset.tab === tab));
}

window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });

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
    case 'up': syncDraftFields(); [draft.items[i - 1], draft.items[i]] = [draft.items[i], draft.items[i - 1]]; render(); break;
    case 'remove': syncDraftFields(); draft.items.splice(i, 1); render(); break;
    case 'open-picker': syncDraftFields(); openSheet(pickerHtml()); break;
    case 'add-move': draft.items.push({ exId: t.dataset.id, secs: 30 }); toast(`Added ${exById(t.dataset.id).name}`); break;
    case 'close-sheet': closeSheet(); render(); break;
    case 'save-routine': {
      syncDraftFields();
      const name = draft.name.trim();
      if (!name) { toast('Give your routine a name'); $('#r-name').focus(); break; }
      if (!draft.items.length) { toast('Add at least one move'); break; }
      const { _for, ...clean } = draft;
      clean.name = name;
      const idx = state.routines.findIndex((r) => r.id === clean.id);
      if (idx >= 0) state.routines[idx] = clean; else state.routines.push(clean);
      save(); draft = null; toast('Routine saved'); location.hash = '#routines';
      break;
    }
    case 'delete-routine':
      if (confirm('Delete this routine?')) {
        state.routines = state.routines.filter((r) => r.id !== draft.id);
        save(); draft = null; location.hash = '#routines';
      }
      break;

    case 'new-move': openSheet(newMoveHtml()); break;
    case 'save-move': {
      const name = $('#m-name').value.trim();
      if (!name) { toast('Give the move a name'); break; }
      state.custom.push({ id: 'c-' + uid(), name, area: $('#m-area').value, cue: $('#m-cue').value.trim(), sided: $('#m-sided').checked, custom: true });
      save(); closeSheet(); render(); toast('Move added');
      break;
    }
    case 'delete-move':
      if (confirm('Delete this move? It will be removed from your routines too.')) {
        state.custom = state.custom.filter((m) => m.id !== t.dataset.id);
        state.routines.forEach((r) => { r.items = r.items.filter((it) => it.exId !== t.dataset.id); });
        save(); render();
      }
      break;

    case 'reset':
      if (confirm('Erase all routines, custom moves and history?')) { state = seed(); save(); render(); toast('Fresh start!'); }
      break;
  }
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.act === 'secs') { syncDraftFields(); draft.items[Number(t.dataset.i)].secs = Number(t.value); render(); }
  if (t.dataset.set) {
    state.settings[t.dataset.set] = t.type === 'checkbox' ? t.checked : Number(t.value);
    save();
  }
});

// Re-acquire the screen wake lock when returning to the app mid-routine.
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible' && player && !wakeLock) {
    await requestWakeLock();
  }
});

render();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
