import { create } from 'zustand'
import type { AppEntry } from '@/catalog/types'
import { findApp } from './catalog'
import { indexByWingetId, wingetIdMatchKeys } from '@/utils/wingetId'

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

export interface UpgradeInfo {
  current: string
  available: string
}

interface InstallerState {
  queue: QueueItem[]
  running: boolean
  enqueue: (appIds: string[]) => void
  remove: (appId: string) => void
  clearCompleted: () => void
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

  runQueue: async () => {
    if (get().running) return
    set({ running: true })

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
        const successMessage =
          'message' in result && typeof result.message === 'string'
            ? result.message
            : 'Instalación completada'

        const finishedAt = Date.now()
        markItem(set, get, current.app.id, {
          status: result.ok ? 'completed' : 'error',
          percent: result.ok ? 100 : current.percent,
          message: result.ok ? successMessage : (result.error ?? 'Error desconocido'),
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
