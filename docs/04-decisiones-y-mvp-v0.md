# Ronda — Decisiones y MVP v0

> Este documento **reemplaza** a los anteriores donde se contradicen.
> El 01 (producto) sigue vigente como visión. El 02 (arquitectura) queda reemplazado por la sección 5 de este documento.

---

## 1. Decisiones tomadas

| Tema | Decisión | Por qué |
|---|---|---|
| Plataforma | App mobile nativa con **React Native + Expo** | Push confiables, presencia en tiendas, experiencia nativa |
| Sistema | **Android primero** | Mayoría de usuarios en Argentina, cuenta de Play USD 25 única, revisión más simple. iOS después con el mismo código |
| Backend | **Supabase** (Postgres + Auth + Realtime + Storage) | Chat y login resueltos, sin servidor propio. Es Postgres estándar: se puede migrar si hace falta |
| Descartado para el MVP | NestJS, Redis, mapas, login con Apple | Demasiadas piezas para validar con 100–300 usuarios |
| Ciudad inicial | **La Plata** | Densidad de usuarios en una sola zona |
| Login | **Google** (+ email como respaldo) | Apple solo hace falta cuando salga iOS |

---

## 2. MVP v0 — lo mínimo para validar

Pregunta a responder:

> ¿Las personas se unen a grupos y planes con gente nueva, y vuelven?

### Entra en v0

**Cuenta y perfil**
- Login con Google (y email + contraseña como respaldo).
- Onboarding: nombre, fecha de nacimiento (**18+ obligatorio**), foto, ciudad, intereses.
- Editar perfil.
- Eliminar cuenta (**Google Play lo exige**).

**Descubrir**
- Dos pestañas: Planes / Grupos.
- Filtro por categoría.
- Búsqueda por texto.
- Todo filtrado por la ciudad del usuario.

**Grupos**
- Crear y editar grupo.
- Unirse (abierto) o pedir ingreso (con aprobación).
- Aceptar o rechazar solicitudes (creador).
- Salirse.
- Ver miembros.
- Chat del grupo.

**Planes**
- Crear plan (independiente o dentro de un grupo).
- Editar y cancelar plan (creador).
- Unirse y salirse.
- Ver participantes.
- Chat del plan.

**Notificaciones push**
- Nuevo mensaje (agrupadas, no una por mensaje).
- Solicitud de ingreso recibida / aceptada.
- Nuevo plan en un grupo del que sos miembro.
- Recordatorio: el plan empieza en 2 horas.

**Seguridad**
- Bloquear usuario.
- Reportar usuario, grupo, plan o mensaje.
- Panel de reportes simple (el dashboard de Supabase al principio).
- Alerta al moderador (mail o Telegram) por cada reporte nuevo.
- Aviso al unirse al primer plan: "Encontrate en lugares públicos".

### Queda para v1 (después de la beta)

- Grupos privados por invitación.
- Administradores además del creador.
- Lista de espera en planes llenos.
- Login con Apple + iOS.
- Bandeja de notificaciones dentro de la app.
- Fotos y adjuntos en el chat.
- Filtros por fecha y zona.
- Planes recurrentes ("todos los sábados").
- Login con teléfono y verificación de identidad (ver abajo).

### Para el futuro: login con teléfono y verificación (pedido 2026-10-06)

Como en Tinder, Happn y la mayoría de las apps de interacción social.

**1. Iniciar sesión con el número de teléfono**
- La persona ingresa su número y recibe un **código de 6 dígitos por SMS** (o por WhatsApp). Sin contraseña.
- Supabase Auth ya lo soporta (login por teléfono con código), conectado a un proveedor de SMS como Twilio, MessageBird o Vonage. Twilio también manda el código por WhatsApp, que en Argentina suele llegar mejor y salir más barato que el SMS.
- Tiene **costo por mensaje**: hay que ponerle límites (intentos por número y por hora) para que no lo usen para gastar plata con envíos masivos.
- Ventaja extra: un número de teléfono es más difícil de multiplicar que un email, así que ayuda contra las cuentas falsas y contra quien vuelve después de una suspensión permanente (sumar el teléfono a `banned_emails`, o a una tabla equivalente).
- Convive con Google y email: la persona elige cómo entrar.

**2. Verificación con selfie (opcional)**
- La persona se saca una **selfie en vivo** (con prueba de vida: girar la cabeza, parpadear) y se compara con sus fotos de perfil.
- Si coincide, el perfil muestra una insignia **"Verificado ✓"**. Es optativa, pero da confianza a quien se encuentra con desconocidos.
- Se puede usar para dar más confianza en lugares sensibles, por ejemplo: exigir perfil verificado para crear planes en un domicilio particular, o mostrar cuántos participantes de un plan están verificados.
- Proveedores posibles: AWS Rekognition (comparar caras), o servicios completos de prueba de vida como FaceTec, Veriff, Persona o Sumsub.

**3. Verificación de identidad (opcional)**
- Foto del **DNI** + selfie, validados contra RENAPER (hay proveedores en Argentina que ofrecen esa validación). Confirma nombre real y edad (cierra el riesgo de menores de 18).
- Más fricción y más costo que la selfie: conviene ofrecerla como un nivel superior, no obligatoria.

