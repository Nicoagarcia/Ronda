// Spec 04: el tiempo real entrega los mensajes a quien corresponde.
//   AC-10: un mensaje llega a otro integrante en menos de 2 segundos.
//   AC-01 / AC-23: no llega a alguien ajeno al chat ni a quien bloqueó al autor.
// Uso (con Supabase local corriendo): node scripts/realtime/chat-delivery.mjs
import { execSync } from 'node:child_process';

import { createClient as baseCreateClient } from '@supabase/supabase-js';
import ws from 'ws';

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
const admin = createClient(status.API_URL, status.SECRET_KEY, { auth: { persistSession: false } });
const createdIds = [];
const PASSWORD = 'contraseña-de-prueba';

async function makeUser(name) {
  const email = `realtime-${crypto.randomUUID()}@test.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (error) throw error;
  createdIds.push(data.user.id);
  await admin
    .from('profiles')
    .update({
      name,
      birthdate: '2000-01-01',
      avatar_url: 'https://foto',
      city_id: 1,
      terms_accepted_at: new Date().toISOString(),
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq('id', data.user.id);
  const client = createClient(status.API_URL, status.PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (signInError) throw signInError;
  return { client, id: data.user.id };
}

function listen(client, groupId) {
  const received = [];
  const channel = client
    .channel(`test-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `group_id=eq.${groupId}` }, (p) =>
      received.push({ id: p.new.id, at: Date.now() }),
    );
  const ready = new Promise((resolve, reject) =>
    channel.subscribe((s) => (s === 'SUBSCRIBED' ? resolve() : s === 'CHANNEL_ERROR' && reject(new Error(s)))),
  );
  return { received, ready, channel };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = true;
const check = (cond, label) => {
  console.log(`${cond ? '✅' : '❌'} ${label}`);
  ok &&= cond;
};

try {
  const owner = await makeUser('Dueña');
  const reader = await makeUser('Lectora');
  const outsider = await makeUser('Ajena');
  const blocked = await makeUser('Bloqueado');

  const { data: groupId, error } = await owner.client.rpc('create_group', {
    p_name: 'Tiempo real',
    p_description: 'Grupo para probar el chat en vivo',
    p_category_id: 1,
    p_max_members: 10,
    p_access: 'open',
  });
  if (error) throw error;
  await reader.client.rpc('join_group', { p_group: groupId });
  await blocked.client.rpc('join_group', { p_group: groupId });
  await admin.from('blocks').insert({ blocker_id: reader.id, blocked_id: blocked.id });

  const readerSub = listen(reader.client, groupId);
  const outsiderSub = listen(outsider.client, groupId);
  await Promise.all([readerSub.ready, outsiderSub.ready]);
  // Después de SUBSCRIBED, Realtime tarda un momento en registrar la suscripción en la base.
  await sleep(2000);

  const sentAt = Date.now();
  const { data: msg } = await owner.client.rpc('send_message', { p_body: 'Hola en vivo', p_group: groupId });
  const { data: blockedMsg } = await blocked.client.rpc('send_message', { p_body: 'Soy el bloqueado', p_group: groupId });
  await sleep(2500);

  const got = readerSub.received.find((r) => r.id === msg.id);
  check(!!got && got.at - sentAt < 2000, `AC-10: llegó a otro integrante${got ? ` en ${got.at - sentAt} ms` : ''}`);
  check(!outsiderSub.received.length, 'AC-01: no le llega a alguien ajeno al chat');
  check(!readerSub.received.some((r) => r.id === blockedMsg.id), 'AC-23: no le llega a quien bloqueó al autor');

  await reader.client.removeAllChannels();
  await outsider.client.removeAllChannels();
} finally {
  await Promise.all(createdIds.map((id) => admin.auth.admin.deleteUser(id)));
  process.exitCode = ok ? 0 : 1;
  setTimeout(() => process.exit(), 100);
}
