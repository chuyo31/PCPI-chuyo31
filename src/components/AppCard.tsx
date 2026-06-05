import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, ExternalLink, RefreshCw, CheckCircle2, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { AppEntry } from '@/catalog/types'
import { TAG_META } from '@/utils/tags'
import { categoryName } from '@/catalog/categories'
import { formatSizeMb } from '@/utils/format'
import {
  useInstaller,
  isAppInstalled,
  isAppUpgradable,
  getInstalledVersion,
  getUpgradeInfo,
} from '@/services/installer'
import { queueStatusLabel } from '@/utils/installStatus'
import { cn } from '@/utils/cn'
import { AppIcon } from '@/components/AppIcon'

interface AppCardProps {
  app: AppEntry
  selected?: boolean
  onToggleSelect?: () => void
}

export function AppCard({ app, selected, onToggleSelect }: AppCardProps) {
  const navigate = useNavigate()
  const installedById = useInstaller((s) => s.installedById)
  const upgradableById = useInstaller((s) => s.upgradableById)
  const systemScanReady = useInstaller((s) => s.systemScanReady)
  const enqueue = useInstaller((s) => s.enqueue)
  const runQueue = useInstaller((s) => s.runQueue)
  const queueItem = useInstaller((s) => s.queue.find((q) => q.app.id === app.id))

  const installed = useMemo(
    () => systemScanReady && isAppInstalled(installedById, app),
    [installedById, app, systemScanReady],
  )
  const upgradable = useMemo(
    () => systemScanReady && isAppUpgradable(upgradableById, app),
    [upgradableById, app, systemScanReady],
  )
  const installedVersion = useMemo(
    () => getInstalledVersion(installedById, app),
    [installedById, app],
  )
  const upgradeInfo = useMemo(
    () => getUpgradeInfo(upgradableById, app),
    [upgradableById, app],
  )

  const onInstall = (e: React.MouseEvent) => {
    e.stopPropagation()
    enqueue([app.id])
    void runQueue()
  }

  const goDetail = () => navigate(`/app/${app.id}`)

  return (
    <Card
      onClick={goDetail}
      className={cn(
        'group relative flex flex-col cursor-pointer overflow-hidden',
        'hover:scale-[1.03] hover:shadow-xl hover:shadow-pcpi-accent/10 hover:border-pcpi-accent/30',
        selected && 'ring-2 ring-pcpi-accent border-pcpi-accent/50',
        installed && !upgradable && 'border-pcpi-success/25',
        upgradable && 'border-pcpi-warning/40',
      )}
    >
      {(installed || upgradable) && (
        <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-1">
          {installed && (
            <Badge variant="success" className="text-[10px] shadow-sm">
              Instalada
            </Badge>
          )}
          {upgradable && (
            <Badge variant="warning" className="text-[10px] shadow-sm">
              Actualización
            </Badge>
          )}
        </div>
      )}
      {onToggleSelect && (
        <div
          className="absolute top-3 right-3 z-10"
          onClick={(e) => {
            e.stopPropagation()
            onToggleSelect()
          }}
        >
          <div
            className={cn(
              'flex h-5 w-5 items-center justify-center rounded border border-white/20 bg-pcpi-bg/60 backdrop-blur',
              selected && 'bg-pcpi-accent border-pcpi-accent',
            )}
          >
            {selected && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
          </div>
        </div>
      )}

      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <AppIcon app={app} className="h-10 w-10" imgClassName="rounded-lg" />
          <div className="min-w-0 flex-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <h3 className="truncate text-sm font-semibold leading-tight">{app.name}</h3>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  <div className="font-semibold">{app.name}</div>
                  <div className="text-pcpi-text-muted">{app.description}</div>
                  <div className="pt-1 grid grid-cols-2 gap-x-3 gap-y-0.5">
                    <span className="text-pcpi-text-muted">Licencia:</span><span>{app.license}</span>
                    <span className="text-pcpi-text-muted">Categoría:</span><span>{categoryName(app.category)}</span>
                    <span className="text-pcpi-text-muted">Peso:</span><span>{formatSizeMb(app.sizeMb)}</span>
                  </div>
                  {app.website && (
                    <div className="pt-1 text-pcpi-accent break-all">{app.website}</div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
            <div className="truncate text-xs text-pcpi-text-muted-light dark:text-pcpi-text-muted">
              {app.developer}
            </div>
          </div>
        </div>

        <p className="line-clamp-2 text-xs text-pcpi-text-muted-light dark:text-pcpi-text-muted">
          {app.description}
        </p>

        <div className="mt-auto flex flex-wrap gap-1">
          {app.tags.slice(0, 3).map((t) => {
            const meta = TAG_META[t]
            return (
              <Badge key={t} className={cn('border', meta.className)}>
                <span aria-hidden>{meta.emoji}</span>
                <span>{meta.label}</span>
              </Badge>
            )
          })}
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="text-[11px] text-pcpi-text-muted-light dark:text-pcpi-text-muted">
            {installedVersion
              ? `v${installedVersion}`
              : app.version ?? '—'}
            {upgradeInfo && (
              <span className="text-pcpi-warning"> → v{upgradeInfo.available}</span>
            )}
            {' · '}
            {formatSizeMb(app.sizeMb)}
          </div>

          {queueItem && queueItem.status !== 'completed' && queueItem.status !== 'error' ? (
            <Button size="sm" variant="secondary" disabled className="max-w-[11rem]">
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
              <span className="truncate text-left">
                {queueStatusLabel(queueItem.status, queueItem.percent, queueItem.message)}
              </span>
            </Button>
          ) : installed && upgradable ? (
            <Button size="sm" variant="success" onClick={onInstall}>
              <RefreshCw className="h-3.5 w-3.5" /> Actualizar
            </Button>
          ) : installed ? (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation()
                if (app.website) void window.pcpi?.app.openExternal(app.website)
              }}
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-pcpi-success" /> Instalada
            </Button>
          ) : (
            <Button size="sm" onClick={onInstall}>
              <Download className="h-3.5 w-3.5" /> Instalar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

