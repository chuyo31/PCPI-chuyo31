import { spawn, type ChildProcess } from 'node:child_process'
import type {
  PackageProvider,
  InstalledPackage,
  UpgradablePackage,
  OpResult,
  ProgressEvent,
} from '../types'

/**
 * Tiempo máximo sin recibir ninguna salida de Winget antes de considerarlo colgado
 * (p. ej. esperando un lock de su índice/caché local) y matarlo automáticamente.
 */
const STALL_TIMEOUT_MS = 4 * 60 * 1000

/**
 * Provider de Winget para Windows.
 *
 * Progreso: Winget escribe muchas actualizaciones en la MISMA línea con `\r`
 * (barra ASCII). Si solo partimos por `\n`, el % llega de golpe al final.
 * Aquí fragmentamos por `\r` y `\n` y traducimos mensajes a texto claro.
 */
export class WingetProvider implements PackageProvider {
  readonly id = 'winget'

  /**
   * Procesos winget activos indexados por id (minúsculas) para soportar cancelación.
   * Un mismo id puede tener varios procesos (p. ej. download + install en distintos
   * momentos), por eso almacenamos un Set.
   */
  private active = new Map<string, Set<ChildProcess>>()
  /** Ids cuya operación se canceló manualmente; el close handler los traduce a cancelled. */
  private cancelled = new Set<string>()
  /** Ids cuyo proceso se mató por no dar señales de vida (ver STALL_TIMEOUT_MS). */
  private stalled = new Set<string>()

  async cancel(id: string): Promise<{ cancelled: number }> {
    const key = id.toLowerCase()
    const procs = this.active.get(key)
    if (!procs || procs.size === 0) return { cancelled: 0 }

    this.cancelled.add(key)
    let killed = 0
    for (const child of procs) {
      if (killChildTree(child)) killed += 1
    }
    return { cancelled: killed }
  }

  private register(id: string, child: ChildProcess) {
    const key = id.toLowerCase()
    let set = this.active.get(key)
    if (!set) {
      set = new Set()
      this.active.set(key, set)
    }
    set.add(child)
  }

  private unregister(id: string, child: ChildProcess) {
    const key = id.toLowerCase()
    const set = this.active.get(key)
    if (!set) return
    set.delete(child)
    if (set.size === 0) this.active.delete(key)
  }

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

  download(id: string, onProgress?: (e: ProgressEvent) => void): Promise<OpResult> {
    return this.runWinget(
      id,
      [
        'download',
        '--id',
        id,
        '--exact',
        '--accept-package-agreements',
        '--accept-source-agreements',
        '--disable-interactivity',
        '--source',
        'winget',
      ],
      'download',
      onProgress,
    )
  }

