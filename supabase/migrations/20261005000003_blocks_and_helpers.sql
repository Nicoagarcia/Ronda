-- Hito 1 · Bloqueos y funciones auxiliares (docs/05-plan-tecnico.md, 5.2).
-- La tabla de bloqueos se crea ahora, aunque las pantallas lleguen en el Hito 6,
-- porque las políticas de todas las specs la usan.

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index blocks_blocked_idx on public.blocks (blocked_id);

alter table public.blocks enable row level security;
revoke all on public.blocks from anon, authenticated;
grant select on public.blocks to authenticated;

-- Nadie puede ver quién lo bloqueó (spec 06, AC-07).
create policy "Bloqueos: cada uno ve los que hizo"
  on public.blocks for select to authenticated
  using (blocker_id = (select auth.uid()));

-- ── Auxiliares ──────────────────────────────────────────────────────────────

-- Bloqueo en cualquier dirección.
create function public.is_blocked(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

-- Perfil completo y sin suspensión vigente.
create function public.is_active_profile(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = p_id
      and onboarding_completed_at is not null
      and (suspended_until is null or suspended_until <= now())
  );
$$;

create function public.is_active_user()
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.is_active_profile(auth.uid());
$$;

-- ¿Comparten algún grupo o plan? Se redefine en los hitos 2 y 3, cuando existan esas tablas.
create function public.shares_context(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select false;
$$;

-- ── Perfil de otra persona (spec 01, sección 2) ─────────────────────────────
-- Devuelve null si no se puede ver ("Perfil no disponible").
-- Los campos que no corresponden no se devuelven (AC-16): no es que la app los oculte.

create function public.get_profile(p_id uuid)
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
    -- Grupos y planes se suman en los hitos 2 y 3.
    v_result := v_result || jsonb_build_object('bio', v_profile.bio);
  end if;

  return v_result;
end;
$$;

revoke execute on function public.is_blocked(uuid, uuid) from public, anon;
revoke execute on function public.is_active_profile(uuid) from public, anon;
revoke execute on function public.is_active_user() from public, anon;
revoke execute on function public.shares_context(uuid, uuid) from public, anon;
revoke execute on function public.get_profile(uuid) from public, anon;
grant execute on function public.is_blocked(uuid, uuid) to authenticated;
grant execute on function public.is_active_profile(uuid) to authenticated;
grant execute on function public.is_active_user() to authenticated;
grant execute on function public.shares_context(uuid, uuid) to authenticated;
grant execute on function public.get_profile(uuid) to authenticated;
