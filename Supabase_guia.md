# Guía de configuración de Supabase — EduResuelve

Esta guía explica **todo lo que debes configurar en Supabase** para que EduResuelve funcione en la nube.
Tiempo estimado: **15–20 minutos**.

---

## 0. Cómo funciona (resumen)

- EduResuelve **no usa Supabase Auth** (el login de Supabase). El inicio de sesión con **DNI + contraseña** lo valida
  una función propia en la base de datos (`public.login`), con contraseñas cifradas con **bcrypt**, bloqueo tras
  5 intentos fallidos y tokens de sesión.
- **No usa Supabase Storage**: las evidencias se guardan dentro de la base de datos (en partes), a través de funciones.
- Todas las tablas están en un esquema privado llamado **`app`**, que **no** se publica en la API.
  El frontend solo puede llamar a **funciones RPC** del esquema `public`, y cada una valida sesión, rol y reglas de
  negocio (RN-001 … RN-010).
- Resultado: solo necesitas **crear el proyecto, ejecutar 3 archivos SQL y copiar 2 datos** (URL y clave pública).
  No hay que crear políticas, buckets ni Edge Functions.

Archivos SQL (carpeta `supabase/` del repositorio):

| Archivo | Qué hace |
|---|---|
| `00_reset.sql` | ⚠️ Borra todo. Solo para reinstalar desde cero. |
| `01_schema.sql` | Crea el esquema privado `app`, las tablas, restricciones e índices. |
| `02_functions.sql` | Crea la lógica de negocio, el login y los permisos (funciones RPC). |
| `03_seed.sql` | Carga los datos demo: 8 usuarios y 5 incidencias (ER-2026-0001 … 0005). |
| `04_demo_ampliado.sql` | **Opcional.** Agrega 40 incidencias **simuladas** (historial, resoluciones, cierres, actas y encuestas) para que el panel de calidad tenga resultados representativos. No borra nada y se ejecuta una sola vez. |

---

## 1. Crear el proyecto

1. Entra a <https://supabase.com/dashboard> e inicia sesión.
2. Clic en **New project**.
3. Completa:
   - **Organization:** la tuya.
   - **Project name:** `eduresuelve`
   - **Database Password:** genera una segura y **guárdala** (no la necesita la app, pero sí tú para administrar).
   - **Region:** **South America (São Paulo)** si está disponible; si el panel solo ofrece **East US (North Virginia)**, úsala sin problema.
     ⚠️ La región **no se puede cambiar** después de crear el proyecto (habría que crear otro y volver a ejecutar los SQL).
   - **Plan:** Free.
4. Clic en **Create new project** y espera 1–2 minutos a que termine de aprovisionarse.

---

## 2. Ejecutar los scripts SQL

1. En el menú lateral entra a **SQL Editor**.
2. Clic en **New query**.
3. Abre en VS Code el archivo `supabase/01_schema.sql`, copia **todo** su contenido, pégalo en el editor y
   pulsa **Run** (o `Ctrl + Enter`). Debe decir *Success. No rows returned*.
4. Repite con **`02_functions.sql`** (nueva consulta → pegar → Run).
5. Repite con **`03_seed.sql`**.

> ⚠️ Respeta el orden: **01 → 02 → 03**.
> Si algo falla a la mitad o quieres empezar de cero: ejecuta `00_reset.sql` y vuelve a correr 01, 02 y 03.

### 2.1 Verificar la instalación

En una nueva consulta del SQL Editor ejecuta:

```sql
select count(*) as usuarios from app.users;          -- debe dar 8
select code, status from app.incidents order by code; -- 5 incidencias
select public.login('70000007', 'EduResuelve2026') ->> 'token' is not null as login_ok; -- true
select number, kind, status from app.actas order by number; -- 3 actas (0004-01, 0004-02, 0005-01)
```

---

## 3. Revisar la configuración de la API (Data API)

1. Ve a **Project Settings → Data API** (en algunos paneles aparece como **API → Data API settings**).
2. Comprueba que:
   - **Data API** está **habilitada**.
   - En **Exposed schemas** esté **`public`** (viene por defecto).
   - **No agregues `app`** a los esquemas expuestos. Debe quedar privado.
3. Guarda si cambiaste algo.

> Si tras ejecutar el SQL la app responde *"Could not find the function …"* (error `PGRST202`), refresca el
> caché de la API ejecutando en el SQL Editor:
> ```sql
> notify pgrst, 'reload schema';
> ```

---

## 4. Copiar la URL y la clave pública

1. Ve a **Project Settings → API Keys** (o **Settings → API**).
2. Copia:
   - **Project URL** → algo como `https://abcdefghijkl.supabase.co`
     (también aparece en **Project Settings → General** / **Data API**).
   - **Publishable key** (`sb_publishable_…`). Si tu panel solo muestra claves heredadas, usa la **anon / public**
     (empieza con `eyJ…`). Ambas funcionan con la app.
3. ❌ **Nunca** uses la `secret` / `service_role` key en el frontend ni en Vercel.

Estos dos valores son las variables de entorno:

```
VITE_SUPABASE_URL=https://abcdefghijkl.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxxxxxxxxx
```

---

## 5. Probar la conexión desde tu PC

1. En la carpeta `frontend/` copia `.env.example` como **`.env.local`** y pega los dos valores del paso 4.
2. Ejecuta:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
3. Abre <http://localhost:5173> e ingresa con un usuario demo (tabla de la sección 7).

> `.env.local` está en `.gitignore`: tus claves no se suben a GitHub.

Prueba rápida por terminal (opcional, reemplaza URL y KEY):

