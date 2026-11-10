# Auditoría Integral de Calidad — EduResuelve Frontend
**Fecha:** 28/10/2026 | **Auditor:** Antigravity | **Rama:** `main`

---

## 1. Resumen ejecutivo

El frontend de EduResuelve se encuentra en un estado funcional para el flujo principal de gestión de incidencias. La arquitectura es coherente con el alcance mock/frontend declarado: React + Vite + TypeScript + Tailwind CSS v4 + React Router + estado compartido mediante React Context y useReducer, sin dependencias externas de gestión de estado.

Las reglas de negocio RN-001 a RN-008 tienen implementaciones parciales o completas en el frontend. Las reglas RN-009 y RN-010 son estructuralmente débiles por diseño en esta etapa (sin backend real). La auditoría identificó **26 hallazgos** distribuidos entre problemas críticos, altos, medios y bajos, ninguno de los cuales bloquea el funcionamiento actual, pero varios sí bloquean la futura integración segura con el backend.

**Estado general: ACEPTABLE para prototipo académico. Requiere correcciones antes de integrar backend.**

---

## 2. Estado del repositorio

- **Rama activa:** `main` — sincronizada con `origin/main`
- **Estado Git inicial (verificado por comando):**

| Tipo | Archivos |
|---|---|
| Modificados sin stagear | `package.json`, `package-lock.json`, `App.tsx`, `index.css`, `vite.config.ts` |
| Eliminados sin stagear | `App.css`, `assets/react.svg`, `assets/vite.svg`, `assets/hero.png` |
| Sin seguimiento (untracked) | Todo el trabajo nuevo: `src/components/`, `src/data/`, `src/features/`, `src/hooks/`, `src/layouts/`, `src/pages/`, `src/routes/`, `src/services/`, `src/store/`, `src/types/`, `src/utils/` |
| Sin seguimiento (raíz) | `Contexto_EduResuelve_Antigravity.txt` |

> [!WARNING]
> Todo el código del proyecto está **sin confirmar en Git**. Si se pierde el árbol de trabajo o se hace un `git checkout` sin stagear, se perdería todo el desarrollo. Se recomienda hacer al menos un commit local o un stash con descripción antes de continuar.

---

## 3. Inventario de módulos y rutas

| Ruta | Archivo | Estado |
|---|---|---|
| `/` → `/login` | `AppRouter.tsx` L21 | ✅ Implementada |
| `/login` | `LoginPage.tsx` | ✅ Visual solamente — sin autenticación real |
| `/dashboard` | `DashboardPage.tsx` | ✅ Implementada — lee estado compartido |
| `/incidencias` | `IncidentsPage.tsx` | ✅ Implementada con filtros |
| `/incidencias/nueva` | `NewIncidentPage.tsx` | ⚠️ Parcial — formulario válido pero no persiste |
| `/incidencias/:id` | `IncidentDetailPage.tsx` | ✅ Implementada |
| `/incidencias/:id/seguimiento` | `IncidentFollowUpPage.tsx` | ✅ Implementada con RN-004/007/008 |
| `/incidencias/:id/evidencias` | `IncidentEvidencePage.tsx` | ⚠️ Parcial — estado local, no compartido |
| `/incidencias/:id/resolucion` | `IncidentResolutionPage.tsx` | ✅ Implementada con RN-005 |
| `/incidencias/:id/cierre` | `IncidentClosurePage.tsx` | ✅ Implementada con RN-006 |
| `/usuarios` | `UsersPage.tsx` | ✅ Implementada (listado/CRUD mock) |
| `/auditoria` | `AuditPage.tsx` | ⚠️ Parcial — datos estáticos no conectados al estado |
| Rutas desconocidas (comodín) | `AppRouter.tsx` | ❌ Ausente — no hay ruta `*` |

**Menú de navegación (`MainLayout.tsx`):** "Seguimiento" y "Evidencias" aparecen como `pending: true` (deshabilitados), aunque sus rutas sí existen y funcionan desde el detalle. Inconsistencia leve de UX.

---

## 4. Matriz de reglas de negocio RN-001 a RN-010

### RN-001 — Toda incidencia comienza en "Nuevo"

