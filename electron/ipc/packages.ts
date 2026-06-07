import { ipcMain, BrowserWindow } from 'electron'
import { getProvider } from '../providers'

/**
 * Handlers IPC para operaciones de paquetes.
 *
 * El renderer NUNCA habla con Winget directamente: pasa siempre por aquí,
 * lo que mantiene la app segura (contextIsolation) y permite cambiar el
 * provider (winget / apt / brew / etc.) sin tocar el renderer.
 */
export function registerPackageHandlers() {
  ipcMain.handle('packages:is-available', async () => {
    const provider = getProvider()
    return provider.isAvailable()
  })

  ipcMain.handle('packages:list-installed', async () => {
    const provider = getProvider()
    return provider.listInstalled()
  })

  ipcMain.handle('packages:list-upgradable', async () => {
    const provider = getProvider()
    return provider.listUpgradable()
  })

  ipcMain.handle('packages:download', async (event, id: string) => {
    const provider = getProvider()
    return provider.download(id, (progress) => {
      sendProgress(event.sender.id, { id, ...progress })
    })
  })

  ipcMain.handle('packages:install', async (event, id: string) => {
    const provider = getProvider()
    return provider.install(id, (progress) => {
      sendProgress(event.sender.id, { id, ...progress })
    })
  })

  ipcMain.handle('packages:upgrade', async (event, id: string) => {
    const provider = getProvider()
    return provider.upgrade(id, (progress) => {
      sendProgress(event.sender.id, { id, ...progress })
    })
  })

  ipcMain.handle('packages:uninstall', async (event, id: string) => {
    const provider = getProvider()
    return provider.uninstall(id, (progress) => {
      sendProgress(event.sender.id, { id, ...progress })
    })
  })
}

function sendProgress(
  webContentsId: number,
  payload: { id: string; phase: string; percent?: number; line?: string },
) {
  const win = BrowserWindow.getAllWindows().find((w) => w.webContents.id === webContentsId)
  win?.webContents.send('packages:progress', payload)
}
