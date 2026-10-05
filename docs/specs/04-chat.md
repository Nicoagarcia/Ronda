# Spec 04 — Chat

> Estado: **aprobada** · Depende de: specs 01, 02 y 03 · Base: `04-decisiones-y-mvp-v0.md`
>
> Fuera de esta spec: notificaciones push de mensajes (spec 05), reportar mensajes y bloqueos (spec 06). Acá solo se indica **qué evento** dispara cada notificación.

---

## 1. Qué hace

- Como **miembro de un grupo**, quiero chatear con el resto del grupo para conocernos y organizarnos.
- Como **participante de un plan**, quiero hablar con los que van ("¿quién lleva la pelota?", "estoy llegando").
- Como **usuario**, quiero ver en un solo lugar mis chats con mensajes sin leer.
- Como **usuario**, quiero borrar un mensaje mío si me equivoqué.
- Como **creador** de un grupo o plan, quiero borrar mensajes que no respetan las reglas.

---

## 2. Reglas

### Qué chats existen y quién entra

| Chat | Quién lo lee y escribe |
|---|---|
| Chat del **grupo** | Miembros activos del grupo |
| Chat del **plan** | Participantes del plan (incluido el creador), salvo los sacados |

- El chat de un plan de un grupo **es distinto** del chat del grupo. Solo entran los que se sumaron al plan.
- Al **salir** de un grupo o plan, o ser expulsado o sacado, se pierde el acceso al chat, también a lo ya leído.
- Al **entrar**, se ve **todo el historial** del chat, para tener contexto.
- No hay chats privados entre dos personas en v0. Todo pasa en el contexto de un grupo o un plan.

### Estado del chat del plan

| Estado del plan | Chat |
|---|---|
| Próximo / En curso | Abierto |
| Terminado, hasta 24 h después del fin | Abierto |
| Terminado, más de 24 h | Solo lectura |
| Cancelado | Solo lectura |

En solo lectura, los participantes siguen viendo los mensajes pero no pueden escribir. Se muestra el motivo ("Este plan terminó" / "Este plan fue cancelado").

### Mensajes
- Solo **texto**, de 1 a 2000 caracteres. Los emojis cuentan como texto.
- Los **links** se pueden tocar, sin vista previa.
- **No se pueden editar** en v0.
- **Borrar**: cada uno puede borrar sus mensajes. En su lugar queda "Mensaje eliminado".
- **Moderación**: el creador del grupo, en el chat del grupo, y el creador del plan, en el chat del plan, pueden borrar mensajes de otros. Queda "Mensaje eliminado por el moderador".
- Mensajes de cuentas eliminadas: quedan con el autor "Usuario eliminado" (spec 01).
- **Límite anti-spam**: como máximo 10 mensajes cada 10 segundos por usuario. Si se pasa, ve "Esperá un momento antes de seguir escribiendo".
- Imágenes, reacciones, respuestas a un mensaje, menciones y "escribiendo…" quedan para v1.

### Mensajes del sistema
Mensajes automáticos, en gris y centrados:

| Chat | Mensaje |
|---|---|
| Grupo | "Nico se unió al grupo" |
| Plan | "Nico se sumó" · "Nico se bajó" |
| Plan | "Cambió la hora: sáb 18:00 → sáb 19:00" (también fecha y lugar) |
| Plan | "El plan fue cancelado: *motivo*" |

En el chat del grupo **no** se anuncian salidas, para no exponer a quien se va.

### Bloqueos
- Si hay un bloqueo, en cualquier dirección, **ninguno de los dos ve los mensajes del otro**, en todos los chats.
- Los mensajes se ocultan del todo, sin "mensaje oculto" en su lugar.
- El filtro se hace en la base: los mensajes ocultos no llegan al celular.

### Leídos y no leídos
- Se guarda **hasta dónde leyó** cada usuario en cada chat.
- En **Lo mío** cada grupo y plan muestra el último mensaje y un **contador de no leídos**.
- La pestaña **Lo mío** muestra un punto si hay algo sin leer.
- No hay confirmación de lectura visible para otros ("visto") en v0.

### Silenciar
- Desde el menú del chat: **Silenciar** / **Activar notificaciones**.
- Un chat silenciado sigue sumando no leídos, pero no manda push (spec 05).

### Envío y conexión
- El mensaje aparece al instante en la pantalla de quien lo envía, marcado "enviando…".
- Si falla (sin conexión), queda marcado con **"No enviado · Reintentar"**.
- Los mensajes nuevos de otros llegan **en tiempo real** mientras el chat está abierto.
- Al abrir un chat se cargan los **últimos 50** mensajes. Al subir se cargan los anteriores, de a 50.

### Eventos
- Mensaje nuevo → push a los integrantes del chat que no lo tengan silenciado (spec 05).
- Mensaje nuevo en el chat de un grupo → actualiza la actividad reciente del grupo (orden de Descubrir, spec 02).

---

## 3. Criterios de aceptación

**Acceso**
- [ ] AC-01: Un miembro de un grupo lee y escribe en su chat; un no miembro no puede leerlo ni escribir (ni por API).
- [ ] AC-02: Un miembro de un grupo que no se sumó a un plan del grupo no puede leer el chat del plan.
- [ ] AC-03: Un usuario que se une a un grupo ve los mensajes anteriores a su ingreso.
- [ ] AC-04: Al salirse o ser expulsado, el usuario deja de ver el chat, incluido el historial.
- [ ] AC-05: Un participante sacado de un plan no puede leer ni escribir en su chat.

