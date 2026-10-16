# Kiro — Nutrición y Fuerza

Kiro es una **PWA (Progressive Web App) mono-usuario, 100% local y sin backend** para bajar de peso y tonificar. Guía el entrenamiento de fuerza (rutina Torso/Pierna de 4 días pensada para caber en 1 hora) y calcula la nutrición a partir de tu estudio de bioimpedancia (Evolt). Toda la interfaz está en español y usa un tema oscuro premium, mobile-first.

La app es instalable y funciona offline: el app shell y toda la lógica (nutrición, rutina, mapa muscular, temporizadores) se ejecutan en el dispositivo. Solo las imágenes externas de los ejercicios necesitan red la primera vez.

## Funciones

- **Perfil & Evolt:** registro del estudio de bioimpedancia (edad, altura, sexo, peso, % de grasa y masa muscular esquelética) con histórico y gráficas de progreso.
- **Nutrición:** plan diario derivado en vivo del perfil. Calcula el gasto con Katch-McArdle, aplica un déficit del 20% y reparte las calorías en 4 comidas (Pre-entreno, Post-entreno, Almuerzo, Cena) con gramos exactos en crudo y nota de peso cocinado.
- **Gimnasio:** rutina Torso/Pierna (4 días × 5 ejercicios × 3 series), mapa de calor muscular, indicador de ritmo (TUT), temporizador de descanso, reloj de sesión y registro fluido de series.
- **Estadísticas:** control segmentado con 4 secciones (Cuerpo, Fuerza, Nutrición, Adherencia) y selector de rango Semana/Mes/Todo. Muestra composición corporal, volumen y progresión de fuerza (1RM estimado por Epley), objetivo nutricional y constancia.
- **Notificaciones:** recordatorios de registro de peso, hidratación y próximo test de bioimpedancia, con la lista de próximos avisos siempre calculada.
- **Cronómetro / Temporizador:** herramienta global (botón flotante) con modo cuenta arriba (con vueltas) y cuenta atrás configurable.
- **Ajustes:** factor de actividad, g/kg de proteína, base del cálculo BMR (avanzado), hora de entreno, descanso por defecto e imágenes propias por ejercicio.

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

No hay servidor ni cuenta: todos tus datos (perfil, series registradas y ajustes) viven solo en tu dispositivo.

## Crédito

Kiro · diseñado por **rnboto**.
