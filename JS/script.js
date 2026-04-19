if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Service Worker Registered!', reg))
            .catch(err => console.log('Service Worker Fail!', err));
    });
}

const DEFAULT_TASKS = [
    { id: 'wake', time: '04:00', name: 'Wake Up — Pehlo Vijay!', emoji: '🌅', sec: 'morning' },
    { id: 'meditate', time: '04:05', name: 'Meditation (25 min)', emoji: '🧘', sec: 'morning' },
    { id: 'yoga', time: '04:30', name: 'Yoga — Body Flexibility', emoji: '🌿', sec: 'morning' },
    { id: 'abc', time: '05:00', name: 'Body Workout ABC (30 min)', emoji: '💪', sec: 'morning' },
    { id: 'run', time: '05:30', name: '3 KM Running', emoji: '🏃', sec: 'morning' },
    { id: 'extra', time: '06:00', name: 'Pull-ups & Push-ups', emoji: '🔥', sec: 'morning' },
    { id: 'bath1', time: '06:30', name: 'Bath (Nahavanu)', emoji: '🚿', sec: 'morning' },
    { id: 'puja1', time: '06:45', name: 'Puja / Prarthana', emoji: '🪔', sec: 'morning' },
    { id: 'bfast', time: '07:00', name: 'Healthy Breakfast', emoji: '🥗', sec: 'morning' },
    { id: 'family', time: '07:30', name: 'College / Family / Pappa Support', emoji: '🏠', sec: 'day' },
    { id: 'golden', time: '09:00', name: 'GOLDEN WINDOW — Web + English', emoji: '💻', sec: 'day' },
    { id: 'lunch', time: '11:30', name: 'Lunch (Bhojan)', emoji: '🍽️', sec: 'day' },
    { id: 'nap', time: '12:30', name: 'Nap / Rest', emoji: '😴', sec: 'day' },
    { id: 'job1', time: '14:00', name: 'Job + Tuition Work', emoji: '💼', sec: 'evening' },
    { id: 'job2', time: '16:00', name: 'Job Work Continue', emoji: '⚙️', sec: 'evening' },
    { id: 'bath2', time: '18:30', name: 'Evening Bath', emoji: '🚿', sec: 'evening' },
    { id: 'puja2', time: '18:45', name: 'Evening Puja', emoji: '🪔', sec: 'evening' },
    { id: 'job3', time: '19:15', name: 'Job Work', emoji: '💼', sec: 'evening' },
    { id: 'dinner', time: '19:45', name: 'Dinner (Javanu)', emoji: '🍛', sec: 'evening' },
    { id: 'job4', time: '20:15', name: 'Job Work / Closing', emoji: '🎯', sec: 'evening' },
    { id: 'sleep', time: '22:30', name: 'Switch Off & Sleep 📵', emoji: '🌙', sec: 'evening' },
];

const SEC_META = {
    morning: { label: '🌅 Morning — Warrior Phase', time: '4:00–7:30 AM', color: '#f97316', bg: '#f9731614', border: '#f9731633' },
    day: { label: '☀️ Day — Growth', time: '7:30 AM–2:00 PM', color: '#d97706', bg: '#d9770614', border: '#d9770633' },
    evening: { label: '💼 Evening — Work & Discipline', time: '2:00–10:30 PM', color: '#0369a1', bg: '#0369a114', border: '#0369a133' },
};

const EMOJIS = ['🌅', '🧘', '🌿', '💪', '🏃', '🔥', '🚿', '🪔', '🥗', '🏠', '💻', '📚', '🍽️', '😴', '💼', '⚙️', '🎯', '🌙', '📖', '✍️', '🎵', '🏋️', '🧹', '📞', '🤸', '⏰', '🎨', '📝', '🏆', '⭐'];

