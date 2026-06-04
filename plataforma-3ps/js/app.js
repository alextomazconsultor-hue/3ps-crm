/* =============================================
   MÉTODO 3PS — LÓGICA DA PLATAFORMA
============================================= */

// ---- ESTADO ----
const STATE = {
  currentScreen:   'dashboard',
  currentModuleId: null,
  currentLessonId: null,
  logoClickCount:  0,
  logoClickTimer:  null
};

// ---- E-MAIL DO ALUNO (identificador sem auth) ----
let CURRENT_EMAIL = localStorage.getItem('3ps_email') || null;

// ---- SUPABASE DISPONÍVEL? ----
const SB_OK = (
  typeof SUPABASE_URL !== 'undefined' &&
  SUPABASE_URL !== 'COLE_AQUI_SUA_SUPABASE_URL'
);

// ---- PROGRESSO EM MEMÓRIA (carregado do Supabase ou localStorage) ----
let COMPLETED_CACHE = null; // null = ainda não carregado
let LAST_CACHE      = null; // null = ainda não carregado

// ---- CHAVES localStorage ----
const KEY_DONE  = '3ps_completed';
const KEY_LAST  = '3ps_last';
const KEY_EMAIL = '3ps_email';
const KEY_NAME  = '3ps_name';

// Retorna lista de aulas concluídas (cache > localStorage)
function getCompleted() {
  if (COMPLETED_CACHE !== null) return COMPLETED_CACHE;
  try { return JSON.parse(localStorage.getItem(KEY_DONE)) || []; }
  catch { return []; }
}

// Salva localmente e sincroniza cache
function saveCompleted(arr) {
  COMPLETED_CACHE = arr;
  localStorage.setItem(KEY_DONE, JSON.stringify(arr));
}

// Retorna última aula (cache > localStorage)
function getLast() {
  if (LAST_CACHE !== null) return LAST_CACHE;
  try { return JSON.parse(localStorage.getItem(KEY_LAST)) || null; }
  catch { return null; }
}

// Salva localmente, sincroniza cache e persiste no Supabase (async, sem bloquear)
function saveLast(moduleId, lessonId) {
  LAST_CACHE = { moduleId, lessonId };
  localStorage.setItem(KEY_LAST, JSON.stringify(LAST_CACHE));
  if (SB_OK && CURRENT_EMAIL) saveLastLessonToSupabase(CURRENT_EMAIL, moduleId, lessonId);
}

// =============================================
// SUPABASE — CARREGAR PROGRESSO
// =============================================
async function loadProgressFromSupabase(email) {
  const { data, error } = await supabaseClient
    .from('student_progress')
    .select('lesson_id')
    .eq('email', email)
    .eq('completed', true);

  if (error) { console.warn('loadProgress:', error.message); return; }
  COMPLETED_CACHE = (data || []).map(r => r.lesson_id);
  // Sincronizar no localStorage também
  localStorage.setItem(KEY_DONE, JSON.stringify(COMPLETED_CACHE));
}

// =============================================
// SUPABASE — SALVAR PROGRESSO
// =============================================
async function saveProgressToSupabase(email, lessonId) {
  const { error } = await supabaseClient
    .from('student_progress')
    .upsert(
      { email, lesson_id: lessonId, completed: true, completed_at: new Date().toISOString() },
      { onConflict: 'email,lesson_id' }
    );
  if (error) console.warn('saveProgress:', error.message);
}

// =============================================
// SUPABASE — CARREGAR ÚLTIMA AULA
// =============================================
async function loadLastLessonFromSupabase(email) {
  const { data, error } = await supabaseClient
    .from('student_state')
    .select('last_module_id, last_lesson_id')
    .eq('email', email)
    .single();

  if (error && error.code !== 'PGRST116') { console.warn('loadLast:', error.message); return; }
  if (!data) return;

  LAST_CACHE = { moduleId: data.last_module_id, lessonId: data.last_lesson_id };
  localStorage.setItem(KEY_LAST, JSON.stringify(LAST_CACHE));
}

