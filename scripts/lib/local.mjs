// Utilidades para los scripts que prueban contra el Supabase local.
import { execSync } from 'node:child_process';

import { createClient as baseCreateClient } from '@supabase/supabase-js';
import ws from 'ws';

// Node 20 no trae WebSocket nativo; supabase-js lo pide aunque no usemos tiempo real.
export const createClient = (url, key, options = {}) => baseCreateClient(url, key, { ...options, realtime: { transport: ws } });

export const status = Object.fromEntries(
  execSync('supabase status -o env', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')];
    }),
);

export const admin = createClient(status.API_URL, status.SECRET_KEY, { auth: { persistSession: false } });

const PASSWORD = 'contraseña-de-prueba';
const createdIds = [];

// Crea un usuario con perfil completo y devuelve un cliente con sesión iniciada.
export async function makeUser(name, extra = {}) {
  const email = `script-${crypto.randomUUID()}@test.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (error) throw error;
  createdIds.push(data.user.id);
  const { error: profileError } = await admin
    .from('profiles')
    .update({
      name: name.slice(0, 30),
      birthdate: '2000-01-01',
      avatar_url: 'https://foto',
      city_id: 1,
      terms_accepted_at: new Date().toISOString(),
      onboarding_completed_at: new Date().toISOString(),
      ...extra,
    })
    .eq('id', data.user.id);
  if (profileError) throw profileError;

  const client = createClient(status.API_URL, status.PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (signInError) throw signInError;
  return { client, id: data.user.id };
}

export async function cleanup() {
  await Promise.all(createdIds.map((id) => admin.auth.admin.deleteUser(id)));
}

let allOk = true;
export function check(cond, label) {
  console.log(`${cond ? '✅' : '❌'} ${label}`);
  allOk &&= !!cond;
}
export const passed = () => allOk;
