/**
 * Publica una release de PCPI en GitHub.
 *
 * Requiere:
 *   - GitHub CLI (`gh`) instalado y autenticado (`gh auth login`).
 *   - Haber ejecutado antes `npm run dist` para generar los .exe/.zip.
 *
 * Uso:
 *   node scripts/publish-release.mjs            -> usa la version del package.json
 *   node scripts/publish-release.mjs --draft    -> crea draft (no publica)
 *   node scripts/publish-release.mjs --prerelease
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

function run(cmd, cmdArgs, opts = {}) {
  const result = spawnSync(cmd, cmdArgs, { stdio: 'inherit', shell: true, ...opts })
  if (result.status !== 0) {
    throw new Error(`Comando fallido: ${cmd} ${cmdArgs.join(' ')}`)
  }
  return result
}

function capture(cmd, cmdArgs) {
  const result = spawnSync(cmd, cmdArgs, { encoding: 'utf8', shell: true })
  return result.stdout?.trim() ?? ''
}

async function main() {
  const pkg = JSON.parse(await fs.readFile(path.join(ROOT, 'package.json'), 'utf8'))
  const version = pkg.version
  const tag = `v${version}`

  console.log(`\nPCPI v${version}`)
  console.log('='.repeat(40))

  // 1. Comprobar gh
  const ghVersion = capture('gh', ['--version'])
  if (!ghVersion) {
    console.error('\nERROR: GitHub CLI (gh) no encontrado.')
    console.error('Instalalo con: winget install GitHub.cli')
    process.exit(1)
  }
  console.log(ghVersion.split('\n')[0])

  // 2. Comprobar auth
  const authStatus = spawnSync('gh', ['auth', 'status'], { encoding: 'utf8', shell: true })
  if (authStatus.status !== 0) {
    console.error('\nERROR: gh no esta autenticado.')
    console.error('Autenticate con: gh auth login')
    process.exit(1)
  }

  // 3. Localizar binarios en release/<version>/
  const releaseDir = path.join(ROOT, 'release', version)
  let files
  try {
    files = await fs.readdir(releaseDir)
  } catch {
    console.error(`\nERROR: No se encuentra ${releaseDir}`)
    console.error('Ejecuta primero: npm run dist')
    process.exit(1)
  }

  const assets = files
    .filter((f) => /\.(exe|zip|blockmap|yml)$/i.test(f))
    .filter((f) => !f.endsWith('.yml.blockmap'))
    .map((f) => path.join(releaseDir, f))

  if (assets.length === 0) {
    console.error('\nERROR: No hay binarios en release/. Ejecuta npm run dist primero.')
    process.exit(1)
  }

  console.log('\nArchivos a subir:')
  for (const a of assets) {
    const stat = await fs.stat(a)
    console.log(`  ${path.basename(a)}  (${(stat.size / 1024 / 1024).toFixed(1)} MB)`)
  }

  // 4. Crear tag local si no existe y empujarlo
  const tagExists = capture('git', ['tag', '--list', tag])
  if (!tagExists) {
    console.log(`\nCreando tag ${tag}...`)
    run('git', ['tag', '-a', tag, '-m', `PCPI ${tag}`])
  } else {
    console.log(`\nTag ${tag} ya existe localmente.`)
  }

  console.log(`Empujando tag ${tag} al remoto...`)
  run('git', ['push', 'origin', tag])

  // 5. Notas de release (CHANGELOG.md o las que generamos)
  const notesPath = path.join(ROOT, `RELEASE-NOTES-${tag}.md`)
  let notesFile = notesPath
  try {
    await fs.access(notesPath)
  } catch {
    notesFile = ''
  }

  // 6. Crear release
  console.log(`\nCreando release ${tag} en GitHub...`)
  const ghArgs = [
    'release',
    'create',
    tag,
    ...assets,
    '--title',
    `PCPI ${tag}`,
    '--verify-tag',
  ]
  if (notesFile) ghArgs.push('--notes-file', notesFile)
  else ghArgs.push('--generate-notes')
  if (isDraft) ghArgs.push('--draft')
  if (isPrerelease) ghArgs.push('--prerelease')

  run('gh', ghArgs)

  console.log(`\n[OK] Release ${tag} publicada.`)
  console.log(`Veala en: https://github.com/chuyo31/PCPI-chuyo31/releases/tag/${tag}`)
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
