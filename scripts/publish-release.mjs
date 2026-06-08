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
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

const args = process.argv.slice(2)
const isDraft = args.includes('--draft')
const isPrerelease = args.includes('--prerelease')

const IS_WIN = process.platform === 'win32'

/** Ejecuta un comando sin shell (args literales). Aborta si falla. */
function run(cmd, cmdArgs, opts = {}) {
  const winCmd = IS_WIN && !cmd.endsWith('.cmd') && !cmd.endsWith('.exe') ? `${cmd}.cmd` : cmd
  const exec = (resolved) =>
    spawnSync(resolved, cmdArgs, { stdio: 'inherit', shell: false, ...opts })

  let res = exec(winCmd)
  if (IS_WIN && res.error?.code === 'ENOENT' && winCmd !== cmd) {
    res = exec(cmd)
  }
  if (res.status !== 0) {
    throw new Error(`Comando fallido: ${cmd} ${cmdArgs.join(' ')}`)
  }
  return res
}

/** Captura stdout sin abortar (devuelve '' si falla). */
function capture(cmd, cmdArgs) {
  const winCmd = IS_WIN && !cmd.endsWith('.cmd') && !cmd.endsWith('.exe') ? `${cmd}.cmd` : cmd
  let res = spawnSync(winCmd, cmdArgs, { encoding: 'utf8', shell: false })
  if (IS_WIN && res.error?.code === 'ENOENT' && winCmd !== cmd) {
    res = spawnSync(cmd, cmdArgs, { encoding: 'utf8', shell: false })
  }
  return res.status === 0 ? (res.stdout?.trim() ?? '') : ''
}

async function main() {
  const pkg = JSON.parse(await fs.readFile(path.join(ROOT, 'package.json'), 'utf8'))
  const version = pkg.version
  const tag = `v${version}`

  console.log(`\nPCPI v${version}`)
  console.log('='.repeat(40))

  const ghVersion = capture('gh', ['--version'])
  if (!ghVersion) {
    console.error('\nERROR: GitHub CLI (gh) no encontrado o no autenticado.')
    console.error('  Instalar:    winget install --id GitHub.cli -e')
    console.error('  Autenticar:  gh auth login')
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
    console.error('\nParece que solo ejecutaste electron-builder --dir (npm run electron:pack).')
    console.error('Ejecuta el empaquetado completo:  npm run dist')
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
