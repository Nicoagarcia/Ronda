-- Hito 5 · Notificaciones (docs/specs/05-notificaciones.md).
--
-- Flujo: los eventos (triggers y funciones) encolan en notification_outbox, ya filtrando
-- ajustes, silenciados, bloqueos y agrupación. La Edge Function `send-push` toma la cola
-- y manda por Expo Push. pg_cron, cada minuto: recordatorios, resúmenes y despacho.

create extension if not exists pg_cron;

-- ── Tablas ──────────────────────────────────────────────────────────────────

create table public.push_tokens (
  token text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  device_id text,
  platform text not null check (platform in ('android', 'ios')),
  updated_at timestamptz not null default now()
);

create index push_tokens_user_idx on public.push_tokens (user_id);

-- Una fila por usuario; si falta, todo vale lo de por defecto (activado).
create table public.notification_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  messages boolean not null default true,      -- N1, N2
  requests boolean not null default true,      -- N3, N4
  group_plans boolean not null default true,   -- N5
  plan_joins boolean not null default true,    -- N6
  plan_updates boolean not null default true,  -- N7, N8, N9
  permission_prompted_at timestamptz           -- "Ahora no" del permiso (7 días)
);

create type public.notification_type as enum (
  'message', 'message_digest', 'join_request', 'request_accepted', 'group_plan',
  'plan_join', 'plan_reminder', 'plan_changed', 'plan_cancelled', 'group_deleted'
);

