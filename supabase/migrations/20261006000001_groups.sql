-- Hito 2 · Grupos (docs/specs/02-grupos.md).
--
-- La app no escribe estas tablas directo: todo pasa por las funciones de abajo,
-- que validan cupo, permisos, bloqueos y límites en una transacción.
-- Lo que depende de planes y chat (cancelar planes al salir, etc.) se suma en los hitos 3 y 4.

create extension if not exists unaccent with schema extensions;

-- Para buscar sin importar tildes: "psicologia" encuentra "Psicología" (AC-06).
create function public.normalize_text(t text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(t, '')));
$$;

create type public.group_access as enum ('open', 'approval');
create type public.group_role as enum ('owner', 'member');
create type public.member_status as enum ('pending', 'active', 'rejected', 'banned');

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 3 and 50),
  description text not null check (char_length(btrim(description)) between 10 and 500),
  image_url text,
  category_id smallint not null references public.interests (id),
  city_id smallint not null references public.cities (id),
  zone text check (char_length(zone) <= 40),
  access public.group_access not null,
  max_members int not null check (max_members between 2 and 500),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  member_count int not null default 0,
  last_activity_at timestamptz not null default now(),
  hidden_at timestamptz,   -- ocultado por moderación (spec 06)
  deleted_at timestamptz,  -- eliminado por el creador; se purga a los 30 días
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index groups_discover_idx on public.groups (city_id, last_activity_at desc) where deleted_at is null;
create index groups_owner_idx on public.groups (owner_id) where deleted_at is null;

create trigger groups_updated_at
before update on public.groups
for each row execute function public.set_updated_at();

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.group_role not null default 'member',
  status public.member_status not null,
  requested_at timestamptz,
  decided_at timestamptz,
  joined_at timestamptz,
  rejoin_after timestamptz, -- rechazado: puede volver a pedir ingreso desde esta fecha
  primary key (group_id, user_id)
);

create index group_members_user_idx on public.group_members (user_id, status);
create index group_members_pending_idx on public.group_members (group_id, requested_at) where status = 'pending';

-- member_count siempre refleja los miembros activos.
create function public.group_members_sync_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group uuid := coalesce(new.group_id, old.group_id);
begin
  update public.groups
  set member_count = (select count(*) from public.group_members where group_id = v_group and status = 'active')
  where id = v_group;
  return null;
end;
$$;

create trigger group_members_sync_count
after insert or update of status or delete on public.group_members
for each row execute function public.group_members_sync_count();

-- ── Auxiliares ──────────────────────────────────────────────────────────────

create function public.is_group_member(p_group uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group and user_id = p_user and status = 'active'
  );
$$;

create function public.is_group_owner(p_group uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.groups
    where id = p_group and owner_id = p_user and deleted_at is null
  );
$$;

-- Visible para el usuario actual: no eliminado, no expulsado, sin bloqueo con el creador (spec 02).
create function public.can_see_group(p_group uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
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

-- ¿Comparten algo? Desde la perspectiva de quien mira (a):
--   · son miembros activos del mismo grupo (AC-21), o
--   · a es creador de un grupo donde b pidió ingreso (AC-17).
-- Los planes se suman en el Hito 3.
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
  );
$$;

-- ── Permisos ────────────────────────────────────────────────────────────────

alter table public.groups enable row level security;
alter table public.group_members enable row level security;

revoke all on public.groups, public.group_members from anon, authenticated;
grant select on public.groups, public.group_members to authenticated;

create policy "Grupos: visibles según can_see_group"
  on public.groups for select to authenticated
  using (public.can_see_group(id));

create policy "Membresías: cada uno ve las suyas"
  on public.group_members for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Membresías: los miembros ven a los miembros activos"
  on public.group_members for select to authenticated
  using (status = 'active' and public.is_group_member(group_id, (select auth.uid())));

create policy "Membresías: el creador ve las solicitudes"
  on public.group_members for select to authenticated
  using (status = 'pending' and public.is_group_owner(group_id, (select auth.uid())));

-- ── Crear y editar ──────────────────────────────────────────────────────────

