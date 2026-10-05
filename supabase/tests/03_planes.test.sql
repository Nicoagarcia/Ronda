-- Spec 03 · Planes. Criterios que hace cumplir la base.
-- AC-14 (concurrencia) se prueba con scripts/concurrency/join-last-spot.mjs.
-- AC-28 (motivo en el chat) se completa en el Hito 4; AC-27 (aviso) en el Hito 5.
begin;
select plan(62);

delete from public.groups;
delete from public.plans;

-- C: creador · J: se suma · K: otro · N: no miembro · Q: otra ciudad · B: bloqueado por C
insert into auth.users (id, email, aud, role, raw_user_meta_data)
select ('00000000-0000-0000-0000-00000000000' || n)::uuid, 'p' || n || '@test.com', 'authenticated', 'authenticated', '{}'
from generate_series(1, 6) n;

update public.profiles
set name = 'Persona ' || right(profiles.id::text, 1), birthdate = '2000-01-01', avatar_url = 'https://foto', bio = 'Bio',
    city_id = (select c.id from public.cities c where c.name = case right(profiles.id::text, 1) when '5' then 'CABA' else 'La Plata' end),
    terms_accepted_at = now(), onboarding_completed_at = now(),
    safety_notice_accepted_at = case when right(profiles.id::text, 1) in ('1', '3', '6') then now() end
where id::text like '00000000-0000-0000-0000-00000000000_';

insert into public.blocks values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000006');

create temp table ids (k text primary key, id uuid);
grant all on ids to authenticated;

create function pg_temp.login(n int) returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', '00000000-0000-0000-0000-00000000000' || n, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.id(k text) returns uuid language sql as $$ select id from ids where ids.k = id.k $$;
create function pg_temp.u(n int) returns uuid language sql as $$ select ('00000000-0000-0000-0000-00000000000' || n)::uuid $$;
grant execute on function pg_temp.login(int), pg_temp.id(text), pg_temp.u(int) to authenticated;

-- Grupos de C: uno abierto y uno con aprobación (J y K miembros del de aprobación)
set local role authenticated;
select pg_temp.login(1);
insert into ids select 'g_abierto', public.create_group('Abierto', 'Grupo abierto de prueba', 4::smallint, 50, 'open');
insert into ids select 'g_aprob', public.create_group('Con aprobación', 'Grupo con aprobación de prueba', 4::smallint, 50, 'approval');
reset role;
insert into public.group_members (group_id, user_id, status, joined_at)
values (pg_temp.id('g_aprob'), pg_temp.u(2), 'active', now()), (pg_temp.id('g_aprob'), pg_temp.u(3), 'active', now()),
       (pg_temp.id('g_abierto'), pg_temp.u(2), 'active', now());
set local role authenticated;

-- ── Crear (como C) ──────────────────────────────────────────────────────────
select pg_temp.login(1);
insert into ids select 'p1', public.create_plan(p_title => 'Patinar en el Bosque', p_category_id => 4::smallint,
  p_place_name => 'Bosque', p_starts_at => now() + interval '1 day', p_max_participants => 10);

reset role;
select is((select participant_count from public.plans where id = pg_temp.id('p1')), 1, 'AC-01: el plan nuevo tiene 1 participante');
select ok(exists (select 1 from public.plan_participants where plan_id = pg_temp.id('p1') and user_id = pg_temp.u(1)), 'AC-01: el creador es participante');
set local role authenticated;

select throws_ok($$ select public.create_plan(p_title => 'Muy pronto', p_category_id => 1::smallint, p_place_name => 'Lugar',
  p_starts_at => now() + interval '29 minutes', p_max_participants => 5) $$, 'P0001', null, 'AC-02: inicio dentro de 29 minutos');
select throws_ok($$ select public.create_plan(p_title => 'Muy lejos', p_category_id => 1::smallint, p_place_name => 'Lugar',
  p_starts_at => now() + interval '61 days', p_max_participants => 5) $$, 'P0001', null, 'AC-02: inicio a más de 60 días');
