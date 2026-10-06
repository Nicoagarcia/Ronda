# Ronda — Checklist para la beta (Hito 7)

> Lo que falta para pasar de "anda en mi PC" a "lo prueban 100–300 personas en La Plata".
> Marcar a medida que se hace. Lo que ya está listo en el código está tachado en la sección 0.

---

## 0. Ya hecho en el código

- [x] ~~Las 6 specs del v0 implementadas y con tests (base, app, concurrencia, tiempo real, moderación)~~
- [x] ~~Ícono y pantalla de inicio (`scripts/brand/make-icons.py`)~~
- [x] ~~Borradores de términos y privacidad (`docs/legal/`)~~
- [x] ~~Sentry y PostHog conectados, se activan con sus claves~~
- [x] ~~Métricas semanales en la base (`metrics_weekly`)~~
- [x] ~~Script de grupos semilla (`supabase/scripts/grupos-semilla.sql`)~~

---

## 1. Identidad de la app (bloquea todo lo demás)

- [ ] **Dominio**: intentar `ronda.com.ar` (vence el 8/10/2026). Plan B: `rondaapp.com.ar`.
- [ ] **Nombre del paquete de Android**, definitivo: `ar.com.ronda` (o el que corresponda). Cambiarlo en `app.json` → `android.package` y `ios.bundleIdentifier`. **No se puede cambiar después de publicar.**
- [ ] Email de contacto (ej. `hola@ronda.com.ar`). Reemplazar `SUPPORT_EMAIL` en `src/app/suspended.tsx`.

## 2. Supabase en la nube

- [ ] Crear el proyecto. Región **São Paulo (sa-east-1)**, la más cercana. Plan **Pro** durante la beta (el gratis se pausa si no hay actividad y no tiene backups diarios).
- [ ] `supabase link --project-ref <ref>` y `supabase db push` para aplicar las migraciones. **Nunca** cambiar tablas a mano desde el dashboard.
- [ ] Extensiones: verificar que estén activas `pg_cron` y `pg_net` (las crea la migración; si falla, activarlas desde Database → Extensions).
- [ ] **Secretos de Vault** para el despacho de notificaciones (editor SQL):
  ```sql
  select vault.create_secret('https://<ref>.supabase.co', 'project_url');
  select vault.create_secret('<service_role key del proyecto>', 'service_role_key');
  ```
- [ ] Desplegar funciones: `supabase functions deploy delete-account` y `supabase functions deploy send-push --no-verify-jwt`.
- [ ] Secretos de funciones: `supabase secrets set TELEGRAM_BOT_TOKEN=… TELEGRAM_CHAT_ID=… EXPO_ACCESS_TOKEN=…`.
- [ ] **Auth**:
  - [ ] Copiar la config local (`supabase/config.toml`): contraseña mínima 8, confirmación de email, plantillas de mail en español (`supabase/templates/`).
  - [ ] **SMTP propio** (ej. Resend, con el dominio). El SMTP que trae Supabase tiene un límite muy bajo de mails por hora y no sirve para usuarios reales.
  - [ ] Proveedor Google (ver sección 4).
- [ ] Cargar el moderador: `insert into admins (user_id) values ('<id de tu cuenta>');` (opcional: también se modera desde el editor SQL).
- [ ] Correr `supabase/scripts/grupos-semilla.sql` con el email de la cuenta oficial.

## 3. Expo / EAS y app de desarrollo

- [ ] Cuenta en expo.dev. `eas login` y `eas init` (agrega el `projectId` a `app.json`).
- [ ] `eas build --profile development --platform android` e instalar en el celular.
- [ ] Variables de entorno de EAS (`eas env:create`) para `preview` y `production`:
  `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_POSTHOG_KEY`.

## 4. Login con Google (cierra el Hito 1)

- [ ] Proyecto en Google Cloud. Pantalla de consentimiento OAuth (nombre "Ronda", dominio, privacidad).
- [ ] Credenciales OAuth: un cliente **Web** (para Supabase) y clientes **Android** con la huella SHA-1 de:
  - [ ] la firma de desarrollo de EAS (`eas credentials`),
  - [ ] la firma de producción de EAS,
  - [ ] la firma de Google Play (Play Console → Integridad de la app), después de la primera subida.
- [ ] Cargar el cliente Web en Supabase → Auth → Google.
- [ ] Código: `@react-native-google-signin/google-signin` + `signInWithIdToken` (spec 01). Habilitar el botón en `welcome.tsx`.

## 5. Notificaciones en el celular (cierra el Hito 5)

- [ ] Proyecto en Firebase (puede ser el mismo de Google Cloud). Agregar la app Android con el nombre del paquete y descargar `google-services.json`.
- [ ] Subir la clave de cuenta de servicio de FCM V1 a EAS (`eas credentials` → Push Notifications).
- [ ] Código (spec 05):
  - [ ] `expo-notifications` y canales de Android: Mensajes, Planes, Grupos.
  - [ ] Pantalla previa al permiso al unirse o crear el primer grupo o plan, con "Ahora no" por 7 días.
  - [ ] Registrar el token al iniciar sesión y borrarlo al cerrar sesión.
  - [ ] Al tocar una notificación, abrir `data.path`; si ya no hay acceso, ir a Lo mío.
  - [ ] Con la app abierta: no mostrar la del chat abierto y mostrar un banner interno para el resto.
- [ ] Probar los 10 tipos en el celular (checklist de la spec 05).

## 6. Web mínima (la exige Google Play)

- [ ] Página de **política de privacidad** (de `docs/legal/privacidad.md`, revisada por un abogado).
- [ ] Página de **términos** (de `docs/legal/terminos.md`).
- [ ] Página para **pedir la eliminación de la cuenta** sin la app (formulario o instrucciones + email).
- [ ] Reemplazar los links en la app (`TermsStep` del onboarding y Ajustes).

## 7. Legal

- [ ] Revisión de términos y privacidad por un abogado. Completar los campos entre corchetes.
- [ ] Consultar sobre la inscripción de la base de datos ante la AAIP (Ley 25.326).

## 8. Monitoreo

- [ ] Cuenta de **Sentry**, proyecto React Native. DSN en EAS. Configurar `organization` y `project` en el plugin de `app.json` y `SENTRY_AUTH_TOKEN` en EAS; después sacar `SENTRY_DISABLE_AUTO_UPLOAD` de `eas.json`.
- [ ] Cuenta de **PostHog**. Clave en EAS. Armar un panel con los eventos de `src/lib/analytics.ts`.
- [ ] Bot de **Telegram** para alertas de moderación (README, sección Moderación).

## 9. Google Play

- [ ] Cuenta de desarrollador (USD 25).
- [ ] Ficha de la app: nombre "Ronda: planes y grupos", descripción corta y larga, capturas, ícono 512 px (`assets/images/icon.png`), imagen destacada 1024×500.
- [ ] Formulario de **seguridad de los datos** (coincidir con la política de privacidad).
- [ ] Clasificación de contenido (app social con contenido de usuarios, 18+).
- [ ] Declarar la página de eliminación de cuenta.
- [ ] `eas build --profile production --platform android` y subir el AAB a **prueba cerrada**.
- [ ] Prueba cerrada: cuentas personales nuevas necesitan un mínimo de testers durante 14 días antes de publicar (hoy 12; verificar). Invitar a la beta de La Plata.

## 10. Lanzamiento de la beta en La Plata

- [ ] Cuenta oficial de Ronda y grupos semilla creados.
- [ ] 10–15 personas que muevan los grupos semilla los primeros días (doc 03, "Estrategia de crecimiento").
- [ ] Mirar `metrics_weekly` cada lunes.
