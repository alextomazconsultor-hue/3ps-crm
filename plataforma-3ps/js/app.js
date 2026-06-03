/* =============================================
   MÉTODO 3PS — LÓGICA DA PLATAFORMA
   Toda a lógica de estado, navegação e render
============================================= */

// ---- ESTADO ----
const STATE = {
  currentScreen: 'dashboard',
  currentModuleId: null,
  currentLessonId: null,
  logoClickCount: 0,
  logoClickTimer: null
};

// ---- CHAVES localStorage ----
const KEY_LOGGED  = '3ps_loggedIn';
const KEY_NAME    = '3ps_name';
const KEY_DONE    = '3ps_completed';  // JSON array de IDs de aulas concluídas
const KEY_LAST    = '3ps_last';       // JSON { moduleId, lessonId }

// ---- HELPERS localStorage ----
function getCompleted() {
  try { return JSON.parse(localStorage.getItem(KEY_DONE)) || []; }
  catch { return []; }
}
function saveCompleted(arr) {
  localStorage.setItem(KEY_DONE, JSON.stringify(arr));
}
function getLast() {
  try { return JSON.parse(localStorage.getItem(KEY_LAST)) || null; }
  catch { return null; }
}
function saveLast(moduleId, lessonId) {
  localStorage.setItem(KEY_LAST, JSON.stringify({ moduleId, lessonId }));
}

// ---- STATS ----
function totalLessons() {
  return COURSE.reduce((s, m) => s + m.lessons.length, 0);
}
function completedCount() {
  return getCompleted().length;
}
function overallPct() {
  const total = totalLessons();
  if (!total) return 0;
  return Math.round((completedCount() / total) * 100);
}
function modulePct(mod) {
  const done = getCompleted();
  const c = mod.lessons.filter(l => done.includes(l.id)).length;
  return mod.lessons.length ? Math.round((c / mod.lessons.length) * 100) : 0;
}

// ---- TOAST ----
let toastTimer = null;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 3000);
}

// =============================================
// TELAS / ROTEAMENTO
// =============================================
const MAIN_SCREENS = ['dashboard', 'modules', 'materials', 'community'];

function showScreen(id) {
  // Telas principais controlam nav ativa
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
  });

  const target = document.getElementById('screen-' + id);
  if (target) target.classList.add('active');

  STATE.currentScreen = id;

  // Nav links desktop
  document.querySelectorAll('.nav-link').forEach(a => {
    a.classList.toggle('active', a.dataset.screen === id);
  });
  // Bottom nav mobile
  document.querySelectorAll('.bottom-nav-item').forEach(a => {
    a.classList.toggle('active', a.dataset.screen === id);
  });

  // Renderizar conteúdo da tela
  if (id === 'dashboard') renderDashboard();
  if (id === 'modules') renderModulesList();
}

function showModuleDetail(moduleId) {
  STATE.currentModuleId = moduleId;
  renderModuleDetail(moduleId);
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-module-detail').classList.add('active');
  STATE.currentScreen = 'module-detail';
}

function showLesson(moduleId, lessonId) {
  STATE.currentModuleId = moduleId;
  STATE.currentLessonId = lessonId;
  saveLast(moduleId, lessonId);
  renderLesson(moduleId, lessonId);
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-lesson').classList.add('active');
  STATE.currentScreen = 'lesson';
}

// =============================================
// AUTENTICAÇÃO
// =============================================
function initAuth() {
  const loggedIn = localStorage.getItem(KEY_LOGGED);
  if (loggedIn) {
    enterApp();
  }

  document.getElementById('form-login').addEventListener('submit', e => {
    e.preventDefault();
    const email = document.getElementById('input-email').value.trim();
    const name  = document.getElementById('input-name').value.trim();
    const pass  = document.getElementById('input-pass').value.trim();
    const err   = document.getElementById('login-error');

    if (email.length < 3 || name.length < 1 || pass.length < 3) {
      err.classList.remove('hidden');
      return;
    }
    err.classList.add('hidden');

    localStorage.setItem(KEY_LOGGED, '1');
    localStorage.setItem(KEY_NAME, name);
    enterApp();
  });
}

