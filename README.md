# PDCA Web

Aplicacion web para gestionar ciclos PDCA con proyectos, acciones y seguimiento de avances.

## Funcionalidades
- Autenticacion con Firebase (login y registro)
- Dashboard con estadisticas globales y proyectos activos/archivados
- Gestion de acciones por proyecto (prioridad, estado, responsables)
- Roles de usuario y administrador
- Panel de administracion para usuarios, estados y departamentos

## Stack
- React + Vite
- Tailwind CSS
- Firebase Auth y Firestore
- React Router

## Configuracion
1. Crear un proyecto en Firebase y habilitar Authentication (Email/Password) y Firestore.
2. Copiar el archivo `.env.example` a `.env` y completar los valores.
3. Instalar dependencias y levantar el proyecto.

```bash
npm install
npm run dev
```

## Variables de entorno
Vite expone las variables con prefijo `VITE_`.

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

## Scripts
- `npm run dev`: entorno de desarrollo
- `npm run build`: build de produccion
- `npm run preview`: previsualizar build
- `npm run lint`: lint del codigo

## Estructura del proyecto
- `src/firebase.js`: inicializacion de Firebase
- `src/services/projectService.js`: acceso a Firestore (proyectos y acciones)
- `src/pages`: vistas principales (login, dashboard, admin, detalle de proyecto)
