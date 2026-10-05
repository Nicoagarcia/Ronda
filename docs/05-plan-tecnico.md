# Ronda — Plan técnico v0

> Estado: **aprobado** · Hito 0 completo (2026-10-05) · Base: `04-decisiones-y-mvp-v0.md` y `specs/01` a `specs/06` (aprobadas)
>
> Este documento dice **cómo** se construye lo que las specs dicen **qué** hacer. Si algo choca, mandan las specs.

---

## 1. Principios

1. **La base de datos es la que hace cumplir las reglas.** Cupos, permisos, bloqueos, 18+, límites: todo se valida en Postgres (RLS + funciones). La app solo muestra y pide. Así ninguna regla se puede saltear llamando directo a la API.
2. **La app nunca escribe tablas directo** en membresías, planes, mensajes ni reportes: llama funciones de la base (`join_group`, `send_message`…).
3. **Las pantallas no conocen a Supabase.** Pantalla → hook → `services/` → Supabase.
4. **Cada criterio "ni por API" de las specs tiene un test automático** en la base.
5. **Construir en vertical:** cada hito termina con la funcionalidad andando en el celular y sus criterios verificados, no con "la base lista" y "las pantallas después".

---

## 2. Lo que hace falta antes de arrancar

**Cuentas** (las tenés que crear vos; te guío en cada una cuando llegue el momento):

| Cuenta | Para qué | Cuándo | Costo |
|---|---|---|---|
| GitHub (repo privado) | Código y CI | Hito 0 | Gratis |
| Expo (EAS) | Compilar la app | Hito 0 | Gratis al principio |
| Supabase | Base en la nube | Hito 7 (antes se trabaja local) | Gratis; Pro USD 25/mes recomendado para la beta |
| Google Cloud | Login con Google + push (Firebase) | Hito 1 y 5 | Gratis |
| Telegram (bot) | Alertas de moderación | Hito 6 | Gratis |
| Google Play Console | Publicar | Hito 7 | USD 25 una vez |
| Dominio | Términos, privacidad, eliminar cuenta | Hito 7 | ~USD 10–15/año |

**En tu máquina** (ya revisé): Node 20 ✅ · Docker ✅ · Supabase CLI ✅ · Git ✅.
Falta: **EAS CLI** y un **celular Android** con depuración USB (o un emulador de Android Studio).

**Puertos**: Supabase local usa 54321–54324. No choca con tus otros proyectos (5432–5436, 55432).

---

## 3. Estructura del repo

```text
ronda/
├── docs/                       ← se mueven acá 01–05 y specs/
│   └── specs/
├── supabase/
│   ├── config.toml
│   ├── migrations/             ← SQL versionado, uno por hito
│   ├── functions/              ← Edge Functions (Deno)
│   │   ├── send-push/
│   │   └── delete-account/
│   ├── tests/                  ← pgTAP, un archivo por spec
│   └── seed.sql                ← ciudad, intereses, datos de prueba
├── src/
│   ├── app/                    ← pantallas (Expo Router)
│   ├── features/               ← por funcionalidad: componentes + hooks
│   │   ├── auth/  profile/  groups/  plans/
│   │   └── chat/  notifications/  moderation/
│   ├── services/               ← ÚNICO lugar que importa supabase-js
│   ├── components/ui/          ← botones, inputs, tarjetas
│   ├── lib/                    ← cliente Supabase, QueryClient, fechas
│   └── types/database.ts       ← generado desde la base
├── app.json
├── eas.json
└── package.json
```

---

## 4. Stack de la app

| Para | Librería |
|---|---|
| Base | Expo SDK (última estable al hacer el setup) + TypeScript estricto |
| Navegación | Expo Router (`src/app`) |
| Estilos | Uniwind (Tailwind 4 para React Native). NativeWind estable todavía usa Tailwind 3 |
| Datos | TanStack Query + supabase-js |
| Sesión | supabase-js con `expo-sqlite/localStorage` (método recomendado por Expo) |
| Login Google | `@react-native-google-signin/google-signin` + `signInWithIdToken` |
| Formularios | react-hook-form + zod |
| Fechas | date-fns + date-fns-tz (todo en UTC en la base, se muestra en hora de Argentina) |
| Imágenes | expo-image-picker + expo-image-manipulator (recortar y comprimir) + expo-image |
| Push | expo-notifications |
| Errores | Sentry |
| Métricas | PostHog |

Versiones fijadas en el Hito 0: Expo SDK 57, React Native 0.86, React 19.2, Uniwind 1.12, Tailwind 4.3.

---

## 5. Base de datos

### 5.1 Tablas (modelo consolidado de las 6 specs)

