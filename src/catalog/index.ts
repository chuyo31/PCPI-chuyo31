// Single source of truth: /catalog (raíz del repo).
// El bundle de la app los empaqueta al compilar (vite resuelve estos imports),
// y al mismo tiempo están disponibles como URL raw en GitHub para que la app
// pueda descargarlos en caliente con el botón "Actualizar catálogo".
import catalogJson from '../../catalog/catalog.json'
import packsJson from '../../catalog/packs.json'
import type { AppEntry, Pack } from './types'

/**
 * Catálogo y packs **del bundle** (los empaquetados con la app).
 *
 * El catálogo "vivo" puede ser este o uno remoto persistido por el usuario.
 * Para obtener el catálogo vivo en componentes, usa `useCatalog` desde
 * `@/services/catalog`. Estas exportaciones siguen disponibles como fallback.
 */
export const CATALOG: AppEntry[] = catalogJson as AppEntry[]
export const PACKS: Pack[] = packsJson as Pack[]

/**
 * Helpers de búsqueda sobre el catálogo del bundle.
 *
 * Para búsquedas sobre el catálogo vivo (que respeta el override remoto),
 * importa los helpers homónimos desde `@/services/catalog`.
 */
export function findAppInBundle(id: string): AppEntry | undefined {
  return CATALOG.find((a) => a.id === id)
}

export function findAppByWingetIdInBundle(wingetId: string): AppEntry | undefined {
  const target = wingetId.toLowerCase()
  return CATALOG.find((a) => a.wingetId.toLowerCase() === target)
}

export function findPackInBundle(id: string): Pack | undefined {
  return PACKS.find((p) => p.id === id)
}

export * from './types'
export * from './categories'
