-- Spec 02 · Grupos. Criterios que hace cumplir la base.
-- AC-12 (concurrencia) se prueba aparte con scripts/concurrency/join-last-spot.mjs.
-- AC-22/23/24/30 (chat y planes) se completan en los hitos 3 y 4.
begin;
select plan(58);

-- ── Datos de prueba (como postgres) ─────────────────────────────────────────
-- Se borran los grupos del seed de desarrollo para que los conteos no dependan de él.
delete from public.groups;
-- O: creador · M: miembro · P: otro usuario · R: solicitante · Q: de otra ciudad · X: bloqueado por O
insert into auth.users (id, email, aud, role, raw_user_meta_data)
select ('00000000-0000-0000-0000-00000000000' || n)::uuid, 'u' || n || '@test.com', 'authenticated', 'authenticated', '{}'
from generate_series(1, 6) n;

update public.profiles
set name = case right(id::text, 1) when '1' then 'Olga' when '2' then 'Mario' when '3' then 'Pía'
                                   when '4' then 'Raúl' when '5' then 'Quique' else 'Xime' end,
    birthdate = '2000-01-01', avatar_url = 'https://foto', bio = 'Mi bio',
    city_id = (select c.id from public.cities c where c.name = case right(profiles.id::text, 1) when '5' then 'CABA' else 'La Plata' end),
    terms_accepted_at = now(), onboarding_completed_at = now();

insert into public.blocks values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000006');

create temp table ids (k text primary key, id uuid);
grant all on ids to authenticated;

create function pg_temp.login(n int) returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', '00000000-0000-0000-0000-00000000000' || n, 'role', 'authenticated')::text, true);
$$;
grant execute on function pg_temp.login(int) to authenticated;

create function pg_temp.g(k text) returns uuid language sql as $$ select id from ids where ids.k = g.k $$;
grant execute on function pg_temp.g(text) to authenticated;

create function pg_temp.status(k text, n int) returns text language sql as $$
  select status::text from public.group_members
  where group_id = pg_temp.g(k) and user_id = ('00000000-0000-0000-0000-00000000000' || n)::uuid
$$;
grant execute on function pg_temp.status(text, int) to authenticated;

-- ── Crear (como O) ──────────────────────────────────────────────────────────
set local role authenticated;
select pg_temp.login(1);

insert into ids select 'abierto', public.create_group('Patinadores LP', 'Patinamos los sábados en el Bosque', 4::smallint, 3, 'open', 'Bosque');
insert into ids select 'aprob', public.create_group('Psicología 1° año', 'Grupo de estudio de primer año', 13::smallint, 3, 'approval');

reset role;
select is((select member_count from public.groups where id = pg_temp.g('abierto')), 1, 'AC-01: el grupo nuevo tiene 1 miembro');
select is((select role::text from public.group_members where group_id = pg_temp.g('abierto')), 'owner', 'AC-01: el creador queda con rol owner');
select is((select city_id from public.groups where id = pg_temp.g('abierto')),
          (select id from public.cities where name = 'La Plata'), 'El grupo toma la ciudad del creador');
set local role authenticated;

select throws_ok($$ select public.create_group('Ab', 'Descripción válida', 1::smallint, 5, 'open') $$, '23514', null, 'AC-02: nombre de 2 caracteres');
select throws_ok($$ select public.create_group('Nombre ok', 'Corta 123', 1::smallint, 5, 'open') $$, '23514', null, 'AC-02: descripción de 9 caracteres');
select throws_ok($$ select public.create_group('Nombre ok', 'Descripción válida', 1::smallint, 1, 'open') $$, '23514', null, 'AC-02: capacidad 1');
select throws_ok($$ select public.create_group('Nombre ok', 'Descripción válida', 1::smallint, 501, 'open') $$, '23514', null, 'AC-02: capacidad 501');

select throws_ok($$ insert into public.groups (name, description, category_id, city_id, access, max_members, owner_id)
                    values ('Directo', 'Insert directo a la tabla', 1, 1, 'open', 5, auth.uid()) $$,
  '42501', null, 'No se puede crear un grupo escribiendo la tabla');

