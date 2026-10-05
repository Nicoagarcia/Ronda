-- Hito 3 · Planes (docs/specs/03-planes.md).
-- También completa lo pendiente de la spec 02: salir, ser expulsado o eliminar un grupo cancela planes.
-- El chat del plan (motivo de cancelación, mensajes del sistema) llega en el Hito 4;
-- las notificaciones (plan nuevo, cambios, recordatorios) en el Hito 5.

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 3 and 60),
  description text check (char_length(description) <= 500),
  category_id smallint not null references public.interests (id),
  city_id smallint not null references public.cities (id),
  group_id uuid references public.groups (id) on delete cascade,
  place_name text not null check (char_length(btrim(place_name)) between 2 and 80),
  zone text check (char_length(zone) <= 40),
  is_private_place boolean not null default false,
  starts_at timestamptz not null,
  ends_at timestamptz,
  max_participants int not null check (max_participants between 2 and 100),
  participant_count int not null default 0,
  creator_id uuid not null references public.profiles (id) on delete cascade,
  cancelled_at timestamptz,
  cancel_reason text check (char_length(cancel_reason) <= 300),
  hidden_at timestamptz, -- ocultado por moderación (spec 06)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- AC-02: el fin, si está, va después del inicio y dura como máximo 12 h.
  constraint plans_fin_valido check (ends_at is null or (ends_at > starts_at and ends_at <= starts_at + interval '12 hours'))
);

create index plans_discover_idx on public.plans (city_id, starts_at) where cancelled_at is null;
create index plans_group_idx on public.plans (group_id, starts_at);
create index plans_creator_idx on public.plans (creator_id, starts_at);

create trigger plans_updated_at
before update on public.plans
for each row execute function public.set_updated_at();

-- La dirección de un domicilio va aparte: así solo la leen los participantes (AC-22).
create table public.plan_private_details (
  plan_id uuid primary key references public.plans (id) on delete cascade,
  address text not null check (char_length(btrim(address)) between 3 and 200)
);

