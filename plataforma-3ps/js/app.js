/* =============================================
   MÉTODO 3PS — LÓGICA DA PLATAFORMA
   Dois modos: DEMO (localStorage) e SUPABASE.
   Módulos e aulas em data.js.
============================================= */

// DEMO_MODE = true quando supabase-config.js
// não encontrou credenciais válidas.
const DEMO_MODE = (supabase === null);

// localStorage keys (modo demo)
const KEY_LOGGED = '3ps_loggedIn';
const KEY_NAME   = '3ps_name';
const KEY_DONE   = '3ps_completed';
const KEY_LAST   = '3ps_last';

// Estado global em memória
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

// SQL para exibir na tela de configuração
const SETUP_SQL = `-- 1. Tabela de perfis
create table if not exists profiles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  nome       text,
  email      text,
  status     text default 'active',
  created_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "own profile" on profiles
  for all using (auth.uid() = user_id);

-- 2. Progresso das aulas
create table if not exists lesson_progress (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade,
  lesson_id    text not null,
  completed    boolean default true,
  completed_at timestamptz default now(),
  unique(user_id, lesson_id)
);
alter table lesson_progress enable row level security;
create policy "own progress" on lesson_progress
  for all using (auth.uid() = user_id);

-- 3. Última aula assistida
create table if not exists student_state (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade unique,
  last_module_id text,
  last_lesson_id text,
  updated_at     timestamptz default now()
);
alter table student_state enable row level security;
create policy "own state" on student_state
  for all using (auth.uid() = user_id);`;

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
// STATS
// =============================================
function totalLessons()  { return COURSE.reduce((s, m) => s + m.lessons.length, 0); }
function completedCount(){ return COMPLETED_LESSONS.length; }
function overallPct() {
  const t = totalLessons();
  return t ? Math.round((completedCount() / t) * 100) : 0;
}
function modulePct(mod) {
  const c = mod.lessons.filter(l => COMPLETED_LESSONS.includes(l.id)).length;
  return mod.lessons.length ? Math.round((c / mod.lessons.length) * 100) : 0;
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
  if (id === 'config')    renderConfigScreen();
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
  saveLastLesson(moduleId, lessonId);
  renderLesson(moduleId, lessonId);
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-lesson').classList.add('active');
  STATE.currentScreen = 'lesson';
}

// =============================================
// LOGIN — MODO DEMO
// Nome + qualquer e-mail + qualquer senha (≥3)
// =============================================
function initLoginDemo() {
  // Sessão demo já ativa?
  if (localStorage.getItem(KEY_LOGGED)) {
    COMPLETED_LESSONS = JSON.parse(localStorage.getItem(KEY_DONE) || '[]');
    LAST_LESSON       = JSON.parse(localStorage.getItem(KEY_LAST) || 'null');
    CURRENT_PROFILE   = { nome: localStorage.getItem(KEY_NAME) || 'Aluno' };
    enterApp();
    return;
  }

  document.getElementById('form-demo').addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('demo-name').value.trim();
    const err  = document.getElementById('demo-error');
    if (name.length < 1) { err.classList.remove('hidden'); return; }
    err.classList.add('hidden');
    localStorage.setItem(KEY_LOGGED, '1');
    localStorage.setItem(KEY_NAME, name);
    CURRENT_PROFILE   = { nome: name };
    COMPLETED_LESSONS = [];
    LAST_LESSON       = null;
    enterApp();
  });
}

// =============================================
// LOGIN — MODO SUPABASE
// =============================================
async function initLoginSupabase() {
  // Ocultar bloco demo, mostrar bloco supabase
  document.getElementById('login-demo-block').style.display    = 'none';
  document.getElementById('login-supabase-block').style.display = '';

  const { data: { session } } = await supabase.auth.getSession();
  if (session) { await loadUserData(session.user); enterApp(); return; }

  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) { await loadUserData(session.user); enterApp(); }
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
      err.textContent = 'Preencha e-mail e senha.';
      err.classList.remove('hidden'); return;
    }
    const btn = e.target.querySelector('button[type="submit"]');
    btn.textContent = 'Entrando...'; btn.disabled = true;
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    btn.textContent = 'Entrar na plataforma'; btn.disabled = false;
    if (error) {
      err.textContent = traduzirErro(error.message);
      err.classList.remove('hidden'); return;
    }
    err.classList.add('hidden');
  });
}

