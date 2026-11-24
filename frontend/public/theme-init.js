// Aplica el tema antes de pintar para evitar parpadeo.
// Es un archivo aparte (no un <script> en línea) para que la política CSP no permita scripts en línea.
try {
  var t = localStorage.getItem('eduresuelve.theme') || 'system'
  var d = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  if (d) document.documentElement.classList.add('dark')
  document.documentElement.style.colorScheme = d ? 'dark' : 'light'
} catch (e) {}
