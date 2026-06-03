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

// ---- PROGRESSO (localStorage) ----
const KEY_DONE = '3ps_completed';
const KEY_LAST = '3ps_last';

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
// LOGIN COM SUPABASE AUTH
// =============================================
async function loginWithSupabase(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email:    email,
    password: password
  });

  if (error) {
    const err = document.getElementById('login-error');
    err.textContent = traduzirErro(error.message);
    err.classList.remove('hidden');
    const btn = document.querySelector('#form-login button[type="submit"]');
    btn.textContent = 'Entrar na plataforma';
    btn.disabled = false;
    return;
  }

  // Salvar nome no localStorage para saudação (usa parte do e-mail como fallback)
  const nome = data.user.user_metadata?.name || email.split('@')[0];
  localStorage.setItem('3ps_name', nome);

  enterApp();
}

function traduzirErro(msg) {
  if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (msg.includes('Email not confirmed'))       return 'Confirme seu e-mail antes de entrar.';
  if (msg.includes('Too many requests'))         return 'Muitas tentativas. Aguarde um momento.';
  return 'Erro ao entrar. Tente novamente.';
}

// =============================================
// VERIFICAR SESSÃO AO CARREGAR A PÁGINA
// =============================================
async function initAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (session) {
    // Sessão ativa — entra direto no app
    const nome = session.user.user_metadata?.name || session.user.email.split('@')[0];
    localStorage.setItem('3ps_name', nome);
    enterApp();
    return;
  }

  // Sem sessão — ouvir mudanças de auth (ex: login em outra aba)
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      const nome = session.user.user_metadata?.name || session.user.email.split('@')[0];
      localStorage.setItem('3ps_name', nome);
      enterApp();
    }
    if (event === 'SIGNED_OUT') {
      document.getElementById('app-shell').classList.add('hidden');
      document.getElementById('screen-login').classList.add('active');
    }
  });

  // Ouvir submissão do formulário de login
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

    await loginWithSupabase(email, pass);
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
// LOGOUT COM SUPABASE AUTH
// =============================================
async function logout() {
  await supabaseClient.auth.signOut();
  // onAuthStateChange cuida de esconder o app e mostrar o login
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
