import { create } from 'zustand'
import type { AppEntry } from '@/catalog/types'
import { findApp } from './catalog'
import { indexByWingetId, wingetIdMatchKeys } from '@/utils/wingetId'

export type QueueStatus =
  | 'pending'
  | 'starting'
  | 'downloading'
  | 'waiting_install'
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

export interface UpgradeInfo {
  current: string
  available: string
}

const ACTIVE_STATUSES: QueueStatus[] = [
  'starting',
  'downloading',
  'waiting_install',
  'verifying',
  'installing',
]

const AUTO_DISMISS_MS = 2000

interface InstallerState {
  queue: QueueItem[]
  running: boolean
  enqueue: (appIds: string[]) => void
  remove: (appId: string) => void
  clearCompleted: () => void
  dismissQueue: () => void
  runQueue: () => Promise<void>

  /** wingetId (minúsculas) → versión instalada */
  installedById: Record<string, string>
  /** wingetId (minúsculas) → info de actualización */
  upgradableById: Record<string, UpgradeInfo>
  systemScanReady: boolean

  refreshSystemState: () => Promise<void>
}

export const useInstaller = create<InstallerState>((set, get) => ({
  queue: [],
  running: false,
  installedById: {},
  upgradableById: {},
  systemScanReady: false,

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

  dismissQueue: () => {
    set({ queue: [] })
  },

  runQueue: async () => {
    if (get().running) return
    if (!window.pcpi) return

    const pending = get().queue.filter((q) => q.status === 'pending')
    if (pending.length === 0) return

    set({ running: true })

    const unsubscribe = window.pcpi.packages.onProgress((p) => {
      const queue = get().queue.map((item) => {
        if (item.app.wingetId !== p.id) return item
        const status = phaseToQueueStatus(p.phase, item.status)
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

    let dismissTimer: ReturnType<typeof setTimeout> | null = null

    const scheduleDismiss = () => {
      if (dismissTimer) clearTimeout(dismissTimer)
      dismissTimer = setTimeout(() => {
        const { running, queue } = get()
        if (running) return
        if (queue.length === 0) return
        if (queue.every((q) => q.status === 'completed' || q.status === 'error')) {
          set({ queue: [] })
        }
      }, AUTO_DISMISS_MS)
    }

    const isQueueIdle = () =>
      !get().queue.some((q) => ACTIVE_STATUSES.includes(q.status) || q.status === 'pending')

    const finishIfIdle = async () => {
      if (!isQueueIdle()) return
      if (dismissTimer) clearTimeout(dismissTimer)
      unsubscribe()
      set({ running: false })
      await get().refreshSystemState()
      scheduleDismiss()
    }

    /** Instalaciones en serie: la primera descargada entra primero. */
    let installChain = Promise.resolve()

    const enqueueInstall = (appId: string) => {
      installChain = installChain.then(async () => {
        const item = get().queue.find((q) => q.app.id === appId)
        if (!item || item.status === 'error' || item.status === 'completed') return

        const startedAt = Date.now()
        markItem(set, get, appId, {
          status: 'installing',
          percent: 0,
          message: 'Instalando en el sistema…',
          startedAt,
        })

        const result = await window.pcpi.packages.install(item.app.wingetId)
        const successMessage =
          'message' in result && typeof result.message === 'string'
            ? result.message
            : 'Instalación completada'
        const finishedAt = Date.now()

        markItem(set, get, appId, {
          status: result.ok ? 'completed' : 'error',
          percent: result.ok ? 100 : item.percent,
          message: result.ok ? successMessage : (result.error ?? 'Error desconocido'),
          finishedAt,
        })

        await window.pcpi.history.append({
          appId: item.app.id,
          appName: item.app.name,
          version: item.app.version,
          result: result.ok ? 'ok' : 'error',
          durationMs: finishedAt - startedAt,
        })
      })
    }

    try {
      /** Descargas en paralelo; al terminar cada una entra en la cola de instalación. */
      await Promise.all(
        pending.map(async (item) => {
          const startedAt = Date.now()
          markItem(set, get, item.app.id, {
            status: 'downloading',
            percent: 0,
            message: 'Descargando instalador…',
            startedAt,
          })

          const result = await window.pcpi.packages.download(item.app.wingetId)

          if (result.ok) {
            markItem(set, get, item.app.id, {
              status: 'waiting_install',
              percent: 100,
              message: 'En cola para instalar…',
            })
            enqueueInstall(item.app.id)
          } else {
            markItem(set, get, item.app.id, {
              status: 'error',
              message: result.error ?? 'Error al descargar',
              finishedAt: Date.now(),
            })
          }
        }),
      )

      await installChain
    } finally {
      await finishIfIdle()
    }
  },

  refreshSystemState: async () => {
    if (!window.pcpi) {
      set({ systemScanReady: true })
      return
    }
    try {
      const [installed, upgradable] = await Promise.all([
        window.pcpi.packages.listInstalled(),
        window.pcpi.packages.listUpgradable(),
      ])

      const installedById = indexByWingetId(
        installed.filter((p) => p.id),
        (p) => p.version,
      )

      const upgradableById = indexByWingetId(
        upgradable.filter((p) => p.id && p.available),
        (p) => ({
          current: p.current,
          available: p.available,
        }),
      )

      set({ installedById, upgradableById, systemScanReady: true })
    } catch {
      set({ systemScanReady: true })
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

function lookupInstalled(
  installedById: Record<string, string>,
  wingetId: string,
): string | undefined {
  for (const key of wingetIdMatchKeys(wingetId)) {
    const v = installedById[key]
    if (v) return v
  }
  return undefined
}

function lookupUpgrade(
  upgradableById: Record<string, UpgradeInfo>,
  wingetId: string,
): UpgradeInfo | undefined {
  for (const key of wingetIdMatchKeys(wingetId)) {
    const info = upgradableById[key]
    if (info) return info
  }
  return undefined
}

export function isAppInstalled(
  installedById: Record<string, string>,
  app: AppEntry,
): boolean {
  return lookupInstalled(installedById, app.wingetId) !== undefined
}

export function getInstalledVersion(
  installedById: Record<string, string>,
  app: AppEntry,
): string | undefined {
  return lookupInstalled(installedById, app.wingetId)
}

export function isAppUpgradable(
  upgradableById: Record<string, UpgradeInfo>,
  app: AppEntry,
): boolean {
  return lookupUpgrade(upgradableById, app.wingetId) !== undefined
}

export function getUpgradeInfo(
  upgradableById: Record<string, UpgradeInfo>,
  app: AppEntry,
): UpgradeInfo | undefined {
  return lookupUpgrade(upgradableById, app.wingetId)
}

function phaseToQueueStatus(phase: string, current: QueueStatus): QueueStatus {
  if (current === 'waiting_install' && phase !== 'completed' && phase !== 'error') {
    return 'waiting_install'
  }

  switch (phase) {
    case 'completed':
      return current === 'downloading' ? 'waiting_install' : 'completed'
    case 'error':
      return 'error'
    case 'downloading':
      return 'downloading'
    case 'verifying':
      return current === 'installing' ? 'verifying' : 'downloading'
    case 'installing':
    case 'upgrading':
    case 'uninstalling':
      return 'installing'
    default:
      return current === 'installing' ? 'installing' : 'downloading'
  }
}
