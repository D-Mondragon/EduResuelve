# EduResuelve — Frontend

Aplicación web de EduResuelve (React 19 + Vite + TypeScript + Tailwind CSS v4). La descripción del sistema, la
instalación en Supabase y Vercel, los roles y las pruebas están en el [README principal](../README.md).

## Comandos

```bash
npm install
npm run dev:local     # API local (PGlite) con datos demo → http://localhost:5173
npm run dev:demo      # igual, más 40 incidencias simuladas
npm run dev           # con Supabase configurado en .env.local
npm test              # Vitest (SQL + interfaz)
npm run test:e2e      # Playwright
npm run lint && npm run build
```

## Carpetas

| Carpeta | Contenido |
|---|---|
| `src/auth` | Sesión (token en `localStorage`), inicio y cierre de sesión, expiración |
| `src/lib` | Cliente de la API, formatos (hora de Lima), permisos, validaciones, archivos, actas, reportes |
| `src/components` | Componentes accesibles reutilizables (campos, modal, paginación, registro formal, convivencia) |
| `src/pages` | Pantallas por módulo |
| `scripts` | API local sobre PGlite y scripts de medición |
| `tests/sql` | Pruebas de reglas de negocio contra el SQL real |
| `tests/e2e` | Pruebas end-to-end (Playwright) |