select throws_ok($$ select public.create_plan(p_title => 'Fin antes', p_category_id => 1::smallint, p_place_name => 'Lugar',
  p_starts_at => now() + interval '1 day', p_ends_at => now() + interval '20 hours', p_max_participants => 5) $$, 'P0001', null, 'AC-02: fin antes del inicio');
select throws_ok($$ select public.create_plan(p_title => 'Muy largo', p_category_id => 1::smallint, p_place_name => 'Lugar',
  p_starts_at => now() + interval '1 day', p_ends_at => now() + interval '1 day 13 hours', p_max_participants => 5) $$, 'P0001', null, 'AC-02: más de 12 h');
select throws_ok($$ select public.create_plan(p_title => 'Cupo', p_category_id => 1::smallint, p_place_name => 'Lugar',
  p_starts_at => now() + interval '1 day', p_max_participants => 101) $$, '23514', null, 'Capacidad máxima 100');
select throws_ok($$ insert into public.plans (title, category_id, city_id, place_name, starts_at, max_participants, creator_id)
  values ('Directo', 1, 1, 'Lugar', now() + interval '1 day', 5, auth.uid()) $$, '42501', null, 'AC-02: no se puede escribir la tabla directo');

select pg_temp.login(4);
select throws_ok(format($$ select public.create_plan(p_title => 'Intruso', p_category_id => 1::smallint, p_place_name => 'Lugar',
  p_starts_at => now() + interval '1 day', p_max_participants => 5, p_group_id => %L) $$, pg_temp.id('g_aprob')),
  '42501', null, 'AC-03: un no miembro no puede crear planes en el grupo');

select pg_temp.login(1);
insert into ids select 'p_casa', public.create_plan(p_title => 'Juegos en casa', p_category_id => 25::smallint, p_place_name => 'Lo de C',
  p_starts_at => now() + interval '2 days', p_max_participants => 6, p_group_id => pg_temp.id('g_aprob'),
  p_is_private_place => true, p_address => 'Calle 7 1234');
select ok(pg_temp.id('p_casa') is not null, 'AC-04: domicilio en un grupo con aprobación sí');
select throws_ok(format($$ select public.create_plan(p_title => 'Casa abierta', p_category_id => 1::smallint, p_place_name => 'Casa',
  p_starts_at => now() + interval '1 day', p_max_participants => 5, p_group_id => %L, p_is_private_place => true, p_address => 'Calle 1') $$,
  pg_temp.id('g_abierto')), 'P0001', null, 'AC-04: domicilio en un grupo abierto no');
select throws_ok($$ select public.create_plan(p_title => 'Casa suelta', p_category_id => 1::smallint, p_place_name => 'Casa',
  p_starts_at => now() + interval '1 day', p_max_participants => 5, p_is_private_place => true, p_address => 'Calle 1') $$,
  'P0001', null, 'AC-04: domicilio en un plan independiente no');
select throws_ok(format($$ select public.create_plan(p_title => 'Sin dirección', p_category_id => 1::smallint, p_place_name => 'Casa',
  p_starts_at => now() + interval '1 day', p_max_participants => 5, p_group_id => %L, p_is_private_place => true) $$,
  pg_temp.id('g_aprob')), 'P0001', 'Falta la dirección del domicilio', 'AC-05: domicilio sin dirección no');

insert into ids select 'p_abierto', public.create_plan(p_title => 'Plan del grupo abierto', p_category_id => 4::smallint,
  p_place_name => 'Plaza Moreno', p_starts_at => now() + interval '3 hours', p_max_participants => 10, p_group_id => pg_temp.id('g_abierto'));
insert into ids select 'p_aprob', public.create_plan(p_title => 'Plan del grupo con aprobación', p_category_id => 4::smallint,
  p_place_name => 'Plaza Italia', p_starts_at => now() + interval '5 hours', p_max_participants => 10, p_group_id => pg_temp.id('g_aprob'));