```bash
curl -X POST "https://TU-PROYECTO.supabase.co/rest/v1/rpc/login" \
  -H "apikey: TU_CLAVE_PUBLICA" -H "Content-Type: application/json" \
  -d '{"p_dni":"70000007","p_password":"EduResuelve2026"}'
```

Debe responder un JSON con `token` y `user`.

---

## 6. Ajustes recomendados de seguridad

| Ajuste | Dónde | Valor |
|---|---|---|
| Registro público de Supabase Auth (no lo usamos) | **Authentication → Sign In / Providers** | Desactiva **Allow new users to sign up** |
| Proveedor Email de Supabase Auth (no lo usamos) | **Authentication → Sign In / Providers → Email** | Puedes desactivarlo |
| Storage | — | No se usa; no crees buckets |
| Edge Functions | — | No se usan |

### Avisos del *Security Advisor*

En **Advisors → Security Advisor** puede aparecer:

- *"Function … is SECURITY DEFINER / exposed via API"* → **es intencional**: las funciones RPC son la única puerta
  de entrada y cada una valida el token de sesión y el rol antes de tocar datos.
- *RLS* en tablas de `public` → no aplica: no hay tablas en `public`. Las tablas de `app` tienen RLS activo sin
  políticas (defensa en profundidad) y no están expuestas.

---

## 7. Usuarios de demostración

Contraseña de todos: **`EduResuelve2026`**

| DNI | Nombre | Rol | Estado |
|---|---|---|---|
| 70000001 | Alicia Ejemplo | Estudiante | Activo |
| 70000002 | Bruno Muestra | Estudiante | Activo |
| 70000003 | Camila Ficticia | Docente | Activo |
| 70000004 | Damián Simulado | Docente | **Inactivo** |
| 70000005 | Estela Inventada | Orientador | Activo |
| 70000006 | Fabián Imaginario | Orientador | Activo |
| 70000007 | Greta Demostración | Administrador | Activo |
| 70000008 | Hugo Prototipo | Administrador | **Inactivo** |

> Para un uso real: crea tus propios administradores desde **Usuarios**, desactiva o cambia las claves de los
> usuarios demo y configura `VITE_SHOW_DEMO_USERS=false` para ocultar el panel de usuarios demo del login.

---

## 8. Mantenimiento

### Datos de demostración ampliados (opcional)
Ejecuta `04_demo_ampliado.sql` después de 01–03. Los códigos continúan el contador y el rango cargado queda en
**Auditoría** como *"Carga de datos de demostración"* (por ejemplo `ER-2026-0007 … ER-2026-0046`): decláralo
como datos simulados en el informe. No genera mediciones de tiempos de respuesta (esas deben ser reales).

### Reiniciar los datos de demostración
SQL Editor → ejecutar `00_reset.sql`, luego `01_schema.sql`, `02_functions.sql` y `03_seed.sql`.

### Actualizar tras un cambio en el repositorio (sin perder datos)
Vuelve a ejecutar, en este orden, **`01_schema.sql`** y luego **`02_functions.sql`**.
Ambos se pueden ejecutar varias veces: solo crean lo que falta (tablas nuevas) y reemplazan las funciones;
**no borran datos**. No ejecutes `00_reset.sql` ni `03_seed.sql` para actualizar.

> Ejemplo: las actas de resolución (RN-011) agregaron la tabla `app.actas` y la encuesta de satisfacción
> (RN-012) la tabla `app.surveys`, y la medición de tiempos de respuesta (RNF-001) la tabla `app.perf_samples`.
> Al ejecutar 01 y 02 se generan automáticamente las actas de las incidencias que ya estaban resueltas o
> cerradas, y las incidencias cerradas quedan con su encuesta pendiente para quien las registró.
> Compruébalo con: `select number, kind, status from app.actas order by number;`

### Restablecer la contraseña de un administrador bloqueado desde el SQL Editor
```sql
update app.users
set password_hash = extensions.crypt('NuevaClave2026', extensions.gen_salt('bf')),
    must_change_password = true, failed_attempts = 0, locked_until = null
where dni = '70000007';
```

### Plan gratuito: pausa por inactividad
Supabase **pausa los proyectos gratuitos tras 7 días sin actividad**. Antes de una demostración entra al panel; si
está pausado, pulsa **Restore project** y espera 1–2 minutos.

---

## 9. Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| "La aplicación no está configurada…" | Faltan variables de entorno | Revisa `.env.local` o las variables en Vercel (y vuelve a desplegar) |
| "No se pudo conectar con el servidor…" | URL incorrecta, proyecto pausado o sin internet | Verifica la URL y que el proyecto esté activo |
| `PGRST202` / "Could not find the function" | Scripts sin ejecutar o caché de API | Ejecuta 01–03 y luego `notify pgrst, 'reload schema';` |
| `Invalid API key` / 401 en todas las llamadas | Clave equivocada | Usa la **publishable** o **anon**, nunca la secreta |
| "DNI o contraseña incorrectos" con usuarios demo | Seed no ejecutado | Ejecuta `03_seed.sql` |
| "Tu sesión expiró" | Token vencido (7 días) o usuario desactivado | Inicia sesión de nuevo |

---

## Checklist final

- [ ] Proyecto creado (región São Paulo o East US; no se puede cambiar luego)
- [ ] `01_schema.sql`, `02_functions.sql` y `03_seed.sql` ejecutados sin errores
- [ ] Verificación de la sección 2.1 correcta
- [ ] Esquema `app` **no** expuesto en Data API
- [ ] Project URL y clave pública copiadas
- [ ] App probada en local con `.env.local`
- [ ] Registro público de Supabase Auth desactivado
- [ ] Variables cargadas en Vercel (ver `Vercel_guia.md`)