function traduzirErro(msg) {
  if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (msg.includes('Email not confirmed'))       return 'Confirme seu e-mail antes de entrar.';
  if (msg.includes('Too many requests'))         return 'Muitas tentativas. Aguarde um momento.';
  return 'Erro ao entrar. Tente novamente.';
}

// =============================================
// CARREGAR DADOS DO USUÁRIO (Supabase)
// =============================================
async function loadUserData(user) {
  CURRENT_USER = user;
  const { data: profile } = await supabase
    .from('profiles').select('*').eq('user_id', user.id).single();
  if (profile) {
    CURRENT_PROFILE = profile;
  } else {
    const nome = user.user_metadata?.name || user.email.split('@')[0];
    const { data: np } = await supabase
      .from('profiles')
      .insert({ user_id: user.id, nome, email: user.email })
      .select().single();
    CURRENT_PROFILE = np;
  }
  await loadProgress();
  await loadLastLesson();
}

async function loadProgress() {
  const { data } = await supabase
    .from('lesson_progress').select('lesson_id')
    .eq('user_id', CURRENT_USER.id).eq('completed', true);
  COMPLETED_LESSONS = (data || []).map(r => r.lesson_id);
}

async function loadLastLesson() {
  const { data } = await supabase
    .from('student_state').select('last_module_id,last_lesson_id')
    .eq('user_id', CURRENT_USER.id).single();
  LAST_LESSON = data
    ? { moduleId: data.last_module_id, lessonId: data.last_lesson_id }
    : null;
}

// =============================================
// SALVAR PROGRESSO
// =============================================
async function saveProgress(lessonId) {
  if (DEMO_MODE) {
    localStorage.setItem(KEY_DONE, JSON.stringify(COMPLETED_LESSONS)); return;
  }
  await supabase.from('lesson_progress').upsert(
    { user_id: CURRENT_USER.id, lesson_id: lessonId, completed: true,
      completed_at: new Date().toISOString() },
    { onConflict: 'user_id,lesson_id' }
  );
}

