import { spawn } from 'node:child_process'
import type {
  PackageProvider,
  InstalledPackage,
  UpgradablePackage,
  OpResult,
  ProgressEvent,
} from '../types'

/**
 * Provider de Winget para Windows.
 *
 * Progreso: Winget escribe muchas actualizaciones en la MISMA línea con `\r`
 * (barra ASCII). Si solo partimos por `\n`, el % llega de golpe al final.
 * Aquí fragmentamos por `\r` y `\n` y traducimos mensajes a texto claro.
 */
export class WingetProvider implements PackageProvider {
  readonly id = 'winget'

  async isAvailable(): Promise<{ available: boolean; version?: string; error?: string }> {
    try {
      const out = await runOnce('winget', ['--version'])
      const version = out.stdout.trim().replace(/^v/, '')
      return { available: true, version }
    } catch (e) {
      return { available: false, error: (e as Error).message }
    }
  }

  async listInstalled(): Promise<InstalledPackage[]> {
    try {
      // Sin --source: incluye paquetes winget + los que Winget detecta en el sistema.
      const out = await runOnce('winget', [
        'list',
        '--accept-source-agreements',
        '--disable-interactivity',
      ])
      return parseWingetTable(out.combined)
        .map((row) => ({
          id: row.id,
          name: row.name,
          version: row.version,
        }))
        .filter((p) => p.id.length > 0)
    } catch {
      return []
    }
  }

  async listUpgradable(): Promise<UpgradablePackage[]> {
    try {
      const out = await runOnce('winget', [
        'upgrade',
        '--accept-source-agreements',
        '--disable-interactivity',
      ])
      return parseWingetTable(out.combined)
        .map((row) => ({
          id: row.id,
          current: row.version,
          available: row.available ?? '',
        }))
        .filter((p) => p.id.length > 0 && p.available.length > 0)
    } catch {
      return []
    }
  }

  install(id: string, onProgress?: (e: ProgressEvent) => void): Promise<OpResult> {
    return this.runWinget(
      [
        'install',
        '--id',
        id,
        '--exact',
        '--silent',
        '--accept-package-agreements',
        '--accept-source-agreements',
        '--disable-interactivity',
        '--source',
        'winget',
      ],
      onProgress,
    )
  }

  upgrade(id: string, onProgress?: (e: ProgressEvent) => void): Promise<OpResult> {
    return this.runWinget(
      [
        'upgrade',
        '--id',
        id,
        '--exact',
        '--silent',
        '--accept-package-agreements',
        '--accept-source-agreements',
        '--disable-interactivity',
        '--source',
        'winget',
      ],
      onProgress,
    )
  }

  uninstall(id: string, onProgress?: (e: ProgressEvent) => void): Promise<OpResult> {
    return this.runWinget(
      [
        'uninstall',
        '--id',
        id,
        '--exact',
        '--silent',
        '--accept-source-agreements',
        '--disable-interactivity',
      ],
      onProgress,
    )
  }

  private runWinget(args: string[], onProgress?: (e: ProgressEvent) => void): Promise<OpResult> {
    return new Promise((resolve) => {
      const child = spawn('winget', args, { windowsHide: true })

      let stderr = ''
      let lastPercent = 0

      const emit = (parsed: ParsedWingetLine) => {
        if (parsed.percent !== undefined) {
          lastPercent = Math.max(lastPercent, parsed.percent)
        }
        onProgress?.({
          phase: parsed.phase,
          percent: parsed.percent !== undefined ? lastPercent : undefined,
          line: parsed.statusMessage,
        })
      }

      onProgress?.({
        phase: 'downloading',
        percent: 0,
        line: 'Conectando con Winget…',
      })

      const handleChunk = (chunk: string) => {
        const normalized = chunk.replace(/\r\n/g, '\n')
        const segments = normalized.split(/\r|\n/)
        for (const seg of segments) {
          const parsed = parseWingetSegment(seg)
          if (parsed) emit(parsed)
        }
      }

      child.stdout.on('data', (b: Buffer) => handleChunk(b.toString('utf8')))
      child.stderr.on('data', (b: Buffer) => {
        const text = b.toString('utf8')
        stderr += text
        handleChunk(text)
      })

      child.on('error', (err) => {
        onProgress?.({ phase: 'error', line: err.message })
        resolve({ ok: false, error: err.message })
      })

      child.on('close', (code) => {
        if (code === 0) {
          onProgress?.({ phase: 'completed', percent: 100, line: 'Instalación completada' })
          resolve({ ok: true })
        } else {
          onProgress?.({ phase: 'error', line: `Winget finalizó con código ${code}` })
          resolve({ ok: false, error: stderr.trim() || `winget exited with code ${code}` })
        }
      })
    })
  }
}

/* ---------- Parser de salida en vivo ---------- */

interface ParsedWingetLine {
  phase: ProgressEvent['phase']
  percent?: number
  statusMessage: string
}

