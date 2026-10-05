// Elimina la cuenta del usuario que llama (spec 01, "Cerrar sesión y eliminar cuenta").
//
// Borra la foto y el usuario de Auth. Lo demás cae en cascada desde auth.users:
// perfil, intereses y bloqueos. Los hitos siguientes suman acá la limpieza de
// grupos, planes y mensajes.
import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const CONFIRMATION = "ELIMINAR";

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "Método no permitido" });

  const { confirm } = await req.json().catch(() => ({ confirm: null }));
  if (confirm !== CONFIRMATION) {
    // AC-20: sin escribir ELIMINAR no pasa nada.
    return json(400, { error: `Escribí ${CONFIRMATION} para confirmar` });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
  const { data: { user }, error: userError } = await admin.auth.getUser(token);
  if (userError || !user) return json(401, { error: "Sesión inválida" });

  const { data: files } = await admin.storage.from("avatars").list(user.id);
  if (files?.length) {
    await admin.storage.from("avatars").remove(files.map((f) => `${user.id}/${f.name}`));
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("delete-account", user.id, error);
    return json(500, { error: "No pudimos eliminar la cuenta. Probá de nuevo." });
  }

  return json(200, { ok: true });
});
