-- Hito 6 · Reportes, bloqueos y moderación (docs/specs/06-reportes-y-bloqueos.md).
--
-- Los efectos de un bloqueo ya los aplican las funciones de las specs 01 a 05 (is_blocked).
-- Acá: bloquear/desbloquear, reportes, ocultamiento automático, alertas por Telegram,
-- acciones de moderación y suspensiones.

-- ── Bloquear ────────────────────────────────────────────────────────────────

create function public.block_user(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_active_user() then
    raise exception 'Tenés que completar tu perfil' using errcode = '42501';
  end if;
  if p_user = auth.uid() then
    raise exception 'No podés bloquearte' using errcode = 'P0001';
  end if;
  insert into public.blocks (blocker_id, blocked_id) values (auth.uid(), p_user) on conflict do nothing;
end;
$$;

create function public.unblock_user(p_user uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.blocks where blocker_id = auth.uid() and blocked_id = p_user;
$$;

create function public.list_my_blocks()
returns table (user_id uuid, name text, avatar_url text, blocked_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.name, p.avatar_url, b.created_at
  from public.blocks b
  join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = auth.uid()
  order by b.created_at desc;
$$;

-- Al bloquear siendo creador: grupos y planes míos donde está esa persona (AC-05).
create function public.my_spaces_with(p_user uuid)
returns table (kind text, id uuid, name text)
language sql
stable
security definer
set search_path = ''
as $$
  select 'group', g.id, g.name
  from public.groups g
  join public.group_members m on m.group_id = g.id
  where g.owner_id = auth.uid() and g.deleted_at is null and m.user_id = p_user and m.status = 'active'
  union all
  select 'plan', p.id, p.title
  from public.plans p
  where p.creator_id = auth.uid() and p.cancelled_at is null and p.starts_at > now()
    and public.is_plan_participant(p.id, p_user);
$$;

-- ── Reportes ────────────────────────────────────────────────────────────────

create type public.report_target as enum ('user', 'group', 'plan', 'message');
create type public.report_reason as enum ('danger', 'harassment', 'underage', 'sexual_violent', 'impersonation', 'spam', 'other');
create type public.report_priority as enum ('urgent', 'high', 'normal');
create type public.report_status as enum ('open', 'dismissed', 'actioned');

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles (id) on delete set null,
  target_type public.report_target not null,
  target_id uuid not null,
  reason public.report_reason not null,
  priority public.report_priority not null,
  details text check (char_length(details) <= 500),
  snapshot jsonb not null,           -- copia del contenido al momento del reporte (AC-12)
  status public.report_status not null default 'open',
  resolved_at timestamptz,
  resolution text,
  resolution_note text,
  created_at timestamptz not null default now()
);

create index reports_open_idx on public.reports (priority, created_at) where status = 'open';
create index reports_target_idx on public.reports (target_type, target_id);
create index reports_reporter_idx on public.reports (reporter_id, created_at desc);

create table public.admins (
  user_id uuid primary key references public.profiles (id) on delete cascade
);

-- Emails que no pueden volver a registrarse (suspensión permanente, AC-24). Se guarda el hash.
create table public.banned_emails (
  email_hash text primary key,
  created_at timestamptz not null default now()
);

create table public.user_warnings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now(),
  seen_at timestamptz
);

-- Alertas al moderador (Telegram). Las manda la misma Edge Function de las notificaciones.
create table public.moderation_alerts (
  id bigint generated always as identity primary key,
  report_id uuid references public.reports (id) on delete cascade,
  text text not null,
  attempts int not null default 0,
  claimed_at timestamptz,
  sent_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create function public.report_priority_for(p_reason public.report_reason)
returns public.report_priority
language sql
immutable
set search_path = ''
as $$
  select case
    when p_reason = 'danger' then 'urgent'
    when p_reason in ('harassment', 'underage', 'sexual_violent') then 'high'
    else 'normal'
  end::public.report_priority;
$$;

create function public.report_reason_label(p_reason public.report_reason)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_reason
    when 'danger' then 'Me siento en peligro'
    when 'harassment' then 'Acoso o amenazas'
    when 'underage' then 'Parece menor de 18'
    when 'sexual_violent' then 'Contenido sexual o violento'
    when 'impersonation' then 'Se hace pasar por otra persona'
    when 'spam' then 'Spam o publicidad'
    else 'Otro'
  end;
$$;

-- Copia de lo reportado, si quien reporta lo puede ver. null = no existe o no es visible.
create function public.report_snapshot(p_type public.report_target, p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case p_type
    when 'user' then (
      select jsonb_build_object('name', p.name, 'bio', p.bio, 'avatar_url', p.avatar_url,
                                'email', (select email from auth.users where id = p.id))
      from public.profiles p
      where p.id = p_id and p.id <> auth.uid() and public.get_profile(p.id) is not null)
    when 'group' then (
      select jsonb_build_object('name', g.name, 'description', g.description, 'owner_id', g.owner_id, 'image_url', g.image_url)
      from public.groups g where g.id = p_id and public.can_see_group(g.id))
    when 'plan' then (
      select jsonb_build_object('title', p.title, 'description', p.description, 'place_name', p.place_name,
                                'creator_id', p.creator_id, 'starts_at', p.starts_at)
      from public.plans p where p.id = p_id and public.can_see_plan(p.id))
    when 'message' then (
      select jsonb_build_object('body', m.body, 'sender_id', m.sender_id, 'group_id', m.group_id, 'plan_id', m.plan_id,
                                'created_at', m.created_at)
      from public.messages m
      where m.id = p_id and m.kind = 'text' and m.deleted_by is null and public.can_see_message(m))
  end;
$$;

-- AC-08 a AC-16
create function public.create_report(
  p_target_type public.report_target,
  p_target_id uuid,
  p_reason public.report_reason,
  p_details text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_snapshot jsonb;
  v_report public.reports;
  v_reporters int;
begin
  if not public.is_active_user() then
    raise exception 'Tenés que completar tu perfil' using errcode = '42501';
  end if;

  -- AC-09
  if p_reason = 'other' and coalesce(char_length(btrim(p_details)), 0) = 0 then
    raise exception 'Contanos qué pasó' using errcode = 'P0001';
  end if;

  v_snapshot := public.report_snapshot(p_target_type, p_target_id);
  if v_snapshot is null then
    raise exception 'No se encontró lo que querés reportar' using errcode = 'P0001';
  end if;

  -- AC-13: mientras haya un reporte abierto de la misma persona sobre lo mismo, no se duplica.
  if exists (select 1 from public.reports
             where reporter_id = v_me and target_type = p_target_type and target_id = p_target_id and status = 'open') then
    return;
  end if;

  -- AC-14: hasta 10 por día.
  if (select count(*) from public.reports where reporter_id = v_me and created_at > now() - interval '1 day') >= 10 then
    raise exception 'Ya enviaste 10 reportes hoy. Si es urgente, llamá al 911.' using errcode = 'P0001';
  end if;

  insert into public.reports (reporter_id, target_type, target_id, reason, priority, details, snapshot)
  values (v_me, p_target_type, p_target_id, p_reason, public.report_priority_for(p_reason),
          nullif(btrim(p_details), ''), v_snapshot)
  returning * into v_report;

  -- Ocultamiento automático con reportes de 3 personas distintas (AC-16, AC-17).
  if p_target_type in ('message', 'group', 'plan') then
    select count(distinct reporter_id) into v_reporters
    from public.reports
    where target_type = p_target_type and target_id = p_target_id and status = 'open';

    if v_reporters >= 3 then
      case p_target_type
        when 'message' then update public.messages set hidden_at = coalesce(hidden_at, now()) where id = p_target_id;
        when 'group' then update public.groups set hidden_at = coalesce(hidden_at, now()) where id = p_target_id;
        when 'plan' then update public.plans set hidden_at = coalesce(hidden_at, now()) where id = p_target_id;
        else null;
      end case;
    end if;
  end if;

  -- AC-19: alerta al moderador.
  insert into public.moderation_alerts (report_id, text)
  values (v_report.id,
    case when v_report.priority = 'urgent' then '🚨 URGENTE · ' when v_report.priority = 'high' then '⚠️ ' else '' end
    || public.report_reason_label(p_reason)
    || E'\nReportado: ' || p_target_type::text || ' · '
    || coalesce(v_snapshot ->> 'name', v_snapshot ->> 'title', left(v_snapshot ->> 'body', 200), '')
    || coalesce(E'\nDetalle: ' || nullif(btrim(p_details), ''), '')
    || E'\nReporte: ' || v_report.id);
end;
$$;

-- ── Avisos al moderador ─────────────────────────────────────────────────────

create or replace function public.dispatch_notifications()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_key text;
begin
  if not exists (select 1 from public.notification_outbox where sent_at is null and send_after <= now())
     and not exists (select 1 from public.moderation_alerts where sent_at is null and attempts < 5) then
    return;
  end if;

  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'service_role_key';
  if v_url is null or v_key is null then
    return;
  end if;

  perform net.http_post(
    url := v_url || '/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key),
    body := '{}'::jsonb
  );
end;
$$;

create trigger moderation_alerts_dispatch
after insert on public.moderation_alerts
for each statement execute function public.notification_outbox_dispatch();

create function public.claim_moderation_alerts(p_limit int default 50)
returns table (id bigint, text text)
language sql
security definer
set search_path = ''
as $$
  update public.moderation_alerts a
  set claimed_at = now(), attempts = attempts + 1
  where a.id in (
    select id from public.moderation_alerts
    where sent_at is null and attempts < 5 and (claimed_at is null or claimed_at < now() - interval '5 minutes')
    order by created_at
    limit p_limit
    for update skip locked
  )
  returning a.id, a.text;
$$;

create function public.complete_moderation_alerts(p_sent bigint[], p_failed jsonb default '[]')
returns void
language sql
security definer
set search_path = ''
as $$
  update public.moderation_alerts set sent_at = now(), error = null where id = any (p_sent);
  update public.moderation_alerts a set error = f ->> 'error'
  from jsonb_array_elements(p_failed) f where a.id = (f ->> 'id')::bigint;
$$;

-- ── Suspensiones y advertencias ─────────────────────────────────────────────

-- AC-24: un email suspendido para siempre no puede volver a registrarse.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'));
begin
  if new.email is not null
     and exists (select 1 from public.banned_emails
                 where email_hash = encode(extensions.digest(lower(new.email), 'sha256'), 'hex')) then
    raise exception 'Esta cuenta fue suspendida' using errcode = 'P0001';
  end if;

  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    case when char_length(v_name) between 2 and 30 then v_name end,
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

-- AC-25: advertencia sin ver, para mostrar al abrir la app.
create function public.get_my_warning()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('id', id, 'reason', reason, 'created_at', created_at)
  from public.user_warnings
  where user_id = auth.uid() and seen_at is null
  order by created_at
  limit 1;
$$;

create function public.ack_warning(p_warning uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.user_warnings set seen_at = now() where id = p_warning and user_id = auth.uid();
$$;

-- ── Suspendidos: fuera de todo (AC-22, AC-23) ───────────────────────────────

create or replace function public.can_see_group(p_group uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_active_user() and exists (
    select 1 from public.groups g
    where g.id = p_group
      and g.deleted_at is null
      and not public.is_blocked(auth.uid(), g.owner_id)
      and not exists (
        select 1 from public.group_members m
        where m.group_id = g.id and m.user_id = auth.uid() and m.status = 'banned'
      )
  );
$$;

create or replace function public.can_see_plan(p_plan uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_active_user() and exists (
    select 1
    from public.plans p
    left join public.groups g on g.id = p.group_id
    where p.id = p_plan
      and not public.is_blocked(auth.uid(), p.creator_id)
      and not exists (
        select 1 from public.plan_participants pp
        where pp.plan_id = p.id and pp.user_id = auth.uid() and pp.removed_at is not null
      )
      and (
        public.is_plan_participant(p.id, auth.uid())
        or (
          (p.group_id is null or (g.deleted_at is null and g.access = 'open'))
          and p.city_id = (select city_id from public.profiles where id = auth.uid())
        )
        or (g.access = 'approval' and g.deleted_at is null and public.is_group_member(g.id, auth.uid()))
      )
  );
$$;

create or replace function public.can_see_message(m public.messages)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_active_user()
     and public.can_read_chat(m.group_id, m.plan_id, auth.uid())
     and (m.sender_id is null or not public.is_blocked(auth.uid(), m.sender_id));
$$;

create or replace function public.list_group_members(p_group uuid)
returns table (user_id uuid, name text, avatar_url text, role public.group_role, joined_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.name, p.avatar_url, m.role, m.joined_at
  from public.group_members m
  join public.profiles p on p.id = m.user_id
  where m.group_id = p_group
    and m.status = 'active'
    and public.is_group_member(p_group, auth.uid())
    and public.can_see_group(p_group)
    and not public.is_blocked(auth.uid(), p.id)
    and public.is_active_profile(p.id)
  order by (m.role = 'owner') desc, m.joined_at;
$$;

create or replace function public.plan_preview(p_plan uuid, p_limit int)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'name', x.name, 'avatar_url', x.avatar_url)), '[]'::jsonb)
  from (
    select p.id, p.name, p.avatar_url
    from public.plan_participants pp
    join public.profiles p on p.id = pp.user_id
    join public.plans pl on pl.id = pp.plan_id
    where pp.plan_id = p_plan and pp.removed_at is null
      and not public.is_blocked(auth.uid(), p.id)
      and public.is_active_profile(p.id)
    order by (p.id = pl.creator_id) desc, pp.joined_at
    limit p_limit
  ) x;
$$;

-- ── Acciones de moderación ──────────────────────────────────────────────────
-- Las puede ejecutar un admin desde la app (is_admin) o el moderador desde el editor SQL
-- del dashboard de Supabase (sesión directa a la base, no a través de la API).

create function public.assert_moderator()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if session_user = 'authenticator' and not public.is_admin() then
    raise exception 'Solo moderadores' using errcode = '42501';
  end if;
end;
$$;

create function public.resolve_reports(p_type public.report_target, p_id uuid, p_status public.report_status,
                                       p_resolution text, p_note text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.reports
  set status = p_status, resolved_at = now(), resolution = p_resolution, resolution_note = p_note
  where target_type = p_type and target_id = p_id and status = 'open';
$$;

-- AC-18: descartar cierra los reportes abiertos sobre lo mismo y vuelve a mostrar lo oculto.
create function public.admin_dismiss(p_report uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_report public.reports;
begin
  perform public.assert_moderator();
  select * into v_report from public.reports where id = p_report;

  case v_report.target_type
    when 'message' then update public.messages set hidden_at = null where id = v_report.target_id;
    when 'group' then update public.groups set hidden_at = null where id = v_report.target_id;
    when 'plan' then update public.plans set hidden_at = null where id = v_report.target_id;
    else null;
  end case;

  perform public.resolve_reports(v_report.target_type, v_report.target_id, 'dismissed', 'dismiss', p_note);
end;
$$;

create function public.admin_delete_message(p_message uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_moderator();
  update public.messages set body = '', deleted_by = 'moderator' where id = p_message;
  perform public.resolve_reports('message', p_message, 'actioned', 'delete_message', p_note);
end;
$$;

create function public.admin_delete_group(p_group uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan uuid;
begin
  perform public.assert_moderator();
  update public.groups set deleted_at = now() where id = p_group and deleted_at is null;
  for v_plan in
    select id from public.plans where group_id = p_group and cancelled_at is null and starts_at > now()
  loop
    perform public.cancel_plan_internal(v_plan, 'Se eliminó el grupo');
  end loop;
  perform public.resolve_reports('group', p_group, 'actioned', 'delete_group', p_note);
end;
$$;

create function public.admin_cancel_plan(p_plan uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_moderator();
  perform public.cancel_plan_internal(p_plan, 'Cancelado por moderación');
  perform public.resolve_reports('plan', p_plan, 'actioned', 'cancel_plan', p_note);
end;
$$;

create function public.admin_warn(p_user uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_moderator();
  insert into public.user_warnings (user_id, reason) values (p_user, p_reason);
  perform public.resolve_reports('user', p_user, 'actioned', 'warn', p_reason);
end;
$$;

-- p_days: 1, 7 o 30. null = permanente: se elimina la cuenta y el email no vuelve (AC-24).
create function public.admin_suspend(p_user uuid, p_days int, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
begin
  perform public.assert_moderator();

  if p_days is not null then
    if p_days not in (1, 7, 30) then
      raise exception 'La suspensión es de 1, 7 o 30 días, o permanente' using errcode = 'P0001';
    end if;
    update public.profiles set suspended_until = now() + make_interval(days => p_days), suspension_reason = p_reason
    where id = p_user;
    perform public.resolve_reports('user', p_user, 'actioned', 'suspend_' || p_days || 'd', p_reason);
    return;
  end if;

  select email into v_email from auth.users where id = p_user;
  if v_email is not null then
    insert into public.banned_emails (email_hash)
    values (encode(extensions.digest(lower(v_email), 'sha256'), 'hex'))
    on conflict do nothing;
  end if;
  perform public.resolve_reports('user', p_user, 'actioned', 'suspend_permanent', p_reason);
  perform public.prepare_account_deletion(p_user);
  -- Las fotos del usuario quedan en Storage; se limpian a mano desde el dashboard si hace falta.
  delete from auth.users where id = p_user;
end;
$$;

-- Cola de moderación para revisar desde el dashboard: lo urgente primero.
create view public.moderation_queue as
select r.id, r.priority, r.reason, r.target_type, r.target_id, r.details, r.snapshot, r.created_at,
       (select count(distinct reporter_id) from public.reports r2
        where r2.target_type = r.target_type and r2.target_id = r.target_id and r2.status = 'open') as reporters
from public.reports r
where r.status = 'open'
order by r.priority, r.created_at;

-- ── Permisos ────────────────────────────────────────────────────────────────

alter table public.reports enable row level security;
alter table public.admins enable row level security;
alter table public.banned_emails enable row level security;
alter table public.user_warnings enable row level security;
alter table public.moderation_alerts enable row level security;

-- Sin acceso desde la app: ni los propios reportes (AC-15).
revoke all on public.reports, public.admins, public.banned_emails, public.user_warnings,
              public.moderation_alerts, public.moderation_queue from anon, authenticated;

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.block_user(uuid)',
    'public.unblock_user(uuid)',
    'public.list_my_blocks()',
    'public.my_spaces_with(uuid)',
    'public.create_report(public.report_target, uuid, public.report_reason, text)',
    'public.get_my_warning()',
    'public.ack_warning(uuid)',
    'public.is_admin()',
    'public.admin_dismiss(uuid, text)',
    'public.admin_delete_message(uuid, text)',
    'public.admin_delete_group(uuid, text)',
    'public.admin_cancel_plan(uuid, text)',
    'public.admin_warn(uuid, text)',
    'public.admin_suspend(uuid, int, text)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;

  foreach f in array array[
    'public.report_snapshot(public.report_target, uuid)',
    'public.assert_moderator()',
    'public.resolve_reports(public.report_target, uuid, public.report_status, text, text)'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
  end loop;

  foreach f in array array[
    'public.claim_moderation_alerts(int)',
    'public.complete_moderation_alerts(bigint[], jsonb)'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end;
$$;
