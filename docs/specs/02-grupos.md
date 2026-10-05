# Spec 02 — Grupos

> Estado: **aprobada** · Depende de: spec 01 · Base: `04-decisiones-y-mvp-v0.md`
>
> Fuera de esta spec: planes del grupo (spec 03), chat (spec 04), notificaciones (spec 05), reportes y bloqueos (spec 06). Acá solo se indica **qué evento** dispara cada notificación.

---

## 1. Qué hace

- Como **usuario**, quiero descubrir grupos de mi ciudad por categoría o búsqueda para encontrar gente con mis intereses.
- Como **usuario**, quiero crear un grupo y definir de qué se trata, cuánta gente entra y cómo se entra.
- Como **usuario**, quiero unirme a un grupo abierto o pedir ingreso a uno con aprobación.
- Como **creador**, quiero aceptar o rechazar solicitudes y expulsar a quien no respete el grupo.
- Como **creador**, quiero editar o eliminar mi grupo.
- Como **miembro**, quiero ver quiénes están en el grupo y poder salirme cuando quiera.

---

## 2. Reglas

### Crear grupo

| Campo | Regla |
|---|---|
| Nombre | 3–50 caracteres. Puede repetirse con otros grupos |
| Descripción | 10–500 caracteres |
| Imagen | Opcional. Sin imagen se muestra el emoji de la categoría sobre un color |
| Categoría | Una, de la lista de intereses (spec 01) |
| Ciudad | La del creador (en v0, La Plata) |
| Zona | Opcional, texto libre ("Centro", "City Bell") |
| Capacidad | 2–500, cuenta al creador |
| Acceso | **Abierto** o **Con aprobación** |

- Al crear, el creador queda como miembro con rol `owner`.
- Límite: un usuario puede **ser creador de hasta 10 grupos** a la vez (anti-spam).

### Descubrir grupos
- Pestaña **Grupos** de Descubrir: muestra los grupos de la ciudad del usuario.
- Filtro por **categoría** y búsqueda por **texto** (nombre y descripción).
- Orden: **actividad reciente** (último mensaje o plan nuevo). Un grupo vivo aparece arriba; uno abandonado baja solo.
- Los grupos **completos** se muestran al final, marcados "Completo".
- No aparecen: grupos eliminados, grupos de los que fuiste expulsado, y grupos cuyo creador te bloqueó o bloqueaste.
- Cada tarjeta muestra: imagen, nombre, categoría, zona, `miembros / capacidad`, tipo de acceso.

### Unirse

```text
                  ┌─ Abierto ────────► Miembro
Botón "Unirme" ───┤
                  └─ Con aprobación ─► Solicitud pendiente ──► Aceptada ─► Miembro
                                              │
                                              ├─► Rechazada
                                              └─► Cancelada por el usuario
```

- **Abierto**: entra directo si hay lugar.
- **Con aprobación**: se crea una solicitud. El usuario puede **cancelarla** mientras está pendiente.
- **Rechazada**: puede volver a pedir ingreso después de **7 días**.
- **Grupo lleno**: no se puede unir ni pedir ingreso. El creador no puede aceptar solicitudes hasta que se libere lugar.
- Un usuario puede tener como máximo **20 solicitudes pendientes** a la vez.
- La capacidad se controla en la base: si dos personas intentan ocupar el último lugar al mismo tiempo, solo una entra.

### Solicitudes (creador)
- Lista de pendientes, de la más vieja a la más nueva.
- Para decidir, el creador ve el **perfil extendido** del solicitante (con bio), como si compartieran un grupo.
- Acciones: **Aceptar** / **Rechazar**. Al rechazar no se le muestra un motivo al solicitante.
- Eventos para notificaciones (spec 05): solicitud recibida → creador; solicitud aceptada → solicitante. El rechazo **no** se notifica por push; el usuario ve "Solicitud no aceptada" al entrar al grupo.

### Miembros
- **No miembros** ven: cantidad de miembros y las fotos de hasta 5.
- **Miembros** ven la lista completa (nombre, foto, rol). Tocar a alguien abre su perfil.
- El creador figura primero, marcado "Creador".

### Roles