| Campo | Detalle |
|---|---|
| **Estado** | ✅ Implementada |
| **Evidencia** | `NewIncidentPage.tsx` L339: aviso visual de estado inicial "Nuevo". `mockIncidents.ts` L324/341/358/376/394: todos los fixtures inician con el estado correcto según su historial. |
| **Brecha** | El formulario de nueva incidencia no crea realmente el objeto en el estado compartido (`IncidentSessionProvider`). Al enviar, solo muestra un mensaje informativo (L98–100). El nuevo incidente **no aparece en el listado ni en el dashboard**. |
| **Recomendación** | Implementar `recordNewIncident` en el provider/reducer para agregar el incidente con estado "Nuevo" al estado compartido. |

### RN-002 — Revisar antes de asignar, resolver o descartar

| Campo | Detalle |
|---|---|
| **Estado** | ✅ Implementada (estructura) |
| **Evidencia** | `incidentSession.ts` L11–19: `incidentTransitions` define que solo desde "En revisión" se puede pasar a "Asignado" o "Descartado". El reducer (L68–74) valida la transición antes de aplicarla. |
| **Brecha** | Solo a nivel de provider/reducer. No existe ruta específica `/incidencias/:id/revision` — la transición se maneja desde la pantalla de seguimiento genérica. No hay validación de que la incidencia fue efectivamente revisada (solo se valida el estado). |
| **Recomendación** | Sin acción inmediata para la etapa actual. Para backend: requiere regla de servicio explícita. |

### RN-003 — Cambios de estado registran usuario, fecha/hora, estado anterior y nuevo

| Campo | Detalle |
|---|---|
| **Estado** | ✅ Implementada |
| **Evidencia** | `IncidentSessionProvider.tsx` L44–58: el `FollowUp` generado incluye `date`, `time`, `user`, `previousStatus`, `newStatus`. `incidentSession.ts` L61–96: el reducer actualiza `updatedAt`. |
| **Brecha** | El campo `user` está fijo como `'Usuario de prueba'` (L107, L121, L137, L158). No hay usuario autenticado real. Para resolución y cierre, el usuario proviene del objeto del formulario pero sigue siendo `'Usuario de prueba'`. |
| **Recomendación** | Sin acción inmediata. Para backend: integrar con el sistema de autenticación real. |

### RN-004 — Asignación requiere responsable válido

| Campo | Detalle |
|---|---|
| **Estado** | ✅ Implementada |
| **Evidencia** | `IncidentSessionProvider.tsx` L92–113: valida `responsibleUserId` en `mockUsers`, estado "Activo" y rol en `incidentResponsibleRoles`. `IncidentFollowUpPage.tsx` L369–438: selector de responsables filtrado. `user.ts` L8–13: roles permitidos excluyen "Estudiante". |
| **Brecha** | Usa `mockUsers` directamente importado en el provider, no el estado compartido. Si los usuarios cambiaran en sesión, el provider no lo reflejaría. Para backend: el responsable debe validarse en el servidor. |
| **Recomendación** | Sin acción inmediata para etapa mock. Documentar como deuda técnica. |

### RN-005 — Resolución requiere información suficiente

| Campo | Detalle |
|---|---|
| **Estado** | ✅ Implementada |
| **Evidencia** | `IncidentResolutionPage.tsx` L122–137: valida `summary`, `actions`, `outcome`, `resolutionDate` (todos obligatorios). `IncidentSessionProvider.tsx` L126–140: valida estado "En atención" y que no exista resolución previa. |
| **Brecha** | No hay validación de longitud mínima para los campos de texto (solo longitud máxima). Un espacio en blanco seguido de texto mínimo pasaría el `trim()`. No hay campo "acciones recomendadas futuras". El campo "observaciones" es opcional — aceptable según la especificación. |
| **Recomendación** | Añadir longitud mínima (ej. 10 caracteres) a los campos obligatorios de resolución. |

### RN-006 — Cierre requiere información suficiente y autorización

| Campo | Detalle |
|---|---|
| **Estado** | ⚠️ Parcialmente implementada |
| **Evidencia** | `IncidentClosurePage.tsx` L84: valida estado "Resuelto" y ausencia de cierre previo. L87–95: requiere checkbox de confirmación. `IncidentSessionProvider.tsx` L142–161: valida estado "Resuelto" y presencia de resolución. |
| **Brecha** | La "autorización" es un checkbox local sin validación real de permisos (reconocido en el código L324–325). No se valida que la información de resolución sea cualitativamente suficiente — solo que exista el objeto `resolution`. |
| **Recomendación** | Sin cambio inmediato. Para backend: implementar guard de autorización real (rol mínimo: Orientador o Administrador). |

