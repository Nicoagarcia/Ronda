-- Spec 06 · Reportes, bloqueos y moderación.
-- AC-21 (un usuario común no puede moderar por API) se prueba contra la API con
-- scripts/moderation/admin-only.mjs: acá la sesión es directa a la base, como el dashboard.
begin;
select plan(49);

delete from public.groups;
delete from public.plans;
delete from public.notification_outbox;

-- A: reporta y bloquea · B: reportado · C y D: otros · O: creadora · S: para suspender
insert into auth.users (id, email, aud, role, raw_user_meta_data)
select ('00000000-0000-0000-0000-00000000000' || n)::uuid, 'm' || n || '@test.com', 'authenticated', 'authenticated', '{}'
from generate_series(1, 6) n;

update public.profiles
set name = (array['Ana', 'Beto', 'Caro', 'Dani', 'Olga', 'Sergio'])[right(profiles.id::text, 1)::int],
    birthdate = '2000-01-01', avatar_url = 'https://foto', city_id = 1, bio = 'Mi bio',
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

set local role authenticated;
select pg_temp.login(5);
insert into ids select 'g', public.create_group('Grupo', 'Grupo para probar moderación', 1::smallint, 50, 'open');
insert into ids select 'p', public.create_plan(p_title => 'Plan', p_category_id => 1::smallint, p_place_name => 'Plaza',
  p_starts_at => now() + interval '1 day', p_max_participants => 10, p_group_id => pg_temp.id('g'));
select pg_temp.login(1); select public.join_group(pg_temp.id('g')); select public.join_plan(pg_temp.id('p'));
select pg_temp.login(2); select public.join_group(pg_temp.id('g'));
insert into ids select 'g_beto', public.create_group('Grupo de Beto', 'Grupo creado por Beto', 1::smallint, 50, 'open');
select pg_temp.login(3); select public.join_group(pg_temp.id('g'));
select pg_temp.login(4); select public.join_group(pg_temp.id('g')); select public.join_plan(pg_temp.id('p'));
select pg_temp.login(6); select public.join_group(pg_temp.id('g'));

-- ── Bloquear ────────────────────────────────────────────────────────────────
select pg_temp.login(1);
select throws_ok($$ select public.block_user(auth.uid()) $$, 'P0001', null, 'No se puede bloquear a uno mismo');
select lives_ok($$ select public.block_user(pg_temp.u(2)) $$, 'AC-01: A bloquea a B');
select is((select count(*)::int from public.list_my_blocks()), 1, 'AC-06: aparece en Bloqueados');

-- AC-02 / AC-03: efectos en las dos direcciones
select is(public.get_profile(pg_temp.u(2)), null, 'AC-02: A no ve el perfil de B');
select ok(not exists (select 1 from public.discover_groups() where name = 'Grupo de Beto'), 'AC-02: A no ve los grupos de B');
select pg_temp.login(2);
select is(public.get_profile(pg_temp.u(1)), null, 'AC-03: B tampoco ve el perfil de A');
insert into ids select 'm_beto', (public.send_message('Mensaje de Beto', p_group => pg_temp.id('g')) ->> 'id')::uuid;
select pg_temp.login(1);
select ok(not exists (select 1 from public.list_messages(p_group => pg_temp.id('g')) m where m ->> 'id' = pg_temp.id('m_beto')::text),
  'AC-02: A no ve los mensajes de B');
reset role;
select is((select count(*)::int from public.notification_outbox where user_id = pg_temp.u(1) and body like 'Beto:%'), 0,
  'AC-02: A no recibe notificaciones por lo que hace B');
set local role authenticated;

-- AC-07
select pg_temp.login(2);
select is((select count(*)::int from public.blocks), 0, 'AC-07: B no puede ver quién lo bloqueó');
select is((select count(*)::int from public.list_my_blocks()), 0, 'AC-07: ni con list_my_blocks');

-- AC-05: siendo creadora, se le ofrece sacarlo de sus grupos y planes
select pg_temp.login(5);
select set_eq($$ select kind || ':' || name from public.my_spaces_with(pg_temp.u(4)) $$, array['group:Grupo', 'plan:Plan'],
  'AC-05: la creadora ve de qué grupos y planes suyos podría sacarlo');
select public.block_user(pg_temp.u(4));
reset role;
select is((select status::text from public.group_members where group_id = pg_temp.id('g') and user_id = pg_temp.u(4)), 'active',
  'AC-05: bloquear no expulsa automáticamente');
set local role authenticated;
select public.unblock_user(pg_temp.u(4));