select lives_ok($$ select public.create_group('Grupo ' || n, 'Descripción del grupo ' || n, 1::smallint, 5, 'open') from generate_series(1, 8) n $$,
  'Se pueden crear hasta 10 grupos');
select throws_ok($$ select public.create_group('Grupo 11', 'Descripción del grupo 11', 1::smallint, 5, 'open') $$,
  'P0001', 'Ya creaste 10 grupos. Eliminá uno para crear otro.', 'AC-03: el grupo número 11 no se puede crear');

-- ── Descubrir (como P) ──────────────────────────────────────────────────────
select pg_temp.login(3);

select is((select count(*)::int from public.discover_groups()), 10, 'AC-05: P ve los grupos de La Plata');
select is((select count(*)::int from public.discover_groups(p_category => 4::smallint)), 1, 'AC-06: filtrar por categoría');
select is((select name from public.discover_groups(p_search => 'psicologia')), 'Psicología 1° año', 'AC-06: buscar sin tildes encuentra el grupo');
select is((select name from public.discover_groups(p_search => 'PSICO')), 'Psicología 1° año', 'AC-06: buscar sin importar mayúsculas');

select pg_temp.login(5);
select is((select count(*)::int from public.discover_groups()), 0, 'AC-05: alguien de otra ciudad no ve grupos de La Plata');

select pg_temp.login(6);
select is((select count(*)::int from public.discover_groups()), 0, 'Bloqueo: no se ven grupos de alguien con quien hay bloqueo');
select throws_ok($$ select public.join_group(pg_temp.g('abierto')) $$, 'P0001', 'El grupo no existe', 'Bloqueo: no se puede unir');

reset role;
update public.groups set last_activity_at = now() - interval '14 days' where name like 'Grupo %';
update public.groups set last_activity_at = now() - interval '1 hour' where id = pg_temp.g('aprob');
update public.groups set last_activity_at = now() where id = pg_temp.g('abierto');
set local role authenticated;
select pg_temp.login(3);
select is((select name from public.discover_groups() limit 1), 'Patinadores LP', 'AC-07: el grupo con actividad más reciente va primero');

-- ── Unirse a un grupo abierto ───────────────────────────────────────────────
select pg_temp.login(2);
select is(public.join_group(pg_temp.g('abierto')), 'joined', 'AC-09: en un grupo abierto se entra directo');
select throws_ok($$ select public.join_group(pg_temp.g('abierto')) $$, 'P0001', 'Ya sos parte de este grupo', 'No se puede unir dos veces');

select pg_temp.login(3);
select is(public.join_group(pg_temp.g('abierto')), 'joined', 'Se llena el grupo (3/3)');

select pg_temp.login(4);
select throws_ok($$ select public.join_group(pg_temp.g('abierto')) $$, 'P0001', 'El grupo se llenó', 'Con el grupo lleno no se puede entrar');
select is((select name from public.discover_groups() offset 9 limit 1), 'Patinadores LP', 'AC-08: el grupo lleno aparece al final');
select ok((select is_full from public.discover_groups() where name = 'Patinadores LP'), 'AC-08: marcado como completo');

-- ── Solicitudes ─────────────────────────────────────────────────────────────
select is(public.join_group(pg_temp.g('aprob')), 'requested', 'AC-10: en un grupo con aprobación queda pendiente');
select lives_ok($$ select public.cancel_request(pg_temp.g('aprob')) $$, 'AC-11: se puede cancelar');
select is(pg_temp.status('aprob', 4), null, 'AC-11: la solicitud cancelada desaparece');

select public.join_group(pg_temp.g('aprob'));
select throws_ok($$ select public.decide_request(pg_temp.g('aprob'), auth.uid(), true) $$, '42501', null, 'AC-18: no podés aceptar tu propia solicitud');
select is((select count(*)::int from public.list_group_requests(pg_temp.g('aprob'))), 0, 'Un no creador no ve las solicitudes');

