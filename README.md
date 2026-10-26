# Kiro — Nutrición y Fuerza

Kiro es una **PWA (Progressive Web App) mono-usuario, 100% local y sin backend** para bajar de peso y tonificar. Guía el entrenamiento de fuerza (rutina Superior/Inferior de 4 días basada en evidencia, pensada para caber en 1 hora) y calcula la nutrición a partir de tu estudio de bioimpedancia (Evolt). Toda la interfaz está en español y usa un tema oscuro premium, mobile-first.

La app es instalable y funciona offline: el app shell y toda la lógica (nutrición, rutina, mapa muscular, temporizadores) se ejecutan en el dispositivo. Solo las imágenes externas de los ejercicios necesitan red la primera vez.

## Funciones

- **Perfil & Evolt:** registro del estudio de bioimpedancia (edad, altura, sexo, peso, % de grasa y masa muscular esquelética) con histórico y gráficas de progreso.
- **Nutrición:** plan diario derivado en vivo del perfil. Calcula el gasto con Katch-McArdle, aplica un déficit del 20% y reparte las calorías en 4 comidas (Pre-entreno, Post-entreno, Almuerzo, Cena) con gramos exactos en crudo y nota de peso cocinado. **Post-entreno es tu desayuno** (≈08:15) y favorece opciones portátiles pensadas para tomarlas en el trabajo (sin cocinar ni calentar). Cada comida incluye **«Ideas de comida»**: más de 40 platos típicos de cada momento del día (desayunos como skyr con muesli, wrap con huevo cocido o sándwich de pavo; almuerzos como pollo con arroz, merluza con patata o ensalada de garbanzos; cenas ligeras como tortilla francesa, dorada con verduras o crema con pollo) sobre una base de 73 alimentos, con los gramos exactos en crudo (y el equivalente cocinado cuando aplica), los macros del plato frente al objetivo y un intercambio de alimentos que prioriza los de cada comida. Los platos portátiles llevan la etiqueta «Para llevar al trabajo» y un filtro **«Solo para llevar»**. El plato elegido en cada comida se recuerda en el dispositivo. Las cantidades son en crudo salvo que ponga «cocinado».
- **Gimnasio:** control segmentado **Musculación / Cardio / Abdominales**.
  - *Musculación:* rutina **Superior/Inferior basada en evidencia** para pérdida de grasa y tonificación, adaptada de una estructura de programa *4-day upper/lower*. Dos fases seleccionables (**Fase 1 · Base**, reps moderadas; **Fase 2 · Intensidad**, el compuesto principal de cada día sube una serie y baja de reps), cada una con 4 días (Superior A, Inferior A, Superior B, Inferior B). La división de 2 Superior + 2 Inferior trabaja cada grupo muscular ~2×/semana, el patrón de frecuencia asociado a quemar grasa y tonificar. Incluye mapa de calor muscular, indicador de ritmo (TUT), temporizador de descanso, reloj de sesión y registro fluido de series.
    - *Sustitución de ejercicios:* cambia un ejercicio ocupado por un equivalente del mismo patrón de movimiento (solo hoy o fijo). Cada tarjeta tiene **«Cambiar ejercicio»**, que abre una lista local (`src/data/exerciseSubstitutions.json`, 11 grupos y 91 ejercicios con imagen) con miniatura y material; el sustituto hereda series, reps y descanso, y las series se registran con su propio id. **«Restaurar original»** deshace el cambio. Las sustituciones viajan en la copia de seguridad.
  - *Cardio (aeróbico):* registro de sesiones de **correr** y **bici** con **tiempo en mm:ss** (minutos y segundos por separado), distancia en km, calorías y notas opcionales. Cada sesión muestra su línea calculada (distancia · tiempo · **ritmo** min/km en correr o **velocidad** km/h en bici) y la lista de recientes permite borrar. Incluye un **panel de records personales** del tipo activo (mejor ritmo o mejor velocidad, distancia más larga y sesión más larga) que marca **¡Récord!** cuando la última sesión supera tu mejor marca. Se guarda por separado de la fuerza. Un control segmentado **Registro / Rutinas** añade además **rutinas de cardio sugeridas**: 6 sesiones listas (3 de cinta y 3 de bici, con Zona 2 quemagrasa, HIIT por intervalos, cuesta y pirámide) mostradas como tarjetas paso a paso con sus pistas de RPE, cada una con un **temporizador guiado** que recorre los pasos (y todas las rondas del HIIT) con precisión por timestamp, aviso al cambiar de paso y pausa/reanuda/detener.
  - *Abdominales / Core:* un **Circuito Core (~30 min)** guiado, separado de la musculación y el cardio. Calentamiento, **3 rondas de 7 ejercicios** (40 s de trabajo / 20 s de descanso, 60 s entre rondas) que trabajan abdomen superior, inferior, oblicuos y core profundo, y enfriamiento. Muestra la lista de ejercicios con su miniatura y abre el **mismo temporizador guiado** del cardio (reutilizado), que recorre las 3 rondas con cuenta atrás, siguiente paso, progreso global y pausa/reanuda/detener. Pensado como complemento, no para todos los días.
