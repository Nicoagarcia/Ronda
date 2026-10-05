import { env } from '@/lib/env';

export type BackendStatus = { ok: true } | { ok: false; error: string };

// Verifica que la app llegue al backend (Supabase Auth responde /health).
export async function checkBackend(): Promise<BackendStatus> {
  try {
    const res = await fetch(`${env.supabaseUrl}/auth/v1/health`, {
      headers: { apikey: env.supabasePublishableKey },
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error desconocido' };
  }
}