```text
── Perfil (spec 01)
cities              id, name, province
interests           id, slug, name, emoji, section
profiles            id (=auth.users), name, birthdate, avatar_url, city_id, bio,
                    onboarding_step, terms_accepted_at, safety_notice_accepted_at,
                    suspended_until, suspension_reason, deleted_at
profile_interests   profile_id, interest_id

── Grupos (spec 02)
groups              id, name, description, image_url, category_id, city_id, zone,
                    access, max_members, owner_id, member_count, last_activity_at,
                    hidden_at, deleted_at
group_members       group_id, user_id, role, status, requested_at, decided_at, joined_at

── Planes (spec 03)
plans               id, title, description, category_id, city_id, place_name, zone,
                    is_private_place, starts_at, ends_at, max_participants, creator_id,
                    group_id, participant_count, cancelled_at, cancel_reason, hidden_at
plan_private_details plan_id, address
plan_participants   plan_id, user_id, joined_at, removed_at, reminder_sent_at

── Chat (spec 04)
messages            id, group_id | plan_id, sender_id, kind, body, deleted_by, hidden_at
chat_reads          user_id, group_id | plan_id, last_read_at, muted, last_notified_at

── Notificaciones (spec 05)
push_tokens         user_id, device_id, token, platform, updated_at
notification_settings user_id, messages, requests, group_plans, plan_joins,
                    plan_updates, permission_prompted_at
notification_outbox id, user_id, type, payload, collapse_key, created_at, sent_at, error

── Moderación (spec 06)
blocks              blocker_id, blocked_id, created_at
reports             id, reporter_id, target_type, target_id, reason, priority, details,
                    snapshot, status, resolved_by, resolved_at, resolution, resolution_note
user_warnings       id, user_id, reason, created_at, seen_at
admins              user_id
banned_emails       email_hash
```

### 5.2 Funciones auxiliares (las usan todas las políticas RLS)

| Función | Devuelve true si… |
|---|---|
| `is_active_user()` | el usuario actual tiene perfil completo y no está suspendido |
| `is_blocked(a, b)` | hay bloqueo en cualquier dirección |
| `is_group_member(group, user)` | es miembro activo |
| `can_see_group(group)` | no eliminado, no expulsado, sin bloqueo con el creador |
| `can_see_plan(plan)` | cumple la tabla de visibilidad de la spec 03 |
| `is_plan_participant(plan, user)` | participa y no fue sacado |
| `shares_context(a, b)` | comparten grupo o plan (para el perfil extendido) |
| `is_admin()` | está en `admins` |

### 5.3 Funciones de negocio (RPC)

| Spec | Funciones |
|---|---|
| 01 | `get_profile`, `complete_onboarding_step` |
| 02 | `create_group`, `join_group`, `cancel_request`, `decide_request`, `leave_group`, `remove_member`, `delete_group`, `group_preview_members` |
| 03 | `create_plan`, `join_plan`, `leave_plan`, `remove_participant`, `update_plan`, `cancel_plan` |
| 04 | `send_message`, `delete_message`, `mark_read`, `set_muted`, `get_my_chats` |
| 05 | `register_push_token`, `enqueue_notification` (interna) |
| 06 | `block_user`, `unblock_user`, `create_report`, `admin_*` |

Todas `SECURITY DEFINER` con `search_path` fijo, ejecutables solo por usuarios logueados, y con `is_active_user()` como primer chequeo.

### 5.4 Migraciones (en orden de construcción)

`blocks` e `is_blocked` se crean **al principio** aunque sean de la spec 06, porque las políticas de todas las demás specs los usan.

```text
0001_base.sql            extensiones, enums, cities, interests
0002_profiles.sql        profiles, profile_interests, avatars, regla 18+
0003_blocks.sql          blocks, is_blocked, is_active_user
0004_groups.sql
0005_plans.sql
0006_chat.sql
0007_notifications.sql
0008_moderation.sql      reports, admins, ocultamiento automático
0009_cron.sql            recordatorios, resúmenes, limpieza
```

### 5.5 Edge Functions y tareas programadas

| Pieza | Qué hace | Se dispara |
|---|---|---|
| `send-push` | Toma la cola `notification_outbox`, manda por Expo Push (o Telegram si es alerta de moderación), borra tokens inválidos | Webhook de la base al insertar en la cola |
| `delete-account` | Borra el usuario de Auth y hace la limpieza de la spec 01 | Desde la app |
| Cron cada 5 min | Recordatorios N7, resúmenes N2 y N6, reintentos de la cola | pg_cron |
| Cron diario | Borra grupos eliminados hace más de 30 días | pg_cron |

Secretos: token de Expo, token y chat del bot de Telegram.

---

## 6. App

### 6.1 Pantallas (rutas)

```text
src/app/
├── _layout.tsx              proveedores + "portero" (ver abajo)
├── (auth)/                  welcome · login · signup · forgot-password
├── (onboarding)/            name · birthdate · photo · city · interests · terms
├── (tabs)/                  discover · mine · create · profile
├── group/[id]/              index · members · requests · edit · chat
├── plan/[id]/               index · edit · chat
├── user/[id].tsx
├── settings/                index · notifications · blocked · rules · delete-account
└── suspended.tsx
```

**Portero** (decide a dónde va el usuario al abrir la app):

