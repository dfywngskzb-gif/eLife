/* ═══════════════════════════════════════════
   eLife v3.0 · app.js — Complete
═══════════════════════════════════════════ */
'use strict';

/* ── PWA ── */
if ('serviceWorker' in navigator) {
 window.addEventListener('load', () => {
console.log("eLife cargó correctamente");
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
 });
}

/* ── CONSTANTS ── */
const DS  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const DF  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const MN  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const CL  = { work:'Trabajo', spiritual:'Espiritual', health:'Salud', project:'Proyectos', appt:'Citas' };
const CE  = { work:'🟠', spiritual:'🔵', health:'🟢', project:'🟣', appt:'☁️' };
const CC  = { work:'--cw', spiritual:'--cs', health:'--ch', project:'--cp', appt:'--ca' };
const ML  = { 5:'😄', 4:'🙂', 3:'😐', 2:'😕', 1:'😞' };
const QT  = [
  '"Hoy puedes avanzar 1%"',
  '"La disciplina es libertad"',
  '"Pequeños pasos, grandes cambios"',
  '"Actúa aunque no tengas ganas"',
  '"Hoy importa más que ayer"',
  '"El éxito es suma de esfuerzos diarios"',
  '"Cada día es una nueva oportunidad"'
];

/* ── STATE ── */
let S = {
  events: [], tasks: [], habits: [], habitLog: {},
  goals: [], journal: [], waterLog: {}, focusLog: [], notifs: [],
  pomo: { sessions: {}, totalMin: 0 },
  settings: {
    darkMode: null, name: '',
    waterGoal: 8, waterReminder: 60,
    workStart: '09:00', workEnd: '17:00',
    sleepTime: '23:00', wakeTime: '09:00',
    pomoWork: 25, pomoShort: 5, pomoLong: 15
  }
};

/* ── LIVE STATE ── */
let pomo = { timer: null, sec: 25*60, total: 25*60, running: false, type: 'work', done: 0 };
let focusTimer = null, focusSec = 0, focusTotal = 0, selFocusMin = 25;
let calDayOff = 0, calWeekOff = 0;
let editEvId = null, editGoalId = null, editTaskId = null;
let selHabDate = todayKey();
let taskFilter = 'all';
let curMood = null;
let waterRemTimer = null;
let nxtTimer = null;

/* ── STORAGE ── */
const save = () => { try { localStorage.setItem('elife3', JSON.stringify(S)); } catch(e) {} };
function load() {
  try {
    const r = localStorage.getItem('elife3');
    if (r) S = merge(S, JSON.parse(r));
  } catch(e) {}
}
function merge(a, b) {
  const o = { ...a };
  for (const k of Object.keys(b)) {
    if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) o[k] = merge(a[k] || {}, b[k]);
    else o[k] = b[k];
  }
  return o;
}

/* ── UTILS ── */
const uid  = () => Math.random().toString(36).slice(2, 9);
const pad  = n  => String(n).padStart(2, '0');
const $    = s  => document.querySelector(s);
const $$   = s  => [...document.querySelectorAll(s)];
const mk   = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls)  e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
};

function TodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function dateKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function toMin(t) {
  if (!t) return -1;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${pad(m)} ${h >= 12 ? 'PM' : 'AM'}`;
}
function fmtDeadline(ds) {
  if (!ds) return '';
  const d = new Date(ds + 'T00:00:00'), td = new Date(); td.setHours(0,0,0,0);
  const diff = Math.ceil((d - td) / 86400000);
  if (diff < 0)  return `Venció hace ${Math.abs(diff)}d`;
  if (diff === 0) return '¡Vence hoy!';
  if (diff === 1) return 'Vence mañana';
  return `${diff}d restantes`;
}

/* ── TOAST ── */
let toastT = null;
function toast(msg, dur = 2600) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.add('hidden'), dur);
}

/* ── MODALS ── */
const openM  = id => $(`#${id}`)?.classList.remove('hidden');
const closeM = id => $(`#${id}`)?.classList.add('hidden');
$$('.modal-close').forEach(b => b.addEventListener('click', () => closeM(b.dataset.m)));
$$('.modal-overlay').forEach(ov => ov.addEventListener('click', e => { if (e.target === ov) ov.classList.add('hidden'); }));

/* ── THEME ── */
function applyTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  const dt = $('#dark-toggle');
  if (dt) dt.checked = !!dark;
}
function initTheme() {
  const s = S.settings.darkMode;
  if (s !== null) { applyTheme(s); return; }
  applyTheme(window.matchMedia('(prefers-color-scheme:dark)').matches);
  window.matchMedia('(prefers-color-scheme:dark)').addEventListener('change', e => {
    if (S.settings.darkMode === null) applyTheme(e.matches);
  });
}
$$('.theme-toggle').forEach(b => b.addEventListener('click', () => {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  S.settings.darkMode = !dark;
  applyTheme(!dark); save();
}));
$('#dark-toggle').addEventListener('change', function() {
  S.settings.darkMode = this.checked; applyTheme(this.checked); save();
});

/* ── CLOCK ── */
function tickClock() {
  const n = new Date();
  const t = $(`#sb-time`), d = $(`#sb-date`);
  if (t) t.textContent = `${pad(n.getHours())}:${pad(n.getMinutes())}`;
  if (d) d.textContent = `${DS[n.getDay()]}, ${n.getDate()} ${MN[n.getMonth()].slice(0,3)}`;
}
setInterval(tickClock, 10000);

/* ── NAVIGATION ── */
let curView = 'home';
function showView(name) {
  $$('.view').forEach(v => v.classList.remove('active'));
  $$('.nav-item, .bn-item').forEach(b => b.classList.toggle('active', b.dataset.view === name));
  $(`#view-${name}`)?.classList.add('active');
  curView = name;
  closeMoreMenu();
  const renders = {
    home: renderHome, calendar: renderCalendar, tasks: renderTasks,
    habits: renderHabits, stats: renderStats, journal: renderJournal, goals: renderGoals
  };
  if (renders[name]) renders[name]();
}
$$('[data-view]').forEach(b => b.addEventListener('click', () => showView(b.dataset.view)));

function closeMoreMenu() { $('#more-menu')?.classList.add('hidden'); }
$('#btn-more')?.addEventListener('click', e => { e.stopPropagation(); $('#more-menu')?.classList.toggle('hidden'); });
document.addEventListener('click', closeMoreMenu);
$$('.more-item').forEach(b => b.addEventListener('click', () => showView(b.dataset.view)));
$$('.link-btn').forEach(b => b.addEventListener('click', () => showView(b.dataset.view)));

/* ── NOTIFICATIONS CENTER ── */
function addNotif(msg, icon = '🔔') {
  if (!S.notifs) S.notifs = [];
  S.notifs.unshift({ id: uid(), msg, icon, time: new Date().toISOString(), read: false });
  if (S.notifs.length > 50) S.notifs = S.notifs.slice(0, 50);
  save(); updateNotifBadge();
}
function updateNotifBadge() {
  const unread = (S.notifs || []).filter(n => !n.read).length;
  const btn = $('#btn-notif');
  if (btn) btn.textContent = unread > 0 ? `🔔${unread}` : '🔔';
}
function renderNotifPanel() {
  const list = $('#np-list');
  if (!S.notifs?.length) { list.innerHTML = '<div class="np-empty">Sin notificaciones</div>'; return; }
  list.innerHTML = '';
  S.notifs.forEach(n => {
    const d   = new Date(n.time);
    const div = mk('div', `np-item${n.read ? '' : ' unread'}`);
    div.innerHTML = `<span class="np-ico">${n.icon}</span><div class="np-body"><div class="np-msg">${n.msg}</div><div class="np-time">${DS[d.getDay()]} ${pad(d.getHours())}:${pad(d.getMinutes())}</div></div>`;
    list.appendChild(div);
  });
}

