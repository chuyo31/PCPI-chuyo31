import type { PCPIApi } from '../electron/preload'

declare global {
  interface Window {
    pcpi: PCPIApi
  }
}

export {}