function loadTasks() { try { const t = localStorage.getItem('ht_tasks'); return t ? JSON.parse(t) : [...DEFAULT_TASKS] } catch { return [...DEFAULT_TASKS] } }
function saveTasks(t) { localStorage.setItem('ht_tasks', JSON.stringify(t)) }
function loadData() { try { return JSON.parse(localStorage.getItem('ht_data') || '{}') } catch { return {} } }
function saveData(d) { localStorage.setItem('ht_data', JSON.stringify(d)) }
function loadSettings() { try { return JSON.parse(localStorage.getItem('ht_settings') || '{"sound":true,"notif":true,"overlay":true}') } catch { return { sound: true, notif: true, overlay: true } } }
function saveSetting(k, v) { const s = loadSettings(); s[k] = v; localStorage.setItem('ht_settings', JSON.stringify(s)) }

function todayKey() { return new Date().toISOString().split('T')[0] }
function todayData() { const k = todayKey(); if (!data[k]) data[k] = { tasks: {}, date: k }; return data[k] }

let data = loadData(), tasks = loadTasks(), audioCtx = null, firedAlarms = new Set(), editingId = null, selectedSec = 'morning', activeTab = 'today';

function sorted() { return [...tasks].sort((a, b) => a.time.localeCompare(b.time)) }

