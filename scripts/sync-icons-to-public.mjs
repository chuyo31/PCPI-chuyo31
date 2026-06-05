/**
 * Copia catalog/icons → public/icons para que Vite los sirva en dev y build.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const SRC = path.join(ROOT, 'catalog', 'icons')
const DEST = path.join(ROOT, 'public', 'icons')

async function main() {
  await fs.mkdir(DEST, { recursive: true })
  let count = 0
  try {
    const files = await fs.readdir(SRC)
    for (const file of files) {
      if (file === '.gitkeep') continue
      await fs.copyFile(path.join(SRC, file), path.join(DEST, file))
      count++
    }
  } catch (e) {
    if (e.code !== 'ENOENT') throw e
  }
  console.log(`Iconos sincronizados: ${count} → public/icons/`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