// =============================================
// SALVAR ÚLTIMA AULA
// =============================================
async function saveLastLesson(moduleId, lessonId) {
  LAST_LESSON = { moduleId, lessonId };
  if (DEMO_MODE) {
    localStorage.setItem(KEY_LAST, JSON.stringify(LAST_LESSON)); return;
  }
  await supabase.from('student_state').upsert(
    { user_id: CURRENT_USER.id, last_module_id: moduleId, last_lesson_id: lessonId,
      updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  );
}

// =============================================
// ENTRAR / SAIR
// =============================================
function enterApp() {
  document.getElementById('screen-login').classList.remove('active');
  document.getElementById('app-shell').classList.remove('hidden');
  showScreen('dashboard');
}

async function logout() {
  if (DEMO_MODE) {
    localStorage.removeItem(KEY_LOGGED);
    localStorage.removeItem(KEY_NAME);
    resetMemoryState();
    document.getElementById('app-shell').classList.add('hidden');
    document.getElementById('screen-login').classList.add('active');
  } else {
    await supabase.auth.signOut();
  }
}

function resetMemoryState() {
  CURRENT_USER = CURRENT_PROFILE = LAST_LESSON = null;
  COMPLETED_LESSONS = [];
}

// =============================================
// RESET DEMO — 5 cliques no logo
// =============================================
async function handleLogoClick() {
  STATE.logoClickCount++;
  if (STATE.logoClickTimer) clearTimeout(STATE.logoClickTimer);
  STATE.logoClickTimer = setTimeout(() => { STATE.logoClickCount = 0; }, 2000);
  if (STATE.logoClickCount < 5) return;
  STATE.logoClickCount = 0;
  if (DEMO_MODE) {
    localStorage.removeItem(KEY_DONE);
    localStorage.removeItem(KEY_LAST);
  } else if (CURRENT_USER) {
    await supabase.from('lesson_progress').delete().eq('user_id', CURRENT_USER.id);
    await supabase.from('student_state').delete().eq('user_id', CURRENT_USER.id);
  }
  COMPLETED_LESSONS = []; LAST_LESSON = null;
  showToast('Progresso resetado.');
  if (STATE.currentScreen === 'dashboard') renderDashboard();
}

// =============================================
// TELA DE CONFIGURAÇÕES (dentro do app)
// =============================================
function renderConfigScreen() {
  // Status atual
  const statusEl = document.getElementById('config-status');
  if (DEMO_MODE) {
    statusEl.className = 'config-status-card demo';
    statusEl.innerHTML = '⚠️ Modo demo ativo — progresso salvo apenas neste navegador.';
  } else {
    statusEl.className = 'config-status-card connected';
    statusEl.innerHTML = '✅ Conectado ao Supabase — progresso salvo no banco de dados.';
  }

  // Preencher campos com valores atuais
  const savedUrl = localStorage.getItem('3ps_sb_url') || '';
  const savedKey = localStorage.getItem('3ps_sb_key') || '';
  document.getElementById('config-url').value = savedUrl;
  document.getElementById('config-key').value = savedKey;

  // SQL
  document.getElementById('sql-instructions').textContent = SETUP_SQL;
}

function copiarSQL() {
  navigator.clipboard.writeText(SETUP_SQL)
    .then(() => showToast('SQL copiado para a área de transferência!'))
    .catch(() => showToast('Não foi possível copiar. Selecione manualmente.'));
}

function initConfigForm() {
  document.getElementById('form-config').addEventListener('submit', e => {
    e.preventDefault();
    const url = document.getElementById('config-url').value.trim();
    const key = document.getElementById('config-key').value.trim();
    const err = document.getElementById('config-error');

    if (!url.startsWith('https://') || key.length < 20) {
      err.textContent = 'URL deve começar com https:// e a key precisa ter mais de 20 caracteres.';
      err.classList.remove('hidden'); return;
    }
    err.classList.add('hidden');
    localStorage.setItem('3ps_sb_url', url);
    localStorage.setItem('3ps_sb_key', key);
    showToast('Credenciais salvas! Recarregando...');
    setTimeout(() => location.reload(), 1400);
  });

  document.getElementById('btn-clear-supabase').addEventListener('click', () => {
    localStorage.removeItem('3ps_sb_url');
    localStorage.removeItem('3ps_sb_key');
    showToast('Credenciais removidas. Recarregando...');
    setTimeout(() => location.reload(), 1400);
  });
}

// =============================================
// RENDERS
// =============================================
function renderDashboard() {
  const nome = CURRENT_PROFILE?.nome || CURRENT_USER?.email?.split('@')[0] || 'Aluno';
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
  const el = document.getElementById('dash-continue');
  if (!LAST_LESSON) {
    const mod = COURSE[0], lesson = mod.lessons[0];
    el.innerHTML = continueCardHTML(mod, lesson, 'Começar do início');
    el.onclick = () => showLesson(mod.id, lesson.id); return;
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
  mod.lessons.forEach(lesson => {
    const isDone    = COMPLETED_LESSONS.includes(lesson.id);
    const isCurrent = LAST_LESSON && LAST_LESSON.lessonId === lesson.id;
    const sl = isDone ? 'done' : isCurrent ? 'current' : 'pending';
    const item = document.createElement('div');
    item.className = `lesson-item ${isDone ? 'done' : ''} ${isCurrent && !isDone ? 'active' : ''}`;
    item.innerHTML = `
      <div class="lesson-item-num">${isDone ? '✓' : lesson.n}</div>
      <div class="lesson-item-info">
        <div class="lesson-item-title">${lesson.title}</div>
        <div class="lesson-item-status ${sl}">${isDone ? 'Concluída' : isCurrent ? 'Atual' : 'Pendente'}</div>
      </div>
      <div class="lesson-item-check">${isDone ? '✅' : '▶'}</div>`;
    item.addEventListener('click', () => showLesson(moduleId, lesson.id));
    list.appendChild(item);
  });
}

function renderLesson(moduleId, lessonId) {
  const mod = COURSE.find(m => m.id === moduleId);
  if (!mod) return;
  const lesson = mod.lessons.find(l => l.id === lessonId);
  if (!lesson) return;
  document.getElementById('lesson-iframe').src = lesson.videoUrl;
  document.getElementById('lesson-title').textContent = `${lesson.n}. ${lesson.title}`;
  document.getElementById('lesson-desc').textContent  = lesson.desc;
  const btnC = document.getElementById('btn-complete');
  if (COMPLETED_LESSONS.includes(lessonId)) {
    btnC.textContent = '✓ Aula concluída'; btnC.disabled = true; btnC.style.opacity = '0.5';
  } else {
    btnC.textContent = '✓ Marcar como concluída'; btnC.disabled = false; btnC.style.opacity = '1';
  }
  btnC.onclick = () => markComplete(moduleId, lessonId);
  const btnN = document.getElementById('btn-next');
  const idx = mod.lessons.indexOf(lesson), mi = COURSE.indexOf(mod);
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
  mod.lessons.forEach(lesson => {
    const isDone = COMPLETED_LESSONS.includes(lesson.id);
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

async function markComplete(moduleId, lessonId) {
  if (!COMPLETED_LESSONS.includes(lessonId)) COMPLETED_LESSONS.push(lessonId);
  const btnC = document.getElementById('btn-complete');
  btnC.textContent = '✓ Aula concluída'; btnC.disabled = true; btnC.style.opacity = '0.5';
  const mod = COURSE.find(m => m.id === moduleId);
  if (mod) renderSidebar(mod, lessonId);
  showToast('Aula marcada como concluída!');
  await saveProgress(lessonId);
}

// =============================================
// INIT
// =============================================
function init() {
  // Alternar entre demo e Supabase na tela de login
  document.getElementById('btn-show-supabase').addEventListener('click', () => {
    document.getElementById('login-demo-block').style.display    = 'none';
    document.getElementById('login-supabase-block').style.display = '';
  });
  document.getElementById('btn-show-demo').addEventListener('click', () => {
    document.getElementById('login-supabase-block').style.display = 'none';
    document.getElementById('login-demo-block').style.display    = '';
  });

  // Iniciar autenticação conforme o modo
  if (DEMO_MODE) {
    initLoginDemo();
  } else {
    initLoginSupabase();
  }

  // Formulário de configuração (dentro do app)
  initConfigForm();

  document.getElementById('btn-logout').addEventListener('click', logout);

  document.querySelectorAll('.nav-link[data-screen]').forEach(a =>
    a.addEventListener('click', e => { e.preventDefault(); showScreen(a.dataset.screen); }));

  document.querySelectorAll('.bottom-nav-item[data-screen]').forEach(a =>
    a.addEventListener('click', e => { e.preventDefault(); showScreen(a.dataset.screen); }));

  document.getElementById('btn-back-modules').addEventListener('click', () => showScreen('modules'));

  document.getElementById('btn-back-module').addEventListener('click', () => {
    document.getElementById('lesson-iframe').src = '';
    if (STATE.currentModuleId) showModuleDetail(STATE.currentModuleId);
    else showScreen('modules');
  });

  document.getElementById('logo-click').addEventListener('click', handleLogoClick);
}

document.addEventListener('DOMContentLoaded', init);