function enterApp() {
  document.getElementById('screen-login').classList.remove('active');
  document.getElementById('app-shell').classList.remove('hidden');
  showScreen('dashboard');
}

function logout() {
  localStorage.removeItem(KEY_LOGGED);
  localStorage.removeItem(KEY_NAME);
  document.getElementById('app-shell').classList.add('hidden');
  document.getElementById('screen-login').classList.add('active');
  // Limpar campos
  document.getElementById('input-email').value = '';
  document.getElementById('input-name').value  = '';
  document.getElementById('input-pass').value  = '';
}

// =============================================
// RESET DEMO (5 cliques no logo)
// =============================================
function handleLogoClick() {
  STATE.logoClickCount++;
  if (STATE.logoClickTimer) clearTimeout(STATE.logoClickTimer);
  STATE.logoClickTimer = setTimeout(() => { STATE.logoClickCount = 0; }, 2000);

  if (STATE.logoClickCount >= 5) {
    STATE.logoClickCount = 0;
    localStorage.removeItem(KEY_DONE);
    localStorage.removeItem(KEY_LAST);
    showToast('Progresso da demo resetado.');
    if (STATE.currentScreen === 'dashboard') renderDashboard();
  }
}

// =============================================
// RENDER — DASHBOARD
// =============================================
function renderDashboard() {
  const name = localStorage.getItem(KEY_NAME) || 'Aluno';
  document.getElementById('dash-greeting').textContent =
    `Olá, ${name}. Continue sua evolução no Método 3Ps.`;

  // Stats
  const pct   = overallPct();
  const done  = completedCount();
  const total = totalLessons();

  document.getElementById('dash-stats').innerHTML = `
    <div class="stat-card">
      <span class="stat-label">Progresso geral</span>
      <span class="stat-value">${pct}%</span>
      <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
    </div>
    <div class="stat-card">
      <span class="stat-label">Aulas concluídas</span>
      <span class="stat-value">${done}</span>
      <span class="stat-sub">de ${total} aulas</span>
    </div>
    <div class="stat-card">
      <span class="stat-label">Total de aulas</span>
      <span class="stat-value">${total}</span>
      <span class="stat-sub">${COURSE.length} módulos</span>
    </div>
  `;

  // Continuar assistindo
  renderContinue();

  // Módulos (mini cards no dashboard)
  const modGrid = document.getElementById('dash-modules');
  modGrid.innerHTML = '';
  COURSE.forEach(mod => {
    modGrid.appendChild(buildModuleCard(mod));
  });
}

function renderContinue() {
  const last = getLast();
  const el = document.getElementById('dash-continue');

  if (!last) {
    // Primeira aula do curso
    const mod = COURSE[0];
    const lesson = mod.lessons[0];
    el.innerHTML = continueCardHTML(mod, lesson, 'Começar do início');
    el.onclick = () => showLesson(mod.id, lesson.id);
    return;
  }

  const mod = COURSE.find(m => m.id === last.moduleId);
  if (!mod) return;
  const lesson = mod.lessons.find(l => l.id === last.lessonId);
  if (!lesson) return;

  const done = getCompleted();
  if (done.includes(lesson.id)) {
    // Próxima aula
    const idx = mod.lessons.indexOf(lesson);
    if (idx < mod.lessons.length - 1) {
      const next = mod.lessons[idx + 1];
      el.innerHTML = continueCardHTML(mod, next, 'Próxima aula');
      el.onclick = () => showLesson(mod.id, next.id);
    } else {
      // Próximo módulo
      const modIdx = COURSE.indexOf(mod);
      if (modIdx < COURSE.length - 1) {
        const nextMod = COURSE[modIdx + 1];
        const nextLesson = nextMod.lessons[0];
        el.innerHTML = continueCardHTML(nextMod, nextLesson, 'Próximo módulo');
        el.onclick = () => showLesson(nextMod.id, nextLesson.id);
      } else {
        el.innerHTML = `<div class="continue-info"><p style="color:var(--gold);font-weight:700;">🎉 Curso concluído! Parabéns!</p></div>`;
        el.onclick = null;
      }
    }
  } else {
    el.innerHTML = continueCardHTML(mod, lesson, 'Continuar');
    el.onclick = () => showLesson(mod.id, lesson.id);
  }
}

