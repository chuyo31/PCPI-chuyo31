import { create } from 'zustand'

export interface AppSettings {
  theme: 'dark' | 'light' | 'system'
  language: 'es' | 'en'
  animations: boolean
  autoUpdate: boolean
  showBeta: boolean
  showExperimental: boolean
  downloadPath: string
  cachePath: string
  catalogUrl: string
  packsUrl: string
}

const DEFAULTS: AppSettings = {
  theme: 'dark',
  language: 'es',
  animations: true,
  autoUpdate: true,
  showBeta: false,
  showExperimental: false,
  downloadPath: '',
  cachePath: '',
  catalogUrl: 'https://raw.githubusercontent.com/chuyo31/PCPI-chuyo31/main/catalog/catalog.json',
  packsUrl: 'https://raw.githubusercontent.com/chuyo31/PCPI-chuyo31/main/catalog/packs.json',
}

interface SettingsStore {
  settings: AppSettings
  loaded: boolean
  load: () => Promise<void>
  update: (patch: Partial<AppSettings>) => Promise<void>
}

export const useSettings = create<SettingsStore>((set, get) => ({
  settings: DEFAULTS,
  loaded: false,

  load: async () => {
    if (!window.pcpi) return
    try {
      const data = (await window.pcpi.settings.get()) as Partial<AppSettings>
      set({ settings: { ...DEFAULTS, ...data }, loaded: true })
    } catch {
      set({ loaded: true })
    }
  },

  update: async (patch) => {
    const merged = { ...get().settings, ...patch }
    set({ settings: merged })
    if (window.pcpi) await window.pcpi.settings.set(patch)
  },
}))
