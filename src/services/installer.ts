import { create } from 'zustand'
import type { AppEntry } from '@/catalog/types'
import { findApp } from './catalog'

export type QueueStatus =
  | 'pending'
  | 'starting'
  | 'downloading'
  | 'verifying'
  | 'installing'
  | 'completed'
  | 'error'

export interface QueueItem {
  app: AppEntry
  status: QueueStatus
  percent: number
  message?: string
  startedAt?: number
  finishedAt?: number
}

interface InstallerState {
  queue: QueueItem[]
  running: boolean
  enqueue: (appIds: string[]) => void
  remove: (appId: string) => void
  clearCompleted: () => void
  runQueue: () => Promise<void>

  /** Reactividad: estos sets cambian tras detectar y permiten re-render fino. */
  installedIds: Set<string>
  upgradableIds: Set<string>
  refreshSystemState: () => Promise<void>
}

export const useInstaller = create<InstallerState>((set, get) => ({
  queue: [],
  running: false,
  installedIds: new Set(),
  upgradableIds: new Set(),

  enqueue: (appIds) => {
    const queue = [...get().queue]
    for (const id of appIds) {
      const app = findApp(id)
      if (!app) continue
      if (queue.some((q) => q.app.id === id && q.status !== 'completed' && q.status !== 'error')) {
        continue
      }
      queue.push({ app, status: 'pending', percent: 0 })
    }
    set({ queue })
  },

  remove: (appId) => {
    set({ queue: get().queue.filter((q) => q.app.id !== appId) })
  },

  clearCompleted: () => {
    set({ queue: get().queue.filter((q) => q.status !== 'completed' && q.status !== 'error') })
  },

  runQueue: async () => {
    if (get().running) return
    set({ running: true })

    // Suscripción a eventos de progreso del main.
    const unsubscribe = window.pcpi.packages.onProgress((p) => {
      const queue = get().queue.map((item) => {
        if (item.app.wingetId !== p.id) return item
        const status = phaseToQueueStatus(p.phase)
        const percent =
          p.percent !== undefined ? Math.max(item.percent, p.percent) : item.percent
        return {
          ...item,
          status,
          percent,
          message: p.line ?? item.message,
        }
      })
      set({ queue })
    })

    try {
      // Ejecutamos en serie para no saturar Winget ni la red.
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const current = get().queue.find((q) => q.status === 'pending')
        if (!current) break

        const startedAt = Date.now()
        markItem(set, get, current.app.id, {
          status: 'starting',
          percent: 0,
          message: 'Iniciando Winget…',
          startedAt,
        })

        const result = await window.pcpi.packages.install(current.app.wingetId)

        const finishedAt = Date.now()
        markItem(set, get, current.app.id, {
          status: result.ok ? 'completed' : 'error',
          percent: result.ok ? 100 : current.percent,
          message: result.ok ? 'Instalación completada' : result.error,
          finishedAt,
        })

        await window.pcpi.history.append({
          appId: current.app.id,
          appName: current.app.name,
          version: current.app.version,
          result: result.ok ? 'ok' : 'error',
          durationMs: finishedAt - startedAt,
        })
      }
    } finally {
      unsubscribe()
      set({ running: false })
      await get().refreshSystemState()
    }
  },

  refreshSystemState: async () => {
    try {
      const [installed, upgradable] = await Promise.all([
        window.pcpi.packages.listInstalled(),
        window.pcpi.packages.listUpgradable(),
      ])
      const installedIds = new Set(installed.map((p) => p.id.toLowerCase()))
      const upgradableIds = new Set(upgradable.map((p) => p.id.toLowerCase()))
      set({ installedIds, upgradableIds })
    } catch {
      // Ignorar: Winget puede no estar disponible (Linux/macOS).
    }
  },
}))

function markItem(
  set: (partial: Partial<InstallerState>) => void,
  get: () => InstallerState,
  appId: string,
  patch: Partial<QueueItem>,
) {
  set({
    queue: get().queue.map((q) => (q.app.id === appId ? { ...q, ...patch } : q)),
  })
}

/** Helper: ¿hay una app instalada según el último refresh? */
export function isAppInstalled(installedIds: Set<string>, app: AppEntry): boolean {
  return installedIds.has(app.wingetId.toLowerCase())
}

export function isAppUpgradable(upgradableIds: Set<string>, app: AppEntry): boolean {
  return upgradableIds.has(app.wingetId.toLowerCase())
}

function phaseToQueueStatus(phase: string): QueueStatus {
  switch (phase) {
    case 'completed':
      return 'completed'
    case 'error':
      return 'error'
    case 'downloading':
      return 'downloading'
    case 'verifying':
      return 'verifying'
    case 'installing':
    case 'upgrading':
    case 'uninstalling':
      return 'installing'
    default:
      return 'downloading'
  }
}
