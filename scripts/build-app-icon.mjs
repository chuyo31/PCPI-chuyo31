/**
 * Genera el icono de la app PCPI a partir de build/icon.svg:
 *  - build/icon.ico        → icono multi-resolución para Windows / electron-builder
 *  - build/icon.png        → 512×512 (Linux / fallback)
 *  - public/pcpi-icon.png  → 256×256 (favicon de la ventana)
 *  - public/pcpi-icon.svg  → copia del SVG para usar en la UI
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const BUILD_DIR = path.join(ROOT, 'build')
const PUBLIC_DIR = path.join(ROOT, 'public')
const SVG_PATH = path.join(BUILD_DIR, 'icon.svg')

const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256]

async function svgToPng(svgBuffer, size) {
  return sharp(svgBuffer, { density: Math.max(72, Math.round(size * 1.5)) })
    .resize(size, size)
    .png()
    .toBuffer()
}

async function main() {
  const svg = await fs.readFile(SVG_PATH)
  await fs.mkdir(BUILD_DIR, { recursive: true })
  await fs.mkdir(PUBLIC_DIR, { recursive: true })

  console.log('Renderizando PNGs para .ico…')
  const pngBuffers = []
  for (const size of ICO_SIZES) {
    pngBuffers.push(await svgToPng(svg, size))
    process.stdout.write(`  ${size}px ✓\n`)
  }

  console.log('Construyendo build/icon.ico…')
  const ico = await pngToIco(pngBuffers)
  await fs.writeFile(path.join(BUILD_DIR, 'icon.ico'), ico)

  console.log('Generando build/icon.png 512×512…')
  await fs.writeFile(path.join(BUILD_DIR, 'icon.png'), await svgToPng(svg, 512))

  console.log('Generando public/pcpi-icon.png 256×256…')
  await fs.writeFile(path.join(PUBLIC_DIR, 'pcpi-icon.png'), await svgToPng(svg, 256))

  console.log('Copiando public/pcpi-icon.svg…')
  await fs.copyFile(SVG_PATH, path.join(PUBLIC_DIR, 'pcpi-icon.svg'))

  console.log('\nListo:')
  console.log('  build/icon.ico        (Windows / electron-builder)')
  console.log('  build/icon.png        (Linux / fallback)')
  console.log('  public/pcpi-icon.png  (favicon)')
  console.log('  public/pcpi-icon.svg  (UI)')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
