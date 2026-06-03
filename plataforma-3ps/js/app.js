/* =============================================
   MÉTODO 3PS — LÓGICA DA PLATAFORMA
   Autenticação e progresso via Supabase.
   Quando Supabase não está configurado, opera
   em MODO DEMO com login fake e localStorage.
   Módulos e aulas continuam em data.js.
============================================= */

// =============================================
// MODO DEMO
// Ativo quando supabase-config.js ainda tem
// os placeholders ou não está carregado.
// =============================================
const DEMO_MODE = (
  typeof SUPABASE_URL === 'undefined' ||
  SUPABASE_URL === 'COLE_AQUI_SUA_SUPABASE_URL'
);

// Chaves localStorage usadas no modo demo
const KEY_LOGGED = '3ps_loggedIn';
const KEY_NAME   = '3ps_name';
const KEY_DONE   = '3ps_completed';
const KEY_LAST   = '3ps_last';

// =============================================
// ESTADO GLOBAL EM MEMÓRIA
// No modo Supabase: carregado do banco.
// No modo demo: carregado do localStorage.
// =============================================
let CURRENT_USER      = null;
let CURRENT_PROFILE   = null;
let COMPLETED_LESSONS = [];
let LAST_LESSON       = null;

const STATE = {
  currentScreen:   'dashboard',
  currentModuleId: null,
  currentLessonId: null,
  logoClickCount:  0,
  logoClickTimer:  null
};

// =============================================
// TOAST
// =============================================
let toastTimer = null;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 3500);
}

// =============================================
// STATS (calculados em memória sobre COMPLETED_LESSONS)
// =============================================
function totalLessons() {
  return COURSE.reduce((s, m) => s + m.lessons.length, 0);
}
function completedCount() {
  return COMPLETED_LESSONS.length;
}
function overallPct() {
  const total = totalLessons();
  return total ? Math.round((completedCount() / total) * 100) : 0;
}
function modulePct(mod) {
  const c = mod.lessons.filter(l => COMPLETED_LESSONS.includes(l.id)).length;
  return mod.lessons.length ? Math.round((c / mod.lessons.length) * 100) : 0;
}

// =============================================
// TELAS / ROTEAMENTO
// =============================================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('screen-' + id);
  if (target) target.classList.add('active');
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
  saveLastLesson(moduleId, lessonId);   // ← salva no Supabase (async, não bloqueia)
  renderLesson(moduleId, lessonId);
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-lesson').classList.add('active');
  STATE.currentScreen = 'lesson';
}

// =============================================
// LOGIN
// Modo demo: qualquer e-mail + senha (≥3 chars)
// Modo Supabase: supabase.auth.signInWithPassword
// =============================================
async function initAuth() {
  if (DEMO_MODE) {
    initAuthDemo();
  } else {
    await initAuthSupabase();
  }
}

// ---- LOGIN DEMO (localStorage) ----
function initAuthDemo() {
  // Mostrar campo nome (oculto no modo Supabase)
  document.getElementById('field-name').style.display = '';

  if (localStorage.getItem(KEY_LOGGED)) {
    COMPLETED_LESSONS = JSON.parse(localStorage.getItem(KEY_DONE) || '[]');
    LAST_LESSON       = JSON.parse(localStorage.getItem(KEY_LAST) || 'null');
    CURRENT_PROFILE   = { nome: localStorage.getItem(KEY_NAME) || 'Aluno' };
    enterApp();
    return;
  }

  document.getElementById('form-login').addEventListener('submit', e => {
    e.preventDefault();
    const email = document.getElementById('input-email').value.trim();
    const name  = document.getElementById('input-name').value.trim();
    const pass  = document.getElementById('input-pass').value.trim();
    const err   = document.getElementById('login-error');

    if (email.length < 3 || name.length < 1 || pass.length < 3) {
      err.textContent = 'Preencha todos os campos (mínimo 3 caracteres).';
      err.classList.remove('hidden');
      return;
    }
    err.classList.add('hidden');
    localStorage.setItem(KEY_LOGGED, '1');
    localStorage.setItem(KEY_NAME, name);
    CURRENT_PROFILE = { nome: name };
    COMPLETED_LESSONS = [];
    LAST_LESSON = null;
    enterApp();
  });
}

