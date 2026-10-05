# Spec 05 — Notificaciones

> Estado: **aprobada** · Depende de: specs 01 a 04 · Base: `04-decisiones-y-mvp-v0.md`
>
> En v0 solo hay **notificaciones push**. No hay bandeja de notificaciones dentro de la app ni emails (quedan para v1).

---

## 1. Qué hace

- Como **usuario**, quiero enterarme de mensajes nuevos en mis grupos y planes sin tener la app abierta.
- Como **participante**, quiero un recordatorio antes del plan y enterarme si cambia o se cancela.
- Como **creador de un grupo**, quiero saber cuando alguien pide entrar.
- Como **usuario**, quiero saber cuando me aceptan en un grupo o hay un plan nuevo en mis grupos.
- Como **usuario**, quiero controlar qué notificaciones recibo para que la app no me sature.

---

## 2. Reglas

### Catálogo de notificaciones

| # | Evento (spec) | Quién la recibe | Texto | Al tocarla abre |
|---|---|---|---|---|
| N1 | Mensaje nuevo (04) | Integrantes del chat, menos el autor | **Patinadores LP** · Nico: ¿quién lleva conos? | Chat |
| N2 | Varios mensajes nuevos (04) | Ídem | **Patinadores LP** · 5 mensajes nuevos | Chat |
| N3 | Solicitud de ingreso (02) | Creador del grupo | **Psicología 1° año** · Nico quiere unirse | Solicitudes |
| N4 | Solicitud aceptada (02) | Solicitante | Ya sos parte de **Psicología 1° año** 🎉 | Detalle de grupo |
| N5 | Plan nuevo en un grupo (03) | Miembros del grupo, menos el creador | **Patinadores LP** · Nuevo plan: 🛼 Patinar en el Bosque, sáb 18:00 | Detalle de plan |
| N6 | Alguien se sumó a tu plan (03) | Creador del plan | **🛼 Patinar en el Bosque** · Nico se sumó (5/10) | Detalle de plan |
| N7 | Recordatorio, 2 h antes (03) | Participantes | **🛼 Patinar en el Bosque** empieza a las 18:00 · Parque Saavedra | Detalle de plan |
| N8 | Cambió fecha, hora o lugar (03) | Participantes, menos el creador | **🛼 Patinar en el Bosque** · Cambió la hora: ahora sáb 19:00 | Detalle de plan |
| N9 | Plan cancelado (03) | Participantes, menos el creador | **🛼 Patinar en el Bosque** fue cancelado | Chat del plan (motivo) |
| N10 | Grupo eliminado (02) | Miembros, menos el creador | El grupo **Psicología 1° año** fue eliminado | Lo mío |

**No** generan notificación: solicitud rechazada, expulsión de un grupo, ser sacado de un plan, salidas de grupos o planes, y cualquier acción de alguien con quien hay un bloqueo.

### Agrupar para no saturar
- **Mensajes (N1/N2)**: como máximo **una notificación cada 5 minutos por chat** para cada usuario. La primera muestra el mensaje (N1). Si llegan más dentro de esos 5 minutos, no se manda nada. Pasados los 5 minutos, si sigue habiendo mensajes sin leer, se manda una sola con el total (N2).
- Si el usuario abre el chat, el contador de agrupación se reinicia.
- **Alguien se sumó (N6)**: como máximo una cada 10 minutos por plan. Si se sumaron varios: "Nico y 2 más se sumaron (8/10)".
- **Recordatorio (N7)**: no se manda si el usuario se sumó al plan en las últimas 2 horas antes del inicio.

### Cuándo no se muestra
- Si la app está abierta **en ese mismo chat**, la notificación de mensajes no se muestra.
- Si la app está abierta en otra pantalla, se muestra como aviso dentro de la app (banner arriba), no como notificación del sistema.
- Chats **silenciados** (spec 04) no generan N1/N2. El resto de las notificaciones de ese grupo o plan siguen llegando.

### Ajustes del usuario
Perfil → Ajustes → **Notificaciones**, con un interruptor por tipo:

| Interruptor | Incluye | Por defecto |
|---|---|---|
| Mensajes | N1, N2 | Activado |
| Solicitudes de ingreso | N3, N4 | Activado |
| Planes nuevos en mis grupos | N5 | Activado |
| Gente que se suma a mis planes | N6 | Activado |
| Recordatorios y cambios de mis planes | N7, N8, N9 | Activado |

N10 (grupo eliminado) siempre se manda.

Además, en Android cada grupo de notificaciones es un **canal** propio (Mensajes, Planes, Grupos), así el usuario también puede controlarlos desde los ajustes del sistema.

### Permiso del sistema
- Android 13+ pide permiso para mostrar notificaciones.
- **No se pide al abrir la app por primera vez.** Se pide la primera vez que el usuario **se une a un grupo, se suma a un plan o crea uno**, con una pantalla previa: "¿Te avisamos cuando te escriban o cambie el plan?" · [Activar] [Ahora no].
- Si dijo "Ahora no", se vuelve a ofrecer recién después de 7 días, en el mismo tipo de momento.
- Si negó el permiso en el sistema, en Ajustes → Notificaciones se muestra un aviso con botón para abrir los ajustes de Android.

### Dispositivos
- Un usuario puede tener la app en **varios dispositivos**; todos reciben las notificaciones.
- Al iniciar sesión se registra el dispositivo; al cerrar sesión o eliminar la cuenta se borra.
- Si el servicio de push informa que un dispositivo ya no existe (app desinstalada), se borra.