select pg_temp.login(1);
select ok(public.get_profile('00000000-0000-0000-0000-000000000004') ? 'bio', 'AC-17: el creador ve la bio de quien pide ingreso');
select is((select count(*)::int from public.list_group_requests(pg_temp.g('aprob'))), 1, 'El creador ve la solicitud');
select lives_ok($$ select public.decide_request(pg_temp.g('aprob'), '00000000-0000-0000-0000-000000000004', true) $$, 'AC-13: el creador acepta');
select is(pg_temp.status('aprob', 4), 'active', 'AC-13: el solicitante pasa a miembro');

-- Rechazo y espera de 7 días
select pg_temp.login(3);
select public.join_group(pg_temp.g('aprob'));
select pg_temp.login(1);
select public.decide_request(pg_temp.g('aprob'), '00000000-0000-0000-0000-000000000003', false);
select pg_temp.login(3);
select throws_like($$ select public.join_group(pg_temp.g('aprob')) $$, 'Podés volver a pedir ingreso a partir del %', 'AC-15: rechazado no puede volver a pedir antes de 7 días');
reset role;
update public.group_members set rejoin_after = now() - interval '1 minute' where group_id = pg_temp.g('aprob') and user_id = '00000000-0000-0000-0000-000000000003';
set local role authenticated;
select is(public.join_group(pg_temp.g('aprob')), 'requested', 'AC-15: pasados los 7 días puede volver a pedir');

-- Grupo con aprobación lleno: no se aceptan solicitudes
select pg_temp.login(2);
select public.join_group(pg_temp.g('aprob'));
select pg_temp.login(1);
select public.decide_request(pg_temp.g('aprob'), '00000000-0000-0000-0000-000000000003', true);
select throws_ok($$ select public.decide_request(pg_temp.g('aprob'), '00000000-0000-0000-0000-000000000002', true) $$,
  'P0001', 'El grupo está lleno', 'AC-14: con el grupo lleno no se puede aceptar');

-- AC-16: límite de 20 solicitudes pendientes (grupos creados como postgres para no chocar con el límite de 10)
reset role;
with nuevos as (
  insert into public.groups (name, description, category_id, city_id, access, max_members, owner_id)
  select 'Aprob ' || n, 'Grupo con aprobación ' || n, 1, 1, 'approval', 10, '00000000-0000-0000-0000-000000000003'
  from generate_series(1, 21) n
  returning id, name
)
insert into ids select name, id from nuevos;
insert into public.group_members (group_id, user_id, status, requested_at)
select id, '00000000-0000-0000-0000-000000000005', 'pending', now() from ids where k like 'Aprob %' and k <> 'Aprob 21';
update public.profiles set city_id = 1 where id = '00000000-0000-0000-0000-000000000005';
set local role authenticated;
select pg_temp.login(5);
select throws_ok($$ select public.join_group(pg_temp.g('Aprob 21')) $$, 'P0001', null, 'AC-16: con 20 solicitudes pendientes no se puede enviar otra');

-- ── Miembros ────────────────────────────────────────────────────────────────
select pg_temp.login(5);
select is((select count(*)::int from public.list_group_members(pg_temp.g('abierto'))), 0, 'AC-19: un no miembro no recibe la lista de miembros');
select is(jsonb_array_length(public.get_group(pg_temp.g('abierto')) -> 'preview'), 3, 'AC-19: un no miembro ve la vista previa (hasta 5)');
select is((select count(*)::int from public.group_members where group_id = pg_temp.g('abierto')), 0, 'AC-19: ni leyendo la tabla');

select pg_temp.login(2);
select is((select role::text from public.list_group_members(pg_temp.g('abierto')) limit 1), 'owner', 'AC-20: el creador figura primero');
select ok((public.get_profile('00000000-0000-0000-0000-000000000003') ->> 'extended')::boolean, 'AC-21: dos miembros ven el perfil extendido del otro');

-- ── Permisos del creador ────────────────────────────────────────────────────
select throws_ok($$ select public.update_group(pg_temp.g('abierto'), 'Otro nombre', 'Otra descripción', 4::smallint, 3, 'open') $$,
  '42501', null, 'AC-31: un miembro no puede editar');
select throws_ok($$ select public.delete_group(pg_temp.g('abierto'), 'Patinadores LP') $$, '42501', null, 'AC-31: un miembro no puede eliminar');
select throws_ok($$ select public.remove_member(pg_temp.g('abierto'), '00000000-0000-0000-0000-000000000003') $$, '42501', null, 'Un miembro no puede expulsar');

