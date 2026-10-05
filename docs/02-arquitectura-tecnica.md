# App Social de Grupos y Planes — Arquitectura Técnica

## 1. Objetivo técnico

Construir una aplicación mobile multiplataforma, inicialmente con Android e iOS, utilizando una arquitectura simple y escalable.

Para el MVP no se recomienda utilizar microservicios.

Se recomienda un **monolito modular**.

---

# 2. Stack

| Área | Tecnología |
|---|---|
| Mobile | React Native + Expo |
| Lenguaje | TypeScript |
| Backend | NestJS |
| Base de datos | PostgreSQL |
| ORM | Prisma |
| Cache / infraestructura temporal | Redis |
| Auth | Supabase Auth o Clerk |
| Chat | Supabase Realtime inicialmente |
| Storage | Supabase Storage |
| Push notifications | Expo Notifications / FCM |
| Mapas | Google Maps o Mapbox |
| Analytics | PostHog |
| Errores | Sentry |
| Diseño | Figma |
| CI/CD Mobile | EAS |

La infraestructura debe mantenerse simple durante la validación.

---

# 3. Arquitectura general

```text
                    React Native
                         │
                         │ HTTPS
                         ▼
                  ┌──────────────┐
                  │    NestJS    │
                  │     API      │
                  └──────┬───────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
     PostgreSQL        Redis       Servicios externos
                                      │
                         ┌────────────┼────────────┐
                         ▼            ▼            ▼
                       Auth         Chat        Storage
```

---

# 4. Backend

El backend puede organizarse por dominios:

```text
src/
├── auth/
├── users/
├── groups/
├── plans/
├── chats/
├── notifications/
├── moderation/
├── reports/
└── common/
```

Cada módulo debe contener sus propios:

- Controllers.
- Services.
- DTOs.
- Validaciones.
- Repositories / acceso a datos.

---

# 5. Mobile

Estructura sugerida:

```text
src/
├── app/
├── features/
│   ├── auth/
│   ├── groups/
│   ├── plans/
│   ├── chat/
│   ├── profile/
│   └── notifications/
├── components/
├── services/
├── hooks/
└── utils/
```

La aplicación debe organizarse por funcionalidades, evitando un directorio gigante de componentes genéricos.

---

# 6. Modelo de datos

Entidades principales:

```text
users
profiles
interests

groups
group_members

plans
plan_members

chats
chat_members
messages

notifications

reports
blocks
```

Posteriormente:

```text
subscriptions
payments
advertisements
```

---

# 7. Relaciones principales

```text
User
 │
 ├── Profile
 │
 ├── GroupMembership
 │       └── Group
 │
 ├── PlanMembership
 │       └── Plan
 │
 └── Messages

Group
 │
 ├── Members
 ├── Chat
 └── Plans

Plan
 │
 ├── Members
 └── Chat
```

---

# 8. Grupos

Un grupo debería tener conceptualmente:

```text
Group
- id
- name
- description
- image
- category
- location
- maxMembers
- privacy
- approvalMode
- ownerId
- createdAt
- updatedAt
```

La capacidad debe ser configurable.

Ejemplos:

- 4.
- 8.
- 20.
- 50.
- 100.
- etc.

---

# 9. Planes

```text
Plan
- id
- title
- description
- location
- date
- startTime
- maxParticipants
- creatorId
- groupId (nullable)
- status
- createdAt
- updatedAt
```

`groupId` puede ser nulo para permitir planes independientes.

---

# 10. Chat

Existen dos tipos principales:

### Chat de grupo

Una conversación permanente asociada a un grupo.

### Chat de plan

Una conversación temporal asociada a una actividad.

Ejemplo:

```text
Grupo:
Patinadores de La Plata

        ↓

Plan:
Patinar sábado

        ↓

Chat:
"¿Quién lleva patines extra?"
```

No conviene desarrollar un sistema de mensajería desde cero en la primera versión si un servicio externo permite validar rápidamente el producto.

---

# 11. Seguridad

Como se trata de una aplicación donde desconocidos pueden encontrarse, la seguridad debe ser parte del MVP.

Mínimo:

- Reportes.
- Bloqueos.
- Moderación.
- Límites de frecuencia.
- Validación de contenido.
- Eliminación de cuentas.
- Política de privacidad.
- Términos y condiciones.

Posteriormente:

- Moderación automática.
- Detección de spam.
- Detección de comportamiento abusivo.
- Verificación opcional.

---

# 12. Ubicación

No es necesario utilizar ubicación GPS permanente.

Para el MVP alcanza con:

- Ciudad.
- Barrio / zona.
- Ubicación aproximada del plan.

La ubicación exacta debe manejarse con cuidado por privacidad.

Ejemplo:

> 📍 Parque Saavedra

en lugar de mostrar necesariamente la ubicación exacta de una persona.

---

# 13. Escalabilidad

Inicialmente:

```text
1 Backend
1 PostgreSQL
1 Redis
1 Storage
```

Si el producto crece:

```text
Load Balancer
      │
 ┌────┼────┐
 ▼    ▼    ▼
API  API   API
 │
 ▼
PostgreSQL
 │
 ▼
Redis
```

No hace falta construir esto antes de tener usuarios reales.

---

# 14. Principio arquitectónico

La prioridad técnica debe ser:

> **Simple de desarrollar → fácil de mantener → preparada para crecer.**

No construir infraestructura para millones de usuarios cuando todavía se está validando si 100 personas quieren usar el producto.