$('#btn-notif').addEventListener('click', e => {
  e.stopPropagation();
  if (S.notifs) S.notifs.forEach(n => n.read = true);
  save(); updateNotifBadge(); renderNotifPanel();
  $('#notif-panel').classList.remove('hidden');
  $('#np-overlay').classList.remove('hidden');
});
$('#np-close').addEventListener('click', () => { $('#notif-panel').classList.add('hidden'); $('#np-overlay').classList.add('hidden'); });
$('#np-overlay').addEventListener('click', () => { $('#notif-panel').classList.add('hidden'); $('#np-overlay').classList.add('hidden'); });
$('#np-clear').addEventListener('click', () => { S.notifs = []; save(); renderNotifPanel(); updateNotifBadge(); });

/* ── SEARCH ── */
$('#btn-search').addEventListener('click', () => { $('#search-bar').classList.remove('hidden'); $('#search-input').focus(); });
$('#search-close').addEventListener('click', () => { $('#search-bar').classList.add('hidden'); $('#search-input').value = ''; $('#search-results').innerHTML = ''; });
$('#search-input').addEventListener('input', function() {
  const q = this.value.trim().toLowerCase();
  const c = $('#search-results');
  if (!q) { c.innerHTML = ''; return; }
  const results = [];
  (S.events  || []).forEach(e => { if (e.name.toLowerCase().includes(q)) results.push({ type:'Evento',  name:e.name, icon:CE[e.category]||'📅', action:()=>openEvModal(e.id) }); });
  (S.tasks   || []).forEach(t => { if (t.name.toLowerCase().includes(q)) results.push({ type:'Tarea',   name:t.name, icon:'📌', action:()=>openTaskModal(t.id) }); });
  (S.habits  || []).forEach(h => { if (h.name.toLowerCase().includes(q)) results.push({ type:'Hábito',  name:h.name, icon:h.icon||'⭐', action:()=>showView('habits') }); });
  (S.goals   || []).forEach(g => { if (g.name.toLowerCase().includes(q)) results.push({ type:'Meta',    name:g.name, icon:'🎯', action:()=>openGoalModal(g.id) }); });
  if (!results.length) { c.innerHTML = '<div class="sr-empty">Sin resultados</div>'; return; }
  c.innerHTML = '';
  results.slice(0, 8).forEach(r => {
    const item = mk('div', 'sr-item');
    item.innerHTML = `<span class="sr-ico">${r.icon}</span><div><div class="sr-name">${r.name}</div><div class="sr-type">${r.type}</div></div>`;
    item.addEventListener('click', () => { r.action(); $('#search-bar').classList.add('hidden'); $('#search-input').value = ''; });
    c.appendChild(item);
  });
});

/* ═══════════════════════════════════════
   HOME
═══════════════════════════════════════ */
function renderHome() {
  const now = new Date();
  $('#h-wday').textContent  = DF[now.getDay()].toUpperCase();
  $('#h-day').textContent   = now.getDate();
  $('#h-month').textContent = `${MN[now.getMonth()]} ${now.getFullYear()}`;
  const h = now.getHours(), name = S.settings.name ? `, ${S.settings.name}` : '';
  $('#greeting').textContent = h < 12 ? `☀️ Buenos días${name}` : h < 18 ? `🌤 Buenas tardes${name}` : `🌙 Buenas noches${name}`;
  $('#quote').textContent    = QT[now.getDay() % QT.length];
  renderTodayList();
  renderNextCard();
  renderRings();
  renderWater();
  renderHomeHabits();
}

/* Today list */
function renderTodayList() {
  const dn  = new Date().getDay();
  const evs = (S.events || []).filter(e => e.days?.includes(dn)).sort((a,b) => toMin(a.start) - toMin(b.start));
  const c   = $('#today-list');
  c.innerHTML = '';
  if (!evs.length) { c.innerHTML = '<div class="ev-empty">Sin actividades programadas hoy</div>'; return; }
  evs.forEach(ev => c.appendChild(buildEvCard(ev)));
}

function buildEvCard(ev) {
  const card = mk('div', `ev-card ${ev.status || 'pending'}`);
  card.dataset.cat = ev.category || 'work';
  const badgeCls   = ev.status === 'done' ? 'ev-done' : ev.status === 'failed' ? 'ev-failed' : 'ev-pending';
  const badgeIcon  = ev.status === 'done' ? '✅' : ev.status === 'failed' ? '❌' : '⏳';
  card.innerHTML = `
    <div class="ev-time-col">
      <span class="ev-t">${fmtTime(ev.start) || '—'}</span>
      ${ev.end ? `<span class="ev-t2">${fmtTime(ev.end)}</span>` : ''}
    </div>
    <div class="ev-info">
      <div class="ev-name">${ev.name}</div>
      <div class="ev-meta">${CE[ev.category]||''} ${CL[ev.category]||''}</div>
    </div>
    <span class="ev-badge ${badgeCls}">${badgeIcon}</span>
    <div class="ev-actions">
      <button class="ev-btn" data-act="edit" title="Editar">✎</button>
      <button class="ev-btn" data-act="status" title="Estado">✓</button>
    </div>`;
  card.querySelector('[data-act=edit]').addEventListener('click',   e => { e.stopPropagation(); openEvModal(ev.id); });
  card.querySelector('[data-act=status]').addEventListener('click', e => { e.stopPropagation(); cycleStatus(ev); });
  card.addEventListener('click', () => openEvModal(ev.id));
  return card;
}

function cycleStatus(ev) {
  const nxt = { pending:'done', done:'failed', failed:'pending' };
  ev.status = nxt[ev.status || 'pending'];
  save();
  if (ev.status === 'failed') {
    $('#failed-name').textContent = ev.name;
    ['move','keep','del'].forEach(a => $(`#fail-${a}`)._ev = ev);
    openM('m-failed');
  } else {
    renderHome();
    if (curView === 'calendar') renderCalendar();
  }
}

/* Failed modal actions */
$('#fail-move').addEventListener('click', () => {
  const ev = $('#fail-move')._ev;
  if (ev) {
    const [h, m] = (ev.start || '12:00').split(':').map(Number);
    ev.start  = `${pad(Math.min(h+1, 23))}:${pad(m)}`;
    ev.status = 'pending';
    save(); toast('📅 Movido 1 hora después');
  }
  closeM('m-failed'); renderHome(); if (curView === 'calendar') renderCalendar();
});
$('#fail-keep').addEventListener('click', () => {
  const ev = $('#fail-keep')._ev;
  if (ev) { ev.status = 'pending'; save(); }
  closeM('m-failed'); renderHome();
});
$('#fail-del').addEventListener('click', () => {
  const ev = $('#fail-del')._ev;
  if (ev) { S.events = S.events.filter(e => e.id !== ev.id); save(); }
  closeM('m-failed'); toast('🗑 Eliminado'); renderHome(); if (curView === 'calendar') renderCalendar();
});

