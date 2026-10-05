# Spec 03 — Planes

> Estado: **aprobada** · Depende de: specs 01 y 02 · Base: `04-decisiones-y-mvp-v0.md`
>
> Fuera de esta spec: chat del plan (spec 04), notificaciones (spec 05), reportes y bloqueos (spec 06). Acá solo se indica **qué evento** dispara cada notificación.

---

## 1. Qué hace

- Como **usuario**, quiero ver qué planes hay en mi ciudad en los próximos días para sumarme a alguno.
- Como **usuario**, quiero crear un plan rápido ("patinar el sábado a las 18 en el Bosque") para que otros se sumen.
- Como **miembro de un grupo**, quiero crear planes dentro del grupo para que la comunidad se junte.
- Como **participante**, quiero saber quién va, dónde y cuándo, y poder bajarme si no puedo ir.
- Como **creador**, quiero editar o cancelar mi plan y sacar a alguien si hace falta.

---

## 2. Reglas

### Crear plan

| Campo | Regla |
|---|---|
| Título | 3–60 caracteres |
| Descripción | Opcional, hasta 500 caracteres |
| Categoría | Una, de la lista de intereses (spec 01) |
| Grupo | Opcional. Si se crea desde un grupo, queda asociado |
| Tipo de lugar | **Lugar público** o **Domicilio particular** |
| Lugar | Obligatorio, texto ("Parque Saavedra", "Bar X") |
| Zona | Opcional ("Centro", "City Bell") |
| Dirección | Solo para domicilio particular, y ahí es obligatoria |
| Inicio | Al menos **30 minutos** en el futuro y como máximo **60 días** |
| Fin | Opcional. Si se carga: después del inicio y como máximo 12 h de duración. Si no: se asume 3 h |
| Capacidad | 2–100, cuenta al creador |

- Al crear, el creador queda como participante.
- **Plan dentro de un grupo**: solo pueden crearlo miembros activos del grupo.
- **Domicilio particular**: solo en planes de grupos **con aprobación**. No se permite en planes independientes ni en grupos abiertos.
- Límite: un usuario puede tener como máximo **10 planes próximos creados** a la vez.
- Fechas y horas se muestran siempre en hora de Argentina.
- Evento: plan nuevo en un grupo → avisar a los miembros del grupo (spec 05).

### Visibilidad

| Tipo de plan | Quién lo ve y se puede sumar |
|---|---|
| Independiente | Cualquier usuario de la ciudad |
| De un grupo **abierto** | Cualquier usuario de la ciudad (no hace falta entrar al grupo) |
| De un grupo **con aprobación** | Solo miembros activos del grupo |

- No ves planes creados por alguien que te bloqueó o que bloqueaste.
- Un usuario **sacado** de un plan deja de verlo.

### Descubrir planes
- Pestaña **Planes** de Descubrir: planes **próximos** (no empezados ni cancelados) de la ciudad del usuario.
- Orden: **los más cercanos en el tiempo primero**.
- Filtro por **categoría** y búsqueda por **texto** (título, descripción y lugar).
- Los completos se muestran en su lugar, marcados "Completo".
- Cada tarjeta muestra: emoji de categoría, título, día y hora ("Sáb 18:00"), lugar o zona, `participantes / capacidad`, nombre del grupo si tiene, y fotos de hasta 3 participantes.

### Unirse y salirse
- **Unirse**: directo, sin aprobación, si el plan es visible, no empezó, no está cancelado y hay lugar.
- La capacidad se controla en la base: si dos personas toman el último lugar a la vez, entra una sola.
- La **primera vez** que un usuario se suma a un plan, ve el aviso "Encontrate en lugares públicos y avisale a alguien a dónde vas" y tiene que aceptarlo.
- **Salirse**: hasta que el plan empieza. Después ya no (el plan quedó en la historia).
- El **creador no puede salirse**: puede cancelar.

### Participantes
- Cualquiera que pueda ver el plan ve la **lista completa** de participantes (nombre y foto). Saber quién va da confianza para sumarse.
- Compartir un plan, **aunque ya haya terminado**, cuenta como "algo en común" para ver el perfil extendido (spec 01).
- El creador puede **sacar a un participante**. El sacado no puede volver a sumarse a ese plan y deja de verlo. No se notifica por push.

