# EduResuelve — Definiciones para la migración a Supabase

**Fecha:** 10/11/2026
**Propósito:** responder cada pregunta en este mismo archivo antes de iniciar la implementación.

## Cómo responder

- Marca la opción elegida cambiando `[ ]` por `[x]`.
- Escribe comentarios o detalles en la línea **Respuesta:**.
- Si estás de acuerdo con la recomendación, basta con escribir `OK` en **Respuesta:**.
- Las opciones marcadas con ⭐ son las recomendadas.

---

## A. Arquitectura y alcance

### A1. ¿Supabase reemplaza al backend NestJS planeado o lo complementa?

El documento de contexto planeaba: React → NestJS → PostgreSQL. Supabase ya incluye PostgreSQL, autenticación, almacenamiento de archivos y una API automática.

- [X] ⭐ **Solo Supabase:** React se conecta directo a Supabase. Las reglas de negocio (RN) se aplican en la base de datos con RLS (Row Level Security), triggers y funciones SQL. Menos código y seguridad real.
- [] **NestJS + Supabase:** NestJS centraliza las reglas; Supabase actúa solo como base de datos y autenticación. Más capas y más trabajo, pero coincide con el plan original.

**Respuesta:**
La idea es mandarlo a vercer para el deploy.

### A2. ¿El curso exige alguna arquitectura en particular?

Por ejemplo, capas, API REST propia o un patrón concreto. Si el docente evalúa la arquitectura NestJS del plan, cambia la respuesta de A1.

**Respuesta:**
no

### A3. ¿Hay fecha de entrega o hitos?

Sirve para priorizar qué se hace primero y qué queda para una "fase 2".

| Hito | Fecha |
|---|---|
| | |
| | |
| Entrega final | |

**Respuesta:**
fecha de entrega el 12 de este mes, en 2 dias, para el prototipo funcional

### A4. ¿La app se despliega en internet o solo se ejecuta en local?

- [x] ⭐ Desplegada en internet: Vercel o Netlify (gratis) + Supabase en la nube.
- [ ] Solo local (`npm run dev`) para la demostración.

**Respuesta:**

---

## B. Autenticación y sesión

### B1. ¿Cómo inician sesión los usuarios?

- [ ] ⭐ Correo y contraseña
- [ ] Enlace mágico por correo (sin contraseña)
- [ ] Google (cuenta institucional)
- [ ] Otro:

**Respuesta:**
con dni como usuario y una clave.

### B2. ¿Quién crea las cuentas?

- [x] ⭐ **Solo el Administrador**, desde la pantalla "Usuarios", y asigna el rol. No hay registro público.
- [ ] **Registro abierto:** cualquiera se registra y un administrador lo aprueba o le asigna rol.

**Respuesta:**

### B3. ¿Se restringe el acceso a un dominio de correo?

- [x] No, cualquier correo.
- [ ] Sí, solo el dominio: `@____________`

**Respuesta:**

### B4. ¿Hace falta recuperar la contraseña ("¿Olvidaste tu contraseña?")?

Supabase lo trae listo, pero hay que configurar las URL de redirección.

- [ ] ⭐ Sí
- [x] No

**Respuesta:**

### B5. ¿Se cierra la sesión por inactividad?

- [x] No
- [ ] Sí, tras ______ minutos de inactividad.

**Respuesta:**

---

## C. Roles y permisos (RN-010)

### C1. ¿Los Estudiantes usan el sistema?

- [x] ⭐ Sí: pueden registrar incidencias y ver **solo las suyas**.
- [ ] No: solo el personal de la institución inicia sesión.
- [ ] Otro:

**Respuesta:**

### C2. Valida la matriz de permisos propuesta

Corrige directamente la tabla si algo no coincide (✅ permitido / ❌ no permitido).

| Acción | Estudiante | Docente | Resp. convivencia | Orientador | Administrador |
|---|---|---|---|---|---|
| Registrar incidencia | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ver incidencias | propias | propias + asignadas | todas | todas | todas |
| Revisar / descartar | ❌ | ❌ | ✅ | ✅ | ✅ |
| Asignar responsable | ❌ | ❌ | ✅ | ❌ | ✅ |
| Atender / resolver | ❌ | si está asignado | si está asignado | si está asignado | ✅ |
| Cerrar | ❌ | ❌ | ✅ | ❌ | ✅ |
| Reabrir | ❌ | ❌ | ❌ | ❌ | ✅ |
| Gestionar usuarios | ❌ | ❌ | ❌ | ❌ | ✅ |
| Ver auditoría | ❌ | ❌ | ✅ | ❌ | ✅ |

