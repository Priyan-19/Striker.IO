/* ============================================================
   Striker.IO — app.js
   Main Application Logic
   ============================================================ */

const API = {
  register: '/api/auth/register/',
  login: '/api/auth/login/',
  logout: '/api/auth/logout/',
  me: '/api/auth/me/',
  tasks: '/api/tasks/',
  task: (id) => `/api/tasks/${id}/`,
  logs: '/api/logs/',
  calendar: '/api/calendar/',
  streaks: '/api/streaks/',
  day: (date) => `/api/day/${date}/`,
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
  selectedIcon: '🎯',
  selectedColor: 'blue',
  today: new Date().toISOString().split('T')[0],
  viewMode: localStorage.getItem('striker_view_mode') || '3d',
};

let ThreeState = {
  renderer: null,
  scene: null,
  camera: null,
  controls: null,
  barsGroup: null,
  hoveredBar: null,
  animationFrameId: null,
};
const DEFAULT_COLORS = {
  c1: '#ef4444',
  c2: '#3b82f6',
  c3: '#f97316',
  c4: '#a855f7'
};

const ICONS = ['🎯', '💻', '📚', '🏋️', '🧠', '✏️', '🎵', '🌍', '🔬', '📊', '🏃', '🎨', '📝', '💡', '🚀', '⚡'];
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
    credentials: 'same-origin',
  };
  const response = await fetch(url, { ...defaults, ...options, headers: { ...defaults.headers, ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
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
  switchViewMode(State.viewMode);
}

function switchViewMode(mode) {
  State.viewMode = mode;
  localStorage.setItem('striker_view_mode', mode);

  const btn2d = document.getElementById('btn-view-2d');
  const btn3d = document.getElementById('btn-view-3d');
  const container2d = document.getElementById('calendar-grid-container');
  const container3d = document.getElementById('calendar-3d-container');

  if (mode === '2d') {
    if (btn2d) btn2d.classList.add('active');
    if (btn3d) btn3d.classList.remove('active');
    if (container2d) container2d.style.display = 'inline-flex';
    if (container3d) container3d.style.display = 'none';

    if (ThreeState.animationFrameId) {
      cancelAnimationFrame(ThreeState.animationFrameId);
      ThreeState.animationFrameId = null;
    }
  } else {
    if (btn2d) btn2d.classList.remove('active');
    if (btn3d) btn3d.classList.add('active');
    if (container2d) container2d.style.display = 'none';
    if (container3d) container3d.style.display = 'block';

    render3DCalendar();
  }
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
  State.selectedIcon = '🎯';
  State.selectedColor = 'blue';
  renderIconPicker();
  renderColorPicker();
  openModal('modal-add-task');
  setTimeout(() => document.getElementById('new-task-name').focus(), 100);
}

function renderIconPicker() {
  const picker = document.getElementById('icon-picker');
  picker.innerHTML = ICONS.map(icon => `
    <button class="icon-option ${icon === State.selectedIcon ? 'selected' : ''}"
      onclick="selectIcon('${icon}')">${icon}</button>
  `).join('');
}

function renderColorPicker() {
  const picker = document.getElementById('color-picker');
  picker.innerHTML = COLORS.map(color => `
    <div class="color-option ${color === State.selectedColor ? 'selected' : ''}"
      data-color="${color}"
      onclick="selectColor('${color}')"></div>
  `).join('');
}

function selectIcon(icon) {
  State.selectedIcon = icon;
  renderIconPicker();
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
    body: JSON.stringify({ name, color_theme: State.selectedColor, icon: State.selectedIcon }),
  });
  setButtonLoading('btn-submit-task', false, 'Add Task');

  if (ok) {
    State.tasks.push(data);
    renderTaskList();
    closeModal('modal-add-task');
    showToast(`Task "${name}" added! 🎯`);
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

  setButtonLoading('btn-submit-commit', true, 'Commit Progress 🚀');
  const { ok, data } = await apiFetch(API.logs, {
    method: 'POST',
    body: JSON.stringify({ task_id: State.commitTaskId, message, date }),
  });
  setButtonLoading('btn-submit-commit', false, 'Commit Progress 🚀');

  if (ok) {
    closeModal('modal-commit');
    showToast('Progress committed! Keep it up! 🔥');
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
    if (State.viewMode === '3d') {
      render3DCalendar();
    }
  }
}

function renderCalendar() {
  const container = document.getElementById('calendar-grid-container');
  const today = new Date(State.today + 'T00:00:00');

  // Build 53-week grid starting from Sunday
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 364);
  // Align to start of week (Sunday)
  startDate.setDate(startDate.getDate() - startDate.getDay());

  const weeks = [];
  const monthLabels = [];
  let current = new Date(startDate);
  let lastMonth = -1;
  let weekIndex = 0;

  while (current <= today || weeks.length < 53) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    weeks.push(week);

    // Track month labels
    const firstDayOfWeek = week[0];
    const month = firstDayOfWeek.getMonth();
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
  let lastPos = 0;
  monthLabels.forEach(({ weekIndex: wi, month }) => {
    const gap = (wi - lastPos) * WEEK_CELL_WIDTH;
    monthRow += `<span class="month-label" style="width:${gap > 0 ? gap : 0}px;display:inline-block;">${MONTH_NAMES[month]}</span>`;
    lastPos = wi;
  });
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
// 3D CALENDAR (THREE.JS)
// ============================================================
function render3DCalendar() {
  const container = document.getElementById('calendar-3d-container');
  if (!container) return;

  const width = container.clientWidth || 800;
  const height = container.clientHeight || 350;

  if (!ThreeState.renderer) {
    ThreeState.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    ThreeState.renderer.setSize(width, height);
    ThreeState.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    ThreeState.renderer.shadowMap.enabled = true;
    ThreeState.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(ThreeState.renderer.domElement);

    ThreeState.scene = new THREE.Scene();

    const aspect = width / height;
    const d = 16;
    ThreeState.camera = new THREE.OrthographicCamera(
      -d * aspect, d * aspect,
      d, -d,
      1, 1000
    );
    ThreeState.camera.position.set(20, 20, 20);
    ThreeState.camera.lookAt(0, 0, 0);

    ThreeState.controls = new THREE.OrbitControls(ThreeState.camera, ThreeState.renderer.domElement);
    ThreeState.controls.enableDamping = true;
    ThreeState.controls.dampingFactor = 0.05;
    ThreeState.controls.maxPolarAngle = Math.PI / 2 - 0.05;
    ThreeState.controls.minZoom = 0.5;
    ThreeState.controls.maxZoom = 3.0;
    ThreeState.controls.target.set(0, 0, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    ThreeState.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLight.position.set(-15, 30, 15);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.left = -25;
    dirLight.shadow.camera.right = 25;
    dirLight.shadow.camera.top = 25;
    dirLight.shadow.camera.bottom = -25;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 100;
    dirLight.shadow.bias = -0.0005;
    ThreeState.scene.add(dirLight);

    ThreeState.barsGroup = new THREE.Group();
    ThreeState.scene.add(ThreeState.barsGroup);

    setup3DEvents(container);
  } else {
    ThreeState.renderer.setSize(width, height);
    const aspect = width / height;
    const d = 16;
    ThreeState.camera.left = -d * aspect;
    ThreeState.camera.right = d * aspect;
    ThreeState.camera.top = d;
    ThreeState.camera.bottom = -d;
    ThreeState.camera.updateProjectionMatrix();
  }

  while (ThreeState.barsGroup.children.length > 0) {
    const obj = ThreeState.barsGroup.children[0];
    ThreeState.barsGroup.remove(obj);
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) {
        obj.material.forEach(m => m.dispose());
      } else {
        obj.material.dispose();
      }
    }
  }

  const todayStr = State.today;
  const today = new Date(todayStr + 'T00:00:00Z');

  const startDate = new Date(today);
  startDate.setUTCDate(startDate.getUTCDate() - 364);
  startDate.setUTCDate(startDate.getUTCDate() - startDate.getUTCDay());

  const weeks = [];
  let current = new Date(startDate);
  while (current <= today || weeks.length < 53) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(current));
      current.setUTCDate(current.getUTCDate() + 1);
    }
    weeks.push(week);
    if (weeks.length >= 53) break;
  }

  const colSpacing = 0.65;
  const rowSpacing = 0.65;
  const colOffset = (53 * colSpacing) / 2;
  const rowOffset = (7 * rowSpacing) / 2;

  const savedColors = JSON.parse(localStorage.getItem('striker_theme_colors')) || DEFAULT_COLORS;
  
  const themeColors = {
    1: savedColors.c1 || '#ef4444',
    2: savedColors.c2 || '#3b82f6',
    3: savedColors.c3 || '#f97316',
    4: savedColors.c4 || '#a855f7'
  };

  const barWidth = 0.5;
  const barDepth = 0.5;
  const baseTileHeight = 0.08;

  const targetScales = [];

  weeks.forEach((week, colIndex) => {
    week.forEach((day, rowIndex) => {
      const dStr = day.toISOString().split('T')[0];
      const info = State.calendarData[dStr];
      const isToday = dStr === todayStr;
      const isFuture = dStr > todayStr;

      const px = colIndex * colSpacing - colOffset;
      const pz = rowIndex * rowSpacing - rowOffset;

      let height = baseTileHeight;
      let colorStr = 'rgba(255, 255, 255, 0.05)';
      let isLogged = false;
      let uniqueTasks = 0;
      let totalLogs = 0;

      if (isFuture) {
        colorStr = '#0d1527';
      } else if (info) {
        isLogged = true;
        uniqueTasks = info.unique_tasks;
        totalLogs = info.total_logs;
        height = baseTileHeight + Math.min(totalLogs * 0.4, 2.8);
        const taskGroup = Math.min(uniqueTasks, 4);
        colorStr = themeColors[taskGroup] || '#7c3aed';
      } else {
        colorStr = '#1b2336';
      }

      const geometry = new THREE.BoxGeometry(barWidth, 1, barDepth);
      geometry.translate(0, 0.5, 0);

      let material;
      if (isLogged) {
        material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(colorStr),
          roughness: 0.15,
          metalness: 0.1,
        });
      } else {
        material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(colorStr),
          roughness: 0.6,
          metalness: 0.05,
          transparent: isFuture,
          opacity: isFuture ? 0.15 : 0.8
        });
      }

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(px, 0, pz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      mesh.userData = {
        date: dStr,
        isLogged: isLogged,
        uniqueTasks: uniqueTasks,
        totalLogs: totalLogs,
        baseColor: colorStr,
        isToday: isToday
      };

      mesh.scale.set(1, 0.01, 1);
      ThreeState.barsGroup.add(mesh);

      targetScales.push({
        mesh: mesh,
        targetHeight: height
      });

      if (isToday) {
        const todayGeo = new THREE.BoxGeometry(barWidth + 0.1, 0.02, barDepth + 0.1);
        const todayMat = new THREE.MeshBasicMaterial({
          color: 0x00c9ff,
          transparent: true,
          opacity: 0.8
        });
        const todayMesh = new THREE.Mesh(todayGeo, todayMat);
        todayMesh.position.set(px, 0.01, pz);
        ThreeState.barsGroup.add(todayMesh);
      }
    });
  });

  if (!ThreeState.animationFrameId) {
    let animProgress = 0;

    function animate() {
      ThreeState.animationFrameId = requestAnimationFrame(animate);

      if (animProgress < 1.0) {
        animProgress += 0.025;
        targetScales.forEach(item => {
          const currentH = THREE.MathUtils.lerp(0.01, item.targetHeight, animProgress);
          item.mesh.scale.set(1, currentH, 1);
        });
      }

      if (ThreeState.controls) {
        ThreeState.controls.update();
      }

      if (ThreeState.renderer && ThreeState.scene && ThreeState.camera) {
        ThreeState.renderer.render(ThreeState.scene, ThreeState.camera);
      }
    }
    animate();
  } else {
    let animProgress = 0;
    targetScales.forEach(item => {
      item.mesh.scale.set(1, 0.01, 1);
    });

    const animInterval = setInterval(() => {
      animProgress += 0.05;
      if (animProgress >= 1.0) {
        targetScales.forEach(item => {
          item.mesh.scale.set(1, item.targetHeight, 1);
        });
        clearInterval(animInterval);
      } else {
        targetScales.forEach(item => {
          const currentH = THREE.MathUtils.lerp(0.01, item.targetHeight, animProgress);
          item.mesh.scale.set(1, currentH, 1);
        });
      }
    }, 16);
  }
}