### Domicilio particular
- La **dirección** la ven solo los participantes.
- El resto ve la zona y el texto "Domicilio particular · la dirección se ve al sumarte".
- El aviso de seguridad se muestra siempre en el detalle de estos planes.

### Ciclo de vida

```text
Próximo ──► En curso ──► Terminado
   │
   └──► Cancelado (por el creador)
```

- El estado se calcula con las fechas; no se guarda.
- **Próximo**: aparece en Descubrir, se puede unir, salir y editar.
- **En curso** y **Terminado**: sale de Descubrir; no se puede unir, salir ni editar. Sigue visible en "Lo mío" y desde el grupo.
- Evento: recordatorio **2 horas antes** del inicio a todos los participantes (spec 05).

### Editar
- Solo el creador y solo si el plan está **Próximo**.
- Se puede cambiar todo excepto el **grupo**.
- Para pasar a domicilio particular rigen las mismas reglas que al crear.
- **Bajar la capacidad** por debajo de los participantes actuales: nadie sale; se cierra el ingreso.
- Evento: si cambia **fecha, hora o lugar** → avisar a los participantes (spec 05). Otros cambios no notifican.

### Cancelar
- Solo el creador y solo si el plan está **Próximo**.
- Puede escribir un **motivo** opcional, que se publica en el chat del plan.
- El plan queda marcado "Cancelado" para los participantes y sale de Descubrir.
- Evento: plan cancelado → avisar a los participantes (spec 05).
- Cancelaciones automáticas (mismos efectos): el creador se va del grupo, el grupo se elimina, o el creador elimina su cuenta (specs 01 y 02).

---

## 3. Criterios de aceptación

**Crear**
- [ ] AC-01: Un usuario crea un plan independiente válido y queda como único participante.
- [ ] AC-02: No se puede crear con inicio dentro de 29 minutos, a más de 60 días, ni con fin antes del inicio o duración de más de 12 h (ni por API).
- [ ] AC-03: Un no miembro no puede crear un plan en un grupo (ni por API).
- [ ] AC-04: Un plan en domicilio particular se puede crear en un grupo con aprobación, pero no en uno abierto ni como independiente (ni por API).
- [ ] AC-05: Domicilio particular sin dirección no se puede crear.
- [ ] AC-06: Un usuario con 10 planes próximos creados no puede crear el 11. Cuando uno termina o se cancela, puede volver a crear.
- [ ] AC-07: Un plan sin fin cargado figura como terminado 3 h después del inicio.

**Visibilidad y Descubrir**
- [ ] AC-08: Un plan independiente y uno de un grupo abierto aparecen en Descubrir para cualquier usuario de la ciudad.
- [ ] AC-09: Un plan de un grupo con aprobación no aparece para un no miembro, y la API no lo devuelve.
- [ ] AC-10: Los planes aparecen ordenados por fecha de inicio, el más cercano primero.
- [ ] AC-11: Un plan que ya empezó o fue cancelado no aparece en Descubrir.
- [ ] AC-12: No se ven planes de alguien con quien hay un bloqueo. *(Verificable con la spec 06.)*

**Unirse, salirse, participantes**
- [ ] AC-13: Un usuario se suma a un plan con lugar y aparece en la lista de participantes.
- [ ] AC-14: Con 1 lugar libre y dos usuarios sumándose a la vez, entra solo uno; el otro ve "El plan se llenó".
- [ ] AC-15: La primera vez que alguien se suma a un plan ve el aviso de seguridad; la segunda, no.
- [ ] AC-16: Un participante se baja antes del inicio y libera su lugar.
- [ ] AC-17: Una vez empezado el plan, no se puede unir ni salir (ni por API).
- [ ] AC-18: El creador no tiene opción de salirse.
- [ ] AC-19: Quien ve el plan ve la lista completa de participantes.
- [ ] AC-20: Dos personas que compartieron un plan terminado siguen viendo el perfil extendido del otro.
- [ ] AC-21: Un participante sacado por el creador deja de ver el plan y no puede volver a sumarse.

