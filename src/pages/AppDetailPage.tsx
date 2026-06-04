import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Download, ExternalLink, RefreshCw } from 'lucide-react'
import { findApp, useCatalog } from '@/services/catalog'
import { categoryName, categoryEmoji } from '@/catalog/categories'
import { TAG_META } from '@/utils/tags'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useInstaller, isAppInstalled, isAppUpgradable } from '@/services/installer'
import { formatSizeMb } from '@/utils/format'
import { cn } from '@/utils/cn'

export function AppDetailPage() {
  const { id } = useParams<{ id: string }>()
  const catalog = useCatalog((s) => s.catalog)
  const app = id ? findApp(id, catalog) : undefined

  const installedIds = useInstaller((s) => s.installedIds)
  const upgradableIds = useInstaller((s) => s.upgradableIds)
  const enqueue = useInstaller((s) => s.enqueue)
  const runQueue = useInstaller((s) => s.runQueue)

  const installed = useMemo(() => (app ? isAppInstalled(installedIds, app) : false), [installedIds, app])
  const upgradable = useMemo(() => (app ? isAppUpgradable(upgradableIds, app) : false), [upgradableIds, app])

  if (!app) {
    return (
      <div>
        <Link to="/catalog" className="text-sm text-pcpi-accent hover:underline">
          ← Volver al catálogo
        </Link>
        <p className="mt-4 text-pcpi-text-muted">Aplicación no encontrada.</p>
      </div>
    )
  }

  const install = () => {
    enqueue([app.id])
    void runQueue()
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/catalog"
        className="inline-flex items-center gap-1 text-sm text-pcpi-text-muted hover:text-pcpi-accent"
      >
        <ArrowLeft className="h-4 w-4" /> Volver
      </Link>

      <header className="flex items-start gap-6">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-pcpi-accent to-violet-500 text-4xl font-bold text-white">
          {app.iconUrl ? (
            <img src={app.iconUrl} alt="" className="h-full w-full rounded-2xl object-cover" />
          ) : (
            app.name.charAt(0)
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-sm text-pcpi-text-muted">{app.developer}</div>
          <h1 className="text-3xl font-extrabold">{app.name}</h1>
          <div className="mt-2 flex items-center gap-2 text-sm text-pcpi-text-muted">
            <span>
              {categoryEmoji(app.category)} {categoryName(app.category)}
            </span>
            <span>·</span>
            <span>{app.license}</span>
            {app.version && (
              <>
                <span>·</span>
                <span>v{app.version}</span>
              </>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {app.tags.map((t) => {
              const meta = TAG_META[t]
              return (
                <Badge key={t} className={cn('border', meta.className)}>
                  <span aria-hidden>{meta.emoji}</span>
                  <span>{meta.label}</span>
                </Badge>
              )
            })}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {installed && upgradable ? (
              <Button onClick={install} variant="success">
                <RefreshCw className="h-4 w-4" /> Actualizar
              </Button>
            ) : installed ? (
              <Button variant="outline" onClick={() => app.website && window.pcpi?.app.openExternal(app.website)}>
                <ExternalLink className="h-4 w-4" /> Abrir web
              </Button>
            ) : (
              <Button onClick={install}>
                <Download className="h-4 w-4" /> Instalar
              </Button>
            )}

            {app.website && (
              <Button
                variant="outline"
                onClick={() => window.pcpi?.app.openExternal(app.website!)}
              >
                <ExternalLink className="h-4 w-4" /> Sitio web
              </Button>
            )}
          </div>
        </div>
      </header>

      <Card>
        <CardContent className="p-6">
          <h2 className="mb-2 text-lg font-semibold">Descripción</h2>
          <p className="text-sm leading-relaxed text-pcpi-text-muted-light dark:text-pcpi-text-muted">
            {app.description}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid grid-cols-2 gap-x-8 gap-y-2 p-6 text-sm md:grid-cols-3">
          <Info label="Desarrollador" value={app.developer} />
          <Info label="Categoría" value={categoryName(app.category)} />
          <Info label="Licencia" value={app.license} />
          <Info label="Versión" value={app.version ?? '—'} />
          <Info label="Peso" value={formatSizeMb(app.sizeMb)} />
          <Info label="Winget ID" value={app.wingetId} mono />
        </CardContent>
      </Card>
    </div>
  )
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-pcpi-text-muted">{label}</span>
      <span className={cn('font-medium', mono && 'font-mono text-xs')}>{value}</span>
    </div>
  )
}