- **Estadísticas:** control segmentado con 5 secciones (Cuerpo, Fuerza, Cardio, Nutrición, Adherencia) y selector de rango Semana/Mes/Todo. Muestra composición corporal, volumen y progresión de fuerza (1RM estimado por Epley), métricas de cardio (total de km/min, sesiones y desglose correr vs bici, sin mezclarse con la fuerza), objetivo nutricional y constancia. La pestaña **Cardio** añade panel de records por tipo (con aviso de ¡Récord!) y **gráficas de mejora**: ritmo de correr en min/km (más bajo es mejor, eje y tooltip en mm:ss) y velocidad de bici en km/h, para seguir cómo mejoran tus tiempos. La **Adherencia** cuenta tanto los días de fuerza como los de cardio.
  - *Cuerpo · Objetivo de peso e historial:* tarjeta **Objetivo de peso** con atajos «Bajar N kg» calculados desde tu peso actual (o un peso propio de 30–300 kg), progreso, kg restantes, ritmo real por tendencia lineal de las últimas 4 semanas y estimación honesta de semanas (si no hay datos suficientes, o el ritmo es plano o contrario, lo dice en vez de inventar un número); el objetivo aparece como línea de referencia en la gráfica de peso. El **Historial de mediciones** permite editar y borrar mediciones (siempre queda al menos una); si dos mediciones comparten día, manda la añadida más tarde.
- **Notificaciones:** recordatorios de registro de peso (diario), hidratación y próximo test de bioimpedancia, con la lista de próximos avisos siempre calculada. El aviso del test Evolt (bioimpedancia) es independiente de los pesajes.
  - *Pesaje semanal:* eliges día de la semana (L M X J V S D) y hora; por defecto lunes a las 06:00, en ayunas.
  - *Pesaje mensual:* eliges día del mes (1–31) y hora; por defecto día 1 a las 06:00. Si el mes no tiene ese día (29–31), se avisa el último día del mes (febrero y años bisiestos incluidos).
  - *Toca pesarte:* banner calculado con tus datos (no depende de que salte ninguna notificación). Aparece arriba del todo en Perfil y en Notificaciones cuando tu última medición tiene más de 7 días (pesaje semanal activo) o más de un mes natural (pesaje mensual activo). Su botón «Registrar medición» te lleva a Estadísticas › Cuerpo y desaparece en cuanto registras una medición nueva. Sin mediciones no se muestra.
  - *Añadir al calendario del móvil:* descarga `kiro-pesaje.ics` con un evento recurrente semanal y otro mensual (solo los pesajes activos), cada uno con alarma a la hora elegida. Ábrelo en el móvil para añadirlo a tu calendario. Si eliges los días 29, 30 o 31, en el calendario se repite el último día de cada mes.
- **Cronómetro / Temporizador:** herramienta global (botón flotante) con modo cuenta arriba (con vueltas) y cuenta atrás configurable.
- **Ajustes:** factor de actividad, g/kg de proteína, base del cálculo BMR (avanzado), hora de entreno, descanso por defecto e imágenes propias por ejercicio.
- **Datos y copias de seguridad (en Ajustes):** importa y exporta todos tus datos, sin servidor ni librerías externas.
  - *Exportar todo (JSON):* descarga un único archivo con todo tu estado (perfil, series de fuerza, sesiones de cardio y ajustes) con versión de esquema y marca de tiempo. Reimportable sin pérdidas. El objetivo de peso viaja dentro de los ajustes como claves opcionales: los backups antiguos sin objetivo se siguen importando.
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
- **Avisos con la app cerrada:** las notificaciones y los temporizadores de Kiro solo suenan mientras la app está abierta. Para que el pesaje semanal y mensual te avise siempre, usa «Añadir al calendario del móvil» (`.ics`): el calendario del teléfono se encarga de la alarma.

## Datos y privacidad

No hay servidor ni cuenta: todos tus datos (perfil, series registradas, sesiones de cardio y ajustes) viven solo en tu dispositivo. La exportación/importación de datos también se procesa 100% en local.

## Crédito

Kiro · diseñado por **rnboto**.
