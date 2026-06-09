/**
 * Publica una release de PCPI en GitHub.
 *
 * Requiere:
 *   - GitHub CLI (`gh`) instalado y autenticado (`gh auth login`).
 *   - Haber ejecutado antes `npm run dist` (o dist:portable / dist:installer).
 *
 * Uso:
 *   npm run release
 *   npm run release -- --draft
 *   npm run release -- --prerelease
 */
import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

const args = process.argv.slice(2)
const isDraft = args.includes('--draft')
const isPrerelease = args.includes('--prerelease')

const IS_WIN = process.platform === 'win32'

/**
 * Localiza un ejecutable usando PATH + PATHEXT (Windows) o solo PATH (otros).
 * Necesario porque spawnSync({shell:false}) no resuelve extensiones por si solo.
 */
function which(cmd) {
  const dirs = (process.env.PATH ?? '').split(IS_WIN ? ';' : ':').filter(Boolean)
  const exts = IS_WIN
    ? (process.env.PATHEXT ?? '.COM;.EXE;.BAT;.CMD').split(';').filter(Boolean)
    : ['']
  for (const dir of dirs) {
    for (const ext of exts) {
      const full = path.join(dir, cmd + ext)
      if (existsSync(full)) return full
    }
  }
  return null
}

function run(cmd, cmdArgs, opts = {}) {
  const bin = which(cmd)
  if (!bin) throw new Error(`No encuentro el ejecutable: ${cmd}`)
  const res = spawnSync(bin, cmdArgs, { stdio: 'inherit', shell: false, ...opts })
  if (res.status !== 0) {
    throw new Error(`Comando fallido: ${cmd} ${cmdArgs.join(' ')}`)
  }
  return res
}

function capture(cmd, cmdArgs) {
  const bin = which(cmd)
  if (!bin) return ''
  const res = spawnSync(bin, cmdArgs, { encoding: 'utf8', shell: false })
  return res.status === 0 ? (res.stdout?.trim() ?? '') : ''
}

async function main() {
  const pkg = JSON.parse(await fs.readFile(path.join(ROOT, 'package.json'), 'utf8'))
  const version = pkg.version
  const tag = `v${version}`

  console.log(`\nPCPI v${version}`)
  console.log('='.repeat(40))

  const ghBin = which('gh')
  if (!ghBin) {
    console.error('\nERROR: No encuentro gh.exe en el PATH.')
    console.error('  Instalar:    winget install --id GitHub.cli -e')
    console.error('  Luego cierra y reabre PowerShell.')
    process.exit(1)
  }

  const ghVersion = capture('gh', ['--version'])
  if (!ghVersion) {
    console.error(`\nERROR: gh esta en ${ghBin} pero no responde.`)
    process.exit(1)
  }
  console.log(ghVersion.split('\n')[0])

  if (!capture('gh', ['auth', 'status'])) {
    console.error('\nERROR: gh no esta autenticado. Ejecuta:  gh auth login')
    process.exit(1)
  }

  // Buscar binarios reales (no metadata de electron-builder)
  const releaseDir = path.join(ROOT, 'release', version)
  let files
  try {
    files = await fs.readdir(releaseDir)
  } catch {
    console.error(`\nERROR: ${releaseDir} no existe.`)
    console.error('Ejecuta primero:  npm run dist')
    process.exit(1)
  }

  const RELEASE_EXTS = ['.exe', '.zip', '.msi', '.appx', '.dmg', '.AppImage', '.deb', '.rpm']
  const assets = files
    .filter((f) => RELEASE_EXTS.some((ext) => f.toLowerCase().endsWith(ext.toLowerCase())))
    .map((f) => path.join(releaseDir, f))

  if (assets.length === 0) {
    console.error(`\nERROR: No se encontraron ejecutables en ${releaseDir}.`)
    console.error('Archivos presentes:')
    for (const f of files) console.error(`  ${f}`)
    console.error('\nLanza el empaquetado completo:  npm run dist')
    process.exit(1)
  }

  console.log('\nArchivos a subir:')
  for (const a of assets) {
    const stat = await fs.stat(a)
    console.log(`  ${path.basename(a)}  (${(stat.size / 1024 / 1024).toFixed(1)} MB)`)
  }

  // Tag local
  const tagExists = capture('git', ['tag', '--list', tag])
  if (!tagExists) {
    console.log(`\nCreando tag ${tag}...`)
    run('git', ['tag', '-a', tag, '-m', `PCPI ${tag}`])
  } else {
    console.log(`\nTag ${tag} ya existe localmente, se reutiliza.`)
  }

  console.log(`Empujando tag ${tag} al remoto...`)
  run('git', ['push', 'origin', tag])

  // Notas
  const notesPath = path.join(ROOT, `RELEASE-NOTES-${tag}.md`)
  let notesFile = ''
  try {
    await fs.access(notesPath)
    notesFile = notesPath
  } catch {}

  console.log(`\nCreando release ${tag} en GitHub...`)
  const ghArgs = ['release', 'create', tag, ...assets, '--title', `PCPI ${tag}`, '--verify-tag']
  if (notesFile) ghArgs.push('--notes-file', notesFile)
  else ghArgs.push('--generate-notes')
  if (isDraft) ghArgs.push('--draft')
  if (isPrerelease) ghArgs.push('--prerelease')

  run('gh', ghArgs)

  console.log(`\n[OK] Release ${tag} publicada.`)
  console.log(`URL: https://github.com/chuyo31/PCPI-chuyo31/releases/tag/${tag}`)
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