### RN-007 — Descarte exige motivo obligatorio

| Campo | Detalle |
|---|---|
| **Estado** | ✅ Implementada |
| **Evidencia** | `IncidentFollowUpPage.tsx` L87–90: detecta `isDiscarding`. L109–111: valida `reason` vacío con mensaje específico. L133: pasa `reason` separado a `recordFollowUp`. Provider L86–89: valida `reason.trim()` antes de aplicar. `FollowUp.reason` se guarda en el evento. Historial en `IncidentFollowUpPage.tsx` L246–253: muestra `reason` con prefijo "Motivo:". |
| **Brecha** | El campo de observación genérica sigue siendo obligatorio para el descarte (puede ser una frase cualquiera como "ver motivo"). Esto es aceptable en el prototipo pero genera datos duplicados en el registro. |
| **Recomendación** | Evaluar si la observación genérica debe seguir siendo obligatoria durante descarte o puede ser opcional cuando existe motivo. |

### RN-008 — Reapertura exige autorización y motivo

| Campo | Detalle |
|---|---|
| **Estado** | ✅ Implementada (motivo). Autorización: no implementada (por diseño). |
| **Evidencia** | `IncidentFollowUpPage.tsx` L89–90: detecta `isReopening`. L109–111: valida `reason`. Provider L86–89: valida motivo. `incidentSession.ts` L17: `Cerrado: ['En revisión']` permite la transición. |
| **Brecha** | La "autorización" no está implementada — reconocido como pendiente. La estructura del `FollowUp` sí está preparada para recibir `reason`. No hay campo `authorizedBy` en el `FollowUp`. |
| **Recomendación** | Para backend: crear campo `authorizedBy` en el evento de reapertura. Implementar guard de rol (solo Administrador u Orientador pueden reabrir). |

### RN-009 — No modificar ni eliminar silenciosamente el historial

| Campo | Detalle |
|---|---|
| **Estado** | ⚠️ Riesgo identificado |
| **Evidencia** | El reducer solo agrega eventos al array (`followUps: [...state.followUps, action.followUp]`). No hay operación de eliminación de `FollowUp` en el estado compartido. |
| **Brecha** | **`IncidentEvidencePage.tsx` L157–162**: existe función `handleDelete` que elimina evidencias sin confirmación y sin registrar el evento en el historial de seguimiento. Las evidencias tienen estado **local** (no comparten el `IncidentSessionProvider`), lo que significa que: (a) no se reflejan en el historial, y (b) pueden eliminarse silenciosamente. Además, `AuditPage` usa `mockAuditLogs` estáticos, no el estado de sesión — las acciones de la sesión actual no se registran en auditoría. |
| **Recomendación** | Agregar confirmación antes de eliminar evidencias. Conectar las eliminaciones al historial de la incidencia. Para backend: implementar soft-delete con registro de auditoría. |

### RN-010 — Transiciones dependen del rol y contexto autorizado

| Campo | Detalle |
|---|---|
| **Estado** | ⚠️ Parcialmente implementada |
| **Evidencia** | `incidentTransitions` define las transiciones permitidas centralmente. Para asignación (RN-004): se filtra por rol. Para otras transiciones (descarte, reapertura, resolución, cierre): no hay validación de rol. |
| **Brecha** | Cualquier usuario puede descartar, reabrir, resolver o cerrar una incidencia. No existe sesión de usuario real. El `user` en todos los eventos es fijo: `'Usuario de prueba'`. |
| **Recomendación** | Para backend: implementar guards de autorización por rol en cada transición. En el frontend: preparar el contexto de sesión para recibir el rol del usuario autenticado. |

---

## 5. Auditoría y trazabilidad

### 5.1 Inconsistencias confirmadas en `mockAuditLogs.ts`

