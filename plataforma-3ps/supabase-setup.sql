-- Tabela de progresso por aula
create table if not exists student_progress (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  lesson_id    text not null,
  completed    boolean default true,
  completed_at timestamptz default now(),
  unique(email, lesson_id)
);

-- Tabela de estado (última aula assistida)
create table if not exists student_state (
  id             uuid primary key default gen_random_uuid(),
  email          text not null unique,
  last_module_id text,
  last_lesson_id text,
  updated_at     timestamptz default now()
);

-- Permitir leitura e escrita sem autenticação (RLS desativado)
alter table student_progress disable row level security;
alter table student_state    disable row level security;