  install(id: string, onProgress?: (e: ProgressEvent) => void): Promise<OpResult> {
    return this.runWinget(
      id,
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
      id,
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
      id,
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
    id: string,
    args: string[],
    mode: 'download' | 'install' | 'upgrade' | 'uninstall',
    onProgress?: (e: ProgressEvent) => void,
  ): Promise<OpResult> {
    return new Promise((resolve) => {
      const child = spawn('winget', args, { windowsHide: true })
      this.register(id, child)

      let stdout = ''
      let stderr = ''
      let lastPercent = 0
      let settled = false

      /**
       * Red de seguridad: si Winget se queda esperando un lock interno (índice/caché
       * compartidos) puede no volver a escribir nada nunca y la promesa no se
       * resolvería jamás, dejando la cola atascada hasta cerrar la app. Si pasan
       * STALL_TIMEOUT_MS sin ninguna salida, lo tratamos como colgado y lo matamos.
       */
      let stallTimer: ReturnType<typeof setTimeout> | null = null
      const resetStallTimer = () => {
        if (stallTimer) clearTimeout(stallTimer)
        stallTimer = setTimeout(() => {
          if (settled) return
          this.stalled.add(id.toLowerCase())
          killChildTree(child)
        }, STALL_TIMEOUT_MS)
      }

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
      resetStallTimer()

      const handleChunk = (chunk: string) => {
        resetStallTimer()
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
        if (settled) return
        settled = true
        if (stallTimer) clearTimeout(stallTimer)
        this.unregister(id, child)
        const wasCancelled = this.cancelled.delete(id.toLowerCase())
        const wasStalled = this.stalled.delete(id.toLowerCase())
        if (wasCancelled) {
          onProgress?.({ phase: 'cancelled', line: 'Operación cancelada por el usuario' })
          resolve({ ok: false, cancelled: true, error: 'Operación cancelada por el usuario' })
        } else if (wasStalled) {
          onProgress?.({ phase: 'error', line: 'Winget no respondió: operación cancelada automáticamente' })
          resolve({ ok: false, error: 'Winget no respondió: operación cancelada automáticamente' })
        } else {
          onProgress?.({ phase: 'error', line: err.message })
          resolve({ ok: false, error: err.message })
        }
      })

      child.on('close', (code) => {
        if (settled) return
        settled = true
        if (stallTimer) clearTimeout(stallTimer)
        this.unregister(id, child)
        const wasCancelled = this.cancelled.delete(id.toLowerCase())
        const wasStalled = this.stalled.delete(id.toLowerCase())
        if (wasCancelled) {
          onProgress?.({ phase: 'cancelled', line: 'Operación cancelada por el usuario' })
          resolve({ ok: false, cancelled: true, error: 'Operación cancelada por el usuario' })
          return
        }
        if (wasStalled) {
          onProgress?.({ phase: 'error', line: 'Winget no respondió: operación cancelada automáticamente' })
          resolve({ ok: false, error: 'Winget no respondió: operación cancelada automáticamente' })
          return
        }
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

/**
 * En Windows, matar `winget` con SIGTERM no garantiza que muera el instalador
 * hijo que ya pudo haber lanzado. Usamos `taskkill /T /F` para matar todo el árbol.
 */
function killChildTree(child: ChildProcess): boolean {
  if (!child.pid || child.killed) return false
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true })
    } else {
      child.kill('SIGTERM')
    }
    return true
  } catch {
    return false
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
 *
 * No depende de la fila de cabecera: Winget suele borrarla con el spinner de progreso
 * (`\r`) al capturar stdout, y el parser antiguo devolvía 0 filas → ninguna app detectada.
 */
function parseWingetTable(raw: string): WingetTableRow[] {
  const lines = raw
    .replace(/\r/g, '')
    .replace(/\x1b\[[0-9;]*m/g, '')
    .split('\n')

  const rows: WingetTableRow[] = []
  const rowRe =
    /\s((?:ARP\\[^\s]+|MSIX\\[^\s]+|[A-Za-z0-9_+.\-]+\.[A-Za-z0-9_+.\-]+))\s+(\S+)(?:\s+(\S+))?(?:\s+(\S+))?\s*$/

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (trimmed === '-' || /^[\\|\/\-\s]+$/.test(trimmed)) continue
    if (/^[-─]{5,}$/.test(trimmed)) continue
    if (/^\d+\s+(upgrades?|actualizaciones?|packages?|paquetes?)\s+(available|disponibles?)/i.test(trimmed)) {
      continue
    }
    if (/^name\s+id\b/i.test(trimmed)) continue

    const match = line.match(rowRe)
    if (!match) continue

    const id = match[1].trim()
    const version = match[2]
    const third = match[3]
    const fourth = match[4]

    let available: string | undefined
    let source: string | undefined

    if (fourth !== undefined) {
      available = third
      source = fourth
    } else if (third !== undefined && /^winget$/i.test(third)) {
      source = third
    } else if (third !== undefined) {
      available = third
    }

    rows.push({ id, version, available, source })
  }

  return rows
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
  mode: 'download' | 'install' | 'upgrade' | 'uninstall',
): OpResult {
  const output = `${stdout}\n${stderr}`.trim()

  if (code === 0) {
    return {
      ok: true,
      message:
        mode === 'download' ? 'Descarga completada' : 'Instalación completada',
    }
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