**Domicilio particular**
- [ ] AC-22: Un no participante no recibe la dirección desde la API; ve "la dirección se ve al sumarte".
- [ ] AC-23: Al sumarse, el usuario ve la dirección. Al salirse, deja de verla.

**Editar y cancelar**
- [ ] AC-24: El creador edita título, lugar, hora y capacidad de un plan próximo.
- [ ] AC-25: No se puede editar ni cancelar un plan en curso o terminado (ni por API).
- [ ] AC-26: Bajar la capacidad a 4 con 6 participantes no saca a nadie y no deja entrar a nadie más.
- [ ] AC-27: Cambiar la hora genera el evento de aviso a participantes; cambiar la descripción, no.
- [ ] AC-28: Cancelar con motivo deja el plan como "Cancelado" y publica el motivo en el chat.
- [ ] AC-29: Un participante que no es creador no puede editar, cancelar ni sacar a otros (ni por API).
- [ ] AC-30: Si el creador se va del grupo, sus planes próximos en ese grupo quedan cancelados (completa AC-23 de la spec 02).

---

## 4. Datos y permisos

**Tablas** (ver doc 04): `plans`, `plan_participants`.

Cambios respecto del doc 04:
- La **dirección** sale de `plans` y va a una tabla aparte `plan_private_details(plan_id, address)`. Así los permisos son simples: esa tabla solo la leen los participantes.
- `plans.participant_count` (int): se actualiza con un trigger.
- `plans.cancel_reason` (text, null).
- `plan_participants.removed_at` (timestamptz, null): marca a los sacados por el creador.
- `profiles.safety_notice_accepted_at` (timestamptz, null): para mostrar el aviso solo la primera vez.

El estado (Próximo / En curso / Terminado / Cancelado) se calcula en una **vista** `plans_with_status`.

**Funciones en la base**
- `create_plan(...)`: valida fechas, membresía en el grupo, reglas de domicilio y el límite de 10.
- `join_plan(plan_id)`: valida visibilidad, estado, bloqueos, sacado y cupo, en una transacción.
- `leave_plan(plan_id)`
- `remove_participant(plan_id, user_id)`: solo creador.
- `update_plan(plan_id, ...)`: solo creador y plan próximo; registra si cambió fecha, hora o lugar.
- `cancel_plan(plan_id, reason)`: solo creador y plan próximo.

**Permisos (RLS)**
- `plans`: se lee según la tabla de visibilidad; el creador y los participantes lo ven siempre, salvo los sacados. Sin insert/update/delete directo: todo pasa por las funciones.
- `plan_participants`: la lista la lee quien puede ver el plan. Sin escritura directa.
- `plan_private_details`: solo la leen los participantes activos y el creador.

---

## 5. Pantallas

```text
Descubrir ─► [Planes | Grupos] ─► Tarjeta de plan ─► Detalle de plan

Detalle de plan
 ├── Encabezado: emoji, título, día y hora, lugar/zona, grupo (si tiene), estado
 ├── Botón según estado:
 │     Sumarme · Completo · Ya no podés sumarte (empezó/terminó) · Cancelado
 │     Participante → [Chat] · Bajarme
 ├── Dirección (solo participantes, si es domicilio) o aviso
 ├── Descripción
 ├── Participantes (lista completa)
 └── Menú ···
       Participante: Reportar plan
       Creador: Editar · Cancelar plan · Sacar participante (desde la lista)

＋ Crear ─► Plan ─► Formulario (con selector de grupo opcional) ─► Detalle del plan nuevo
Detalle de grupo ─► Planes del grupo ─► [＋ Crear plan en este grupo]

Lo mío ─► Mis planes: Próximos · Pasados (incluye cancelados)
```

---

## 6. Decisiones tomadas (2026-10-05)

- [x] **Lista completa de participantes** visible para quien ve el plan.
- [x] Límite de **10 planes próximos** creados por usuario.
- [x] Anticipación: mínimo **30 minutos**, máximo **60 días**.
- [x] El **creador puede sacar participantes**; el sacado no vuelve a ese plan.
- [x] **Unirse sin aprobación** en todos los planes (con aprobación queda para v1).
