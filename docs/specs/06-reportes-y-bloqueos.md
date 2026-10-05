# Spec 06 — Reportes, bloqueos y moderación

> Estado: **aprobada** · Depende de: specs 01 a 05 · Base: `04-decisiones-y-mvp-v0.md`
>
> Google Play exige, para apps con contenido de usuarios: poder **reportar** contenido y usuarios, poder **bloquear**, **moderar** lo reportado y tener **términos** que prohíban el contenido inaceptable. Esta spec cubre todo eso.

---

## 1. Qué hace

- Como **usuario**, quiero bloquear a alguien para no ver nada suyo ni que me vea.
- Como **usuario**, quiero reportar a una persona, un grupo, un plan o un mensaje que rompe las reglas.
- Como **usuario en una situación de riesgo**, quiero pedir ayuda rápido.
- Como **moderador** (Enyi), quiero enterarme al instante de cada reporte y poder actuar: borrar contenido o suspender cuentas.
- Como **usuario suspendido**, quiero saber qué pasó y a quién escribir.

---

## 2. Reglas

### Bloquear

**Desde dónde**: perfil de la persona · mantener apretado un mensaje suyo · lista de miembros o participantes.

**Qué pasa** (en las dos direcciones, salvo lo indicado):

| Efecto | Spec |
|---|---|
| Ninguno ve el perfil del otro: "Perfil no disponible" | 01 |
| Ninguno ve los mensajes del otro, en ningún chat | 04 |
| No ves los grupos que creó el otro, ni puede él ver los tuyos, ni unirse | 02 |
| No ves los planes que creó el otro, ni él los tuyos, ni sumarse | 03 |
| Ninguno recibe notificaciones por acciones del otro | 05 |

- Pueden **seguir en el mismo grupo o plan** creado por un tercero: el bloqueo corta la interacción, no la presencia.
- Si quien bloquea es **creador** del grupo o plan donde está el otro, se le ofrece también **expulsarlo / sacarlo** ("¿También querés sacarlo del grupo?"). No es automático.
- El bloqueado **no se entera**. No hay notificación ni aviso.
- **Desbloquear**: Perfil → Ajustes → **Bloqueados**. Todo vuelve a ser visible, salvo expulsiones hechas aparte.

### Reportar

**Qué se puede reportar y desde dónde**

| Qué | Desde |
|---|---|
| Usuario | Su perfil (menú ···) |
| Grupo | Detalle del grupo (menú ···) |
| Plan | Detalle del plan (menú ···) |
| Mensaje | Mantener apretado el mensaje |

**Motivos**

| Motivo | Prioridad |
|---|---|
| 🚨 **Me siento en peligro** | **Urgente** |
| Acoso o amenazas | Alta |
| Parece menor de 18 | Alta |
| Contenido sexual o violento | Alta |
| Se hace pasar por otra persona | Normal |
| Spam o publicidad | Normal |
| Otro (texto obligatorio) | Normal |

- Comentario opcional de hasta 500 caracteres (obligatorio en "Otro").
- **"Me siento en peligro"** muestra antes de enviar: "Si estás en peligro ahora, llamá al **911**" con botón para llamar. El reporte se manda igual.
- Al reportar a un usuario o un mensaje, se ofrece **bloquear** a la persona en el mismo paso.
- Se guarda una **copia del contenido** al momento del reporte (texto del mensaje, nombre y descripción del grupo o plan, datos del perfil). Si después lo borran, la evidencia queda.
- **Anónimo**: el reportado nunca sabe quién lo reportó.
- Un usuario no puede reportar dos veces lo mismo mientras el primer reporte está abierto.
- Límite: **10 reportes por día** por usuario (evita abuso del sistema).
- Después de enviar: "Gracias. Lo vamos a revisar en menos de 24 horas." No hay seguimiento del estado en v0.

### Ocultar automáticamente
Para que el contenido dañino no quede visible mientras el moderador no lo vio:
- Un **mensaje** con reportes de **3 usuarios distintos** se oculta para todos hasta que se revise ("Mensaje oculto mientras se revisa").
- Un **grupo o plan** con reportes de **3 usuarios distintos** sale de Descubrir hasta que se revise. Los miembros y participantes lo siguen viendo.
- Un reporte **urgente** no oculta nada automáticamente, pero dispara la alerta urgente al moderador.

