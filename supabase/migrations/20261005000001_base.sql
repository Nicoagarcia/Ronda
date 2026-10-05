-- Hito 1 · Base: ciudades e intereses (docs/specs/01-auth-y-perfil.md, sección 8).
-- Son datos de referencia: se cargan acá y la app solo los lee.

create table public.cities (
  id smallint generated always as identity primary key,
  name text not null,
  province text not null,
  is_active boolean not null default false, -- false = "Próximamente"
  created_at timestamptz not null default now(),
  unique (name, province)
);

create table public.interests (
  id smallint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  emoji text not null,
  section text not null,
  position smallint not null,
  created_at timestamptz not null default now()
);

alter table public.cities enable row level security;
alter table public.interests enable row level security;

create policy "Ciudades: lectura pública" on public.cities for select using (true);
create policy "Intereses: lectura pública" on public.interests for select using (true);

insert into public.cities (name, province, is_active) values
  ('La Plata', 'Buenos Aires', true),
  ('CABA', 'Buenos Aires', false),
  ('Córdoba', 'Córdoba', false),
  ('Rosario', 'Santa Fe', false);

insert into public.interests (slug, name, emoji, section, position) values
  ('futbol',          'Fútbol',             '⚽', 'Deportes y movimiento', 1),
  ('running',         'Running',            '🏃', 'Deportes y movimiento', 2),
  ('gym',             'Gym',                '🏋️', 'Deportes y movimiento', 3),
  ('patinaje',        'Patinaje',           '🛼', 'Deportes y movimiento', 4),
  ('skate',           'Skate',              '🛹', 'Deportes y movimiento', 5),
  ('ciclismo',        'Ciclismo',           '🚴', 'Deportes y movimiento', 6),
  ('trekking',        'Trekking',           '🥾', 'Deportes y movimiento', 7),
  ('voley',           'Vóley',              '🏐', 'Deportes y movimiento', 8),
  ('basquet',         'Básquet',            '🏀', 'Deportes y movimiento', 9),
  ('tenis-padel',     'Tenis y pádel',      '🎾', 'Deportes y movimiento', 10),
  ('yoga',            'Yoga',               '🧘', 'Deportes y movimiento', 11),
  ('natacion',        'Natación',           '🏊', 'Deportes y movimiento', 12),
  ('estudiar',        'Estudiar juntos',    '📚', 'Estudio y aprendizaje', 13),
  ('idiomas',         'Idiomas',            '🗣️', 'Estudio y aprendizaje', 14),
  ('programacion',    'Programación',       '💻', 'Estudio y aprendizaje', 15),
  ('emprender',       'Emprender',          '🚀', 'Estudio y aprendizaje', 16),
  ('musica',          'Música',             '🎵', 'Arte y cultura', 17),
  ('recitales',       'Recitales',          '🎤', 'Arte y cultura', 18),
  ('cine',            'Cine',               '🎬', 'Arte y cultura', 19),
  ('teatro',          'Teatro',             '🎭', 'Arte y cultura', 20),
  ('fotografia',      'Fotografía',         '📷', 'Arte y cultura', 21),
  ('arte',            'Arte y dibujo',      '🎨', 'Arte y cultura', 22),
  ('lectura',         'Lectura',            '📖', 'Arte y cultura', 23),
  ('gaming',          'Gaming',             '🎮', 'Juegos', 24),
  ('juegos-de-mesa',  'Juegos de mesa',     '🎲', 'Juegos', 25),
  ('anime-series',    'Anime y series',     '📺', 'Juegos', 26),
  ('cafe',            'Café',               '☕', 'Salidas', 27),
  ('mate',            'Mate',               '🧉', 'Salidas', 28),
  ('comer-afuera',    'Comer afuera',       '🍔', 'Salidas', 29),
  ('cocina',          'Cocina',             '🍳', 'Salidas', 30),
  ('bares',           'Bares',              '🍻', 'Salidas', 31),
  ('bailar',          'Bailar',             '💃', 'Salidas', 32),
  ('nuevo-en-la-ciudad', 'Nuevo en la ciudad', '🏙️', 'Comunidad', 33),
  ('voluntariado',    'Voluntariado',       '🤝', 'Comunidad', 34),
  ('mascotas',        'Mascotas',           '🐶', 'Comunidad', 35),
  ('viajes',          'Viajes',             '✈️', 'Comunidad', 36);
