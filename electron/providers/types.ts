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
  | 'cancelled'
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
  /** Mensaje amigable cuando ok (p. ej. "Ya estaba instalada"). */
  message?: string
  /** true si la operación se detuvo porque el usuario la canceló. */
  cancelled?: boolean
}

export interface PackageProvider {
  /** Identificador legible, p.ej. "winget", "apt", "brew". */
  readonly id: string

  /** Comprobación rápida: ¿está el gestor instalado y accesible? */
  isAvailable(): Promise<{ available: boolean; version?: string; error?: string }>

  listInstalled(): Promise<InstalledPackage[]>
  listUpgradable(): Promise<UpgradablePackage[]>

  /** Descarga el instalador sin ejecutarlo (permite paralelizar descargas). */
  download(id: string, onProgress?: (e: ProgressEvent) => void): Promise<OpResult>
  install(id: string, onProgress?: (e: ProgressEvent) => void): Promise<OpResult>
  upgrade(id: string, onProgress?: (e: ProgressEvent) => void): Promise<OpResult>
  uninstall(id: string, onProgress?: (e: ProgressEvent) => void): Promise<OpResult>

  /**
   * Cancela cualquier operación (download/install/upgrade/uninstall) en curso
   * para el `id` indicado. Devuelve cuántos procesos se han matado.
   */
  cancel(id: string): Promise<{ cancelled: number }>
}