### Moderación (Enyi en la beta)
- **Alerta** por cada reporte nuevo, por **Telegram**, con el motivo, el contenido copiado y un link al reporte. Los urgentes van marcados 🚨.
- Compromiso: revisar en menos de **24 h**; los urgentes, lo antes posible.
- **Panel**: el dashboard de Supabase en v0, con funciones de moderación listas para ejecutar.

**Acciones del moderador**

| Acción | Efecto |
|---|---|
| Descartar | El reporte se cierra; si había contenido oculto, vuelve a verse |
| Borrar mensaje | Queda "Mensaje eliminado por el moderador" |
| Eliminar grupo / cancelar plan | Igual que si lo hiciera el creador (specs 02 y 03), con aviso a los integrantes |
| Advertir usuario | El usuario ve un aviso al abrir la app con el motivo y las normas |
| Suspender temporalmente | 1, 7 o 30 días sin poder usar la app |
| Suspender permanentemente | Igual que eliminar la cuenta (spec 01), y el email no puede volver a registrarse |

- Si se confirma que alguien es **menor de 18**, se suspende permanentemente.
- Cada acción queda registrada en el reporte: quién, cuándo y una nota.

### Usuario suspendido
- Al abrir la app ve: "Tu cuenta está suspendida hasta *fecha* · Motivo: *motivo*" y un email de contacto para apelar.
- No puede usar nada de la app. Sus mensajes siguen visibles para el resto, salvo que se borren por moderación.
- Mientras está suspendido no aparece en listas de miembros ni de participantes.
- Al vencer la suspensión temporal, todo vuelve a la normalidad.

### Normas de la comunidad
- Página "Normas de la comunidad" (corta, en lenguaje simple), enlazada en: el onboarding (junto con los términos, spec 01), la pantalla de reporte y el aviso de advertencia.
- Contenido mínimo: respeto, nada de acoso, solo mayores de 18, nada de contenido sexual, nada de spam o venta, encuentros en lugares públicos, cómo reportar.

---

## 3. Criterios de aceptación

**Bloquear**
- [ ] AC-01: Se puede bloquear desde el perfil, desde un mensaje y desde una lista de miembros.
- [ ] AC-02: Después de bloquear, se cumplen todos los criterios de bloqueo pendientes de las specs 01 a 05 (spec 01 AC-18, spec 03 AC-12, spec 04 AC-22 y AC-23, spec 05 AC-03).
- [ ] AC-03: Los efectos se cumplen también para el bloqueado respecto de quien lo bloqueó.
- [ ] AC-04: El bloqueado no recibe ninguna notificación ni ve ningún cambio que le indique que fue bloqueado, más allá de dejar de ver al otro.
- [ ] AC-05: Si el creador de un grupo bloquea a un miembro, se le ofrece expulsarlo; si no acepta, el miembro sigue en el grupo.
- [ ] AC-06: Desbloquear desde Ajustes → Bloqueados restaura perfil, mensajes, grupos y planes visibles.
- [ ] AC-07: Un usuario no puede ver la lista de bloqueados de otro ni saber quién lo bloqueó (ni por API).

**Reportar**
- [ ] AC-08: Se puede reportar un usuario, un grupo, un plan y un mensaje desde los lugares indicados.
- [ ] AC-09: "Otro" sin texto no se puede enviar.
- [ ] AC-10: "Me siento en peligro" muestra el 911 con botón de llamada antes de enviar.
- [ ] AC-11: Al reportar un mensaje se ofrece bloquear a su autor.
- [ ] AC-12: Si el mensaje reportado se borra después, el reporte conserva su texto.
- [ ] AC-13: Reportar dos veces lo mismo con el primer reporte abierto no crea un segundo reporte.
- [ ] AC-14: El reporte número 11 en un día es rechazado.
- [ ] AC-15: El reportado no puede ver los reportes sobre él ni quién los hizo (ni por API).

**Ocultar automáticamente**
- [ ] AC-16: Un mensaje con reportes de 3 usuarios distintos queda oculto para todos; 3 reportes del mismo usuario no lo ocultan.
- [ ] AC-17: Un grupo con reportes de 3 usuarios distintos sale de Descubrir pero sus miembros lo siguen viendo.
- [ ] AC-18: Al descartar el reporte, el contenido oculto vuelve a verse.

