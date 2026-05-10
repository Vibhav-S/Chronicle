const DEFAULT_HABITS = [
  { id: 'book',    label: 'Read 20 pages',         emoji: '📖' },
  { id: 'study',   label: 'Study 30 minutes',       emoji: '📚' },
  { id: 'cardio',  label: 'Cardio / run',            emoji: '🏃' },
  { id: 'gym',     label: 'Gym workout',             emoji: '💪' },
  { id: 'meals',   label: 'All meals on time',       emoji: '🥗' },
  { id: 'sleep',   label: 'Sleep before midnight',   emoji: '😴' },
  { id: 'water',   label: 'Drink 2L water',          emoji: '💧' },
];

const ACCENT_COLORS = [
  { name: 'ember',  value: '#E8552A', key: '' },
  { name: 'teal',   value: '#0D9488', key: 'teal' },
  { name: 'violet', value: '#7C3AED', key: 'violet' },
  { name: 'amber',  value: '#D97706', key: 'amber' },
  { name: 'rose',   value: '#E11D48', key: 'rose' },
  { name: 'slate',  value: '#475569', key: 'slate' },
];

let habits = loadHabits();
let currentView = 'today';
let calMonth = new Date().getMonth();
let calYear  = new Date().getFullYear();
let journalEditId = null;
let selectedMood = null;

document.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  applyAccent();
  renderAll();
  startClock();
  buildColorSwatches();
  buildHabitEditor();
  loadNameInput();
  seedDemoIfEmpty();
});

function renderAll() {
  renderHabits();
  loadTodayData();
  updateStats();
  updateStreak();
  renderCalendar();
  checkMissedWarning();
  renderJournal();
  renderHabitBreakdown();
  renderHeatmap();
  updateGreeting();
}

function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function todayKey() { return dateKey(); }

function formatDateFull(d) {
  return d.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
}

function formatDateShort(d) {
  return d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
}

function loadHabits() {
  try {
    const stored = JSON.parse(localStorage.getItem('chr_habits'));
    return stored && stored.length ? stored : DEFAULT_HABITS;
  } catch { return DEFAULT_HABITS; }
}

function saveHabits() {
  localStorage.setItem('chr_habits', JSON.stringify(habits));
}

function getDayData(key) {
  try { return JSON.parse(localStorage.getItem('chr_day_' + key)) || null; } catch { return null; }
}

function setDayData(key, data) {
  localStorage.setItem('chr_day_' + key, JSON.stringify(data));
}

function getDayProgress(key) {
  const d = getDayData(key);
  if (!d || !d.habits) return null;
  const vals = Object.values(d.habits);
  if (!vals.length) return null;
  return (vals.filter(v => v).length / habits.length) * 100;
}

function renderHabits() {
  const list = document.getElementById('habitList');
  if (!list) return;
  list.innerHTML = '';
  habits.forEach((h, i) => {
    const div = document.createElement('div');
    div.className = 'habit-item';
    div.id = 'h_' + h.id;
    div.style.animationDelay = (i * 50) + 'ms';
    div.innerHTML = `
      <div class="habit-check">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <span class="habit-emoji">${h.emoji || '✅'}</span>
      <span class="habit-text">${h.label}</span>
    `;
    div.addEventListener('click', () => toggleHabit(h.id));
    list.appendChild(div);
  });
}

function toggleHabit(id) {
  const el = document.getElementById('h_' + id);
  if (!el) return;
  const isDone = el.classList.contains('done');
  el.classList.toggle('done', !isDone);
  el.classList.toggle('skipped', false);
  if (!isDone) {
    el.style.animation = 'none';
    el.offsetHeight;
    el.style.animation = '';
  }
  updateScoreRing();
}

function loadTodayData() {
  const data = getDayData(todayKey());
  if (!data) return;
  habits.forEach(h => {
    const el = document.getElementById('h_' + h.id);
    if (!el) return;
    const done = data.habits && data.habits[h.id];
    const saved = data.saved;
    el.classList.toggle('done', done);
    el.classList.toggle('skipped', saved && !done);
  });
  if (data.note) {
    const n = document.getElementById('quickNote');
    if (n) n.value = data.note;
  }
  updateScoreRing();
}

function updateScoreRing() {
  const doneCount = habits.filter(h => {
    const el = document.getElementById('h_' + h.id);
    return el && el.classList.contains('done');
  }).length;
  const pct = habits.length ? Math.round((doneCount / habits.length) * 100) : 0;
  const ring = document.getElementById('scoreRing');
  const label = document.getElementById('ringScore');
  if (ring) {
    const circ = 188.5;
    ring.style.strokeDashoffset = circ - (circ * pct / 100);
  }
  if (label) label.textContent = pct + '%';
  const bar = document.getElementById('barToday');
  const stat = document.getElementById('statToday');
  if (bar) bar.style.width = pct + '%';
  if (stat) stat.textContent = pct + '%';
}