/* Next event countdown */
function renderNextCard() {
  clearInterval(nxtTimer);
  const now = new Date(), dn = now.getDay(), nm = now.getHours()*60 + now.getMinutes();
  const up  = (S.events || [])
    .filter(e => e.days?.includes(dn) && e.start && e.status !== 'done')
    .map(e => ({ ev: e, mins: toMin(e.start) }))
    .filter(x => x.mins > nm)
    .sort((a, b) => a.mins - b.mins);
  const nn = $('#next-name'), nt = $('#next-time'), nc = $('#next-cd');
  if (!up.length) { nn.textContent = 'Sin eventos pendientes hoy'; nt.textContent = ''; nc.textContent = '🎉'; return; }
  const nxt = up[0];
  nn.textContent = nxt.ev.name;
  nt.textContent = `${fmtTime(nxt.ev.start)}${nxt.ev.end ? ' – ' + fmtTime(nxt.ev.end) : ''}`;
  const tick = () => {
    const n = new Date(), diff = nxt.mins*60 - (n.getHours()*3600 + n.getMinutes()*60 + n.getSeconds());
    if (diff <= 0) { nc.textContent = '¡Ahora!'; clearInterval(nxtTimer); return; }
    const hh = Math.floor(diff/3600), mm = Math.floor(diff%3600/60), ss = diff%60;
    nc.textContent = hh ? `${pad(hh)}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;
  };
  tick(); nxtTimer = setInterval(tick, 1000);
}

/* Rings */
function renderRings() {
  const C = 150.8, dk = todayKey(), dn = new Date().getDay();
  const log = S.habitLog[dk] || {};
  const hd  = (S.habits || []).filter(h => log[h.id]).length, ht = (S.habits || []).length;
  setRing('r-habits', ht ? hd/ht : 0, C); $('#rv-habits').textContent = `${hd}/${ht}`;
  const te = (S.events || []).filter(e => e.days?.includes(dn)), de = te.filter(e => e.status === 'done');
  setRing('r-tasks', te.length ? de.length/te.length : 0, C); $('#rv-tasks').textContent = `${de.length}/${te.length}`;
  const w = S.waterLog[dk] || 0, wg = S.settings.waterGoal || 8;
  setRing('r-water', Math.min(w/wg, 1), C); $('#rv-water').textContent = `${w}/${wg}`;
  const ag = (S.goals || []).length ? S.goals.reduce((s,g) => s + (g.progress||0), 0) / S.goals.length / 100 : 0;
  setRing('r-goals', ag, C); $('#rv-goals').textContent = `${Math.round(ag*100)}%`;
}
function setRing(id, pct, C) {
  const r = $(`#${id}`);
  if (r) r.style.strokeDashoffset = C * (1 - Math.min(pct, 1));
}

/* Water */
function renderWater() {
  const dk = todayKey(), cnt = S.waterLog[dk] || 0, goal = S.settings.waterGoal || 8;
  $('#water-chip').textContent = `${cnt}/${goal}`;
  const c = $('#water-glasses');
  c.innerHTML = '';
  for (let i = 0; i < goal; i++) {
    const g = mk('div', `water-glass${i < cnt ? ' filled' : ''}`);
    g.title = `Vaso ${i+1}`;
    g.addEventListener('click', () => { S.waterLog[dk] = i + 1; save(); renderWater(); renderRings(); });
    c.appendChild(g);
  }
}
$('#btn-add-water').addEventListener('click', () => {
  const dk = todayKey(), g = S.settings.waterGoal || 8, c = S.waterLog[dk] || 0;
  if (c < g) { S.waterLog[dk] = c + 1; save(); renderWater(); renderRings(); toast('💧 +1 vaso'); }
  else toast('💧 ¡Meta de agua alcanzada!');
});
$('#btn-reset-water').addEventListener('click', () => {
  S.waterLog[todayKey()] = 0; save(); renderWater(); renderRings();
});

/* Home quick habits */
function renderHomeHabits() {
  const c = $('#home-habits'), dk = todayKey(), log = S.habitLog[dk] || {};
  c.innerHTML = '';
  const top = (S.habits || []).slice(0, 5);
  if (!top.length) { c.innerHTML = '<div style="color:var(--t3);font-size:.83rem;text-align:center;padding:.8rem 0">Crea hábitos para verlos aquí</div>'; return; }
  top.forEach(h => {
    const done = !!log[h.id];
    const row  = mk('div', 'hh-row');
    row.innerHTML = `
      <button class="hh-chk ${done ? 'done' : ''}">${done ? '✓' : ''}</button>
      <span class="hh-icon">${h.icon || '⭐'}</span>
      <span class="hh-name">${h.name}</span>
      <span class="hh-str">🔥 ${calcStreak(h.id)}</span>`;
    row.querySelector('.hh-chk').addEventListener('click', e => {
      e.stopPropagation();
      if (!S.habitLog[dk]) S.habitLog[dk] = {};
      S.habitLog[dk][h.id] = !S.habitLog[dk][h.id];
      save(); renderHomeHabits(); renderRings();
    });
    c.appendChild(row);
  });
}
$('#btn-add-ev-home').addEventListener('click', () => openEvModal());

/* ═══════════════════════════════════════
   CALENDAR
═══════════════════════════════════════ */
function renderCalendar() { renderCalDay(); renderCalWeek(); }

function renderCalDay() {
  const d = new Date(); d.setDate(d.getDate() + calDayOff);
  $('#cal-day-lbl').textContent = `${DF[d.getDay()]}, ${d.getDate()} de ${MN[d.getMonth()]}`;
  const tl  = $('#timeline'); tl.innerHTML = '';
  const evs = (S.events || []).filter(e => e.days?.includes(d.getDay())).sort((a,b) => toMin(a.start) - toMin(b.start));
  if (!evs.length) { tl.innerHTML = '<div class="tl-empty">Sin eventos este día</div>'; return; }
  const byH = {};
  evs.forEach(e => { const h = e.start ? +e.start.split(':')[0] : 0; (byH[h] = byH[h] || []).push(e); });
  [...new Set(evs.map(e => e.start ? +e.start.split(':')[0] : 0))].sort((a,b) => a-b).forEach(h => {
    const row  = mk('div', 'tl-row');
    const lbl  = mk('div', 'tl-label', `${pad(h)}:00`);
    const slot = mk('div', 'tl-events');
    byH[h].forEach(ev => {
      const te = mk('div', 'tl-ev', `${ev.name} <small style="opacity:.65;font-weight:500">${fmtTime(ev.start)}${ev.end ? ' – '+fmtTime(ev.end) : ''}</small>`);
      te.dataset.cat = ev.category || 'work';
      te.addEventListener('click', () => openEvModal(ev.id));
      slot.appendChild(te);
    });
    row.appendChild(lbl); row.appendChild(slot); tl.appendChild(row);
  });
}

function renderCalWeek() {
  const today = new Date();
  const start = new Date(today); start.setDate(today.getDate() - today.getDay() + calWeekOff*7);
  const end   = new Date(start); end.setDate(start.getDate() + 6);
  $('#cal-week-lbl').textContent = `${start.getDate()} ${MN[start.getMonth()].slice(0,3)} – ${end.getDate()} ${MN[end.getMonth()].slice(0,3)}`;
  const grid = $('#week-grid'); grid.innerHTML = '';
  for (let i = 0; i < 7; i++) {
    const d     = new Date(start); d.setDate(start.getDate() + i);
    const isT   = dateKey(d) === dateKey(today);
    const col   = mk('div', `wk-col${isT ? ' is-today' : ''}`);
    col.innerHTML = `<div class="wk-hdr">${DS[i]}</div><div class="${isT ? 'wk-day tn' : 'wk-day'}">${d.getDate()}</div>`;
    (S.events || []).filter(e => e.days?.includes(d.getDay())).sort((a,b) => toMin(a.start) - toMin(b.start)).forEach(ev => {
      const dot = mk('div', 'wk-dot', ev.name);
      dot.dataset.cat = ev.category || 'work';
      dot.title = `${ev.name} ${fmtTime(ev.start)}`;
      dot.addEventListener('click', () => openEvModal(ev.id));
      col.appendChild(dot);
    });
    grid.appendChild(col);
  }
}

$('#prev-day').addEventListener('click',      () => { calDayOff--;  renderCalDay(); });
$('#next-day').addEventListener('click',      () => { calDayOff++;  renderCalDay(); });
$('#btn-today-day').addEventListener('click', () => { calDayOff = 0; renderCalDay(); });
$('#prev-week').addEventListener('click',       () => { calWeekOff--;  renderCalWeek(); });
$('#next-week').addEventListener('click',       () => { calWeekOff++;  renderCalWeek(); });
$('#btn-today-week').addEventListener('click',  () => { calWeekOff = 0; renderCalWeek(); });
$('#btn-add-ev-cal').addEventListener('click',  () => openEvModal());

$$('.cal-tab').forEach(t => t.addEventListener('click', () => {
  $$('.cal-tab').forEach(x => x.classList.remove('active'));
  $$('.cal-panel').forEach(x => x.classList.remove('active'));
  t.classList.add('active');
  $(`#cal-${t.dataset.cal}`).classList.add('active');
}));

/* ── EVENT MODAL ── */
function openEvModal(id = null) {
  editEvId = id;
  $('#m-event-title').textContent = id ? 'Editar evento' : 'Nuevo evento';
  $('#ev-name').value = ''; $('#ev-start').value = ''; $('#ev-end').value = '';
  $('#ev-notes').value = ''; $('#ev-notif').value = '15';
  $$('#ev-cat  .cat-btn').forEach((b,i) => b.classList.toggle('active', i === 0));
  $$('#ev-days .day-btn').forEach(b => b.classList.remove('active'));
  $$('#ev-status .status-btn').forEach((b,i) => b.classList.toggle('active', i === 0));
  $('#ev-del').classList.toggle('hidden', !id);
  $('#ev-dup').classList.toggle('hidden', !id);
  if (id) {
    const ev = (S.events || []).find(e => e.id === id);
    if (!ev) return;
    $('#ev-name').value  = ev.name;
    $('#ev-start').value = ev.start || '';
    $('#ev-end').value   = ev.end   || '';
    $('#ev-notes').value = ev.notes || '';
    $('#ev-notif').value = ev.notif || '15';
    $$('#ev-cat  .cat-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === (ev.category || 'work')));
    $$('#ev-days .day-btn').forEach(b => b.classList.toggle('active', ev.days?.includes(+b.dataset.d)));
    $$('#ev-status .status-btn').forEach(b => b.classList.toggle('active', b.dataset.st === (ev.status || 'pending')));
  }
  openM('m-event');
}

$('#ev-save').addEventListener('click', () => {
  const name = $('#ev-name').value.trim();
  if (!name) { toast('⚠️ Ingresa un nombre'); return; }
  const cat    = $('#ev-cat .cat-btn.active')?.dataset.cat || 'work';
  const days   = $$('#ev-days .day-btn.active').map(b => +b.dataset.d);
  const status = $('#ev-status .status-btn.active')?.dataset.st || 'pending';
  const ev = {
    id: editEvId || uid(), name,
    start: $('#ev-start').value, end: $('#ev-end').value,
    notes: $('#ev-notes').value, category: cat,
    days:  days.length ? days : [new Date().getDay()],
    notif: $('#ev-notif').value, status
  };
  if (editEvId) {
    const i = (S.events || []).findIndex(e => e.id === editEvId);
    if (i !== -1) S.events[i] = ev;
  } else {
    if (!S.events) S.events = [];
    S.events.push(ev);
    addNotif(`Evento creado: ${name}`, '📅');
  }
  save(); closeM('m-event'); toast(editEvId ? '✅ Evento actualizado' : '✅ Evento creado');
  schedEvNotif(ev); renderHome(); if (curView === 'calendar') renderCalendar();
});

$('#ev-del').addEventListener('click', () => {
  S.events = S.events.filter(e => e.id !== editEvId);
  save(); closeM('m-event'); toast('🗑 Eliminado');
  renderHome(); if (curView === 'calendar') renderCalendar();
});
$('#ev-dup').addEventListener('click', () => {
  const o = (S.events || []).find(e => e.id === editEvId);
  if (!o) return;
  S.events.push({ ...o, id: uid(), name: o.name + ' (copia)', status: 'pending' });
  save(); closeM('m-event'); toast('📋 Duplicado');
  renderHome(); if (curView === 'calendar') renderCalendar();
});

$$('#ev-cat .cat-btn').forEach(b => b.addEventListener('click', () => {
  $$('#ev-cat .cat-btn').forEach(x => x.classList.remove('active')); b.classList.add('active');
}));
$$('#ev-days .day-btn').forEach(b => b.addEventListener('click', () => b.classList.toggle('active')));
$$('#ev-status .status-btn').forEach(b => b.addEventListener('click', () => {
  $$('#ev-status .status-btn').forEach(x => x.classList.remove('active')); b.classList.add('active');
}));

function schedEvNotif(ev) {
  if (ev.notif === '0' || !ev.start || Notification.permission !== 'granted') return;
  const dn = new Date().getDay();
  if (!ev.days?.includes(dn)) return;
  const mins = +ev.notif || 15;
  const [h, m] = ev.start.split(':').map(Number);
  const fire   = new Date(); fire.setHours(h, m - mins, 0, 0);
  const diff   = fire - new Date();
  if (diff > 0) setTimeout(() => new Notification('eLife 📅', { body: `"${ev.name}" en ${mins} min`, icon: 'icons/icon-192.png' }), diff);
}
function schedAllNotifs() {
  if (Notification.permission === 'granted') (S.events || []).forEach(schedEvNotif);
}

/* ═══════════════════════════════════════
   TASKS
═══════════════════════════════════════ */
function renderTasks() {
  const c = $('#task-list'); c.innerHTML = '';
  const all = (S.tasks || []);
  const filtered = taskFilter === 'all' ? all : all.filter(t => t.status === taskFilter);
  const priOrder = { high: 0, medium: 1, low: 2 };
  filtered.sort((a,b) => (priOrder[a.priority]||1) - (priOrder[b.priority]||1));
  if (!filtered.length) {
    c.innerHTML = `<div class="ev-empty">${taskFilter === 'all' ? 'Sin tareas. ¡Crea una!' : 'Sin tareas en este estado'}</div>`;
    return;
  }
  filtered.forEach(t => {
    const card = mk('div', `task-card ${t.status || 'pending'}`);
    card.dataset.cat = t.category || 'work';
    const priLbl = { high:'🔴 Alta', medium:'🟡 Media', low:'🟢 Baja' }[t.priority || 'medium'];
    const priCls = t.priority || 'medium';
    card.innerHTML = `
      <button class="task-chk ${t.status === 'done' ? 'done' : ''}">${t.status === 'done' ? '✓' : ''}</button>
      <div class="task-info">
        <div class="task-name">${t.name}</div>
        ${t.desc ? `<div class="task-desc">${t.desc}</div>` : ''}
        <div class="task-meta">
          <span class="task-pri ${priCls}">${priLbl}</span>
          ${t.date ? `<span class="task-date">📅 ${new Date(t.date+'T00:00:00').toLocaleDateString('es',{day:'numeric',month:'short'})}</span>` : ''}
          <span style="font-size:.7rem;color:var(--t3)">${CE[t.category]||''} ${CL[t.category]||''}</span>
        </div>
      </div>`;
    card.querySelector('.task-chk').addEventListener('click', e => {
      e.stopPropagation();
      t.status = t.status === 'done' ? 'pending' : 'done';
      save(); renderTasks();
      if (t.status === 'done') { toast('✅ Tarea completada'); addNotif(`Tarea: ${t.name}`, '✅'); }
    });
    card.addEventListener('click', () => openTaskModal(t.id));
    c.appendChild(card);
  });
}

$$('.filter-btn').forEach(b => b.addEventListener('click', () => {
  $$('.filter-btn').forEach(x => x.classList.remove('active')); b.classList.add('active');
  taskFilter = b.dataset.f; renderTasks();
}));
$('#btn-add-task').addEventListener('click', () => openTaskModal());

function openTaskModal(id = null) {
  editTaskId = id;
  $('#m-task-title').textContent = id ? 'Editar tarea' : 'Nueva tarea';
  ['task-name','task-desc'].forEach(x => $(`#${x}`).value = '');
  ['task-date','task-time'].forEach(x => $(`#${x}`).value = '');
  $$('#task-pri .cat-btn').forEach((b,i) => b.classList.toggle('active', i === 1));
  $$('#task-cat .cat-btn').forEach((b,i) => b.classList.toggle('active', i === 0));
  $('#task-del').classList.toggle('hidden', !id);
  if (id) {
    const t = (S.tasks || []).find(x => x.id === id);
    if (!t) return;
    $('#task-name').value = t.name; $('#task-desc').value = t.desc || '';
    $('#task-date').value = t.date || ''; $('#task-time').value = t.time || '';
    $$('#task-pri .cat-btn').forEach(b => b.classList.toggle('active', b.dataset.p === (t.priority || 'medium')));
    $$('#task-cat .cat-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === (t.category || 'work')));
  }
  openM('m-task');
}

$('#task-save').addEventListener('click', () => {
  const name = $('#task-name').value.trim();
  if (!name) { toast('⚠️ Ingresa un nombre'); return; }
  const pri = $('#task-pri .cat-btn.active')?.dataset.p  || 'medium';
  const cat = $('#task-cat .cat-btn.active')?.dataset.cat || 'work';
  const existing = editTaskId ? (S.tasks || []).find(x => x.id === editTaskId) : null;
  const t = {
    id: editTaskId || uid(), name,
    desc: $('#task-desc').value, date: $('#task-date').value, time: $('#task-time').value,
    priority: pri, category: cat,
    status: existing ? existing.status : 'pending'
  };
  if (editTaskId) {
    const i = (S.tasks || []).findIndex(x => x.id === editTaskId);
    if (i !== -1) S.tasks[i] = t;
  } else {
    if (!S.tasks) S.tasks = [];
    S.tasks.push(t);
    addNotif(`Tarea creada: ${name}`, '📌');
  }
  save(); closeM('m-task'); toast(editTaskId ? '✅ Tarea actualizada' : '✅ Tarea creada'); renderTasks();
});
$('#task-del').addEventListener('click', () => {
  S.tasks = S.tasks.filter(x => x.id !== editTaskId);
  save(); closeM('m-task'); toast('🗑 Eliminada'); renderTasks();
});
$$('#task-pri .cat-btn').forEach(b => b.addEventListener('click', () => {
  $$('#task-pri .cat-btn').forEach(x => x.classList.remove('active')); b.classList.add('active');
}));
$$('#task-cat .cat-btn').forEach(b => b.addEventListener('click', () => {
  $$('#task-cat .cat-btn').forEach(x => x.classList.remove('active')); b.classList.add('active');
}));

/* ═══════════════════════════════════════
   HABITS
═══════════════════════════════════════ */
function renderHabits() { renderHabitStrip(); renderHabitCards(); renderHeatmap(); }

function renderHabitStrip() {
  const c = $('#habit-strip'); c.innerHTML = '';
  const today = new Date();
  for (let i = -3; i <= 3; i++) {
    const d = new Date(today); d.setDate(today.getDate() + i);
    const key  = dateKey(d);
    const log  = S.habitLog[key] || {};
    const has  = (S.habits || []).some(h => log[h.id]);
    const btn  = mk('div', `hs-day${key === selHabDate ? ' active' : ''}${has ? ' has-done' : ''}`);
    btn.innerHTML = `<span>${DS[d.getDay()]}</span><span class="hs-day-n">${d.getDate()}</span><span class="hs-dot"></span>`;
    btn.addEventListener('click', () => { selHabDate = key; renderHabits(); });
    c.appendChild(btn);
  }
}

function renderHabitCards() {
  const log  = S.habitLog[selHabDate] || {};
  const done = (S.habits || []).filter(h => log[h.id]).length;
  const tot  = (S.habits || []).length;
  const pct  = tot ? Math.round(done/tot*100) : 0;
  $('#habit-summary').innerHTML = `
    <div class="hsum-txt">${tot ? `<strong>${done}</strong> de <strong>${tot}</strong> completados` : 'Sin hábitos aún'}</div>
    <div class="hsum-pct">${pct}%</div>`;
  const c = $('#habit-list'); c.innerHTML = '';
  if (!tot) { c.innerHTML = '<div class="ev-empty">Crea tu primer hábito ↑</div>'; return; }
  (S.habits || []).forEach(h => {
    const isDone = !!log[h.id], str = calcStreak(h.id);
    const card   = mk('div', 'habit-card');
    card.innerHTML = `
      <button class="hab-chk ${isDone ? 'done' : ''}">${isDone ? '✓' : ''}</button>
      <span class="hab-icon">${h.icon || '⭐'}</span>
      <div class="hab-info">
        <div class="hab-name">${h.name}</div>
        <div class="hab-streak">${str > 0 ? `🔥 ${str} día${str!==1?'s':''} seguido${str!==1?'s':''}` : 'Sin racha aún'}</div>
      </div>
      <div class="hab-dot" style="background:var(${CC[h.category]||'--ch'})"></div>
      ${h.reminder ? `<span style="font-size:.68rem;color:var(--t3);background:var(--s2);padding:.12rem .38rem;border-radius:10px">⏰${h.reminder}</span>` : ''}
      <button class="hab-del">✕</button>`;
    card.querySelector('.hab-chk').addEventListener('click', () => {
      if (!S.habitLog[selHabDate]) S.habitLog[selHabDate] = {};
      S.habitLog[selHabDate][h.id] = !S.habitLog[selHabDate][h.id];
      save(); renderHabits(); if (curView === 'home') renderHome();
      if (S.habitLog[selHabDate][h.id]) addNotif(`Hábito: ${h.name}`, '✅');
    });
    card.querySelector('.hab-del').addEventListener('click', e => {
      e.stopPropagation();
      S.habits = S.habits.filter(x => x.id !== h.id);
      save(); renderHabits(); toast('🗑 Eliminado');
    });
    c.appendChild(card);
  });
}

function renderHeatmap() {
  const grid = $('#heatmap'); grid.innerHTML = '';
  const today = new Date(), tot = (S.habits || []).length || 1;
  for (let i = 27; i >= 0; i--) {
    const d   = new Date(today); d.setDate(today.getDate() - i);
    const key = dateKey(d);
    const log = S.habitLog[key] || {};
    const cnt = Object.values(log).filter(Boolean).length;
    const lv  = cnt === 0 ? '' : cnt >= tot ? 'lf' : cnt >= tot*.75 ? 'l3' : cnt >= tot*.5 ? 'l2' : 'l1';
    const cell = mk('div', `hm-cell ${lv}`);
    cell.title = `${DS[d.getDay()]} ${d.getDate()} — ${cnt}/${tot} hábitos`;
    grid.appendChild(cell);
  }
}

function calcStreak(hid) {
  let s = 0; const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    if (S.habitLog[dateKey(d)]?.[hid]) s++; else break;
  }
  return s;
}

$('#btn-add-habit').addEventListener('click', () => {
  ['hab-name','hab-rem'].forEach(x => $(`#${x}`).value = ''); $('#hab-icon').value = '';
  $$('#hab-cat .cat-btn').forEach((b,i) => b.classList.toggle('active', i === 0));
  openM('m-habit');
});
$$('.emo').forEach(e => e.addEventListener('click', () => $('#hab-icon').value = e.dataset.e));
$('#hab-save').addEventListener('click', () => {
  const name = $('#hab-name').value.trim();
  if (!name) { toast('⚠️ Ingresa un nombre'); return; }
  const cat = $('#hab-cat .cat-btn.active')?.dataset.cat || 'health';
  if (!S.habits) S.habits = [];
  S.habits.push({ id: uid(), name, icon: $('#hab-icon').value.trim() || '⭐', category: cat, reminder: $('#hab-rem').value });
  save(); closeM('m-habit'); renderHabits(); if (curView === 'home') renderHome();
  toast('✅ Hábito creado');
});
$$('#hab-cat .cat-btn').forEach(b => b.addEventListener('click', () => {
  $$('#hab-cat .cat-btn').forEach(x => x.classList.remove('active')); b.classList.add('active');
}));

/* ═══════════════════════════════════════
   POMODORO
═══════════════════════════════════════ */
const PCIRC = 628;
function updatePomoUI() {
  const m = Math.floor(pomo.sec/60), s = pomo.sec % 60;
  $('#pomo-time').textContent = `${pad(m)}:${pad(s)}`;
  $('#pomo-prog').style.strokeDashoffset = PCIRC * (1 - pomo.sec/pomo.total);
  const labs = { work:'🍅 Trabajo', short:'☕ Descanso', long:'🌿 Descanso largo' };
  $('#pomo-lbl').textContent  = labs[pomo.type] || '';
  document.title = pomo.running ? `${pad(m)}:${pad(s)} · eLife` : 'eLife';
  renderPomoDots(); updatePomoStats();
}
function renderPomoDots() {
  const w = $('#pomo-dots'); w.innerHTML = '';
  for (let i = 0; i < 4; i++) {
    const d = mk('div', `pomo-dot${i < pomo.done%4 ? ' done' : i === pomo.done%4 && pomo.type === 'work' ? ' cur' : ''}`);
    w.appendChild(d);
  }
}
function updatePomoStats() {
  const dk  = todayKey(), ses = S.pomo?.sessions || {};
  const tod = ses[dk] || 0;
  $('#ps-today').textContent  = tod;
  $('#ps-min').textContent    = Math.round(S.pomo?.totalMin || 0);
  $('#pomo-sess').textContent = `Sesión ${pomo.done + 1}`;
  let str = 0; const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    if ((ses[dateKey(d)] || 0) > 0) str++; else break;
  }
  $('#ps-streak').textContent = str;
}

$('#pomo-start').addEventListener('click', () => {
  if (pomo.running) {
    clearInterval(pomo.timer); pomo.running = false;
    $('#pomo-start').textContent = '▶'; return;
  }
  pomo.running = true; $('#pomo-start').textContent = '⏸';
  pomo.timer = setInterval(() => {
    if (pomo.sec <= 0) {
      clearInterval(pomo.timer); pomo.running = false;
      $('#pomo-start').textContent = '▶'; document.title = 'eLife';
      if (pomo.type === 'work') {
        const dk = todayKey();
        if (!S.pomo) S.pomo = { sessions: {}, totalMin: 0 };
        if (!S.pomo.sessions) S.pomo.sessions = {};
        S.pomo.sessions[dk] = (S.pomo.sessions[dk] || 0) + 1;
        S.pomo.totalMin = (S.pomo.totalMin || 0) + pomo.total/60;
        pomo.done++; save();
        toast('🍅 ¡Sesión completada!');
        addNotif('Sesión de enfoque completada', '🍅');
        if (Notification.permission === 'granted')
          new Notification('eLife 🍅', { body: '¡Sesión completada! Tómate un descanso.', icon: 'icons/icon-192.png' });
        const isLong = pomo.done % 4 === 0;
        switchPomo(isLong ? 'long' : 'short', isLong ? S.settings.pomoLong : S.settings.pomoShort);
      } else {
        toast('☕ Descanso terminado');
        if (Notification.permission === 'granted')
          new Notification('eLife', { body: '¡Descanso terminado. A trabajar!', icon: 'icons/icon-192.png' });
        switchPomo('work', S.settings.pomoWork);
      }
      return;
    }
    pomo.sec--; updatePomoUI();
  }, 1000);
});
$('#pomo-reset').addEventListener('click', () => {
  clearInterval(pomo.timer); pomo.running = false;
  pomo.sec = pomo.total; $('#pomo-start').textContent = '▶'; updatePomoUI();
});
$('#pomo-skip').addEventListener('click', () => {
  clearInterval(pomo.timer); pomo.running = false;
  pomo.sec = 0; updatePomoUI();
});
function switchPomo(type, mins) {
  pomo.type = type; pomo.total = (mins || 25)*60; pomo.sec = pomo.total;
  $$('.pomo-mode').forEach(b => b.classList.toggle('active', b.dataset.type === type));
  updatePomoUI();
}
$$('.pomo-mode').forEach(b => b.addEventListener('click', () => {
  clearInterval(pomo.timer); pomo.running = false;
  $('#pomo-start').textContent = '▶';
  switchPomo(b.dataset.type, +b.dataset.min);
}));

/* ═══════════════════════════════════════
   GOALS
═══════════════════════════════════════ */
function renderGoals() {
  const tot  = (S.goals || []).length;
  const done = (S.goals || []).filter(g => (g.progress||0) >= 100).length;
  const avg  = tot ? Math.round(S.goals.reduce((s,g) => s + (g.progress||0), 0) / tot) : 0;
  $('#goals-overview').innerHTML = `
    <div class="go-stat"><div class="go-num">${tot}</div><div class="go-lbl">Total</div></div>
    <div class="go-stat"><div class="go-num">${done}</div><div class="go-lbl">Completadas</div></div>
    <div class="go-stat"><div class="go-num">${avg}%</div><div class="go-lbl">Promedio</div></div>
    <div class="go-stat"><div class="go-num">${tot-done}</div><div class="go-lbl">En progreso</div></div>`;
  const c = $('#goals-list'); c.innerHTML = '';
  if (!tot) { c.innerHTML = '<div class="ev-empty">Sin metas. ¡Crea una!</div>'; return; }
  [...(S.goals || [])].sort((a,b) => (b.progress||0) - (a.progress||0)).forEach(g => {
    const pct  = g.progress || 0;
    const card = mk('div', 'goal-card');
    card.innerHTML = `
      <div class="goal-head">
        <div>
          <div class="goal-name">${g.name}</div>
          ${g.desc ? `<div class="goal-desc">${g.desc}</div>` : ''}
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:.2rem">
          <span class="goal-pct">${pct}%</span>
          ${g.deadline ? `<span class="goal-dl">${fmtDeadline(g.deadline)}</span>` : ''}
        </div>
      </div>
      <div class="goal-bar"><div class="goal-fill" style="width:${pct}%"></div></div>
      <div class="goal-ctrl">
        <input type="range" class="goal-slider" min="0" max="100" value="${pct}"/>
        <button class="goal-edit">✎</button>
        <button class="goal-del2">🗑</button>
      </div>`;
    card.querySelector('.goal-slider').addEventListener('input', function() {
      g.progress = +this.value;
      card.querySelector('.goal-pct').textContent  = `${g.progress}%`;
      card.querySelector('.goal-fill').style.width = `${g.progress}%`;
      save();
    });
    card.querySelector('.goal-edit').addEventListener('click', () => openGoalModal(g.id));
    card.querySelector('.goal-del2').addEventListener('click', () => {
      S.goals = S.goals.filter(x => x.id !== g.id); save(); renderGoals(); toast('🗑 Eliminada');
    });
    c.appendChild(card);
  });
}

function openGoalModal(id = null) {
  editGoalId = id;
  $('#m-goal-title').textContent = id ? 'Editar meta' : 'Nueva meta';
  ['goal-name','goal-desc'].forEach(x => $(`#${x}`).value = '');
  $('#goal-dl').value = ''; $('#goal-pct').value = 0; $('#goal-pct-lbl').textContent = '0%';
  $$('#goal-cat .cat-btn').forEach((b,i) => b.classList.toggle('active', i === 0));
  $('#goal-del').classList.toggle('hidden', !id);
  if (id) {
    const g = (S.goals || []).find(x => x.id === id); if (!g) return;
    $('#goal-name').value = g.name; $('#goal-desc').value = g.desc || '';
    $('#goal-dl').value   = g.deadline || '';
    $('#goal-pct').value  = g.progress || 0; $('#goal-pct-lbl').textContent = `${g.progress||0}%`;
    $$('#goal-cat .cat-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === (g.category||'project')));
  }
  openM('m-goal');
}

$('#btn-add-goal').addEventListener('click', () => openGoalModal());
$('#goal-pct').addEventListener('input', function() { $('#goal-pct-lbl').textContent = `${this.value}%`; });
$('#goal-save').addEventListener('click', () => {
  const name = $('#goal-name').value.trim();
  if (!name) { toast('⚠️ Ingresa un nombre'); return; }
  const cat = $('#goal-cat .cat-btn.active')?.dataset.cat || 'project';
  const g   = { id: editGoalId || uid(), name, desc: $('#goal-desc').value, deadline: $('#goal-dl').value, progress: +$('#goal-pct').value, category: cat };
  if (editGoalId) {
    const i = (S.goals||[]).findIndex(x => x.id === editGoalId);
    if (i !== -1) S.goals[i] = g;
  } else {
    if (!S.goals) S.goals = [];
    S.goals.push(g); addNotif(`Meta creada: ${name}`, '🎯');
  }
  save(); closeM('m-goal'); renderGoals(); toast(editGoalId ? '✅ Actualizada' : '✅ Meta creada');
});
$('#goal-del').addEventListener('click', () => {
  S.goals = S.goals.filter(x => x.id !== editGoalId);
  save(); closeM('m-goal'); renderGoals(); toast('🗑 Eliminada');
});
$$('#goal-cat .cat-btn').forEach(b => b.addEventListener('click', () => {
  $$('#goal-cat .cat-btn').forEach(x => x.classList.remove('active')); b.classList.add('active');
}));

/* ═══════════════════════════════════════
   FOCUS
═══════════════════════════════════════ */
$$('.focus-dur').forEach(b => b.addEventListener('click', () => {
  $$('.focus-dur').forEach(x => x.classList.remove('active')); b.classList.add('active');
  selFocusMin = +b.dataset.min;
}));

$('#focus-start-btn').addEventListener('click', () => {
  const task = $('#focus-task-inp').value.trim() || 'Sesión de enfoque';
  focusTotal = selFocusMin * 60; focusSec = focusTotal;
  $('#focus-setup').style.display  = 'none';
  $('#focus-active').classList.remove('hidden');
  $('#fa-task').textContent = task;
  addNotif(`Sesión iniciada: ${task}`, '🎧');
  if (Notification.permission === 'granted')
    new Notification('eLife 🎯', { body: `Sesión de enfoque: ${task}`, icon: 'icons/icon-192.png' });
  focusTimer = setInterval(() => {
    if (focusSec <= 0) {
      clearInterval(focusTimer);
      if (!S.focusLog) S.focusLog = [];
      S.focusLog.push({ task, min: selFocusMin, date: new Date().toISOString() }); save();
      toast('🎯 ¡Sesión completada!');
      addNotif(`Sesión completada: ${task} (${selFocusMin} min)`, '🎯');
      if (Notification.permission === 'granted')
        new Notification('eLife 🎯', { body: `¡Completaste ${selFocusMin} min de enfoque!`, icon: 'icons/icon-192.png' });
      $('#focus-active').classList.add('hidden');
      $('#focus-setup').style.display = '';
      renderFocusHist(); return;
    }
    focusSec--;
    const m = Math.floor(focusSec/60), s = focusSec%60;
    $('#fa-time').textContent = `${pad(m)}:${pad(s)}`;
  }, 1000);
});

$('#focus-end-btn').addEventListener('click', () => {
  clearInterval(focusTimer);
  const task    = $('#fa-task').textContent;
  const elapsed = Math.round((focusTotal - focusSec) / 60);
  if (!S.focusLog) S.focusLog = [];
  S.focusLog.push({ task, min: elapsed, date: new Date().toISOString() }); save();
  toast(`🎧 Sesión terminada (${elapsed} min)`);
  $('#focus-active').classList.add('hidden');
  $('#focus-setup').style.display = '';
  renderFocusHist();
});

function renderFocusHist() {
  const c = $('#focus-hist'); c.innerHTML = '';
  const recent = [...(S.focusLog || [])].reverse().slice(0, 5);
  if (!recent.length) { c.innerHTML = '<div style="color:var(--t3);font-size:.82rem">Sin sesiones recientes</div>'; return; }
  recent.forEach(f => {
    const d    = new Date(f.date);
    const item = mk('div', 'fh-item');
    item.innerHTML = `<div><div class="fhi-task">${f.task}</div><div class="fhi-meta">${f.min} min · ${DS[d.getDay()]} ${pad(d.getHours())}:${pad(d.getMinutes())}</div></div><span style="font-size:1.1rem">🎯</span>`;
    c.appendChild(item);
  });
}

/* ═══════════════════════════════════════
   JOURNAL
═══════════════════════════════════════ */
function renderJournal() {
  const now = new Date();
  $('#journal-date').textContent = `${DF[now.getDay()]}, ${now.getDate()} de ${MN[now.getMonth()]} ${now.getFullYear()}`;
  const dk    = todayKey();
  const entry = (S.journal || []).find(e => e.date === dk);
  $('#jq1').value = entry?.q1 || '';
  $('#jq2').value = entry?.q2 || '';
  $('#jq3').value = entry?.q3 || '';
  curMood = entry?.mood || null;
  $$('.mood-btn').forEach(b => b.classList.toggle('selected', +b.dataset.mood === curMood));
  renderJournalHist();
}

$$('.mood-btn').forEach(b => b.addEventListener('click', () => {
  curMood = +b.dataset.mood;
  $$('.mood-btn').forEach(x => x.classList.toggle('selected', x === b));
}));

$('#btn-save-journal').addEventListener('click', () => {
  const q1 = $('#jq1').value.trim(), q2 = $('#jq2').value.trim(), q3 = $('#jq3').value.trim();
  if (!q1 && !q2 && !q3) { toast('Escribe algo primero'); return; }
  const dk = todayKey(), idx = (S.journal || []).findIndex(e => e.date === dk);
  const entry = { date: dk, mood: curMood, q1, q2, q3 };
  if (!S.journal) S.journal = [];
  if (idx !== -1) S.journal[idx] = entry; else S.journal.push(entry);
  save(); renderJournalHist(); toast('💾 Entrada guardada');
  addNotif('Entrada del diario guardada', '📓');
});

function renderJournalHist() {
  const c = $('#journal-hist'); c.innerHTML = '';
  const past = (S.journal || []).filter(e => e.date !== todayKey()).sort((a,b) => b.date.localeCompare(a.date)).slice(0, 8);
  if (!past.length) return;
  c.appendChild(mk('div', 'jh-title', 'Entradas anteriores'));
  past.forEach(entry => {
    const d   = new Date(entry.date + 'T00:00:00');
    const div = mk('div', 'jh-entry');
    div.innerHTML = `
      <div class="jhe-hdr">
        <span class="jhe-date">${DF[d.getDay()]}, ${d.getDate()} ${MN[d.getMonth()]}</span>
        <span class="jhe-mood">${ML[entry.mood] || ''}</span>
      </div>
      ${entry.q1 ? `<div class="jhe-q">💬 Día</div><div class="jhe-a">${entry.q1}</div>` : ''}
      ${entry.q2 ? `<div class="jhe-q">💡 Aprendí</div><div class="jhe-a">${entry.q2}</div>` : ''}
      ${entry.q3 ? `<div class="jhe-q">🚀 Mañana</div><div class="jhe-a">${entry.q3}</div>` : ''}`;
    c.appendChild(div);
  });
}

/* ═══════════════════════════════════════
   STATS
═══════════════════════════════════════ */
function renderStats() {
  const now = new Date(), week = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(now); d.setDate(now.getDate()-i); week.push(dateKey(d)); }
  $('#stats-week-chip').textContent = `${new Date(week[0]+'T00:00:00').getDate()}–${new Date(week[6]+'T00:00:00').getDate()} ${MN[now.getMonth()]}`;
  const dn = now.getDay();
  const te = (S.events||[]).filter(e => e.days?.includes(dn)), de = te.filter(e => e.status === 'done');
  $('#sc-prod').textContent  = te.length ? `${Math.round(de.length/te.length*100)}%` : '—';
  let hd = 0, ht = 0;
  week.forEach(k => {
    const log = S.habitLog[k] || {};
    ht += (S.habits||[]).length;
    hd += Object.values(log).filter(Boolean).length;
  });
  $('#sc-hab').textContent   = `${hd}/${ht}`;
  $('#sc-water').textContent = `${S.waterLog[todayKey()]||0} vasos`;
  const ses = S.pomo?.sessions || {};
  $('#sc-pomo').textContent  = Object.values(ses).reduce((s,v) => s+v, 0);
  renderBarChart('ch-habits', week, k => {
    const log = S.habitLog[k]||{}, n = (S.habits||[]).length||1;
    return Object.values(log).filter(Boolean).length / n;
  }, 'var(--accent)');
  renderBarChart('ch-water', week, k => Math.min((S.waterLog[k]||0) / (S.settings.waterGoal||8), 1), 'var(--sky)');
  const gc = $('#ch-goals'); gc.innerHTML = '';
  if (!(S.goals||[]).length) { gc.innerHTML = '<div style="color:var(--t3);font-size:.8rem">Sin metas</div>'; }
  else (S.goals||[]).forEach(g => {
    const pct = g.progress||0;
    const row = mk('div', 'gc-row');
    row.innerHTML = `<div class="gc-meta"><span class="gc-name">${g.name}</span><span class="gc-pct">${pct}%</span></div><div class="gc-bar"><div class="gc-fill" style="width:${pct}%"></div></div>`;
    gc.appendChild(row);
  });
}

function renderBarChart(id, week, fn, color) {
  const c = $(`#${id}`); c.innerHTML = '';
  week.forEach(k => {
    const d   = new Date(k+'T00:00:00'), val = fn(k), ht = Math.round(val*80);
    const w   = mk('div', 'bc-wrap');
    const bar = mk('div', 'bc-bar'); bar.style.height = '80px';
    const fill = mk('div', 'bc-fill'); fill.style.cssText = `height:${ht}px;background:${color};`;
    bar.appendChild(fill);
    w.appendChild(bar); w.appendChild(mk('div', 'bc-lbl', DS[d.getDay()]));
    c.appendChild(w);
  });
}

/* Export / Import */
$('#btn-export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(S, null, 2)], { type:'application/json' });
  const url  = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = `elife-backup-${todayKey()}.json`;
  a.click(); URL.revokeObjectURL(url); toast('✅ Exportado');
});
$('#import-file').addEventListener('change', function(e) {
  const file = e.target.files[0]; if (!file) return;
  const r = new FileReader();
  r.onload = ev => {
    try { S = merge(S, JSON.parse(ev.target.result)); save(); initSettings(); renderHome(); toast('✅ Importado'); }
    catch { toast('❌ Error al importar'); }
  };
  r.readAsText(file);
});

