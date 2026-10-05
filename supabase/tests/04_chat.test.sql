-- Spec 04 · Chat. Criterios que hace cumplir la base.
-- AC-10, AC-11, AC-16 y AC-17 (tiempo real, reintentos, links, scroll) se verifican en la app.
-- Ojo: dentro de una transacción now() es fijo, así que todos los mensajes tienen la misma hora.
begin;
select plan(41);

delete from public.groups;
delete from public.plans;

-- O: creador del grupo y del plan · M: miembro · X: ajeno · P: participante del plan
-- B: miembro bloqueado por M · S: miembro para probar el límite anti-spam
insert into auth.users (id, email, aud, role, raw_user_meta_data)
select ('00000000-0000-0000-0000-00000000000' || n)::uuid, 'c' || n || '@test.com', 'authenticated', 'authenticated', '{}'
from generate_series(1, 7) n;

update public.profiles
set name = (array['Olga', 'Mario', 'Ximena', 'Pablo', 'Bruno', 'Sofía', 'Nuevo'])[right(profiles.id::text, 1)::int],
    birthdate = '2000-01-01', avatar_url = 'https://foto', city_id = 1,
    terms_accepted_at = now(), onboarding_completed_at = now(), safety_notice_accepted_at = now()
where id::text like '00000000-0000-0000-0000-00000000000_';

create temp table ids (k text primary key, id uuid);
grant all on ids to authenticated;
create function pg_temp.login(n int) returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', '00000000-0000-0000-0000-00000000000' || n, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.id(k text) returns uuid language sql as $$ select id from ids where ids.k = id.k $$;
create function pg_temp.u(n int) returns uuid language sql as $$ select ('00000000-0000-0000-0000-00000000000' || n)::uuid $$;
-- Mensajes visibles de un chat para el usuario actual.
create function pg_temp.msgs(k text) returns setof jsonb language sql as $$
  select * from public.list_messages(p_group => case when k like 'g%' then pg_temp.id(k) end,
                                     p_plan => case when k like 'p%' then pg_temp.id(k) end, p_limit => 100)
$$;
grant execute on function pg_temp.login(int), pg_temp.id(text), pg_temp.u(int), pg_temp.msgs(text) to authenticated;

set local role authenticated;
select pg_temp.login(1);
insert into ids select 'g', public.create_group('Grupo chat', 'Grupo para probar el chat', 1::smallint, 50, 'open');
insert into ids select 'p', public.create_plan(p_title => 'Plan chat', p_category_id => 1::smallint, p_place_name => 'Plaza',
  p_starts_at => now() + interval '1 day', p_max_participants => 10, p_group_id => pg_temp.id('g'));

select pg_temp.login(2); select public.join_group(pg_temp.id('g'));
select pg_temp.login(5); select public.join_group(pg_temp.id('g'));
select pg_temp.login(6); select public.join_group(pg_temp.id('g'));
select pg_temp.login(4); select public.join_plan(pg_temp.id('p'));

-- ── Acceso ──────────────────────────────────────────────────────────────────
select pg_temp.login(2);
select lives_ok($$ select public.send_message('Hola grupo', p_group => pg_temp.id('g')) $$, 'AC-01: un miembro escribe en el chat del grupo');

select pg_temp.login(3);
select throws_ok($$ select public.send_message('Me cuelo', p_group => pg_temp.id('g')) $$, '42501', null, 'AC-01: un ajeno no puede escribir');
select is((select count(*)::int from pg_temp.msgs('g')), 0, 'AC-01: ni leer');
select is((select count(*)::int from public.messages), 0, 'AC-01: ni leyendo la tabla');
select throws_ok($$ insert into public.messages (group_id, sender_id, body) values (pg_temp.id('g'), auth.uid(), 'x') $$,
  '42501', null, 'AC-21: no se pueden crear mensajes escribiendo la tabla');

select pg_temp.login(2);
select is((select count(*)::int from pg_temp.msgs('p')), 0, 'AC-02: un miembro del grupo que no se sumó al plan no lee su chat');
select throws_ok($$ select public.send_message('Hola', p_plan => pg_temp.id('p')) $$, '42501', null, 'AC-02: ni escribe');

select pg_temp.login(4);
select lives_ok($$ select public.send_message('¿Quién lleva la pelota?', p_plan => pg_temp.id('p')) $$, 'Un participante escribe en el chat del plan');

-- AC-03: un miembro nuevo ve lo anterior
select pg_temp.login(7);
select public.join_group(pg_temp.id('g'));
select ok(exists (select 1 from pg_temp.msgs('g') m where m ->> 'body' = 'Hola grupo'), 'AC-03: quien entra ve el historial');

-- ── Mensajes del sistema ────────────────────────────────────────────────────
select ok(exists (select 1 from pg_temp.msgs('g') m where m ->> 'kind' = 'system' and m ->> 'body' = 'Nuevo se unió al grupo'),
  'AC-19: se anuncia quien se une al grupo');
