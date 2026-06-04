/**
 * Contrato común que TODOS los providers (Winget, APT, Brew, ...) deben cumplir.
 * Mantenerlo estrecho y estable permite añadir Linux/macOS sin tocar el renderer.
 */

export type Phase =
  | 'pending'
  | 'downloading'
  | 'verifying'
  | 'installing'
  | 'uninstalling'
  | 'upgrading'
  | 'completed'
  | 'error'

export interface ProgressEvent {
  phase: Phase
  percent?: number
  line?: string
}

export interface InstalledPackage {
  id: string
  name?: string
  version: string
}

export interface UpgradablePackage {
  id: string
  current: string
  available: string
}

export interface OpResult {
  ok: boolean
  error?: string
}

export interface PackageProvider {
  /** Identificador legible, p.ej. "winget", "apt", "brew". */
  readonly id: string

  /** Comprobación rápida: ¿está el gestor instalado y accesible? */
  isAvailable(): Promise<{ available: boolean; version?: string; error?: string }>

  listInstalled(): Promise<InstalledPackage[]>
  listUpgradable(): Promise<UpgradablePackage[]>

  install(id: string, onProgress?: (e: ProgressEvent) => void): Promise<OpResult>
  upgrade(id: string, onProgress?: (e: ProgressEvent) => void): Promise<OpResult>
  uninstall(id: string, onProgress?: (e: ProgressEvent) => void): Promise<OpResult>
}