function fmt12(t) { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}` }
function t2m(t) { const [h, m] = t.split(':').map(Number); return h * 60 + m }
function nowMins() { const n = new Date(); return n.getHours() * 60 + n.getMinutes() }

function getCurrent() {
    const nm = nowMins(), st = sorted();
    for (let i = 0; i < st.length - 1; i++) { if (nm >= t2m(st[i].time) && nm < t2m(st[i + 1].time)) return st[i] }
    if (st.length && nm >= t2m(st[st.length - 1].time)) return st[st.length - 1];
    return null;
}
function getNext() { return sorted().find(t => t2m(t.time) > nowMins()) || null }

function playAlarm() {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const freqs = [880, 1047, 1175, 1047, 880, 1047, 1175, 1319]; let t = audioCtx.currentTime;
        freqs.forEach(f => { const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.connect(g); g.connect(audioCtx.destination); o.frequency.value = f; o.type = 'sine'; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.35, t + 0.05); g.gain.linearRampToValueAtTime(0, t + 0.25); o.start(t); o.stop(t + 0.3); t += 0.3 });
    } catch (e) { }
}

function requestNotif() { Notification.requestPermission().then(() => updateNotifBanner()) }
function updateNotifBanner() {
    const p = Notification.permission, b = document.getElementById('notif-banner'), tx = document.getElementById('nb-text'), btn = document.getElementById('nb-btn');
    if (p === 'granted') { b.className = 'notif-banner ok'; tx.textContent = '✅ Notifications active — Alarms kaam karse!'; btn.textContent = '✓ On'; btn.className = 'nb-btn ok'; btn.onclick = null }
    else { b.className = 'notif-banner'; tx.textContent = '🔔 Alarms mate notification allow karo (important!)'; btn.textContent = 'Allow'; btn.className = 'nb-btn'; btn.onclick = requestNotif }
}
function sendNotif(task) { if (Notification.permission === 'granted' && loadSettings().notif) new Notification(`⏰ ${task.emoji} ${task.name}`, { body: `${fmt12(task.time)} — Aa task karo!`, requireInteraction: true }) }

function triggerAlarm(task) {
    const s = loadSettings();
    if (s.sound) playAlarm();
    sendNotif(task);
    if (s.overlay) {
        document.getElementById('al-emoji').textContent = task.emoji;
        document.getElementById('al-title').textContent = task.name;
        document.getElementById('al-task').textContent = 'Aa task karo haji!';
        document.getElementById('al-time').textContent = fmt12(task.time);
        document.getElementById('al-ov').classList.add('show');
    }
}
function dismissAlarm() { document.getElementById('al-ov').classList.remove('show') }

function checkAlarms() {
    const now = new Date();
    const key = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    tasks.forEach(task => { const fk = key + '_' + task.id; if (task.time === key && !firedAlarms.has(fk)) { firedAlarms.add(fk); triggerAlarm(task) } });
}

function updateClock() {
    const now = new Date();
    document.getElementById('clock').textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    document.getElementById('clock-date').textContent = now.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    const next = getNext();
    if (next) { const diff = t2m(next.time) - nowMins(); const dh = Math.floor(diff / 60), dm = diff % 60; document.getElementById('next-alarm').textContent = `⏰ Next: ${next.emoji} ${next.name.split('(')[0].trim()} — ${fmt12(next.time)} (${dh > 0 ? dh + 'h ' : ''} ${dm}min ma)` }
    else document.getElementById('next-alarm').textContent = '✅ Aaj no schedule puro! Kal taiyar rehjo.';
}

function buildTasks() {
    const container = document.getElementById('tasks-container'); container.innerHTML = '';
    const dd = todayData(); const st = sorted(); const cur = getCurrent();
    ['morning', 'day', 'evening'].forEach(sec => {
        const secT = st.filter(t => t.sec === sec); if (!secT.length) return;
        const meta = SEC_META[sec]; const div = document.createElement('div'); div.className = 'sec';
        const hdr = document.createElement('div'); hdr.className = 'sec-hdr';
        hdr.style.cssText = `background:${meta.bg};border:1px solid ${meta.border};border-bottom:none`;
        hdr.innerHTML = `<span class="sec-lbl" style="color:${meta.color}">${meta.label}</span><span class="sec-t" style="color:${meta.color}">${meta.time}</span>`;
        div.appendChild(hdr);
        const body = document.createElement('div'); body.className = 'sec-body'; body.style.cssText = `border:1px solid ${meta.border}`;
        secT.forEach((task, idx) => {
            const status = dd.tasks[task.id]; const isCur = cur?.id === task.id;
            let rc = 'task-row' + (status === 'done' ? ' done-r' : status === 'skip' ? ' skip-r' : isCur ? ' now-r' : '');
            const row = document.createElement('div'); row.className = rc;
            if (idx > 0) row.style.borderTop = '1px solid var(--border)';
            const nc = 'task-name-l' + (status === 'done' ? ' done-t' : status === 'skip' ? ' skip-t' : '');
            row.innerHTML = `<div class="task-info"><div class="task-time-l">${task.emoji} ${fmt12(task.time)}</div><div class="${nc}">${task.name}</div></div>${isCur ? '<span class="now-badge">NOW</span>' : ''}<div class="task-btns"><button class="btn-d${status === 'done' ? ' act' : ''}" onclick="mark('${task.id}','done')">✓</button><button class="btn-s${status === 'skip' ? ' act' : ''}" onclick="mark('${task.id}','skip')">✗</button></div>`;
            body.appendChild(row);
        });
        div.appendChild(body); container.appendChild(div);
    });
    updateStats();
}

function mark(id, val) { const dd = todayData(); dd.tasks[id] = dd.tasks[id] === val ? null : val; data[todayKey()] = dd; saveData(data); buildTasks() }

function updateStats() {
    const dd = todayData(); const vals = Object.values(dd.tasks);
    const done = vals.filter(v => v === 'done').length; const skip = vals.filter(v => v === 'skip').length;
    const pct = Math.round(done / Math.max(tasks.length, 1) * 100);
    document.getElementById('s-done').textContent = done;
    document.getElementById('s-skip').textContent = skip;
    document.getElementById('s-pct').textContent = pct + '%';
    document.getElementById('prog').style.width = pct + '%';
}

// ── Task Manager ─────────────────────────────────────────
function buildManageList() {
    const list = document.getElementById('manage-list'); list.innerHTML = '';
    const sC = { morning: '#f97316', day: '#d97706', evening: '#0369a1' };
    const sB = { morning: '#f9731622', day: '#d9770622', evening: '#0369a122' };
    const sL = { morning: 'Morning', day: 'Day', evening: 'Evening' };
    sorted().forEach(task => {
        const row = document.createElement('div'); row.className = 'mt-row';
        row.innerHTML = `<div style="font-size:20px;flex-shrink:0">${task.emoji}</div><div class="mt-info"><div class="mt-name">${task.name}</div><div class="mt-time">⏰ ${fmt12(task.time)}</div></div><span class="mt-sec" style="background:${sB[task.sec]};color:${sC[task.sec]}">${sL[task.sec]}</span><button class="mt-edit" onclick="openModal('${task.id}')">✏️</button>`;
        list.appendChild(row);
    });
}

// ── Modal ─────────────────────────────────────────────────
function buildEmojiGrid() {
    const eg = document.getElementById('emoji-grid'); eg.innerHTML = '';
    EMOJIS.forEach(em => {
        const btn = document.createElement('button'); btn.className = 'emoji-opt'; btn.textContent = em;
        btn.onclick = () => { document.getElementById('f-emoji').value = em; document.querySelectorAll('.emoji-opt').forEach(b => b.classList.remove('sel')); btn.classList.add('sel') };
        eg.appendChild(btn);
    });
}

function openModal(id = null) {
    editingId = id; buildEmojiGrid();
    document.getElementById('modal-ttl').textContent = id ? '✏️ Task Edit karo' : '➕ Navu Task Add karo';
    document.getElementById('btn-del').classList.toggle('hidden', !id);
    if (id) {
        const task = tasks.find(t => t.id === id);
        if (task) { document.getElementById('f-name').value = task.name; document.getElementById('f-time').value = task.time; document.getElementById('f-emoji').value = task.emoji; selSec(task.sec) }
    } else { document.getElementById('f-name').value = ''; document.getElementById('f-time').value = '06:00'; document.getElementById('f-emoji').value = '🎯'; selSec('morning') }
    document.getElementById('modal-bg').classList.add('show');
}

function bgClick(e) { if (e.target === document.getElementById('modal-bg')) closeModal() }
function closeModal() { document.getElementById('modal-bg').classList.remove('show'); editingId = null }

function selSec(sec) {
    selectedSec = sec;
    ['morning', 'day', 'evening'].forEach(s => { document.getElementById('sec-' + s).className = 'sec-opt' + (s === sec ? ' sel-' + s : '') });
}

function saveTask() {
    const name = document.getElementById('f-name').value.trim();
    const time = document.getElementById('f-time').value;
    const emoji = document.getElementById('f-emoji').value.trim() || '🎯';
    if (!name) { showToast('Task name lakhjo!', true); return }
    if (!time) { showToast('Time select karo!', true); return }
    if (editingId) {
        const idx = tasks.findIndex(t => t.id === editingId);
        if (idx >= 0) tasks[idx] = { ...tasks[idx], name, time, emoji, sec: selectedSec };
        showToast('✅ Task update thayo!');
    } else {
        tasks.push({ id: 't_' + Date.now(), time, name, emoji, sec: selectedSec });
        showToast('✅ Navu task add thayo!');
    }
    saveTasks(tasks); closeModal(); buildManageList(); buildTasks();
}

function deleteTask() {
    if (!editingId || !confirm('Aa task delete karva chho?')) return;
    tasks = tasks.filter(t => t.id !== editingId);
    saveTasks(tasks); showToast('Task delete thayo'); closeModal(); buildManageList(); buildTasks();
}

// ── Weekly ─────────────────────────────────────────────────
function buildWeekly() {
    const grid = document.getElementById('week-grid'); grid.innerHTML = '';
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today); d.setDate(d.getDate() - i);
        const k = d.toISOString().split('T')[0]; const entry = data[k];
        const done = entry ? Object.values(entry.tasks || {}).filter(v => v === 'done').length : 0;
        const pct = done ? Math.round(done / tasks.length * 100) : 0;
        const pc = pct >= 80 ? '#4ade80' : pct >= 50 ? '#fbbf24' : pct > 0 ? '#f87171' : 'var(--mu)';
        const btn = document.createElement('div'); btn.className = 'wday' + (i === 0 ? ' active' : '');
        btn.innerHTML = `<div class="wday-n">${days[d.getDay()]}</div><div class="wday-d">${d.getDate()}</div><div class="wday-p" style="color:${pc}">${done ? pct + '%' : '—'}</div>`;
        btn.onclick = () => { document.querySelectorAll('.wday').forEach(b => b.classList.remove('active')); btn.classList.add('active'); showWeekDay(k, d) };
        grid.appendChild(btn);
    }
    showWeekDay(todayKey(), today);
}

function showWeekDay(k, dateObj) {
    const entry = data[k]; const detail = document.getElementById('weekly-detail');
    const ds = dateObj.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long' });
    if (!entry || !Object.keys(entry.tasks || {}).length) {
        detail.innerHTML = `<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px;text-align:center;color:var(--mu);font-size:13px">${ds}<br><br>Koi data nathi.</div>`; return;
    }
    const t = entry.tasks || {};
    const done = Object.values(t).filter(v => v === 'done').length; const skip = Object.values(t).filter(v => v === 'skip').length;
    const pct = Math.round(done / tasks.length * 100);
    let html = `<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px"><div style="font-size:13px;font-weight:700;color:var(--or);margin-bottom:10px">${ds}</div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:12px"><div style="text-align:center"><div style="font-size:9px;color:var(--mu);text-transform:uppercase;margin-bottom:2px">Done</div><div style="font-size:20px;font-weight:800;color:#4ade80">${done}</div></div><div style="text-align:center"><div style="font-size:9px;color:var(--mu);text-transform:uppercase;margin-bottom:2px">Skip</div><div style="font-size:20px;font-weight:800;color:#f87171">${skip}</div></div><div style="text-align:center"><div style="font-size:9px;color:var(--mu);text-transform:uppercase;margin-bottom:2px">%</div><div style="font-size:20px;font-weight:800;color:#38bdf8">${pct}%</div></div></div>`;
    sorted().forEach(task => {
        const s = t[task.id]; if (!s) return;
        html += `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-top:1px solid var(--border)"><span style="color:${s === 'done' ? '#4ade80' : '#f87171'};font-weight:700">${s === 'done' ? '✓' : '✗'}</span><span style="font-size:12px">${task.emoji} ${task.name}</span><span style="margin-left:auto;font-size:10px;color:var(--mu)">${fmt12(task.time)}</span></div>`;
    });
    detail.innerHTML = html + '</div>';
}

