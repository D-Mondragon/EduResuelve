import { defineConfig, devices } from '@playwright/test'

const API_PORT = 54330
const WEB_PORT = 5180

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  // En CI se permite 1 reintento: una prueba que pasa al reintentar queda marcada como "flaky" en el informe
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  // En CI, el reporter "github" publica cada falla como anotación visible en el run
  reporter: process.env.CI
    ? [['github'], ['list'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    locale: 'es-PE',
    timezoneId: 'America/Lima',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'] }, testIgnore: /responsive\.spec\.ts/ },
    { name: 'movil', use: { ...devices['Pixel 7'] }, testMatch: /responsive\.spec\.ts/ },
  ],
  webServer: [
    {
      // API local en memoria: cada ejecución parte de los datos demo
      command: `node scripts/local-api.mjs --memory`,
      env: { LOCAL_API_PORT: String(API_PORT) },
      url: `http://localhost:${API_PORT}/health`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `npx vite --port ${WEB_PORT} --strictPort`,
      env: {
        VITE_SUPABASE_URL: `http://localhost:${API_PORT}`,
        VITE_SUPABASE_ANON_KEY: 'e2e-key',
      },
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
})