// ---- LOGIN SUPABASE ----
async function initAuthSupabase() {
  // Ocultar campo nome (Supabase pega do metadata)
  document.getElementById('field-name').style.display = 'none';

  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    await loadUserData(session.user);
    enterApp();
    return;
  }

  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      await loadUserData(session.user);
      enterApp();
    }
    if (event === 'SIGNED_OUT') {
      resetMemoryState();
      document.getElementById('app-shell').classList.add('hidden');
      document.getElementById('screen-login').classList.add('active');
    }
  });

  document.getElementById('form-login').addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('input-email').value.trim();
    const pass  = document.getElementById('input-pass').value.trim();
    const err   = document.getElementById('login-error');

    if (!email || pass.length < 3) {
      err.textContent = 'Preencha e-mail e senha (mínimo 3 caracteres).';
      err.classList.remove('hidden');
      return;
    }

    const btnSubmit = e.target.querySelector('button[type="submit"]');
    btnSubmit.textContent = 'Entrando...';
    btnSubmit.disabled = true;

    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });

    btnSubmit.textContent = 'Entrar na plataforma';
    btnSubmit.disabled = false;

    if (error) {
      err.textContent = traduzirErroAuth(error.message);
      err.classList.remove('hidden');
      return;
    }
    err.classList.add('hidden');
  });
}

function traduzirErroAuth(msg) {
  if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (msg.includes('Email not confirmed'))       return 'Confirme seu e-mail antes de entrar.';
  if (msg.includes('Too many requests'))         return 'Muitas tentativas. Aguarde e tente novamente.';
  return 'Erro ao entrar. Tente novamente.';
}

// =============================================
// CARREGAR DADOS DO USUÁRIO
// Chamado após login ou ao detectar sessão ativa.
// =============================================
async function loadUserData(user) {
  CURRENT_USER = user;

  // ---- Buscar ou criar profile ----
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (profile) {
    CURRENT_PROFILE = profile;
  } else {
    // Primeiro acesso: cria o profile
    const nome = user.user_metadata?.name || user.email.split('@')[0];
    const { data: newProfile } = await supabase
      .from('profiles')
      .insert({ user_id: user.id, nome, email: user.email })
      .select()
      .single();
    CURRENT_PROFILE = newProfile;
  }

  // ---- Carregar progresso das aulas ----
  await loadProgress();

  // ---- Carregar última aula assistida ----
  await loadLastLesson();
}

// =============================================
// CARREGAR PROGRESSO
// Busca lesson_progress e popula COMPLETED_LESSONS
// =============================================
async function loadProgress() {
  const { data, error } = await supabase
    .from('lesson_progress')
    .select('lesson_id')
    .eq('user_id', CURRENT_USER.id)
    .eq('completed', true);

  if (error) { console.error('loadProgress:', error); return; }
  COMPLETED_LESSONS = (data || []).map(r => r.lesson_id);
}

// =============================================
// SALVAR PROGRESSO
// =============================================
async function saveProgress(lessonId) {
  if (DEMO_MODE) {
    localStorage.setItem(KEY_DONE, JSON.stringify(COMPLETED_LESSONS));
    return;
  }
  const { error } = await supabase
    .from('lesson_progress')
    .upsert(
      { user_id: CURRENT_USER.id, lesson_id: lessonId, completed: true, completed_at: new Date().toISOString() },
      { onConflict: 'user_id,lesson_id' }
    );
  if (error) console.error('saveProgress:', error);
}

// =============================================
// CARREGAR ÚLTIMA AULA
// Popula LAST_LESSON a partir de student_state
// =============================================
async function loadLastLesson() {
  const { data, error } = await supabase
    .from('student_state')
    .select('last_module_id, last_lesson_id')
    .eq('user_id', CURRENT_USER.id)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = "no rows"
    console.error('loadLastLesson:', error); return;
  }
  LAST_LESSON = data
    ? { moduleId: data.last_module_id, lessonId: data.last_lesson_id }
    : null;
}

