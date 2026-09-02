# PDCA Web

Aplicación web para la gestión de equipos y departamentos con metodología PDCA: proyectos, acciones con fases Plan/Do/Check/Act, colaboración en tiempo real e informes.

## Funcionalidades

**Gestión de trabajo**
- Proyectos agrupados por departamento, con archivado, búsqueda y ordenación
- Acciones con edición inline en tiempo real: estado configurable, prioridad por niveles (baja/media/alta), fase PDCA, responsables, fechas propuestas/reales, observaciones, subacciones y adjuntos
- Alta de acciones por voz: graba una nota junto a "Nueva acción", se transcribe (Whisper) y se extraen los campos con un LLM (gpt-5.6-luna) — la descripción se rellena directa y el resto de campos se ofrecen como sugerencia a confirmar con un clic
- Vistas Tabla, Kanban (arrastrar y soltar) y Gantt por proyecto
- **Mis Tareas**: todas tus acciones abiertas agrupadas por vencimiento (vencidas/hoy/semana), con cambio rápido de estado
- Plantillas de proyecto (crear desde plantilla, guardar proyecto como plantilla)

**Colaboración**
- Comentarios por acción con menciones @usuario
- Notificaciones in-app (asignaciones, cambios de estado, comentarios, menciones)
- Historial de actividad por proyecto
- Búsqueda global con Ctrl+K

**Informes**
- Resumen con gráficos: acciones por estado, completadas por semana, cumplimiento de plazos
- Terminadas / pendientes / en curso por usuario, con filtros por departamento, proyecto y rango
- Exportación CSV y PDF

**Plataforma**
- PWA instalable con actualización controlada
- Modo oscuro sin parpadeo, diseño responsive móvil-first, accesibilidad (focus visible, labels, targets táctiles)
- Roles usuario/administrador; panel de administración (usuarios, estados, departamentos, plantillas)

## Sistema visual

- **Fondo**: degradado violeta fijo definido en `<body>` (`src/index.css`), con dos halos radiales y una base lineal por tema. Los contenedores de la app son transparentes para dejarlo pasar.
- **Color**: marca índigo (`brand`) y acento violeta (`accent`) en `tailwind.config.js`; superficies, líneas y lienzo como variables CSS (`--c-surface`, `--c-line`…) que cambian con `.dark`.
- **Formas**: tarjetas `rounded-2xl` (`.card`), controles `rounded-xl`, sombras tintadas de violeta.
- **Rejillas**: el panel muestra los proyectos como tiles (2 columnas en móvil, 3 en `sm`, 4 en `lg`) con un acento de color estable por proyecto (`getEntityColor`).
- **Listas de tareas**: una tarjeta por tarea, con círculo para completar, fecha de vencimiento destacada y selector de estado.
- **Sin desbordes laterales**: `html`/`body` recortan el eje X y todo bloque ancho (tablas, Kanban, Gantt, gráficas) usa la utilidad `.scroll-x`, que crea su propio carrusel sin arrastrar a la página.

## Stack
- React 18 + Vite 5 (+ vite-plugin-pwa)
- Tailwind CSS 3 (tokens de diseño en `tailwind.config.js` + `src/index.css`)
- Firebase: Auth, Firestore (tiempo real), Storage
- React Router 7 · lucide-react · jsPDF

## Configuración

1. Crear un proyecto en Firebase y habilitar **Authentication** (Email/Password), **Firestore** y **Storage**.
2. Copiar `.env.example` a `.env` y completar los valores.
3. Instalar y arrancar:

```bash
npm install
npm run dev
```

### Despliegue de reglas de seguridad e índices (obligatorio)

Las reglas de Firestore/Storage y los índices están versionados en el repo (`firestore.rules`, `storage.rules`, `firestore.indexes.json`). Para desplegarlos:

```bash
npx firebase login
npx firebase use <id-del-proyecto>
npx firebase deploy --only firestore:rules,firestore:indexes,storage
```

> **Importante**: despliega primero el cliente actualizado y después las reglas. Los clientes antiguos hacen consultas amplias que las reglas nuevas deniegan.
> El índice `COLLECTION_GROUP` sobre `actions.assignedUsers` es imprescindible para "Mis Tareas"; los índices tardan unos minutos en construirse.

### Qué cubren las reglas
- Anti-autopromoción: un usuario no puede cambiarse su propio `role` ni `disabled`
- Acceso a proyectos/acciones/adjuntos solo para miembros (creador o asignados) y admins
- Notificaciones legibles solo por su destinatario; actividad append-only; configuración global solo admin

### Limitaciones conocidas (sin Cloud Functions)
- Desactivar un usuario le bloquea el acceso a los datos, pero su cuenta de Auth sigue existiendo (bórrala desde la consola de Firebase si procede)
- Las notificaciones se generan desde el cliente que origina el evento; si esa pestaña se cierra a mitad, puede perderse el aviso
- Las URLs de descarga de adjuntos antiguos llevan token permanente (revocable solo desde la consola)
- **`VITE_OPENAI_API_KEY` (alta de acciones por voz) viaja embebida en el bundle del cliente**: al no haber backend, cualquiera que inspeccione la app puede leerla y usarla. Es una decisión consciente del proyecto (sin Cloud Functions ni plan de pago); como mitigación, configura un límite de gasto mensual en el dashboard de OpenAI. Si en el futuro se añade un backend, esta llamada debería moverse detrás de él.

## Variables de entorno

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=

# Opcional: alta de acciones por voz (ver "Limitaciones conocidas")
VITE_OPENAI_API_KEY=
```

## Scripts
- `npm run dev`: entorno de desarrollo
- `npm run build`: build de producción (genera también el service worker)
- `npm run preview`: previsualizar build
- `npm run lint`: lint del código

## Estructura del proyecto
- `src/lib/`: utilidades puras (fechas locales, progreso, prioridad, fases PDCA, colores, CSV)
- `src/components/ui/`: sistema de diseño (Modal, Toast, ConfirmDialog, Popover, Skeleton, …)
- `src/components/project/`: detalle de proyecto troceado (tabla, tarjetas, kanban, gantt, comentarios, actividad)
- `src/components/charts/`: gráficos SVG propios (barras, línea, donut)
- `src/services/`: acceso a Firestore/Storage + fachada `actionEvents` (actividad y notificaciones)
- `src/hooks/`: suscripciones realtime con `{ data, loading, error, retry }`
- `src/pages/`: vistas (Dashboard, Mis Tareas, Detalle, Calendario, Informes, Admin)
- `firestore.rules` / `storage.rules` / `firestore.indexes.json`: seguridad versionada
