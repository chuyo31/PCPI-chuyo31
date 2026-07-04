import { useInstaller } from '@/services/installer'
import type { QueueStatus } from '@/services/installer'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { X, Ban } from 'lucide-react'
import { cn } from '@/utils/cn'
import { queueStatusLabel, isIndeterminateProgress } from '@/utils/installStatus'

const ACTIVE: QueueStatus[] = [
  'starting',
  'downloading',
  'waiting_install',
  'verifying',
  'installing',
]

const TERMINAL: QueueStatus[] = ['completed', 'cancelled', 'error']

/**
 * Barra inferior con la cola global de instalación.
 * Descargas en serie; instalaciones una tras otra (solapadas entre sí:
 * se descarga la siguiente mientras se instala la actual).
 */
export function InstallQueueBar() {
  const queue = useInstaller((s) => s.queue)
  const running = useInstaller((s) => s.running)
  const remove = useInstaller((s) => s.remove)
  const dismiss = useInstaller((s) => s.dismissQueue)
  const cancelItem = useInstaller((s) => s.cancelItem)
  const cancelAll = useInstaller((s) => s.cancelAll)

  if (queue.length === 0) return null

  const total = queue.length
  const done = queue.filter((q) => q.status === 'completed').length
  const errors = queue.filter((q) => q.status === 'error').length
  const cancelledCount = queue.filter((q) => q.status === 'cancelled').length
  const downloading = queue.filter((q) => q.status === 'downloading')
  const waiting = queue.filter((q) => q.status === 'waiting_install')
  const installing = queue.find((q) => q.status === 'installing' || q.status === 'verifying')
  const hasActive = queue.some((q) => ACTIVE.includes(q.status) || q.status === 'pending')

  const current =
    installing ?? downloading[0] ?? waiting[0] ?? queue.find((q) => ACTIVE.includes(q.status))

  const progressUnits = queue.reduce((sum, q) => {
    if (TERMINAL.includes(q.status)) return sum + 1
    if (q.status === 'waiting_install') return sum + 0.85
    if (q.status === 'installing' || q.status === 'verifying') {
      return sum + 0.5 + (q.percent > 0 ? q.percent / 200 : 0.1)
    }
    if (q.status === 'downloading') {
      return sum + (q.percent > 0 ? q.percent / 100 : 0.05)
    }
    return sum
  }, 0)

  const globalPercent = Math.min(100, Math.round((progressUnits / total) * 100))
  const currentPercent = current?.percent ?? 0

  const finalisedSummary = () => {
    const parts: string[] = []
    if (done > 0) parts.push(`${done} ok`)
    if (errors > 0) parts.push(`${errors} error${errors === 1 ? '' : 'es'}`)
    if (cancelledCount > 0) parts.push(`${cancelledCount} cancelada${cancelledCount === 1 ? '' : 's'}`)
    return parts.length > 0 ? `Finalizado · ${parts.join(' · ')}` : `Completado · ${total} de ${total}`
  }

  const headline = running
    ? installing
      ? `Instalando ${done + 1} de ${total}`
      : downloading.length > 0
        ? `Descargando · ${done} instaladas`
        : waiting.length > 0
          ? `${waiting.length} en cola de instalación`
          : `Procesando ${done + 1} de ${total}`
    : queue.every((q) => TERMINAL.includes(q.status))
      ? finalisedSummary()
      : `${done} de ${total} completados`

  return (
    <div className="border-t border-white/5 bg-pcpi-panel-light dark:bg-pcpi-panel px-6 py-3">
      <div className="flex items-center justify-between gap-4 text-xs">
        <div className="min-w-0 flex-1">
          <div className="font-medium">{headline}</div>
          {current && (
            <p className="mt-0.5 truncate text-pcpi-text-muted-light dark:text-pcpi-text-muted">
              <span className="font-medium text-pcpi-text-light dark:text-pcpi-text">
                {current.app.name}
              </span>
              {' — '}
              {queueStatusLabel(current.status, current.percent, current.message)}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {current && currentPercent > 0 && ACTIVE.includes(current.status) && (
            <span className="text-pcpi-text-muted tabular-nums">{currentPercent}%</span>
          )}
          <span className="text-pcpi-text-muted tabular-nums">{globalPercent}%</span>
          {hasActive && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void cancelAll()}
              className="gap-1 text-pcpi-danger hover:bg-pcpi-danger/10 hover:text-pcpi-danger"
              aria-label="Cancelar todas las instalaciones pendientes"
            >
              <Ban className="h-3.5 w-3.5" />
              <span>Cancelar todo</span>
            </Button>
          )}
          {!hasActive && (
            <Button size="sm" variant="ghost" onClick={dismiss} aria-label="Cerrar">
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      <div className="mt-2 space-y-1">
        {current && ACTIVE.includes(current.status) && (
          <Progress
            value={currentPercent > 0 ? currentPercent : 0}
            indeterminate={isIndeterminateProgress(current.status, current.percent)}
            className="h-1.5"
          />
        )}
        <Progress value={globalPercent} className="h-2 opacity-70" />
      </div>

      <ul className="mt-3 grid max-h-40 grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
        {queue.map((q) => {
          const isActive = ACTIVE.includes(q.status) || q.status === 'pending'
          return (
            <li
              key={q.app.id}
              className={cn(
                'flex flex-col gap-0.5 rounded-md border border-white/5 bg-pcpi-card-light dark:bg-pcpi-card/40 px-2 py-1.5',
                ACTIVE.includes(q.status) && 'border-pcpi-accent/25',
                q.status === 'waiting_install' && 'border-amber-500/20',
                q.status === 'cancelled' && 'border-pcpi-danger/20 opacity-70',
              )}
            >
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-xs font-medium">{q.app.name}</span>
                {isActive ? (
                  <button
                    onClick={() => void cancelItem(q.app.id)}
                    className="shrink-0 text-pcpi-text-muted hover:text-pcpi-danger"
                    aria-label={`Cancelar ${q.app.name}`}
                    title="Cancelar esta instalación"
                  >
                    <Ban className="h-3 w-3" />
                  </button>
                ) : (
                  <button
                    onClick={() => remove(q.app.id)}
                    className="shrink-0 opacity-50 hover:opacity-100"
                    aria-label="Quitar"
                    title="Quitar de la lista"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <StatusLine status={q.status} percent={q.percent} message={q.message} />
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function StatusLine({
  status,
  percent,
  message,
}: {
  status: string
  percent: number
  message?: string
}) {
  const label = queueStatusLabel(status as Parameters<typeof queueStatusLabel>[0], percent, message)
  const styles: Record<string, string> = {
    pending: 'text-pcpi-text-muted',
    starting: 'text-pcpi-accent',
    downloading: 'text-pcpi-accent',
    waiting_install: 'text-amber-400',
    verifying: 'text-pcpi-accent',
    installing: 'text-violet-400',
    completed: 'text-pcpi-success',
    cancelled: 'text-pcpi-danger',
    error: 'text-pcpi-danger',
  }
  return (
    <span className={cn('text-[10px] leading-snug', styles[status] ?? 'text-pcpi-text-muted')}>
      {label}
    </span>
  )
}