select pg_temp.login(4);
select ok(exists (select 1 from pg_temp.msgs('p') m where m ->> 'body' = 'Pablo se sumó'), 'AC-18: se anuncia quien se suma al plan');

select pg_temp.login(7);
select public.leave_group(pg_temp.id('g'));
reset role;
select is((select count(*)::int from public.messages where group_id = pg_temp.id('g') and body like '%Nuevo%'), 1,
  'AC-19: salir del grupo no se anuncia');
set local role authenticated;

-- AC-04: al salir pierde el historial
select is((select count(*)::int from pg_temp.msgs('g')), 0, 'AC-04: quien sale deja de ver el chat');

-- AC-20: cambio de horario
select pg_temp.login(1);
select public.update_plan(pg_temp.id('p'), 'Plan chat', 1::smallint, 'Plaza', now() + interval '1 day 1 hour', 10);
select ok(exists (select 1 from pg_temp.msgs('p') m where m ->> 'body' like 'Cambió el horario: % → %'), 'AC-20: se publica el cambio de horario');
select public.update_plan(pg_temp.id('p'), 'Plan chat', 1::smallint, 'Parque Saavedra', now() + interval '1 day 1 hour', 10);
select ok(exists (select 1 from pg_temp.msgs('p') m where m ->> 'body' = 'Cambió el lugar: Parque Saavedra'), 'AC-20: se publica el cambio de lugar');

-- ── Contenido ───────────────────────────────────────────────────────────────
select pg_temp.login(2);
select throws_ok($$ select public.send_message('   ', p_group => pg_temp.id('g')) $$, 'P0001', null, 'AC-09: mensaje vacío no');
select throws_ok($$ select public.send_message(repeat('a', 2001), p_group => pg_temp.id('g')) $$, 'P0001', null, 'AC-09: más de 2000 caracteres no');
select lives_ok($$ select public.send_message(repeat('a', 2000), p_group => pg_temp.id('g')) $$, 'AC-09: 2000 caracteres sí');

-- AC-13 a AC-15: borrar
insert into ids select 'm_mario', (public.send_message('Me equivoqué', p_group => pg_temp.id('g')) ->> 'id')::uuid;
insert into ids select 'm_mario2', (public.send_message('Mensaje feo', p_group => pg_temp.id('g')) ->> 'id')::uuid;
select lives_ok($$ select public.delete_message(pg_temp.id('m_mario')) $$, 'AC-13: el autor borra su mensaje');
select is((select m ->> 'deleted_by' from pg_temp.msgs('g') m where m ->> 'id' = pg_temp.id('m_mario')::text), 'author', 'AC-13: queda como borrado por el autor');
select is((select m ->> 'body' from pg_temp.msgs('g') m where m ->> 'id' = pg_temp.id('m_mario')::text), '', 'AC-13: el texto no se devuelve');

select pg_temp.login(6);
select throws_ok($$ select public.delete_message(pg_temp.id('m_mario2')) $$, '42501', null, 'AC-14: un miembro no borra mensajes de otros');

select pg_temp.login(1);
select lives_ok($$ select public.delete_message(pg_temp.id('m_mario2')) $$, 'AC-15: el creador del grupo modera');
select is((select m ->> 'deleted_by' from pg_temp.msgs('g') m where m ->> 'id' = pg_temp.id('m_mario2')::text), 'moderator', 'AC-15: queda como borrado por el moderador');

reset role;
select is((select body from public.messages where id = pg_temp.id('m_mario2')), '', 'El texto borrado tampoco queda en la base');
set local role authenticated;

-- ── Bloqueos ────────────────────────────────────────────────────────────────
select pg_temp.login(5);
insert into ids select 'm_bruno', (public.send_message('Soy Bruno', p_group => pg_temp.id('g')) ->> 'id')::uuid;
reset role;
insert into public.blocks values (pg_temp.u(2), pg_temp.u(5));
set local role authenticated;

select pg_temp.login(2);
select ok(not exists (select 1 from pg_temp.msgs('g') m where m ->> 'sender_id' = pg_temp.u(5)::text), 'AC-22: quien bloquea no ve los mensajes del bloqueado');
select is((select count(*)::int from public.messages where sender_id = pg_temp.u(5)), 0, 'AC-23: ni leyendo la tabla (lo que usa el tiempo real)');
select pg_temp.login(5);
select ok(not exists (select 1 from pg_temp.msgs('g') m where m ->> 'sender_id' = pg_temp.u(2)::text), 'AC-22: el bloqueado tampoco ve los de quien lo bloqueó');

