-- Hito 4 · Chat (docs/specs/04-chat.md).
-- También completa la spec 03: el motivo de cancelación y los cambios de hora o lugar
-- se publican en el chat del plan (AC-28).

create type public.message_kind as enum ('text', 'system');
create type public.message_deleted_by as enum ('author', 'moderator');

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups (id) on delete cascade,
  plan_id uuid references public.plans (id) on delete cascade,
  -- En mensajes del sistema es la persona de la que habla ("Nico se sumó"), o null.
  -- Si la cuenta se elimina queda null: la app muestra "Usuario eliminado" (spec 01).
  sender_id uuid references public.profiles (id) on delete set null,
  kind public.message_kind not null default 'text',
  body text not null,
  deleted_by public.message_deleted_by,
  hidden_at timestamptz, -- ocultado por reportes (spec 06)
  created_at timestamptz not null default now(),

  constraint messages_un_chat check ((group_id is null) <> (plan_id is null)),
  -- AC-09: texto de 1 a 2000 caracteres. Un mensaje borrado queda vacío.
  constraint messages_largo check (
    deleted_by is not null or kind = 'system' or char_length(btrim(body)) between 1 and 2000
  )
);

create index messages_group_idx on public.messages (group_id, created_at desc, id desc) where group_id is not null;
create index messages_plan_idx on public.messages (plan_id, created_at desc, id desc) where plan_id is not null;
create index messages_sender_recent_idx on public.messages (sender_id, created_at desc);

