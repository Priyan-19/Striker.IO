/* ============================================================
   Striker.IO — app.js
   Main Application Logic
   ============================================================ */

const IS_PROD = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
// IMPORTANT: Update this URL once you deploy your backend to Render!
const BASE_URL = IS_PROD ? 'https://your-backend-app.onrender.com' : '';

const API = {
  register: `${BASE_URL}/api/auth/register/`,
  login: `${BASE_URL}/api/auth/login/`,
  logout: `${BASE_URL}/api/auth/logout/`,
  me: `${BASE_URL}/api/auth/me/`,
  tasks: `${BASE_URL}/api/tasks/`,
  task: (id) => `${BASE_URL}/api/tasks/${id}/`,
  logs: `${BASE_URL}/api/logs/`,
  calendar: `${BASE_URL}/api/calendar/`,
  streaks: `${BASE_URL}/api/streaks/`,
  day: (date) => `${BASE_URL}/api/day/${date}/`,
};

// ============================================================
// STATE
// ============================================================
const State = {
  user: null,
  tasks: [],
  calendarData: {},
  streaks: {},
  recentLogs: [],
  commitTaskId: null,
  commitTaskName: '',
  commitTaskIcon: '',
  selectedColor: 'blue',
  today: new Date().toISOString().split('T')[0],
};

const COLORS = ['red', 'blue', 'orange', 'purple', 'green', 'pink', 'cyan', 'yellow'];

const TASK_COLOR_MAP = { 0: null, 1: 'tasks-1', 2: 'tasks-2', 3: 'tasks-3' };
const getTaskClass = (unique) => unique >= 4 ? 'tasks-4' : (TASK_COLOR_MAP[unique] || null);
const getDepthClass = (logs) => logs >= 4 ? 'depth-4' : `depth-${logs}`;

// ============================================================
// UTILITIES
// ============================================================
function getCsrfToken() {
  const cookies = document.cookie.split(';');
  for (let c of cookies) {
    const [k, v] = c.trim().split('=');
    if (k === 'csrftoken') return v;
  }
  return '';
}

