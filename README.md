# Kiro — Nutrición y Fuerza

Kiro es una **PWA (Progressive Web App) mono-usuario, 100% local y sin backend** para bajar de peso y tonificar. Guía el entrenamiento de fuerza (rutina Superior/Inferior de 4 días basada en evidencia, pensada para caber en 1 hora) y calcula la nutrición a partir de tu estudio de bioimpedancia (Evolt). Toda la interfaz está en español y usa un tema oscuro premium, mobile-first.

La app es instalable y funciona offline: el app shell y toda la lógica (nutrición, rutina, mapa muscular, temporizadores) se ejecutan en el dispositivo. Solo las imágenes externas de los ejercicios necesitan red la primera vez.

## Funciones

- **Perfil & Evolt:** registro del estudio de bioimpedancia (edad, altura, sexo, peso, % de grasa y masa muscular esquelética) con histórico y gráficas de progreso.
- **Nutrición:** plan diario derivado en vivo del perfil. Calcula el gasto con Katch-McArdle, aplica un déficit del 20% y reparte las calorías en 4 comidas (Pre-entreno, Post-entreno, Almuerzo, Cena) con gramos exactos en crudo y nota de peso cocinado.
- **Gimnasio:** control segmentado **Musculación / Cardio**.
  - *Musculación:* rutina **Superior/Inferior basada en evidencia** para pérdida de grasa y tonificación, adaptada de una estructura de programa *4-day upper/lower*. Dos fases seleccionables (**Fase 1 · Base**, reps moderadas; **Fase 2 · Intensidad**, el compuesto principal de cada día sube una serie y baja de reps), cada una con 4 días (Superior A, Inferior A, Superior B, Inferior B). La división de 2 Superior + 2 Inferior trabaja cada grupo muscular ~2×/semana, el patrón de frecuencia asociado a quemar grasa y tonificar. Incluye mapa de calor muscular, indicador de ritmo (TUT), temporizador de descanso, reloj de sesión y registro fluido de series.
  - *Cardio (aeróbico):* registro de sesiones de **correr** y **bici** con **tiempo en mm:ss** (minutos y segundos por separado), distancia en km, calorías y notas opcionales. Cada sesión muestra su línea calculada (distancia · tiempo · **ritmo** min/km en correr o **velocidad** km/h en bici) y la lista de recientes permite borrar. Incluye un **panel de records personales** del tipo activo (mejor ritmo o mejor velocidad, distancia más larga y sesión más larga) que marca **¡Récord!** cuando la última sesión supera tu mejor marca. Se guarda por separado de la fuerza. Un control segmentado **Registro / Rutinas** añade además **rutinas de cardio sugeridas**: 6 sesiones listas (3 de cinta y 3 de bici, con Zona 2 quemagrasa, HIIT por intervalos, cuesta y pirámide) mostradas como tarjetas paso a paso con sus pistas de RPE, cada una con un **temporizador guiado** que recorre los pasos (y todas las rondas del HIIT) con precisión por timestamp, aviso al cambiar de paso y pausa/reanuda/detener.
- **Estadísticas:** control segmentado con 5 secciones (Cuerpo, Fuerza, Cardio, Nutrición, Adherencia) y selector de rango Semana/Mes/Todo. Muestra composición corporal, volumen y progresión de fuerza (1RM estimado por Epley), métricas de cardio (total de km/min, sesiones y desglose correr vs bici, sin mezclarse con la fuerza), objetivo nutricional y constancia. La pestaña **Cardio** añade panel de records por tipo (con aviso de ¡Récord!) y **gráficas de mejora**: ritmo de correr en min/km (más bajo es mejor, eje y tooltip en mm:ss) y velocidad de bici en km/h, para seguir cómo mejoran tus tiempos. La **Adherencia** cuenta tanto los días de fuerza como los de cardio.
- **Notificaciones:** recordatorios de registro de peso, hidratación y próximo test de bioimpedancia, con la lista de próximos avisos siempre calculada.
- **Cronómetro / Temporizador:** herramienta global (botón flotante) con modo cuenta arriba (con vueltas) y cuenta atrás configurable.
- **Ajustes:** factor de actividad, g/kg de proteína, base del cálculo BMR (avanzado), hora de entreno, descanso por defecto e imágenes propias por ejercicio.
- **Datos y copias de seguridad (en Ajustes):** importa y exporta todos tus datos, sin servidor ni librerías externas.
  - *Exportar todo (JSON):* descarga un único archivo con todo tu estado (perfil, series de fuerza, sesiones de cardio y ajustes) con versión de esquema y marca de tiempo. Reimportable sin pérdidas.
  - *Exportar por rango (CSV):* elige Semana, Mes o un rango personalizado y descarga un CSV legible (una fila por entrada con columna `tipo`: medición / fuerza / cardio) para leer o compartir.
  - *Importar datos (JSON):* elige un archivo y confirma el modo. **Fusionar** añade lo que falte por id sin borrar nada; **Reemplazar** borra tus datos actuales y carga solo los del archivo. Un archivo inválido se rechaza con un mensaje en español sin tocar tus datos; tras importar, la app se recarga para reflejar los datos.

## Stack

- **React 18 + TypeScript** sobre **Vite 5**.
- **vite-plugin-pwa** (Workbox, modo `generateSW`) para manifest + service worker.
- **recharts** para las gráficas.
- **CSS Modules** + variables CSS (tema oscuro). Sin UI kit.
- Persistencia local propia: **IndexedDB con fallback a localStorage**.
- Router basado en estado (sin react-router). Estado global con React Context.
- Tests con **Vitest** y **@testing-library/react** (jsdom).

## Requisitos

- Node.js 20 LTS (o superior) y npm.

## Instalar

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

## Build de producción

```bash
npm run build
```

Genera `dist/` con el app shell precacheado, el `manifest.webmanifest` y el service worker (`sw.js`).

## Tests y verificación de tipos

```bash
npm run test       # Vitest (dominio + integración + selectores)
npm run typecheck  # tsc --noEmit
```

## Limitaciones conocidas (PWA)

- **Temporizadores:** los recordatorios y relojes solo avanzan con la pestaña abierta/activa. No hay cron de background fiable en una PWA, por eso la pantalla de Notificaciones siempre muestra la lista de "próximos" calculada, independiente de los timers.
- **Imágenes de ejercicios:** provienen de un dataset externo (free-exercise-db). Requieren red la primera vez; una vez vistas quedan en caché y disponibles offline. Si una imagen no carga, se muestra un marcador limpio (silueta + nombre).
- **Notificaciones del sistema:** si deniegas el permiso, los avisos se muestran como banners dentro de la app.

## Datos y privacidad

No hay servidor ni cuenta: todos tus datos (perfil, series registradas, sesiones de cardio y ajustes) viven solo en tu dispositivo. La exportación/importación de datos también se procesa 100% en local.

## Crédito

Kiro · diseñado por **rnboto**.
