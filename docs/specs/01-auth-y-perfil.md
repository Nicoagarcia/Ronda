# Spec 01 — Auth y perfil

> Estado: **aprobada** · Depende de: nada · Base: `04-decisiones-y-mvp-v0.md`

---

## 1. Qué hace

- Como **persona nueva**, quiero registrarme con Google en pocos segundos para empezar a usar Ronda.
- Como **persona sin Google**, quiero registrarme con email y contraseña.
- Como **usuario nuevo**, quiero completar mi perfil (nombre, edad, foto, ciudad, intereses) para que otros sepan quién soy y qué me gusta.
- Como **usuario**, quiero editar mi perfil cuando cambie algo.
- Como **usuario**, quiero ver el perfil de otra persona con el nivel de detalle que corresponde.
- Como **usuario**, quiero cerrar sesión y eliminar mi cuenta cuando quiera.

---

## 2. Reglas

### Registro e ingreso
- Métodos: **Google** (principal) y **email + contraseña** (respaldo).
- Con email: hay que confirmar el email antes de entrar.
- Contraseña: mínimo 8 caracteres.
- Recuperar contraseña por email.
- Si alguien entra con Google y ya tenía cuenta con ese mismo email, es la misma cuenta.
- La sesión queda guardada: al abrir la app no hay que volver a loguearse.

### Onboarding
Pasos en orden; no se puede usar la app hasta terminarlo:

1. **Nombre**: 2–30 caracteres. Si viene de Google, se precarga.
2. **Fecha de nacimiento**: se valida **18+**. Si es menor, se muestra "Ronda es para mayores de 18" y no puede continuar.
3. **Foto** (**obligatoria**): se precarga la de Google si hay. Se puede recortar. Sin foto no se puede continuar.
4. **Ciudad**: en v0 solo **La Plata**. Otras se muestran como "Próximamente".
5. **Intereses**: elegir entre **3 y 10**.
6. **Aceptar** términos y política de privacidad.

Si cierra la app a mitad del onboarding, al volver sigue desde el paso donde quedó.

### Perfil propio
- Editable: nombre, foto, ciudad, intereses, bio (opcional, hasta 300 caracteres).
- La foto se puede **cambiar** pero no quitar: siempre tiene que haber una.
- **La fecha de nacimiento no se puede editar** después del onboarding (evita que un menor la cambie). Si hay un error, se pide por soporte.
- Muestra cantidad de grupos y planes (se completa en specs 02 y 03).

### Perfil de otra persona

| Quién mira | Qué ve |
|---|---|
| Sin grupos ni planes en común | Nombre, foto, edad exacta en años ("23"), ciudad, intereses |
| Comparte al menos un grupo o plan | Lo anterior + bio, grupos y planes en los que participa* |
| Bloqueado (en cualquier dirección) | "Perfil no disponible" |

\* Los grupos y planes de la otra persona se muestran solo si **vos también podrías verlos** (no se filtra la existencia de grupos con aprobación de los que no sos miembro).

- Nunca se muestra la fecha de nacimiento ni el email.
- Desde el perfil de otro: **Reportar** y **Bloquear** (implementación en spec 06).

### Cerrar sesión y eliminar cuenta
- **Cerrar sesión**: desde Perfil → Ajustes.
- **Eliminar cuenta**: desde Perfil → Ajustes, con confirmación escribiendo "ELIMINAR".
  - Se borra: perfil, foto, intereses, tokens de push.
  - Los grupos que creó se eliminan; los planes que creó se cancelan (se avisa a los participantes).
  - Sus mensajes quedan como **"Usuario eliminado"** para que los chats no pierdan sentido.
  - El email queda libre para registrarse de nuevo.
- Además, una **página web** para pedir la eliminación sin la app (requisito de Google Play).

---

## 3. Criterios de aceptación

**Registro e ingreso**
- [ ] AC-01: Con Google, un usuario nuevo llega al paso 1 del onboarding con el nombre precargado.
- [ ] AC-02: Con email, no puede entrar hasta confirmar el email.
- [ ] AC-03: "Olvidé mi contraseña" envía un email y permite definir una nueva.
- [ ] AC-04: Al cerrar y reabrir la app, el usuario sigue logueado.
- [ ] AC-05: Un usuario con perfil completo entra directo a Descubrir, sin pasar por el onboarding.

**Onboarding**
- [ ] AC-06: Con fecha de nacimiento de alguien de 17 años y 364 días, no se puede continuar.
- [ ] AC-07: Con exactamente 18 años cumplidos hoy, sí se puede continuar.
- [ ] AC-08: La validación de 18+ también existe en la base de datos: insertar un perfil de menor directo por API falla.
- [ ] AC-09: No se puede avanzar con menos de 3 intereses ni elegir más de 10.
- [ ] AC-10: Si se cierra la app en el paso 4, al reabrir continúa en el paso 4 con lo cargado antes.
- [ ] AC-11: Sin aceptar términos no se puede terminar.
- [ ] AC-11b: Sin foto no se puede pasar del paso 3; y un perfil sin foto no puede marcarse como completo en la base.

