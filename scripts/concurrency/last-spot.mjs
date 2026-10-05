// Con 1 lugar libre y varias personas uniéndose a la vez, entra una sola.
// Spec 02 AC-12 (grupos) y spec 03 AC-14 (planes).
// Uso (con Supabase local corriendo): node scripts/concurrency/last-spot.mjs
import { execSync } from 'node:child_process';

import { createClient as baseCreateClient } from '@supabase/supabase-js';
import ws from 'ws';

// Node 20 no trae WebSocket nativo; supabase-js lo pide aunque no usemos tiempo real.
const createClient = (url, key, options = {}) => baseCreateClient(url, key, { ...options, realtime: { transport: ws } });

const status = Object.fromEntries(
  execSync('supabase status -o env', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')];
    }),
);
const URL = status.API_URL;
const PUBLISHABLE = status.PUBLISHABLE_KEY;
const SECRET = status.SECRET_KEY;
const CONTENDERS = 10;
const PASSWORD = 'contraseña-de-prueba';

const admin = createClient(URL, SECRET, { auth: { persistSession: false } });
const createdIds = [];

async function makeUser(label) {
  const email = `concurrencia-${crypto.randomUUID()}@test.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (error) throw error;
  createdIds.push(data.user.id);
  const { error: profileError } = await admin
    .from('profiles')
    .update({
      name: `Usuario ${label}`.slice(0, 30),
      birthdate: '2000-01-01',
      avatar_url: 'https://foto',
      city_id: 1,
      terms_accepted_at: new Date().toISOString(),
      onboarding_completed_at: new Date().toISOString(),
      safety_notice_accepted_at: new Date().toISOString(),
    })
    .eq('id', data.user.id);
  if (profileError) throw profileError;

  const client = createClient(URL, PUBLISHABLE, { auth: { persistSession: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (signInError) throw signInError;
  return client;
}

async function scenario({ label, create, join, fullMessage, countTable, countColumn }) {
  const owner = await makeUser(`${label}-creador`);
  const { data: id, error } = await create(owner);
  if (error) throw error;

  const contenders = await Promise.all(Array.from({ length: CONTENDERS }, (_, i) => makeUser(`${label}-c${i}`)));
  const results = await Promise.all(contenders.map((c) => join(c, id)));

  const entered = results.filter((r) => !r.error).length;
  const full = results.filter((r) => r.error?.message === fullMessage).length;
  const { data: row } = await admin.from(countTable).select(countColumn).eq('id', id).single();

  const ok = entered === 1 && full === CONTENDERS - 1 && row[countColumn] === 2;
  console.log(`${ok ? '✅' : '❌'} ${label}: entraron ${entered} · "${fullMessage}": ${full} · ${countColumn}: ${row[countColumn]}`);
  return ok;
}

try {
  const groupsOk = await scenario({
    label: 'Grupos (spec 02, AC-12)',
    create: (c) =>
      c.rpc('create_group', {
        p_name: 'Último lugar',
        p_description: 'Grupo para probar concurrencia',
        p_category_id: 1,
        p_max_members: 2, // creador + 1 lugar libre
        p_access: 'open',
      }),
    join: (c, id) => c.rpc('join_group', { p_group: id }),
    fullMessage: 'El grupo se llenó',
    countTable: 'groups',
    countColumn: 'member_count',
  });

  const plansOk = await scenario({
    label: 'Planes (spec 03, AC-14)',
    create: (c) =>
      c.rpc('create_plan', {
        p_title: 'Último lugar',
        p_category_id: 1,
        p_place_name: 'Plaza Moreno',
        p_starts_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        p_max_participants: 2,
      }),
    join: (c, id) => c.rpc('join_plan', { p_plan: id }),
    fullMessage: 'El plan se llenó',
    countTable: 'plans',
    countColumn: 'participant_count',
  });

  process.exitCode = groupsOk && plansOk ? 0 : 1;
} finally {
  await Promise.all(createdIds.map((id) => admin.auth.admin.deleteUser(id)));
}
