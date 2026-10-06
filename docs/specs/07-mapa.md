# Spec 07 — Mapa

> Estado: **borrador** (idea del 2026-10-06) · Depende de: specs 01 a 03 · Base: `04-decisiones-y-mvp-v0.md`
>
> Cambia una decisión del doc 04 ("Mapas: descartado para el MVP"). Falta decidir si entra antes de la beta o después (sección 7).

---

## 1. Qué hace

- Como **usuario**, quiero ver en un mapa los planes que hay cerca mío para elegir a cuál sumarme.
- Como **usuario**, quiero que el mapa arranque en mi ubicación actual y poder **ampliar o achicar** el radio de búsqueda.
- Como **creador de un plan**, quiero marcar en el mapa dónde es el plan y elegir **si se muestra en el mapa** o no.

---

## 2. Reglas

### Mi ubicación
- Se pide permiso de ubicación **solo al abrir el mapa por primera vez**, con una pantalla previa que explica para qué ("Para mostrarte planes cerca tuyo").
- Solo ubicación **mientras se usa la app**. Nunca en segundo plano.
- **La ubicación del usuario no se guarda en el servidor ni se comparte con nadie.** Se usa en el celular para centrar el mapa y se manda solo como parámetro de la búsqueda.
- Sin permiso: el mapa se centra en el centro de su ciudad (Plaza Moreno para La Plata) y funciona igual.

### Radio de búsqueda
- Por defecto **3 km**. Se puede elegir 1, 3, 5, 10 o 20 km.
- El radio elegido se recuerda en el celular.
- Al mover el mapa aparece "Buscar en esta zona".

### Qué planes aparecen
- Los mismos que en Descubrir (spec 03): próximos, visibles para el usuario, no ocultos por moderación, de su ciudad. Más los filtros de categoría.
- Solo los que tienen ubicación y el creador eligió **mostrar en el mapa**.
- Cada pin muestra el emoji de la categoría. Al tocarlo: tarjeta del plan (título, día y hora, cupo) → detalle.
- Si hay muchos pines juntos, se agrupan con un número.

### Ubicación de un plan (al crear o editar)
- Opcional. El creador busca el lugar o arrastra un pin en el mapa.
- Interruptor **"Mostrar en el mapa"**, activado por defecto en lugares públicos.
- **Domicilio particular**: nunca se muestra el punto exacto. Si se muestra en el mapa, es un **círculo aproximado** de la zona (~500 m), sin pin, y solo para quien puede ver el plan (miembros del grupo con aprobación).
- Cambiar la ubicación cuenta como "cambió el lugar" (aviso a participantes, spec 05).

### Pestaña
- El mapa se suma como **vista** dentro de Descubrir → Planes (botón "Lista | Mapa"), no como pestaña nueva. Así no se agrega una pestaña más y se mantiene el foco en los planes.

---

## 3. Criterios de aceptación (borrador)

- [ ] AC-01: Al abrir el mapa por primera vez se pide permiso con pantalla previa; sin permiso, el mapa se centra en la ciudad.
- [ ] AC-02: La ubicación del usuario no se guarda en ninguna tabla (ni por API).
- [ ] AC-03: Con radio 3 km aparecen solo planes a menos de 3 km del centro elegido.
- [ ] AC-04: Un plan con "Mostrar en el mapa" apagado no aparece en el mapa, pero sí en la lista.
- [ ] AC-05: Un plan de un grupo con aprobación no aparece en el mapa de un no miembro (ni por API).
- [ ] AC-06: Un plan en domicilio particular nunca devuelve coordenadas exactas a quien no participa; solo un punto aproximado.
- [ ] AC-07: Tocar un pin muestra la tarjeta del plan y lleva al detalle.
- [ ] AC-08: El radio elegido se mantiene al cerrar y reabrir la app.

---

## 4. Datos y permisos (borrador)

- Extensión **PostGIS** (Supabase la trae).
- `plans.location` (`geography(Point)`, null) e índice espacial.
- `plans.show_on_map` (boolean, por defecto true).
- Para domicilios: guardar el punto exacto en `plan_private_details` y en `plans.location` solo un punto redondeado (~500 m).
- Función `plans_near(lat, lng, radio_km, categoria)`: aplica las mismas reglas que `discover_plans` (visibilidad, bloqueos, moderación) más la distancia. **No guarda la ubicación de quien busca.**

---

## 5. Notas técnicas

- **Mapa**: `react-native-maps` (Google Maps en Android). Funciona en Expo Go para probar; en la app de desarrollo y en producción necesita una clave de Google Maps (el SDK de mapas para Android no tiene costo por carga de mapa).
- **Buscar lugares** al crear un plan:
  - Google Places: el más completo, tiene **costo por búsqueda** (con crédito mensual gratis); conviene llamarlo desde una Edge Function para no exponer la clave.
  - Alternativa sin costo: arrastrar el pin y escribir el nombre del lugar a mano (ya existe el campo "Lugar").
- **Ubicación del celular**: `expo-location`, permiso "mientras se usa la app".
- Actualizar la política de privacidad: se usa la ubicación del dispositivo solo en el momento y no se guarda.

---

## 6. Pantallas

```text
Descubrir ─► Planes ─► [Lista | Mapa]
                          └─► Mapa: pines por categoría · radio (1/3/5/10/20 km) · "Buscar en esta zona"
                                └─► Tarjeta del plan ─► Detalle

Crear / editar plan ─► Ubicación (opcional): buscar o arrastrar pin · "Mostrar en el mapa"
```

---

## 7. Decisiones pendientes

- [ ] ¿Entra **antes de la beta** o después? Recomendación: **después de la primera semana de beta**, cuando haya planes suficientes para que el mapa no se vea vacío (con 6 planes en toda la ciudad, la lista funciona mejor que un mapa).
- [ ] ¿Búsqueda de lugares con **Google Places** (costo) o **solo pin + nombre** (gratis)? Recomendación: arrancar con pin + nombre.
- [ ] ¿El mapa como **vista dentro de Descubrir** (recomendado) o como **pestaña propia**?
- [ ] ¿Mostrar también **grupos** en el mapa (por zona)? Recomendación: no por ahora; los grupos no tienen un lugar fijo.