/* ═══════════════════════════════════════
   SETTINGS
═══════════════════════════════════════ */
function initSettings() {
  const s = S.settings;
  $('#dark-toggle').checked = !!s.darkMode;
  $('#s-name').value   = s.name   || '';
  $('#s-wgoal').value  = s.waterGoal || 8;
  $('#s-wrem').value   = s.waterReminder || 60;
  $('#s-wstart').value = s.workStart  || '09:00';
  $('#s-wend').value   = s.workEnd    || '17:00';
  $('#s-sleep').value  = s.sleepTime  || '23:00';
  $('#s-wake').value   = s.wakeTime   || '09:00';
  $('#s-pwork').value  = s.pomoWork   || 25;
  $('#s-pshort').value = s.pomoShort  || 5;
  $('#s-plong').value  = s.pomoLong   || 15;
  updateNotifStatus();
}

const SMAP = {
  's-name':'name','s-wgoal':'waterGoal','s-wrem':'waterReminder',
  's-wstart':'workStart','s-wend':'workEnd','s-sleep':'sleepTime','s-wake':'wakeTime',
  's-pwork':'pomoWork','s-pshort':'pomoShort','s-plong':'pomoLong'
};
Object.keys(SMAP).forEach(id => {
  $(`#${id}`)?.addEventListener('change', function() {
    const k = SMAP[id];
    S.settings[k] = this.type === 'number' ? +this.value : this.value;
    save();
    if (id === 's-wrem')  startWaterRem();
    if (id === 's-wgoal') { renderWater(); renderRings(); }
    if (id === 's-name'  && curView === 'home') renderHome();
  });
});

