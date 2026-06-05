/**
 * Descarga logos de las apps del catálogo y actualiza catalog.json con iconUrl.
 *
 * Fuentes (en orden):
 * 1. Simple Icons CDN (marcas conocidas, SVG de alta calidad)
 * 2. Google Favicon API 128px (desde website del catálogo)
 *
 * Uso: node scripts/fetch-app-icons.mjs
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const CATALOG_PATH = path.join(ROOT, 'catalog', 'catalog.json')
const ICONS_DIR = path.join(ROOT, 'catalog', 'icons')
const PUBLIC_DIR = path.join(ROOT, 'public', 'icons')
const REMOTE_ICON_BASE =
  'https://raw.githubusercontent.com/chuyo31/PCPI-chuyo31/main/catalog/icons/'

/** Slugs de https://simpleicons.org — solo marcas con logo reconocible. */
const SIMPLE_ICONS = {
  chrome: 'googlechrome',
  firefox: 'firefox',
  brave: 'brave',
  opera: 'opera',
  vivaldi: 'vivaldi',
  vlc: 'vlcmediaplayer',
  kodi: 'kodi',
  handbrake: 'handbrake',
  gimp: 'gimp',
  krita: 'krita',
  inkscape: 'inkscape',
  audacity: 'audacity',
  obs: 'obsstudio',
  streamlabs: 'streamlabs',
  libreoffice: 'libreoffice',
  onlyoffice: 'onlyoffice',
  openoffice: 'openoffice',
  thunderbird: 'thunderbird',
  '7zip': '7zip',
  docker: 'docker',
  git: 'git',
  nodejs: 'nodedotjs',
  vscode: 'visualstudiocode',
  steam: 'steam',
  epicgames: 'epicgames',
  discord: 'discord',
  telegram: 'telegram',
  signal: 'signal',
  dropbox: 'dropbox',
  onedrive: 'microsoftonedrive',
  googledrive: 'googledrive',
  mega: 'mega',
  nextcloud: 'nextcloud',
  postman: 'postman',
  malwarebytes: 'malwarebytes',
  bitdefender: 'bitdefender',
  avast: 'avast',
  notepadpp: 'notepadplusplus',
  lmms: 'lmms',
  ollama: 'ollama',
  etcher: 'balena',
  teamviewer: 'teamviewer',
  anydesk: 'anydesk',
  gog: 'gogdotcom',
  rustdesk: 'rustdesk',
  bleachbit: 'bleachbit',
}

/** Sitios alternativos cuando el website del catálogo no devuelve favicon. */
const ALT_WEBSITE = {
  openshell: 'https://github.com/Open-Shell/Open-Shell-Menu',
  xdm: 'https://github.com/subhra74/xdm',
}

async function fetchBuffer(url, timeoutMs = 20_000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'PCPI-icon-fetch/1.0' },
      redirect: 'follow',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 80) throw new Error('Respuesta demasiado pequeña')
    return buf
  } finally {
    clearTimeout(timer)
  }
}

async function downloadIcon(app) {
  const slug = SIMPLE_ICONS[app.id]
  if (slug) {
    try {
      const buf = await fetchBuffer(`https://cdn.simpleicons.org/${slug}`)
      return { buf, ext: 'svg', source: 'simple-icons' }
    } catch {
      /* fallback */
    }
  }

  for (const site of [app.website, ALT_WEBSITE[app.id]].filter(Boolean)) {
    try {
      const url = `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(site)}&size=128`
      const buf = await fetchBuffer(url)
      return { buf, ext: 'png', source: 'favicon' }
    } catch {
      /* siguiente fuente */
    }
  }

  return null
}

async function syncToPublic() {
  await fs.mkdir(PUBLIC_DIR, { recursive: true })
  const files = await fs.readdir(ICONS_DIR)
  for (const file of files) {
    if (file === '.gitkeep') continue
    await fs.copyFile(path.join(ICONS_DIR, file), path.join(PUBLIC_DIR, file))
  }
}

async function main() {
  const catalog = JSON.parse(await fs.readFile(CATALOG_PATH, 'utf8'))
  await fs.mkdir(ICONS_DIR, { recursive: true })

  let ok = 0
  let fail = 0

  for (const app of catalog) {
    process.stdout.write(`  ${app.id}… `)
    try {
      const result = await downloadIcon(app)
      if (!result) {
        console.log('sin icono')
        fail++
        continue
      }

      const filename = `${app.id}.${result.ext}`
      await fs.writeFile(path.join(ICONS_DIR, filename), result.buf)
      app.iconUrl = `${REMOTE_ICON_BASE}${filename}`
      console.log(`${result.source} → ${filename}`)
      ok++
    } catch (e) {
      console.log(`error: ${e.message}`)
      fail++
    }
  }

  await fs.writeFile(CATALOG_PATH, JSON.stringify(catalog, null, 2) + '\n', 'utf8')
  await syncToPublic()

  console.log(`\nListo: ${ok} iconos · ${fail} sin descargar`)
  console.log(`  catalog/icons/  → fuente en repo`)
  console.log(`  public/icons/   → copia para Vite/Electron`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
