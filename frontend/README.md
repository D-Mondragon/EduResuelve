# EduResuelve — Frontend

Plataforma web para registrar, dar seguimiento y resolver incidencias educativas.
React 19 + Vite + TypeScript + Tailwind CSS v4 + React Router, con backend en **Supabase (PostgreSQL)**.

- Configurar Supabase: [`../Supabase_guia.md`](../Supabase_guia.md)
- Desplegar en Vercel: [`../Vercel_guia.md`](../Vercel_guia.md)

## Inicio rápido

```bash
npm install
npm run dev:local     # sin internet: API local (PGlite) + datos demo → http://localhost:5173
# o, con Supabase configurado en .env.local:
npm run dev
```

Usuarios demo (contraseña `EduResuelve2026`): `70000007` Administrador · `70000005` Orientador ·
`70000003` Docente · `70000001` Estudiante.

## Arquitectura

```
React (Vite)  ──fetch──▶  Supabase Data API (/rest/v1/rpc/*)  ──▶  Funciones SQL (public)  ──▶  Esquema privado app
  src/lib/api.ts                                                   validan sesión, rol y RN       tablas con RLS
```

| Carpeta | Contenido |
|---|---|
| `src/auth` | Sesión (token en `localStorage`), login/logout, expiración |
| `src/lib` | Cliente de API, formatos (hora de Lima), permisos, validaciones, compresión de archivos, CSV, tema |
| `src/components` | UI accesible reutilizable (botones, campos, modal, toasts, insignias, línea de tiempo) |
| `src/pages` | Pantallas por módulo |
| `../supabase` | SQL: esquema, lógica de negocio y datos demo |
| `scripts` | Emulador local de la API (PGlite) |
| `tests/sql` | Pruebas de reglas de negocio contra el SQL real |
| `tests/e2e` | Pruebas end-to-end (Playwright) |

## Matriz de permisos (RN-010)

| Acción | Estudiante | Docente | Orientador | Administrador |
|---|---|---|---|---|
| Registrar incidencia | ✅ | ✅ | ✅ | ✅ |
| Ver incidencias | propias | propias + asignadas | todas | todas |
| Editar (Nuevo / En revisión) | propias | propias | ✅ | ✅ |
| Revisar / descartar | ❌ | ❌ | ✅ | ✅ |
| Asignar / reasignar | ❌ | ❌ | ✅ | ✅ |
| Atender / resolver | ❌ | si está asignado | si está asignado | ✅ |
| Cerrar | ❌ | ❌ | ✅ | ✅ |
| Reabrir | ❌ | ❌ | ❌ | ✅ |
| Ver acta de resolución (RN-011) | versión resumida | ✅ | ✅ | ✅ |
| Verificar un acta (`/verificar`) | público, sin sesión | | | |
| Responder la encuesta de satisfacción (RN-012) | si registró la incidencia, tras el cierre | ← igual | ← igual | ← igual |
| Ver respuestas de la encuesta | la propia | la propia | ✅ | ✅ |
| Usuarios y auditoría | ❌ | ❌ | ❌ | ✅ |

## Pruebas

```bash
npm test            # Vitest: reglas SQL (PGlite) + lógica y componentes de la interfaz
npm run test:e2e    # Playwright: flujos completos en Chromium (escritorio y móvil)
npm run lint && npm run build
```

| Suite | Pruebas | Cubre |
|---|---|---|
| `tests/sql/auth.test.ts` | 10 | Login por DNI, mensajes genéricos, bloqueo tras 5 intentos, inactivos, tokens, cambio de clave, tablas no expuestas |
| `tests/sql/workflow.test.ts` | 15 | RN-001 … RN-010, edición (D3), notificaciones, auditoría |
| `tests/sql/actas.test.ts` | 10 | Actas (RN-011): emisión provisional/definitiva, reemplazo al reabrir, inmutabilidad y huella SHA-256, versión resumida, permisos, verificación pública |
| `tests/sql/surveys.test.ts` | 9 | Encuesta (RN-012): quién y cuándo responde, validaciones, respuesta única e inmutable, visibilidad, alerta por baja satisfacción, nueva encuesta tras reabrir |
| `tests/sql/perf.test.ts` | 6 | Tiempos de respuesta (RNF-001): mediciones anónimas, validación, límites, retención de 90 días, promedio/mediana/p95/% < 3 s, permisos |
| `tests/sql/users-evidence.test.ts` | 15 | Gestión de usuarios, reasignación por desactivación (C4), evidencias (tipos, firma, límites, anulación) |
| `src/lib/lib.test.ts` | 20 | Validaciones, zona horaria, compresión y partición de archivos, CSV, permisos |
| `src/components/components.test.tsx` | 3 | Accesibilidad de campos, modal y estados |
| `tests/e2e/*.spec.ts` | 41 | Login, flujo completo por roles, actas y verificación, encuesta de satisfacción, medición de tiempos, usuarios, evidencias, auditoría, tema, responsive móvil |

`npm run test:coverage` mide la cobertura del frontend (informe en `coverage/`). En cada `push` a `main`,
GitHub Actions (`.github/workflows/calidad.yml`) ejecuta lint, build, todas las pruebas, la cobertura y la
auditoría de dependencias.