**Moderación**
- [ ] AC-19: Cada reporte nuevo genera una alerta de Telegram en menos de 1 minuto, con 🚨 si es urgente.
- [ ] AC-20: El moderador puede ejecutar cada acción de la tabla, y queda registrada en el reporte.
- [ ] AC-21: Solo un administrador puede ejecutar acciones de moderación (ni por API un usuario común).
- [ ] AC-22: Un usuario suspendido 7 días ve el aviso con fecha y motivo, y no puede usar la app hasta que vence.
- [ ] AC-23: Un suspendido no aparece en listas de miembros ni participantes mientras dura la suspensión.
- [ ] AC-24: Un suspendido permanentemente no puede volver a registrarse con el mismo email.
- [ ] AC-25: Un usuario advertido ve el aviso una vez al abrir la app.

---

## 4. Datos y permisos

**Tablas**

`blocks` (ver doc 04), con `created_at`.

`reports` (ver doc 04), con cambios:
- `reason`: `danger | harassment | underage | sexual_violent | impersonation | spam | other`.
- `priority`: `urgent | high | normal` (se calcula del motivo).
- `snapshot` (jsonb): copia del contenido reportado.
- `status`: `open | dismissed | actioned`.
- `resolved_by`, `resolved_at`, `resolution` (acción tomada), `resolution_note`.

Tablas nuevas:
```text
admins
- user_id                          -- quién puede moderar

banned_emails
- email_hash                       -- para impedir re-registro tras suspensión permanente

user_warnings
- id, user_id, reason, created_at, seen_at
```

Cambios en tablas existentes:
- `profiles.suspended_until` (timestamptz, null; fecha lejana = permanente), `profiles.suspension_reason`.
- `messages.hidden_at`, `groups.hidden_at`, `plans.hidden_at`: ocultos automáticamente.

**Funciones en la base**
- `is_blocked(a, b)`: true si hay bloqueo en cualquier dirección. **La usan todas las políticas RLS** de las specs 01 a 05.
- `block_user(id)`, `unblock_user(id)`.
- `create_report(target_type, target_id, reason, details)`: valida duplicado y límite diario, guarda la copia, calcula prioridad, aplica el ocultamiento automático y encola la alerta.
- `admin_dismiss`, `admin_delete_message`, `admin_delete_group`, `admin_cancel_plan`, `admin_warn`, `admin_suspend(user, days | permanent, reason)`: solo para `admins`.

**Alertas**: la cola `notification_outbox` (spec 05) tiene un tipo más, `moderation_alert`, que la Edge Function manda al bot de Telegram en vez de por push.

**Permisos (RLS)**
- `blocks`: cada uno ve y gestiona solo los que hizo.
- `reports`: cada uno puede crear (por la función) pero **no leer** reportes, ni los propios. Solo `admins` leen.
- `admins`, `banned_emails`: sin acceso desde la app.
- Un usuario suspendido no pasa ninguna política RLS, salvo leer su propio perfil (para ver el aviso).

---

## 5. Pantallas

```text
Perfil de otro / mensaje / lista de miembros
 └─► Bloquear ─► Confirmación ─► (si sos creador) "¿También querés sacarlo?"

Menú ··· / mantener apretado ─► Reportar
 └─► Motivo ─► (si es peligro: aviso 911) ─► Comentario ─► Enviar
       └─► "Gracias…" + [Bloquear a esta persona] (usuarios y mensajes)

Perfil ─► Ajustes ─► Bloqueados ─► [Desbloquear]
                 └─► Normas de la comunidad

App abierta por suspendido ─► Pantalla de suspensión (fecha, motivo, email)
App abierta con advertencia ─► Aviso con motivo y link a las normas
```

---

## 6. Decisiones tomadas (2026-10-05)

- [x] Motivo **"Me siento en peligro"** con el 911.
- [x] **Ocultamiento automático** con reportes de 3 usuarios distintos.
- [x] Alertas de moderación por **Telegram**.
- [x] El **bloqueo no expulsa**; al creador se le ofrece hacerlo.
- [x] Suspensiones de **1, 7 o 30 días**, o permanente.