function parseWingetSegment(raw: string): ParsedWingetLine | null {
  const line = raw.replace(/\x1b\[[0-9;]*m/g, '').trim()
  if (!line || line.length < 2) return null
  // Líneas que son solo la barra ASCII sin texto útil
  if (/^[▒█■□\s\-·.]+$/.test(line)) return null

  const percentMatch = line.match(/(\d{1,3})\s*%/)
  const percent = percentMatch ? Math.min(100, parseInt(percentMatch[1], 10)) : undefined

  if (/^(found|encontrad)/i.test(line)) {
    return {
      phase: 'downloading',
      statusMessage: 'Paquete encontrado en el catálogo de Winget',
    }
  }

  if (/downloading|descargando/i.test(line)) {
    return {
      phase: 'downloading',
      percent,
      statusMessage: percent
        ? `Descargando instalador… ${percent}%`
        : 'Descargando instalador desde el repositorio…',
    }
  }

  if (/verif|hash|comprobando/i.test(line)) {
    return {
      phase: 'verifying',
      percent: percent ?? 90,
      statusMessage: 'Verificando integridad del instalador…',
    }
  }

  if (/starting package install|instalando el paquete|iniciando la instalaci/i.test(line)) {
    return {
      phase: 'installing',
      percent: percent ?? 5,
      statusMessage: 'Ejecutando el instalador en tu PC…',
    }
  }

  if (/successfully installed|instalado correctamente|instalación correcta/i.test(line)) {
    return {
      phase: 'completed',
      percent: 100,
      statusMessage: 'Instalación completada',
    }
  }

  if (/installing|instalaci/i.test(line)) {
    return {
      phase: 'installing',
      percent,
      statusMessage: percent ? `Instalando… ${percent}%` : 'Instalando en el sistema…',
    }
  }

  if (/cancelled|cancelad|failed|error|fallo/i.test(line)) {
    return { phase: 'error', statusMessage: line.slice(0, 120) }
  }

  if (percent !== undefined) {
    const downloading = /download|descarg/i.test(line)
    return {
      phase: downloading ? 'downloading' : 'installing',
      percent,
      statusMessage: downloading
        ? `Descargando… ${percent}%`
        : `Instalando… ${percent}%`,
    }
  }

  return null
}

/* ----------------------- helpers ----------------------- */

function runOnce(cmd: string, args: string[]): Promise<{ stdout: string; stderr: string; combined: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { windowsHide: true })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (b: Buffer) => (stdout += b.toString('utf8')))
    child.stderr.on('data', (b: Buffer) => (stderr += b.toString('utf8')))
    child.on('error', reject)
    child.on('close', (code) => {
      const combined = `${stdout}\n${stderr}`
      if (code === 0) resolve({ stdout, stderr, combined })
      else reject(new Error(stderr.trim() || `${cmd} exited with code ${code}`))
    })
  })
}

interface WingetTableRow {
  id: string
  name?: string
  version: string
  available?: string
  source?: string
}

/**
 * Parser de tablas Winget (list / upgrade).
 * Winget usa una línea continua de guiones como separador, no grupos "---- ----".
 */
function parseWingetTable(raw: string): WingetTableRow[] {
  const lines = raw
    .replace(/\r/g, '')
    .replace(/\x1b\[[0-9;]*m/g, '')
    .split('\n')
    .map((l) => l.replace(/\u2026/g, '...'))
    .filter((line) => {
      const t = line.trim()
      if (!t) return false
      if (t === '-' || /^[\\|\/\-\s]+$/.test(t)) return false
      if (/^\d[\d.KMB]*\s*(KB|MB|GB|%)/i.test(t)) return false
      return true
    })

  let headerIdx = -1
  for (let i = 0; i < lines.length - 1; i++) {
    const next = lines[i + 1].trim()
    if (isWingetSeparatorLine(next) && /\S/.test(lines[i])) {
      headerIdx = i
      break
    }
  }
  if (headerIdx === -1) return []

  const header = lines[headerIdx]
  const cols: Array<{ key: string; start: number }> = []
  const re = /\S+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(header)) !== null) {
    cols.push({ key: m[0].toLowerCase(), start: m.index })
  }

  const rows: WingetTableRow[] = []
  for (let i = headerIdx + 2; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    if (!trimmed) continue
    if (/^\d+\s+(upgrades?|packages?)\s+available/i.test(trimmed)) continue
    if (isWingetSeparatorLine(trimmed)) continue

    const cells: Record<string, string> = {}
    for (let c = 0; c < cols.length; c++) {
      const start = cols[c].start
      const end = c + 1 < cols.length ? cols[c + 1].start : line.length
      cells[cols[c].key] = line.substring(start, end).trim()
    }

    const id = cells.id ?? cells['identificador'] ?? ''
    if (!id) continue

    rows.push({
      id,
      name: cells.name ?? cells.nombre,
      version: cells.version ?? cells.versión ?? cells.versione ?? '',
      available: cells.available ?? cells.disponible,
      source: cells.source ?? cells.origen,
    })
  }

  return rows
}

function isWingetSeparatorLine(line: string): boolean {
  const t = line.trim()
  if (!t) return false
  return /^[-─]{5,}$/.test(t) || /^[-─\s]{8,}$/.test(t) && !/[A-Za-z0-9]/.test(t)
}