**Cuidados legales**
- Las selfies y los datos biométricos son **datos sensibles** (Ley 25.326 y criterios de la AAIP): requieren consentimiento expreso, explicar para qué se usan y por cuánto tiempo, y guardarlos lo mínimo posible. Lo ideal es que el proveedor procese la biometría y Ronda guarde solo el resultado ("verificado sí/no" y la fecha), no la cara ni el DNI.
- Actualizar la política de privacidad y el formulario de seguridad de datos de Google Play antes de lanzarlo.

---

## 3. Reglas de grupos y planes

### Grupos

**Tipos de acceso**

| Tipo | Aparece en Descubrir | Cómo se entra |
|---|---|---|
| Abierto | Sí | Directo |
| Con aprobación | Sí | Pedís ingreso, el creador acepta |
| Privado *(v1)* | No | Solo con link de invitación |

**Capacidad**
- La define el creador (mínimo 2, máximo 500 en v0).
- Cuenta al creador.
- Grupo lleno: no se puede unir ni aceptar solicitudes. Se muestra "Completo".
- Si el creador baja la capacidad por debajo de los miembros actuales, nadie es expulsado; solo se cierra el ingreso.

**Roles (v0)**
- **Creador:** edita, acepta solicitudes, elimina mensajes, expulsa miembros, borra el grupo.
- **Miembro:** chatea, crea planes en el grupo, se sale.
- El creador no puede salirse: puede borrar el grupo. (Transferir el grupo queda para v1.)

### Planes

**Visibilidad**
- Plan independiente → público en la ciudad.
- Plan de un grupo **abierto** → aparece en Descubrir. Cualquiera puede unirse al plan sin entrar al grupo.
- Plan de un grupo **con aprobación** → solo lo ven y se suman los miembros.

**Capacidad**
- La define el creador (mínimo 2). Cuenta al creador.
- Plan lleno: "Completo". Sin lista de espera en v0.

**Ciclo de vida**

```text
Próximo ──► En curso ──► Terminado
   │
   └──► Cancelado (por el creador)
```

- Próximo / En curso / Terminado se calculan con `starts_at` y `ends_at` (si no hay fin, se asume 3 horas).
- El plan deja de aparecer en Descubrir cuando empieza.
- Al cancelar se avisa por push a todos los participantes.
- Uno puede salirse hasta que el plan empieza.
- El creador no puede salirse: puede cancelar.

**Chat del plan**
- Abierto mientras el plan está Próximo o En curso, y hasta 24 h después de terminar.
- Después queda solo lectura.
- Si el plan se cancela, queda solo lectura.

**Lugar del plan**
- Al crear el plan se indica si es en un **lugar público** o en un **domicilio particular**.
- Los planes en domicilio particular solo se pueden crear dentro de grupos **con aprobación**. Nunca como plan independiente ni en grupos abiertos.
- En esos planes, la dirección exacta la ven solo los participantes; en el detalle público se muestra solo la zona.
- El aviso "Encontrate en lugares públicos" se muestra siempre.

### Perfiles

| Quién mira | Qué ve |
|---|---|
| Alguien sin grupos ni planes en común | Nombre, foto, ciudad e intereses |
| Alguien que comparte al menos un grupo o plan | Lo anterior + bio, grupos y planes en los que participa |
| Alguien bloqueado | Nada |

La edad no se muestra como fecha de nacimiento; si se muestra, solo la edad en años.

### Bloqueos
- No ves los mensajes de la persona bloqueada (en ningún chat).
- No ves su perfil ni ella el tuyo.
- No reciben notificaciones el uno del otro.
- Pueden seguir en el mismo grupo o plan (no se puede evitar sin romper el grupo). Lo que bloquea es la interacción, no la presencia.

---

## 4. Modelo de datos

Tablas en Postgres (Supabase). Todas con `created_at`; las editables también con `updated_at`.

```text
profiles
- id               uuid  (= auth.users.id)
- name             text
- birthdate        date            -- validar 18+
- avatar_url       text
- city_id          → cities
- bio              text  null
- deleted_at       timestamptz null

cities
- id, name, province               -- arranca solo con La Plata

interests                          -- sirve también como categoría de grupos y planes
- id, slug, name, emoji

profile_interests
- profile_id, interest_id

groups
- id
- name, description, image_url
- category_id      → interests
- city_id          → cities
- zone             text  null      -- "Centro", "City Bell"...
- access           enum: open | approval   (private en v1)
- max_members      int
- owner_id         → profiles
- deleted_at       timestamptz null

group_members
- group_id, user_id               (PK compuesta)
- role             enum: owner | member
- status           enum: pending | active
- joined_at

plans
- id
- title, description
- category_id      → interests
- city_id          → cities
- place_name       text            -- "Parque Saavedra"
- zone             text  null
- starts_at        timestamptz
- ends_at          timestamptz null
- max_participants int
- creator_id       → profiles
- group_id         → groups  null  -- null = plan independiente
- is_private_place boolean         -- domicilio particular; solo en grupos con aprobación
- address          text  null      -- solo visible para participantes
- cancelled_at     timestamptz null

plan_participants
- plan_id, user_id                (PK compuesta)
- joined_at

messages
- id
- group_id         → groups  null
- plan_id          → plans   null  -- CHECK: exactamente uno de los dos
- sender_id        → profiles
- body             text
- deleted_at       timestamptz null

blocks
- blocker_id, blocked_id          (PK compuesta)

reports
- id
- reporter_id      → profiles
- target_type      enum: user | group | plan | message
- target_id        uuid
- reason           enum: spam | acoso | contenido_inapropiado | menor_de_edad | otro
- details          text  null
- status           enum: open | reviewed | actioned

push_tokens
- user_id, token, platform, updated_at
```

