import type { AppEntry } from '@/catalog/types'

/** Base URL de iconos empaquetados (copiados a `public/icons` en build). */
export const BUNDLED_ICON_BASE = '/icons/'

/** Iconos en GitHub raw (catálogo remoto / fallback online). */
export const REMOTE_ICON_BASE =
  'https://raw.githubusercontent.com/chuyo31/PCPI-chuyo31/main/catalog/icons/'

/**
 * Candidatos ordenados: local (offline) → remoto explícito → convención remota.
 */
export function getAppIconCandidates(app: AppEntry): string[] {
  const seen = new Set<string>()
  const add = (url?: string | null) => {
    if (!url || seen.has(url)) return
    seen.add(url)
  }

  const ordered: string[] = []

  if (app.iconUrl) {
    const file = app.iconUrl.split('/').pop()
    if (file) {
      const local = `${BUNDLED_ICON_BASE}${file}`
      ordered.push(local)
      add(local)
    }
    if (app.iconUrl.startsWith('http')) {
      ordered.push(app.iconUrl)
      add(app.iconUrl)
    }
  }

  for (const ext of ['png', 'svg', 'ico', 'webp']) {
    const local = `${BUNDLED_ICON_BASE}${app.id}.${ext}`
    if (!seen.has(local)) ordered.push(local)
    const remote = `${REMOTE_ICON_BASE}${app.id}.${ext}`
    if (!seen.has(remote)) ordered.push(remote)
  }

  return ordered
}

export function getAppIconUrl(app: AppEntry): string | null {
  return getAppIconCandidates(app)[0] ?? null
}