function saveDay() {
  const habitData = {};
  habits.forEach(h => {
    const el = document.getElementById('h_' + h.id);
    habitData[h.id] = el ? el.classList.contains('done') : false;
  });
  habits.forEach(h => {
    const el = document.getElementById('h_' + h.id);
    if (el && !el.classList.contains('done')) el.classList.add('skipped');
  });
  const note = document.getElementById('quickNote')?.value || '';
  const existing = getDayData(todayKey()) || {};
  setDayData(todayKey(), { ...existing, habits: habitData, note, saved: true, ts: Date.now() });
  updateStats();
  updateStreak();
  renderCalendar();
  renderHabitBreakdown();
  renderHeatmap();
  checkMissedWarning();
  showToast('Day saved ✓');
}

function updateStats() {
  const t = getDayProgress(todayKey()) || 0;
  setBar('barToday', 'statToday', t);
  let ws = 0, wd = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const p = getDayProgress(dateKey(d));
    if (p !== null) { ws += p; wd++; }
  }
  setBar('barWeek', 'statWeek', wd ? ws / wd : 0);
  let ms = 0, md = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const p = getDayProgress(dateKey(d));
    if (p !== null) { ms += p; md++; }
  }
  setBar('barMonth', 'statMonth', md ? ms / md : 0);
}

function setBar(barId, statId, val) {
  const b = document.getElementById(barId);
  const s = document.getElementById(statId);
  if (b) b.style.width = Math.round(val) + '%';
  if (s) s.textContent = Math.round(val) + '%';
}

function updateStreak() {
  let s = 0;
  const d = new Date();
  while (true) {
    const data = getDayData(dateKey(d));
    if (data && data.saved) { s++; d.setDate(d.getDate() - 1); }
    else break;
  }
  document.getElementById('streakCount').textContent = s;
  document.getElementById('mobileStreakCount').textContent = s;
  let best = 0, cur = 0;
  for (let i = 365; i >= 0; i--) {
    const d2 = new Date(); d2.setDate(d2.getDate() - i);
    const data = getDayData(dateKey(d2));
    if (data && data.saved) { cur++; best = Math.max(best, cur); }
    else cur = 0;
  }
  const bs = document.getElementById('statBestStreak');
  if (bs) bs.textContent = best;
}

function checkMissedWarning() {
  const y = new Date(); y.setDate(y.getDate() - 1);
  const banner = document.getElementById('missedBanner');
  if (!banner) return;
  const data = getDayData(dateKey(y));
  banner.classList.toggle('hidden', !!(data && data.saved));
}

function renderHeatmap() {
  const hm = document.getElementById('heatmap');
  if (!hm) return;
  hm.innerHTML = '';
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = dateKey(d);
    const p = getDayProgress(key);
    const cell = document.createElement('div');
    cell.className = 'heatmap-day';
    cell.style.animationDelay = ((29 - i) * 20) + 'ms';
    if (p !== null) {
      const alpha = 0.2 + (p / 100) * 0.8;
      cell.style.background = hexToRgba(getComputedStyle(document.body).getPropertyValue('--accent').trim(), alpha);
      cell.setAttribute('data-pct', Math.round(p));
      cell.setAttribute('data-tooltip', formatDateShort(d) + ' · ' + Math.round(p) + '%');
    } else {
      cell.setAttribute('data-tooltip', formatDateShort(d) + ' · no log');
    }
    hm.appendChild(cell);
  }
}