| ID | Hallazgo | Confirmado |
|---|---|---|
| **AUD-001** | `userId: 'USR-0005'` (Estela Inventada, Responsable de convivencia) tiene `userName: 'Usuario de prueba'` en registros AUD-2026-0015 y AUD-2026-0010. | ✅ Confirmado — líneas 7–8 y 57–58 |
| **AUD-002** | `userId: 'USR-0004'` (Damián Simulado, Docente, Inactivo) tiene `userName: 'Usuario de prueba'` en AUD-2026-0014 y AUD-2026-0004. | ✅ Confirmado — líneas 17–18, 107–108 |
| **AUD-003** | `userId: 'USR-0006'` (Fabián Imaginario, Orientador) tiene `userName: 'Coordinación de prueba'` en AUD-2026-0008 y AUD-2026-0007. | ✅ Confirmado — líneas 77–78, 87–88 |
| **AUD-004** | `userId: 'USR-0007'` (Greta Demostración, Administrador) tiene `userName: 'Orientación de prueba'` en AUD-2026-0003. | ✅ Confirmado — líneas 127–128 |
| **AUD-005** | `userId: 'USR-0008'` (Hugo Prototipo, Administrador, **Inactivo**) aparece como el que inicia sesión en AUD-2026-0011 y AUD-2026-0001. Un usuario inactivo no debería poder autenticarse. | ✅ Confirmado — líneas 47–48, 147–148 |
| **AUD-006** | AUD-2026-0006 registra reapertura de ER-2026-0004 (timestamp: 2026-09-30). Pero los FollowUps de ER-2026-0004 llegan hasta "Cerrado" el 2026-09-22 y el fixture tiene estado actual "Cerrado". La reapertura en auditoría no tiene correspondencia en el historial de incidencias. | ✅ Confirmado — `mockAuditLogs.ts` L95–103, `mockIncidents.ts` L370–386 |
| **AUD-007** | Los timestamps de auditoría son de octubre 2026 (2026-10-01 a 2026-10-02), mientras que los FollowUps de incidencias son de septiembre 2026. Los registros de auditoría son **posteriores a los eventos** que supuestamente los generaron, pero son estáticos y no conectados. | ✅ Confirmado |

### 5.2 Riesgos de trazabilidad adicionales

| ID | Hallazgo | Riesgo |
|---|---|---|
| **AUD-008** | `AuditPage` lee `mockAuditLogs` estático. Las acciones realizadas en sesión (transiciones, resoluciones, cierres, evidencias) **no se registran en auditoría**. | Alto |
| **AUD-009** | `IncidentEvidencePage` tiene estado local independiente (`useState`). Las evidencias no se comparten con `IncidentSessionProvider`. Un cambio de incidencia y regreso no conserva las nuevas evidencias agregadas en sesión. | Medio |
| **AUD-010** | Los usuarios nombrados en `mockFollowUps` (María Torres, Javier Rojas, Lucía Vega, Elena Cruz) **no existen en `mockUsers`**. Solo existen como strings en las observaciones. | Medio |

### 5.3 Coherencia entre entidades

| Relación | Estado |
|---|---|
| `responsibleUserId` en incidents vs `mockUsers` | ✅ Coherente: USR-0003, USR-0006, USR-0007 existen y están activos |
| `responsibleUserId` en FollowUps vs `mockUsers` | ✅ Coherente: USR-0003, USR-0006, USR-0007 existen |
| `incidentId` en FollowUps vs incidents | ✅ Coherente: todos los `incidentId` en mockFollowUps corresponden a fixtures existentes |
| `incidentId` en evidencias vs incidents | ✅ Coherente: 1 evidencia por cada fixture |
| `incidentId` en resoluciones/cierres vs incidents | ✅ Coherente: ER-2026-0004 y ER-2026-0005 tienen resolución; solo ER-2026-0004 tiene cierre |
| Estados de fixtures vs historial de followUps | ✅ Los estados finales de los fixtures corresponden al último FollowUp de cada incidencia |

---

## 6. Calidad técnica y UX

### 6.1 Problemas confirmados