| Acción | Creador | Miembro |
|---|---|---|
| Ver miembros, chatear, crear planes | ✅ | ✅ |
| Editar grupo | ✅ | ❌ |
| Aceptar / rechazar solicitudes | ✅ | ❌ |
| Expulsar miembros | ✅ | ❌ |
| Eliminar mensajes de otros (spec 04) | ✅ | ❌ |
| Salirse | ❌ (puede eliminar el grupo) | ✅ |
| Eliminar grupo | ✅ | ❌ |

### Salirse
- El miembro deja de ver el chat y los planes exclusivos del grupo.
- Los **planes que creó** en el grupo y todavía no empezaron se **cancelan** (con aviso a los participantes, spec 03).
- Si el grupo es **con aprobación**, se lo saca también de los planes del grupo a los que se había sumado. Si es **abierto**, sigue en esos planes (son públicos).
- Puede volver a unirse después, con las reglas normales.

### Expulsar
- Solo el creador. Se pide confirmación.
- Mismos efectos que salirse, y además **no puede volver a unirse ni pedir ingreso** a ese grupo, y el grupo deja de aparecerle en Descubrir.
- No se notifica por push; al intentar entrar ve "Ya no sos parte de este grupo".

### Editar
- Se pueden cambiar todos los campos de "Crear grupo".
- **Bajar la capacidad** por debajo de los miembros actuales: nadie es expulsado; el ingreso queda cerrado hasta bajar del nuevo límite.
- **Con aprobación → Abierto**: las solicitudes pendientes se aceptan por orden de llegada hasta llenar el cupo; las que no entran se rechazan sin cooldown.
- **Abierto → Con aprobación**: no afecta a los miembros actuales.

### Eliminar
- Solo el creador, confirmando con el **nombre del grupo**.
- Se cancelan los planes del grupo que no empezaron (con aviso, spec 03).
- Los miembros reciben aviso de que el grupo fue eliminado (spec 05).
- El grupo y su chat dejan de ser visibles. Se guardan ocultos 30 días por si hay reportes pendientes y después se borran.
- Si el creador elimina su cuenta, sus grupos se eliminan igual (spec 01).

---

## 3. Criterios de aceptación

**Crear y descubrir**
- [ ] AC-01: Un usuario crea un grupo con los campos válidos y queda como único miembro, con rol creador.
- [ ] AC-02: Con nombre de 2 caracteres, descripción de 9 o capacidad 1 o 501, no se puede crear (ni por API).
- [ ] AC-03: Un usuario que ya es creador de 10 grupos no puede crear el número 11.
- [ ] AC-04: Un grupo sin imagen muestra el emoji de su categoría.
- [ ] AC-05: En Descubrir solo aparecen grupos de la ciudad del usuario.
- [ ] AC-06: Filtrar por "Running" muestra solo grupos de esa categoría; buscar "psico" encuentra "Psicología 1° año".
- [ ] AC-07: Un grupo con un mensaje de hace 1 hora aparece antes que uno sin actividad hace 2 semanas.
- [ ] AC-08: Un grupo lleno aparece al final, con la etiqueta "Completo" y sin botón para unirse.

**Unirse y solicitudes**
- [ ] AC-09: En un grupo abierto con lugar, "Unirme" lo hace miembro al instante.
- [ ] AC-10: En un grupo con aprobación, "Pedir ingreso" deja la solicitud pendiente y el botón pasa a "Solicitud enviada · Cancelar".
- [ ] AC-11: Cancelar una solicitud pendiente la elimina y el creador deja de verla.
- [ ] AC-12: Con 1 lugar libre y dos usuarios uniéndose al mismo tiempo, entra solo uno; el otro ve "El grupo se llenó".
- [ ] AC-13: El creador acepta una solicitud y el usuario pasa a miembro.
- [ ] AC-14: Con el grupo lleno, el creador no puede aceptar solicitudes (el botón está deshabilitado y la API lo rechaza).
- [ ] AC-15: Un usuario rechazado no puede volver a pedir ingreso hasta que pasen 7 días.
- [ ] AC-16: Un usuario con 20 solicitudes pendientes no puede enviar la 21.
- [ ] AC-17: El creador ve la bio de quien solicita ingreso aunque no compartan nada.
- [ ] AC-18: Un usuario no puede aceptar su propia solicitud ni la de otros si no es el creador (ni por API).

**Miembros**
- [ ] AC-19: Un no miembro ve la cantidad de miembros y hasta 5 fotos, pero la API no le devuelve la lista completa.
- [ ] AC-20: Un miembro ve la lista completa con el creador primero.
- [ ] AC-21: Dos miembros de un mismo grupo ven el perfil extendido del otro (completa el AC-17 de la spec 01).