```text
¿Sesión? ── no ──► (auth)
   │
  sí ──► ¿Suspendido? ── sí ──► suspended
   │
   no ──► ¿Onboarding completo? ── no ──► paso pendiente
   │
   sí ──► ¿Advertencia sin ver? ── sí ──► aviso ──► (tabs)
   │
   no ──► (tabs)
```

### 6.2 Datos
- **TanStack Query** para todo lo que viene del servidor (listas, detalles, perfil).
- **Tiempo real del chat** en `services/chat`: escucha cambios y actualiza el caché de TanStack Query. La pantalla no se entera de cómo llegan los mensajes.
- **Links profundos** (`ronda://plan/123`) para abrir la pantalla correcta desde una notificación.

---

## 7. Cómo se verifica cada criterio

| Tipo de criterio | Cómo se verifica |
|---|---|
| "ni por API", permisos, cupos, límites, bloqueos | **pgTAP** (`supabase test db`): un archivo por spec, cada test con el id del criterio (`-- spec02 AC-12`) |
| Concurrencia (último lugar) | Script que hace llamadas en paralelo a `join_group` / `join_plan` contra la base local |
| Lógica de la app (edad, retomar onboarding, formateo de fechas) | Jest + React Native Testing Library |
| Flujos en pantalla (tiempo real, notificaciones, navegación) | Checklist manual en el celular al cerrar cada hito |

**CI** (GitHub Actions) en cada push: TypeScript, lint y tests de la base.

---

## 8. Entornos y builds

| Entorno | Base | App |
|---|---|---|
| **Local** (desarrollo) | `supabase start` en Docker | Development build en tu celular, apuntando a tu PC por la red local |
| **Beta / producción** | Proyecto Supabase en la nube | Build `preview` (APK) para pruebas y `production` (AAB) para Play Store |

- Perfiles de EAS: `development`, `preview`, `production`.
- Variables: URL y clave pública de Supabase, client ID web de Google.
- Las migraciones se aplican a la nube con `supabase db push`, nunca a mano desde el dashboard.

---

## 9. Hitos

Cada hito termina con: funcionalidad andando en el celular, tests de la base en verde y checklist manual de la spec revisado.

| # | Hito | Incluye | Tamaño |
|---|---|---|---|
| 0 | **Setup** | Repo + git, Expo corriendo en tu celular con development build, Supabase local, CI, estructura de carpetas, componentes UI básicos | S |
| 1 | **Auth y perfil** (spec 01) | Login Google + email, onboarding, perfil propio y ajeno, eliminar cuenta. Migraciones 0001–0003 | M |
| 2 | **Grupos** (spec 02) | Crear, descubrir, unirse, solicitudes, miembros, salir, expulsar, editar, eliminar | L |
| 3 | **Planes** (spec 03) | Crear, descubrir, unirse, domicilio, editar, cancelar, ciclo de vida | L |
| 4 | **Chat** (spec 04) | Chats de grupo y plan, tiempo real, no leídos, silenciar, moderación de mensajes | M |
| 5 | **Notificaciones** (spec 05) | Push, cola, agrupación, recordatorios, ajustes, permiso | M |
| 6 | **Reportes y bloqueos** (spec 06) | Pantallas de bloqueo y reporte, ocultamiento, alertas Telegram, funciones de moderación, suspensiones | M |
| 7 | **Preparar la beta** | Supabase en la nube, Sentry, PostHog, normas, términos, privacidad, página de eliminación de cuenta, ícono y splash, grupos semilla, prueba cerrada en Play Console | M |

---

## 10. Riesgos técnicos

| Riesgo | Cómo lo manejamos |
|---|---|
| **Login con Google en Android** pide registrar la huella (SHA-1) de cada firma: la de desarrollo, la de EAS y la de Play Store. Es el error más común ("DEVELOPER_ERROR") | Cargar las tres desde el Hito 1, con una lista de pasos |
| **Push en Android** necesita credenciales de Firebase subidas a EAS | Configurarlo al inicio del Hito 5 y probar con una notificación de prueba antes de programar nada |
| **Supabase gratis se pausa** si no tiene actividad por un tiempo | Plan Pro durante la beta |
| **Permisos RLS lentos** con muchas funciones auxiliares | Índices desde el principio y revisar las consultas lentas en el Hito 7 |
| **Errores de zona horaria** en planes y recordatorios | Todo en UTC en la base; conversión solo al mostrar; tests con planes que cruzan medianoche |
| **Tiempo real a escala** | Ya previsto en la spec 04: el chat aislado permite cambiar el mecanismo sin tocar la app |

---

## 11. Decisiones pendientes

- [ ] **Mover los documentos** a `ronda/docs/` para que la raíz quede para el código.
- [ ] **Repo privado en GitHub**: ¿tenés cuenta? ¿Lo creo con `gh` cuando lleguemos?
- [ ] **Supabase en la nube recién en el Hito 7** (antes todo local, sin costo).
- [ ] **Sentry y PostHog en el Hito 7**, no desde el principio.