| ID | Prioridad | Archivo | Descripción | Impacto |
|---|---|---|---|---|
| **AUD-011** | Alta | `IncidentsPage.tsx` L6–14 | El filtro de estado **omite "Descartado"** del array `statuses`. Una incidencia descartada en sesión no puede filtrarse. El `statusStyles` sí lo incluye. | Funcional |
| **AUD-012** | Alta | `NewIncidentPage.tsx` L4–15 | Define tipos locales `IncidentCategory` y `IncidentPriority` como unions locales con `''`, en lugar de importar los tipos centrales de `incident.ts`. Si los tipos centrales cambian, este formulario queda desincronizado silenciosamente. | Mantenimiento |
| **AUD-013** | Alta | `AppRouter.tsx` | No existe ruta comodín `*`. Una URL desconocida como `/incidencias/inexistente/abc` puede navegar a componentes con `id` `undefined` y mostrar "Incidencia no encontrada", o simplemente renderizar vacío. | UX/Seguridad |
| **AUD-014** | Alta | `NewIncidentPage.tsx` L98–100 | El formulario de nueva incidencia **no agrega la incidencia al estado compartido**. Solo muestra un mensaje. Los datos del formulario se pierden tras enviar. | Funcional crítico |
| **AUD-015** | Media | `index.html` L2 | `lang="en"` — la UI está completamente en español. Impacta accesibilidad y SEO. | Accesibilidad |
| **AUD-016** | Media | `index.html` L7 | `<title>frontend</title>` — el título de la pestaña del navegador es "frontend" en lugar de "EduResuelve". | UX |
| **AUD-017** | Media | Múltiples páginas | `statusStyles`, `priorityStyles`, `dateTimeFormatter`, `dateFormatter`, `fieldClassName`, `DetailItem` se **duplican en 6+ archivos** (`IncidentFollowUpPage`, `IncidentDetailPage`, `IncidentResolutionPage`, `IncidentClosurePage`, `IncidentEvidencePage`, `DashboardPage`). | Mantenimiento |
| **AUD-018** | Media | `MainLayout.tsx` L10–11 | "Seguimiento" y "Evidencias" aparecen como entradas deshabilitadas en el menú, aunque sus rutas funcionen desde el detalle de incidencia. Genera confusión sobre qué está disponible. | UX |
| **AUD-019** | Media | `IncidentEvidencePage.tsx` L157–162 | `handleDelete` elimina evidencias sin confirmación de usuario y sin registrar el evento. Viola el espíritu de RN-009. | Trazabilidad |
| **AUD-020** | Media | `IncidentDetailPage.tsx` L220–223 | Texto estático: "Las acciones de gestión estarán disponibles cuando se implemente el backend." Los botones de acción sí están disponibles (Ver evidencias, Ver seguimiento, etc.). El texto es incorrecto/desactualizado. | UX |
| **AUD-021** | Baja | `AuditPage.tsx` L321–358 | El diálogo de detalle implementa `role="dialog"` y `aria-modal`, y tiene Escape para cerrar. Sin embargo, **no implementa trampa de foco** (focus trap): al abrir, el foco se mueve al botón "Cerrar" (`closeButtonRef.current?.focus()`), pero el usuario puede salir con Tab y alcanzar el fondo bloqueado. | Accesibilidad |
| **AUD-022** | Baja | `IncidentFollowUpPage.tsx` | La validación de descarte/reapertura requiere también que la "Observación" (campo general) esté llena. Para descarte/reapertura, esto genera doble entrada redundante. | UX |
| **AUD-023** | Baja | `DashboardPage.tsx` L131–138 | Las tarjetas de resumen no incluyen contadores de "Nuevo" y "Descartado". Hay 6 tarjetas: Total, En revisión, Asignadas, En atención, Resueltas, Cerradas. Los estados "Nuevo" y "Descartado" solo aparecen en la distribución inferior. | UX |
| **AUD-024** | Baja | Todos los archivos con `min-w-[Xpx]` | Las tablas usan `overflow-x-auto` con `min-w-[760px]` o `min-w-[820px]`. Funciona en móvil con scroll horizontal, pero puede ser difícil de navegar. No es un error, pero merece revisión para pantallas pequeñas. | UX móvil |
| **AUD-025** | Baja | `src/features/` | Los 8 subdirectorios de `features/` (assignments, audit, auth, dashboard, evidence, follow-up, incidents, users) solo contienen `.gitkeep`. La estructura está reservada pero vacía. | Organización |
| **AUD-026** | Baja | `package.json` | No existe script `test` en `package.json`. No hay pruebas automatizadas de ningún tipo. | Calidad |

---

## 7. Verificaciones ejecutadas