function continueCardHTML(mod, lesson, label) {
  const pct = modulePct(mod);
  return `
    <div class="continue-thumb">▶</div>
    <div class="continue-info">
      <div class="continue-module">Módulo ${mod.n} — ${label}</div>
      <div class="continue-title">${lesson.n}. ${lesson.title}</div>
      <div class="continue-progress">${pct}% do módulo concluído</div>
    </div>
    <div class="continue-arrow">›</div>
  `;
}

// =============================================
// RENDER — LISTA DE MÓDULOS
// =============================================
function renderModulesList() {
  const list = document.getElementById('modules-list');
  list.innerHTML = '';
  COURSE.forEach(mod => {
    list.appendChild(buildModuleCard(mod));
  });
}

function buildModuleCard(mod) {
  const pct = modulePct(mod);
  const div = document.createElement('div');
  div.className = 'module-card';
  div.innerHTML = `
    <div class="module-card-header">
      <div class="module-num">${mod.n}</div>
      <div>
        <div class="module-card-title">${mod.title}</div>
      </div>
    </div>
    <div class="module-card-desc">${mod.desc}</div>
    <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
    <div class="module-card-footer">
      <span class="module-lessons-count">${mod.lessons.length} aulas</span>
      <span class="module-pct">${pct}%</span>
    </div>
  `;
  div.addEventListener('click', () => showModuleDetail(mod.id));
  return div;
}

// =============================================
// RENDER — DETALHE DO MÓDULO
// =============================================
function renderModuleDetail(moduleId) {
  const mod = COURSE.find(m => m.id === moduleId);
  if (!mod) return;

  const pct = modulePct(mod);

  document.getElementById('module-detail-header').innerHTML = `
    <div class="module-detail-title">Módulo ${mod.n}: ${mod.title}</div>
    <div class="module-detail-desc">${mod.desc}</div>
    <div class="module-detail-progress">
      <span class="module-detail-pct">${pct}%</span>
      <div class="progress-bar-wrap wide"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
    </div>
  `;

  const list = document.getElementById('lessons-list');
  list.innerHTML = '';
  const done = getCompleted();
  const last = getLast();

  mod.lessons.forEach(lesson => {
    const isDone = done.includes(lesson.id);
    const isCurrent = last && last.lessonId === lesson.id;
    const statusLabel = isDone ? 'Concluída' : isCurrent ? 'Atual' : 'Pendente';
    const statusClass = isDone ? 'done' : isCurrent ? 'current' : 'pending';

    const item = document.createElement('div');
    item.className = `lesson-item ${isDone ? 'done' : ''} ${isCurrent && !isDone ? 'active' : ''}`;
    item.innerHTML = `
      <div class="lesson-item-num">${isDone ? '✓' : lesson.n}</div>
      <div class="lesson-item-info">
        <div class="lesson-item-title">${lesson.title}</div>
        <div class="lesson-item-status ${statusClass}">${statusLabel}</div>
      </div>
      <div class="lesson-item-check">${isDone ? '✅' : '▶'}</div>
    `;
    item.addEventListener('click', () => showLesson(moduleId, lesson.id));
    list.appendChild(item);
  });
}