function hexToRgba(hex, alpha) {
  hex = hex.replace('#','');
  if (hex.length === 3) hex = hex.split('').map(c=>c+c).join('');
  const r = parseInt(hex.substring(0,2),16);
  const g = parseInt(hex.substring(2,4),16);
  const b = parseInt(hex.substring(4,6),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function renderHabitBreakdown() {
  const bd = document.getElementById('habitBreakdown');
  if (!bd) return;
  bd.innerHTML = '';
  habits.forEach((h, idx) => {
    let done = 0, total = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const data = getDayData(dateKey(d));
      if (data && data.saved) { total++; if (data.habits && data.habits[h.id]) done++; }
    }
    const pct = total ? Math.round((done/total)*100) : 0;
    const row = document.createElement('div');
    row.className = 'breakdown-row';
    row.style.animationDelay = (idx * 50) + 'ms';
    row.innerHTML = `
      <span class="breakdown-label">${h.emoji || ''} ${h.label}</span>
      <div class="breakdown-bar-wrap"><div class="breakdown-bar" style="width:${pct}%"></div></div>
      <span class="breakdown-pct">${pct}%</span>
    `;
    bd.appendChild(row);
  });
}

function renderCalendar() {
  const grid = document.getElementById('calGrid');
  const title = document.getElementById('calMonthTitle');
  if (!grid) return;
  const monthName = new Date(calYear, calMonth).toLocaleString('default', { month:'long', year:'numeric' });
  if (title) title.textContent = monthName;
  grid.innerHTML = '';
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  const today = todayKey();
  for (let i = 0; i < firstDay; i++) {
    const cell = document.createElement('div');
    cell.className = 'cal-cell empty';
    grid.appendChild(cell);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(calYear, calMonth, d);
    const key = dateKey(date);
    const p = getDayProgress(key);
    const cell = document.createElement('div');
    cell.className = 'cal-cell' + (key === today ? ' today' : '') + (p !== null ? ' cal-dot-fill' : '');
    cell.innerHTML = `<div class="cal-num">${d}</div><div class="cal-dot"></div>${p !== null ? `<div class="cal-pct">${Math.round(p)}%</div>` : ''}`;
    if (p !== null) {
      const alpha = 0.08 + (p/100)*0.14;
      cell.style.background = hexToRgba(getComputedStyle(document.body).getPropertyValue('--accent').trim(), alpha);
    }
    cell.onclick = () => showDayDetail(key, date);
    grid.appendChild(cell);
  }
}

function changeMonth(dir) {
  calMonth += dir;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  if (calMonth > 11) { calMonth = 0; calYear++; }
  renderCalendar();
  closeDayDetail();
}

function showDayDetail(key, date) {
  const data = getDayData(key);
  const detail = document.getElementById('dayDetail');
  const detailDate = document.getElementById('detailDate');
  const detailHabits = document.getElementById('detailHabits');
  const detailNote = document.getElementById('detailNote');
  detailDate.textContent = formatDateFull(date);
  detailHabits.innerHTML = '';
  if (!data || !data.saved) {
    detailHabits.innerHTML = '<div style="color:var(--text-faint);font-size:13px">No log for this day.</div>';
    detailNote.textContent = '';
  } else {
    habits.forEach(h => {
      const done = data.habits && data.habits[h.id];
      const row = document.createElement('div');
      row.className = 'detail-habit-row ' + (done ? 'done' : 'missed');
      row.innerHTML = `<span>${done ? '✓' : '✗'}</span><span>${h.emoji || ''} ${h.label}</span>`;
      detailHabits.appendChild(row);
    });
    detailNote.textContent = data.note ? '"' + data.note + '"' : '';
  }
  detail.classList.remove('hidden');
}

function closeDayDetail() {
  document.getElementById('dayDetail').classList.add('hidden');
}

function renderJournal() {
  const list = document.getElementById('journalList');
  if (!list) return;
  const entries = getJournalEntries();
  if (!entries.length) {
    list.innerHTML = `<div class="journal-empty"><div class="big">📓</div><p>No entries yet.<br>Start writing to capture your days.</p></div>`;
    return;
  }
  list.innerHTML = '';
  entries.slice().reverse().forEach((entry, idx) => {
    const div = document.createElement('div');
    div.className = 'journal-entry';
    div.style.animationDelay = (idx * 40) + 'ms';
    const moodMap = { 5:'🤩', 4:'😊', 3:'😐', 2:'😔', 1:'😤' };
    div.innerHTML = `
      <div class="journal-entry-header">
        <div>
          <div class="journal-entry-date">${formatDateShort(new Date(entry.date))}</div>
          <div class="journal-entry-title">${entry.title || 'Untitled entry'}</div>
        </div>
        <div class="mood-badge">${entry.mood ? moodMap[entry.mood] : ''}</div>
      </div>
      <div class="journal-entry-preview">${entry.body || ''}</div>
    `;
    div.onclick = () => openJournalModal(entry.id);
    list.appendChild(div);
  });
}

function getJournalEntries() {
  try { return JSON.parse(localStorage.getItem('chr_journal')) || []; } catch { return []; }
}

function saveJournalEntries(entries) {
  localStorage.setItem('chr_journal', JSON.stringify(entries));
}

function openJournalModal(editId = null) {
  const modal = document.getElementById('journalModal');
  const mTitle = document.getElementById('modalTitle');
  const mDate = document.getElementById('modalDate');
  const titleInput = document.getElementById('journalTitleInput');
  const bodyInput = document.getElementById('journalBody');
  journalEditId = editId;
  selectedMood = null;
  document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.classList.remove('selected');
    btn.onclick = () => selectMood(parseInt(btn.dataset.mood));
  });
  if (editId) {
    const entries = getJournalEntries();
    const entry = entries.find(e => e.id === editId);
    if (entry) {
      mTitle.textContent = 'Edit Entry';
      titleInput.value = entry.title || '';
      bodyInput.value = entry.body || '';
      selectedMood = entry.mood || null;
      if (entry.mood) {
        document.querySelector(`.mood-btn[data-mood="${entry.mood}"]`)?.classList.add('selected');
      }
      mDate.textContent = formatDateFull(new Date(entry.date));
    }
  } else {
    mTitle.textContent = 'New Journal Entry';
    titleInput.value = '';
    bodyInput.value = '';
    mDate.textContent = formatDateFull(new Date());
  }
  modal.classList.remove('hidden');
  setTimeout(() => titleInput.focus(), 100);
}

