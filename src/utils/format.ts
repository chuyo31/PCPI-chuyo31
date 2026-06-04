export function formatSizeMb(mb?: number): string {
  if (!mb || Number.isNaN(mb)) return '—'
  if (mb < 1) return `${Math.round(mb * 1024)} KB`
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`
  return `${(mb / 1024).toFixed(2)} GB`
}

export function formatDate(iso?: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s} s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  return `${m}m ${rem}s`
}