**Salir, expulsar, editar, eliminar**
- [ ] AC-22: Al salirse, el usuario deja de ver el chat del grupo (ni por API).
- [ ] AC-23: Al salirse, los planes futuros que creó en el grupo quedan cancelados.
- [ ] AC-24: Al salirse de un grupo con aprobación, se lo saca de los planes del grupo; en uno abierto, sigue en ellos.
- [ ] AC-25: El creador no tiene opción de salirse.
- [ ] AC-26: Un expulsado no puede volver a unirse ni pedir ingreso, y el grupo no le aparece en Descubrir.
- [ ] AC-27: Bajar la capacidad a 5 con 8 miembros no expulsa a nadie, y nadie más puede entrar hasta que queden menos de 5.
- [ ] AC-28: Pasar de "con aprobación" a "abierto" con 3 lugares y 5 pendientes acepta a los 3 más antiguos y rechaza a los otros 2.
- [ ] AC-29: Eliminar el grupo sin escribir su nombre exacto no hace nada.
- [ ] AC-30: Después de eliminarlo, el grupo no aparece en Descubrir ni en "Lo mío" de ningún miembro, y sus planes futuros están cancelados.
- [ ] AC-31: Un miembro común no puede editar ni eliminar el grupo (ni por API).

---

## 4. Datos y permisos

**Tablas** (ver doc 04): `groups`, `group_members`.

Campos agregados respecto del doc 04:
- `groups.member_count` (int): se actualiza con un trigger. Evita contar filas en cada listado.
- `groups.last_activity_at` (timestamptz): se actualiza con cada mensaje o plan nuevo. Sirve para ordenar Descubrir.
- `group_members.status`: `pending | active | rejected | banned` (antes solo `pending | active`).
- `group_members.requested_at`, `decided_at`: para el orden de solicitudes y el cooldown de 7 días.

**Storage**: bucket `group-images`, una carpeta por grupo. Solo el creador sube y borra.

**Funciones en la base** (todas las escrituras de membresía pasan por acá, nunca por insert directo):
- `join_group(group_id)`: verifica bloqueos, expulsión, cooldown, límite de solicitudes y cupo, en una transacción. Devuelve `joined`, `requested` o el error.
- `cancel_request(group_id)`
- `decide_request(group_id, user_id, accept)`: solo creador, verifica cupo.
- `leave_group(group_id)`: aplica los efectos sobre planes.
- `remove_member(group_id, user_id)`: solo creador, deja `banned`.
- `delete_group(group_id, confirm_name)`

**Permisos (RLS)**
- `groups`: lectura de grupos no eliminados, salvo para expulsados y usuarios con bloqueo con el creador. Crear: cualquier usuario con perfil completo. Editar: solo el creador.
- `group_members`: cada uno ve sus propias filas. Los miembros activos ven las filas activas de su grupo. El creador ve además las pendientes. Sin insert/update/delete directo desde la app.
- Las 5 fotos de la vista previa salen de una función que no expone la lista completa.

---

## 5. Pantallas

```text
Descubrir ─► [Planes | Grupos] ─► Tarjeta de grupo ─► Detalle de grupo

Detalle de grupo
 ├── Encabezado: imagen, nombre, categoría, zona, miembros/capacidad, acceso
 ├── Botón según estado:
 │     Unirme · Pedir ingreso · Solicitud enviada (Cancelar) · Completo
 │     Solicitud no aceptada · Miembro → [Chat]
 ├── Descripción
 ├── Planes del grupo (spec 03)
 ├── Miembros (vista previa o lista completa)
 └── Menú ···
       Miembro: Salir del grupo · Reportar grupo
       Creador: Editar · Solicitudes (n) · Eliminar grupo

＋ Crear ─► Grupo ─► Formulario ─► Detalle del grupo nuevo

Lo mío ─► Mis grupos (soy creador / soy miembro / solicitudes pendientes)
```

---

## 6. Decisiones tomadas (2026-10-05)

- [x] Descubrir ordena por **actividad reciente**.
- [x] La **expulsión es permanente**.
- [x] Límite de **10 grupos creados** por usuario.
- [x] **Imagen opcional**, con el emoji de la categoría por defecto.
