-- Hito 7 · Métricas de la beta (docs/03-plan-de-desarrollo-y-monetizacion.md, "Métricas").
--
-- Métrica principal: usuarios con al menos una interacción social significativa por semana
-- (se unió a un grupo, se sumó a un plan, escribió en un chat o creó un plan/grupo).
-- Se calcula desde la base, sin depender de PostHog. Solo para el dashboard (editor SQL).
-- Las semanas van de lunes a domingo en hora de Argentina.

create view public.metrics_weekly as
with weeks as (
  select generate_series(
    date_trunc('week', (select min(created_at) from public.profiles) at time zone 'America/Argentina/Buenos_Aires'),
    date_trunc('week', now() at time zone 'America/Argentina/Buenos_Aires'),
    interval '1 week'
  ) as week
),
interactions as (
  select user_id, date_trunc('week', joined_at at time zone 'America/Argentina/Buenos_Aires') as week from public.group_members where status = 'active' and role = 'member' and joined_at is not null
  union all
  select user_id, date_trunc('week', joined_at at time zone 'America/Argentina/Buenos_Aires') from public.plan_participants pp
    join public.plans p on p.id = pp.plan_id where pp.user_id <> p.creator_id
  union all
  select sender_id, date_trunc('week', created_at at time zone 'America/Argentina/Buenos_Aires') from public.messages where kind = 'text' and sender_id is not null
  union all
  select creator_id, date_trunc('week', created_at at time zone 'America/Argentina/Buenos_Aires') from public.plans
  union all
  select owner_id, date_trunc('week', created_at at time zone 'America/Argentina/Buenos_Aires') from public.groups
)
select
  to_char(w.week, 'YYYY-MM-DD') as semana,
  (select count(distinct i.user_id) from interactions i where i.week = w.week) as usuarios_con_interaccion,
  (select count(*) from public.profiles where onboarding_completed_at at time zone 'America/Argentina/Buenos_Aires' < w.week + interval '1 week') as usuarios_registrados,
  (select count(*) from public.profiles where date_trunc('week', onboarding_completed_at at time zone 'America/Argentina/Buenos_Aires') = w.week) as registros_nuevos,
  (select count(*) from public.groups where date_trunc('week', created_at at time zone 'America/Argentina/Buenos_Aires') = w.week) as grupos_creados,
  (select count(*) from public.plans where date_trunc('week', created_at at time zone 'America/Argentina/Buenos_Aires') = w.week) as planes_creados,
  (select count(*) from public.plan_participants pp join public.plans p on p.id = pp.plan_id
    where pp.user_id <> p.creator_id and date_trunc('week', pp.joined_at at time zone 'America/Argentina/Buenos_Aires') = w.week) as sumados_a_planes,
  (select count(*) from public.messages where kind = 'text' and date_trunc('week', created_at at time zone 'America/Argentina/Buenos_Aires') = w.week) as mensajes,
  -- Usuarios que volvieron: interactuaron esta semana y también alguna semana anterior.
  (select count(distinct i.user_id) from interactions i
    where i.week = w.week and exists (select 1 from interactions j where j.user_id = i.user_id and j.week < w.week)) as usuarios_que_volvieron,
  -- Grupos con actividad: mensajes o planes nuevos en la semana.
  (select count(distinct g) from (
    select group_id as g from public.messages where group_id is not null and date_trunc('week', created_at at time zone 'America/Argentina/Buenos_Aires') = w.week
    union select group_id from public.plans where group_id is not null and date_trunc('week', created_at at time zone 'America/Argentina/Buenos_Aires') = w.week
  ) x) as grupos_con_actividad
from weeks w
order by w.week desc;

revoke all on public.metrics_weekly from anon, authenticated;