-- AC-06
select pg_temp.login(1);
select public.unblock_user(pg_temp.u(2));
select isnt(public.get_profile(pg_temp.u(2)), null, 'AC-06: al desbloquear vuelve a ver el perfil');
select ok(exists (select 1 from public.list_messages(p_group => pg_temp.id('g')) m where m ->> 'id' = pg_temp.id('m_beto')::text),
  'AC-06: y los mensajes');

-- ── Reportar ────────────────────────────────────────────────────────────────
select lives_ok($$ select public.create_report('user', pg_temp.u(2), 'harassment', 'Me escribe cosas feas') $$, 'AC-08: reportar usuario');
select lives_ok($$ select public.create_report('group', pg_temp.id('g'), 'spam') $$, 'AC-08: reportar grupo');
select lives_ok($$ select public.create_report('plan', pg_temp.id('p'), 'spam') $$, 'AC-08: reportar plan');
select lives_ok($$ select public.create_report('message', pg_temp.id('m_beto'), 'harassment') $$, 'AC-08: reportar mensaje');
select throws_ok($$ select public.create_report('plan', pg_temp.id('p'), 'other') $$, 'P0001', 'Contanos qué pasó', 'AC-09: "Otro" sin texto no');
select throws_ok($$ select public.create_report('message', gen_random_uuid(), 'spam') $$, 'P0001', null, 'No se puede reportar algo que no existe o no se ve');

reset role;
select is((select priority::text from public.reports where target_id = pg_temp.u(2)), 'high', 'Acoso tiene prioridad alta');
select ok((select text from public.moderation_alerts order by id limit 1) like '⚠️ Acoso o amenazas%', 'AC-19: se encola la alerta al moderador');
set local role authenticated;

-- AC-12: la copia sobrevive al borrado del mensaje
select pg_temp.login(2);
select public.delete_message(pg_temp.id('m_beto'));
reset role;
select is((select snapshot ->> 'body' from public.reports where target_id = pg_temp.id('m_beto')), 'Mensaje de Beto',
  'AC-12: el reporte conserva el texto del mensaje borrado');
set local role authenticated;

-- AC-13
select pg_temp.login(1);
select public.create_report('user', pg_temp.u(2), 'spam');
reset role;
select is((select count(*)::int from public.reports where target_id = pg_temp.u(2)), 1, 'AC-13: no se duplica un reporte abierto');

-- AC-14
insert into public.reports (reporter_id, target_type, target_id, reason, priority, snapshot)
select pg_temp.u(1), 'user', gen_random_uuid(), 'spam', 'normal', '{}' from generate_series(1, 6);
set local role authenticated;
select throws_ok($$ select public.create_report('user', pg_temp.u(3), 'spam') $$, 'P0001', null, 'AC-14: el reporte 11 del día no');

-- AC-15
select pg_temp.login(2);
select throws_ok($$ select * from public.reports $$, '42501', null, 'AC-15: nadie lee reportes desde la app');

-- ── "Me siento en peligro" ──────────────────────────────────────────────────
select pg_temp.login(3);
select public.create_report('user', pg_temp.u(2), 'danger', 'Me siguió hasta casa');
reset role;
select is((select priority::text from public.reports where reporter_id = pg_temp.u(3)), 'urgent', 'Peligro tiene prioridad urgente');
select ok((select text from public.moderation_alerts order by id desc limit 1) like '🚨 URGENTE · Me siento en peligro%', 'La alerta urgente va marcada');

-- ── Ocultamiento automático ─────────────────────────────────────────────────
set local role authenticated;
select pg_temp.login(2);
insert into ids select 'm_feo', (public.send_message('Mensaje ofensivo', p_group => pg_temp.id('g')) ->> 'id')::uuid;
select pg_temp.login(3); select public.create_report('message', pg_temp.id('m_feo'), 'harassment');
select pg_temp.login(4); select public.create_report('message', pg_temp.id('m_feo'), 'harassment');
reset role;
select is((select hidden_at from public.messages where id = pg_temp.id('m_feo')), null, 'AC-16: con 2 personas todavía no se oculta');
set local role authenticated;
select pg_temp.login(6); select public.create_report('message', pg_temp.id('m_feo'), 'harassment');
select pg_temp.login(5);
select is((select (m ->> 'hidden')::boolean from public.list_messages(p_group => pg_temp.id('g')) m where m ->> 'id' = pg_temp.id('m_feo')::text), true,
  'AC-16: con 3 personas distintas se oculta para todos');
