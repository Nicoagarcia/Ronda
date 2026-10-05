-- Hito 1 · Perfiles (docs/specs/01-auth-y-perfil.md).
--
-- Reglas que hace cumplir la base:
--   · 18+ (AC-08) y fecha de nacimiento no editable (AC-13).
--   · Un perfil completo siempre tiene nombre, nacimiento, foto, ciudad y términos (AC-11, AC-11b, AC-15b).
--   · Entre 3 y 10 intereses (AC-09).
--   · Cada uno solo ve y edita su propia fila (AC-14). El perfil de otros se lee con get_profile().

-- Fecha de "hoy" en Argentina: la regla de 18+ no puede depender de la zona horaria del servidor.
create function public.today_ar()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/Argentina/Buenos_Aires')::date;
$$;

create function public.age_from_birthdate(birthdate date)
returns int
language sql
stable
set search_path = ''
as $$
  select extract(year from age(public.today_ar(), birthdate))::int;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text check (char_length(btrim(name)) between 2 and 30),
  birthdate date,
  avatar_url text,
  city_id smallint references public.cities (id),
  bio text check (char_length(bio) <= 300),
  terms_accepted_at timestamptz,
  onboarding_completed_at timestamptz,
  safety_notice_accepted_at timestamptz,
  suspended_until timestamptz,
  suspension_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_completo check (
    onboarding_completed_at is null
    or (name is not null and birthdate is not null and avatar_url is not null
        and city_id is not null and terms_accepted_at is not null)
  )
);

-- 18+: se valida cada vez que se carga la fecha.
create function public.profiles_check_adult()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.birthdate is not null and public.age_from_birthdate(new.birthdate) < 18 then
    raise exception 'Ronda es para mayores de 18' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger profiles_check_adult
before insert or update of birthdate on public.profiles
for each row execute function public.profiles_check_adult();

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create table public.profile_interests (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  interest_id smallint not null references public.interests (id),
  primary key (profile_id, interest_id)
);

-- Al registrarse se crea el perfil vacío. Si viene de Google, se precargan nombre y foto.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'));
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    case when char_length(v_name) between 2 and 30 then v_name end,
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ── Permisos ────────────────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.profile_interests enable row level security;

-- Por columna: la app solo puede editar lo que el usuario edita a mano.
-- Nacimiento, términos, onboarding y suspensión solo cambian por funciones.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (name, avatar_url, city_id, bio) on public.profiles to authenticated;

create policy "Perfil: cada uno ve el suyo"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "Perfil: cada uno edita el suyo"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Los intereses se cambian solo con set_my_interests(), que valida 3 a 10.
revoke all on public.profile_interests from anon, authenticated;
grant select on public.profile_interests to authenticated;

create policy "Intereses del perfil: cada uno ve los suyos"
  on public.profile_interests for select to authenticated
  using (profile_id = (select auth.uid()));

revoke insert, update, delete on public.cities, public.interests from anon, authenticated;

-- ── Funciones del onboarding y perfil ───────────────────────────────────────

-- Carga la fecha de nacimiento. Solo una vez (AC-13).
create function public.set_my_birthdate(p_birthdate date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set birthdate = p_birthdate
  where id = auth.uid() and birthdate is null;

  if not found then
    raise exception 'La fecha de nacimiento ya fue cargada' using errcode = 'P0001';
  end if;
end;
$$;

-- Reemplaza los intereses del usuario. Entre 3 y 10 (AC-09).
create function public.set_my_interests(p_interest_ids smallint[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ids smallint[] := array(select distinct unnest(p_interest_ids));
begin
  if auth.uid() is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  if cardinality(v_ids) not between 3 and 10 then
    raise exception 'Elegí entre 3 y 10 intereses' using errcode = 'check_violation';
  end if;

  delete from public.profile_interests where profile_id = auth.uid();
  insert into public.profile_interests (profile_id, interest_id)
  select auth.uid(), unnest(v_ids);
end;
$$;

-- Último paso: acepta términos y marca el perfil como completo (AC-11).
-- Si falta algo, el CHECK profiles_completo o la validación de intereses lo rechazan.
create function public.complete_onboarding()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_interests int;
begin
  select count(*) into v_interests
  from public.profile_interests
  where profile_id = auth.uid();

  if v_interests not between 3 and 10 then
    raise exception 'Elegí entre 3 y 10 intereses' using errcode = 'check_violation';
  end if;

  update public.profiles
  set terms_accepted_at = now(),
      onboarding_completed_at = now()
  where id = auth.uid() and onboarding_completed_at is null;
end;
$$;

revoke execute on function public.set_my_birthdate(date) from public, anon;
revoke execute on function public.set_my_interests(smallint[]) from public, anon;
revoke execute on function public.complete_onboarding() from public, anon;
grant execute on function public.set_my_birthdate(date) to authenticated;
grant execute on function public.set_my_interests(smallint[]) to authenticated;
grant execute on function public.complete_onboarding() to authenticated;

-- ── Fotos de perfil ─────────────────────────────────────────────────────────
-- Una carpeta por usuario: avatars/<user_id>/archivo.jpg. Lectura pública.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp']);

create policy "Avatares: cada uno sube en su carpeta"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Avatares: cada uno reemplaza en su carpeta"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Avatares: cada uno borra en su carpeta"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