**Respuesta:**
no quiero un resp. convivencia, solo pueden ser los demas roles. lo demas está bien.
### C3. ¿Un usuario puede tener más de un rol?

- [x] ⭐ No, un solo rol por usuario.
- [ ] Sí, varios roles.

**Respuesta:**

### C4. ¿Qué pasa con las incidencias asignadas si se desactiva un usuario?

- [ ] ⭐ El sistema avisa y **bloquea** la desactivación hasta reasignar sus incidencias.
- [x] Se permite desactivar y las incidencias quedan marcadas "pendientes de reasignación".
- [ ] Otro:

**Respuesta:**

---

## D. Flujo de incidencias

### D1. ¿Se mantienen los 7 estados y las transiciones actuales?

Estados: Nuevo, En revisión, Asignado, En atención, Resuelto, Cerrado, Descartado.

El flujo dice "Asignar/Derivar", pero no existe transición para **derivar o reasignar** una incidencia ya asignada.

- [ ] ⭐ Mantener los estados y **agregar reasignación** (cambiar de responsable estando en Asignado o En atención, con motivo).
- [X] Mantener todo exactamente como está.
- [ ] Otro cambio:

**Respuesta:**

### D2. Formato del código ER-AAAA-XXXX

- [X] ⭐ El año se toma automáticamente y el contador se reinicia cada año (ER-2027-0001). Lo genera la base de datos para que no haya duplicados.
- [ ] Siempre ER-2026-XXXX con contador continuo.

**Respuesta:**

### D3. ¿Se puede editar una incidencia ya registrada (título, descripción, etc.)?

- [X] ⭐ Sí, solo en estados **Nuevo** o **En revisión**, por quien la registró o por gestores. Cada edición queda en el historial (RN-009).
- [ ] No, nunca se edita; las correcciones se hacen como observaciones.
- [ ] Otro:

**Respuesta:**

### D4. "Personas involucradas"

Hay que considerar la protección de datos de menores.

- [X] ⭐ Sigue siendo texto libre, con aviso de no ingresar datos sensibles.
- [ ] Se vincula a usuarios registrados del sistema.

**Respuesta:**

### D5. ¿Hacen falta notificaciones?

- [ ] ⭐ No por ahora (fase 2).
- [X] Avisos dentro de la app (campanita).
- [ ] Correo electrónico al asignar, resolver o cerrar.

**Respuesta:**

### D6. ¿Las categorías y prioridades son fijas o las puede administrar el Administrador?

- [X] ⭐ Fijas (las 5 categorías y 4 prioridades actuales).
- [ ] Administrables desde la app.

**Respuesta:**

---

## E. Evidencias

### E1. ¿Se suben archivos reales?

- [X] ⭐ Sí, en Supabase Storage con un bucket privado (solo usuarios autorizados descargan).
- [ ] No, solo se registran los metadatos (nombre, tipo, descripción).

**Respuesta:**

### E2. Límites de los archivos

| Parámetro | Propuesta | Tu valor |
|---|---|---|
| Tipos permitidos | PDF, JPG, PNG, DOCX | |
| Tamaño máximo por archivo | 10 MB | |
| Máximo de archivos por incidencia | 10 | |

**Respuesta:**
CON UN AVISO EN EL FRONTEND CUANDO EL ARCHIVO SUPERE EL TAMAÑO, ASI MISMO DE SER POSIBLE UN COMPRESOR DE ARCHIVOS IMAGENES INTEGRADO PARA NO REQUIERA MAS TRABAJO DEL USUARIO.
### E3. ¿Se pueden eliminar evidencias?

- [X] ⭐ No se borran: se **anulan** con un motivo y quedan visibles en el historial (RN-009).
- [ ] Sí se pueden eliminar, con confirmación y registro en auditoría.

**Respuesta:**

### E4. ¿En qué estados se permite agregar evidencias?

- [X] ⭐ En todos, excepto Cerrado y Descartado.
- [ ] En cualquier estado.
- [ ] Otro:

**Respuesta:**

---

## F. Auditoría

### F1. ¿Qué eventos se registran?

La base de datos los registraría automáticamente con triggers, sin depender del frontend. Marca los que apliquen:

- [X] Inicio y cierre de sesión
- [X] Intentos fallidos de inicio de sesión
- [X] Registro y edición de incidencias
- [X] Cambios de estado (incluye descarte y reapertura)
- [X] Asignaciones y reasignaciones
- [X] Registro y anulación de evidencias
- [X] Creación, edición y desactivación de usuarios
- [X] Cambios de rol
- [ ] Otros:

**Respuesta:**

### F2. ¿La auditoría se puede exportar?

- [ ] No
- [X] CSV
- [X] PDF

**Respuesta:**

---

## G. UX y presentación

### G1. Identidad visual

- [X] ⭐ Mantener el estilo actual (verde esmeralda, sobrio).
- [ ] Usar colores o logo institucional (adjuntar o describir):

**Respuesta:**

### G2. ¿Quiénes usan la app y desde qué dispositivo?

| Rol | Dispositivo principal (PC / celular / ambos) |
|---|---|
| Estudiante | |
| Docente | |
| Responsable de convivencia | |
| Orientador | |
| Administrador | |

**Respuesta:**
TODOS DEBEN PODER USARLA EN CUALQUIER DIPOSITIVO ASEGURA LOS ESTILOS RESPONSIVOS EN TODOS LOS MODULOS
### G3. ¿Cada rol ve un dashboard distinto?

- [X] ⭐ Sí: "Mis incidencias / mis pendientes" para estudiantes y docentes; métricas globales para gestores y administradores.
- [ ] No, el mismo dashboard para todos (filtrado por permisos).

**Respuesta:**

### G4. ¿Hace falta modo oscuro?

- [] ⭐ No por ahora.
- [X] Sí.

**Respuesta:**

---

## H. Pruebas, entorno y entrega

### H1. Cuenta y proyecto de Supabase

- [X] Ya tengo cuenta en Supabase.
- [] Aún no tengo cuenta (te guiaré para crearla).
- [X] ⭐ Un solo proyecto (plan gratuito).
- [] Dos proyectos: desarrollo y producción.

**Respuesta:**

### H2. ¿El curso exige algún formato de evidencia de calidad?

El curso es Calidad de Software, así que esto puede pesar mucho en la nota. Marca lo que pidan:

- [ ] Plan de pruebas
- [ ] Casos de prueba con ID (CP-001…)
- [ ] Matriz de trazabilidad RN ↔ casos de prueba
- [ ] Reporte de cobertura de pruebas automatizadas
- [ ] Reporte de defectos / bugs
- [ ] Algún estándar específico (ISO/IEC 25010, IEEE 829, etc.):
- [ ] Otros:

**Respuesta:**
validalo con "C:\Users\DAVID\OneDrive\Desktop\Clasess\Calidad Software\CALIDAD DE SOFTWARE SILABUS.pdf" en caso no contenga informacion al respecto hazmelo saber
### H3. Datos de demostración

- [x] ⭐ Cargar los 5 casos ER-2026-0001…0005 y los 8 usuarios de prueba como datos iniciales (seed).
- [ ] Empezar con la base de datos vacía (solo un Administrador).

**Respuesta:**

### H4. Pruebas automatizadas

Ya definido: **Vitest + Testing Library** (automatizadas) + recorrido manual en navegador.

- [x] ⭐ Agregar también pruebas end-to-end con Playwright (flujo completo en navegador real).
- [ ] Solo Vitest + pruebas manuales.

**Respuesta:**

---

## I. Git y control de versiones

### I1. Commit del trabajo actual

Todo el código del frontend **sigue sin commitear**. Antes de iniciar la migración conviene guardar un punto seguro.

- [x] ⭐ Sí, autorizo hacer un commit del estado actual antes de empezar.
- [ ] No, lo hago yo manualmente.

**Respuesta:**

### I2. Forma de trabajo con Git

- [] ⭐ Una rama por fase (ej. `feat/supabase-auth`) y merge a `main` al validar.
- [x] Trabajar directamente sobre `main`.
- [ ] ¿Subir los cambios a GitHub (push)? Sí / No:

**Respuesta:**

---

## Ya definido

| Tema | Decisión |
|---|---|
| Backend / persistencia | Supabase |
| Íconos | `lucide-react` |
| Pruebas | Automatizadas (Vitest + Testing Library) + manuales |

---

## Siguiente paso

Cuando completes este documento, se preparará:

1. **Guía de configuración de Supabase**: creación del proyecto, claves y `.env`, esquema SQL, políticas RLS, Storage y Auth.
2. **Plan de trabajo por fases**, con entregables y criterios de aceptación.