-- AC-06: C tiene 4 planes próximos; crea 6 más y el 11 falla
select lives_ok($$ select public.create_plan(p_title => 'Relleno ' || n, p_category_id => 1::smallint, p_place_name => 'Lugar',
  p_starts_at => now() + (n || ' days')::interval + interval '3 days', p_max_participants => 5) from generate_series(1, 6) n $$,
  'Se pueden tener 10 planes próximos');
select throws_ok($$ select public.create_plan(p_title => 'El once', p_category_id => 1::smallint, p_place_name => 'Lugar',
  p_starts_at => now() + interval '1 day', p_max_participants => 5) $$, 'P0001', null, 'AC-06: el plan 11 no se puede crear');
select public.cancel_plan((select id from public.plans where title = 'Relleno 6'));
select lives_ok($$ select public.create_plan(p_title => 'Después de cancelar', p_category_id => 1::smallint, p_place_name => 'Lugar',
  p_starts_at => now() + interval '20 days', p_max_participants => 5) $$, 'AC-06: al cancelar uno, se puede volver a crear');

-- AC-07
select is(public.plan_status(now() - interval '4 hours', null, null), 'finished', 'AC-07: sin fin, terminó a las 3 h');
select is(public.plan_status(now() - interval '2 hours', null, null), 'ongoing', 'AC-07: sin fin, a las 2 h sigue en curso');
select is(public.plan_status(now() + interval '1 hour', null, null), 'upcoming', 'Próximo antes del inicio');

-- ── Descubrir ───────────────────────────────────────────────────────────────
select pg_temp.login(4);
select ok(exists (select 1 from public.discover_plans() where title = 'Patinar en el Bosque'), 'AC-08: el plan independiente aparece');
select ok(exists (select 1 from public.discover_plans() where title = 'Plan del grupo abierto'), 'AC-08: el plan de un grupo abierto aparece sin ser miembro');
select ok(not exists (select 1 from public.discover_plans() where title = 'Plan del grupo con aprobación'), 'AC-09: el de un grupo con aprobación no aparece');
select is(public.get_plan(pg_temp.id('p_aprob')), null, 'AC-09: ni por get_plan');
select is((select count(*)::int from public.plans where id = pg_temp.id('p_aprob')), 0, 'AC-09: ni leyendo la tabla');
select is((select title from public.discover_plans() limit 1), 'Plan del grupo abierto', 'AC-10: el más cercano primero');
select ok(not exists (select 1 from public.discover_plans() where title = 'Relleno 6'), 'AC-11: un plan cancelado no aparece');

select pg_temp.login(2);
select ok(exists (select 1 from public.discover_plans() where title = 'Plan del grupo con aprobación'), 'Un miembro sí ve el plan del grupo con aprobación');

select pg_temp.login(5);
select is((select count(*)::int from public.discover_plans()), 0, 'Alguien de otra ciudad no ve los planes');

select pg_temp.login(6);
select is((select count(*)::int from public.discover_plans()), 0, 'AC-12: con bloqueo no se ven los planes del creador');

-- ── Unirse ──────────────────────────────────────────────────────────────────
select pg_temp.login(2);
select throws_ok($$ select public.join_plan(pg_temp.id('p1')) $$, 'P0001', 'Primero aceptá el aviso de seguridad', 'AC-15: sin aceptar el aviso no se puede sumar');
select public.accept_safety_notice();
select lives_ok($$ select public.join_plan(pg_temp.id('p1')) $$, 'AC-13: se suma a un plan con lugar');
select ok(exists (select 1 from public.plan_participants where plan_id = pg_temp.id('p1') and user_id = auth.uid()), 'AC-13: aparece en la lista');
select throws_ok($$ select public.join_plan(pg_temp.id('p1')) $$, 'P0001', 'Ya estás en este plan', 'No se puede sumar dos veces');