**Estado del chat del plan**
- [ ] AC-06: Se puede escribir durante el plan y hasta 24 h después de su fin.
- [ ] AC-07: Pasadas las 24 h, el chat queda en solo lectura y la API rechaza mensajes nuevos.
- [ ] AC-08: En un plan cancelado no se puede escribir y se ve el motivo.

**Mensajes**
- [ ] AC-09: Un mensaje vacío o de más de 2000 caracteres no se envía (ni por API).
- [ ] AC-10: Un mensaje enviado aparece en tiempo real en otro dispositivo con el chat abierto, en menos de 2 segundos.
- [ ] AC-11: Sin conexión, el mensaje queda "No enviado" y "Reintentar" lo envía cuando vuelve la conexión.
- [ ] AC-12: El mensaje 11 dentro de 10 segundos es rechazado con el aviso correspondiente.
- [ ] AC-13: Un usuario borra un mensaje suyo y todos ven "Mensaje eliminado".
- [ ] AC-14: Un usuario no puede borrar mensajes de otros, salvo que sea el creador de ese grupo o plan (ni por API).
- [ ] AC-15: El creador del grupo borra un mensaje ajeno y se ve "Mensaje eliminado por el moderador".
- [ ] AC-16: Un link en un mensaje se puede tocar y abre el navegador.
- [ ] AC-17: Al subir en un chat de 200 mensajes, se cargan de a 50 sin saltos ni duplicados.

**Mensajes del sistema**
- [ ] AC-18: Sumarse a un plan publica "X se sumó" en su chat; bajarse publica "X se bajó".
- [ ] AC-19: Unirse a un grupo publica "X se unió al grupo"; salirse no publica nada.
- [ ] AC-20: Cambiar la hora de un plan publica el cambio en su chat.
- [ ] AC-21: Un usuario no puede crear mensajes del sistema (ni por API).

**Bloqueos** *(verificables con la spec 06)*
- [ ] AC-22: Si A bloquea a B, A no ve los mensajes de B ni B los de A, en ningún chat compartido.
- [ ] AC-23: Los mensajes ocultos por bloqueo no llegan en la respuesta de la API ni por tiempo real.

**No leídos y silenciar**
- [ ] AC-24: Con 3 mensajes nuevos en un grupo, Lo mío muestra "3" en ese grupo y el punto en la pestaña.
- [ ] AC-25: Al abrir el chat, el contador vuelve a 0, también en otro dispositivo del mismo usuario.
- [ ] AC-26: Silenciar un chat se mantiene al cerrar y reabrir la app.

---

## 4. Datos y permisos

**Tablas**

`messages` (ver doc 04), con cambios:
- `kind`: `text | system`.
- `sender_id` puede ser null en mensajes del sistema.
- `deleted_by`: `author | moderator` (null si no está borrado).
- Índices por `(group_id, created_at)` y `(plan_id, created_at)`.

Tabla nueva `chat_reads`:
```text
chat_reads
- user_id
- group_id     null
- plan_id      null      -- CHECK: exactamente uno
- last_read_at timestamptz
- muted        boolean
```

**Funciones en la base**
- `send_message(chat, body)`: verifica acceso, estado del chat del plan, largo y límite anti-spam. Actualiza la actividad del grupo.
- `delete_message(message_id)`: autor o moderador; deja el texto vacío y marca `deleted_by`.
- `mark_read(chat)`, `set_muted(chat, muted)`.
- `get_my_chats()`: lista de Lo mío con último mensaje y no leídos.
- Los mensajes del sistema los crean las funciones de las specs 02 y 03 (`join_group`, `join_plan`, `update_plan`, etc.).

**Permisos (RLS)**
- `messages`: lectura si sos integrante del chat y no hay bloqueo con el autor. Sin insert/update/delete directo: todo por funciones.
- El texto de un mensaje borrado no se devuelve, ni a moderadores.
- `chat_reads`: cada uno lee y escribe solo las suyas.

---

## 5. Pantallas

```text
Lo mío ─► Lista: grupos y planes con último mensaje y no leídos
            └─► Chat

Chat
 ├── Encabezado: nombre del grupo o plan (tocar → detalle) · menú ···
 │      ··· Silenciar / Activar notificaciones
 ├── Mensajes (propios a la derecha, otros a la izquierda con foto y nombre)
 │      Mantener apretado: Copiar · Eliminar (propio o moderador) · Reportar (spec 06)
 ├── Mensajes del sistema centrados
 └── Campo de texto + Enviar  (o aviso de solo lectura)

Detalle de grupo / plan ─► [Chat]
```

---

## 6. Notas técnicas

- **Tiempo real**: Supabase Realtime escuchando cambios de `messages` (respeta los permisos RLS, así los bloqueos y accesos se aplican también en vivo). Alcanza para la beta.
- **Si crece**: pasar a *Broadcast* de Supabase disparado desde la base, que escala mejor con muchas conexiones. Por eso el chat va aislado en `services/chat` (doc 04, sección 5).
- Envío optimista con TanStack Query: el mensaje se muestra antes de la confirmación del servidor y se reemplaza al llegar.

---

## 7. Decisiones tomadas (2026-10-05)

- [x] Los nuevos integrantes ven **todo el historial**.
- [x] **Sin editar mensajes** en v0, solo borrar.
- [x] En el grupo **no se anuncian salidas**; en el plan sí.
- [x] **Sin chats privados** entre dos personas en v0.
