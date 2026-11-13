# Mediciones de calidad — EduResuelve

**Fecha:** 13 de noviembre de 2026 · **Versión medida:** `main` (commit `08893ae`) · **Producción:** <https://eduresuelve.vercel.app>
**Modelo de referencia:** ISO/IEC 25010 (características de calidad del producto) · **Fase del proyecto:** 6 (métricas) y 13 (herramientas)

Las evidencias están en [`evidencias/`](evidencias/). Todas las mediciones se pueden repetir con los comandos indicados
(desde la carpeta `frontend/`).

---

## Resumen

| Característica (ISO/IEC 25010) | Atributo | Indicador | Meta | Resultado | ¿Cumple? |
|---|---|---|---|---|---|
| Eficiencia de desempeño | Tiempo de respuesta (uso real) | % de operaciones < 3 s (RNF-001) | ≥ 95 % | **100 %** (377 mediciones, p95 0,92 s) | ✅ |
| Eficiencia de desempeño | Tiempo de carga | LCP en celular (Lighthouse) | ≤ 2,5 s | **0,76–1,72 s** | ✅ |
| Eficiencia de desempeño | Capacidad | Errores con 25 usuarios simultáneos | 0 % | **0 %** (1.106 peticiones, p95 227 ms) | ✅ |
| Eficiencia de desempeño | Puntaje global | Lighthouse Rendimiento | ≥ 90 | **97–100** | ✅ |
| Usabilidad | Accesibilidad | Infracciones WCAG 2.2 AA (axe) | 0 | **0** en 34 pantallas/temas (antes: 107 elementos) | ✅ |
| Usabilidad | Accesibilidad | Lighthouse Accesibilidad | ≥ 90 | **100** en las 12 mediciones (antes: 93–97) | ✅ |
| Compatibilidad | Coexistencia entre navegadores | Pruebas E2E aprobadas por navegador | 100 % | **100 %** en Chrome, Edge, Firefox y Safari (WebKit) | ✅ |
| Seguridad | Configuración | Avisos de seguridad de Supabase sin justificar | 0 | **0** (15 corregidos; el resto es intencional) | ✅ |
| Seguridad | Dependencias | Vulnerabilidades en producción (`npm audit`) | 0 | **0** | ✅ |
| Mantenibilidad | Capacidad de prueba | Cobertura de líneas (pruebas unitarias del frontend) | ≥ 60 % | **13,7 %** | ❌ |
| Mantenibilidad | Modularidad | Funciones con complejidad ciclomática > 10 | ≤ 10 | **25** (máx. 38) | ❌ |
| Mantenibilidad | Análisis estático | Problemas de ESLint | 0 | **0** | ✅ |
| Adecuación funcional | Corrección | Pruebas automatizadas aprobadas | 100 % | **100 %** (101 Vitest + 47 E2E) | ✅ |

**Interpretación general:** el sistema cumple con holgura las metas de rendimiento, accesibilidad, compatibilidad y
seguridad. Los incumplimientos están en **mantenibilidad** (pocas pruebas unitarias del frontend y componentes
demasiado complejos): no afectan hoy a quien usa el sistema, pero encarecen los cambios futuros. Ambos pasan al plan
de mejora.

---

## 1. Accesibilidad automática — axe-core

| | |
|---|---|
| **Herramienta** | axe-core 4.14 mediante `@axe-core/playwright` 4.14 |
| **Objetivo** | Detectar incumplimientos de WCAG 2.2 niveles A y AA (Usabilidad → Accesibilidad) |
| **Procedimiento** | Prueba E2E `tests/e2e/accesibilidad.spec.ts`: recorre 17 pantallas (públicas, del Administrador y del Estudiante) en tema claro y oscuro = 34 auditorías. Se ejecuta en cada `push` (GitHub Actions). Comando: `npx playwright test accesibilidad` |
| **Evidencias** | [`axe-antes.json`](evidencias/axe-antes.json), [`axe-despues.json`](evidencias/axe-despues.json) |

**Resultados**

| Regla | Impacto | Antes (pantallas / elementos) | Después |
|---|---|---|---|
| `color-contrast` — contraste de texto insuficiente | Grave | 30 / 83 | 0 |
| `label-content-name-mismatch` — el nombre accesible no contiene el texto visible | Grave | 2 / 16 | 0 |
| `target-size` — objetivo táctil menor a 24 px | Grave | 2 / 4 | 0 |
| `aria-required-attr` — `role="meter"` sin `aria-valuenow` | Crítico | 2 / 4 | 0 |
| **Total** | | **31 de 34 auditorías con problemas · 107 elementos** | **0** |

