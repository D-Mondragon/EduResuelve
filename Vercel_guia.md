# Guía de despliegue en Vercel — EduResuelve

Publica el frontend (React + Vite) en Vercel conectado a tu proyecto de Supabase.
Requisito previo: haber completado **`Supabase_guia.md`** (necesitas la *Project URL* y la *clave pública*).
Tiempo estimado: **10 minutos**.

---

## 1. Requisitos

- Repositorio en GitHub: `D-Mondragon/EduResuelve` (rama `main` actualizada).
- Cuenta en <https://vercel.com> (puedes registrarte con **Continue with GitHub**).
- Ya incluido en el repositorio: `frontend/vercel.json`, que configura Vite, la carpeta `dist`, las rutas de la SPA
  (para que recargar `/incidencias/ER-2026-0001` no dé 404) y cabeceras de seguridad.

---

## 2. Importar el proyecto

1. En Vercel: **Add New… → Project**.
2. En **Import Git Repository**, busca `EduResuelve` y pulsa **Import**.
   - Si no aparece: **Adjust GitHub App Permissions** y da acceso al repositorio.
3. Configura el proyecto:

| Campo | Valor |
|---|---|
| **Project Name** | `eduresuelve` (será `eduresuelve.vercel.app` si está libre) |
| **Framework Preset** | `Vite` |
| **Root Directory** | **`frontend`** ⬅️ importante (pulsa *Edit* y elige la carpeta) |
| **Build Command** | `npm run build` (por defecto) |
| **Output Directory** | `dist` (por defecto) |
| **Install Command** | `npm install` (por defecto) |

---

## 3. Variables de entorno

En la misma pantalla, despliega **Environment Variables** y agrega:

| Nombre | Valor | Obligatoria |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://TU-PROYECTO.supabase.co` | ✅ |
| `VITE_SUPABASE_ANON_KEY` | tu **publishable key** (`sb_publishable_…`) o **anon key** (`eyJ…`) | ✅ |
| `VITE_SHOW_DEMO_USERS` | `true` para mostrar el panel de usuarios demo en el login; `false` para ocultarlo | Opcional (por defecto se muestra) |
| `VITE_PERF_LOG` | `false` desactiva la medición anónima de tiempos de respuesta (no se recomienda: alimenta las métricas de calidad) | Opcional (por defecto activada) |
| `VITE_INSTITUTION_NAME` | Nombre que aparece en el encabezado de las actas de resolución, p. ej. `I.E. San Martín` | Opcional (por defecto "Institución Educativa") |

Marca los entornos **Production**, **Preview** y **Development**.

> ❌ Nunca pegues la `secret` / `service_role` key de Supabase.
> ℹ️ Las variables `VITE_*` se insertan al **compilar**: si las cambias después, debes **volver a desplegar**
> (paso 6).

---

## 4. Desplegar

1. Pulsa **Deploy**.
2. Espera ~1 minuto. Al terminar verás **Congratulations!** y el enlace, p. ej. `https://eduresuelve.vercel.app`.

---

## 5. Verificar el despliegue

Abre la URL y comprueba:

- [ ] Carga la pantalla de **Iniciar sesión** (con el logo de EduResuelve).
- [ ] Ingresas con DNI `70000007` / `EduResuelve2026` (Administrador).
- [ ] El inicio muestra las 5 incidencias demo.
- [ ] Abres `ER-2026-0003`, recargas la página (F5) y **no** aparece un 404.
- [ ] Desde el celular: el menú ☰ abre la navegación y no hay desplazamiento horizontal.
- [ ] Subes una imagen como evidencia y la puedes ver/descargar.
- [ ] Cierras sesión e ingresas como Estudiante (`70000001`): solo ves "Mis incidencias".
- [ ] Como Administrador abres `ER-2026-0004` → **Ver acta** → **Descargar PDF** genera el acta.
- [ ] Abres `/verificar` (sin sesión), pegas el código del pie del acta y dice **Acta auténtica y vigente**.
  Esta página es pública: recargar `/verificar?codigo=…` tampoco debe dar 404.

---

## 6. Actualizaciones y redespliegue

- **Automático:** cada `git push` a `main` genera un nuevo despliegue de producción.
  Los push a otras ramas generan una URL de *Preview*.
- **Manual:** pestaña **Deployments** → menú ⋯ del último despliegue → **Redeploy**
  (necesario tras cambiar variables de entorno).
- **Volver a una versión anterior:** **Deployments** → elige uno anterior → ⋯ → **Promote to Production**.

---

## 7. Dominio propio (opcional)

**Settings → Domains → Add** y sigue las instrucciones de DNS (registro `A` o `CNAME`).
No requiere cambios en Supabase: la app llama a la API con la clave pública desde cualquier dominio.

---

## 8. Solución de problemas

| Síntoma | Causa | Solución |
|---|---|---|
| Build falla: *Could not read package.json* | Root Directory incorrecto | Settings → General → **Root Directory = `frontend`** → Redeploy |
| Pantalla de login con "La aplicación no está configurada…" | Variables faltantes o mal escritas | Revisa los nombres exactos `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` → **Redeploy** |
| 404 al recargar una ruta interna | Falta `vercel.json` o Root Directory distinto | Confirma que `frontend/vercel.json` existe y Root Directory = `frontend` |
| "No se pudo conectar con el servidor" | Proyecto Supabase pausado o URL errónea | Restaura el proyecto en Supabase; verifica la URL (sin `/` final) |
| `PGRST202` en la consola del navegador | SQL no ejecutado en Supabase | Sigue `Supabase_guia.md`, sección 2 |
| Cambié variables y no se reflejan | Las `VITE_*` se fijan al compilar | **Redeploy** |

---

## 9. Comandos útiles (local)

```bash
cd frontend
npm run dev          # desarrollo contra Supabase (usa .env.local)
npm run dev:local    # desarrollo sin internet: API local (PGlite) + datos demo
npm run build        # compila como lo hará Vercel
npm run preview      # sirve la compilación en http://localhost:4173
npm test             # pruebas de reglas SQL + interfaz (Vitest)
npm run test:e2e     # pruebas end-to-end en navegador (Playwright)
```

---

## Checklist final

- [ ] Proyecto importado con **Root Directory = `frontend`**
- [ ] `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` configuradas
- [ ] Despliegue exitoso y verificación de la sección 5 completa
- [ ] URL compartida con el equipo / docente
