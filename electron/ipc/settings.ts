import { ipcMain, app } from 'electron'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const DEFAULTS = {
  theme: 'dark' as 'dark' | 'light' | 'system',
  language: 'es',
  animations: true,
  autoUpdate: true,
  showBeta: false,
  showExperimental: false,
  downloadPath: '',
  cachePath: '',
  // Fuente remota del catálogo. Por defecto apuntamos al repo oficial de PCPI.
  // El usuario puede cambiar estas URLs en Configuración para usar su propio fork.
  catalogUrl: 'https://raw.githubusercontent.com/chuyo31/PCPI-chuyo31/main/catalog/catalog.json',
  packsUrl: 'https://raw.githubusercontent.com/chuyo31/PCPI-chuyo31/main/catalog/packs.json',
}

function settingsFile() {
  return path.join(app.getPath('userData'), 'settings.json')
}

async function readAll(): Promise<Record<string, unknown>> {
  try {
    const raw = await fs.readFile(settingsFile(), 'utf8')
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULTS }
  }
}

async function writeAll(data: Record<string, unknown>) {
  await fs.mkdir(path.dirname(settingsFile()), { recursive: true })
  await fs.writeFile(settingsFile(), JSON.stringify(data, null, 2), 'utf8')
}

export function registerSettingsHandlers() {
  ipcMain.handle('settings:get', async () => readAll())
  ipcMain.handle('settings:set', async (_e, patch: Record<string, unknown>) => {
    const current = await readAll()
    const merged = { ...current, ...patch }
    await writeAll(merged)
  })
}
