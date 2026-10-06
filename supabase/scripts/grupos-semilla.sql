-- Grupos semilla para lanzar en La Plata (docs/03-plan-de-desarrollo-y-monetizacion.md, "Primeros grupos").
-- Se corre UNA vez en producción, desde el editor SQL del dashboard, después de crear la cuenta oficial.
--
-- 1. Crear la cuenta de Ronda desde la app y completar el onboarding.
-- 2. Cambiar el email de abajo por el de esa cuenta.
-- 3. Correr el script. Es idempotente: no duplica grupos que ya existan con el mismo nombre.

do $$
declare
  v_owner_email text := 'CAMBIAR@ronda.com.ar';
  v_owner uuid;
  v_city smallint := (select id from public.cities where name = 'La Plata');
begin
  select id into v_owner from auth.users where email = v_owner_email;
  if v_owner is null then
    raise exception 'No existe una cuenta con el email %', v_owner_email;
  end if;

  insert into public.groups (name, description, category_id, city_id, zone, access, max_members, owner_id)
  select g.name, g.description, i.id, v_city, g.zone, g.access::public.group_access, g.max_members, v_owner
  from (values
    ('Nuevos en La Plata', 'Para quienes recién llegan a la ciudad y quieren conocer gente. Presentate y sumate a los planes.', 'nuevo-en-la-ciudad', null, 'open', 500),
    ('Estudiantes UNLP', 'Gente de todas las facultades de la UNLP. Planes para estudiar, salir y conocerse.', 'estudiar', null, 'open', 500),
    ('Ingresantes UNLP', 'Si arrancás la facultad este año, acá encontrás gente en la misma.', 'estudiar', null, 'open', 500),
    ('Psicología UNLP', 'Estudiantes de Psicología: grupos de estudio, apuntes y mates.', 'estudiar', 'Centro', 'approval', 300),
    ('Ingeniería UNLP', 'Estudiantes de Ingeniería: parciales, proyectos y after.', 'estudiar', 'Centro', 'approval', 300),
    ('Programación La Plata', 'Gente que programa o quiere aprender. Charlas, proyectos y cervezas.', 'programacion', null, 'open', 200),
    ('Running La Plata', 'Salidas por el Bosque y la República de los Niños. Todos los ritmos.', 'running', 'Bosque', 'open', 300),
    ('Fútbol 5 La Plata', 'Armamos partidos durante la semana. Siempre falta uno: sumate.', 'futbol', null, 'open', 200),
    ('Patinadores de La Plata', 'Patín, rollers y skate. Salimos al Bosque cuando hay sol.', 'patinaje', 'Bosque', 'open', 200),
    ('Gaming La Plata', 'Partidas online y juntadas para jugar en persona.', 'gaming', null, 'open', 200),
    ('Juegos de mesa La Plata', 'Catan, Dixit, truco y lo que traigas. Nos juntamos en bares.', 'juegos-de-mesa', 'Centro', 'open', 100),
    ('Mate y charla', 'Plazas, mate y conversación. El plan más platense que hay.', 'mate', null, 'open', 200),
    ('Fotografía La Plata', 'Salidas fotográficas por la ciudad. Con celu o con cámara.', 'fotografia', null, 'open', 100),
    ('Trekking y escapadas', 'Salidas de un día cerca de La Plata: Punta Lara, Magdalena, sierras.', 'trekking', null, 'open', 100),
    ('Cine y series', 'Vamos al cine, armamos maratones y charlamos de lo que vemos.', 'cine', null, 'open', 150)
  ) as g (name, description, slug, zone, access, max_members)
  join public.interests i on i.slug = g.slug
  where not exists (select 1 from public.groups x where x.name = g.name and x.deleted_at is null);

  insert into public.group_members (group_id, user_id, role, status, joined_at)
  select g.id, v_owner, 'owner', 'active', now()
  from public.groups g
  where g.owner_id = v_owner
    and not exists (select 1 from public.group_members m where m.group_id = g.id and m.user_id = v_owner);
end;
$$;