create table public.notification_outbox (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text not null,
  path text not null,                -- pantalla que abre al tocarla
  channel text not null,             -- canal de Android: messages | plans | groups
  collapse_key text,                 -- chat o plan, para agrupar
  payload jsonb not null default '{}',
  send_after timestamptz not null default now(),
  claimed_at timestamptz,
  attempts int not null default 0,
  sent_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

create index notification_outbox_due_idx on public.notification_outbox (send_after) where sent_at is null;
create index notification_outbox_collapse_idx on public.notification_outbox (user_id, type, collapse_key, created_at desc);

-- ── Encolar ─────────────────────────────────────────────────────────────────

-- ¿El usuario quiere este tipo de notificación? (spec 05, "Ajustes del usuario")
create function public.wants_notification(p_user uuid, p_type public.notification_type)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case p_type
    when 'message' then coalesce(s.messages, true)
    when 'message_digest' then coalesce(s.messages, true)
    when 'join_request' then coalesce(s.requests, true)
    when 'request_accepted' then coalesce(s.requests, true)
    when 'group_plan' then coalesce(s.group_plans, true)
    when 'plan_join' then coalesce(s.plan_joins, true)
    when 'group_deleted' then true -- N10 siempre
    else coalesce(s.plan_updates, true)
  end
  from (select 1) _
  left join public.notification_settings s on s.user_id = p_user;
$$;

create function public.channel_for(p_type public.notification_type)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_type in ('message', 'message_digest') then 'messages'
    when p_type in ('join_request', 'request_accepted', 'group_deleted') then 'groups'
    else 'plans'
  end;
$$;

-- Encola respetando ajustes y bloqueos con quien la provoca (AC-03).
create function public.enqueue_notification(
  p_user uuid,
  p_type public.notification_type,
  p_title text,
  p_body text,
  p_path text,
  p_actor uuid default null,
  p_collapse_key text default null,
  p_send_after timestamptz default now()
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user = p_actor
     or (p_actor is not null and public.is_blocked(p_user, p_actor))
     or not public.wants_notification(p_user, p_type) then
    return;
  end if;

  insert into public.notification_outbox (user_id, type, title, body, path, channel, collapse_key, send_after)
  values (p_user, p_type, left(p_title, 100), left(p_body, 200), p_path, public.channel_for(p_type), p_collapse_key, p_send_after);
end;
$$;

-- "🛼 Patinar en el Bosque"
create function public.plan_label(p_plan uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select i.emoji || ' ' || p.title
  from public.plans p join public.interests i on i.id = p.category_id
  where p.id = p_plan;
$$;

-- ── N1 / N2: mensajes, como máximo uno cada 5 minutos por chat (AC-07 a AC-09) ──

create function public.messages_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text;
  v_path text;
  v_sender text;
  v_recipient uuid;
  v_read public.chat_reads;
begin
  if new.kind <> 'text' then
    return null;
  end if;

  if new.group_id is not null then
    select name into v_title from public.groups where id = new.group_id;
    v_path := '/group/' || new.group_id || '/chat';
  else
    v_title := public.plan_label(new.plan_id);
    v_path := '/plan/' || new.plan_id || '/chat';
  end if;
  select name into v_sender from public.profiles where id = new.sender_id;

  for v_recipient in
    select m.user_id from public.group_members m
    where new.group_id is not null and m.group_id = new.group_id and m.status = 'active'
    union
    select pp.user_id from public.plan_participants pp
    where new.plan_id is not null and pp.plan_id = new.plan_id and pp.removed_at is null
  loop
    continue when v_recipient = new.sender_id or public.is_blocked(v_recipient, new.sender_id);

    select * into v_read from public.chat_reads r
    where r.user_id = v_recipient
      and (r.group_id = new.group_id or r.plan_id = new.plan_id);

    continue when coalesce(v_read.muted, false);

    -- Notifica ya si no hubo aviso en los últimos 5 minutos, o si abrió el chat desde el último aviso.
    if v_read.last_notified_at is null
       or v_read.last_notified_at <= now() - interval '5 minutes'
       or v_read.last_read_at > v_read.last_notified_at then
      perform public.enqueue_notification(v_recipient, 'message', v_title, v_sender || ': ' || new.body,
                                          v_path, new.sender_id, coalesce(new.group_id, new.plan_id)::text);

      if v_read.user_id is null then
        -- Nunca abrió el chat: se crea la fila sin marcarlo como leído.
        insert into public.chat_reads (user_id, group_id, plan_id, last_read_at, last_notified_at)
        values (v_recipient, new.group_id, new.plan_id, '-infinity', now());
      else
        update public.chat_reads r set last_notified_at = now()
        where r.user_id = v_recipient and (r.group_id = new.group_id or r.plan_id = new.plan_id);
      end if;
    end if;
    -- Si no, lo junta el resumen (N2) de notifications_tick.
  end loop;

  return null;
end;
$$;

create trigger messages_notify
after insert on public.messages
for each row execute function public.messages_notify();

-- N2: pasados 5 minutos del último aviso, si hay mensajes nuevos sin leer, uno solo con el total.
create function public.enqueue_message_digests()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row record;
  v_count int := 0;
begin
  for v_row in
    select r.user_id, r.group_id, r.plan_id,
           (select count(*) from public.messages m
            where (m.group_id = r.group_id or m.plan_id = r.plan_id)
              and m.kind = 'text' and m.deleted_by is null
              and m.sender_id is distinct from r.user_id
              and m.created_at > r.last_read_at
              and (m.sender_id is null or not public.is_blocked(r.user_id, m.sender_id))) as unread
    from public.chat_reads r
    where not r.muted
      and r.last_notified_at <= now() - interval '5 minutes'
      and exists (
        select 1 from public.messages m
        where (m.group_id = r.group_id or m.plan_id = r.plan_id)
          and m.kind = 'text' and m.deleted_by is null
          and m.sender_id is distinct from r.user_id
          and m.created_at > r.last_notified_at
          and m.created_at > r.last_read_at
          and (m.sender_id is null or not public.is_blocked(r.user_id, m.sender_id))
      )
      and public.can_read_chat(r.group_id, r.plan_id, r.user_id)
  loop
    perform public.enqueue_notification(
      v_row.user_id, 'message_digest',
      coalesce((select name from public.groups where id = v_row.group_id), public.plan_label(v_row.plan_id)),
      v_row.unread || case when v_row.unread = 1 then ' mensaje nuevo' else ' mensajes nuevos' end,
      case when v_row.group_id is not null then '/group/' || v_row.group_id || '/chat'
           else '/plan/' || v_row.plan_id || '/chat' end,
      null, coalesce(v_row.group_id, v_row.plan_id)::text);

    update public.chat_reads set last_notified_at = now()
    where user_id = v_row.user_id and (group_id = v_row.group_id or plan_id = v_row.plan_id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ── N3 / N4: solicitudes ────────────────────────────────────────────────────

create function public.group_members_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group public.groups;
begin
  select * into v_group from public.groups where id = new.group_id;

  if new.status = 'pending' and (tg_op = 'INSERT' or old.status is distinct from 'pending') then
    perform public.enqueue_notification(v_group.owner_id, 'join_request', v_group.name,
      (select name from public.profiles where id = new.user_id) || ' quiere unirse',
      '/group/' || new.group_id || '/requests', new.user_id, new.group_id::text);
  elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'active' then
    perform public.enqueue_notification(new.user_id, 'request_accepted', v_group.name,
      'Ya sos parte del grupo 🎉', '/group/' || new.group_id, v_group.owner_id, new.group_id::text);
  end if;
  return null;
end;
$$;

create trigger group_members_notify
after insert or update of status on public.group_members
for each row execute function public.group_members_notify();

-- ── N10: grupo eliminado ────────────────────────────────────────────────────

create function public.groups_notify_deleted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member uuid;
begin
  if new.deleted_at is not null and old.deleted_at is null then
    for v_member in
      select user_id from public.group_members where group_id = new.id and status = 'active' and user_id <> new.owner_id
    loop
      perform public.enqueue_notification(v_member, 'group_deleted', 'Grupo eliminado',
        'El grupo ' || new.name || ' fue eliminado', '/mine', new.owner_id, new.id::text);
    end loop;
  end if;
  return null;
end;
$$;

create trigger groups_notify_deleted
after update of deleted_at on public.groups
for each row execute function public.groups_notify_deleted();

-- ── N5: plan nuevo en un grupo ──────────────────────────────────────────────

create function public.plans_notify_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group_name text;
  v_member uuid;
begin
  if new.group_id is null then
    return null;
  end if;
  select name into v_group_name from public.groups where id = new.group_id;

  for v_member in
    select user_id from public.group_members where group_id = new.group_id and status = 'active'
  loop
    perform public.enqueue_notification(v_member, 'group_plan', v_group_name,
      'Nuevo plan: ' || public.plan_label(new.id) || ', ' || public.format_ar(new.starts_at),
      '/plan/' || new.id, new.creator_id, new.id::text);
  end loop;
  return null;
end;
$$;

create trigger plans_notify_created
after insert on public.plans
for each row execute function public.plans_notify_created();

-- ── N8 / N9: cambios y cancelación ──────────────────────────────────────────

create function public.plans_notify_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_type public.notification_type;
  v_body text;
  v_path text := '/plan/' || new.id;
  v_participant uuid;
begin
  if new.cancelled_at is not null and old.cancelled_at is null then
    v_type := 'plan_cancelled';
    v_body := 'Se canceló el plan' || coalesce(': ' || new.cancel_reason, '');
    v_path := '/plan/' || new.id || '/chat';
  elsif new.cancelled_at is null and new.starts_at <> old.starts_at then
    v_type := 'plan_changed';
    v_body := 'Cambió el horario: ahora ' || public.format_ar(new.starts_at);
  elsif new.cancelled_at is null and (new.place_name <> old.place_name or new.zone is distinct from old.zone) then
    v_type := 'plan_changed';
    v_body := 'Cambió el lugar: ahora ' || new.place_name;
  else
    return null;
  end if;

  for v_participant in
    select user_id from public.plan_participants where plan_id = new.id and removed_at is null
  loop
    perform public.enqueue_notification(v_participant, v_type, public.plan_label(new.id), v_body, v_path,
                                        new.creator_id, new.id::text);
  end loop;
  return null;
end;
$$;

create trigger plans_notify_changes
after update of starts_at, place_name, zone, cancelled_at on public.plans
for each row execute function public.plans_notify_changes();

-- ── N6: alguien se sumó a tu plan, como máximo una cada 10 minutos (AC-10) ───
-- La primera espera 2 minutos para juntar a los que se suman casi a la vez.

create function public.plan_participants_notify_join()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.plans;
  v_name text;
  v_pending public.notification_outbox;
  v_last_sent timestamptz;
  v_names jsonb;
begin
  select * into v_plan from public.plans where id = new.plan_id;
  if new.user_id = v_plan.creator_id or public.is_blocked(v_plan.creator_id, new.user_id)
     or not public.wants_notification(v_plan.creator_id, 'plan_join') then
    return null;
  end if;
  select name into v_name from public.profiles where id = new.user_id;

  select * into v_pending from public.notification_outbox
  where user_id = v_plan.creator_id and type = 'plan_join' and collapse_key = new.plan_id::text and sent_at is null
  order by created_at desc limit 1
  for update;

  if found then
    v_names := v_pending.payload -> 'names' || to_jsonb(v_name);
    update public.notification_outbox
    set payload = jsonb_build_object('names', v_names),
        body = (v_names ->> 0) || ' y ' || (jsonb_array_length(v_names) - 1) || ' más se sumaron ('
               || v_plan.participant_count || '/' || v_plan.max_participants || ')'
    where id = v_pending.id;
    return null;
  end if;

  select max(sent_at) into v_last_sent from public.notification_outbox
  where user_id = v_plan.creator_id and type = 'plan_join' and collapse_key = new.plan_id::text;

  insert into public.notification_outbox (user_id, type, title, body, path, channel, collapse_key, payload, send_after)
  values (v_plan.creator_id, 'plan_join', public.plan_label(new.plan_id),
          v_name || ' se sumó (' || v_plan.participant_count || '/' || v_plan.max_participants || ')',
          '/plan/' || new.plan_id, 'plans', new.plan_id::text, jsonb_build_object('names', jsonb_build_array(v_name)),
          greatest(now() + interval '2 minutes', coalesce(v_last_sent + interval '10 minutes', now())));
  return null;
end;
$$;

-- Después del trigger que actualiza participant_count, para mostrar el cupo correcto.
create trigger zz_plan_participants_notify_join
after insert on public.plan_participants
for each row execute function public.plan_participants_notify_join();

-- ── N7: recordatorio 2 h antes (AC-11, AC-12) ───────────────────────────────

create function public.enqueue_plan_reminders()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row record;
  v_count int := 0;
begin
  for v_row in
    select pp.plan_id, pp.user_id, p.starts_at, p.place_name, p.is_private_place
    from public.plan_participants pp
    join public.plans p on p.id = pp.plan_id
    where pp.removed_at is null
      and pp.reminder_sent_at is null
      and p.cancelled_at is null
      and p.starts_at > now()
      and p.starts_at <= now() + interval '2 hours'
      -- Quien se sumó en las 2 horas previas al inicio no recibe recordatorio.
      and pp.joined_at <= p.starts_at - interval '2 hours'
    for update of pp skip locked
  loop
    perform public.enqueue_notification(v_row.user_id, 'plan_reminder', public.plan_label(v_row.plan_id),
      'Empieza a las ' || to_char(v_row.starts_at at time zone 'America/Argentina/Buenos_Aires', 'HH24:MI')
        || ' · ' || v_row.place_name,
      '/plan/' || v_row.plan_id, null, v_row.plan_id::text);

    update public.plan_participants set reminder_sent_at = now()
    where plan_id = v_row.plan_id and user_id = v_row.user_id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ── Despacho ────────────────────────────────────────────────────────────────
-- La URL del proyecto y la clave del servidor se guardan en Vault:
--   select vault.create_secret('<url>', 'project_url');
--   select vault.create_secret('<service_role_key>', 'service_role_key');
-- En local las carga seed.sql. En producción se cargan a mano (docs/05-plan-tecnico.md).

create function public.dispatch_notifications()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_key text;
begin
  if not exists (select 1 from public.notification_outbox where sent_at is null and send_after <= now()) then
    return;
  end if;

  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'service_role_key';
  if v_url is null or v_key is null then
    return; -- Sin configurar: la cola espera.
  end if;

  perform net.http_post(
    url := v_url || '/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key),
    body := '{}'::jsonb
  );
end;
$$;

-- Lo inmediato sale sin esperar al cron: una llamada por sentencia, no por fila.
create function public.notification_outbox_dispatch()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.dispatch_notifications();
  return null;
end;
$$;

create trigger notification_outbox_dispatch
after insert on public.notification_outbox
for each statement execute function public.notification_outbox_dispatch();

-- La Edge Function toma un lote de la cola. Lo reclamado se reintenta si no se confirma en 5 minutos.
create function public.claim_notifications(p_limit int default 100)
returns table (id bigint, user_id uuid, title text, body text, path text, channel text, tokens text[])
language sql
security definer
set search_path = ''
as $$
  with claimed as (
    update public.notification_outbox o
    set claimed_at = now(), attempts = attempts + 1
    where o.id in (
      select id from public.notification_outbox
      where sent_at is null and send_after <= now() and attempts < 5
        and (claimed_at is null or claimed_at < now() - interval '5 minutes')
      order by send_after
      limit p_limit
      for update skip locked
    )
    returning o.*
  )
  select c.id, c.user_id, c.title, c.body, c.path, c.channel,
         coalesce((select array_agg(t.token) from public.push_tokens t where t.user_id = c.user_id), '{}')
  from claimed c;
$$;

-- Marca enviados y borra los dispositivos que ya no existen (AC-21).
create function public.complete_notifications(p_sent bigint[], p_failed jsonb default '[]', p_invalid_tokens text[] default '{}')
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.notification_outbox set sent_at = now(), error = null where id = any (p_sent);

  update public.notification_outbox o
  set error = f ->> 'error',
      sent_at = case when (f ->> 'final')::boolean then now() end
  from jsonb_array_elements(p_failed) f
  where o.id = (f ->> 'id')::bigint;

  delete from public.push_tokens where token = any (p_invalid_tokens);
end;
$$;

-- Lo que corre cada minuto.
create function public.notifications_tick()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.enqueue_plan_reminders();
  perform public.enqueue_message_digests();
  perform public.dispatch_notifications();
end;
$$;

select cron.schedule('notifications-tick', '* * * * *', 'select public.notifications_tick()');

-- ── Dispositivos y ajustes (desde la app) ───────────────────────────────────

-- Un mismo celular puede cambiar de usuario: el token queda del último que inició sesión.
create function public.register_push_token(p_token text, p_platform text, p_device_id text default null)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.push_tokens (token, user_id, device_id, platform, updated_at)
  values (p_token, auth.uid(), p_device_id, p_platform, now())
  on conflict (token) do update set user_id = auth.uid(), device_id = excluded.device_id, updated_at = now();
$$;

-- Al cerrar sesión (spec 01 AC-19, spec 05 AC-20).
create function public.unregister_push_token(p_token text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_tokens where token = p_token and user_id = auth.uid();
$$;

create function public.get_notification_settings()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'messages', coalesce(s.messages, true),
    'requests', coalesce(s.requests, true),
    'group_plans', coalesce(s.group_plans, true),
    'plan_joins', coalesce(s.plan_joins, true),
    'plan_updates', coalesce(s.plan_updates, true),
    'permission_prompted_at', s.permission_prompted_at
  )
  from (select 1) _
  left join public.notification_settings s on s.user_id = auth.uid();
$$;

create function public.update_notification_settings(p_settings jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notification_settings (user_id, messages, requests, group_plans, plan_joins, plan_updates)
  values (auth.uid(),
          coalesce((p_settings ->> 'messages')::boolean, true),
          coalesce((p_settings ->> 'requests')::boolean, true),
          coalesce((p_settings ->> 'group_plans')::boolean, true),
          coalesce((p_settings ->> 'plan_joins')::boolean, true),
          coalesce((p_settings ->> 'plan_updates')::boolean, true))
  on conflict (user_id) do update set
    messages = coalesce((p_settings ->> 'messages')::boolean, notification_settings.messages),
    requests = coalesce((p_settings ->> 'requests')::boolean, notification_settings.requests),
    group_plans = coalesce((p_settings ->> 'group_plans')::boolean, notification_settings.group_plans),
    plan_joins = coalesce((p_settings ->> 'plan_joins')::boolean, notification_settings.plan_joins),
    plan_updates = coalesce((p_settings ->> 'plan_updates')::boolean, notification_settings.plan_updates);
$$;

-- "Ahora no" en la pantalla previa al permiso (AC-18).
create function public.mark_permission_prompted()
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notification_settings (user_id, permission_prompted_at) values (auth.uid(), now())
  on conflict (user_id) do update set permission_prompted_at = now();
$$;

-- ── Permisos ────────────────────────────────────────────────────────────────

alter table public.push_tokens enable row level security;
alter table public.notification_settings enable row level security;
alter table public.notification_outbox enable row level security;

revoke all on public.push_tokens, public.notification_settings, public.notification_outbox from anon, authenticated;
grant select on public.push_tokens, public.notification_settings to authenticated;

create policy "Dispositivos: cada uno los suyos" on public.push_tokens for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Ajustes: cada uno los suyos" on public.notification_settings for select to authenticated
  using (user_id = (select auth.uid()));
-- notification_outbox: sin acceso desde la app.

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.register_push_token(text, text, text)',
    'public.unregister_push_token(text)',
    'public.get_notification_settings()',
    'public.update_notification_settings(jsonb)',
    'public.mark_permission_prompted()'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;

  -- Internas: solo el servidor (service_role) o los triggers.
  foreach f in array array[
    'public.wants_notification(uuid, public.notification_type)',
    'public.enqueue_notification(uuid, public.notification_type, text, text, text, uuid, text, timestamptz)',
    'public.plan_label(uuid)',
    'public.messages_notify()',
    'public.enqueue_message_digests()',
    'public.group_members_notify()',
    'public.groups_notify_deleted()',
    'public.plans_notify_created()',
    'public.plans_notify_changes()',
    'public.plan_participants_notify_join()',
    'public.enqueue_plan_reminders()',
    'public.dispatch_notifications()',
    'public.notification_outbox_dispatch()',
    'public.notifications_tick()'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
  end loop;

  foreach f in array array[
    'public.claim_notifications(int)',
    'public.complete_notifications(bigint[], jsonb, text[])'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end;
$$;

-- ── Antes de eliminar una cuenta (spec 01) ──────────────────────────────────
-- Cancela sus planes próximos y elimina sus grupos con aviso a los demás.
-- Después, el borrado en cascada se lleva todo lo suyo. La llama la Edge Function delete-account.
create function public.prepare_account_deletion(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan uuid;
begin
  for v_plan in
    select id from public.plans where creator_id = p_user and cancelled_at is null and starts_at > now()
  loop
    perform public.cancel_plan_internal(v_plan, 'Quien lo organizaba eliminó su cuenta');
  end loop;

  update public.groups set deleted_at = now() where owner_id = p_user and deleted_at is null;
end;
$$;

revoke execute on function public.prepare_account_deletion(uuid) from public, anon, authenticated;
grant execute on function public.prepare_account_deletion(uuid) to service_role;
