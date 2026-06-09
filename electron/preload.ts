import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

/**
 * Bridge expuesto al renderer (React) bajo `window.pcpi`.
 * Mantenemos la superficie estrictamente tipada para que sea fácil
 * de extender en el futuro (Linux/macOS providers, etc.).
 */
const api = {
  app: {
    getVersion: (): Promise<string> => ipcRenderer.invoke('app:get-version'),
    getPlatform: (): Promise<NodeJS.Platform> => ipcRenderer.invoke('app:get-platform'),
    openExternal: (url: string): Promise<void> => ipcRenderer.invoke('app:open-external', url),
  },

  packages: {
    listInstalled: (): Promise<Array<{ id: string; version: string; name?: string }>> =>
      ipcRenderer.invoke('packages:list-installed'),

    listUpgradable: (): Promise<Array<{ id: string; current: string; available: string }>> =>
      ipcRenderer.invoke('packages:list-upgradable'),

    isAvailable: (): Promise<{ available: boolean; version?: string; error?: string }> =>
      ipcRenderer.invoke('packages:is-available'),

    download: (
      id: string,
    ): Promise<{ ok: boolean; error?: string; message?: string; cancelled?: boolean }> =>
      ipcRenderer.invoke('packages:download', id),

    install: (
      id: string,
    ): Promise<{ ok: boolean; error?: string; message?: string; cancelled?: boolean }> =>
      ipcRenderer.invoke('packages:install', id),

    upgrade: (
      id: string,
    ): Promise<{ ok: boolean; error?: string; cancelled?: boolean }> =>
      ipcRenderer.invoke('packages:upgrade', id),

    uninstall: (
      id: string,
    ): Promise<{ ok: boolean; error?: string; cancelled?: boolean }> =>
      ipcRenderer.invoke('packages:uninstall', id),

    /** Cancela cualquier operación de winget en curso para `id`. */
    cancel: (id: string): Promise<{ cancelled: number }> =>
      ipcRenderer.invoke('packages:cancel', id),

    onProgress: (
      cb: (data: { id: string; phase: string; percent?: number; line?: string }) => void,
    ): (() => void) => {
      const listener = (
        _e: IpcRendererEvent,
        data: { id: string; phase: string; percent?: number; line?: string },
      ) => cb(data)
      ipcRenderer.on('packages:progress', listener)
      return () => ipcRenderer.removeListener('packages:progress', listener)
    },
  },

  settings: {
    get: (): Promise<Record<string, unknown>> => ipcRenderer.invoke('settings:get'),
    set: (patch: Record<string, unknown>): Promise<void> =>
      ipcRenderer.invoke('settings:set', patch),
  },

  history: {
    list: (): Promise<
      Array<{
        date: string
        appId: string
        appName: string
        version?: string
        result: 'ok' | 'error'
        durationMs: number
      }>
    > => ipcRenderer.invoke('history:list'),
    append: (entry: {
      appId: string
      appName: string
      version?: string
      result: 'ok' | 'error'
      durationMs: number
    }): Promise<void> => ipcRenderer.invoke('history:append', entry),
    clear: (): Promise<void> => ipcRenderer.invoke('history:clear'),
  },

  catalog: {
    get: (): Promise<{
      catalog: unknown[]
      packs: unknown[]
      source: 'remote'
      lastUpdate: string
      catalogUrl: string
      packsUrl: string
    } | null> => ipcRenderer.invoke('catalog:get'),

    update: (urls: { catalogUrl: string; packsUrl: string }): Promise<
      | {
          ok: true
          catalog: unknown[]
          packs: unknown[]
          lastUpdate: string
          counts: { catalog: number; packs: number }
        }
      | { ok: false; error: string }
    > => ipcRenderer.invoke('catalog:update', urls),

    reset: (): Promise<{ ok: boolean; error?: string }> =>
      ipcRenderer.invoke('catalog:reset'),
  },
}

contextBridge.exposeInMainWorld('pcpi', api)

export type PCPIApi = typeof api
