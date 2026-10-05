// Toma notificaciones de la cola (notification_outbox) y las manda por Expo Push.
// La llaman la base (al encolar algo inmediato) y pg_cron cada minuto (spec 05).
import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_BATCH = 100;
const TOKEN_FORMAT = /^Expo(nent)?PushToken\[.+\]$/;

type Claimed = {
  id: number;
  user_id: string;
  title: string;
  body: string;
  path: string;
  channel: string;
  tokens: string[];
};
type ExpoMessage = { to: string; title: string; body: string; data: { path: string }; channelId: string; sound: "default"; priority: "high" };
type ExpoTicket = { status: "ok" | "error"; message?: string; details?: { error?: string } };

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

async function sendToExpo(messages: ExpoMessage[]): Promise<ExpoTicket[]> {
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  const accessToken = Deno.env.get("EXPO_ACCESS_TOKEN");
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(EXPO_PUSH_URL, { method: "POST", headers, body: JSON.stringify(messages) });
  if (!res.ok) throw new Error(`Expo respondió ${res.status}: ${await res.text()}`);
  const { data } = await res.json();
  return data as ExpoTicket[];
}

Deno.serve(async (req) => {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  // Solo la base (con la clave del servidor) puede disparar envíos.
  if (req.headers.get("Authorization") !== `Bearer ${serviceKey}`) {
    return json(401, { error: "No autorizado" });
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await admin.rpc("claim_notifications", { p_limit: 500 });
  if (error) return json(500, { error: error.message });
  const claimed = (data ?? []) as Claimed[];

  const sent: number[] = [];
  const failed: { id: number; error: string; final: boolean }[] = [];
  const invalidTokens = new Set<string>();

  // Un mensaje de Expo por dispositivo; recordamos a qué notificación pertenece cada uno.
  const outgoing: { notificationId: number; message: ExpoMessage }[] = [];
  for (const n of claimed) {
    const valid = n.tokens.filter((t) => TOKEN_FORMAT.test(t));
    n.tokens.filter((t) => !TOKEN_FORMAT.test(t)).forEach((t) => invalidTokens.add(t));
    if (!valid.length) {
      failed.push({ id: n.id, error: "Sin dispositivos registrados", final: true });
      continue;
    }
    for (const to of valid) {
      outgoing.push({
        notificationId: n.id,
        message: { to, title: n.title, body: n.body, data: { path: n.path }, channelId: n.channel, sound: "default", priority: "high" },
      });
    }
  }

  const delivered = new Set<number>();
  const errors = new Map<number, string>();
  for (let i = 0; i < outgoing.length; i += EXPO_BATCH) {
    const batch = outgoing.slice(i, i + EXPO_BATCH);
    try {
      const tickets = await sendToExpo(batch.map((b) => b.message));
      tickets.forEach((ticket, j) => {
        const { notificationId, message } = batch[j];
        if (ticket.status === "ok") {
          delivered.add(notificationId);
        } else {
          if (ticket.details?.error === "DeviceNotRegistered") invalidTokens.add(message.to);
          errors.set(notificationId, ticket.message ?? ticket.details?.error ?? "Error de Expo");
        }
      });
    } catch (e) {
      // Falla de red o de Expo: el lote se reintenta en el próximo minuto.
      batch.forEach((b) => errors.set(b.notificationId, e instanceof Error ? e.message : String(e)));
    }
  }

  for (const n of claimed) {
    if (delivered.has(n.id)) sent.push(n.id);
    else if (errors.has(n.id)) failed.push({ id: n.id, error: errors.get(n.id)!, final: false });
  }

  const { error: completeError } = await admin.rpc("complete_notifications", {
    p_sent: sent,
    p_failed: failed,
    p_invalid_tokens: [...invalidTokens],
  });
  if (completeError) return json(500, { error: completeError.message });

  return json(200, { claimed: claimed.length, sent: sent.length, failed: failed.length, invalid_tokens: invalidTokens.size });
});