### Al tocar una notificación
- Abre la pantalla de la tabla del catálogo.
- Si ya no hay acceso (te fuiste del grupo, el plan se eliminó), abre Lo mío con el aviso "Ya no tenés acceso a esto".

---

## 3. Criterios de aceptación

**Envío**
- [ ] AC-01: Cada evento de la tabla (N1 a N10) llega al destinatario correcto con el texto indicado.
- [ ] AC-02: El autor de un mensaje, el creador de un plan nuevo y el que cambia o cancela un plan no reciben su propia notificación.
- [ ] AC-03: Ninguna notificación llega por acciones de alguien con quien hay un bloqueo. *(Verificable con la spec 06.)*
- [ ] AC-04: Rechazar una solicitud, expulsar o sacar a alguien no genera ninguna notificación.
- [ ] AC-05: Tocar cada notificación abre la pantalla correcta.
- [ ] AC-06: Tocar una notificación de un grupo del que ya no se es miembro abre Lo mío con el aviso "Ya no tenés acceso a esto".

**Agrupación**
- [ ] AC-07: 10 mensajes en 1 minuto en un chat generan una sola notificación (la del primero).
- [ ] AC-08: Si después de 5 minutos siguen sin leerse, llega una sola con "N mensajes nuevos".
- [ ] AC-09: Si el usuario abre el chat entre medio, no llega la notificación de resumen.
- [ ] AC-10: 3 personas sumándose a un plan en 2 minutos generan una sola notificación al creador: "Nico y 2 más se sumaron".
- [ ] AC-11: El recordatorio llega unos 2 h antes del inicio (±5 minutos), una sola vez por plan y participante.
- [ ] AC-12: Quien se suma 1 hora antes del inicio no recibe recordatorio.

**Silenciar y ajustes**
- [ ] AC-13: Un chat silenciado no genera notificaciones de mensajes, pero sí de recordatorio o cancelación de ese plan.
- [ ] AC-14: Apagar "Mensajes" en Ajustes corta las notificaciones de mensajes de todos los chats.
- [ ] AC-15: Cada interruptor de Ajustes corta solo los tipos que incluye.
- [ ] AC-16: Con la app abierta en un chat, no aparece notificación de ese chat; con la app en otra pantalla, aparece el banner interno.

**Permiso y dispositivos**
- [ ] AC-17: Al instalar y registrarse, la app no pide permiso de notificaciones. Lo pide (con la pantalla previa) al unirse al primer grupo o plan.
- [ ] AC-18: Con "Ahora no", no se vuelve a ofrecer hasta 7 días después.
- [ ] AC-19: Con la app en dos celulares, ambos reciben las notificaciones.
- [ ] AC-20: Después de cerrar sesión en un celular, ese celular deja de recibir notificaciones.
- [ ] AC-21: Un dispositivo que el servicio de push informa como inexistente se borra de la base.

---

## 4. Datos y permisos

**Tablas**

`push_tokens` (ver doc 04): se suma `device_id` para no duplicar el mismo celular.

`notification_settings` (una fila por usuario):
```text
- user_id
- messages, requests, group_plans, plan_joins, plan_updates   boolean (default true)
- permission_prompted_at   timestamptz null   -- para el "Ahora no" de 7 días
```

`notification_outbox` (cola de envío):
```text
- id
- user_id
- type          N1..N10
- payload       jsonb    -- textos y a dónde lleva
- collapse_key  text     -- chat o plan, para agrupar
- created_at, sent_at, error
```

Cambios en tablas existentes:
- `chat_reads.last_notified_at`: para la ventana de 5 minutos.
- `plan_participants.reminder_sent_at`: para no repetir el recordatorio.

**Cómo fluye**

```text
Funciones de las specs 02–04 (join_group, send_message, cancel_plan…)
        │  insertan en notification_outbox (ya filtrando bloqueos,
        │  silenciados, ajustes y agrupación)
        ▼
notification_outbox ──► Edge Function `send-push` ──► Expo Push API ──► celulares
        ▲                     │
        │                     └─ marca sent_at / error y borra tokens inválidos
pg_cron (cada 5 min): recordatorios N7 y resúmenes N2 / N6 pendientes
```

- La cola deja registro de todo lo enviado: sirve para depurar y para medir (doc 03, métricas).

**Permisos (RLS)**
- `push_tokens` y `notification_settings`: cada uno lee y escribe solo los suyos.
- `notification_outbox`: sin acceso desde la app; solo funciones del servidor.

---

## 5. Pantallas

```text
Primer grupo/plan ─► Pantalla previa "¿Te avisamos…?" ─► Permiso de Android

Perfil ─► Ajustes ─► Notificaciones
                       ├── 5 interruptores
                       └── Aviso si el permiso del sistema está negado ─► [Abrir ajustes]

Chat ─► ··· ─► Silenciar (spec 04)

App abierta ─► Banner interno arriba (se toca para ir)
```

---

## 6. Decisiones tomadas (2026-10-05)

- [x] Se incluye **N6** (avisar al creador cuando alguien se suma).
- [x] Agrupación de mensajes: **una cada 5 minutos** por chat.
- [x] El permiso se pide al **unirse o crear el primer grupo o plan**.
- [x] **Todo activado por defecto**.