function setup3DEvents(container) {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  function onPointerMove(event) {
    const rect = ThreeState.renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, ThreeState.camera);
    
    const intersectables = ThreeState.barsGroup.children.filter(child => child.userData && child.userData.date);
    const intersects = raycaster.intersectObjects(intersectables);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      
      if (ThreeState.hoveredBar !== hit) {
        if (ThreeState.hoveredBar) {
          if (ThreeState.hoveredBar.material && ThreeState.hoveredBar.material.emissive) {
            ThreeState.hoveredBar.material.emissive.setHex(0x000000);
          }
        }
        
        ThreeState.hoveredBar = hit;
        if (hit.material && hit.material.emissive) {
          hit.material.emissive.setHex(0x222222);
        }
      }
      
      show3DTooltip(event.clientX, event.clientY, hit.userData.date);
    } else {
      if (ThreeState.hoveredBar) {
        if (ThreeState.hoveredBar.material && ThreeState.hoveredBar.material.emissive) {
          ThreeState.hoveredBar.material.emissive.setHex(0x000000);
        }
        ThreeState.hoveredBar = null;
      }
      hideTooltip();
    }
  }

  function onPointerClick(event) {
    const rect = ThreeState.renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, ThreeState.camera);
    const intersectables = ThreeState.barsGroup.children.filter(child => child.userData && child.userData.date);
    const intersects = raycaster.intersectObjects(intersectables);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      openDayDetail(hit.userData.date);
    }
  }

  const resizeObserver = new ResizeObserver(() => {
    if (!ThreeState.renderer || !container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    ThreeState.renderer.setSize(w, h);
    
    const aspect = w / h;
    const d = 16;
    ThreeState.camera.left = -d * aspect;
    ThreeState.camera.right = d * aspect;
    ThreeState.camera.top = d;
    ThreeState.camera.bottom = -d;
    ThreeState.camera.updateProjectionMatrix();
  });
  
  resizeObserver.observe(container);

  ThreeState.renderer.domElement.addEventListener('mousemove', onPointerMove);
  ThreeState.renderer.domElement.addEventListener('click', onPointerClick);
}

function show3DTooltip(clientX, clientY, dateStr) {
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

  const tooltipWidth = 260;
  let left = clientX + 15;
  if (left + tooltipWidth > window.innerWidth - 10) {
    left = clientX - tooltipWidth - 15;
  }
  let top = clientY - 15;
  if (top + 200 > window.innerHeight) {
    top = window.innerHeight - 210;
  }

  tooltip.style.left = left + 'px';
  tooltip.style.top = top + 'px';
  tooltip.classList.add('visible');
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
    list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-title">No logs for this day</div><div class="empty-state-desc">Click a task and log your progress!</div></div>`;
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
      <div class="activity-icon">${log.task_icon || '🎯'}</div>
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
// INIT — Check session on page load
// ============================================================
(async function init() {
  const { ok, data } = await apiFetch(API.me);
  if (ok && data.user) {
    State.user = data.user;
    showDashboard();
  } else {
    showAuth();
  }
})();
