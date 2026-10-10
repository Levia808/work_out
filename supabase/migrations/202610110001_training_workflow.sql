-- Training cadence and checklist support for FitTrack.
alter table public.workout_plans
  add column if not exists week_mode text not null default 'every';
alter table public.workout_plans
  drop constraint if exists workout_plans_week_mode_check;
alter table public.workout_plans
  add constraint workout_plans_week_mode_check check (week_mode in ('every', 'odd', 'even'));

alter table public.plan_items
  add column if not exists target_weight_kg numeric(7,2);
alter table public.plan_items
  add constraint plan_items_target_weight_check check (target_weight_kg is null or target_weight_kg >= 0);

create table if not exists public.workout_todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_item_id uuid not null,
  label text not null check (length(trim(label)) > 0),
  completed boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (plan_item_id, user_id) references public.plan_items(id, user_id) on delete cascade
);

create index if not exists workout_todos_plan_item_idx on public.workout_todos (plan_item_id, sort_order);

create trigger workout_todos_updated_at
before update on public.workout_todos
for each row execute procedure public.set_updated_at();

alter table public.workout_todos enable row level security;
drop policy if exists "user owns workout_todos" on public.workout_todos;
create policy "user owns workout_todos" on public.workout_todos
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.workout_todos to authenticated;
