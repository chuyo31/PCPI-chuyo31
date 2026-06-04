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
      'install',
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
      'upgrade',
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
      'uninstall',
      onProgress,
    )
  }

  private runWinget(
    args: string[],
    mode: 'install' | 'upgrade' | 'uninstall',
    onProgress?: (e: ProgressEvent) => void,
  ): Promise<OpResult> {
    return new Promise((resolve) => {
      const child = spawn('winget', args, { windowsHide: true })

      let stdout = ''
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

      child.stdout.on('data', (b: Buffer) => {
        const text = b.toString('utf8')
        stdout += text
        handleChunk(text)
      })
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
        const result = interpretWingetExit(code, stdout, stderr, mode)
        if (result.ok) {
          onProgress?.({
            phase: 'completed',
            percent: 100,
            line: result.message ?? 'Operación completada',
          })
        } else {
          onProgress?.({ phase: 'error', line: result.error })
        }
        resolve(result)
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

  if (
    /successfully installed|instalado correctamente|instalación correcta/i.test(line) ||
    /already installed|ya instalado|paquete ya instalado|existing package already installed/i.test(line)
  ) {
    return {
      phase: 'completed',
      percent: 100,
      statusMessage: /already|existente|ya instalado/i.test(line)
        ? 'Ya estaba instalada en tu PC'
        : 'Instalación completada',
    }
  }

  if (/no available upgrade|no newer package|no hay versiones más recientes/i.test(line)) {
    return {
      phase: 'completed',
      percent: 100,
      statusMessage: 'Ya instalada (sin actualización disponible)',
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

/**
 * Winget a veces devuelve códigos distintos de 0 aunque la operación fue un éxito
 * lógico (p. ej. app ya instalada sin actualización). El código 2316632070 que ve
 * el usuario es -1978335189 como entero con signo.
 */
function interpretWingetExit(
  code: number | null,
  stdout: string,
  stderr: string,
  mode: 'install' | 'upgrade' | 'uninstall',
): OpResult {
  const output = `${stdout}\n${stderr}`.trim()

  if (code === 0) {
    return { ok: true, message: 'Instalación completada' }
  }

  if (/successfully installed|instalado correctamente/i.test(output)) {
    return { ok: true, message: 'Instalación completada' }
  }

  if (mode === 'install' || mode === 'upgrade') {
    const alreadyInstalled =
      /already installed|ya está instalado|paquete ya instalado|existing package already installed|found an existing package/i.test(
        output,
      )
    const noUpgrade =
      /no available upgrade|no newer package|no hay versiones más recientes/i.test(output)

    if (alreadyInstalled && (noUpgrade || mode === 'install')) {
      return {
        ok: true,
        message: noUpgrade
          ? 'Ya estaba instalada (no hay actualización disponible)'
          : 'Ya estaba instalada en tu PC',
      }
    }
  }

  const signed = toSignedExitCode(code)
  const friendly = mapWingetExitCode(signed, output)
  return { ok: false, error: friendly }
}

function toSignedExitCode(code: number | null): number {
  if (code === null) return -1
  if (code > 0x7fffffff) return code - 0x100000000
  return code
}

function mapWingetExitCode(code: number, output: string): string {
  const known: Record<number, string> = {
    [-1978335189]: 'La aplicación ya está instalada y no hay actualización disponible.',
    [-1978335211]: 'La aplicación ya está instalada.',
    [-1978335212]: 'Instalación cancelada por el usuario.',
    [-1978335230]: 'Comando de Winget no válido.',
    [-1978335226]: 'No se encontró el paquete en Winget.',
  }
  if (known[code]) return known[code]

  if (/already installed|ya instalado/i.test(output)) {
    return 'La aplicación ya está instalada en tu PC.'
  }
  if (/network|internet|conexión|connection/i.test(output)) {
    return 'Error de red al descargar. Comprueba tu conexión a Internet.'
  }
  if (/architecture|arquitectura|64-bit|32-bit/i.test(output)) {
    return 'Incompatible con la arquitectura de tu sistema (32/64 bits).'
  }
  if (/administrator|administrador|elevation|elevación/i.test(output)) {
    return 'Se requieren permisos de administrador para instalar esta aplicación.'
  }

  const lines = output
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 3 && !/^[-\\|/\s]+$/.test(l))
  const last = lines.slice(-2).join(' ')
  if (last) return last.length > 220 ? `${last.slice(0, 217)}…` : last

  return `Winget no pudo completar la operación (código ${code}).`
}