// =============================================
// SUPABASE — SALVAR ÚLTIMA AULA
// =============================================
async function saveLastLessonToSupabase(email, moduleId, lessonId) {
  const { error } = await supabaseClient
    .from('student_state')
    .upsert(
      { email, last_module_id: moduleId, last_lesson_id: lessonId, updated_at: new Date().toISOString() },
      { onConflict: 'email' }
    );
  if (error) console.warn('saveLast:', error.message);
}

// ---- STATS ----
function totalLessons()   { return COURSE.reduce((s, m) => s + m.lessons.length, 0); }
function completedCount() { return getCompleted().length; }
function overallPct() {
  const t = totalLessons();
  return t ? Math.round((completedCount() / t) * 100) : 0;
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
  toastTimer = setTimeout(() => el.classList.add('hidden'), 3500);
}

// =============================================
// ROTEAMENTO DE TELAS
// =============================================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const t = document.getElementById('screen-' + id);
  if (t) t.classList.add('active');
  STATE.currentScreen = id;
  document.querySelectorAll('.nav-link').forEach(a =>
    a.classList.toggle('active', a.dataset.screen === id));
  document.querySelectorAll('.bottom-nav-item').forEach(a =>
    a.classList.toggle('active', a.dataset.screen === id));
  if (id === 'dashboard') renderDashboard();
  if (id === 'modules')   renderModulesList();
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
// LOGIN (aberto — qualquer e-mail/senha aceitos)
// =============================================
async function initAuth() {
  // Já logado anteriormente?
  if (CURRENT_EMAIL) {
    if (SB_OK) {
      await loadProgressFromSupabase(CURRENT_EMAIL);
      await loadLastLessonFromSupabase(CURRENT_EMAIL);
    }
    enterApp();
    return;
  }

  document.getElementById('form-login').addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('input-email').value.trim();
    const pass  = document.getElementById('input-pass').value.trim();
    const err   = document.getElementById('login-error');

    if (!email || !pass) {
      err.textContent = 'Preencha e-mail e senha.';
      err.classList.remove('hidden');
      return;
    }

    err.classList.add('hidden');
    const btn = e.target.querySelector('button[type="submit"]');
    btn.textContent = 'Entrando...';
    btn.disabled = true;

    CURRENT_EMAIL = email;
    localStorage.setItem(KEY_EMAIL, email);

    const nome = email.split('@')[0];
    localStorage.setItem(KEY_NAME, nome);

    if (SB_OK) {
      await loadProgressFromSupabase(email);
      await loadLastLessonFromSupabase(email);
    }

    btn.textContent = 'Entrar na plataforma';
    btn.disabled = false;
    enterApp();
  });
}

// =============================================
// ENTRAR NO APP
// =============================================
function enterApp() {
  document.getElementById('screen-login').classList.remove('active');
  document.getElementById('input-email').value = '';
  document.getElementById('input-pass').value  = '';
  document.getElementById('app-shell').classList.remove('hidden');
  showScreen('dashboard');
}

// =============================================
// LOGOUT
// =============================================
function logout() {
  CURRENT_EMAIL   = null;
  COMPLETED_CACHE = null;
  LAST_CACHE      = null;
  localStorage.removeItem(KEY_EMAIL);
  localStorage.removeItem(KEY_NAME);
  localStorage.removeItem(KEY_DONE);
  localStorage.removeItem(KEY_LAST);
  document.getElementById('app-shell').classList.add('hidden');
  document.getElementById('screen-login').classList.add('active');
}

