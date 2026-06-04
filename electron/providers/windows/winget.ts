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
 * Notas:
 * - Forzamos `--accept-source-agreements --accept-package-agreements`
 *   y `--disable-interactivity` para que las instalaciones puedan correr
 *   en cola sin bloquearse en prompts.
 * - `--source winget` filtra solo el repositorio oficial.
 * - La salida de Winget tiene formato tabular con ancho variable y barra
 *   de progreso ASCII; aquí extraemos un porcentaje aproximado y lo
 *   reenviamos al renderer.
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
      const out = await runOnce('winget', [
        'list',
        '--source',
        'winget',
        '--accept-source-agreements',
        '--disable-interactivity',
      ])
      return parseTable(out.stdout).map((row) => ({
        id: row.Id ?? '',
        name: row.Name,
        version: row.Version ?? '',
      })).filter((p) => p.id.length > 0)
    } catch {
      return []
    }
  }

  async listUpgradable(): Promise<UpgradablePackage[]> {
    try {
      const out = await runOnce('winget', [
        'upgrade',
        '--source',
        'winget',
        '--accept-source-agreements',
        '--disable-interactivity',
      ])
      return parseTable(out.stdout).map((row) => ({
        id: row.Id ?? '',
        current: row.Version ?? '',
        available: row.Available ?? '',
      })).filter((p) => p.id.length > 0 && p.available.length > 0)
    } catch {
      return []
    }
  }

  install(id: string, onProgress?: (e: ProgressEvent) => void): Promise<OpResult> {
    return this.runWinget(
      ['install', '--id', id, '--exact', '--silent',
       '--accept-package-agreements', '--accept-source-agreements',
       '--disable-interactivity', '--source', 'winget'],
      'installing',
      onProgress,
    )
  }

  upgrade(id: string, onProgress?: (e: ProgressEvent) => void): Promise<OpResult> {
    return this.runWinget(
      ['upgrade', '--id', id, '--exact', '--silent',
       '--accept-package-agreements', '--accept-source-agreements',
       '--disable-interactivity', '--source', 'winget'],
      'upgrading',
      onProgress,
    )
  }

  uninstall(id: string, onProgress?: (e: ProgressEvent) => void): Promise<OpResult> {
    return this.runWinget(
      ['uninstall', '--id', id, '--exact', '--silent',
       '--accept-source-agreements', '--disable-interactivity'],
      'uninstalling',
      onProgress,
    )
  }

  private runWinget(
    args: string[],
    initialPhase: ProgressEvent['phase'],
    onProgress?: (e: ProgressEvent) => void,
  ): Promise<OpResult> {
    return new Promise((resolve) => {
      const child = spawn('winget', args, { windowsHide: true })

      onProgress?.({ phase: initialPhase, percent: 0 })

      let stderr = ''

      const handleLine = (raw: string) => {
        const line = raw.replace(/\r/g, '').trim()
        if (!line) return
        const percentMatch = line.match(/(\d{1,3})\s?%/)
        const percent = percentMatch ? Math.min(100, parseInt(percentMatch[1], 10)) : undefined
        let phase: ProgressEvent['phase'] = initialPhase
        if (/download/i.test(line)) phase = 'downloading'
        else if (/install/i.test(line)) phase = 'installing'
        onProgress?.({ phase, percent, line })
      }

      child.stdout.on('data', (b: Buffer) => {
        b.toString('utf8').split('\n').forEach(handleLine)
      })
      child.stderr.on('data', (b: Buffer) => {
        const text = b.toString('utf8')
        stderr += text
        text.split('\n').forEach(handleLine)
      })

      child.on('error', (err) => {
        onProgress?.({ phase: 'error', line: err.message })
        resolve({ ok: false, error: err.message })
      })

      child.on('close', (code) => {
        if (code === 0) {
          onProgress?.({ phase: 'completed', percent: 100 })
          resolve({ ok: true })
        } else {
          onProgress?.({ phase: 'error', line: `winget exited with code ${code}` })
          resolve({ ok: false, error: stderr.trim() || `winget exited with code ${code}` })
        }
      })
    })
  }
}

/* ----------------------- helpers ----------------------- */

function runOnce(cmd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { windowsHide: true })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (b: Buffer) => (stdout += b.toString('utf8')))
    child.stderr.on('data', (b: Buffer) => (stderr += b.toString('utf8')))
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr })
      else reject(new Error(stderr.trim() || `${cmd} exited with code ${code}`))
    })
  })
}

/**
 * Parser tolerante de la salida tabular de Winget.
 * Detecta la línea de cabecera (la que precede a una línea de guiones)
 * y calcula los offsets de cada columna a partir de ella.
 */
function parseTable(stdout: string): Array<Record<string, string>> {
  const lines = stdout.replace(/\r/g, '').split('\n')
  let headerIdx = -1
  for (let i = 0; i < lines.length - 1; i++) {
    if (/^-+(\s+-+)+\s*$/.test(lines[i + 1])) {
      headerIdx = i
      break
    }
  }
  if (headerIdx === -1) return []

  const header = lines[headerIdx]
  const cols: Array<{ name: string; start: number }> = []
  const re = /\S+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(header)) !== null) {
    cols.push({ name: m[0], start: m.index })
  }

  const rows: Array<Record<string, string>> = []
  for (let i = headerIdx + 2; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue
    if (/^\s*\d+\s+(upgrades?|packages?)/i.test(line)) continue
    const row: Record<string, string> = {}
    for (let c = 0; c < cols.length; c++) {
      const start = cols[c].start
      const end = c + 1 < cols.length ? cols[c + 1].start : line.length
      row[cols[c].name] = line.substring(start, end).trim()
    }
    rows.push(row)
  }
  return rows
}