create table public.plan_participants (
  plan_id uuid not null references public.plans (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  removed_at timestamptz,        -- sacado por el creador: no vuelve ni ve el plan (AC-21)
  reminder_sent_at timestamptz,  -- Hito 5
  primary key (plan_id, user_id)
);

create index plan_participants_user_idx on public.plan_participants (user_id) where removed_at is null;

create function public.plan_participants_sync_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan uuid := coalesce(new.plan_id, old.plan_id);
begin
  update public.plans
  set participant_count = (select count(*) from public.plan_participants where plan_id = v_plan and removed_at is null)
  where id = v_plan;
  return null;
end;
$$;

create trigger plan_participants_sync_count
after insert or update of removed_at or delete on public.plan_participants
for each row execute function public.plan_participants_sync_count();

-- ── Estado ──────────────────────────────────────────────────────────────────
-- Se calcula con las fechas; no se guarda. Sin fin cargado se asume 3 h (AC-07).

create function public.plan_effective_end(p_starts_at timestamptz, p_ends_at timestamptz)
returns timestamptz
language sql
immutable
set search_path = ''
as $$
  select coalesce(p_ends_at, p_starts_at + interval '3 hours');
$$;

create function public.plan_status(p_starts_at timestamptz, p_ends_at timestamptz, p_cancelled_at timestamptz)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when p_cancelled_at is not null then 'cancelled'
    when now() < p_starts_at then 'upcoming'
    when now() < public.plan_effective_end(p_starts_at, p_ends_at) then 'ongoing'
    else 'finished'
  end;
$$;

create view public.plans_with_status
with (security_invoker = true)
as
select p.*, public.plan_status(p.starts_at, p.ends_at, p.cancelled_at) as status
from public.plans p;

-- ── Auxiliares ──────────────────────────────────────────────────────────────

create function public.is_plan_participant(p_plan uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.plan_participants
    where plan_id = p_plan and user_id = p_user and removed_at is null
  );
$$;

-- Visibilidad (spec 03): participantes siempre; si no, según el tipo de plan.
create function public.can_see_plan(p_plan uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
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

-- Valida inicio, fin y domicilio. Lo usan create_plan y update_plan.
create function public.validate_plan_input(
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_check_start boolean,
  p_group uuid,
  p_is_private_place boolean,
  p_address text
)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_check_start then
    if p_starts_at < now() + interval '30 minutes' then
      raise exception 'El plan tiene que empezar al menos 30 minutos después de ahora' using errcode = 'P0001';
    end if;
    if p_starts_at > now() + interval '60 days' then
      raise exception 'El plan puede ser como máximo dentro de 60 días' using errcode = 'P0001';
    end if;
  end if;

  if p_ends_at is not null and p_ends_at <= p_starts_at then
    raise exception 'El fin tiene que ser después del inicio' using errcode = 'P0001';
  end if;
  if p_ends_at is not null and p_ends_at > p_starts_at + interval '12 hours' then
    raise exception 'El plan puede durar como máximo 12 horas' using errcode = 'P0001';
  end if;

  -- AC-04 y AC-05: domicilio solo en grupos con aprobación, y con dirección.
  if p_is_private_place then
    if p_group is null or (select access from public.groups where id = p_group) <> 'approval' then
      raise exception 'Los planes en un domicilio solo se pueden crear en grupos con aprobación' using errcode = 'P0001';
    end if;
    if coalesce(char_length(btrim(p_address)), 0) < 3 then
      raise exception 'Falta la dirección del domicilio' using errcode = 'P0001';
    end if;
  end if;
end;
$$;

-- ── Crear, editar, cancelar ─────────────────────────────────────────────────

create function public.create_plan(
  p_title text,
  p_category_id smallint,
  p_place_name text,
  p_starts_at timestamptz,
  p_max_participants int,
  p_description text default null,
  p_zone text default null,
  p_ends_at timestamptz default null,
  p_group_id uuid default null,
  p_is_private_place boolean default false,
  p_address text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_city smallint;
  v_id uuid;
begin
  if not public.is_active_user() then
    raise exception 'Tenés que completar tu perfil' using errcode = '42501';
  end if;

  -- AC-03: en un grupo, solo sus miembros.
  if p_group_id is not null then
    if not public.is_group_member(p_group_id, v_me)
       or not exists (select 1 from public.groups where id = p_group_id and deleted_at is null) then
      raise exception 'Solo los miembros del grupo pueden crear planes en él' using errcode = '42501';
    end if;
    select city_id into v_city from public.groups where id = p_group_id;
  else
    select city_id into v_city from public.profiles where id = v_me;
  end if;

  perform public.validate_plan_input(p_starts_at, p_ends_at, true, p_group_id, p_is_private_place, p_address);

  -- AC-06: hasta 10 planes próximos creados.
  if (select count(*) from public.plans
      where creator_id = v_me and cancelled_at is null and starts_at > now()) >= 10 then
    raise exception 'Ya tenés 10 planes próximos. Esperá a que pase alguno o cancelá uno.' using errcode = 'P0001';
  end if;

  insert into public.plans (title, description, category_id, city_id, group_id, place_name, zone,
                            is_private_place, starts_at, ends_at, max_participants, creator_id)
  values (btrim(p_title), nullif(btrim(p_description), ''), p_category_id, v_city, p_group_id, btrim(p_place_name),
          nullif(btrim(p_zone), ''), p_is_private_place, p_starts_at, p_ends_at, p_max_participants, v_me)
  returning id into v_id;

  insert into public.plan_participants (plan_id, user_id) values (v_id, v_me);

  if p_is_private_place then
    insert into public.plan_private_details (plan_id, address) values (v_id, btrim(p_address));
  end if;

  if p_group_id is not null then
    update public.groups set last_activity_at = now() where id = p_group_id;
  end if;

  return v_id;
end;
$$;

-- Devuelve true si cambió la fecha, la hora o el lugar: eso se avisa a los participantes (AC-27, Hito 5).
create function public.update_plan(
  p_plan uuid,
  p_title text,
  p_category_id smallint,
  p_place_name text,
  p_starts_at timestamptz,
  p_max_participants int,
  p_description text default null,
  p_zone text default null,
  p_ends_at timestamptz default null,
  p_is_private_place boolean default false,
  p_address text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.plans;
  v_old_address text;
  v_changed boolean;
begin
  select * into v_plan from public.plans where id = p_plan for update;

  if not found or v_plan.creator_id <> auth.uid() then
    raise exception 'Solo el creador puede editar el plan' using errcode = '42501';
  end if;

  -- AC-25
  if public.plan_status(v_plan.starts_at, v_plan.ends_at, v_plan.cancelled_at) <> 'upcoming' then
    raise exception 'Solo se puede editar un plan que todavía no empezó' using errcode = 'P0001';
  end if;

  -- La regla de 30 minutos y 60 días aplica solo si se cambia el inicio.
  perform public.validate_plan_input(p_starts_at, p_ends_at, p_starts_at <> v_plan.starts_at,
                                     v_plan.group_id, p_is_private_place, p_address);

  select address into v_old_address from public.plan_private_details where plan_id = p_plan;

  v_changed := p_starts_at <> v_plan.starts_at
            or p_ends_at is distinct from v_plan.ends_at
            or btrim(p_place_name) <> v_plan.place_name
            or nullif(btrim(p_zone), '') is distinct from v_plan.zone
            or p_is_private_place <> v_plan.is_private_place
            or (p_is_private_place and btrim(p_address) is distinct from v_old_address);

  update public.plans
  set title = btrim(p_title),
      description = nullif(btrim(p_description), ''),
      category_id = p_category_id,
      place_name = btrim(p_place_name),
      zone = nullif(btrim(p_zone), ''),
      is_private_place = p_is_private_place,
      starts_at = p_starts_at,
      ends_at = p_ends_at,
      max_participants = p_max_participants
  where id = p_plan;

  if p_is_private_place then
    insert into public.plan_private_details (plan_id, address) values (p_plan, btrim(p_address))
    on conflict (plan_id) do update set address = excluded.address;
  else
    delete from public.plan_private_details where plan_id = p_plan;
  end if;

  return v_changed;
end;
$$;

-- Cancela sin chequear permisos. La usan cancel_plan y las cancelaciones automáticas.
create function public.cancel_plan_internal(p_plan uuid, p_reason text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.plans
  set cancelled_at = now(), cancel_reason = nullif(btrim(p_reason), '')
  where id = p_plan and cancelled_at is null;
  -- Hito 4: publicar el motivo en el chat. Hito 5: avisar a los participantes.
$$;

-- AC-25, AC-28
create function public.cancel_plan(p_plan uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.plans;
begin
  select * into v_plan from public.plans where id = p_plan for update;

  if not found or v_plan.creator_id <> auth.uid() then
    raise exception 'Solo el creador puede cancelar el plan' using errcode = '42501';
  end if;

  if public.plan_status(v_plan.starts_at, v_plan.ends_at, v_plan.cancelled_at) <> 'upcoming' then
    raise exception 'Solo se puede cancelar un plan que todavía no empezó' using errcode = 'P0001';
  end if;

  perform public.cancel_plan_internal(p_plan, p_reason);
end;
$$;

-- ── Unirse, salirse, sacar ──────────────────────────────────────────────────

-- AC-15: el aviso de seguridad se acepta una vez.
create function public.accept_safety_notice()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles set safety_notice_accepted_at = coalesce(safety_notice_accepted_at, now())
  where id = auth.uid();
$$;

create function public.join_plan(p_plan uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_plan public.plans;
  v_status text;
begin
  if not public.is_active_user() then
    raise exception 'Tenés que completar tu perfil' using errcode = '42501';
  end if;

  if (select safety_notice_accepted_at from public.profiles where id = v_me) is null then
    raise exception 'Primero aceptá el aviso de seguridad' using errcode = 'P0001';
  end if;

  -- Bloquea la fila: si dos van por el último lugar, entra uno solo (AC-14).
  select * into v_plan from public.plans where id = p_plan for update;

  if not found or not public.can_see_plan(p_plan) then
    raise exception 'El plan no existe' using errcode = 'P0001';
  end if;

  if public.is_plan_participant(p_plan, v_me) then
    raise exception 'Ya estás en este plan' using errcode = 'P0001';
  end if;

  v_status := public.plan_status(v_plan.starts_at, v_plan.ends_at, v_plan.cancelled_at);
  if v_status = 'cancelled' then
    raise exception 'Este plan fue cancelado' using errcode = 'P0001';
  elsif v_status <> 'upcoming' then
    -- AC-17
    raise exception 'Este plan ya empezó' using errcode = 'P0001';
  end if;

  if v_plan.participant_count >= v_plan.max_participants then
    raise exception 'El plan se llenó' using errcode = 'P0001';
  end if;

  insert into public.plan_participants (plan_id, user_id) values (p_plan, v_me);
end;
$$;

-- AC-16, AC-17, AC-18
create function public.leave_plan(p_plan uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.plans;
begin
  select * into v_plan from public.plans where id = p_plan for update;

  if not found or not public.is_plan_participant(p_plan, auth.uid()) then
    raise exception 'No estás en este plan' using errcode = 'P0001';
  end if;

  if v_plan.creator_id = auth.uid() then
    raise exception 'El creador no puede bajarse: puede cancelar el plan' using errcode = 'P0001';
  end if;

  if public.plan_status(v_plan.starts_at, v_plan.ends_at, v_plan.cancelled_at) <> 'upcoming' then
    raise exception 'El plan ya empezó: no podés bajarte' using errcode = 'P0001';
  end if;

  delete from public.plan_participants where plan_id = p_plan and user_id = auth.uid();
end;
$$;

-- AC-21
create function public.remove_participant(p_plan uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.plans where id = p_plan and creator_id = auth.uid()) then
    raise exception 'Solo el creador puede sacar participantes' using errcode = '42501';
  end if;

  if p_user = auth.uid() then
    raise exception 'No podés sacarte del plan' using errcode = 'P0001';
  end if;

  update public.plan_participants set removed_at = now()
  where plan_id = p_plan and user_id = p_user and removed_at is null;

  if not found then
    raise exception 'Esa persona no está en el plan' using errcode = 'P0001';
  end if;
end;
$$;

-- ── Efectos sobre planes al salir de un grupo (spec 02, AC-23 y AC-24) ──────

create function public.apply_group_exit_to_plans(p_group uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan uuid;
begin
  -- Sus planes futuros en el grupo se cancelan.
  for v_plan in
    select id from public.plans
    where group_id = p_group and creator_id = p_user and cancelled_at is null and starts_at > now()
  loop
    perform public.cancel_plan_internal(v_plan, null);
  end loop;

  -- En un grupo con aprobación, sale también de los planes futuros a los que se había sumado.
  if (select access from public.groups where id = p_group) = 'approval' then
    delete from public.plan_participants pp
    using public.plans p
    where pp.plan_id = p.id and p.group_id = p_group and pp.user_id = p_user
      and p.starts_at > now() and pp.removed_at is null;
  end if;
end;
$$;

create or replace function public.leave_group(p_group uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_group_owner(p_group, auth.uid()) then
    raise exception 'El creador no puede salirse: puede eliminar el grupo' using errcode = 'P0001';
  end if;

  delete from public.group_members
  where group_id = p_group and user_id = auth.uid() and status = 'active';

  if found then
    perform public.apply_group_exit_to_plans(p_group, auth.uid());
  end if;
end;
$$;

create or replace function public.remove_member(p_group uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_group_owner(p_group, auth.uid()) then
    raise exception 'Solo el creador puede expulsar miembros' using errcode = '42501';
  end if;

  if p_user = auth.uid() then
    raise exception 'No podés expulsarte' using errcode = 'P0001';
  end if;

  update public.group_members
  set status = 'banned', decided_at = now()
  where group_id = p_group and user_id = p_user and status in ('active', 'pending');

  if not found then
    raise exception 'Esa persona no es parte del grupo' using errcode = 'P0001';
  end if;

  perform public.apply_group_exit_to_plans(p_group, p_user);
end;
$$;

-- AC-30 de la spec 02: eliminar el grupo cancela sus planes futuros.
create or replace function public.delete_group(p_group uuid, p_confirm_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group public.groups;
  v_plan uuid;
begin
  select * into v_group from public.groups where id = p_group and deleted_at is null for update;

  if not found or v_group.owner_id <> auth.uid() then
    raise exception 'Solo el creador puede eliminar el grupo' using errcode = '42501';
  end if;

  if btrim(p_confirm_name) <> v_group.name then
    raise exception 'El nombre no coincide' using errcode = 'P0001';
  end if;

  update public.groups set deleted_at = now() where id = p_group;

  for v_plan in
    select id from public.plans where group_id = p_group and cancelled_at is null and starts_at > now()
  loop
    perform public.cancel_plan_internal(v_plan, 'Se eliminó el grupo');
  end loop;
end;
$$;

-- ── Compartir contexto: suma planes compartidos, aunque hayan terminado (AC-20) ─

create or replace function public.shares_context(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_members ma
    join public.group_members mb on mb.group_id = ma.group_id
    join public.groups g on g.id = ma.group_id and g.deleted_at is null
    where ma.user_id = a and ma.status = 'active'
      and mb.user_id = b and mb.status = 'active'
  )
  or exists (
    select 1
    from public.groups g
    join public.group_members m on m.group_id = g.id
    where g.owner_id = a and g.deleted_at is null
      and m.user_id = b and m.status = 'pending'
  )
  or exists (
    select 1
    from public.plan_participants pa
    join public.plan_participants pb on pb.plan_id = pa.plan_id
    where pa.user_id = a and pa.removed_at is null
      and pb.user_id = b and pb.removed_at is null
  );
$$;

-- ── Lecturas ────────────────────────────────────────────────────────────────

-- Fotos de hasta n participantes, sin personas bloqueadas.
create function public.plan_preview(p_plan uuid, p_limit int)
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
    order by (p.id = pl.creator_id) desc, pp.joined_at
    limit p_limit
  ) x;
$$;

-- Descubrir (spec 03): próximos, de la ciudad, visibles; el más cercano primero (AC-08 a AC-11).
create function public.discover_plans(
  p_category smallint default null,
  p_search text default null,
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  id uuid,
  title text,
  category_id smallint,
  starts_at timestamptz,
  ends_at timestamptz,
  place_name text,
  zone text,
  is_private_place boolean,
  participant_count int,
  max_participants int,
  is_full boolean,
  group_id uuid,
  group_name text,
  am_participant boolean,
  preview jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.title, p.category_id, p.starts_at, p.ends_at, p.place_name, p.zone, p.is_private_place,
         p.participant_count, p.max_participants, p.participant_count >= p.max_participants,
         p.group_id, g.name, public.is_plan_participant(p.id, auth.uid()), public.plan_preview(p.id, 3)
  from public.plans p
  left join public.groups g on g.id = p.group_id
  where public.is_active_user()
    and p.city_id = (select city_id from public.profiles where id = auth.uid())
    and p.cancelled_at is null
    and p.starts_at > now()
    and p.hidden_at is null
    and public.can_see_plan(p.id)
    and (p_category is null or p.category_id = p_category)
    and (p_search is null or btrim(p_search) = ''
         or public.normalize_text(p.title || ' ' || coalesce(p.description, '') || ' ' || p.place_name)
            like '%' || public.normalize_text(btrim(p_search)) || '%')
  order by p.starts_at
  limit least(p_limit, 100) offset p_offset;
$$;

-- Detalle. null = no existe o no es visible. La dirección solo para participantes (AC-22, AC-23).
create function public.get_plan(p_plan uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_plan public.plans;
  v_is_participant boolean;
begin
  if not public.is_active_user() or not public.can_see_plan(p_plan) then
    return null;
  end if;

  select * into v_plan from public.plans where id = p_plan;
  v_is_participant := public.is_plan_participant(p_plan, v_me);

  return jsonb_build_object(
    'id', v_plan.id,
    'title', v_plan.title,
    'description', v_plan.description,
    'category_id', v_plan.category_id,
    'place_name', v_plan.place_name,
    'zone', v_plan.zone,
    'is_private_place', v_plan.is_private_place,
    'address', case when v_is_participant then
      (select address from public.plan_private_details where plan_id = p_plan) end,
    'starts_at', v_plan.starts_at,
    'ends_at', v_plan.ends_at,
    'effective_end', public.plan_effective_end(v_plan.starts_at, v_plan.ends_at),
    'status', public.plan_status(v_plan.starts_at, v_plan.ends_at, v_plan.cancelled_at),
    'cancel_reason', v_plan.cancel_reason,
    'max_participants', v_plan.max_participants,
    'participant_count', v_plan.participant_count,
    'is_full', v_plan.participant_count >= v_plan.max_participants,
    'creator_id', v_plan.creator_id,
    'is_creator', v_plan.creator_id = v_me,
    'am_participant', v_is_participant,
    'safety_notice_accepted', (select safety_notice_accepted_at is not null from public.profiles where id = v_me),
    'group', (select jsonb_build_object('id', g.id, 'name', g.name, 'access', g.access)
              from public.groups g where g.id = v_plan.group_id and g.deleted_at is null),
    -- AC-19: quien ve el plan ve la lista completa.
    'participants', public.plan_preview(p_plan, 1000)
  );
end;
$$;

-- "Lo mío": planes donde participo (próximos y pasados; la app los separa por estado).
create function public.list_my_plans()
returns table (
  id uuid,
  title text,
  category_id smallint,
  starts_at timestamptz,
  ends_at timestamptz,
  place_name text,
  zone text,
  participant_count int,
  max_participants int,
  group_name text,
  status text,
  is_creator boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.title, p.category_id, p.starts_at, p.ends_at, p.place_name, p.zone,
         p.participant_count, p.max_participants, g.name,
         public.plan_status(p.starts_at, p.ends_at, p.cancelled_at), p.creator_id = auth.uid()
  from public.plan_participants pp
  join public.plans p on p.id = pp.plan_id
  left join public.groups g on g.id = p.group_id
  where pp.user_id = auth.uid() and pp.removed_at is null
  order by p.starts_at;
$$;

-- Planes próximos de un grupo, para su pantalla de detalle.
create function public.list_group_plans(p_group uuid)
returns table (
  id uuid,
  title text,
  category_id smallint,
  starts_at timestamptz,
  place_name text,
  zone text,
  participant_count int,
  max_participants int,
  am_participant boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.title, p.category_id, p.starts_at, p.place_name, p.zone,
         p.participant_count, p.max_participants, public.is_plan_participant(p.id, auth.uid())
  from public.plans p
  where p.group_id = p_group
    and p.cancelled_at is null
    and public.plan_effective_end(p.starts_at, p.ends_at) > now()
    and public.can_see_plan(p.id)
  order by p.starts_at;
$$;

-- ── Perfil extendido: suma planes próximos visibles para quien mira ─────────

create or replace function public.get_profile(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_profile public.profiles;
  v_result jsonb;
  v_extended boolean;
begin
  if v_me is null then
    return null;
  end if;

  select * into v_profile from public.profiles where id = p_id;

  if not found
    or (p_id <> v_me and (not public.is_active_user()
                          or not public.is_active_profile(p_id)
                          or public.is_blocked(v_me, p_id))) then
    return null;
  end if;

  v_extended := p_id = v_me or public.shares_context(v_me, p_id);

  v_result := jsonb_build_object(
    'id', v_profile.id,
    'name', v_profile.name,
    'avatar_url', v_profile.avatar_url,
    'age', public.age_from_birthdate(v_profile.birthdate),
    'city', (select c.name from public.cities c where c.id = v_profile.city_id),
    'interests', coalesce((
      select jsonb_agg(jsonb_build_object('id', i.id, 'slug', i.slug, 'name', i.name, 'emoji', i.emoji)
                       order by i.position)
      from public.profile_interests pi
      join public.interests i on i.id = pi.interest_id
      where pi.profile_id = p_id
    ), '[]'::jsonb),
    'extended', v_extended
  );

  if v_extended then
    v_result := v_result || jsonb_build_object(
      'bio', v_profile.bio,
      'groups', coalesce((
        select jsonb_agg(jsonb_build_object('id', g.id, 'name', g.name, 'category_id', g.category_id,
                                            'image_url', g.image_url, 'member_count', g.member_count,
                                            'max_members', g.max_members)
                         order by g.name)
        from public.group_members m
        join public.groups g on g.id = m.group_id
        where m.user_id = p_id and m.status = 'active'
          and public.can_see_group(g.id)
          and g.hidden_at is null
      ), '[]'::jsonb),
      'plans', coalesce((
        select jsonb_agg(jsonb_build_object('id', p.id, 'title', p.title, 'category_id', p.category_id,
                                            'starts_at', p.starts_at, 'place_name', p.place_name, 'zone', p.zone,
                                            'is_private_place', p.is_private_place,
                                            'participant_count', p.participant_count,
                                            'max_participants', p.max_participants)
                         order by p.starts_at)
        from public.plan_participants pp
        join public.plans p on p.id = pp.plan_id
        where pp.user_id = p_id and pp.removed_at is null
          and p.cancelled_at is null and p.starts_at > now()
          and p.hidden_at is null
          and public.can_see_plan(p.id)
      ), '[]'::jsonb)
    );
  end if;

  return v_result;
end;
$$;

-- ── Permisos ────────────────────────────────────────────────────────────────

alter table public.plans enable row level security;
alter table public.plan_private_details enable row level security;
alter table public.plan_participants enable row level security;

revoke all on public.plans, public.plan_private_details, public.plan_participants, public.plans_with_status
  from anon, authenticated;
grant select on public.plans, public.plan_private_details, public.plan_participants, public.plans_with_status
  to authenticated;

create policy "Planes: visibles según can_see_plan"
  on public.plans for select to authenticated
  using (public.can_see_plan(id));

create policy "Participantes: los ve quien ve el plan"
  on public.plan_participants for select to authenticated
  using (removed_at is null and public.can_see_plan(plan_id));

create policy "Dirección: solo participantes"
  on public.plan_private_details for select to authenticated
  using (public.is_plan_participant(plan_id, (select auth.uid())));

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.plan_effective_end(timestamptz, timestamptz)',
    'public.plan_status(timestamptz, timestamptz, timestamptz)',
    'public.is_plan_participant(uuid, uuid)',
    'public.can_see_plan(uuid)',
    'public.create_plan(text, smallint, text, timestamptz, int, text, text, timestamptz, uuid, boolean, text)',
    'public.update_plan(uuid, text, smallint, text, timestamptz, int, text, text, timestamptz, boolean, text)',
    'public.cancel_plan(uuid, text)',
    'public.accept_safety_notice()',
    'public.join_plan(uuid)',
    'public.leave_plan(uuid)',
    'public.remove_participant(uuid, uuid)',
    'public.plan_preview(uuid, int)',
    'public.discover_plans(smallint, text, int, int)',
    'public.get_plan(uuid)',
    'public.list_my_plans()',
    'public.list_group_plans(uuid)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;

-- Solo para uso interno de otras funciones.
revoke execute on function public.validate_plan_input(timestamptz, timestamptz, boolean, uuid, boolean, text) from public, anon, authenticated;
revoke execute on function public.cancel_plan_internal(uuid, text) from public, anon, authenticated;
revoke execute on function public.apply_group_exit_to_plans(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.plan_participants_sync_count() from public, anon, authenticated;