// =============================================
// RESET DEMO — 5 cliques no logo
// =============================================
function handleLogoClick() {
  STATE.logoClickCount++;
  if (STATE.logoClickTimer) clearTimeout(STATE.logoClickTimer);
  STATE.logoClickTimer = setTimeout(() => { STATE.logoClickCount = 0; }, 2000);
  if (STATE.logoClickCount >= 5) {
    STATE.logoClickCount = 0;
    COMPLETED_CACHE = null;
    LAST_CACHE      = null;
    localStorage.removeItem(KEY_DONE);
    localStorage.removeItem(KEY_LAST);
    showToast('Progresso resetado.');
    if (STATE.currentScreen === 'dashboard') renderDashboard();
  }
}

// =============================================
// RENDER — DASHBOARD
// =============================================
function renderDashboard() {
  const nome = localStorage.getItem('3ps_name') || 'Aluno';
  document.getElementById('dash-greeting').textContent =
    `Olá, ${nome}. Continue sua evolução no Método 3Ps.`;

  const pct = overallPct(), done = completedCount(), total = totalLessons();
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
    </div>`;

  renderContinue();

  const grid = document.getElementById('dash-modules');
  grid.innerHTML = '';
  COURSE.forEach(mod => grid.appendChild(buildModuleCard(mod)));
}

function renderContinue() {
  const last = getLast();
  const el   = document.getElementById('dash-continue');

  if (!last) {
    const mod = COURSE[0], lesson = mod.lessons[0];
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
    const idx = mod.lessons.indexOf(lesson);
    if (idx < mod.lessons.length - 1) {
      const next = mod.lessons[idx + 1];
      el.innerHTML = continueCardHTML(mod, next, 'Próxima aula');
      el.onclick = () => showLesson(mod.id, next.id);
    } else {
      const mi = COURSE.indexOf(mod);
      if (mi < COURSE.length - 1) {
        const nm = COURSE[mi + 1];
        el.innerHTML = continueCardHTML(nm, nm.lessons[0], 'Próximo módulo');
        el.onclick = () => showLesson(nm.id, nm.lessons[0].id);
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
  return `
    <div class="continue-thumb">▶</div>
    <div class="continue-info">
      <div class="continue-module">Módulo ${mod.n} — ${label}</div>
      <div class="continue-title">${lesson.n}. ${lesson.title}</div>
      <div class="continue-progress">${modulePct(mod)}% do módulo concluído</div>
    </div>
    <div class="continue-arrow">›</div>`;
}

// =============================================
// RENDER — MÓDULOS
// =============================================
function renderModulesList() {
  const list = document.getElementById('modules-list');
  list.innerHTML = '';
  COURSE.forEach(mod => list.appendChild(buildModuleCard(mod)));
}

function buildModuleCard(mod) {
  const pct = modulePct(mod);
  const div = document.createElement('div');
  div.className = 'module-card';
  div.innerHTML = `
    <div class="module-card-header">
      <div class="module-num">${mod.n}</div>
      <div><div class="module-card-title">${mod.title}</div></div>
    </div>
    <div class="module-card-desc">${mod.desc}</div>
    <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
    <div class="module-card-footer">
      <span class="module-lessons-count">${mod.lessons.length} aulas</span>
      <span class="module-pct">${pct}%</span>
    </div>`;
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
    </div>`;

  const list = document.getElementById('lessons-list');
  list.innerHTML = '';
  const done = getCompleted(), last = getLast();
  mod.lessons.forEach(lesson => {
    const isDone    = done.includes(lesson.id);
    const isCurrent = last && last.lessonId === lesson.id;
    const sc = isDone ? 'done' : isCurrent ? 'current' : 'pending';
    const sl = isDone ? 'Concluída' : isCurrent ? 'Atual' : 'Pendente';
    const item = document.createElement('div');
    item.className = `lesson-item ${isDone ? 'done' : ''} ${isCurrent && !isDone ? 'active' : ''}`;
    item.innerHTML = `
      <div class="lesson-item-num">${isDone ? '✓' : lesson.n}</div>
      <div class="lesson-item-info">
        <div class="lesson-item-title">${lesson.title}</div>
        <div class="lesson-item-status ${sc}">${sl}</div>
      </div>
      <div class="lesson-item-check">${isDone ? '✅' : '▶'}</div>`;
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

  document.getElementById('lesson-iframe').src = lesson.videoUrl;
  document.getElementById('lesson-title').textContent = `${lesson.n}. ${lesson.title}`;
  document.getElementById('lesson-desc').textContent  = lesson.desc;

  const btnC = document.getElementById('btn-complete');
  if (getCompleted().includes(lessonId)) {
    btnC.textContent = '✓ Aula concluída'; btnC.disabled = true; btnC.style.opacity = '0.5';
  } else {
    btnC.textContent = '✓ Marcar como concluída'; btnC.disabled = false; btnC.style.opacity = '1';
  }
  btnC.onclick = () => markComplete(moduleId, lessonId);

  const btnN = document.getElementById('btn-next');
  const idx  = mod.lessons.indexOf(lesson);
  const mi   = COURSE.indexOf(mod);
  if (idx < mod.lessons.length - 1) {
    btnN.style.display = ''; btnN.textContent = 'Próxima aula →';
    btnN.onclick = () => showLesson(moduleId, mod.lessons[idx + 1].id);
  } else if (mi < COURSE.length - 1) {
    const nm = COURSE[mi + 1];
    btnN.style.display = ''; btnN.textContent = 'Próximo módulo →';
    btnN.onclick = () => showLesson(nm.id, nm.lessons[0].id);
  } else {
    btnN.style.display = ''; btnN.textContent = '🎉 Conclusão';
    btnN.onclick = () => showToast('Você concluiu todas as aulas disponíveis. Parabéns!');
  }

  renderSidebar(mod, lessonId);
}

function renderSidebar(mod, currentLessonId) {
  const list = document.getElementById('sidebar-lessons');
  list.innerHTML = '';
  const done = getCompleted();
  mod.lessons.forEach(lesson => {
    const isDone = done.includes(lesson.id);
    const isCurr = lesson.id === currentLessonId;
    const item = document.createElement('div');
    item.className = `lesson-item ${isDone ? 'done' : ''} ${isCurr ? 'active' : ''}`;
    item.style.cursor = 'pointer';
    item.innerHTML = `
      <div class="lesson-item-num">${isDone ? '✓' : lesson.n}</div>
      <div class="lesson-item-info"><div class="lesson-item-title">${lesson.title}</div></div>`;
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
    if (SB_OK && CURRENT_EMAIL) saveProgressToSupabase(CURRENT_EMAIL, lessonId);
  }
  const btnC = document.getElementById('btn-complete');
  btnC.textContent = '✓ Aula concluída'; btnC.disabled = true; btnC.style.opacity = '0.5';
  const mod = COURSE.find(m => m.id === moduleId);
  if (mod) renderSidebar(mod, lessonId);
  showToast('Aula marcada como concluída!');
}

// =============================================
// INIT
// =============================================
function init() {
  initAuth();

  document.getElementById('btn-logout').addEventListener('click', logout);

  document.querySelectorAll('.nav-link[data-screen]').forEach(a =>
    a.addEventListener('click', e => { e.preventDefault(); showScreen(a.dataset.screen); }));

  document.querySelectorAll('.bottom-nav-item[data-screen]').forEach(a =>
    a.addEventListener('click', e => { e.preventDefault(); showScreen(a.dataset.screen); }));

  document.getElementById('btn-back-modules').addEventListener('click', () =>
    showScreen('modules'));

  document.getElementById('btn-back-module').addEventListener('click', () => {
    document.getElementById('lesson-iframe').src = '';
    if (STATE.currentModuleId) showModuleDetail(STATE.currentModuleId);
    else showScreen('modules');
  });

  document.getElementById('logo-click').addEventListener('click', handleLogoClick);
}

document.addEventListener('DOMContentLoaded', init);