-- ── No leídos y silenciar ───────────────────────────────────────────────────
select pg_temp.login(6);
select public.mark_read(p_group => pg_temp.id('g'));
reset role;
-- Mensajes "posteriores" a la lectura: se fuerza la hora porque now() es fijo en la transacción.
update public.chat_reads set last_read_at = now() - interval '1 minute' where user_id = pg_temp.u(6);
update public.messages set created_at = now() - interval '2 minutes' where group_id = pg_temp.id('g');
insert into public.messages (group_id, sender_id, body)
select pg_temp.id('g'), pg_temp.u(1), 'Nuevo ' || n from generate_series(1, 3) n;
set local role authenticated;
select pg_temp.login(6);
select is((select unread from public.list_my_chats() where group_id = pg_temp.id('g')), 3, 'AC-24: cuenta 3 no leídos');
select public.mark_read(p_group => pg_temp.id('g'));
reset role;
update public.chat_reads set last_read_at = now() + interval '1 second' where user_id = pg_temp.u(6);
set local role authenticated;
select is((select unread from public.list_my_chats() where group_id = pg_temp.id('g')), 0, 'AC-25: al abrir el chat vuelve a 0');

select public.set_chat_muted(true, p_group => pg_temp.id('g'));
select ok((public.get_chat(p_group => pg_temp.id('g')) ->> 'muted')::boolean, 'AC-26: el chat queda silenciado');

-- ── Límite anti-spam ────────────────────────────────────────────────────────
select lives_ok($$ select public.send_message('Mensaje ' || n, p_group => pg_temp.id('g')) from generate_series(1, 10) n $$,
  'AC-12: 10 mensajes seguidos se pueden mandar');
select throws_ok($$ select public.send_message('El 11', p_group => pg_temp.id('g')) $$, 'P0001',
  'Esperá un momento antes de seguir escribiendo', 'AC-12: el 11 dentro de 10 segundos no');

-- ── Estado del chat del plan ────────────────────────────────────────────────
reset role;
insert into public.plans (id, title, category_id, city_id, place_name, starts_at, max_participants, creator_id) values
  ('00000000-0000-0000-0000-0000000000a1', 'Terminó hace 23 h', 1, 1, 'Lugar', now() - interval '26 hours', 5, pg_temp.u(4)),
  ('00000000-0000-0000-0000-0000000000a2', 'Terminó hace 25 h', 1, 1, 'Lugar', now() - interval '28 hours', 5, pg_temp.u(4));
insert into public.plan_participants (plan_id, user_id) values
  ('00000000-0000-0000-0000-0000000000a1', pg_temp.u(4)), ('00000000-0000-0000-0000-0000000000a2', pg_temp.u(4));
set local role authenticated;
select pg_temp.login(4);
select lives_ok($$ select public.send_message('¡Qué buen plan!', p_plan => '00000000-0000-0000-0000-0000000000a1') $$,
  'AC-06: hasta 24 h después del fin se puede escribir');
select throws_ok($$ select public.send_message('¿Repetimos?', p_plan => '00000000-0000-0000-0000-0000000000a2') $$, 'P0001',
  'Este plan terminó: el chat es de solo lectura', 'AC-07: pasadas las 24 h es de solo lectura');

-- AC-08 y spec 03 AC-28: cancelado con motivo
select pg_temp.login(1);
select public.cancel_plan(pg_temp.id('p'), 'Llueve');
select ok(exists (select 1 from pg_temp.msgs('p') m where m ->> 'body' = 'El plan fue cancelado: Llueve'), 'Spec 03 AC-28: el motivo se publica en el chat');
select pg_temp.login(4);
select throws_ok($$ select public.send_message('¿Entonces?', p_plan => pg_temp.id('p')) $$, 'P0001',
  'Este plan fue cancelado: el chat es de solo lectura', 'AC-08: en un plan cancelado no se puede escribir');
select ok(exists (select 1 from pg_temp.msgs('p')), 'AC-08: pero se sigue leyendo');

-- AC-05: sacado del plan
reset role;
insert into public.plan_participants (plan_id, user_id) values ('00000000-0000-0000-0000-0000000000a1', pg_temp.u(6));
update public.plan_participants set removed_at = now() where plan_id = '00000000-0000-0000-0000-0000000000a1' and user_id = pg_temp.u(6);
set local role authenticated;
select pg_temp.login(6);
select is((select count(*)::int from public.list_messages(p_plan => '00000000-0000-0000-0000-0000000000a1')), 0, 'AC-05: el sacado no lee el chat del plan');

-- ── Cuenta eliminada (spec 01 AC-21) ────────────────────────────────────────
reset role;
delete from auth.users where id = pg_temp.u(5);
select is((select sender_id from public.messages where id = pg_temp.id('m_bruno')), null, 'Spec 01 AC-21: los mensajes de una cuenta eliminada quedan sin autor');
select is((select body from public.messages where id = pg_temp.id('m_bruno')), 'Soy Bruno', 'Spec 01 AC-21: y se conservan');

select * from finish();
rollback;
