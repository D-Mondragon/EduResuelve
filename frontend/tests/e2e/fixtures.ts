import { test as base, expect, type Page } from '@playwright/test'

/**
 * Diagnóstico de fallas: cuando una prueba falla en GitHub Actions, publica como anotación
 * lo que mostraba la página (URL, título y mensajes/alertas visibles). Así una falla
 * intermitente en CI se puede analizar sin descargar artefactos.
 */
export const test = base.extend<{ diagnostics: void }>({
  diagnostics: [
    async ({ page }, use, testInfo) => {
      await use()
      if (testInfo.status === testInfo.expectedStatus || !process.env.CI) return
      const info = await page
        .evaluate(() => {
          const visible = (el: Element) => (el as HTMLElement).offsetParent !== null
          const texts = (selector: string) =>
            [...document.querySelectorAll(selector)].filter(visible).map((el) => (el as HTMLElement).innerText.trim()).filter(Boolean)
          return {
            url: location.pathname + location.search,
            h1: texts('h1').join(' | '),
            mensajes: texts('[role="alert"], [role="status"], [aria-live]').slice(0, 8).join(' | '),
            errores: texts('[aria-invalid="true"] ~ p, [id$="-error"]').slice(0, 5).join(' | '),
          }
        })
        .catch((e: Error) => ({ url: page.url(), h1: '', mensajes: `no se pudo leer la página: ${e.message}`, errores: '' }))
      const message = `Intento ${testInfo.retry + 1} · URL ${info.url} · Título: ${info.h1} · Mensajes: ${info.mensajes || '—'} · Errores: ${info.errores || '—'}`
      // Comando de GitHub Actions: crea una anotación visible en el run
      console.log(`::warning title=Diagnóstico ${testInfo.title.slice(0, 80)}::${message.replace(/\r?\n/g, ' ').slice(0, 1500)}`)
    },
    { auto: true },
  ],
})

export { expect, type Page }
