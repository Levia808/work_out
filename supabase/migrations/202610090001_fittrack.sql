-- FitTrack initial schema. Run with Supabase CLI or SQL editor.
create extension if not exists pgcrypto;

create or replace function public.set_updated_at() returns trigger
language plpgsql security invoker set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  calorie_goal integer not null default 2200 check (calorie_goal between 800 and 10000),
  sleep_goal_minutes integer not null default 480 check (sleep_goal_minutes between 60 and 1440),
  target_weight numeric(6,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, muscle_group text not null default '', instructions text, archived_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.workout_plans (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, weekday smallint not null check (weekday between 0 and 6), sort_order integer not null default 0,
  archived_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (id, user_id)
);
create table if not exists public.plan_items (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null, exercise_id uuid not null, sort_order integer not null default 0,
  target_sets integer not null default 3 check (target_sets between 1 and 30), target_reps integer not null default 10 check (target_reps between 1 and 100),
  created_at timestamptz not null default now(),
  foreign key (plan_id, user_id) references public.workout_plans(id, user_id) on delete cascade,
  foreign key (exercise_id, user_id) references public.exercises(id, user_id) on delete restrict
);
create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid, started_at timestamptz not null default now(), ended_at timestamptz, notes text,
  created_at timestamptz not null default now(),
  foreign key (plan_id, user_id) references public.workout_plans(id, user_id) on delete set null
);
create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null, exercise_id uuid not null, set_number integer not null check (set_number > 0),
  weight_kg numeric(7,2) not null default 0 check (weight_kg >= 0), reps integer not null check (reps > 0), completed_at timestamptz,
  unique (session_id, exercise_id, set_number),
  foreign key (session_id, user_id) references public.workout_sessions(id, user_id) on delete cascade,
  foreign key (exercise_id, user_id) references public.exercises(id, user_id) on delete restrict
);
create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade,
  name text not null, serving_size_g numeric(7,2) not null default 100 check (serving_size_g > 0),
  calories_per_100g numeric(7,2) not null default 0 check (calories_per_100g >= 0), protein_per_100g numeric(7,2) not null default 0 check (protein_per_100g >= 0), carbs_per_100g numeric(7,2) not null default 0 check (carbs_per_100g >= 0), fat_per_100g numeric(7,2) not null default 0 check (fat_per_100g >= 0),
  archived_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (id, user_id)
);
create table if not exists public.meal_logs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  logged_on date not null default current_date, meal_type text not null check (meal_type in ('breakfast','lunch','dinner','snack')),
  food_id uuid, food_name text not null, quantity_g numeric(8,2) not null check (quantity_g > 0), calories numeric(8,2) not null default 0, protein_g numeric(8,2) not null default 0, carbs_g numeric(8,2) not null default 0, fat_g numeric(8,2) not null default 0,
  created_at timestamptz not null default now(), foreign key (food_id, user_id) references public.foods(id, user_id) on delete set null
);
create table if not exists public.sleep_logs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  logged_on date not null, fell_asleep_at timestamptz not null, woke_at timestamptz not null,
  duration_minutes integer generated always as (greatest(0, floor(extract(epoch from (woke_at - fell_asleep_at)) / 60)::integer)) stored,
  quality smallint check (quality between 1 and 5), notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (user_id, logged_on), check (woke_at > fell_asleep_at)
);
create table if not exists public.body_metrics (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  measured_on date not null, weight_kg numeric(6,2) check (weight_kg > 0), body_fat_percent numeric(5,2) check (body_fat_percent between 0 and 100), waist_cm numeric(6,2) check (waist_cm > 0), notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (user_id, measured_on)
);
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, icon text not null default 'Check', color text not null default 'white', frequency text not null default 'daily' check (frequency = 'daily'), archived_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null, logged_on date not null, completed boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (user_id, habit_id, logged_on), foreign key (habit_id, user_id) references public.habits(id, user_id) on delete cascade
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data ->> 'name', '')); return new; end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
create trigger exercises_updated_at before update on public.exercises for each row execute procedure public.set_updated_at();
create trigger workout_plans_updated_at before update on public.workout_plans for each row execute procedure public.set_updated_at();
create trigger sleep_logs_updated_at before update on public.sleep_logs for each row execute procedure public.set_updated_at();
create trigger body_metrics_updated_at before update on public.body_metrics for each row execute procedure public.set_updated_at();
create trigger habits_updated_at before update on public.habits for each row execute procedure public.set_updated_at();
create trigger habit_logs_updated_at before update on public.habit_logs for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.exercises enable row level security;
alter table public.workout_plans enable row level security;
alter table public.plan_items enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_sets enable row level security;
alter table public.foods enable row level security;
alter table public.meal_logs enable row level security;
alter table public.sleep_logs enable row level security;
alter table public.body_metrics enable row level security;
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;

do $$ declare t text; begin for t in select unnest(array['exercises','workout_plans','plan_items','workout_sessions','workout_sets','foods','meal_logs','sleep_logs','body_metrics','habits','habit_logs']) loop execute format('drop policy if exists "user owns %1$s" on public.%1$s', t); execute format('create policy "user owns %1$s" on public.%1$s for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t); end loop; end $$;
-- profiles uses id as the ownership key rather than user_id.
drop policy if exists "user owns profiles" on public.profiles;
create policy "user owns profiles" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on all tables in schema public from anon;