**Problemas encontrados y corrección**

1. El color de texto secundario `#64748b` daba 4,34:1 sobre el fondo gris (mínimo 4,5:1). Se cambió a `#5b6b80` (≥ 4,9:1 sobre todas las superficies claras).
2. El botón principal en tema oscuro (blanco sobre `emerald-600`) daba 3,77:1. Se usa `emerald-700` (5,48:1).
3. En Usuarios, el botón visible "Clave" se anunciaba como "Restablecer contraseña de…": quien usa control por voz no podía activarlo diciendo lo que ve. Ahora es "Restablecer clave de…".
4. En el panel de calidad, las barras sin datos declaraban `role="meter"` sin valor, y los enlaces a casos medían menos de 24 px.

**Interpretación:** los problemas eran sistemáticos (dos colores base), por eso afectaban a casi todas las pantallas;
al corregir los tokens de diseño se resolvieron en todas a la vez. La prueba queda como **control permanente**: si un
cambio futuro rompe la accesibilidad, GitHub Actions lo marca en rojo.

---

## 2. Rendimiento, accesibilidad, buenas prácticas y SEO — Lighthouse

| | |
|---|---|
| **Herramienta** | Lighthouse 13.6 (Google), ejecutado con Chromium sin interfaz |
| **Objetivo** | Medir la versión publicada: rendimiento de carga (Core Web Vitals), accesibilidad, buenas prácticas y SEO |
| **Procedimiento** | `npm run measure:lighthouse` (`scripts/lighthouse.mjs`): 6 pantallas × 2 perfiles (escritorio y celular con red 4G lenta y CPU 4× más lenta simuladas). Las pantallas privadas se miden con sesión de Administrador. Se midió **antes** y **después** de corregir los hallazgos. |
| **Evidencias** | Informes HTML y resumen: [`lighthouse/antes/`](evidencias/lighthouse/antes/), [`lighthouse/despues/`](evidencias/lighthouse/despues/) |

**Resultados (después)**

| Perfil | Pantalla | Rendimiento | Accesibilidad | Buenas prácticas | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|---|
| Escritorio | Login | 99 | 100 | 100 | 100 | 0,60 s | 0 | 59 ms |
| Escritorio | Verificar acta | 100 | 100 | 100 | 100 | 0,21 s | 0 | 0 ms |
| Escritorio | Inicio | 100 | 100 | 100 | 63* | 0,61 s | 0 | 0 ms |
| Escritorio | Incidencias | 100 | 100 | 100 | 63* | 0,61 s | 0 | 0 ms |
| Escritorio | Detalle | 100 | 100 | 100 | 63* | 0,60 s | 0 | 0 ms |
| Escritorio | Calidad | 100 | 100 | 100 | 63* | 0,62 s | 0 | 0 ms |
| Celular | Login | 100 | 100 | 100 | 100 | 0,76 s | 0 | 14 ms |
| Celular | Verificar acta | 100 | 100 | 100 | 100 | 0,76 s | 0 | 0 ms |
| Celular | Inicio | 99 | 100 | 100 | 63* | 1,71 s | 0 | 94 ms |
| Celular | Incidencias | 98 | 100 | 100 | 63* | 1,72 s | 0 | 145 ms |
| Celular | Detalle | 100 | 100 | 100 | 63* | 1,70 s | 0 | 21 ms |
| Celular | Calidad | 97 | 100 | 100 | 63* | 1,72 s | 0 | 188 ms |

\* **SEO 63 por diseño:** `robots.txt` impide indexar las pantallas internas (información de la institución, requieren
sesión). Para un sistema interno esto es lo correcto; solo el login y la verificación pública deben aparecer en
buscadores, y ambas obtienen 100.

**Antes → después:** Accesibilidad 93–97 → **100**; SEO de páginas públicas 91 → **100**.

**Problemas encontrados**

| Hallazgo | Estado |
|---|---|
| Contraste y tamaño de objetivos (igual que axe) | ✅ Corregido |
| `robots.txt` inválido: no existía y Vercel devolvía el HTML de la app | ✅ Corregido (`public/robots.txt`) |
| JavaScript sin usar en el login (se descarga el código de todas las pantallas) | ⏳ Plan de mejora: carga por rutas (*code splitting*) |
| La hoja de estilos bloquea el renderizado | Aceptado: es una sola hoja de 9 KB comprimida; no afecta el puntaje |
| *bf-cache* (caché de navegación atrás/adelante) | Falso positivo: Lighthouse indica *"Not actionable"*; está desactivado por el modo automatizado de Chrome |

