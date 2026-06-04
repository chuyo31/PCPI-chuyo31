import type { PackageProvider } from './types'
import { WingetProvider } from './windows/winget'
import { LinuxStubProvider } from './linux'
import { MacOSStubProvider } from './macos'

let cached: PackageProvider | null = null

/**
 * Factory: devuelve el provider apropiado para la plataforma actual.
 * En esta primera versión Linux/macOS son stubs que devuelven `available: false`,
 * pero la arquitectura ya está lista para añadir apt/brew sin tocar el renderer.
 */
export function getProvider(): PackageProvider {
  if (cached) return cached

  switch (process.platform) {
    case 'win32':
      cached = new WingetProvider()
      break
    case 'linux':
      cached = new LinuxStubProvider()
      break
    case 'darwin':
      cached = new MacOSStubProvider()
      break
    default:
      cached = new LinuxStubProvider()
  }

  return cached
}
