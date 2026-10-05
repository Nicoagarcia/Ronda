# App Social de Grupos y Planes — Producto y MVP

## 1. Concepto

La aplicación busca ayudar a personas que llegan a una ciudad nueva o quieren ampliar su círculo social a **conocer gente a través de grupos y actividades**, evitando el modelo tradicional de matching de las apps de citas.

### Propuesta de valor

> **Menos matches. Más planes.**

El usuario no entra principalmente a buscar personas para hacer match. Entra para:

- Encontrar grupos.
- Crear grupos.
- Encontrar planes.
- Crear planes.
- Participar en chats vinculados a grupos y planes.
- Conocer personas como consecuencia de compartir actividades.

---

## 2. Público inicial

El primer público objetivo puede ser:

- Estudiantes universitarios.
- Personas que se mudaron recientemente.
- Jóvenes de 18–30 años.
- Personas que quieren comenzar una actividad.
- Personas que quieren ampliar su círculo social.

El producto no debe quedar limitado a estudiantes.

Ejemplos de comunidades:

- Estudiantes de Psicología — 1° año.
- Estudiantes de una determinada universidad.
- Gente que patina en La Plata.
- Sureños viviendo en La Plata.
- Running.
- Gaming.
- Fútbol.
- Fotografía.
- Programación.
- Personas nuevas en la ciudad.

---

# 3. Dos objetos principales

## 3.1. Grupos

Un grupo es una comunidad creada por un usuario.

El creador decide:

- Nombre.
- Descripción.
- Imagen.
- Categoría.
- Ubicación.
- Cantidad máxima de miembros.
- Privacidad.
- Reglas de ingreso.

El tamaño es completamente configurable.

Ejemplos:

> **Psicología 1° año**
>
> Máximo: 20 personas.

> **Patinadores de La Plata**
>
> Máximo: 100 personas.

> **Fútbol 5**
>
> Máximo: 10 personas.

No se deben imponer categorías rígidas. Las categorías solamente ayudan a descubrir contenido.

---

## 3.2. Planes

Un plan representa una actividad puntual.

Ejemplos:

- Patinar el sábado.
- Jugar fútbol.
- Ir al cine.
- Estudiar juntos.
- Salir a comer.
- Ir a un recital.
- Hacer trekking.
- Tomar un café.
- Entrenar.

Un plan tiene:

- Título.
- Descripción.
- Ubicación.
- Fecha.
- Hora.
- Capacidad máxima.
- Creador.
- Grupo asociado opcionalmente.

Un plan puede existir:

1. Independientemente.
2. Dentro de un grupo.

---

# 4. Relación entre grupos y planes

Esta relación es central.

```text
Grupo
  │
  ├── Chat
  │
  ├── Miembros
  │
  └── Planes
        │
        └── Chat del plan
```

Ejemplo:

**Grupo: Patinadores de La Plata**

Alguien crea:

> 🛼 Patinar en el Bosque
>
> Sábado 18:00
>
> 5/10 personas.

Las personas pueden entrar al plan y conversar en su chat.

La aplicación permite que una persona conozca gente mediante una actividad concreta.

---

# 5. Perfil

El perfil no debe imitar a Tinder.

No utilizar:

- Like.
- Dislike.
- Swipe.
- Match.
- Ranking de atractivo.

El perfil muestra contexto social:

- Nombre.
- Foto.
- Ciudad.
- Intereses.
- Grupos.
- Planes en los que participa.

Ejemplo:

> **Nicolás**
>
> 📍 La Plata
>
> 🎓 Tecnología
>
> 🏋️ Gym · 🎮 Gaming · 🛼 Patinar
>
> Grupos: 5
>
> Planes: 12

---

# 6. Pantalla principal

La pantalla principal puede dividirse en:

```text
DESCUBRIR

[ PLANES ] [ GRUPOS ]

Cerca tuyo

🛼 Patinar sábado
5/8 personas

🎓 Psicología 1° año
32/50 miembros

⚽ Fútbol
8/10 personas
```

La navegación debe priorizar contenido y actividades, no perfiles.

---

# 7. MVP

El MVP debe responder:

> ¿Las personas realmente quieren usar una aplicación para encontrar grupos y hacer planes con gente nueva?

## Funcionalidades

### Autenticación

- Registro.
- Login.
- Google / Apple.
- Recuperación de cuenta.

### Perfil

- Nombre.
- Edad.
- Foto.
- Ciudad.
- Intereses.

### Descubrir

- Buscar grupos.
- Buscar planes.
- Filtros básicos.
- Ubicación.

### Grupos

- Crear grupo.
- Editar grupo.
- Unirse.
- Salirse.
- Solicitar ingreso.
- Ver miembros.
- Chat.

### Planes

- Crear plan.
- Editar plan.
- Cancelar plan.
- Unirse.
- Salirse.
- Ver participantes.
- Chat.

### Notificaciones

- Nuevo mensaje.
- Solicitud de ingreso.
- Aceptación.
- Nuevo plan.
- Recordatorio de plan.

### Seguridad

- Bloquear usuario.
- Reportar usuario.
- Reportar grupo.
- Reportar plan.
- Reportar mensaje.

---

# 8. Fuera del MVP

No desarrollar inicialmente:

- Matching.
- Videollamadas.
- Stories.
- Reels.
- IA.
- Gamificación compleja.
- Sistema de reputación avanzado.
- Eventos pagos.
- Geolocalización en tiempo real.
- Algoritmo sofisticado de recomendaciones.
- Publicidad avanzada.
- Suscripciones.

El MVP debe concentrarse en:

> **Grupos + Planes + Chat.**

---

# 9. Principio de diseño

La aplicación debe favorecer:

> **Actividad → interacción → vínculo**

en lugar de:

> **Perfil → atractivo → match → conversación**

Ese principio diferencia al producto de las aplicaciones de citas.