async function apiFetch(url, options = {}) {
  const defaults = {
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken(),
    },
    credentials: 'include', // Needed for cross-origin cookies
  };
  try {
    const response = await fetch(url, { ...defaults, ...options, headers: { ...defaults.headers, ...(options.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, data };
  } catch (err) {
    console.error('Network Error:', err);
    return { ok: false, status: 0, data: { error: 'Network error. Please make sure BASE_URL is set to your actual Render URL.' } };
  }
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

function setButtonLoading(btnId, loading, originalText) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  if (loading) {
    btn.innerHTML = `<span class="loading-spinner"></span>Loading...`;
    btn.disabled = true;
  } else {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

// ============================================================
// AUTH TABS
// ============================================================
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');
  document.getElementById(`form-${tab}`).classList.add('active');
  document.getElementById('login-error').textContent = '';
  document.getElementById('register-error').textContent = '';
}

// ============================================================
// AUTH HANDLERS
// ============================================================
async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  errEl.textContent = '';

  setButtonLoading('btn-login-submit', true, 'Sign In');
  const { ok, data } = await apiFetch(API.login, {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  setButtonLoading('btn-login-submit', false, 'Sign In');

  if (ok) {
    State.user = data.user;
    showDashboard();
  } else {
    errEl.textContent = data.error || 'Login failed. Please try again.';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('reg-username').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const errEl = document.getElementById('register-error');
  errEl.textContent = '';

  if (password.length < 8) {
    errEl.textContent = 'Password must be at least 8 characters.';
    return;
  }

  setButtonLoading('btn-register-submit', true, 'Create Account');
  const { ok, data } = await apiFetch(API.register, {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  });
  setButtonLoading('btn-register-submit', false, 'Create Account');

  if (ok) {
    State.user = data.user;
    showDashboard();
  } else {
    errEl.textContent = data.error || 'Registration failed. Please try again.';
  }
}

async function handleLogout() {
  await apiFetch(API.logout, { method: 'POST' });
  State.user = null;
  State.tasks = [];
  State.calendarData = {};
  showAuth();
}

// ============================================================
// SCREEN TRANSITIONS
// ============================================================
function showAuth() {
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('dashboard-screen').style.display = 'none';
}

async function showDashboard() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('dashboard-screen').style.display = 'block';
  document.getElementById('nav-username').textContent = State.user?.username || '';
  await Promise.all([loadTasks(), loadCalendar(), loadStreaks(), loadRecentLogs()]);
}

// ============================================================
// TASKS
// ============================================================
async function loadTasks() {
  const { ok, data } = await apiFetch(API.tasks);
  if (ok) {
    State.tasks = data.tasks;
    renderTaskList();
  }
}

function renderTaskList() {
  const list = document.getElementById('task-list');
  if (!State.tasks.length) {
    list.innerHTML = `<div class="empty-state" style="padding:1.5rem;"><div class="empty-state-desc">No tasks yet. Add one below!</div></div>`;
    return;
  }

  list.innerHTML = State.tasks.map(task => `
    <div class="task-chip" data-color="${task.color_theme}" data-task-id="${task.id}">
      <span class="task-chip-icon">${task.icon}</span>
      <span class="task-chip-name">${escHtml(task.name)}</span>
      <button class="task-chip-action" onclick="openCommitModal(${task.id}, '${escHtml(task.name)}', '${task.icon}')">+ Log</button>
      <button class="task-chip-delete" onclick="deleteTask(${task.id}, event)" title="Remove task">✕</button>
    </div>
  `).join('');
}

async function deleteTask(taskId, e) {
  e.stopPropagation();
  if (!confirm('Remove this task? Its logs will be preserved.')) return;
  const { ok } = await apiFetch(API.task(taskId), { method: 'DELETE' });
  if (ok) {
    State.tasks = State.tasks.filter(t => t.id !== taskId);
    renderTaskList();
    showToast('Task removed');
  }
}

// ============================================================
// ADD TASK MODAL
// ============================================================
function openAddTaskModal() {
  document.getElementById('new-task-name').value = '';
  document.getElementById('add-task-error').textContent = '';
  State.selectedColor = 'blue';
  renderColorPicker();
  openModal('modal-add-task');
  setTimeout(() => document.getElementById('new-task-name').focus(), 100);
}

function renderColorPicker() {
  const picker = document.getElementById('color-picker');
  if (!picker) return;
  picker.innerHTML = COLORS.map(color => `
    <div class="color-option ${color === State.selectedColor ? 'selected' : ''}"
      data-color="${color}"
      onclick="selectColor('${color}')"></div>
  `).join('');
}

function selectColor(color) {
  State.selectedColor = color;
  renderColorPicker();
}

async function handleAddTask() {
  const name = document.getElementById('new-task-name').value.trim();
  const errEl = document.getElementById('add-task-error');
  errEl.textContent = '';

  if (!name) { errEl.textContent = 'Please enter a task name.'; return; }

  setButtonLoading('btn-submit-task', true, 'Add Task');
  const { ok, data } = await apiFetch(API.tasks, {
    method: 'POST',
    body: JSON.stringify({ name, color_theme: State.selectedColor, icon: '' }),
  });
  setButtonLoading('btn-submit-task', false, 'Add Task');

  if (ok) {
    State.tasks.push(data);
    renderTaskList();
    closeModal('modal-add-task');
    showToast(`Task "${name}" added!`);
  } else {
    errEl.textContent = data.error || 'Failed to add task.';
  }
}

// ============================================================
// COMMIT MODAL
// ============================================================
function openCommitModal(taskId, taskName, taskIcon) {
  State.commitTaskId = taskId;
  State.commitTaskName = taskName;
  State.commitTaskIcon = taskIcon;

  document.getElementById('commit-task-icon').textContent = taskIcon;
  document.getElementById('commit-task-name').textContent = taskName;
  document.getElementById('commit-date').value = State.today;
  document.getElementById('commit-message').value = '';
  document.getElementById('commit-error').textContent = '';

  openModal('modal-commit');
  setTimeout(() => document.getElementById('commit-message').focus(), 100);
}

async function handleSubmitCommit() {
  const message = document.getElementById('commit-message').value.trim();
  const date = document.getElementById('commit-date').value;
  const errEl = document.getElementById('commit-error');
  errEl.textContent = '';

  if (!message) { errEl.textContent = 'Please describe what you did.'; return; }
  if (!date) { errEl.textContent = 'Please select a date.'; return; }

  setButtonLoading('btn-submit-commit', true, 'Commit Progress');
  const { ok, data } = await apiFetch(API.logs, {
    method: 'POST',
    body: JSON.stringify({ task_id: State.commitTaskId, message, date }),
  });
  setButtonLoading('btn-submit-commit', false, 'Commit Progress');

  if (ok) {
    closeModal('modal-commit');
    showToast('Progress committed! Keep it up!');
    await Promise.all([loadCalendar(), loadStreaks(), loadRecentLogs()]);
  } else {
    errEl.textContent = data.error || 'Failed to log progress.';
  }
}

// ============================================================
// CALENDAR
// ============================================================
async function loadCalendar() {
  const { ok, data } = await apiFetch(API.calendar);
  if (ok) {
    State.calendarData = data.calendar;
    State.today = data.today;
    renderCalendar();
  }
}

function renderCalendar() {
  const container = document.getElementById('calendar-grid-container');
  const today = new Date(State.today + 'T00:00:00Z');

  // Build 53-week grid starting from Sunday
  const startDate = new Date(today);
  startDate.setUTCDate(startDate.getUTCDate() - 364);
  // Align to start of week (Sunday)
  startDate.setUTCDate(startDate.getUTCDate() - startDate.getUTCDay());

  const weeks = [];
  const monthLabels = [];
  let current = new Date(startDate);
  let lastMonth = -1;
  let weekIndex = 0;

  while (current <= today || weeks.length < 53) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(current));
      current.setUTCDate(current.getUTCDate() + 1);
    }
    weeks.push(week);

    // Track month labels
    const firstDayOfWeek = week[0];
    const month = firstDayOfWeek.getUTCMonth();
    if (month !== lastMonth) {
      monthLabels.push({ weekIndex, month });
      lastMonth = month;
    }
    weekIndex++;
    if (weeks.length >= 53) break;
  }

  // Render month labels row
  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const WEEK_CELL_WIDTH = 17; // 14px + 3px gap

  let monthRow = '<div class="calendar-months">';
  for (let i = 0; i < monthLabels.length; i++) {
    const current = monthLabels[i];
    const next = monthLabels[i + 1];
    const nextWi = next ? next.weekIndex : 53;
    const gap = (nextWi - current.weekIndex) * WEEK_CELL_WIDTH;
    monthRow += `<span class="month-label" style="width:${gap}px; display:inline-block; overflow:hidden;">${MONTH_NAMES[current.month]}</span>`;
  }
  monthRow += '</div>';

  // Render weekday labels
  const WEEKDAY_LABELS = ['Sun', '', 'Tue', '', 'Thu', '', 'Sat'];
  const weekdayCol = `<div class="calendar-weekdays">${WEEKDAY_LABELS.map(d => `<div class="weekday-label">${d}</div>`).join('')}</div>`;

  // Render weeks
  const todayStr = State.today;
  let weeksHtml = weeks.map(week => {
    const cells = week.map(day => {
      const dStr = day.toISOString().split('T')[0];
      const info = State.calendarData[dStr];
      const isToday = dStr === todayStr;
      const isFuture = dStr > todayStr;

      if (isFuture) {
        return `<div class="calendar-cell" style="opacity:0.2;cursor:default;"></div>`;
      }

      if (!info) {
        return `<div class="calendar-cell ${isToday ? 'cell-today' : ''}"
          data-date="${dStr}"
          onmouseenter="showTooltip(event, '${dStr}')"
          onmouseleave="hideTooltip()"
          onclick="openDayDetail('${dStr}')"></div>`;
      }

      const taskClass = getTaskClass(info.unique_tasks);
      const depthClass = getDepthClass(info.total_logs);

      return `<div class="calendar-cell cell-${taskClass} cell-${depthClass} ${isToday ? 'cell-today' : ''}"
        data-date="${dStr}"
        onmouseenter="showTooltip(event, '${dStr}')"
        onmouseleave="hideTooltip()"
        onclick="openDayDetail('${dStr}')"></div>`;
    }).join('');

    return `<div class="calendar-week">${cells}</div>`;
  }).join('');

  container.innerHTML = `
    ${monthRow}
    <div class="calendar-body">
      ${weekdayCol}
      <div class="calendar-columns">${weeksHtml}</div>
    </div>
  `;
}

// ============================================================
// TOOLTIP
// ============================================================
function showTooltip(event, dateStr) {
  const tooltip = document.getElementById('cell-tooltip');
  const info = State.calendarData[dateStr];

  let html = `<div class="tooltip-date">${formatDate(dateStr)}</div>`;

  if (!info) {
    html += `<div class="tooltip-empty">No activity recorded</div>`;
  } else {
    html += `<div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:0.5rem;">${info.unique_tasks} task${info.unique_tasks > 1 ? 's' : ''} · ${info.total_logs} log${info.total_logs > 1 ? 's' : ''}</div>`;
    info.entries.slice(0, 4).forEach(e => {
      html += `<div class="tooltip-entry">
        <span>${e.task_icon}</span>
        <div>
          <span class="tooltip-task-badge">${escHtml(e.task_name)}</span>
          <div style="margin-top:0.25rem;color:var(--text-secondary);">${escHtml(e.message.substring(0, 60))}${e.message.length > 60 ? '…' : ''}</div>
        </div>
      </div>`;
    });
    if (info.entries.length > 4) {
      html += `<div style="font-size:0.7rem;color:var(--text-muted);margin-top:0.3rem;">+${info.entries.length - 4} more</div>`;
    }
  }

  tooltip.innerHTML = html;

  const rect = event.target.getBoundingClientRect();
  const tooltipWidth = 260;
  let left = rect.right + 10;
  if (left + tooltipWidth > window.innerWidth - 10) {
    left = rect.left - tooltipWidth - 10;
  }
  let top = rect.top - 10;
  if (top + 200 > window.innerHeight) {
    top = window.innerHeight - 210;
  }

  tooltip.style.left = left + 'px';
  tooltip.style.top = top + 'px';
  tooltip.classList.add('visible');
}

function hideTooltip() {
  document.getElementById('cell-tooltip').classList.remove('visible');
}

// ============================================================
// DAY DETAIL MODAL
// ============================================================
async function openDayDetail(dateStr) {
  const { ok, data } = await apiFetch(API.day(dateStr));
  if (!ok) return;

  document.getElementById('day-detail-title').textContent = formatDate(dateStr);

  const list = document.getElementById('day-logs-list');
  if (!data.logs.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-state-title">No logs for this day</div><div class="empty-state-desc">Click a task and log your progress!</div></div>`;
  } else {
    const colorBorder = { red: '#ef4444', blue: '#3b82f6', orange: '#f97316', purple: '#a855f7', green: '#22c55e', pink: '#ec4899', cyan: '#06b6d4', yellow: '#eab308' };
    list.innerHTML = data.logs.map(log => `
      <div class="day-log-entry" style="border-left-color: ${colorBorder[log.task_color] || '#7c3aed'};">
        <div class="day-log-task">${log.task_icon} ${escHtml(log.task_name)}</div>
        <div class="day-log-message">${escHtml(log.message)}</div>
      </div>
    `).join('');
  }

  openModal('modal-day-detail');
}

// ============================================================
// STREAKS
// ============================================================
async function loadStreaks() {
  const { ok, data } = await apiFetch(API.streaks);
  if (ok) {
    State.streaks = data;
    document.getElementById('stat-current-streak').textContent = data.current_streak;
    document.getElementById('stat-longest-streak').textContent = data.longest_streak;
    document.getElementById('stat-total-days').textContent = data.total_active_days;
    document.getElementById('stat-consistency').textContent = data.consistency_30d + '%';
    document.getElementById('nav-streak-count').textContent = data.current_streak;
  }
}

// ============================================================
// RECENT LOGS
// ============================================================
async function loadRecentLogs() {
  const { ok, data } = await apiFetch(API.logs);
  if (ok) {
    State.recentLogs = data.logs;
    renderRecentLogs();
  }
}

function renderRecentLogs() {
  const list = document.getElementById('activity-list');
  if (!State.recentLogs.length) {
    list.innerHTML = `<div class="activity-empty">No activity yet. Start logging your progress!</div>`;
    return;
  }

  list.innerHTML = State.recentLogs.slice(0, 15).map(log => `
    <div class="activity-item">
      <div class="activity-icon">${log.task_icon || ''}</div>
      <div class="activity-content">
        <div class="activity-task">${escHtml(log.task_name)}</div>
        <div class="activity-message">${escHtml(log.message)}</div>
        <div class="activity-date">${formatDate(log.date)}</div>
      </div>
    </div>
  `).join('');
}

// ============================================================
// SECURITY: HTML escape
// ============================================================
function escHtml(str) {
  const el = document.createElement('div');
  el.textContent = str || '';
  return el.innerHTML;
}

// ============================================================
// SETTINGS (THEME COLORS)
// ============================================================
const DEFAULT_COLORS = {
  c1: '#ef4444',
  c2: '#00c9ff',
  c3: '#f97316',
  c4: '#22c55e' // Green
};

function hexToRgbStr(hex) {
  let c = hex.substring(1);      // strip #
  let rgb = parseInt(c, 16);
  let r = (rgb >> 16) & 255;
  let g = (rgb >> 8) & 255;
  let b = (rgb >> 0) & 255;
  return `${r}, ${g}, ${b}`;
}

function applyThemeColors() {
  const saved = JSON.parse(localStorage.getItem('striker_theme_colors')) || DEFAULT_COLORS;
  document.documentElement.style.setProperty('--c1-rgb', hexToRgbStr(saved.c1));
  document.documentElement.style.setProperty('--c2-rgb', hexToRgbStr(saved.c2));
  document.documentElement.style.setProperty('--c3-rgb', hexToRgbStr(saved.c3));
  document.documentElement.style.setProperty('--c4-rgb', hexToRgbStr(saved.c4));
}

function openSettingsModal() {
  const saved = JSON.parse(localStorage.getItem('striker_theme_colors')) || DEFAULT_COLORS;
  document.getElementById('color-pref-1').value = saved.c1;
  document.getElementById('color-pref-2').value = saved.c2;
  document.getElementById('color-pref-3').value = saved.c3;
  document.getElementById('color-pref-4').value = saved.c4;
  openModal('modal-settings');
}

function saveSettings() {
  const customColors = {
    c1: document.getElementById('color-pref-1').value,
    c2: document.getElementById('color-pref-2').value,
    c3: document.getElementById('color-pref-3').value,
    c4: document.getElementById('color-pref-4').value,
  };
  localStorage.setItem('striker_theme_colors', JSON.stringify(customColors));
  applyThemeColors();
  closeModal('modal-settings');
  showToast('Colors updated successfully!');
}

function resetColors() {
  localStorage.removeItem('striker_theme_colors');
  applyThemeColors();
  closeModal('modal-settings');
  showToast('Colors reset to defaults!');
}

// ============================================================
// INIT — Check session on page load
// ============================================================
(async function init() {
  applyThemeColors();
  try {
    const { ok, data } = await apiFetch(API.me);
    if (ok && data.user) {
      State.user = data.user;
      showDashboard();
    } else {
      showAuth();
    }
  } catch (e) {
    // Backend not available — show auth screen in UI-preview mode
    showAuth();
  }
})();
