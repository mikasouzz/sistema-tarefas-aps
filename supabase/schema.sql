-- ============================================================
-- Sistema de Tarefas ISS — Schema Supabase
-- Execute no SQL Editor do Supabase
-- ============================================================

-- MEMBERS
create table if not exists members (
  id          text primary key,
  name        text not null,
  role        text not null,   -- 'estagiario' | 'tecnico' | 'analista_jr' | 'analista_pl' | 'analista_sr'
  regime      text not null,   -- 'estagio' | 'clt'
  active      boolean default true,
  updated_at  timestamptz default now()
);

-- TASKS_ISS (tarefas alocadas + demandas do banco)
create table if not exists tasks_iss (
  id               text primary key,
  title            text not null,
  member_id        text references members(id) on delete cascade,
  scheduled_date   text,        -- 'YYYY-MM-DD' — null para demandas
  priority         text,        -- 'principal' | 'secundaria'
  shift            text,        -- 'manha' | 'tarde' | 'livre'
  type             text,        -- 'operacional' | 'analitica' | 'estrategia' | 'treinamento' | 'reuniao'
  event_time       text,        -- 'HH:MM' — apenas treinamento/reunião
  demand_category  text,        -- 'reprimida' | 'estudo' — apenas quando member_id IS NULL
  demand_id        text references tasks_iss(id) on delete set null,  -- ref para demanda de origem
  status           text default 'pending',  -- 'pending' | 'done'
  updated_at       timestamptz default now()
);

-- Se a tabela já existir, rode manualmente:
-- ALTER TABLE tasks_iss ADD COLUMN IF NOT EXISTS demand_id TEXT REFERENCES tasks_iss(id) ON DELETE SET NULL;

-- AUTO-UPDATE updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger members_updated_at before update on members
  for each row execute function update_updated_at();

create trigger tasks_iss_updated_at before update on tasks_iss
  for each row execute function update_updated_at();

-- RLS
alter table members enable row level security;
alter table tasks_iss enable row level security;

-- members: anon lê, autenticado faz tudo
create policy "anon read members"         on members for select using (true);
create policy "admin manage members"      on members for all    using (auth.role() = 'authenticated');

-- tasks_iss: anon lê + atualiza status, autenticado faz tudo
create policy "anon read tasks_iss"           on tasks_iss for select using (true);
create policy "anon update task status"   on tasks_iss for update using (true);
create policy "admin manage tasks_iss"        on tasks_iss for all    using (auth.role() = 'authenticated');