create function public.create_group(
  p_name text,
  p_description text,
  p_category_id smallint,
  p_max_members int,
  p_access public.group_access,
  p_zone text default null,
  p_image_url text default null
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

  -- AC-03: hasta 10 grupos creados a la vez.
  if (select count(*) from public.groups where owner_id = v_me and deleted_at is null) >= 10 then
    raise exception 'Ya creaste 10 grupos. Eliminá uno para crear otro.' using errcode = 'P0001';
  end if;

  select city_id into v_city from public.profiles where id = v_me;

  insert into public.groups (name, description, category_id, city_id, zone, access, max_members, owner_id, image_url)
  values (btrim(p_name), btrim(p_description), p_category_id, v_city, nullif(btrim(p_zone), ''), p_access,
          p_max_members, v_me, p_image_url)
  returning id into v_id;

  insert into public.group_members (group_id, user_id, role, status, joined_at)
  values (v_id, v_me, 'owner', 'active', now());

  return v_id;
end;
$$;

-- Reemplaza todos los campos editables (spec 02, "Editar").
create function public.update_group(
  p_group uuid,
  p_name text,
  p_description text,
  p_category_id smallint,
  p_max_members int,
  p_access public.group_access,
  p_zone text default null,
  p_image_url text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group public.groups;
  v_free int;
begin
  select * into v_group from public.groups where id = p_group and deleted_at is null for update;

  if not found or v_group.owner_id <> auth.uid() then
    raise exception 'Solo el creador puede editar el grupo' using errcode = '42501';
  end if;

  update public.groups
  set name = btrim(p_name),
      description = btrim(p_description),
      category_id = p_category_id,
      zone = nullif(btrim(p_zone), ''),
      max_members = p_max_members,
      access = p_access,
      image_url = p_image_url
  where id = p_group;

  -- AC-28: de "con aprobación" a "abierto", entran las solicitudes más viejas hasta llenar el cupo.
  -- Las que no entran se rechazan sin espera para volver a pedir.
  if v_group.access = 'approval' and p_access = 'open' then
    v_free := greatest(p_max_members - v_group.member_count, 0);

    update public.group_members m
    set status = 'active', joined_at = now(), decided_at = now()
    where m.group_id = p_group
      and m.user_id in (
        select user_id from public.group_members
        where group_id = p_group and status = 'pending'
        order by requested_at
        limit v_free
      );

    update public.group_members
    set status = 'rejected', decided_at = now(), rejoin_after = now()
    where group_id = p_group and status = 'pending';
  end if;
end;
$$;

-- ── Unirse y solicitudes ────────────────────────────────────────────────────

-- Devuelve 'joined' (abierto) o 'requested' (con aprobación).
create function public.join_group(p_group uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_group public.groups;
  v_member public.group_members;
begin
  if not public.is_active_user() then
    raise exception 'Tenés que completar tu perfil' using errcode = '42501';
  end if;

  -- Bloquea la fila del grupo: si dos personas van por el último lugar, entra una sola (AC-12).
  select * into v_group from public.groups where id = p_group and deleted_at is null for update;

  if not found or public.is_blocked(v_me, v_group.owner_id) then
    raise exception 'El grupo no existe' using errcode = 'P0001';
  end if;

  select * into v_member from public.group_members where group_id = p_group and user_id = v_me;

  if found then
    case v_member.status
      when 'active' then raise exception 'Ya sos parte de este grupo' using errcode = 'P0001';
      when 'pending' then raise exception 'Ya pediste ingreso a este grupo' using errcode = 'P0001';
      when 'banned' then raise exception 'Ya no sos parte de este grupo' using errcode = 'P0001';
      when 'rejected' then
        -- AC-15: después de un rechazo, esperar 7 días.
        if v_member.rejoin_after > now() then
          raise exception 'Podés volver a pedir ingreso a partir del %',
            to_char(v_member.rejoin_after at time zone 'America/Argentina/Buenos_Aires', 'DD/MM')
            using errcode = 'P0001';
        end if;
    end case;
  end if;

  if v_group.member_count >= v_group.max_members then
    raise exception 'El grupo se llenó' using errcode = 'P0001';
  end if;

  if v_group.access = 'open' then
    insert into public.group_members (group_id, user_id, role, status, joined_at)
    values (p_group, v_me, 'member', 'active', now())
    on conflict (group_id, user_id) do update
      set status = 'active', joined_at = now(), decided_at = null, requested_at = null, rejoin_after = null;
    return 'joined';
  end if;

  -- AC-16: hasta 20 solicitudes pendientes.
  if (select count(*) from public.group_members where user_id = v_me and status = 'pending') >= 20 then
    raise exception 'Tenés 20 solicitudes pendientes. Esperá que te respondan o cancelá alguna.' using errcode = 'P0001';
  end if;

  insert into public.group_members (group_id, user_id, role, status, requested_at)
  values (p_group, v_me, 'member', 'pending', now())
  on conflict (group_id, user_id) do update
    set status = 'pending', requested_at = now(), decided_at = null, rejoin_after = null;
  return 'requested';
end;
$$;

-- AC-11
create function public.cancel_request(p_group uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.group_members
  where group_id = p_group and user_id = auth.uid() and status = 'pending';
$$;

-- AC-13, AC-14, AC-18
create function public.decide_request(p_group uuid, p_user uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group public.groups;
begin
  select * into v_group from public.groups where id = p_group and deleted_at is null for update;

  if not found or v_group.owner_id <> auth.uid() then
    raise exception 'Solo el creador puede responder solicitudes' using errcode = '42501';
  end if;

  if not exists (select 1 from public.group_members where group_id = p_group and user_id = p_user and status = 'pending') then
    raise exception 'La solicitud ya no está pendiente' using errcode = 'P0001';
  end if;

  if p_accept then
    if v_group.member_count >= v_group.max_members then
      raise exception 'El grupo está lleno' using errcode = 'P0001';
    end if;
    update public.group_members
    set status = 'active', joined_at = now(), decided_at = now()
    where group_id = p_group and user_id = p_user;
  else
    update public.group_members
    set status = 'rejected', decided_at = now(), rejoin_after = now() + interval '7 days'
    where group_id = p_group and user_id = p_user;
  end if;
end;
$$;

-- ── Salir, expulsar, eliminar ───────────────────────────────────────────────

create function public.leave_group(p_group uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_group_owner(p_group, auth.uid()) then
    -- AC-25
    raise exception 'El creador no puede salirse: puede eliminar el grupo' using errcode = 'P0001';
  end if;

  delete from public.group_members
  where group_id = p_group and user_id = auth.uid() and status = 'active';
  -- Hito 3: cancelar sus planes futuros en el grupo y sacarlo de los planes (AC-23, AC-24).
end;
$$;

-- AC-26: el expulsado queda 'banned' y no puede volver.
create function public.remove_member(p_group uuid, p_user uuid)
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
  -- Hito 3: mismos efectos sobre planes que salirse.
end;
$$;

-- AC-29, AC-30
create function public.delete_group(p_group uuid, p_confirm_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group public.groups;
begin
  select * into v_group from public.groups where id = p_group and deleted_at is null for update;

  if not found or v_group.owner_id <> auth.uid() then
    raise exception 'Solo el creador puede eliminar el grupo' using errcode = '42501';
  end if;

  if btrim(p_confirm_name) <> v_group.name then
    raise exception 'El nombre no coincide' using errcode = 'P0001';
  end if;

  update public.groups set deleted_at = now() where id = p_group;
  -- Hito 3: cancelar planes futuros del grupo. Hito 5: avisar a los miembros.
end;
$$;

-- ── Lecturas ────────────────────────────────────────────────────────────────

-- Descubrir (spec 02): ciudad del usuario, visibles, no ocultos por moderación.
-- Completos al final; el resto por actividad reciente (AC-05 a AC-08).
create function public.discover_groups(
  p_category smallint default null,
  p_search text default null,
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  id uuid,
  name text,
  description text,
  image_url text,
  category_id smallint,
  zone text,
  access public.group_access,
  member_count int,
  max_members int,
  is_full boolean,
  my_status public.member_status
)
language sql
stable
security definer
set search_path = ''
as $$
  select g.id, g.name, g.description, g.image_url, g.category_id, g.zone, g.access,
         g.member_count, g.max_members, g.member_count >= g.max_members, m.status
  from public.groups g
  left join public.group_members m on m.group_id = g.id and m.user_id = auth.uid()
  where public.is_active_user()
    and g.city_id = (select city_id from public.profiles where id = auth.uid())
    and g.deleted_at is null
    and g.hidden_at is null
    and coalesce(m.status <> 'banned', true)
    and not public.is_blocked(auth.uid(), g.owner_id)
    and (p_category is null or g.category_id = p_category)
    and (p_search is null or btrim(p_search) = ''
         or public.normalize_text(g.name || ' ' || g.description) like '%' || public.normalize_text(btrim(p_search)) || '%')
  order by (g.member_count >= g.max_members), g.last_activity_at desc
  limit least(p_limit, 100) offset p_offset;
$$;

-- Detalle de un grupo con lo que el usuario puede ver.
-- null = no existe o no es visible. {"banned": true} = fue expulsado (spec 02, "Expulsar").
create function public.get_group(p_group uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_group public.groups;
  v_member public.group_members;
  v_is_member boolean;
begin
  if not public.is_active_user() then
    return null;
  end if;

  select * into v_group from public.groups where id = p_group and deleted_at is null;
  if not found or public.is_blocked(v_me, v_group.owner_id) then
    return null;
  end if;

  select * into v_member from public.group_members where group_id = p_group and user_id = v_me;
  if v_member.status = 'banned' then
    return jsonb_build_object('id', p_group, 'banned', true);
  end if;

  v_is_member := v_member.status = 'active';

  return jsonb_build_object(
    'id', v_group.id,
    'name', v_group.name,
    'description', v_group.description,
    'image_url', v_group.image_url,
    'category_id', v_group.category_id,
    'zone', v_group.zone,
    'access', v_group.access,
    'member_count', v_group.member_count,
    'max_members', v_group.max_members,
    'is_full', v_group.member_count >= v_group.max_members,
    'owner_id', v_group.owner_id,
    'my_status', v_member.status,
    'my_role', v_member.role,
    'rejoin_after', case when v_member.status = 'rejected' then v_member.rejoin_after end,
    'pending_count', case when v_group.owner_id = v_me then
      (select count(*) from public.group_members where group_id = p_group and status = 'pending') end,
    -- AC-19: los no miembros ven solo hasta 5 fotos.
    'preview', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'avatar_url', p.avatar_url, 'name', p.name))
      from (
        select p.id, p.avatar_url, p.name
        from public.group_members m
        join public.profiles p on p.id = m.user_id
        where m.group_id = p_group and m.status = 'active'
          and not public.is_blocked(v_me, p.id)
        order by (m.role = 'owner') desc, m.joined_at
        limit 5
      ) p
    ), '[]'::jsonb)
  );
end;
$$;

-- AC-20: lista completa, solo para miembros. El creador primero.
create function public.list_group_members(p_group uuid)
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
  order by (m.role = 'owner') desc, m.joined_at;
$$;

-- Solicitudes pendientes, de la más vieja a la más nueva. Solo el creador. Incluye la bio (AC-17).
create function public.list_group_requests(p_group uuid)
returns table (user_id uuid, name text, avatar_url text, age int, bio text, requested_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.name, p.avatar_url, public.age_from_birthdate(p.birthdate), p.bio, m.requested_at
  from public.group_members m
  join public.profiles p on p.id = m.user_id
  where m.group_id = p_group
    and m.status = 'pending'
    and public.is_group_owner(p_group, auth.uid())
  order by m.requested_at;
$$;

-- "Lo mío": grupos donde soy miembro o tengo una solicitud pendiente.
create function public.list_my_groups()
returns table (
  id uuid,
  name text,
  image_url text,
  category_id smallint,
  member_count int,
  max_members int,
  my_role public.group_role,
  my_status public.member_status,
  pending_count bigint,
  last_activity_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select g.id, g.name, g.image_url, g.category_id, g.member_count, g.max_members, m.role, m.status,
         case when m.role = 'owner' then
           (select count(*) from public.group_members r where r.group_id = g.id and r.status = 'pending') end,
         g.last_activity_at
  from public.group_members m
  join public.groups g on g.id = m.group_id
  where m.user_id = auth.uid()
    and m.status in ('active', 'pending')
    and g.deleted_at is null
  order by (m.role = 'owner') desc, g.last_activity_at desc;
$$;

-- ── Perfil extendido: suma los grupos en común visibles (spec 01, sección 2) ─

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
      -- Solo grupos que quien mira también podría ver.
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
      ), '[]'::jsonb)
    );
  end if;

  return v_result;
end;
$$;

-- ── Imágenes de grupos ──────────────────────────────────────────────────────
-- group-images/<group_id>/cover.jpg. Solo el creador sube y borra.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('group-images', 'group-images', true, 5 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp']);

create function public.owns_group_folder(p_folder text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.groups
    where id::text = p_folder and owner_id = auth.uid() and deleted_at is null
  );
$$;

create policy "Imágenes de grupo: el creador sube"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'group-images' and public.owns_group_folder((storage.foldername(name))[1]));

create policy "Imágenes de grupo: el creador reemplaza"
  on storage.objects for update to authenticated
  using (bucket_id = 'group-images' and public.owns_group_folder((storage.foldername(name))[1]));

create policy "Imágenes de grupo: el creador borra"
  on storage.objects for delete to authenticated
  using (bucket_id = 'group-images' and public.owns_group_folder((storage.foldername(name))[1]));

-- ── Permisos de ejecución ───────────────────────────────────────────────────

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.normalize_text(text)',
    'public.is_group_member(uuid, uuid)',
    'public.is_group_owner(uuid, uuid)',
    'public.can_see_group(uuid)',
    'public.create_group(text, text, smallint, int, public.group_access, text, text)',
    'public.update_group(uuid, text, text, smallint, int, public.group_access, text, text)',
    'public.join_group(uuid)',
    'public.cancel_request(uuid)',
    'public.decide_request(uuid, uuid, boolean)',
    'public.leave_group(uuid)',
    'public.remove_member(uuid, uuid)',
    'public.delete_group(uuid, text)',
    'public.discover_groups(smallint, text, int, int)',
    'public.get_group(uuid)',
    'public.list_group_members(uuid)',
    'public.list_group_requests(uuid)',
    'public.list_my_groups()',
    'public.owns_group_folder(text)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;

-- group_members_sync_count es solo para el trigger.
revoke execute on function public.group_members_sync_count() from public, anon, authenticated;
