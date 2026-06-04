import { create } from 'zustand'
import type { AppEntry, Pack } from '@/catalog/types'
import { CATALOG as BUNDLE_CATALOG, PACKS as BUNDLE_PACKS } from '@/catalog'
import { useSettings } from './settings'

export type CatalogSource = 'bundle' | 'remote'

interface CatalogState {
  catalog: AppEntry[]
  packs: Pack[]
  source: CatalogSource
  lastUpdate: string | null
  loading: boolean
  error: string | null

  /** Carga catálogo persistido remoto (si existe) al arrancar. */
  load: () => Promise<void>

  /** Descarga, valida y reemplaza el catálogo. */
  update: () => Promise<UpdateResult>

  /** Vuelve al catálogo del bundle. */
  reset: () => Promise<void>
}

export type UpdateResult =
  | { ok: true; message: string; counts: { catalog: number; packs: number } }
  | { ok: false; message: string }

export const useCatalog = create<CatalogState>((set) => ({
  catalog: BUNDLE_CATALOG,
  packs: BUNDLE_PACKS,
  source: 'bundle',
  lastUpdate: null,
  loading: false,
  error: null,

  load: async () => {
    if (!window.pcpi) return
    try {
      const data = await window.pcpi.catalog.get()
      if (data) {
        set({
          catalog: data.catalog as AppEntry[],
          packs: data.packs as Pack[],
          source: 'remote',
          lastUpdate: data.lastUpdate,
        })
      }
    } catch {
      /* keep bundle */
    }
  },

  update: async () => {
    set({ loading: true, error: null })
    try {
      const { catalogUrl, packsUrl } = useSettings.getState().settings
      const result = await window.pcpi.catalog.update({ catalogUrl, packsUrl })

      if (!result.ok) {
        set({ loading: false, error: result.error })
        return { ok: false, message: result.error }
      }

      set({
        catalog: result.catalog as AppEntry[],
        packs: result.packs as Pack[],
        source: 'remote',
        lastUpdate: result.lastUpdate,
        loading: false,
        error: null,
      })

      return {
        ok: true,
        counts: result.counts,
        message: `Actualizado: ${result.counts.catalog} apps · ${result.counts.packs} packs`,
      }
    } catch (e) {
      const msg = (e as Error).message
      set({ loading: false, error: msg })
      return { ok: false, message: msg }
    }
  },

  reset: async () => {
    if (window.pcpi) {
      await window.pcpi.catalog.reset()
    }
    set({
      catalog: BUNDLE_CATALOG,
      packs: BUNDLE_PACKS,
      source: 'bundle',
      lastUpdate: null,
      error: null,
    })
  },
}))

/* ---------- Helpers reactivos / imperativos ---------- */

/**
 * Devuelve una app por id. Sin argumento de catálogo, consulta el catálogo
 * vivo del store. Esto permite que código existente (instalador, hooks)
 * siga funcionando sin pasar el catálogo a cada llamada.
 */
export function findApp(id: string, catalog?: AppEntry[]): AppEntry | undefined {
  const cat = catalog ?? useCatalog.getState().catalog
  return cat.find((a) => a.id === id)
}

export function findPack(id: string, packs?: Pack[]): Pack | undefined {
  const ps = packs ?? useCatalog.getState().packs
  return ps.find((p) => p.id === id)
}

export function appsInPack(packId: string): AppEntry[] {
  const { catalog, packs } = useCatalog.getState()
  const pack = packs.find((p) => p.id === packId)
  if (!pack) return []
  return pack.apps
    .map((id) => catalog.find((a) => a.id === id))
    .filter((a): a is AppEntry => Boolean(a))
}