$('#btn-notif-perm').addEventListener('click', () => {
  if (!('Notification' in window)) { toast('Tu navegador no soporta notificaciones'); return; }
  Notification.requestPermission().then(p => {
    updateNotifStatus();
    toast(p === 'granted' ? '🔔 Activadas' : '❌ Denegadas');
    if (p === 'granted') schedAllNotifs();
  });
});
function updateNotifStatus() {
  const map = { granted:'✅ Activadas', denied:'❌ Bloqueadas', default:'⏳ Sin definir' };
  const el  = $('#notif-status-txt');
  if (el) el.textContent = `Estado: ${map[Notification.permission] || '—'}`;
}

function startWaterRem() {
  clearInterval(waterRemTimer);
  const mins = S.settings.waterReminder; if (!mins) return;
  waterRemTimer = setInterval(() => {
    if (Notification.permission === 'granted') new Notification('eLife 💧', { body:'¡Hora de hidratarte!', icon:'icons/icon-192.png' });
    else toast('💧 ¡Hora de hidratarte!');
  }, mins * 60 * 1000);
}

/* ═══════════════════════════════════════
   ONBOARDING
═══════════════════════════════════════ */
$('#ob-done').addEventListener('click', () => {
  const name = $('#ob-name').value.trim();
  if (name) { S.settings.name = name; save(); }
  closeM('m-onboard');
  showView('home');
  addNotif('¡Bienvenido a eLife! Avanza 1% cada día 🚀', '👋');
});

