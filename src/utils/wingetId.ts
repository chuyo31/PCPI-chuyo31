/**
 * Variantes de un wingetId para emparejar catálogo ↔ salida de `winget list`.
 *
 * Winget a veces reporta IDs distintos al del repositorio, p. ej.:
 * - Catálogo: `Google.Chrome` · Instalado: `Google.Chrome.EXE`
 */
export function wingetIdMatchKeys(id: string): string[] {
  const lower = id.toLowerCase()
  const keys = new Set<string>([lower])

  const stripSuffixes = (value: string) => {
    let v = value
    let prev = ''
    while (v !== prev) {
      prev = v
      v = v.replace(/\.(exe|msi|user|machine|x64|x86|neutral|arm64)$/i, '')
    }
    return v
  }

  keys.add(stripSuffixes(lower))

  const parts = lower.split('.')
  if (parts.length >= 2) {
    keys.add(`${parts[0]}.${parts[1]}`)
    keys.add(stripSuffixes(`${parts[0]}.${parts[1]}`))
  }

  return [...keys]
}

export function indexByWingetId<T>(
  items: Array<{ id: string } & T>,
  pick: (item: { id: string } & T) => T,
): Record<string, T> {
  const map: Record<string, T> = {}
  for (const item of items) {
    for (const key of wingetIdMatchKeys(item.id)) {
      if (!(key in map)) {
        map[key] = pick(item)
      }
    }
  }
  return map
}