**Cambios respecto del doc 02**
- Sin `chats` ni `chat_members`: los integrantes del chat son los del grupo o plan. Cada mensaje apunta a un `group_id` o a un `plan_id`.
- `starts_at` único en vez de `date` + `startTime`.
- `status` del plan calculado por fechas; solo se guarda `cancelled_at`.
- Las solicitudes de ingreso son `group_members` con `status = pending` (sin tabla aparte).
- Categorías e intereses son la misma tabla: "te gusta el running" ↔ "grupo de running".

**Permisos (Row Level Security)**
- Mensajes: leer y escribir solo si sos miembro activo del grupo o participante del plan.
- Grupos y planes: lectura según las reglas de visibilidad de la sección 3.
- Unirse respetando la capacidad: con una función de Postgres (`join_plan`, `join_group`) que controle el cupo en una transacción, para que dos personas no ocupen el último lugar a la vez.

---

## 5. Arquitectura

```text
        App Android (Expo)
               │
               │ supabase-js
               ▼
 ┌──────────────────────────────┐
 │           Supabase           │
 │                              │
 │  Auth ──── Postgres + RLS    │
 │               │              │
 │   Realtime ◄──┤ (mensajes)   │
 │               │              │
 │   Storage     ├─► Edge Function ──► Expo Push ──► celulares
 │  (imágenes)   │   (notificaciones)
 │               │              │
 │   pg_cron ────┘ (recordatorios de planes)
 └──────────────────────────────┘
```

| Área | Tecnología |
|---|---|
| App | Expo + Expo Router + TypeScript |
| Estilos | NativeWind (Tailwind para React Native) |
| Datos en la app | TanStack Query + supabase-js |
| Imágenes | expo-image-picker → Supabase Storage |
| Push | expo-notifications + Expo Push API |
| Builds | EAS Build |
| Errores | Sentry |
| Métricas | PostHog |
| Landing (Etapa 0) | Next.js, opcional |

**Regla de código para no quedar atado a Supabase**
- Pantallas → hooks (`useGroupChat`, `usePlans`…) → capa `services/` → Supabase.
- Ninguna pantalla llama a Supabase directo. Si un día el chat se muda a otro servicio, se cambia solo `services/chat`.

---

## 6. Pantallas v0

```text
Login
 └─► Onboarding (nombre → fecha de nacimiento → foto → ciudad → intereses)
       └─► Tabs
            ├── Descubrir   [Planes | Grupos] + búsqueda + categorías
            ├── Lo mío      Mis planes (próximos/pasados) · Mis grupos
            ├── ＋ Crear    Plan | Grupo
            └── Perfil      Editar · Bloqueados · Eliminar cuenta

Detalle de grupo ─► Miembros · Solicitudes (creador) · Planes del grupo · Chat
Detalle de plan  ─► Participantes · Chat
Perfil de otro usuario ─► Reportar · Bloquear
```

---

## 7. Próximos pasos

1. **Etapa 0 — Validación**
   - Entrevistar 10–15 estudiantes de La Plata con la pregunta del doc 03.
   - Definir 10–15 grupos semilla y quién los va a mover los primeros días.
   - Landing con lista de espera (opcional).
2. **Setup**
   - Proyecto Supabase + migraciones del modelo de datos.
   - Proyecto Expo con Expo Router, NativeWind y login con Google.
   - Cuenta de Google Play Console.
3. **Construcción v0** en este orden: perfil → grupos → planes → chat → push → reportes y bloqueos.
4. **Beta cerrada** en Google Play.
   - Ojo: las cuentas personales nuevas de Play Console exigen una prueba cerrada con un mínimo de testers durante 14 días antes de publicar (hoy 12 testers; verificar al momento). La beta en La Plata sirve justo para eso.

---

## 8. Preguntas resueltas (2026-10-04)

- [x] **Nombre:** "Ronda" (alternativa: "RondaApp"). Falta verificar disponibilidad en Play Store y dominio.
- [x] **Edad mínima:** 18 años.
- [x] **Perfiles:** visibilidad parcial sin nada en común (ver sección 3, Perfiles).
- [x] **Reportes:** los revisa Enyi en la beta, con alerta por cada reporte nuevo y respuesta dentro de las 24 h.
- [x] **Domicilios particulares:** permitidos solo en grupos con aprobación, con aviso siempre visible (ver sección 3, Lugar del plan).
