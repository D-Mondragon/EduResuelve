/** Falla al descargar una pantalla: suele ocurrir si se publicó una versión nueva con la página abierta. */
export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(message)
}