| Verificación | Método | Resultado |
|---|---|---|
| `git status` | Comando ejecutado | Reportado en sección 2 |
| `npm run build` | Comando ejecutado | ✅ `built in 827ms`, 0 errores TypeScript, 0 errores de compilación |
| `npm run lint` | Comando ejecutado | ✅ Sin errores ni advertencias (salida vacía) |
| Pruebas automatizadas | Revisión de `package.json` | ❌ No existen — sin script `test` |
| Verificación en navegador | No ejecutada | No verificado manualmente |
| Pruebas de reglas de negocio | Lectura de código | Verificado mediante lectura — no mediante ejecución |

---

## 8. Lista priorizada de problemas

### Crítico

| ID | Problema | Justificación |
|---|---|---|
| AUD-014 | `NewIncidentPage` no persiste en estado compartido | Una funcionalidad central (registrar incidencias) no funciona en sesión |

### Alto

| ID | Problema | Justificación |
|---|---|---|
| AUD-011 | Filtro "Descartado" ausente en `IncidentsPage` | Impide encontrar incidencias descartadas durante la sesión |
| AUD-012 | Tipos locales duplicados en `NewIncidentPage` | Riesgo de divergencia silenciosa con tipos centrales |
| AUD-013 | Sin ruta comodín en `AppRouter` | URLs no existentes no tienen manejo adecuado |
| AUD-001–007 | Inconsistencias en `mockAuditLogs` | `userId`/`userName` no coinciden; usuario inactivo autentica; reapertura sin FollowUp correspondiente |
| AUD-008 | Acciones de sesión no se registran en auditoría | La auditoría muestra solo datos estáticos — los eventos reales no se tracen |

### Medio

| ID | Problema | Justificación |
|---|---|---|
| AUD-015 | `lang="en"` en HTML | Impacto en accesibilidad y SEO |
| AUD-016 | Título `<title>frontend</title>` | Impacto en identidad y UX |
| AUD-017 | Código duplicado en múltiples páginas | Riesgo de inconsistencias al actualizar estilos o formatters |
| AUD-018 | Menú con ítems deshabilitados innecesariamente | Confunde sobre la disponibilidad de funcionalidades |
| AUD-019 | Eliminación de evidencias sin confirmación ni registro | Viola RN-009 parcialmente |
| AUD-020 | Texto desactualizado en `IncidentDetailPage` | Genera confusión sobre el estado del sistema |
| AUD-009 | Estado de evidencias no compartido | Las evidencias agregadas en sesión no persisten entre navegaciones |
| AUD-010 | Usuarios en FollowUps no existen en `mockUsers` | Falta coherencia referencial en los datos de demostración |

### Bajo

| ID | Problema | Justificación |
|---|---|---|
| AUD-021 | Sin trampa de foco completa en diálogo de auditoría | Accesibilidad: usuario puede salir del diálogo con Tab |
| AUD-022 | Campo "Observación" obligatorio también en descarte/reapertura | Doble entrada redundante |
| AUD-023 | "Nuevo" y "Descartado" ausentes en tarjetas del Dashboard | Resumen incompleto de estados |
| AUD-024 | Tablas con scroll horizontal en móvil | UX reducida en pantallas pequeñas |
| AUD-025 | Directorios `features/` vacíos | Organización planificada pero sin implementación |
| AUD-026 | Sin script de pruebas automatizadas | No hay cobertura de reglas de negocio verificable |

---

## 9. Plan de trabajo recomendado

Los bloques están ordenados por dependencias. Cada bloque debe completarse, revisarse y aprobarse antes de iniciar el siguiente.

### Bloque A — Correcciones de HTML y metadatos (Bajo/Medio, aisladas)
1. Corregir `lang="en"` → `lang="es"` en `index.html`
2. Corregir `<title>frontend</title>` → `<title>EduResuelve</title>`
3. Corregir texto desactualizado en `IncidentDetailPage.tsx` L220–223

### Bloque B — Correcciones de datos mock (Medio, aisladas)
4. Corregir inconsistencias en `mockAuditLogs.ts`: alinear `userId`/`userName`, eliminar o corregir entrada de usuario inactivo, revisar el registro de reapertura sin FollowUp correspondiente