create table public.chat_reads (
  user_id uuid not null references public.profiles (id) on delete cascade,
  group_id uuid references public.groups (id) on delete cascade,
  plan_id uuid references public.plans (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  muted boolean not null default false,
  last_notified_at timestamptz, -- Hito 5
  constraint chat_reads_un_chat check ((group_id is null) <> (plan_id is null))
);

create unique index chat_reads_group_uq on public.chat_reads (user_id, group_id) where group_id is not null;
create unique index chat_reads_plan_uq on public.chat_reads (user_id, plan_id) where plan_id is not null;

-- ── Acceso ──────────────────────────────────────────────────────────────────

-- ¿Puede leer el chat? Miembros activos del grupo o participantes del plan (spec 04).
create function public.can_read_chat(p_group uuid, p_plan uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_group is not null then
      public.is_group_member(p_group, p_user)
      and exists (select 1 from public.groups where id = p_group and deleted_at is null)
    else
      public.is_plan_participant(p_plan, p_user)
  end;
$$;

-- Motivo por el que no se puede escribir, o null si se puede.
create function public.chat_closed_reason(p_group uuid, p_plan uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_group is not null then null
    else (
      select case
        when p.cancelled_at is not null then 'Este plan fue cancelado'
        -- Abierto hasta 24 h después del fin (AC-06, AC-07).
        when now() > public.plan_effective_end(p.starts_at, p.ends_at) + interval '24 hours' then 'Este plan terminó'
      end
      from public.plans p where p.id = p_plan
    )
  end;
$$;

-- ── Mensajes del sistema ────────────────────────────────────────────────────

-- "sáb 10/10 18:00" en hora de Argentina.
create function public.format_ar(p_ts timestamptz)
returns text
language sql
stable
set search_path = ''
as $$
  select (array['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'])[extract(dow from p_ts at time zone 'America/Argentina/Buenos_Aires')::int + 1]
         || ' ' || to_char(p_ts at time zone 'America/Argentina/Buenos_Aires', 'FMDD/FMMM HH24:MI');
$$;

create function public.post_system_message(p_group uuid, p_plan uuid, p_subject uuid, p_body text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.messages (group_id, plan_id, sender_id, kind, body)
  values (p_group, p_plan, p_subject, 'system', p_body);
$$;

-- "X se unió al grupo" (AC-19). Cubre todas las formas de entrar: abierto, solicitud aceptada,
-- cambio de acceso. No se anuncian salidas en el grupo.
create function public.group_members_announce_join()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'active' and new.role = 'member'
     and (tg_op = 'INSERT' or old.status is distinct from 'active') then
    perform public.post_system_message(
      new.group_id, null, new.user_id,
      (select name from public.profiles where id = new.user_id) || ' se unió al grupo'
    );
  end if;
  return null;
end;
$$;

create trigger group_members_announce_join
after insert or update of status on public.group_members
for each row execute function public.group_members_announce_join();

-- "X se sumó" / "X se bajó" en el chat del plan (AC-18). Sacar a alguien no se anuncia.
create function public.plan_participants_announce()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.plan_participants := coalesce(new, old);
  v_creator uuid;
  v_name text;
begin
  select creator_id into v_creator from public.plans where id = v_row.plan_id;
  select name into v_name from public.profiles where id = v_row.user_id;
  -- Sin plan o sin perfil (se están borrando en cascada) no hay nada que anunciar.
  if v_creator is null or v_name is null or v_row.user_id = v_creator then
    return null;
  end if;

  if tg_op = 'INSERT' then
    perform public.post_system_message(null, v_row.plan_id, v_row.user_id, v_name || ' se sumó');
  elsif tg_op = 'DELETE' and old.removed_at is null then
    perform public.post_system_message(null, v_row.plan_id, v_row.user_id, v_name || ' se bajó');
  end if;
  return null;
end;
$$;

create trigger plan_participants_announce
after insert or delete on public.plan_participants
for each row execute function public.plan_participants_announce();

-- Cambios de fecha, hora o lugar del plan (AC-20).
create function public.plans_announce_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.cancelled_at is not null and old.cancelled_at is null then
    -- AC-28 de la spec 03: el motivo de cancelación va al chat.
    perform public.post_system_message(null, new.id, null,
      'El plan fue cancelado' || coalesce(': ' || new.cancel_reason, ''));
    return null;
  end if;

  if new.starts_at <> old.starts_at then
    perform public.post_system_message(null, new.id, null,
      'Cambió el horario: ' || public.format_ar(old.starts_at) || ' → ' || public.format_ar(new.starts_at));
  end if;

  if new.place_name <> old.place_name or new.zone is distinct from old.zone then
    perform public.post_system_message(null, new.id, null,
      'Cambió el lugar: ' || new.place_name || coalesce(' · ' || new.zone, ''));
  end if;
  return null;
end;
$$;

create trigger plans_announce_changes
after update of starts_at, place_name, zone, cancelled_at on public.plans
for each row execute function public.plans_announce_changes();

-- ── Enviar, borrar, leer ────────────────────────────────────────────────────

create function public.send_message(p_body text, p_group uuid default null, p_plan uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_closed text;
  v_msg public.messages;
begin
  if not public.is_active_user() or not public.can_read_chat(p_group, p_plan, v_me) then
    raise exception 'No tenés acceso a este chat' using errcode = '42501';
  end if;

  v_closed := public.chat_closed_reason(p_group, p_plan);
  if v_closed is not null then
    raise exception '%: el chat es de solo lectura', v_closed using errcode = 'P0001';
  end if;

  if char_length(btrim(coalesce(p_body, ''))) not between 1 and 2000 then
    raise exception 'El mensaje tiene que tener entre 1 y 2000 caracteres' using errcode = 'P0001';
  end if;

  -- AC-12: como máximo 10 mensajes cada 10 segundos.
  if (select count(*) from public.messages
      where sender_id = v_me and kind = 'text' and created_at > now() - interval '10 seconds') >= 10 then
    raise exception 'Esperá un momento antes de seguir escribiendo' using errcode = 'P0001';
  end if;

  insert into public.messages (group_id, plan_id, sender_id, kind, body)
  values (p_group, p_plan, v_me, 'text', btrim(p_body))
  returning * into v_msg;

  if p_group is not null then
    update public.groups set last_activity_at = now() where id = p_group;
  end if;

  perform public.mark_read(p_group, p_plan);

  return to_jsonb(v_msg);
end;
$$;

-- AC-13 a AC-15: el autor borra lo suyo; el creador del grupo o del plan modera su chat.
create function public.delete_message(p_message uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_msg public.messages;
  v_is_moderator boolean;
begin
  select * into v_msg from public.messages where id = p_message for update;

  if not found or v_msg.kind = 'system' or v_msg.deleted_by is not null
     or not public.can_read_chat(v_msg.group_id, v_msg.plan_id, v_me) then
    raise exception 'No se puede eliminar este mensaje' using errcode = '42501';
  end if;

  v_is_moderator := case
    when v_msg.group_id is not null then public.is_group_owner(v_msg.group_id, v_me)
    else exists (select 1 from public.plans where id = v_msg.plan_id and creator_id = v_me)
  end;

  if v_msg.sender_id is distinct from v_me and not v_is_moderator then
    raise exception 'Solo podés eliminar tus mensajes' using errcode = '42501';
  end if;

  update public.messages
  set body = '',
      deleted_by = case when v_msg.sender_id = v_me then 'author' else 'moderator' end::public.message_deleted_by
  where id = p_message;
end;
$$;

create function public.mark_read(p_group uuid default null, p_plan uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.can_read_chat(p_group, p_plan, auth.uid()) then
    return;
  end if;

  if p_group is not null then
    insert into public.chat_reads (user_id, group_id, last_read_at) values (auth.uid(), p_group, now())
    on conflict (user_id, group_id) where group_id is not null do update set last_read_at = now();
  else
    insert into public.chat_reads (user_id, plan_id, last_read_at) values (auth.uid(), p_plan, now())
    on conflict (user_id, plan_id) where plan_id is not null do update set last_read_at = now();
  end if;
end;
$$;

-- AC-26
create function public.set_chat_muted(p_muted boolean, p_group uuid default null, p_plan uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.can_read_chat(p_group, p_plan, auth.uid()) then
    raise exception 'No tenés acceso a este chat' using errcode = '42501';
  end if;

  if p_group is not null then
    insert into public.chat_reads (user_id, group_id, last_read_at, muted) values (auth.uid(), p_group, now(), p_muted)
    on conflict (user_id, group_id) where group_id is not null do update set muted = p_muted;
  else
    insert into public.chat_reads (user_id, plan_id, last_read_at, muted) values (auth.uid(), p_plan, now(), p_muted)
    on conflict (user_id, plan_id) where plan_id is not null do update set muted = p_muted;
  end if;
end;
$$;

-- ── Lecturas ────────────────────────────────────────────────────────────────

-- Mensaje listo para mostrar. El texto de un mensaje borrado nunca se devuelve.
create function public.message_view(m public.messages)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', m.id,
    'group_id', m.group_id,
    'plan_id', m.plan_id,
    'sender_id', m.sender_id,
    'sender_name', p.name,
    'sender_avatar', p.avatar_url,
    'kind', m.kind,
    'body', case when m.deleted_by is null and m.hidden_at is null then m.body else '' end,
    'deleted_by', m.deleted_by,
    'hidden', m.hidden_at is not null,
    'created_at', m.created_at
  )
  from (select 1) _
  left join public.profiles p on p.id = m.sender_id;
$$;

-- Visible para quien lee: tiene acceso y no hay bloqueo con el autor (AC-22, AC-23).
create function public.can_see_message(m public.messages)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.can_read_chat(m.group_id, m.plan_id, auth.uid())
     and (m.sender_id is null or not public.is_blocked(auth.uid(), m.sender_id));
$$;

-- Página de mensajes, de los más nuevos a los más viejos (AC-17).
-- El cursor es (created_at, id) del mensaje más viejo ya cargado.
create function public.list_messages(
  p_group uuid default null,
  p_plan uuid default null,
  p_before_created timestamptz default null,
  p_before_id uuid default null,
  p_limit int default 50
)
returns setof jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.message_view(m)
  from public.messages m
  where ((p_group is not null and m.group_id = p_group) or (p_plan is not null and m.plan_id = p_plan))
    and public.can_see_message(m)
    and (p_before_created is null or (m.created_at, m.id) < (p_before_created, p_before_id))
  order by m.created_at desc, m.id desc
  limit least(p_limit, 100);
$$;

create function public.get_message(p_message uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.message_view(m)
  from public.messages m
  where m.id = p_message and public.can_see_message(m);
$$;

-- Estado del chat para su pantalla: si se puede escribir, si está silenciado, quién modera.
create function public.get_chat(p_group uuid default null, p_plan uuid default null)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when not public.can_read_chat(p_group, p_plan, auth.uid()) then null else
    jsonb_build_object(
      'title', coalesce((select name from public.groups where id = p_group), (select title from public.plans where id = p_plan)),
      'closed_reason', public.chat_closed_reason(p_group, p_plan),
      'muted', coalesce((select muted from public.chat_reads
                         where user_id = auth.uid()
                           and (group_id = p_group or plan_id = p_plan)), false),
      'is_moderator', case
        when p_group is not null then public.is_group_owner(p_group, auth.uid())
        else exists (select 1 from public.plans where id = p_plan and creator_id = auth.uid())
      end
    )
  end;
$$;

-- "Lo mío": chats con último mensaje y no leídos (AC-24).
create function public.list_my_chats()
returns table (
  group_id uuid,
  plan_id uuid,
  title text,
  category_id smallint,
  image_url text,
  plan_status text,
  last_message jsonb,
  last_activity_at timestamptz,
  unread int,
  muted boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with chats as (
    select g.id as group_id, null::uuid as plan_id, g.name as title, g.category_id, g.image_url, null::text as plan_status,
           g.created_at as since
    from public.group_members m
    join public.groups g on g.id = m.group_id
    where m.user_id = auth.uid() and m.status = 'active' and g.deleted_at is null
    union all
    select null, p.id, p.title, p.category_id, null, public.plan_status(p.starts_at, p.ends_at, p.cancelled_at), p.created_at
    from public.plan_participants pp
    join public.plans p on p.id = pp.plan_id
    where pp.user_id = auth.uid() and pp.removed_at is null
  )
  select c.group_id, c.plan_id, c.title, c.category_id, c.image_url, c.plan_status,
         public.message_view(last_msg),
         coalesce(last_msg.created_at, c.since),
         (select count(*)::int
          from public.messages m
          where (m.group_id = c.group_id or m.plan_id = c.plan_id)
            and m.created_at > coalesce(r.last_read_at, '-infinity')
            and m.sender_id is distinct from auth.uid()
            and m.kind = 'text'
            and m.deleted_by is null
            and (m.sender_id is null or not public.is_blocked(auth.uid(), m.sender_id))),
         coalesce(r.muted, false)
  from chats c
  left join public.chat_reads r
    on r.user_id = auth.uid() and (r.group_id = c.group_id or r.plan_id = c.plan_id)
  left join lateral (
    select m.* from public.messages m
    where (m.group_id = c.group_id or m.plan_id = c.plan_id)
      and (m.sender_id is null or not public.is_blocked(auth.uid(), m.sender_id))
    order by m.created_at desc, m.id desc
    limit 1
  ) last_msg on true
  order by 8 desc;
$$;

-- ── Permisos ────────────────────────────────────────────────────────────────

alter table public.messages enable row level security;
alter table public.chat_reads enable row level security;

revoke all on public.messages, public.chat_reads from anon, authenticated;
grant select on public.messages, public.chat_reads to authenticated;

-- La lectura directa existe para el tiempo real (Supabase Realtime respeta estas políticas).
-- La app lee el contenido con list_messages/get_message, que ocultan el texto borrado.
create policy "Mensajes: integrantes del chat, sin bloqueados"
  on public.messages for select to authenticated
  using (public.can_see_message(messages));

create policy "Leídos: cada uno los suyos"
  on public.chat_reads for select to authenticated
  using (user_id = (select auth.uid()));

alter publication supabase_realtime add table public.messages;

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.can_read_chat(uuid, uuid, uuid)',
    'public.chat_closed_reason(uuid, uuid)',
    'public.send_message(text, uuid, uuid)',
    'public.delete_message(uuid)',
    'public.mark_read(uuid, uuid)',
    'public.set_chat_muted(boolean, uuid, uuid)',
    'public.message_view(public.messages)',
    'public.can_see_message(public.messages)',
    'public.list_messages(uuid, uuid, timestamptz, uuid, int)',
    'public.get_message(uuid)',
    'public.get_chat(uuid, uuid)',
    'public.list_my_chats()'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;

-- Solo para uso interno.
revoke execute on function public.post_system_message(uuid, uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.group_members_announce_join() from public, anon, authenticated;
revoke execute on function public.plan_participants_announce() from public, anon, authenticated;
revoke execute on function public.plans_announce_changes() from public, anon, authenticated;
