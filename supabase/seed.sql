-- Datos de prueba para desarrollo local. Se cargan con `npm run db:reset`.
-- NO se usan en producción (los grupos semilla reales se crean en el Hito 7).
--
-- Usuarios demo (contraseña: ronda1234):
--   ana@demo.ronda  · creadora de varios grupos
--   beto@demo.ronda · miembro
--   caro@demo.ronda · miembro

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email,
       extensions.crypt('ronda1234', extensions.gen_salt('bf')), now(),
       '{"provider": "email", "providers": ["email"]}', '{}', now(), now(), '', '', '', ''
from (values
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'ana@demo.ronda'),
  ('a0000000-0000-0000-0000-000000000002'::uuid, 'beto@demo.ronda'),
  ('a0000000-0000-0000-0000-000000000003'::uuid, 'caro@demo.ronda')
) as u (id, email);

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select id::text, id, jsonb_build_object('sub', id::text, 'email', email), 'email', now(), now(), now()
from auth.users where email like '%@demo.ronda';

update public.profiles p
set name = d.name,
    birthdate = d.birthdate,
    avatar_url = d.avatar_url,
    bio = d.bio,
    city_id = (select id from public.cities where name = 'La Plata'),
    terms_accepted_at = now(),
    onboarding_completed_at = now()
from (values
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'Ana', '1999-03-14'::date, 'https://i.pravatar.cc/400?img=47', 'Me mudé a La Plata para estudiar Psicología. Patino los findes.'),
  ('a0000000-0000-0000-0000-000000000002'::uuid, 'Beto', '1997-08-02'::date, 'https://i.pravatar.cc/400?img=12', 'Programador, futbolero y fan de los juegos de mesa.'),
  ('a0000000-0000-0000-0000-000000000003'::uuid, 'Caro', '2001-11-20'::date, 'https://i.pravatar.cc/400?img=32', 'Corro tres veces por semana en el Bosque.')
) as d (id, name, birthdate, avatar_url, bio)
where p.id = d.id;

insert into public.profile_interests (profile_id, interest_id)
select p, i.id
from (values
  ('a0000000-0000-0000-0000-000000000001'::uuid, array['patinaje', 'estudiar', 'cafe', 'nuevo-en-la-ciudad']),
  ('a0000000-0000-0000-0000-000000000002'::uuid, array['futbol', 'programacion', 'juegos-de-mesa']),
  ('a0000000-0000-0000-0000-000000000003'::uuid, array['running', 'yoga', 'mate'])
) as x (p, slugs)
join public.interests i on i.slug = any (x.slugs);

-- Grupos (los de doc 03, "Primeros grupos").
with nuevos (name, description, slug, zone, access, max_members, owner, hours_ago) as (
  values
    ('Patinadores de La Plata', 'Salimos a patinar al Bosque los sábados a la tarde. Todos los niveles.', 'patinaje', 'Bosque', 'open', 100, 1, 1),
    ('Psicología 1° año', 'Grupo de estudio y mate para ingresantes de Psicología UNLP.', 'estudiar', 'Centro', 'approval', 20, 1, 3),
    ('Nuevos en La Plata', 'Para quienes recién llegan a la ciudad y quieren conocer gente.', 'nuevo-en-la-ciudad', null, 'open', 200, 1, 6),
    ('Fútbol 5 de los jueves', 'Armamos partido todos los jueves a la noche. Falta gente seguido.', 'futbol', 'Tolosa', 'open', 10, 2, 12),
    ('Programación LP', 'Charlas, proyectos y after office para gente que programa.', 'programacion', 'Centro', 'approval', 50, 2, 30),
    ('Juegos de mesa', 'Nos juntamos en bares a jugar. Traé tu juego favorito.', 'juegos-de-mesa', 'Centro', 'open', 30, 2, 50),
    ('Running La Plata', 'Salidas de 5 a 10 km por el Bosque y la República de los Niños.', 'running', 'Bosque', 'open', 80, 3, 2),
    ('Yoga en el parque', 'Prácticas al aire libre en Plaza Moreno cuando hay sol.', 'yoga', 'Centro', 'open', 25, 3, 200)
)
insert into public.groups (name, description, category_id, city_id, zone, access, max_members, owner_id, last_activity_at)
select n.name, n.description, i.id, (select id from public.cities where name = 'La Plata'), n.zone,
       n.access::public.group_access, n.max_members,
       ('a0000000-0000-0000-0000-00000000000' || n.owner)::uuid, now() - (n.hours_ago || ' hours')::interval
from nuevos n
join public.interests i on i.slug = n.slug;

-- Cada creador como owner, más algunos miembros.
insert into public.group_members (group_id, user_id, role, status, joined_at)
select id, owner_id, 'owner', 'active', now() from public.groups;

insert into public.group_members (group_id, user_id, role, status, joined_at)
select g.id, m.user_id::uuid, 'member', 'active', now()
from public.groups g
join (values
  ('Patinadores de La Plata', 'a0000000-0000-0000-0000-000000000003'),
  ('Nuevos en La Plata', 'a0000000-0000-0000-0000-000000000002'),
  ('Nuevos en La Plata', 'a0000000-0000-0000-0000-000000000003'),
  ('Fútbol 5 de los jueves', 'a0000000-0000-0000-0000-000000000001'),
  ('Running La Plata', 'a0000000-0000-0000-0000-000000000001')
) as m (group_name, user_id) on m.group_name = g.name;