select is((select m ->> 'body' from public.list_messages(p_group => pg_temp.id('g')) m where m ->> 'id' = pg_temp.id('m_feo')::text), '',
  'AC-16: el texto oculto no se devuelve');

-- AC-17: el grupo de Beto, reportado por 3
select pg_temp.login(6); select public.create_report('group', pg_temp.id('g_beto'), 'spam');
select pg_temp.login(3); select public.create_report('group', pg_temp.id('g_beto'), 'spam');
select pg_temp.login(4); select public.create_report('group', pg_temp.id('g_beto'), 'spam');
select ok(not exists (select 1 from public.discover_groups() where name = 'Grupo de Beto'), 'AC-17: el grupo sale de Descubrir');
select pg_temp.login(2);
select isnt(public.get_group(pg_temp.id('g_beto')), null, 'AC-17: sus miembros lo siguen viendo');

-- AC-18: descartar
reset role;
select public.admin_dismiss((select id from public.reports where target_id = pg_temp.id('g_beto') limit 1), 'Era un malentendido');
set local role authenticated;
select pg_temp.login(4);
select ok(exists (select 1 from public.discover_groups() where name = 'Grupo de Beto'), 'AC-18: al descartar vuelve a verse');
reset role;
select is((select count(*)::int from public.reports where target_id = pg_temp.id('g_beto') and status = 'open'), 0,
  'AC-18: se cierran todos los reportes abiertos sobre lo mismo');

-- ── Acciones de moderación (AC-20) ──────────────────────────────────────────
select public.admin_delete_message(pg_temp.id('m_feo'), 'Insultos');
select is((select deleted_by::text from public.messages where id = pg_temp.id('m_feo')), 'moderator', 'AC-20: borrar mensaje');
select is((select resolution from public.reports where target_id = pg_temp.id('m_feo') limit 1), 'delete_message', 'AC-20: queda registrado en el reporte');

select public.admin_cancel_plan(pg_temp.id('p'));
select is((select cancel_reason from public.plans where id = pg_temp.id('p')), 'Cancelado por moderación', 'AC-20: cancelar plan');

select public.admin_warn(pg_temp.u(3), 'Lenguaje ofensivo en el chat');
set local role authenticated;
select pg_temp.login(3);
select is(public.get_my_warning() ->> 'reason', 'Lenguaje ofensivo en el chat', 'AC-25: el advertido ve el aviso');
select public.ack_warning((public.get_my_warning() ->> 'id')::uuid);
select is(public.get_my_warning(), null, 'AC-25: una sola vez');

-- AC-22 y AC-23: suspensión temporal
reset role;
select throws_ok($$ select public.admin_suspend(pg_temp.u(6), 3, 'x') $$, 'P0001', null, 'Solo 1, 7 o 30 días');
select public.admin_suspend(pg_temp.u(6), 7, 'Spam');
select ok((select suspended_until between now() + interval '6 days' and now() + interval '8 days' from public.profiles where id = pg_temp.u(6)),
  'AC-22: suspendido por 7 días');
set local role authenticated;
select pg_temp.login(6);
select is(public.get_group(pg_temp.id('g')), null, 'AC-22: el suspendido no puede usar la app');
select throws_ok($$ select public.send_message('Hola', p_group => pg_temp.id('g')) $$, '42501', null, 'AC-22: ni escribir');
select is((select suspended_until is not null from public.profiles where id = auth.uid()), true, 'AC-22: pero ve su propio perfil (para el aviso)');
select pg_temp.login(1);
select ok(not exists (select 1 from public.list_group_members(pg_temp.id('g')) where user_id = pg_temp.u(6)), 'AC-23: no aparece en la lista de miembros');

reset role;
update public.profiles set suspended_until = now() - interval '1 minute' where id = pg_temp.u(6);
set local role authenticated;
select pg_temp.login(1);
select ok(exists (select 1 from public.list_group_members(pg_temp.id('g')) where user_id = pg_temp.u(6)), 'Al vencer la suspensión todo vuelve a la normalidad');

-- AC-24: suspensión permanente
reset role;
select public.admin_suspend(pg_temp.u(2), null, 'Acoso reiterado');
select is((select count(*)::int from auth.users where id = pg_temp.u(2)), 0, 'AC-24: la cuenta se elimina');
select throws_ok($$ insert into auth.users (id, email, aud, role) values (gen_random_uuid(), 'M2@test.com', 'authenticated', 'authenticated') $$,
  'P0001', 'Esta cuenta fue suspendida', 'AC-24: el mismo email no puede volver a registrarse');

select * from finish();
rollback;
