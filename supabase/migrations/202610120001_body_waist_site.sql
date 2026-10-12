-- Preserve the waist measurement protocol so each body-fat equation receives
-- the anatomical site for which it was developed.
alter table public.body_metrics
  add column if not exists waist_measurement_site text;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'body_metrics_waist_measurement_site_check'
      and conrelid = 'public.body_metrics'::regclass
  ) then
    alter table public.body_metrics
      add constraint body_metrics_waist_measurement_site_check
      check (waist_measurement_site is null or waist_measurement_site in ('midpoint', 'narrowest'));
  end if;
end $$;
