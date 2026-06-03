-- =============================================
-- MÉTODO 3PS — SETUP DO BANCO SUPABASE
-- Cole este SQL inteiro no Supabase SQL Editor
-- e clique em "Run".
-- =============================================


-- =============================================
-- 1. TABELA: profiles
-- Guarda nome e e-mail do aluno após login.
-- =============================================
create table if not exists profiles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  nome       text,
  email      text,
  status     text default 'active',
  created_at timestamp with time zone default now()
);

-- Índice para busca por user_id
create unique index if not exists profiles_user_id_idx on profiles(user_id);

-- Ativar RLS
alter table profiles enable row level security;

-- Policies
create policy "Aluno vê apenas seu profile"
  on profiles for select
  using (auth.uid() = user_id);

create policy "Aluno insere apenas seu profile"
  on profiles for insert
  with check (auth.uid() = user_id);

create policy "Aluno atualiza apenas seu profile"
  on profiles for update
  using (auth.uid() = user_id);


-- =============================================
-- 2. TABELA: lesson_progress
-- Registra quais aulas cada aluno concluiu.
-- =============================================
create table if not exists lesson_progress (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  lesson_id    text not null,
  completed    boolean default true,
  completed_at timestamp with time zone default now(),
  unique(user_id, lesson_id)
);

-- Índice para busca por user_id
create index if not exists lesson_progress_user_id_idx on lesson_progress(user_id);

-- Ativar RLS
alter table lesson_progress enable row level security;

-- Policies
create policy "Aluno vê apenas seu progresso"
  on lesson_progress for select
  using (auth.uid() = user_id);

create policy "Aluno insere apenas seu progresso"
  on lesson_progress for insert
  with check (auth.uid() = user_id);

create policy "Aluno atualiza apenas seu progresso"
  on lesson_progress for update
  using (auth.uid() = user_id);

create policy "Aluno deleta apenas seu progresso"
  on lesson_progress for delete
  using (auth.uid() = user_id);


-- =============================================
-- 3. TABELA: student_state
-- Guarda a última aula acessada por aluno.
-- =============================================
create table if not exists student_state (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade not null unique,
  last_module_id  text,
  last_lesson_id  text,
  updated_at      timestamp with time zone default now()
);

-- Ativar RLS
alter table student_state enable row level security;

-- Policies
create policy "Aluno vê apenas seu estado"
  on student_state for select
  using (auth.uid() = user_id);

create policy "Aluno insere apenas seu estado"
  on student_state for insert
  with check (auth.uid() = user_id);

create policy "Aluno atualiza apenas seu estado"
  on student_state for update
  using (auth.uid() = user_id);

create policy "Aluno deleta apenas seu estado"
  on student_state for delete
  using (auth.uid() = user_id);