/* ═══════════════════════════════════════
   SEED DATA
═══════════════════════════════════════ */
function seedEvents() {
  if ((S.events||[]).length > 0) return;
  const base = [
    { name:'Despertar',         start:'09:00', end:'09:30', category:'health',    days:[0,1,2,3,4,5,6] },
    { name:'Devocional',        start:'09:30', end:'10:00', category:'spiritual', days:[0,1,2,3,4,5,6] },
    { name:'Trabajo',           start:'09:00', end:'17:00', category:'work',      days:[1,2,3,4,5] },
    { name:'Ejercicio',         start:'17:30', end:'18:30', category:'health',    days:[1,2,3,5] },
    { name:'Proyecto personal', start:'20:00', end:'22:00', category:'project',   days:[1,2,3,4,5] },
    { name:'Lectura',           start:'22:00', end:'23:00', category:'health',    days:[0,1,2,3,4,5,6] },
    { name:'Dormir',            start:'23:00', end:'',      category:'health',    days:[0,1,2,3,4,5,6] }
  ];
  if (!S.events) S.events = [];
  base.forEach(e => S.events.push({ id: uid(), ...e, notif:'15', status:'pending' }));
}

function seedHabits() {
  if ((S.habits||[]).length > 0) return;
  if (!S.habits) S.habits = [];
  [
    { name:'Tomar agua',     icon:'💧', category:'health' },
    { name:'Ejercicio',      icon:'🏃', category:'health' },
    { name:'Lectura',        icon:'📖', category:'project' },
    { name:'Oración',        icon:'🙏', category:'spiritual' },
    { name:'Ordenar cuarto', icon:'🧹', category:'health' }
  ].forEach(h => S.habits.push({ id: uid(), ...h }));
}

