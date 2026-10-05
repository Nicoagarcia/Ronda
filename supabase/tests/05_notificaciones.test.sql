-- Spec 05 · Notificaciones. Qué se encola, para quién y con qué texto.
-- El envío real (Expo, tokens inválidos: AC-21) se probó contra la Edge Function send-push.
-- Lo que pasa en el celular (permiso, banner, tocar la notificación) se verifica en la app.
begin;
select plan(42);

delete from public.groups;
delete from public.plans;
delete from public.notification_outbox;

-- O: creadora · M: miembro · P: otra miembro · R: solicitante · B: bloqueado por P
insert into auth.users (id, email, aud, role, raw_user_meta_data)
select ('00000000-0000-0000-0000-00000000000' || n)::uuid, 'n' || n || '@test.com', 'authenticated', 'authenticated', '{}'
from generate_series(1, 5) n;

update public.profiles
set name = (array['Olga', 'Mario', 'Pía', 'Raúl', 'Beto'])[right(profiles.id::text, 1)::int],
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
grant execute on function pg_temp.login(int), pg_temp.id(text), pg_temp.u(int) to authenticated;

-- Notificaciones encoladas para un usuario y tipo.
create function pg_temp.notifs(n int, t text) returns setof public.notification_outbox language sql as $$
  select * from public.notification_outbox where user_id = pg_temp.u(n) and type::text = t order by id
$$;
create function pg_temp.count(n int, t text) returns int language sql as $$ select count(*)::int from pg_temp.notifs(n, t) $$;

set local role authenticated;
select pg_temp.login(1);
insert into ids select 'g', public.create_group('Patinadores', 'Grupo de prueba de notificaciones', 4::smallint, 50, 'open');
insert into ids select 'g_aprob', public.create_group('Con aprobación', 'Grupo con aprobación de prueba', 4::smallint, 50, 'approval');
select pg_temp.login(2); select public.join_group(pg_temp.id('g'));
select pg_temp.login(3); select public.join_group(pg_temp.id('g'));
select pg_temp.login(5); select public.join_group(pg_temp.id('g'));
reset role;
insert into public.blocks values (pg_temp.u(3), pg_temp.u(5));
delete from public.notification_outbox;
set local role authenticated;

-- ── N1: mensaje ─────────────────────────────────────────────────────────────
select pg_temp.login(2);
select public.send_message('¿Salimos el sábado?', p_group => pg_temp.id('g'));
reset role;
select is((select title || ' | ' || body || ' | ' || path from pg_temp.notifs(1, 'message')),
  'Patinadores | Mario: ¿Salimos el sábado? | /group/' || pg_temp.id('g') || '/chat', 'AC-01 N1: texto y destino del mensaje');
select is(pg_temp.count(2, 'message'), 0, 'AC-02: el autor no recibe su propio mensaje');
select is((select channel from pg_temp.notifs(1, 'message')), 'messages', 'N1 va por el canal de Android "Mensajes"');

-- AC-07: más mensajes dentro de los 5 minutos no notifican
set local role authenticated;
select public.send_message('Mensaje ' || n, p_group => pg_temp.id('g')) from generate_series(1, 9) n;
reset role;
select is(pg_temp.count(1, 'message'), 1, 'AC-07: 10 mensajes en un minuto generan una sola notificación');

-- AC-03: lo que escribe un bloqueado no le llega a quien lo bloqueó
set local role authenticated;
select pg_temp.login(5);
select public.send_message('Hola soy Beto', p_group => pg_temp.id('g'));
reset role;
select ok(not exists (select 1 from pg_temp.notifs(3, 'message') where body like 'Beto:%'), 'AC-03: no llegan notificaciones de alguien bloqueado');

-- AC-08: pasados 5 minutos, un resumen con el total
update public.chat_reads set last_notified_at = now() - interval '6 minutes', last_read_at = '-infinity' where user_id = pg_temp.u(1);
update public.messages set created_at = now() - interval '5 minutes 30 seconds' where group_id = pg_temp.id('g');
select public.enqueue_message_digests();
select is((select body from pg_temp.notifs(1, 'message_digest')), '11 mensajes nuevos', 'AC-08: después de 5 minutos llega un resumen con el total');
select is(public.enqueue_message_digests(), 0, 'AC-08: el resumen no se repite');

