import { app, BrowserWindow, ipcMain, shell, nativeTheme, session } from 'electron'
import path from 'node:path'
import { registerPackageHandlers } from './ipc/packages'
import { registerSettingsHandlers } from './ipc/settings'
import { registerHistoryHandlers } from './ipc/history'
import { registerCatalogHandlers } from './ipc/catalog'

// Build directory structure:
// ├─ dist-electron/
// │  ├─ main.js     (este archivo, compilado por vite-plugin-electron)
// │  └─ preload.mjs (preload ESM)
// └─ dist/          (renderer)
//    └─ index.html
process.env.APP_ROOT = path.join(__dirname, '..')
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'PCPI - PC Post Install',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0f172a' : '#f8fafc',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  // Open external links in default browser, never inside the app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

app.whenReady().then(() => {
  installContentSecurityPolicy()

  registerPackageHandlers()
  registerSettingsHandlers()
  registerHistoryHandlers()
  registerCatalogHandlers()

  ipcMain.handle('app:open-external', async (_e, url: string) => {
    await shell.openExternal(url)
  })
  ipcMain.handle('app:get-version', () => app.getVersion())
  ipcMain.handle('app:get-platform', () => process.platform)

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
  mainWindow = null
})

/**
 * Inyecta una Content-Security-Policy estricta para el renderer.
 *
 * - En producción: solo 'self' (más una whitelist para imágenes de iconos remotos).
 * - En desarrollo: añade 'unsafe-eval' y permite conectarse al dev server de Vite,
 *   ya que el HMR de Vite/React necesita evaluar módulos en caliente.
 *
 * Se hace por header de respuesta (no por <meta>) porque es lo que Electron
 * recomienda y silencia su warning "Insecure Content-Security-Policy".
 */
function installContentSecurityPolicy() {
  const isDev = Boolean(VITE_DEV_SERVER_URL)

  const directives = isDev
    ? [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:5173 ws://localhost:5173",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https: http://localhost:5173",
        "font-src 'self' data:",
        "connect-src 'self' http://localhost:5173 ws://localhost:5173 https:",
      ]
    : [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self' data:",
        "connect-src 'self' https:",
      ]

  const policy = directives.join('; ')

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [policy],
      },
    })
  })
}
