-- Spec 01 · Auth y perfil. Criterios que hace cumplir la base.
begin;
select plan(26);

-- ── Datos de prueba (como postgres) ─────────────────────────────────────────
-- A: usuario en onboarding. B y C: perfiles completos. G: viene de Google.
insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.com', 'authenticated', 'authenticated', '{}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.com', 'authenticated', 'authenticated', '{}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@test.com', 'authenticated', 'authenticated', '{}'),
  ('00000000-0000-0000-0000-0000000000a9', 'g@test.com', 'authenticated', 'authenticated',
   '{"full_name": "Nico García", "avatar_url": "https://lh3.googleusercontent.com/foto"}');

update public.profiles
set name = 'Persona ' || right(id::text, 1),
    birthdate = '2000-05-10',
    avatar_url = 'https://ejemplo.com/foto.jpg',
    city_id = (select id from public.cities where name = 'La Plata'),
    bio = 'Bio privada',
    terms_accepted_at = now(),
    onboarding_completed_at = now()
where id in ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000c');

insert into public.profile_interests (profile_id, interest_id)
select p, i.id
from unnest(array['00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000c']::uuid[]) p
cross join (select id from public.interests order by position limit 3) i;

-- ── Registro ────────────────────────────────────────────────────────────────

select is(
  (select name from public.profiles where id = '00000000-0000-0000-0000-0000000000a9'),
  'Nico García',
  'AC-01: al registrarse con Google se precarga el nombre'
);

select is(
  (select avatar_url from public.profiles where id = '00000000-0000-0000-0000-0000000000a9'),
  'https://lh3.googleusercontent.com/foto',
  'AC-01 / spec: al registrarse con Google se precarga la foto'
);

select is(
  (select onboarding_completed_at from public.profiles where id = '00000000-0000-0000-0000-00000000000a'),
  null,
  'Un usuario nuevo arranca con el onboarding sin completar'
);

-- ── Como usuario A ──────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}', true);

-- 18+
select throws_ok(
  $$ select public.set_my_birthdate((public.today_ar() - interval '18 years' + interval '1 day')::date) $$,
  '23514', 'Ronda es para mayores de 18',
  'AC-06: con 17 años y 364 días no se puede cargar la fecha'
);

select lives_ok(
  $$ select public.set_my_birthdate((public.today_ar() - interval '18 years')::date) $$,
  'AC-07: con 18 años cumplidos hoy sí se puede'
);

select is(
  (select public.age_from_birthdate(birthdate) from public.profiles where id = auth.uid()),
  18,
  'La edad se calcula en años cumplidos'
);

-- Fecha de nacimiento no editable
select throws_ok(
  $$ select public.set_my_birthdate('1990-01-01') $$,
  'P0001', 'La fecha de nacimiento ya fue cargada',
  'AC-13: no se puede volver a cargar la fecha de nacimiento'
);

select throws_ok(
  $$ update public.profiles set birthdate = '1990-01-01' where id = auth.uid() $$,
  '42501', null,
  'AC-13: no se puede editar la fecha de nacimiento por API'
);

-- Campos protegidos
select throws_ok(
  $$ update public.profiles set onboarding_completed_at = now() where id = auth.uid() $$,
  '42501', null,
  'No se puede marcar el onboarding como completo editando la tabla'
);

select throws_ok(
  $$ update public.profiles set suspended_until = null where id = auth.uid() $$,
  '42501', null,
  'No se puede tocar la suspensión desde la app'
);

-- Intereses
select throws_ok(
  $$ select public.set_my_interests(array[1, 2]::smallint[]) $$,
  '23514', 'Elegí entre 3 y 10 intereses',
  'AC-09: con menos de 3 intereses no se puede'
);

select throws_ok(
  $$ select public.set_my_interests(array[1,2,3,4,5,6,7,8,9,10,11]::smallint[]) $$,
  '23514', 'Elegí entre 3 y 10 intereses',
  'AC-09: con más de 10 intereses no se puede'
);

select lives_ok(
  $$ select public.set_my_interests(array[1, 2, 3]::smallint[]) $$,
  'AC-09: con 3 intereses sí se puede'
);

select throws_ok(
  $$ insert into public.profile_interests (profile_id, interest_id) values (auth.uid(), 4) $$,
  '42501', null,
  'Los intereses no se pueden insertar directo (solo con set_my_interests)'
);

-- Completar sin foto
update public.profiles
set name = 'Ana', city_id = (select id from public.cities where name = 'La Plata')
where id = auth.uid();

select throws_ok(
  $$ select public.complete_onboarding() $$,
  '23514', null,
  'AC-11b: sin foto no se puede completar el perfil'
);

update public.profiles set avatar_url = 'https://ejemplo.com/ana.jpg' where id = auth.uid();

select lives_ok(
  $$ select public.complete_onboarding() $$,
  'AC-11: con todo cargado se completa el onboarding y se aceptan los términos'
);

select isnt(
  (select terms_accepted_at from public.profiles where id = auth.uid()),
  null,
  'AC-11: quedan registrados los términos aceptados'
);

select throws_ok(
  $$ update public.profiles set avatar_url = null where id = auth.uid() $$,
  '23514', null,
  'AC-15b: con el perfil completo no se puede quitar la foto'
);

-- Perfil de otros
select is(
  (select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-00000000000b'),
  0,
  'AC-14: no se puede leer la fila de otro perfil directo de la tabla'
);

update public.profiles set name = 'Hackeado' where id = '00000000-0000-0000-0000-00000000000b';

select is(
  (public.get_profile('00000000-0000-0000-0000-00000000000b')) ->> 'name',
  'Persona b',
  'AC-14: no se puede modificar el perfil de otro'
);

select ok(
  not (public.get_profile('00000000-0000-0000-0000-00000000000b') ? 'bio'),
  'AC-16: sin nada en común, la bio no se devuelve'
);

select ok(
  not (public.get_profile('00000000-0000-0000-0000-00000000000b') ? 'birthdate'),
  'Nunca se devuelve la fecha de nacimiento'
);

select is(
  jsonb_array_length(public.get_profile('00000000-0000-0000-0000-00000000000b') -> 'interests'),
  3,
  'AC-16: sin nada en común se ven los intereses'
);

-- ── Bloqueos (spec 01 AC-18) ────────────────────────────────────────────────
reset role;
insert into public.blocks (blocker_id, blocked_id)
values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000c');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}', true);

select is(
  public.get_profile('00000000-0000-0000-0000-00000000000b'),
  null,
  'AC-18: el bloqueado no ve el perfil de quien lo bloqueó'
);

select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}', true);

select is(
  public.get_profile('00000000-0000-0000-0000-00000000000c'),
  null,
  'AC-18: quien bloquea tampoco ve el perfil del bloqueado'
);

-- ── Usuario con onboarding incompleto ───────────────────────────────────────
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000a9", "role": "authenticated"}', true);

select is(
  public.get_profile('00000000-0000-0000-0000-00000000000b'),
  null,
  'Sin terminar el onboarding no se ven perfiles de otros'
);

select * from finish();
rollback;