**Interpretación:** todas las pantallas cargan su contenido principal en menos de 1,8 s incluso en un celular con red
lenta (la referencia de Google para "bueno" es 2,5 s) y no hay saltos de diseño (CLS 0).

---

## 3. Tiempos de respuesta en uso real — instrumentación propia (RNF-001)

| | |
|---|---|
| **Herramienta** | Medición en el navegador integrada en la app (`src/lib/perf.ts`) + función `perf_stats` |
| **Objetivo** | Verificar el requerimiento RNF-001: "el sistema deberá responder en menos de 3 segundos" |
| **Procedimiento** | Cada operación se mide desde que la app la pide hasta que recibe la respuesta (lo que espera la persona) y se envía de forma anónima. Se consulta en el **Panel de calidad → Tiempos de respuesta**. |
| **Evidencias** | Panel de calidad (exportable a PDF) |

**Resultados (12–13 nov. 2026, uso real en desarrollo y producción):** 377 mediciones · mediana **233 ms** ·
percentil 95 **923 ms** · máximo 1,54 s · **100 % en menos de 3 s** · 0 % de errores. Carga de la página: p95 979 ms.

**Interpretación:** cumple RNF-001 con amplio margen (el 95 % de las operaciones tarda menos de un tercio del límite).

---

## 4. Carga ligera — script propio

| | |
|---|---|
| **Herramienta** | `scripts/load-test.mjs` (Node.js) |
| **Objetivo** | Verificar que el tiempo de respuesta se mantiene con varias personas usando el sistema a la vez |
| **Procedimiento** | Usuarios virtuales con sesión de 4 roles hacen **solo consultas** (listar incidencias 40 %, ver una incidencia 40 %, notificaciones 20 %) con pausas de 0,2–0,8 s, durante 30 s, contra la API de Supabase en producción. `node scripts/load-test.mjs 25 30` |
| **Evidencias** | [`carga-10u.json`](evidencias/carga-10u.json), [`carga-25u.json`](evidencias/carga-25u.json) |

| Usuarios simultáneos | Peticiones | Peticiones/s | Errores | Mediana | p95 | p99 | Máximo | < 3 s |
|---|---|---|---|---|---|---|---|---|
| 10 | 430 | 14,0 | 0 | 177 ms | 266 ms | 612 ms | 664 ms | 100 % |
| 25 | 1.106 | 35,8 | 0 | 173 ms | 227 ms | 709 ms | 815 ms | 100 % |

**Interpretación:** al multiplicar por 2,5 los usuarios, el volumen atendido crece en la misma proporción y la latencia
no empeora: el sistema no está cerca de su límite para el tamaño de una institución educativa. Limitación: es una
prueba ligera sobre el plan gratuito de Supabase; no se probaron escrituras masivas.

---

## 5. Compatibilidad entre navegadores — Playwright

| | |
|---|---|
| **Herramienta** | Playwright 1.65 con Chromium, Microsoft Edge (instalado), Firefox y WebKit (motor de Safari) |
| **Objetivo** | Comprobar que todas las funciones operan igual en los navegadores más usados |
| **Procedimiento** | `npm run test:e2e:browsers`: ejecuta la suite E2E completa (44 pruebas de escritorio) en cada navegador, cada uno con una base de datos nueva |
| **Evidencias** | [`compatibilidad.json`](evidencias/compatibilidad.json) |

| Navegador | Aprobadas | Fallidas | Duración |
|---|---|---|---|
| Chrome (Chromium) | 44 | 0 | 103 s |
| Microsoft Edge | 44 | 0 | 139 s |
| Firefox | 44 | 0 | 362 s |
| Safari (WebKit) | 44 | 0 | 178 s |

El diseño para celular se valida además con 3 pruebas en un Pixel 7 emulado (sin desplazamiento horizontal).

---

## 6. Cobertura de pruebas — Vitest + V8

| | |
|---|---|
| **Herramienta** | Vitest 5.1 con `@vitest/coverage-v8` |
| **Objetivo** | Medir qué parte del código del frontend ejecutan las pruebas unitarias |
| **Procedimiento** | `npm run test:coverage` (también en cada `push`, con el resumen en GitHub Actions) |
| **Evidencias** | [`cobertura-unitaria.json`](evidencias/cobertura-unitaria.json) |