-- AC-09: si abrió el chat entre medio, no hay resumen
update public.chat_reads set last_notified_at = now() - interval '6 minutes', last_read_at = now() - interval '1 minute' where user_id = pg_temp.u(2);
select public.enqueue_message_digests();
select is(pg_temp.count(2, 'message_digest'), 0, 'AC-09: si abrió el chat no recibe resumen');

-- AC-13: chat silenciado
delete from public.notification_outbox;
delete from public.chat_reads where user_id = pg_temp.u(1);
set local role authenticated;
select pg_temp.login(1);
select public.set_chat_muted(true, p_group => pg_temp.id('g'));
select pg_temp.login(2);
select public.send_message('¿Y?', p_group => pg_temp.id('g'));
reset role;
select is(pg_temp.count(1, 'message'), 0, 'AC-13: un chat silenciado no notifica mensajes');

-- AC-14: ajuste "Mensajes" apagado
set local role authenticated;
select pg_temp.login(3);
select public.update_notification_settings('{"messages": false}');
select pg_temp.login(2);
reset role;
update public.chat_reads set last_notified_at = null where user_id = pg_temp.u(3);
set local role authenticated;
select public.send_message('Otro más', p_group => pg_temp.id('g'));
reset role;
select is(pg_temp.count(3, 'message'), 0, 'AC-14: con "Mensajes" apagado no llegan');

-- ── N3 / N4: solicitudes ────────────────────────────────────────────────────
set local role authenticated;
select pg_temp.login(4);
select public.join_group(pg_temp.id('g_aprob'));
reset role;
select is((select title || ' | ' || body from pg_temp.notifs(1, 'join_request')), 'Con aprobación | Raúl quiere unirse', 'AC-01 N3: solicitud al creador');
select is((select channel from pg_temp.notifs(1, 'join_request')), 'groups', 'N3 va por el canal "Grupos"');
set local role authenticated;
select pg_temp.login(1);
select public.decide_request(pg_temp.id('g_aprob'), pg_temp.u(4), true);
reset role;
select is((select body from pg_temp.notifs(4, 'request_accepted')), 'Ya sos parte del grupo 🎉', 'AC-01 N4: aceptación al solicitante');

-- AC-04: rechazo y expulsión no notifican
delete from public.notification_outbox;
set local role authenticated;
select pg_temp.login(2);
select public.join_group(pg_temp.id('g_aprob'));
select pg_temp.login(1);
select public.decide_request(pg_temp.id('g_aprob'), pg_temp.u(2), false);
select public.remove_member(pg_temp.id('g_aprob'), pg_temp.u(4));
reset role;
select is((select count(*)::int from public.notification_outbox where user_id in (pg_temp.u(2), pg_temp.u(4))), 0,
  'AC-04: rechazar o expulsar no genera notificaciones');

-- ── N5: plan nuevo en el grupo ──────────────────────────────────────────────
set local role authenticated;
select pg_temp.login(1);
insert into ids select 'p', public.create_plan(p_title => 'Patinar en el Bosque', p_category_id => 4::smallint,
  p_place_name => 'Lago', p_starts_at => now() + interval '1 day', p_max_participants => 10, p_group_id => pg_temp.id('g'));
reset role;
select ok((select body from pg_temp.notifs(2, 'group_plan')) like 'Nuevo plan: 🛼 Patinar en el Bosque, %',
  'AC-01 N5: plan nuevo a los miembros del grupo');
select is(pg_temp.count(1, 'group_plan'), 0, 'AC-02: quien crea el plan no recibe el aviso');

-- AC-15: cada interruptor corta solo lo suyo
set local role authenticated;
select pg_temp.login(3);
select public.update_notification_settings('{"messages": true, "group_plans": false}');
select pg_temp.login(1);
insert into ids select 'p2', public.create_plan(p_title => 'Otro plan', p_category_id => 4::smallint,
  p_place_name => 'Lago', p_starts_at => now() + interval '2 days', p_max_participants => 10, p_group_id => pg_temp.id('g'));
