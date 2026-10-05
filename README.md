# Ronda

> Menos matches. Más planes.

App mobile (Android primero) para conocer gente a través de grupos y planes. Expo + Supabase.

- Producto y decisiones: [`docs/`](docs/)
- Specs del v0 (qué hace cada funcionalidad y sus criterios de aceptación): [`docs/specs/`](docs/specs/)
- Plan técnico e hitos: [`docs/05-plan-tecnico.md`](docs/05-plan-tecnico.md)

## Requisitos

- Node 20+, Docker, [Supabase CLI](https://supabase.com/docs/guides/cli), [EAS CLI](https://docs.expo.dev/eas/)
- Un celular Android con la *development build* instalada (ver abajo)

## Arrancar

```bash
npm install
npm run db:start            # Supabase local en Docker (Studio: http://localhost:54323)
cp .env.example .env.local  # completar con la IP de tu PC y la clave "Publishable" que muestra db:start
npm start                   # Metro; abrir desde la development build en el celular
```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm start` | Servidor de desarrollo (Metro) |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |
| `npm run db:start` | Levanta Supabase local |
| `npm run db:reset` | Recrea la base local aplicando migraciones y `seed.sql` |
| `npm run db:test` | Tests de la base (pgTAP) |
| `npm run db:types` | Regenera `src/types/database.ts` desde la base local |
| `npm run functions:serve` | Sirve las Edge Functions locales (ej. eliminar cuenta) |
| `npm test` | Tests de la lógica de la app (Jest) |
| `npm run start:go` | Metro para abrir con Expo Go (mientras no haya development build) |

Los mails locales (códigos de registro y de contraseña) se ven en http://localhost:54324.

`npm run db:reset` carga datos de prueba (`supabase/seed.sql`): 8 grupos y 6 planes en La Plata, y 3 usuarios demo
(`ana@demo.ronda`, `beto@demo.ronda`, `caro@demo.ronda`, contraseña `ronda1234`).

| `npm run test:realtime` | Prueba que el chat en vivo llegue a quien corresponde y a nadie más (spec 04). |
| `npm run test:concurrency` | Prueba que dos personas no ocupen el último lugar de un grupo o plan (spec 02 AC-12, spec 03 AC-14) |

## Development build

El login con Google y otras librerías nativas no funcionan en Expo Go. Hace falta una app de desarrollo propia:

```bash
eas login
eas build --profile development --platform android
```

Al terminar, EAS da un link o QR para instalar el APK en el celular. Se rehace solo cuando se agrega una librería nativa.

## Reglas del código

1. Las reglas de negocio las hace cumplir la base (RLS + funciones). La app no escribe tablas de membresías, planes, mensajes ni reportes directamente.
2. Pantalla → hook (`src/features/*`) → `src/services/` → Supabase. Solo `src/services/` importa el cliente de Supabase.
3. Cada criterio "ni por API" de las specs tiene su test en `supabase/tests/`.

## Problemas comunes en local

- **Las Edge Functions responden 502** después de `db:reset` o de cortar `functions:serve`: `docker restart supabase_kong_ronda`.
- **Notificaciones**: la cola (`notification_outbox`) se despacha sola (pg_cron cada minuto y al encolar). Para ver qué se mandó:
  `psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "select type, title, body, error from notification_outbox order by id desc limit 20"`.
  Expo Go no recibe push en Android: para verlas en el celular hace falta la development build.
