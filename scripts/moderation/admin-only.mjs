// Spec 06, AC-21: solo un administrador puede moderar, ni siquiera llamando a la API directo.
// Uso (con Supabase local corriendo): node scripts/moderation/admin-only.mjs
import { admin, check, cleanup, makeUser, passed } from '../lib/local.mjs';

try {
  const user = await makeUser('Usuario común');
  const moderator = await makeUser('Moderadora');
  const target = await makeUser('Objetivo');
  await admin.from('admins').insert({ user_id: moderator.id });

  const asUser = await user.client.rpc('admin_suspend', { p_user: target.id, p_days: 1, p_reason: 'prueba' });
  check(asUser.error?.code === '42501', 'AC-21: un usuario común no puede suspender');

  const warnAsUser = await user.client.rpc('admin_warn', { p_user: target.id, p_reason: 'prueba' });
  check(warnAsUser.error?.code === '42501', 'AC-21: ni advertir');

  const reportsAsUser = await user.client.from('reports').select('*');
  check(!!reportsAsUser.error, 'AC-15: ni leer reportes');

  const asModerator = await moderator.client.rpc('admin_suspend', { p_user: target.id, p_days: 1, p_reason: 'prueba' });
  check(!asModerator.error, 'Un administrador sí puede suspender');

  const { data: profile } = await admin.from('profiles').select('suspended_until').eq('id', target.id).single();
  check(!!profile?.suspended_until, 'La suspensión quedó aplicada');
} finally {
  await cleanup();
  process.exitCode = passed() ? 0 : 1;
}
