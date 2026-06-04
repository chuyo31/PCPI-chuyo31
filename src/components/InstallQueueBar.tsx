import { useInstaller } from '@/services/installer'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { X, Trash2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import { queueStatusLabel, isIndeterminateProgress } from '@/utils/installStatus'

const ACTIVE: string[] = ['starting', 'downloading', 'verifying', 'installing']

/**
 * Barra inferior con la cola global de instalación.
 * Muestra qué hace Winget en cada momento (descarga vs instalación).
 */
export function InstallQueueBar() {
  const queue = useInstaller((s) => s.queue)
  const running = useInstaller((s) => s.running)
  const remove = useInstaller((s) => s.remove)
  const clear = useInstaller((s) => s.clearCompleted)

  if (queue.length === 0) return null

  const total = queue.length
  const done = queue.filter((q) => q.status === 'completed').length
  const current = queue.find((q) => ACTIVE.includes(q.status))
  const currentPercent = current?.percent ?? 0
  const globalPercent = Math.round(
    ((done + (current && currentPercent > 0 ? currentPercent / 100 : running ? 0.05 : 0)) / total) *
      100,
  )

  return (
    <div className="border-t border-white/5 bg-pcpi-panel-light dark:bg-pcpi-panel px-6 py-3">
      <div className="flex items-center justify-between gap-4 text-xs">
        <div className="min-w-0 flex-1">
          <div className="font-medium">
            {running
              ? `Instalando ${Math.min(done + 1, total)} de ${total}`
              : done === total
                ? `Completado · ${total} de ${total}`
                : `${done} de ${total} completados`}
          </div>
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
          {current && currentPercent > 0 && (
            <span className="text-pcpi-text-muted tabular-nums">{currentPercent}%</span>
          )}
          <span className="text-pcpi-text-muted tabular-nums">{globalPercent}%</span>
          <Button size="sm" variant="ghost" onClick={clear} aria-label="Limpiar terminados">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="mt-2 space-y-1">
        {current && (
          <Progress
            value={currentPercent > 0 ? currentPercent : 0}
            indeterminate={isIndeterminateProgress(current.status, current.percent)}
            className="h-1.5"
          />
        )}
        <Progress value={globalPercent} className="h-2 opacity-70" />
      </div>

      <ul className="mt-3 grid max-h-40 grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
        {queue.map((q) => (
          <li
            key={q.app.id}
            className={cn(
              'flex flex-col gap-0.5 rounded-md border border-white/5 bg-pcpi-card-light dark:bg-pcpi-card/40 px-2 py-1.5',
              ACTIVE.includes(q.status) && 'border-pcpi-accent/25',
            )}
          >
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-xs font-medium">{q.app.name}</span>
              {!ACTIVE.includes(q.status) && (
                <button
                  onClick={() => remove(q.app.id)}
                  className="shrink-0 opacity-50 hover:opacity-100"
                  aria-label="Quitar"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <StatusLine status={q.status} percent={q.percent} message={q.message} />
          </li>
        ))}
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
    verifying: 'text-pcpi-accent',
    installing: 'text-violet-400',
    completed: 'text-pcpi-success',
    error: 'text-pcpi-danger',
  }
  return (
    <span className={cn('text-[10px] leading-snug', styles[status] ?? 'text-pcpi-text-muted')}>
      {label}
    </span>
  )
}