function seedGoals() {
  if ((S.goals||[]).length > 0) return;
  if (!S.goals) S.goals = [];
  [
    { name:'Salud y ejercicio', desc:'Ejercitarme 5 días a la semana', deadline:'', progress:30, category:'health' },
    { name:'Proyecto creativo', desc:'Completar edición de videos',    deadline:'', progress:60, category:'project' }
  ].forEach(g => S.goals.push({ id: uid(), ...g }));
}

/* ═══════════════════════════════════════
   INIT
═══════════════════════════════════════ */
function init() {
  load();
  seedEvents(); seedHabits(); seedGoals();
  save();
  initTheme(); initSettings(); tickClock();
  pomo.total = (S.settings.pomoWork || 25) * 60;
  pomo.sec   = pomo.total;
  updatePomoUI(); startWaterRem(); updateNotifBadge();
  if (Notification.permission === 'granted') schedAllNotifs();

  setTimeout(() => {
    $('#splash').style.animation = 'splash-fade .4s ease forwards';
    setTimeout(() => {
      $('#splash').style.display = 'none';
      $('#app').classList.remove('hidden');
      const firstTime = !localStorage.getItem('elife_seen');
      localStorage.setItem('elife_seen', '1');
      if (firstTime) { openM('m-onboard'); }
      else { showView('home'); }
    }, 420);
  }, 2100);
}

init();