// =============================================
// SALVAR ÚLTIMA AULA
// =============================================
async function saveLastLesson(moduleId, lessonId) {
  LAST_LESSON = { moduleId, lessonId };
  if (DEMO_MODE) {
    localStorage.setItem(KEY_LAST, JSON.stringify(LAST_LESSON));
    return;
  }
  const { error } = await supabase
    .from('student_state')
    .upsert(
      { user_id: CURRENT_USER.id, last_module_id: moduleId, last_lesson_id: lessonId, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
  if (error) console.error('saveLastLesson:', error);
}

// =============================================
// ENTRAR NO APP
// =============================================
function enterApp() {
  document.getElementById('screen-login').classList.remove('active');
  document.getElementById('input-email').value = '';
  document.getElementById('input-name').value  = '';
  document.getElementById('input-pass').value  = '';
  document.getElementById('app-shell').classList.remove('hidden');
  showScreen('dashboard');
}

// =============================================
// LOGOUT
// =============================================
async function logout() {
  if (DEMO_MODE) {
    localStorage.removeItem(KEY_LOGGED);
    localStorage.removeItem(KEY_NAME);
    resetMemoryState();
    document.getElementById('app-shell').classList.add('hidden');
    document.getElementById('screen-login').classList.add('active');
  } else {
    await supabase.auth.signOut();
    // onAuthStateChange cuida do resto
  }
}

function resetMemoryState() {
  CURRENT_USER      = null;
  CURRENT_PROFILE   = null;
  COMPLETED_LESSONS = [];
  LAST_LESSON       = null;
}

// =============================================
// RESET DEMO (5 cliques no logo)
// =============================================
async function handleLogoClick() {
  STATE.logoClickCount++;
  if (STATE.logoClickTimer) clearTimeout(STATE.logoClickTimer);
  STATE.logoClickTimer = setTimeout(() => { STATE.logoClickCount = 0; }, 2000);

  if (STATE.logoClickCount >= 5) {
    STATE.logoClickCount = 0;

    if (DEMO_MODE) {
      localStorage.removeItem(KEY_DONE);
      localStorage.removeItem(KEY_LAST);
    } else {
      if (!CURRENT_USER) return;
      await supabase.from('lesson_progress').delete().eq('user_id', CURRENT_USER.id);
      await supabase.from('student_state').delete().eq('user_id', CURRENT_USER.id);
    }

    COMPLETED_LESSONS = [];
    LAST_LESSON = null;
    showToast('Progresso da demo resetado.');
    if (STATE.currentScreen === 'dashboard') renderDashboard();
  }
}

// =============================================
// MARCAR AULA COMO CONCLUÍDA
// =============================================
async function markComplete(moduleId, lessonId) {
  // Atualizar memória imediatamente (resposta visual instantânea)
  if (!COMPLETED_LESSONS.includes(lessonId)) {
    COMPLETED_LESSONS.push(lessonId);
  }

  // Atualizar botão
  const btnComplete = document.getElementById('btn-complete');
  btnComplete.textContent = '✓ Aula concluída';
  btnComplete.disabled = true;
  btnComplete.style.opacity = '0.5';

  // Atualizar sidebar
  const mod = COURSE.find(m => m.id === moduleId);
  if (mod) renderSidebar(mod, lessonId);

  showToast('Aula marcada como concluída!');

  // ---- Persistir no Supabase (em background) ----
  await saveProgress(lessonId);
}

// =============================================
// RENDER — DASHBOARD
// =============================================
function renderDashboard() {
  const nome = CURRENT_PROFILE?.nome || CURRENT_USER?.email?.split('@')[0] || 'Aluno';
  document.getElementById('dash-greeting').textContent =
    `Olá, ${nome}. Continue sua evolução no Método 3Ps.`;

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

  renderContinue();

  const modGrid = document.getElementById('dash-modules');
  modGrid.innerHTML = '';
  COURSE.forEach(mod => modGrid.appendChild(buildModuleCard(mod)));
}

function renderContinue() {
  const el = document.getElementById('dash-continue');

  if (!LAST_LESSON) {
    const mod = COURSE[0], lesson = mod.lessons[0];
    el.innerHTML = continueCardHTML(mod, lesson, 'Começar do início');
    el.onclick = () => showLesson(mod.id, lesson.id);
    return;
  }

  const mod = COURSE.find(m => m.id === LAST_LESSON.moduleId);
  if (!mod) return;
  const lesson = mod.lessons.find(l => l.id === LAST_LESSON.lessonId);
  if (!lesson) return;

  if (COMPLETED_LESSONS.includes(lesson.id)) {
    const idx = mod.lessons.indexOf(lesson);
    if (idx < mod.lessons.length - 1) {
      const next = mod.lessons[idx + 1];
      el.innerHTML = continueCardHTML(mod, next, 'Próxima aula');
      el.onclick = () => showLesson(mod.id, next.id);
    } else {
      const modIdx = COURSE.indexOf(mod);
      if (modIdx < COURSE.length - 1) {
        const nextMod = COURSE[modIdx + 1], nextLesson = nextMod.lessons[0];
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

  mod.lessons.forEach(lesson => {
    const isDone    = COMPLETED_LESSONS.includes(lesson.id);
    const isCurrent = LAST_LESSON && LAST_LESSON.lessonId === lesson.id;
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
  const mod    = COURSE.find(m => m.id === moduleId);
  if (!mod) return;
  const lesson = mod.lessons.find(l => l.id === lessonId);
  if (!lesson) return;

  document.getElementById('lesson-iframe').src = lesson.videoUrl;
  document.getElementById('lesson-title').textContent = `${lesson.n}. ${lesson.title}`;
  document.getElementById('lesson-desc').textContent  = lesson.desc;

  // Botão concluída
  const btnComplete = document.getElementById('btn-complete');
  if (COMPLETED_LESSONS.includes(lessonId)) {
    btnComplete.textContent = '✓ Aula concluída';
    btnComplete.disabled    = true;
    btnComplete.style.opacity = '0.5';
  } else {
    btnComplete.textContent = '✓ Marcar como concluída';
    btnComplete.disabled    = false;
    btnComplete.style.opacity = '1';
  }
  btnComplete.onclick = () => markComplete(moduleId, lessonId);

  // Botão próxima aula
  const btnNext  = document.getElementById('btn-next');
  const idx      = mod.lessons.indexOf(lesson);
  const modIdx   = COURSE.indexOf(mod);
  if (idx < mod.lessons.length - 1) {
    btnNext.style.display = '';
    btnNext.textContent   = 'Próxima aula →';
    btnNext.onclick = () => showLesson(moduleId, mod.lessons[idx + 1].id);
  } else if (modIdx < COURSE.length - 1) {
    const nextMod = COURSE[modIdx + 1];
    btnNext.style.display = '';
    btnNext.textContent   = 'Próximo módulo →';
    btnNext.onclick = () => showLesson(nextMod.id, nextMod.lessons[0].id);
  } else {
    btnNext.style.display = '';
    btnNext.textContent   = '🎉 Conclusão';
    btnNext.onclick = () => showToast('Você concluiu todas as aulas disponíveis. Parabéns!');
  }

  renderSidebar(mod, lessonId);
}

function renderSidebar(mod, currentLessonId) {
  const list = document.getElementById('sidebar-lessons');
  list.innerHTML = '';

  mod.lessons.forEach(lesson => {
    const isDone    = COMPLETED_LESSONS.includes(lesson.id);
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
// INIT
// =============================================
function init() {
  initAuth();

  document.getElementById('btn-logout').addEventListener('click', logout);

  // Nav desktop
  document.querySelectorAll('.nav-link[data-screen]').forEach(a => {
    a.addEventListener('click', e => { e.preventDefault(); showScreen(a.dataset.screen); });
  });
  // Bottom nav mobile
  document.querySelectorAll('.bottom-nav-item[data-screen]').forEach(a => {
    a.addEventListener('click', e => { e.preventDefault(); showScreen(a.dataset.screen); });
  });

  // Voltar para módulos (tela de detalhe)
  document.getElementById('btn-back-modules').addEventListener('click', () => {
    showScreen('modules');
  });

  // Voltar para módulo (tela de aula) — re-renderiza para refletir progresso
  document.getElementById('btn-back-module').addEventListener('click', () => {
    document.getElementById('lesson-iframe').src = '';
    if (STATE.currentModuleId) showModuleDetail(STATE.currentModuleId);
    else showScreen('modules');
  });

  // Logo — reset demo (5 cliques)
  document.getElementById('logo-click').addEventListener('click', handleLogoClick);
}

document.addEventListener('DOMContentLoaded', init);
