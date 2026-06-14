-- ============================================================
-- Sistema de Tarefas ISS — Schema Supabase
-- Execute no SQL Editor do Supabase
-- ============================================================

-- MEMBERS
create table if not exists tb_aps_members (
  id          text primary key,
  name        text not null,
  role        text not null,   -- 'estagiario' | 'tecnico' | 'analista_jr' | 'analista_pl' | 'analista_sr'
  regime      text not null,   -- 'estagio' | 'clt'
  active          boolean default true,
  on_vacation     boolean default false,
  vacation_start  text,   -- 'YYYY-MM-DD'
  vacation_end    text,   -- 'YYYY-MM-DD'
  updated_at      timestamptz default now()
);

-- TB_APS_TASKS (tarefas alocadas + demandas do banco)
create table if not exists tb_aps_tasks (
  id               text primary key,
  title            text not null,
  member_id        text references tb_aps_members(id) on delete cascade,
  scheduled_date   text,        -- 'YYYY-MM-DD' — null para demandas
  priority         text,        -- 'principal' | 'secundaria'
  shift            text,        -- 'manha' | 'tarde' | 'livre'
  type             text,        -- 'operacional' | 'analitica' | 'estrategia' | 'treinamento' | 'reuniao'
  event_time       text,        -- 'HH:MM' — apenas treinamento/reunião
  demand_category  text,        -- 'reprimida' | 'estudo' — apenas quando member_id IS NULL
  demand_id        text references tb_aps_tasks(id) on delete set null,  -- ref para demanda de origem
  status           text default 'pending',  -- 'pending' | 'done'
  updated_at       timestamptz default now()
);

-- Se a tabela já existir, rode manualmente:
-- ALTER TABLE tb_aps_tasks ADD COLUMN IF NOT EXISTS demand_id TEXT REFERENCES tb_aps_tasks(id) ON DELETE SET NULL;
-- ALTER TABLE tb_aps_members ADD COLUMN IF NOT EXISTS on_vacation BOOLEAN DEFAULT false;
-- ALTER TABLE tb_aps_members ADD COLUMN IF NOT EXISTS vacation_start TEXT;
-- ALTER TABLE tb_aps_members ADD COLUMN IF NOT EXISTS vacation_end TEXT;

-- TB_APS_ABSENCES
create table if not exists tb_aps_absences (
  id         text primary key,
  member_id  text references tb_aps_members(id) on delete cascade,
  date       text not null,   -- 'YYYY-MM-DD'
  shift      text not null    -- 'manha' | 'tarde' | 'dia_todo'
);

alter table tb_aps_absences enable row level security;
create policy "anon read tb_aps_absences"    on tb_aps_absences for select using (true);
create policy "admin manage tb_aps_absences" on tb_aps_absences for all    using (auth.role() = 'authenticated');

-- TB_APS_TASK_REQUESTS
create table if not exists tb_aps_task_requests (
  id            text primary key,
  task_id       text unique references tb_aps_tasks(id) on delete cascade,
  task_title    text not null,
  member_name   text not null,
  justification text not null,
  created_at    timestamptz default now()
);

alter table tb_aps_task_requests enable row level security;
create policy "anon read tb_aps_task_requests"   on tb_aps_task_requests for select using (true);
create policy "anon insert tb_aps_task_requests" on tb_aps_task_requests for insert with check (true);
create policy "admin manage tb_aps_task_requests" on tb_aps_task_requests for all using (auth.role() = 'authenticated');

-- AUTO-UPDATE updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger members_updated_at before update on tb_aps_members
  for each row execute function update_updated_at();

create trigger tasks_iss_updated_at before update on tb_aps_tasks
  for each row execute function update_updated_at();

-- TB_APS_NOTICES
create table if not exists tb_aps_notices (
  id         text primary key,
  title      text not null,
  content    text not null,
  pinned     boolean default false,
  created_at timestamptz default now()
);

alter table tb_aps_notices enable row level security;
create policy "anon read tb_aps_notices"    on tb_aps_notices for select using (true);
create policy "admin manage tb_aps_notices" on tb_aps_notices for all    using (auth.role() = 'authenticated');

-- GRANTS
grant select          on public.tb_aps_notices        to anon;
grant all             on public.tb_aps_notices        to authenticated;

grant select          on public.tb_aps_members       to anon;
grant select, update  on public.tb_aps_tasks          to anon;
grant select          on public.tb_aps_absences        to anon;
grant select, insert  on public.tb_aps_task_requests   to anon;

grant all on public.tb_aps_members       to authenticated;
grant all on public.tb_aps_tasks          to authenticated;
grant all on public.tb_aps_absences        to authenticated;
grant all on public.tb_aps_task_requests   to authenticated;

-- RLS
alter table tb_aps_members enable row level security;
alter table tb_aps_tasks enable row level security;

-- tb_aps_members: anon lê, autenticado faz tudo
create policy "anon read tb_aps_members"    on tb_aps_members for select using (true);
create policy "admin manage tb_aps_members" on tb_aps_members for all    using (auth.role() = 'authenticated');

-- tb_aps_tasks: anon lê + atualiza status, autenticado faz tudo
create policy "anon read tb_aps_tasks"      on tb_aps_tasks for select using (true);
create policy "anon update task status"     on tb_aps_tasks for update using (true);
create policy "admin manage tb_aps_tasks"   on tb_aps_tasks for all    using (auth.role() = 'authenticated');