reset role;
select is((select count(*)::int from pg_temp.notifs(3, 'group_plan') where body like '%Otro plan%'), 0, 'AC-15: "Planes nuevos" apagado corta N5');
select is((select messages from public.notification_settings where user_id = pg_temp.u(3)), true, 'AC-15: y no toca los otros ajustes');

-- ── N6: gente que se suma (AC-10) ───────────────────────────────────────────
delete from public.notification_outbox;
set local role authenticated;
select pg_temp.login(2); select public.join_plan(pg_temp.id('p'));
reset role;
select is((select body from pg_temp.notifs(1, 'plan_join')), 'Mario se sumó (2/10)', 'AC-01 N6: se avisa al creador');
select ok((select send_after > now() from pg_temp.notifs(1, 'plan_join')), 'AC-10: la primera espera un poco para juntar');
set local role authenticated;
select pg_temp.login(3); select public.join_plan(pg_temp.id('p'));
select pg_temp.login(5); select public.join_plan(pg_temp.id('p'));
reset role;
select is(pg_temp.count(1, 'plan_join'), 1, 'AC-10: 3 personas en 2 minutos generan una sola notificación');
select is((select body from pg_temp.notifs(1, 'plan_join')), 'Mario y 2 más se sumaron (4/10)', 'AC-10: "Mario y 2 más se sumaron"');

-- Después de enviada, la siguiente espera 10 minutos desde el envío
update public.notification_outbox set sent_at = now() where type = 'plan_join';
set local role authenticated;
select pg_temp.login(4); select public.join_plan(pg_temp.id('p'));
reset role;
select is((select send_after from pg_temp.notifs(1, 'plan_join') where sent_at is null), now() + interval '10 minutes',
  'N6: como máximo una cada 10 minutos por plan');

-- ── N8 / N9: cambios y cancelación ──────────────────────────────────────────
delete from public.notification_outbox;
set local role authenticated;
select pg_temp.login(1);
select public.update_plan(pg_temp.id('p'), 'Patinar en el Bosque', 4::smallint, 'Lago', now() + interval '1 day 1 hour', 10);
reset role;
select ok((select body from pg_temp.notifs(2, 'plan_changed')) like 'Cambió el horario: ahora %', 'AC-01 N8: cambio de horario a los participantes');
select is(pg_temp.count(1, 'plan_changed'), 0, 'AC-02: quien cambia el plan no recibe el aviso');
select is(pg_temp.count(3, 'plan_changed'), 1, 'N8 llega aunque "Planes nuevos" esté apagado');
set local role authenticated;
select public.update_plan(pg_temp.id('p'), 'Patinar en el Bosque', 4::smallint, 'Lago', now() + interval '1 day 1 hour', 10, p_description => 'Con casco');
reset role;
select is(pg_temp.count(2, 'plan_changed'), 1, 'Cambiar la descripción no notifica');

-- AC-13: silenciar el chat del plan no corta la cancelación
set local role authenticated;
select pg_temp.login(2);
select public.set_chat_muted(true, p_plan => pg_temp.id('p'));
select pg_temp.login(1);
select public.cancel_plan(pg_temp.id('p'), 'Llueve');
reset role;
select is((select body || ' | ' || path from pg_temp.notifs(2, 'plan_cancelled')),
  'Se canceló el plan: Llueve | /plan/' || pg_temp.id('p') || '/chat', 'AC-01 N9 / AC-13: la cancelación llega aunque el chat esté silenciado');

-- ── N7: recordatorio ────────────────────────────────────────────────────────
delete from public.notification_outbox;
insert into public.plans (id, title, category_id, city_id, place_name, starts_at, max_participants, creator_id)
values ('00000000-0000-0000-0000-0000000000b1', 'Café', 27, 1, 'Café Martinica', now() + interval '1 hour 58 minutes', 5, pg_temp.u(1));
insert into public.plan_participants (plan_id, user_id, joined_at) values
  ('00000000-0000-0000-0000-0000000000b1', pg_temp.u(1), now() - interval '1 day'),
  ('00000000-0000-0000-0000-0000000000b1', pg_temp.u(2), now() - interval '3 hours'),
  ('00000000-0000-0000-0000-0000000000b1', pg_temp.u(3), now());