select pg_temp.login(3);
select public.join_plan(pg_temp.id('p1'));
select is((public.get_plan(pg_temp.id('p1')) ->> 'participant_count')::int, 3, 'Se suman los participantes');

select pg_temp.login(4);
select is(jsonb_array_length(public.get_plan(pg_temp.id('p1')) -> 'participants'), 3, 'AC-19: un no participante ve la lista completa');

select pg_temp.login(2);
select lives_ok($$ select public.leave_plan(pg_temp.id('p1')) $$, 'AC-16: se baja antes del inicio');
reset role;
select is((select participant_count from public.plans where id = pg_temp.id('p1')), 2, 'AC-16: libera el lugar');
set local role authenticated;

select pg_temp.login(1);
select throws_ok($$ select public.leave_plan(pg_temp.id('p1')) $$, 'P0001', null, 'AC-18: el creador no puede bajarse');

-- AC-21: sacar a K
select lives_ok($$ select public.remove_participant(pg_temp.id('p1'), pg_temp.u(3)) $$, 'El creador saca a un participante');
select pg_temp.login(3);
select is(public.get_plan(pg_temp.id('p1')), null, 'AC-21: el sacado deja de ver el plan');
select throws_ok($$ select public.join_plan(pg_temp.id('p1')) $$, 'P0001', 'El plan no existe', 'AC-21: y no puede volver a sumarse');

-- ── Domicilio ───────────────────────────────────────────────────────────────
select pg_temp.login(2);
select is(public.get_plan(pg_temp.id('p_casa')) ->> 'address', null, 'AC-22: un no participante no recibe la dirección');
select is((select count(*)::int from public.plan_private_details), 0, 'AC-22: ni leyendo la tabla');
select public.join_plan(pg_temp.id('p_casa'));
select is(public.get_plan(pg_temp.id('p_casa')) ->> 'address', 'Calle 7 1234', 'AC-23: al sumarse ve la dirección');
select public.leave_plan(pg_temp.id('p_casa'));
select is(public.get_plan(pg_temp.id('p_casa')) ->> 'address', null, 'AC-23: al bajarse deja de verla');

-- ── Editar y cancelar ───────────────────────────────────────────────────────
select throws_ok($$ select public.update_plan(pg_temp.id('p1'), 'Otro', 4::smallint, 'Bosque', now() + interval '1 day', 10) $$,
  '42501', null, 'AC-29: un participante no puede editar');
select throws_ok($$ select public.cancel_plan(pg_temp.id('p1')) $$, '42501', null, 'AC-29: ni cancelar');
select throws_ok($$ select public.remove_participant(pg_temp.id('p1'), pg_temp.u(1)) $$, '42501', null, 'AC-29: ni sacar a otros');

select pg_temp.login(1);
select is(public.update_plan(pg_temp.id('p1'), 'Patinar en el Bosque', 4::smallint, 'Bosque',
  (select starts_at from public.plans where id = pg_temp.id('p1')), 10, p_description => 'Traigan casco'), false,
  'AC-27: cambiar la descripción no genera aviso');
select is(public.update_plan(pg_temp.id('p1'), 'Patinar en el Lago', 4::smallint, 'Lago del Bosque', now() + interval '1 day 1 hour', 2), true,
  'AC-24 / AC-27: editar título, lugar, hora y capacidad genera aviso');

-- AC-26: bajar la capacidad con más participantes
reset role;
insert into public.plan_participants (plan_id, user_id) values (pg_temp.id('p_abierto'), pg_temp.u(2)), (pg_temp.id('p_abierto'), pg_temp.u(4));
set local role authenticated;
select pg_temp.login(1);
select public.update_plan(pg_temp.id('p_abierto'), 'Plan del grupo abierto', 4::smallint, 'Plaza Moreno',
  (select starts_at from public.plans where id = pg_temp.id('p_abierto')), 2, p_zone => null);