**Resultados:** líneas **13,7 %** · sentencias 13,3 % · ramas 9,4 % · funciones 9,0 % (23 pruebas unitarias).
Las librerías de lógica (`src/lib`) superan el 50 %; las pantallas tienen 0 % de cobertura **unitaria**.

**Interpretación:** el número es bajo porque las pantallas se prueban con **47 pruebas E2E** en navegador real, y las
reglas de negocio con **78 pruebas SQL** sobre la base de datos; ninguna de las dos se cuenta en esta métrica. Aun así,
la cobertura unitaria baja implica que un error en un componente se detecta tarde (en E2E, más lentas). → Plan de mejora.

---

## 7. Mantenibilidad del código — ESLint y métricas de tamaño

| | |
|---|---|
| **Herramienta** | ESLint 10 (regla `complexity`, umbral 10) y `scripts/code-metrics.mjs` |
| **Objetivo** | Medir tamaño, proporción de pruebas y complejidad ciclomática (Mantenibilidad → modularidad, capacidad de modificación) |
| **Evidencias** | [`codigo.json`](evidencias/codigo.json) |

| Métrica | Valor |
|---|---|
| Código del frontend | 58 archivos · 7.156 líneas |
| Código SQL (lógica de negocio) | 5 archivos · 2.275 líneas |
| Código de pruebas (unitarias + SQL + E2E) | 1.878 líneas (relación pruebas/código 0,20) |
| Problemas de ESLint | 0 |
| Funciones con complejidad > 10 | 25 (máximo 38: pantalla de Seguimiento) |

Funciones más complejas: `IncidentFollowUpPage` 38 · `ActaPage` 29 · `IncidentDetailPage` 27 · `IncidentsPage` 23 ·
`IncidentClosurePage` 20.

**Interpretación:** la complejidad se concentra en pantallas que reúnen muchas variantes (p. ej. Seguimiento maneja 6
acciones distintas en un solo componente). → Plan de mejora: dividir en componentes por acción.

---

## 8. Seguridad — Supabase Security Advisor y npm audit

| | |
|---|---|
| **Herramientas** | Supabase Security Advisor (linter de base de datos) y `npm audit` |
| **Procedimiento** | Revisión tras cada cambio de esquema (vía MCP de Supabase) y en cada `push` (`npm audit --omit=dev`) |

| Hallazgo | Cantidad | Estado |
|---|---|---|
| `function_search_path_mutable`: funciones sin ruta de búsqueda fija | 15 | ✅ Corregido (commit `4440f4d`) |
| `rls_enabled_no_policy`: tablas con RLS sin políticas | 14 | Intencional: tablas en esquema privado, acceso solo por funciones |
| Funciones `SECURITY DEFINER` invocables por la API | 34 (incluye `rls_auto_enable`, creada por Supabase) | Intencional: son la API; cada una valida el token de sesión y el rol |
| Vulnerabilidades en dependencias de producción | 0 | ✅ |
| Vulnerabilidades en dependencias de desarrollo | 10 moderadas (cadena de ESLint) | Aceptado: no llegan a producción; la corrección exige una versión incompatible |

---

## Problemas encontrados (entrada para el plan de mejora)

| # | Problema | Evidencia | Impacto | Estado |
|---|---|---|---|---|
| 1 | Contraste insuficiente y otros 3 tipos de falla de accesibilidad | axe: 107 elementos en 31/34 auditorías | Alto | ✅ Corregido |
| 2 | `robots.txt` inexistente | Lighthouse `robots-txt` | Bajo | ✅ Corregido |
| 3 | 15 funciones SQL sin `search_path` fijo | Security Advisor | Medio | ✅ Corregido |
| 4 | Cobertura unitaria del frontend 13,7 % | Vitest coverage | Medio | ⏳ Pendiente |
| 5 | 25 funciones con complejidad > 10 | ESLint `complexity` | Medio | ⏳ Pendiente |
| 6 | JavaScript sin usar en el primer acceso | Lighthouse `unused-javascript` | Bajo | ⏳ Pendiente |
| 7 | Una prueba E2E intermitente en el primer CI | GitHub Actions (run 43299204440) | Bajo | Mitigado (1 reintento en CI, se reporta como *flaky*) |
| 8 | Metas de oportunidad incumplidas en Crítica (66,7 %) y Alta (75 %); CSAT 77,8 % | Panel de calidad (datos demo ampliados) | Alto (proceso) | ⏳ Pendiente (acción de proceso) |