### Bloque C — Filtros y navegación (Alto/Medio)
5. Agregar "Descartado" al array `statuses` en `IncidentsPage.tsx`
6. Agregar ruta comodín `*` en `AppRouter.tsx` (redirigir a `/dashboard` o a página 404)
7. Corregir ítems de menú en `MainLayout.tsx`: activar "Seguimiento" y "Evidencias" como enlaces reales, o eliminarlos del menú principal

### Bloque D — Tipos centrales (Alto)
8. Corregir `NewIncidentPage.tsx` para importar `IncidentCategory` e `IncidentPriority` desde `types/incident.ts` en lugar de redefinirlos localmente

### Bloque E — Funcionalidad de registro de incidencias (Crítico)
9. Implementar `recordNewIncident` en `IncidentSessionProvider`/reducer
10. Conectar el formulario de `NewIncidentPage` al estado compartido (con estado inicial "Nuevo", código generado, timestamp)

### Bloque F — Evidencias y trazabilidad (Medio)
11. Mover el estado de evidencias al `IncidentSessionProvider` o a un contexto propio, para que persistan durante la sesión SPA
12. Agregar confirmación antes de eliminar evidencias
13. Registrar eliminación de evidencias en el historial de la incidencia

### Bloque G — Consolidación de código duplicado (Medio)
14. Extraer `statusStyles`, `priorityStyles`, `fieldClassName` a un archivo central en `src/utils/` o `src/components/`
15. Extraer `dateTimeFormatter` y `dateFormatter` a `src/utils/`
16. Extraer `DetailItem` a `src/components/`

### Bloque H — Dashboard y UX (Bajo/Medio)
17. Agregar tarjetas para "Nuevo" y "Descartado" en `DashboardPage`
18. Evaluar si el campo "Observación" debe seguir siendo obligatorio durante descarte/reapertura

### Bloque I — Pruebas y scripts (Bajo)
19. Crear al menos un script de prueba básico en `package.json` (aunque sea `vitest` con un caso de prueba del reducer)

---

## 10. Preparación para el backend

Las siguientes condiciones deben cumplirse (o documentarse como decisiones técnicas) antes de iniciar la integración con NestJS y PostgreSQL:

### Bloqueantes

| # | Condición | Estado actual |
|---|---|---|
| B1 | Definir el modelo de autenticación y cómo el frontend enviará el token (JWT en header/cookie) | Sin definir |
| B2 | Normalizar los tipos TypeScript del frontend para que coincidan con los DTOs que el backend generará | Tipos parcialmente dispersos (AUD-012) |
| B3 | Decidir si `IncidentEvidencePage` subirá archivos reales al backend o solo metadatos | Actualmente solo metadatos sin upload |
| B4 | Definir qué registros de auditoría genera el backend (server-side) vs. cuáles genera el frontend | El módulo de auditoría actual es estático y manual |
| B5 | Implementar un contexto de sesión real que exponga el usuario autenticado, su rol y su `userId` | Actualmente todo usa `'Usuario de prueba'` fijo |

### Recomendaciones previas a integración

| # | Recomendación |
|---|---|
| R1 | Completar los Bloques A–E del plan de trabajo antes de iniciar el backend |
| R2 | Centralizar todos los tipos de incidencia, usuario y auditoría en `src/types/` y usarlos consistentemente |
| R3 | Diseñar una capa de servicios en `src/services/` que abstraiga las llamadas HTTP, para que los componentes no llamen a `fetch` directamente |
| R4 | Las reglas RN-002, RN-005, RN-006, RN-010 deben reimplementarse como guards en el backend — las validaciones del frontend son insuficientes como barrera de seguridad |
| R5 | El historial de FollowUp debe tener integridad en base de datos (sin DELETE, solo INSERT). El backend debe rechazar cualquier intento de modificar registros de seguimiento |
| R6 | Implementar autorización real por rol para: descarte (¿quién puede?), reapertura (¿quién puede?), cierre (¿quién puede?) |
| R7 | Las evidencias deberán tener carga real de archivos — diseñar el endpoint de upload antes de asumir que el frontend solo envía metadatos |
| R8 | Hacer al menos un commit Git antes de iniciar el backend para proteger el estado actual del frontend |

---

*Informe generado exclusivamente mediante lectura de código y comandos de solo lectura. Ningún archivo fue modificado durante esta auditoría.*
