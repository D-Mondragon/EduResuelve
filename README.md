# EduResuelve

Sistema web para **registrar, atender y documentar incidencias escolares** conforme a la normativa peruana de
convivencia escolar: D.S. 021-2026-MINEDU (registro formal del incidente), R.M. 383-2025-MINEDU (protocolos de
violencia escolar y SíseVe), Ley 29719 y Ley 29733 (protección de datos personales).

**Producción:** <https://eduresuelve.vercel.app>

## Funciones principales

- **Reporte y registro formal:** cualquier usuario reporta un hecho; el personal de la institución hace el registro
  formal (régimen, hora, acciones inmediatas y declaración de objetividad). Sin registro formal no se puede asignar.
- **Flujo de atención:** Nuevo → En revisión → Asignado → En atención → Resuelto → Cerrado (o Descartado), con
  historial inmutable, notificaciones y auditoría.
- **Convivencia escolar:** estudiantes y testigos con su versión de los hechos, calificación de la falta
  (leve, grave o muy grave), comunicación a Dirección con control de 24 h, medidas, reunión con la familia,
  protocolo de violencia (tipo, código SíseVe, folio del Libro de Registro de Incidencias) y derivaciones.
- **Acta de resolución:** documento A4 con código QR y verificación pública (`/verificar`), huella SHA-256 y tres
  versiones: completa, copia para la familia y copia para terceros (solo iniciales y DNI).
- **Evidencias** (PDF, imágenes, DOCX) con visor integrado, **encuesta de satisfacción**, **reportes** y
  **panel de calidad** (oportunidad, satisfacción, rendimiento, calidad de datos y cumplimiento normativo).

## Tecnología

| Capa | Tecnología |
|---|---|
| Interfaz | React 19, Vite, TypeScript, Tailwind CSS v4, React Router |
| Datos y lógica | Supabase (PostgreSQL): esquema privado `app` y funciones RPC que validan sesión, rol y reglas de negocio |
| Despliegue | Vercel (carpeta `frontend`) |
| Pruebas | Vitest (reglas SQL sobre PGlite e interfaz), Playwright (end-to-end, escritorio y móvil, accesibilidad con axe) |

```
React (Vite)  ──fetch──▶  Supabase Data API (/rest/v1/rpc/*)  ──▶  Funciones SQL (public)  ──▶  Esquema privado app
                                                                   validan sesión, rol y RN       tablas con RLS
```

## Estructura del repositorio

| Carpeta | Contenido |
|---|---|
| `frontend/` | Aplicación web, pruebas (`tests/sql`, `tests/e2e`) y scripts (API local con PGlite, mediciones) |
| `supabase/` | SQL: esquema (`01`), lógica de negocio y permisos (`02`), datos demo (`03`, `04`) y reinicio (`00`) |
| `.github/workflows/` | Control de calidad en cada push a `main`: lint, build, pruebas, cobertura y auditoría de dependencias |

## Inicio rápido (sin internet)

```bash
cd frontend
npm install
npm run dev:local     # API local (PGlite) con los datos demo → http://localhost:5173
npm run dev:demo      # igual, más 40 incidencias simuladas (12 de convivencia)
```

Usuarios demo (contraseña `EduResuelve2026`): `70000007` Administrador · `70000005` Orientador ·
`70000003` Docente · `70000001` Estudiante.

## Instalación en Supabase y Vercel

1. **Supabase:** crea un proyecto y, en el *SQL Editor*, ejecuta en orden `supabase/01_schema.sql`,
   `02_functions.sql` y `03_seed.sql` (opcional: `04_demo_ampliado.sql`, datos simulados). Para reinstalar desde
   cero, `00_reset.sql` borra todo.
2. **Variables** (`frontend/.env.local`, ver `frontend/.env.example`):
   ```
   VITE_SUPABASE_URL=https://<proyecto>.supabase.co
   VITE_SUPABASE_ANON_KEY=<clave publishable / anon>
   ```
   ⚠️ Nunca uses la clave `secret` o `service_role` en el frontend ni en Vercel.
3. **Vercel:** importa el repositorio con *Root Directory* `frontend`, define las dos variables anteriores y
   despliega. Cada push a `main` vuelve a desplegar.

No se usan Supabase Auth ni Storage: el inicio de sesión (DNI + contraseña con bcrypt, bloqueo tras 5 intentos)
y las evidencias se gestionan con funciones propias de la base de datos.

## Roles y permisos

| Acción | Estudiante | Docente | Orientador | Administrador (Dirección) |
|---|---|---|---|---|
| Reportar un hecho | ✅ | ✅ | ✅ | ✅ |
| Registro formal del incidente | ❌ | ✅ | ✅ | ✅ |
| Ver incidencias | propias | propias y asignadas | todas | todas |
| Revisar, asignar, descartar y cerrar | ❌ | ❌ | ✅ | ✅ |
| Atender y resolver | ❌ | si está asignado | si está asignado | ✅ |
| Documentar el caso de convivencia | ❌ | si reportó o está asignado | ✅ | ✅ |
| Medidas por faltas leves | ❌ | ✅ | ✅ | ✅ |
| Medidas por faltas graves y muy graves; confirmar el aviso a Dirección | ❌ | ❌ | ❌ | ✅ |
| Reabrir | ❌ | ❌ | ❌ | ✅ |
| Acta de resolución | versión resumida | ✅ | ✅ | ✅ |
| Reportes y panel de calidad | ❌ | ❌ | ✅ | ✅ |
| Usuarios y auditoría | ❌ | ❌ | ❌ | ✅ |
| Verificar un acta (`/verificar`) | público, sin sesión | | | |

## Pruebas

```bash
cd frontend
npm test            # Vitest: reglas de negocio en SQL (PGlite) + lógica y componentes de la interfaz
npm run test:e2e    # Playwright: flujos completos por rol, actas, impresión, accesibilidad y diseño móvil
npm run lint && npm run build
```