select public.enqueue_plan_reminders();
select ok((select body from pg_temp.notifs(2, 'plan_reminder')) like 'Empieza a las % · Café Martinica', 'AC-11 N7: recordatorio 2 h antes');
select is(pg_temp.count(1, 'plan_reminder'), 1, 'AC-11: también al creador');
select is(pg_temp.count(3, 'plan_reminder'), 0, 'AC-12: quien se sumó en las 2 h previas no recibe recordatorio');
select is(public.enqueue_plan_reminders(), 0, 'AC-11: una sola vez por plan y participante');

-- ── N10: grupo eliminado ────────────────────────────────────────────────────
set local role authenticated;
select pg_temp.login(3);
select public.update_notification_settings('{"messages": false, "requests": false, "group_plans": false, "plan_joins": false, "plan_updates": false}');
select pg_temp.login(1);
select public.delete_group(pg_temp.id('g'), 'Patinadores');
reset role;
select is((select body from pg_temp.notifs(2, 'group_deleted')), 'El grupo Patinadores fue eliminado', 'AC-01 N10: grupo eliminado a los miembros');
select is(pg_temp.count(3, 'group_deleted'), 1, 'N10 llega siempre, aunque todo esté apagado');
select is(pg_temp.count(1, 'group_deleted'), 0, 'AC-02: la creadora no recibe el aviso');

-- ── Dispositivos y permisos ─────────────────────────────────────────────────
set local role authenticated;
select pg_temp.login(2);
select public.register_push_token('ExponentPushToken[celu-1]', 'android', 'dispositivo-1');
select public.register_push_token('ExponentPushToken[celu-2]', 'android', 'dispositivo-2');
select is((select count(*)::int from public.push_tokens), 2, 'AC-19: un usuario puede tener varios dispositivos');
select public.unregister_push_token('ExponentPushToken[celu-1]');
select is((select count(*)::int from public.push_tokens), 1, 'AC-20: al cerrar sesión se borra ese dispositivo');

select pg_temp.login(3);
select public.register_push_token('ExponentPushToken[celu-2]', 'android', 'dispositivo-2');
reset role;
select is((select user_id from public.push_tokens where token = 'ExponentPushToken[celu-2]'), pg_temp.u(3),
  'Si otra persona inicia sesión en ese celular, el dispositivo pasa a ser suyo');
set local role authenticated;

select pg_temp.login(2);
select throws_ok($$ select count(*) from public.notification_outbox $$, '42501', null, 'La cola no se puede leer desde la app');
select throws_ok($$ select public.claim_notifications() $$, '42501', null, 'Solo el servidor puede tomar la cola');

-- ── Eliminar cuenta (spec 01): cancela sus planes y avisa ───────────────────
reset role;
delete from public.notification_outbox;
insert into public.plans (id, title, category_id, city_id, place_name, starts_at, max_participants, creator_id)
values ('00000000-0000-0000-0000-0000000000c1', 'Plan de Raúl', 1, 1, 'Plaza', now() + interval '1 day', 5, pg_temp.u(4));
insert into public.plan_participants (plan_id, user_id) values
  ('00000000-0000-0000-0000-0000000000c1', pg_temp.u(4)), ('00000000-0000-0000-0000-0000000000c1', pg_temp.u(2));
select public.prepare_account_deletion(pg_temp.u(4));
select is((select body from pg_temp.notifs(2, 'plan_cancelled')), 'Se canceló el plan: Quien lo organizaba eliminó su cuenta',
  'Spec 01: al eliminar la cuenta se cancelan sus planes con aviso');
delete from auth.users where id = pg_temp.u(4);
select is(pg_temp.count(2, 'plan_cancelled'), 1, 'Spec 01: el aviso sobrevive al borrado de la cuenta');

select * from finish();
rollback;
