# Ronda — Estado del proyecto

> **Leer esto primero al retomar el proyecto** (persona o Claude en una conversación nueva).
> Última actualización: 2026-10-06. Mantenerlo al día al cerrar cada etapa.

---

## 1. Qué es

App mobile (Android primero, iOS después) para conocer gente a través de **grupos** y **planes** en tu ciudad, sin matching. Lema: *Menos matches. Más planes.* Arranca en **La Plata**.

Producto y decisiones: `docs/01` a `docs/04`. Plan técnico: `docs/05`. Specs con criterios de aceptación: `docs/specs/`.

## 2. Cómo trabajamos

- **Desarrollo guiado por specs**: cada funcionalidad tiene una spec en `docs/specs/` con reglas, criterios de aceptación (AC-xx), datos y pantallas. Las decisiones abiertas se le preguntan a Enyi y se marcan como tomadas. Recién con la spec aprobada se implementa.
- **Las reglas viven en la base** (RLS + funciones de Postgres). La app nunca escribe tablas de negocio directo: llama funciones (`join_group`, `send_message`…).
- Pantalla → hook (`src/features/*`) → `src/services/` → Supabase. Solo `services/` importa el cliente.
- Cada criterio "ni por API" tiene un test pgTAP en `supabase/tests/`.
- Todo en español rioplatense: UI, textos, comentarios y commits.
- Antes de cerrar algo: `npm run typecheck`, `npm run lint`, `npm test`, `npm run db:test`.

## 3. Stack

Expo SDK 57 (React Native 0.86, Expo Router en `src/app`) · TypeScript · Uniwind (Tailwind 4) · TanStack Query · Supabase (Postgres, Auth, Realtime, Storage, Edge Functions, pg_cron, pg_net, Vault) · Sentry y PostHog (se activan con claves) · Repo: `github.com/Nicoagarcia/Ronda`.

## 4. Qué está hecho

| Hito | Estado | Qué incluye |
|---|---|---|
| 0 · Setup | ✅ | Expo, Supabase local, CI, estructura |
| 1 · Auth y perfil (spec 01) | ✅ salvo Google | Email con códigos OTP, onboarding de 6 pasos, perfil, eliminar cuenta |
| 2 · Grupos (spec 02) | ✅ | Crear, descubrir, unirse, solicitudes, expulsar, editar, eliminar |
| 3 · Planes (spec 03) | ✅ | Crear, descubrir, sumarse, domicilio con dirección privada, editar, cancelar |
| 4 · Chat (spec 04) | ✅ | Chats de grupo y plan en tiempo real, no leídos, silenciar, moderar |
| 5 · Notificaciones (spec 05) | ✅ servidor / ⏳ celular | Cola, agrupación, recordatorios, envío por Expo Push, ajustes |
| 6 · Reportes y bloqueos (spec 06) | ✅ | Bloquear, reportar, ocultamiento automático, moderación, suspensiones, Telegram |
| 7 · Beta | 🟡 parte 1 | Ícono, borradores legales, Sentry/PostHog, métricas, grupos semilla, checklist |

**Tests**: 279 pgTAP (`npm run db:test`) · 23 Jest (`npm test`) · scripts contra la API: `test:concurrency`, `test:realtime`, `test:moderation`.

**Probado solo desde la PC.** Todavía no se probó en un celular real (se intentó con Expo Go el 2026-10-06).

## 5. Qué falta

**Bloqueante:** el **nombre del paquete de Android**. Enyi va a intentar comprar `ronda.com.ar` (vence el 8/10/2026) → paquete `ar.com.ronda`. Plan B: `rondaapp.com.ar`. Hoy `app.json` tiene el provisorio `app.ronda`.

Con el paquete, en este orden (detalle completo en **`docs/06-checklist-beta.md`**):
1. Cuenta de Expo, `eas init`, app de desarrollo en el celular.
2. Login con Google (cierra Hito 1).
3. Firebase + parte del celular de las notificaciones (cierra Hito 5).
4. Supabase en la nube (región São Paulo, plan Pro, secretos de Vault, SMTP propio).
5. Web con privacidad, términos y eliminación de cuenta; revisión legal.
6. Google Play: ficha, seguridad de datos, prueba cerrada (12 testers, 14 días).
7. Grupos semilla y lanzamiento en La Plata.

**Ideas para después** (no aprobadas para el v0):
- **Mapa** de planes cerca tuyo: spec en borrador `docs/specs/07-mapa.md`, con decisiones pendientes.
- **Login con teléfono** (código por SMS/WhatsApp) y **verificación con selfie / DNI**: `docs/04-decisiones-y-mvp-v0.md`, sección "Para el futuro".
- Resto del backlog v1: `docs/04`, "Queda para v1".

## 6. Cómo levantarlo en local

```bash
npm install
npm run db:start            # Supabase en Docker
npm run db:reset            # base limpia + datos de prueba
npm run functions:serve     # en otra terminal (eliminar cuenta, notificaciones)
npm run start:go            # Expo Go en el celular (mismo wifi); o conectar a exp://<IP-de-la-PC>:8081
```

- `.env.local` necesita la **IP de la PC en la red local** (no `localhost`) y la clave Publishable de `supabase status`.
- Usuarios demo (contraseña `ronda1234`): `ana@demo.ronda`, `beto@demo.ronda`, `caro@demo.ronda`.
- Mails locales (códigos): http://localhost:54324 · Studio: http://localhost:54323.
- Moderar: editor SQL → `select * from moderation_queue;` y funciones `admin_*` (README).
- Métricas: `select * from metrics_weekly;`.

## 7. Trampas conocidas

- **Expo Go no recibe notificaciones push en Android** (SDK 53+). Hace falta la app de desarrollo.
- **No hay versión web**: `app.json` tiene `platforms: android, ios`.
- Tras `db:reset` o cortar `functions:serve`, las Edge Functions dan 502: `docker restart supabase_kong_ronda`.
- Tras `db:reset`, Realtime tarda unos segundos en arrancar.
- Si se reinstalan dependencias con Metro corriendo, Metro queda roto: cortarlo y `npx expo start --clear`.
- TypeScript 6 necesita `types: ["jest"]` en `tsconfig`. Las rutas tipadas se generan con `expo customize tsconfig.json` (lo hace `npm run typecheck`).
- Componentes de terceros necesitan `withUniwind(...)` para aceptar `className`.
- En Metro, `withUniwindConfig` va por fuera de `getSentryExpoConfig`.
- pgTAP: dentro de una transacción `now()` es fijo; en subconsultas calificar columnas (`profiles.id`).
- Argentina es UTC-3 todo el año: `fromArgentina()` en `src/lib/dates.ts`.
- En producción hay que cargar a mano los secretos de Vault `project_url` y `service_role_key` (checklist).
