import { ipcMain, app } from 'electron'
import { promises as fs } from 'node:fs'
import path from 'node:path'

export interface HistoryEntry {
  date: string
  appId: string
  appName: string
  version?: string
  result: 'ok' | 'error'
  durationMs: number
}

function historyFile() {
  return path.join(app.getPath('userData'), 'history.json')
}

async function readAll(): Promise<HistoryEntry[]> {
  try {
    const raw = await fs.readFile(historyFile(), 'utf8')
    return JSON.parse(raw) as HistoryEntry[]
  } catch {
    return []
  }
}

async function writeAll(data: HistoryEntry[]) {
  await fs.mkdir(path.dirname(historyFile()), { recursive: true })
  await fs.writeFile(historyFile(), JSON.stringify(data, null, 2), 'utf8')
}

export function registerHistoryHandlers() {
  ipcMain.handle('history:list', async () => readAll())

  ipcMain.handle('history:append', async (_e, entry: Omit<HistoryEntry, 'date'>) => {
    const all = await readAll()
    all.unshift({ ...entry, date: new Date().toISOString() })
    // Keep last 500 entries.
    await writeAll(all.slice(0, 500))
  })

  ipcMain.handle('history:clear', async () => {
    await writeAll([])
  })
}