// =============================================
// RENDER — AULA
// =============================================
function renderLesson(moduleId, lessonId) {
  const mod = COURSE.find(m => m.id === moduleId);
  if (!mod) return;
  const lesson = mod.lessons.find(l => l.id === lessonId);
  if (!lesson) return;

  // Player
  document.getElementById('lesson-iframe').src = lesson.videoUrl;

  // Info
  document.getElementById('lesson-title').textContent = `${lesson.n}. ${lesson.title}`;
  document.getElementById('lesson-desc').textContent = lesson.desc;

  // Botão concluída
  const btnComplete = document.getElementById('btn-complete');
  const done = getCompleted();
  if (done.includes(lessonId)) {
    btnComplete.textContent = '✓ Aula concluída';
    btnComplete.disabled = true;
    btnComplete.style.opacity = '0.5';
  } else {
    btnComplete.textContent = '✓ Marcar como concluída';
    btnComplete.disabled = false;
    btnComplete.style.opacity = '1';
  }
  btnComplete.onclick = () => markComplete(moduleId, lessonId);

  // Botão próxima
  const btnNext = document.getElementById('btn-next');
  const idx = mod.lessons.indexOf(lesson);
  const modIdx = COURSE.indexOf(mod);
  if (idx < mod.lessons.length - 1) {
    // Próxima aula no mesmo módulo
    btnNext.style.display = '';
    btnNext.textContent = 'Próxima aula →';
    btnNext.onclick = () => showLesson(moduleId, mod.lessons[idx + 1].id);
  } else if (modIdx < COURSE.length - 1) {
    // Primeira aula do próximo módulo
    const nextMod = COURSE[modIdx + 1];
    btnNext.style.display = '';
    btnNext.textContent = `Próximo módulo →`;
    btnNext.onclick = () => showLesson(nextMod.id, nextMod.lessons[0].id);
  } else {
    // Última aula do último módulo
    btnNext.style.display = '';
    btnNext.textContent = '🎉 Conclusão';
    btnNext.onclick = () => showToast('Você concluiu todas as aulas disponíveis. Parabéns!');
  }

  // Sidebar
  renderSidebar(mod, lessonId);
}

function renderSidebar(mod, currentLessonId) {
  const list = document.getElementById('sidebar-lessons');
  list.innerHTML = '';
  const done = getCompleted();

  mod.lessons.forEach(lesson => {
    const isDone = done.includes(lesson.id);
    const isCurrent = lesson.id === currentLessonId;

    const item = document.createElement('div');
    item.className = `lesson-item ${isDone ? 'done' : ''} ${isCurrent ? 'active' : ''}`;
    item.style.cursor = 'pointer';
    item.innerHTML = `
      <div class="lesson-item-num">${isDone ? '✓' : lesson.n}</div>
      <div class="lesson-item-info">
        <div class="lesson-item-title">${lesson.title}</div>
      </div>
    `;
    item.addEventListener('click', () => showLesson(mod.id, lesson.id));
    list.appendChild(item);
  });
}

// =============================================
// MARCAR AULA COMO CONCLUÍDA
// =============================================
function markComplete(moduleId, lessonId) {
  const done = getCompleted();
  if (!done.includes(lessonId)) {
    done.push(lessonId);
    saveCompleted(done);
  }

  // Atualizar botão
  const btnComplete = document.getElementById('btn-complete');
  btnComplete.textContent = '✓ Aula concluída';
  btnComplete.disabled = true;
  btnComplete.style.opacity = '0.5';

  // Atualizar sidebar com progresso novo
  const mod = COURSE.find(m => m.id === moduleId);
  if (mod) renderSidebar(mod, lessonId);

  showToast('Aula marcada como concluída!');
}

// =============================================
// INIT
// =============================================
function init() {
  initAuth();

  // Logout
  document.getElementById('btn-logout').addEventListener('click', logout);

  // Nav desktop
  document.querySelectorAll('.nav-link[data-screen]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      showScreen(a.dataset.screen);
    });
  });

  // Bottom nav mobile
  document.querySelectorAll('.bottom-nav-item[data-screen]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      showScreen(a.dataset.screen);
    });
  });

  // Voltar para módulos (tela de detalhe)
  document.getElementById('btn-back-modules').addEventListener('click', () => {
    showScreen('modules');
  });

  // Voltar para módulo (tela de aula)
  document.getElementById('btn-back-module').addEventListener('click', () => {
    document.getElementById('lesson-iframe').src = '';
    if (STATE.currentModuleId) {
      // Re-renderiza o detalhe do módulo para refletir progresso atualizado
      showModuleDetail(STATE.currentModuleId);
    } else {
      showScreen('modules');
    }
  });

  // Logo — reset demo (5 cliques)
  document.getElementById('logo-click').addEventListener('click', handleLogoClick);
}

document.addEventListener('DOMContentLoaded', init);
