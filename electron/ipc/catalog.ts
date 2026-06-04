import { ipcMain, app, net } from 'electron'
import { promises as fs } from 'node:fs'
import path from 'node:path'

/**
 * Catálogo remoto.
 *
 * - El catálogo del bundle (importado en el renderer desde src/catalog/*.json)
 *   sirve siempre como fallback: aunque no haya internet, la app funciona.
 * - Si el usuario pulsa "Actualizar catálogo", aquí descargamos las dos URLs
 *   (catalog.json y packs.json), validamos su forma y las persistimos en
 *   userData/catalog-remote/. La próxima vez que la app arranque, el renderer
 *   llamará a `catalog:get` y verá la versión remota.
 * - "Restablecer" borra los archivos persistidos y la app vuelve a usar el bundle.
 */

const SCHEMA_VERSION = 1

interface RemotePayload {
  schemaVersion: number
  fetchedAt: string
  source: { catalogUrl: string; packsUrl: string }
  catalog: unknown[]
  packs: unknown[]
}

function remoteDir() {
  return path.join(app.getPath('userData'), 'catalog-remote')
}

function remoteFile() {
  return path.join(remoteDir(), 'data.json')
}

async function readRemote(): Promise<RemotePayload | null> {
  try {
    const raw = await fs.readFile(remoteFile(), 'utf8')
    const parsed = JSON.parse(raw) as RemotePayload
    if (!parsed || parsed.schemaVersion !== SCHEMA_VERSION) return null
    if (!Array.isArray(parsed.catalog) || !Array.isArray(parsed.packs)) return null
    return parsed
  } catch {
    return null
  }
}

async function writeRemote(payload: RemotePayload): Promise<void> {
  await fs.mkdir(remoteDir(), { recursive: true })
  await fs.writeFile(remoteFile(), JSON.stringify(payload, null, 2), 'utf8')
}

/* ---------- Validación ---------- */

const REQUIRED_APP_FIELDS = ['id', 'name', 'wingetId'] as const
const REQUIRED_PACK_FIELDS = ['id', 'name', 'apps'] as const

function validateCatalog(data: unknown): { ok: true; count: number } | { ok: false; error: string } {
  if (!Array.isArray(data)) return { ok: false, error: 'catalog.json no es un array.' }
  for (let i = 0; i < data.length; i++) {
    const a = data[i] as Record<string, unknown>
    if (!a || typeof a !== 'object') return { ok: false, error: `Entrada ${i} no es un objeto.` }
    for (const f of REQUIRED_APP_FIELDS) {
      if (typeof a[f] !== 'string' || !(a[f] as string).length) {
        return { ok: false, error: `Entrada ${i} sin campo obligatorio "${f}".` }
      }
    }
  }
  return { ok: true, count: data.length }
}

function validatePacks(data: unknown): { ok: true; count: number } | { ok: false; error: string } {
  if (!Array.isArray(data)) return { ok: false, error: 'packs.json no es un array.' }
  for (let i = 0; i < data.length; i++) {
    const p = data[i] as Record<string, unknown>
    if (!p || typeof p !== 'object') return { ok: false, error: `Pack ${i} no es un objeto.` }
    for (const f of REQUIRED_PACK_FIELDS) {
      if (!(f in p)) return { ok: false, error: `Pack ${i} sin campo obligatorio "${f}".` }
    }
    if (!Array.isArray((p as { apps: unknown }).apps)) {
      return { ok: false, error: `Pack ${i} ("${(p as { id: string }).id}") tiene apps que no es un array.` }
    }
  }
  return { ok: true, count: data.length }
}

/* ---------- Fetch ---------- */

function fetchJson(url: string, timeoutMs = 15_000): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const request = net.request({
      url,
      redirect: 'follow',
      useSessionCookies: false,
    })

    const chunks: Buffer[] = []
    const timer = setTimeout(() => {
      request.abort()
      reject(new Error(`Timeout (${timeoutMs} ms) descargando ${url}`))
    }, timeoutMs)

    request.on('response', (response) => {
      if (response.statusCode < 200 || response.statusCode >= 300) {
        clearTimeout(timer)
        reject(new Error(`HTTP ${response.statusCode} en ${url}`))
        return
      }
      response.on('data', (b: Buffer) => chunks.push(b))
      response.on('end', () => {
        clearTimeout(timer)
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
        } catch (e) {
          reject(new Error(`JSON inválido en ${url}: ${(e as Error).message}`))
        }
      })
      response.on('error', (err: Error) => {
        clearTimeout(timer)
        reject(err)
      })
    })

    request.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })

    request.end()
  })
}

/* ---------- IPC ---------- */

export function registerCatalogHandlers() {
  // Devuelve el catálogo remoto persistido o null si no hay (renderer usará bundle).
  ipcMain.handle('catalog:get', async () => {
    const data = await readRemote()
    if (!data) return null
    return {
      catalog: data.catalog,
      packs: data.packs,
      source: 'remote' as const,
      lastUpdate: data.fetchedAt,
      catalogUrl: data.source.catalogUrl,
      packsUrl: data.source.packsUrl,
    }
  })

  // Descarga, valida y persiste un nuevo catálogo desde las URLs indicadas.
  ipcMain.handle(
    'catalog:update',
    async (_e, urls: { catalogUrl: string; packsUrl: string }) => {
      if (!urls?.catalogUrl || !urls?.packsUrl) {
        return { ok: false, error: 'Configura las URLs del catálogo en Configuración.' }
      }

      try {
        const [catalog, packs] = await Promise.all([
          fetchJson(urls.catalogUrl),
          fetchJson(urls.packsUrl),
        ])

        const vc = validateCatalog(catalog)
        if (!vc.ok) return { ok: false, error: `catalog.json: ${vc.error}` }
        const vp = validatePacks(packs)
        if (!vp.ok) return { ok: false, error: `packs.json: ${vp.error}` }

        const payload: RemotePayload = {
          schemaVersion: SCHEMA_VERSION,
          fetchedAt: new Date().toISOString(),
          source: { catalogUrl: urls.catalogUrl, packsUrl: urls.packsUrl },
          catalog: catalog as unknown[],
          packs: packs as unknown[],
        }
        await writeRemote(payload)

        return {
          ok: true,
          catalog: payload.catalog,
          packs: payload.packs,
          lastUpdate: payload.fetchedAt,
          counts: { catalog: vc.count, packs: vp.count },
        }
      } catch (e) {
        return { ok: false, error: (e as Error).message }
      }
    },
  )

  // Borra el override remoto: la app vuelve a usar el catálogo del bundle.
  ipcMain.handle('catalog:reset', async () => {
    try {
      await fs.rm(remoteFile(), { force: true })
      return { ok: true }
    } catch (e) {
      return { ok: false, error: (e as Error).message }
    }
  })
}
