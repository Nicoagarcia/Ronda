// Spec 02, AC-12: con 1 lugar libre y varias personas uniéndose a la vez, entra una sola.
// Uso (con Supabase local corriendo): node scripts/concurrency/join-last-spot.mjs
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
  const email = `concurrencia-${label}-${Date.now()}@test.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (error) throw error;
  createdIds.push(data.user.id);
  const { error: profileError } = await admin
    .from('profiles')
    .update({
      name: `Usuario ${label}`,
      birthdate: '2000-01-01',
      avatar_url: 'https://foto',
      city_id: 1,
      terms_accepted_at: new Date().toISOString(),
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq('id', data.user.id);
  if (profileError) throw profileError;

  const client = createClient(URL, PUBLISHABLE, { auth: { persistSession: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (signInError) throw signInError;
  return client;
}

try {
  const owner = await makeUser('creador');
  const { data: groupId, error } = await owner.rpc('create_group', {
    p_name: 'Último lugar',
    p_description: 'Grupo para probar concurrencia',
    p_category_id: 1,
    p_max_members: 2, // creador + 1 lugar libre
    p_access: 'open',
  });
  if (error) throw error;

  const contenders = await Promise.all(Array.from({ length: CONTENDERS }, (_, i) => makeUser(`c${i}`)));
  const results = await Promise.all(contenders.map((c) => c.rpc('join_group', { p_group: groupId })));

  const joined = results.filter((r) => r.data === 'joined').length;
  const full = results.filter((r) => r.error?.message === 'El grupo se llenó').length;
  const { data: group } = await admin.from('groups').select('member_count').eq('id', groupId).single();

  console.log(`Entraron: ${joined} · "El grupo se llenó": ${full} · member_count: ${group.member_count}`);
  const ok = joined === 1 && full === CONTENDERS - 1 && group.member_count === 2;
  console.log(ok ? '✅ AC-12 OK' : '❌ AC-12 FALLA');
  process.exitCode = ok ? 0 : 1;
} finally {
  await Promise.all(createdIds.map((id) => admin.auth.admin.deleteUser(id)));
}
