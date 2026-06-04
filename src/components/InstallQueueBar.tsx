import { useInstaller } from '@/services/installer'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { X, Trash2 } from 'lucide-react'
import { cn } from '@/utils/cn'

/**
 * Barra inferior con la cola global de instalación.
 * Aparece automáticamente cuando hay tareas pendientes / en curso.
 */
export function InstallQueueBar() {
  const queue = useInstaller((s) => s.queue)
  const running = useInstaller((s) => s.running)
  const remove = useInstaller((s) => s.remove)
  const clear = useInstaller((s) => s.clearCompleted)

  if (queue.length === 0) return null

  const total = queue.length
  const done = queue.filter((q) => q.status === 'completed').length
  const current = queue.find((q) => q.status === 'installing' || q.status === 'downloading')
  const globalPercent = Math.round(((done + (current ? current.percent / 100 : 0)) / total) * 100)

  return (
    <div className="border-t border-white/5 bg-pcpi-panel-light dark:bg-pcpi-panel px-6 py-3">
      <div className="flex items-center justify-between gap-4 text-xs">
        <div className="font-medium">
          {running
            ? `Instalando ${done + 1} de ${total}`
            : done === total
              ? `Completado · ${total} de ${total}`
              : `${done} de ${total} completados`}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-pcpi-text-muted">{globalPercent}%</span>
          <Button size="sm" variant="ghost" onClick={clear} aria-label="Limpiar terminados">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="mt-2">
        <Progress value={globalPercent} />
      </div>

      <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3 max-h-40 overflow-y-auto">
        {queue.map((q) => (
          <li
            key={q.app.id}
            className={cn(
              'flex items-center gap-2 rounded-md border border-white/5 bg-pcpi-card-light dark:bg-pcpi-card/40 px-2 py-1.5',
            )}
          >
            <span className="truncate flex-1 text-xs">{q.app.name}</span>
            <StatusPill status={q.status} percent={q.percent} />
            {!['installing', 'downloading'].includes(q.status) && (
              <button
                onClick={() => remove(q.app.id)}
                className="opacity-50 hover:opacity-100"
                aria-label="Quitar"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function StatusPill({ status, percent }: { status: string; percent: number }) {
  const styles: Record<string, string> = {
    pending: 'bg-white/10 text-pcpi-text-muted',
    downloading: 'bg-pcpi-accent/20 text-pcpi-accent',
    installing: 'bg-pcpi-accent/20 text-pcpi-accent',
    completed: 'bg-pcpi-success/15 text-pcpi-success',
    error: 'bg-pcpi-danger/15 text-pcpi-danger',
  }
  const labels: Record<string, string> = {
    pending: 'Pendiente',
    downloading: `Descargando ${percent}%`,
    installing: `Instalando ${percent}%`,
    completed: 'Completado',
    error: 'Error',
  }
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', styles[status])}>
      {labels[status]}
    </span>
  )
}