select pg_temp.login(1);
select throws_ok($$ select public.leave_group(pg_temp.g('abierto')) $$, 'P0001', null, 'AC-25: el creador no puede salirse');

-- ── Expulsar ────────────────────────────────────────────────────────────────
select public.remove_member(pg_temp.g('abierto'), '00000000-0000-0000-0000-000000000002');
select pg_temp.login(2);
select throws_ok($$ select public.join_group(pg_temp.g('abierto')) $$, 'P0001', 'Ya no sos parte de este grupo', 'AC-26: el expulsado no puede volver');
select ok(not exists (select 1 from public.discover_groups() where name = 'Patinadores LP'), 'AC-26: el grupo no le aparece en Descubrir');
select ok((public.get_group(pg_temp.g('abierto')) ->> 'banned')::boolean, 'AC-26: al entrar ve que ya no es parte');

-- ── Editar ──────────────────────────────────────────────────────────────────
-- AC-27: bajar la capacidad no expulsa. Patinadores: O y P tras la expulsión; entra R → 3/3.
select pg_temp.login(4);
select public.join_group(pg_temp.g('abierto'));
select pg_temp.login(1);
select public.update_group(pg_temp.g('abierto'), 'Patinadores LP', 'Patinamos los sábados en el Bosque', 4::smallint, 2, 'open', 'Bosque');
reset role;
select is((select member_count from public.groups where id = pg_temp.g('abierto')), 3, 'AC-27: bajar la capacidad no expulsa a nadie');
set local role authenticated;
select pg_temp.login(5);
select throws_ok($$ select public.join_group(pg_temp.g('abierto')) $$, 'P0001', 'El grupo se llenó', 'AC-27: con la capacidad bajada nadie más entra');
reset role;

-- AC-28: con aprobación → abierto, con 3 lugares y 5 pendientes
insert into ids select 'transicion', public.create_group('Transición', 'Grupo para probar el cambio de acceso', 1::smallint, 4, 'approval')
  from (select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000000004"}', true)) s;
insert into public.group_members (group_id, user_id, status, requested_at)
select pg_temp.g('transicion'), ('00000000-0000-0000-0000-00000000000' || n)::uuid, 'pending', now() - (n || ' minutes')::interval
from unnest(array[1, 2, 3, 5, 6]) n;
set local role authenticated;
select pg_temp.login(4);
select public.update_group(pg_temp.g('transicion'), 'Transición', 'Grupo para probar el cambio de acceso', 1::smallint, 4, 'open');
reset role;
select is((select member_count from public.groups where id = pg_temp.g('transicion')), 4, 'AC-28: se llenan los 3 lugares libres');
select set_eq(
  $$ select right(user_id::text, 1) from public.group_members where group_id = pg_temp.g('transicion') and status = 'active' and role = 'member' $$,
  array['6', '5', '3'],
  'AC-28: entran las 3 solicitudes más viejas'
);
select ok(
  (select bool_and(rejoin_after <= now()) from public.group_members where group_id = pg_temp.g('transicion') and status = 'rejected'),
  'AC-28: las otras se rechazan sin espera para volver a pedir'
);

-- ── Eliminar ────────────────────────────────────────────────────────────────
set local role authenticated;
select pg_temp.login(1);
select throws_ok($$ select public.delete_group(pg_temp.g('aprob'), 'psicología 1° año') $$, 'P0001', 'El nombre no coincide', 'AC-29: sin el nombre exacto no se elimina');
select lives_ok($$ select public.delete_group(pg_temp.g('aprob'), 'Psicología 1° año') $$, 'AC-29: con el nombre exacto se elimina');
select pg_temp.login(4);
select ok(not exists (select 1 from public.list_my_groups() where name = 'Psicología 1° año'), 'AC-30: no aparece en Lo mío de los miembros');
select ok(not exists (select 1 from public.discover_groups() where name = 'Psicología 1° año'), 'AC-30: no aparece en Descubrir');

select * from finish();
rollback;