**Perfil**
- [ ] AC-12: Los cambios de nombre, foto, ciudad, intereses y bio se guardan y se ven al reabrir.
- [ ] AC-13: La fecha de nacimiento no aparece como editable, y actualizarla por API falla.
- [ ] AC-14: Un usuario no puede modificar el perfil de otro (ni por API).
- [ ] AC-15: Una foto de más de 10 MB se rechaza; las válidas se comprimen antes de subir.
- [ ] AC-15b: En Editar perfil no existe la opción de quitar la foto, solo de cambiarla.

**Perfil de otra persona**
- [ ] AC-16: Sin nada en común, solo se ven nombre, foto, edad, ciudad e intereses. La bio no llega a la app (no solo está oculta: la consulta no la devuelve).
- [ ] AC-17: Con un grupo o plan en común, se ven bio, grupos y planes. *(Verificable cuando estén las specs 02 y 03.)*
- [ ] AC-18: Con bloqueo en cualquier dirección, se ve "Perfil no disponible". *(Verificable con la spec 06.)*

**Cuenta**
- [ ] AC-19: Cerrar sesión vuelve a la pantalla de login y borra el token de push del dispositivo.
- [ ] AC-20: Eliminar cuenta sin escribir "ELIMINAR" no hace nada.
- [ ] AC-21: Después de eliminar, el usuario no puede volver a entrar con esa sesión, y sus mensajes figuran como "Usuario eliminado".
- [ ] AC-22: Después de eliminar, se puede crear una cuenta nueva con el mismo email.

---

## 4. Datos y permisos

**Tablas** (ver doc 04): `profiles`, `cities`, `interests`, `profile_interests`.

Campos agregados respecto del doc 04:
- ~~`profiles.onboarding_step`~~ → **no hace falta**: el paso se deduce de lo que ya está cargado (nombre, nacimiento, foto, ciudad, intereses). Mismo resultado para AC-10, sin un dato más que mantener. Se agrega `onboarding_completed_at`.
- `profiles.terms_accepted_at` (timestamptz).

**Storage**: bucket `avatars`, una carpeta por usuario (`avatars/<user_id>/...`).

**Permisos (RLS)**
- `profiles`: cada uno lee y edita solo su fila completa. El perfil de otros se lee con una función `get_profile(id)` que aplica la tabla de visibilidad de la sección 2.
- `birthdate`: se valida 18+ con un `CHECK`/trigger en la base y no se puede modificar después de creada.
- `cities` e `interests`: lectura pública, sin escritura desde la app.
- `profile_interests`: cada uno gestiona solo los suyos; máximo 10 (validado en la base).
- `avatars`: cada uno sube y borra solo en su carpeta; lectura pública.

**Eliminación de cuenta**: función en el servidor (Edge Function) que borra el usuario de Auth y ejecuta la limpieza de la sección 2.

---

## 5. Pantallas

```text
Bienvenida ─► [Continuar con Google] / [Usar email]
                                          ├─► Ingresar
                                          ├─► Crear cuenta ─► "Revisá tu email"
                                          └─► Olvidé mi contraseña

Onboarding: Nombre ─► Nacimiento ─► Foto ─► Ciudad ─► Intereses ─► Términos ─► Descubrir

Perfil (tab) ─► Editar perfil
             └─► Ajustes ─► Cerrar sesión · Bloqueados (spec 06) · Eliminar cuenta

Perfil de otro ─► Reportar · Bloquear
```

---

## 6. Notas técnicas

- Login con Google nativo (`@react-native-google-signin/google-signin` + `supabase.auth.signInWithIdToken`). Requiere **development build**: no funciona en Expo Go.
- Intereses iniciales: lista cerrada cargada por migración (ver sección 8). La tabla `interests` suma la columna `section` para agruparlos en la pantalla.
- Edad en años calculada en la base, para no exponer `birthdate`.

---

## 7. Decisiones tomadas

- [x] Foto **obligatoria** (2026-10-05).
- [x] Se muestra la **edad exacta** en años (2026-10-05).
- [x] Lista de intereses aprobada (2026-10-05).

---

## 8. Intereses iniciales

Sirven para el perfil **y** como categorías de grupos y planes. Por eso hay algunos que funcionan más como actividad que como gusto ("Estudiar juntos", "Nuevo en la ciudad").

**Deportes y movimiento**
⚽ Fútbol · 🏃 Running · 🏋️ Gym · 🛼 Patinaje · 🛹 Skate · 🚴 Ciclismo · 🥾 Trekking · 🏐 Vóley · 🏀 Básquet · 🎾 Tenis y pádel · 🧘 Yoga · 🏊 Natación

**Estudio y aprendizaje**
📚 Estudiar juntos · 🗣️ Idiomas · 💻 Programación · 🚀 Emprender

**Arte y cultura**
🎵 Música · 🎤 Recitales · 🎬 Cine · 🎭 Teatro · 📷 Fotografía · 🎨 Arte y dibujo · 📖 Lectura

**Juegos**
🎮 Gaming · 🎲 Juegos de mesa · 📺 Anime y series

**Salidas**
☕ Café · 🧉 Mate · 🍔 Comer afuera · 🍳 Cocina · 🍻 Bares · 💃 Bailar

**Comunidad**
🏙️ Nuevo en la ciudad · 🤝 Voluntariado · 🐶 Mascotas · ✈️ Viajes

Total: 36.