// ── Settings ───────────────────────────────────────────────
function toggleSetting(k) { const s = loadSettings(); s[k] = !s[k]; saveSetting(k, s[k]); document.getElementById('tog-' + k).className = 'tog' + (s[k] ? ' on' : ''); showToast(s[k] ? `✅ ${k} on` : `${k} off`) }
function loadSettingsUI() { const s = loadSettings();['sound', 'notif', 'overlay'].forEach(k => document.getElementById('tog-' + k).className = 'tog' + (s[k] ? ' on' : '')) }
function clearToday() { if (confirm('Aaj no data clear karva chho?')) { delete data[todayKey()]; saveData(data); buildTasks(); showToast('Clear thayo') } }
function clearAll() { if (confirm('Badho data clear karva chho?')) { localStorage.removeItem('ht_data'); data = {}; buildTasks(); showToast('Badho data clear thayo') } }

function showToast(msg, err = false) { const t = document.getElementById('toast'); t.textContent = msg; t.className = err ? 'err' : ''; t.style.display = 'block'; setTimeout(() => t.style.display = 'none', 3000) }

function switchTab(name) {
    ['today', 'tasks', 'weekly', 'settings'].forEach(t => document.getElementById('tab-' + t).classList.toggle('hidden', t !== name));
    document.querySelectorAll('.tab').forEach((el, i) => el.classList.toggle('active', ['today', 'tasks', 'weekly', 'settings'][i] === name));
    activeTab = name;
    if (name === 'tasks') buildManageList();
    if (name === 'weekly') buildWeekly();
    if (name === 'settings') loadSettingsUI();
}

// Init
updateNotifBanner(); buildTasks(); updateClock();
setInterval(updateClock, 1000);
setInterval(checkAlarms, 10000);
setInterval(() => { if (activeTab === 'today') buildTasks() }, 60000);
if (Notification.permission === 'default') setTimeout(() => Notification.requestPermission().then(() => updateNotifBanner()), 2000);


// script.js ma aa function add karo
let wakeLock = null;

async function requestWakeLock() {
    try {
        wakeLock = await navigator.wakeLock.request('screen');
        console.log('Wake Lock is active! Phone screen bandh nahi thay.');
    } catch (err) {
        console.error(`${err.name}, ${err.message}`);
    }
}

// Jyare user habit tracker start kare tyare aa call karo
requestWakeLock();