function closeJournalModal() {
  document.getElementById('journalModal').classList.add('hidden');
  journalEditId = null;
}

function closeModalOnOverlay(e) {
  if (e.target === document.getElementById('journalModal')) closeJournalModal();
}

function selectMood(val) {
  selectedMood = val;
  document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.classList.toggle('selected', parseInt(btn.dataset.mood) === val);
  });
}

function saveJournalEntry() {
  const title = document.getElementById('journalTitleInput').value.trim();
  const body  = document.getElementById('journalBody').value.trim();
  if (!body && !title) { showToast('Write something first!'); return; }
  const entries = getJournalEntries();
  if (journalEditId) {
    const idx = entries.findIndex(e => e.id === journalEditId);
    if (idx >= 0) {
      entries[idx].title = title;
      entries[idx].body  = body;
      entries[idx].mood  = selectedMood;
    }
  } else {
    entries.push({ id: Date.now().toString(), date: Date.now(), title, body, mood: selectedMood });
  }
  saveJournalEntries(entries);
  closeJournalModal();
  renderJournal();
  showToast('Entry saved ✓');
}

function buildHabitEditor() {
  const editor = document.getElementById('habitEditor');
  if (!editor) return;
  editor.innerHTML = '';
  habits.forEach((h, i) => {
    const row = document.createElement('div');
    row.className = 'habit-edit-row';
    row.innerHTML = `
      <input class="habit-edit-emoji" type="text" maxlength="2" value="${h.emoji || ''}" id="hemoji_${i}" oninput="updateHabitEmoji(${i}, this.value)">
      <input class="habit-edit-input" type="text" value="${h.label}" id="hlabel_${i}" placeholder="Habit name…" oninput="updateHabitLabel(${i}, this.value)">
      <button class="habit-del-btn" onclick="deleteHabit(${i})">✕</button>
    `;
    editor.appendChild(row);
  });
}

function updateHabitLabel(i, val) {
  habits[i].label = val;
  saveHabits();
  renderHabits(); loadTodayData();
}

function updateHabitEmoji(i, val) {
  habits[i].emoji = val;
  saveHabits();
  renderHabits(); loadTodayData();
}

function deleteHabit(i) {
  habits.splice(i, 1);
  saveHabits();
  buildHabitEditor();
  renderHabits(); loadTodayData();
  renderHabitBreakdown();
}

function addCustomHabit() {
  habits.push({ id: 'custom_' + Date.now(), label: '', emoji: '⭐' });
  saveHabits();
  buildHabitEditor();
  renderHabits(); loadTodayData();
  setTimeout(() => {
    const inputs = document.querySelectorAll('.habit-edit-input');
    if (inputs.length) inputs[inputs.length-1].focus();
  }, 50);
}

function saveName() {
  const val = document.getElementById('nameInput')?.value || '';
  localStorage.setItem('chr_name', val);
  updateGreeting();
}

function loadNameInput() {
  const input = document.getElementById('nameInput');
  if (input) input.value = localStorage.getItem('chr_name') || '';
}

function updateGreeting() {
  const h = new Date().getHours();
  const name = localStorage.getItem('chr_name');
  const greetMap = [
    h >= 5  && h < 12 ? 'Good morning' : null,
    h >= 12 && h < 17 ? 'Good afternoon' : null,
    h >= 17 && h < 21 ? 'Good evening' : null,
    'Late night'
  ].find(Boolean);
  const el = document.getElementById('greeting');
  if (el) el.textContent = name ? `${greetMap}, ${name}` : greetMap;
  const th = document.getElementById('todayHeading');
  if (th) {
    const d = new Date();
    th.textContent = d.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });
  }
}