reset role;
select is((select participant_count from public.plans where id = pg_temp.id('p_abierto')), 3, 'AC-26: bajar la capacidad no saca a nadie');
set local role authenticated;
select pg_temp.login(3);
select throws_ok($$ select public.join_plan(pg_temp.id('p_abierto')) $$, 'P0001', 'El plan se llenó', 'AC-26: y no entra nadie más');

-- AC-28
select pg_temp.login(1);
select public.cancel_plan(pg_temp.id('p_abierto'), 'Llueve');
select is(public.get_plan(pg_temp.id('p_abierto')) ->> 'status', 'cancelled', 'AC-28: queda cancelado');
select is(public.get_plan(pg_temp.id('p_abierto')) ->> 'cancel_reason', 'Llueve', 'AC-28: con el motivo');

-- AC-17 y AC-25: plan que ya empezó
reset role;
update public.plans set starts_at = now() - interval '1 hour' where id = pg_temp.id('p1');
set local role authenticated;
select pg_temp.login(4);
select public.accept_safety_notice();
select throws_ok($$ select public.join_plan(pg_temp.id('p1')) $$, 'P0001', 'Este plan ya empezó', 'AC-17: no se puede sumar a un plan empezado');
select ok(not exists (select 1 from public.discover_plans() where title = 'Patinar en el Lago'), 'AC-11: un plan empezado no aparece en Descubrir');
select pg_temp.login(1);
select throws_ok($$ select public.update_plan(pg_temp.id('p1'), 'X', 4::smallint, 'Bosque', now() + interval '1 day', 10) $$,
  'P0001', null, 'AC-25: no se puede editar un plan empezado');
select throws_ok($$ select public.cancel_plan(pg_temp.id('p1')) $$, 'P0001', null, 'AC-25: ni cancelarlo');

-- AC-20: compartieron un plan terminado
reset role;
insert into public.plans (id, title, category_id, city_id, place_name, starts_at, max_participants, creator_id)
values ('00000000-0000-0000-0000-0000000000f1', 'Plan viejo', 1, 1, 'Lugar', now() - interval '10 days', 5, pg_temp.u(4));
insert into public.plan_participants (plan_id, user_id) values
  ('00000000-0000-0000-0000-0000000000f1', pg_temp.u(4)), ('00000000-0000-0000-0000-0000000000f1', pg_temp.u(5));
set local role authenticated;
select pg_temp.login(4);
select ok((public.get_profile(pg_temp.u(5)) ->> 'extended')::boolean, 'AC-20: compartir un plan terminado da perfil extendido');

-- ── Efectos al salir de un grupo (spec 03 AC-30; spec 02 AC-23, AC-24, AC-30) ─
select pg_temp.login(2);
insert into ids select 'p_de_j', public.create_plan(p_title => 'Plan de J', p_category_id => 1::smallint, p_place_name => 'Lugar',
  p_starts_at => now() + interval '1 day', p_max_participants => 5, p_group_id => pg_temp.id('g_abierto'));
select public.join_plan(pg_temp.id('p_aprob'));
select pg_temp.login(3);
select public.join_plan(pg_temp.id('p_aprob'));

select pg_temp.login(2);
select public.leave_group(pg_temp.id('g_abierto'));
select is(public.get_plan(pg_temp.id('p_de_j')) ->> 'status', 'cancelled', 'AC-30 / spec 02 AC-23: al salir del grupo se cancelan sus planes');

select public.leave_group(pg_temp.id('g_aprob'));
reset role;
select ok(not exists (select 1 from public.plan_participants where plan_id = pg_temp.id('p_aprob') and user_id = pg_temp.u(2)),
  'spec 02 AC-24: al salir de un grupo con aprobación sale de sus planes');
set local role authenticated;

select pg_temp.login(1);
select public.delete_group(pg_temp.id('g_aprob'), 'Con aprobación');
reset role;
select is((select count(*)::int from public.plans where group_id = pg_temp.id('g_aprob') and cancelled_at is null), 0,
  'spec 02 AC-30: al eliminar el grupo se cancelan sus planes futuros');

select * from finish();
rollback;
