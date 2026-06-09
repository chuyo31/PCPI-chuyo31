import type {
  PackageProvider,
  InstalledPackage,
  UpgradablePackage,
  OpResult,
  ProgressEvent,
} from '../types'

/**
 * Stub Linux: la arquitectura está lista para una implementación real
 * basada en apt / flatpak / snap, pero por ahora informa "no disponible".
 */
export class LinuxStubProvider implements PackageProvider {
  readonly id = 'linux-stub'

  async isAvailable() {
    return { available: false, error: 'Linux provider no implementado todavía.' }
  }
  async listInstalled(): Promise<InstalledPackage[]> { return [] }
  async listUpgradable(): Promise<UpgradablePackage[]> { return [] }
  async download(_id: string, _onProgress?: (e: ProgressEvent) => void): Promise<OpResult> {
    return { ok: false, error: 'Linux provider no implementado todavía.' }
  }
  async install(_id: string, _onProgress?: (e: ProgressEvent) => void): Promise<OpResult> {
    return { ok: false, error: 'Linux provider no implementado todavía.' }
  }
  async upgrade(_id: string, _onProgress?: (e: ProgressEvent) => void): Promise<OpResult> {
    return { ok: false, error: 'Linux provider no implementado todavía.' }
  }
  async uninstall(_id: string, _onProgress?: (e: ProgressEvent) => void): Promise<OpResult> {
    return { ok: false, error: 'Linux provider no implementado todavía.' }
  }
  async cancel(_id: string): Promise<{ cancelled: number }> {
    return { cancelled: 0 }
  }
}