function buildColorSwatches() {
  const wrap = document.getElementById('colorSwatches');
  if (!wrap) return;
  const current = localStorage.getItem('chr_accent') || '';
  ACCENT_COLORS.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'color-swatch' + (current === c.key ? ' active' : '');
    btn.style.background = c.value;
    btn.title = c.name;
    btn.onclick = () => {
      localStorage.setItem('chr_accent', c.key);
      applyAccent();
      document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      renderCalendar(); renderHeatmap();
    };
    wrap.appendChild(btn);
  });
}

function applyAccent() {
  const key = localStorage.getItem('chr_accent') || '';
  document.body.setAttribute('data-accent', key);
}

function toggleTheme() {
  const dark = document.body.classList.toggle('dark');
  localStorage.setItem('chr_dark', dark);
  const icon = document.getElementById('themeIcon');
  if (icon) {
    icon.innerHTML = dark
      ? '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" stroke-width="1.8" fill="none"/>'
      : '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
  }
  setTimeout(() => { renderHeatmap(); renderCalendar(); }, 50);
}

function applyTheme() {
  const dark = localStorage.getItem('chr_dark') === 'true';
  if (dark) {
    document.body.classList.add('dark');
    const icon = document.getElementById('themeIcon');
    if (icon) icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" stroke-width="1.8" fill="none"/>';
  }
}

function startClock() {
  function tick() {
    const now = new Date();
    const dayEl  = document.getElementById('navDay');
    const dateEl = document.getElementById('navDate');
    const timeEl = document.getElementById('navTime');
    if (dayEl)  dayEl.textContent  = now.toLocaleDateString('en-US', { weekday:'long' });
    if (dateEl) dateEl.textContent = now.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
    if (timeEl) timeEl.textContent = now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
  }
  tick();
  setInterval(tick, 10000);
}

function switchView(view) {
  currentView = view;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const target = document.getElementById('view-' + view);
  if (target) target.classList.add('active');
  const btn = document.querySelector(`.nav-btn[data-view="${view}"]`);
  if (btn) btn.classList.add('active');
  if (view === 'stats') { updateStats(); renderHabitBreakdown(); renderHeatmap(); updateStreak(); }
  if (view === 'calendar') renderCalendar();
  if (view === 'journal') renderJournal();
  if (view === 'today') { renderHabits(); loadTodayData(); updateScoreRing(); }
  closeMobileNav();
}

function toggleMobileNav() {
  const nav = document.getElementById('sidenav');
  const open = nav.classList.toggle('open');
  let overlay = document.getElementById('navOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'navOverlay';
    overlay.onclick = closeMobileNav;
    document.body.appendChild(overlay);
  }
  overlay.style.display = open ? 'block' : 'none';
}

function closeMobileNav() {
  document.getElementById('sidenav').classList.remove('open');
  const overlay = document.getElementById('navOverlay');
  if (overlay) overlay.style.display = 'none';
}

function exportData() {
  const allData = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith('chr_')) allData[k] = localStorage.getItem(k);
  }
  const blob = new Blob([JSON.stringify(allData, null, 2)], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'chronicle-data.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Data exported!');
}

function confirmClear() {
  if (confirm('Clear ALL Chronicle data? This cannot be undone.')) {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      if (localStorage.key(i).startsWith('chr_')) keys.push(localStorage.key(i));
    }
    keys.forEach(k => localStorage.removeItem(k));
    habits = [...DEFAULT_HABITS];
    saveHabits();
    renderAll();
    buildHabitEditor();
    showToast('All data cleared.');
  }
}

let toastTimer = null;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  t.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.classList.add('hidden'), 300);
  }, 2400);
}

function seedDemoIfEmpty() {
  const hasSaved = Array.from({length:localStorage.length}, (_,i)=>localStorage.key(i))
    .some(k => k.startsWith('chr_day_'));
  if (hasSaved) return;
  for (let i = 14; i >= 1; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const hdata = {};
    DEFAULT_HABITS.forEach(h => { hdata[h.id] = Math.random() > 0.3; });
    setDayData(dateKey(d), { habits: hdata, note: '', saved: true, ts: Date.now() });
  }
  updateStats(); updateStreak(); renderCalendar(); renderHabitBreakdown(); renderHeatmap(); checkMissedWarning();
}
