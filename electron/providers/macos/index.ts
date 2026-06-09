import type {
  PackageProvider,
  InstalledPackage,
  UpgradablePackage,
  OpResult,
  ProgressEvent,
} from '../types'

/**
 * Stub macOS: pendiente de implementación con Homebrew.
 */
export class MacOSStubProvider implements PackageProvider {
  readonly id = 'macos-stub'

  async isAvailable() {
    return { available: false, error: 'macOS provider no implementado todavía.' }
  }
  async listInstalled(): Promise<InstalledPackage[]> { return [] }
  async listUpgradable(): Promise<UpgradablePackage[]> { return [] }
  async download(_id: string, _onProgress?: (e: ProgressEvent) => void): Promise<OpResult> {
    return { ok: false, error: 'macOS provider no implementado todavía.' }
  }
  async install(_id: string, _onProgress?: (e: ProgressEvent) => void): Promise<OpResult> {
    return { ok: false, error: 'macOS provider no implementado todavía.' }
  }
  async upgrade(_id: string, _onProgress?: (e: ProgressEvent) => void): Promise<OpResult> {
    return { ok: false, error: 'macOS provider no implementado todavía.' }
  }
  async uninstall(_id: string, _onProgress?: (e: ProgressEvent) => void): Promise<OpResult> {
    return { ok: false, error: 'macOS provider no implementado todavía.' }
  }
  async cancel(_id: string): Promise<{ cancelled: number }> {
    return { cancelled: 0 }
  }
}
