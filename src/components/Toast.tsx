import { useEffect } from 'react'
import { CheckCircle2, XCircle, X } from 'lucide-react'
import { create } from 'zustand'
import { cn } from '@/utils/cn'

export interface ToastItem {
  id: number
  message: string
  variant: 'success' | 'error' | 'info'
}

interface ToastStore {
  toasts: ToastItem[]
  push: (message: string, variant?: ToastItem['variant']) => void
  dismiss: (id: number) => void
}

export const useToasts = create<ToastStore>((set, get) => ({
  toasts: [],
  push: (message, variant = 'info') => {
    const id = Date.now() + Math.random()
    set({ toasts: [...get().toasts, { id, message, variant }] })
    setTimeout(() => get().dismiss(id), 4500)
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}))

export function ToastViewport() {
  const toasts = useToasts((s) => s.toasts)
  const dismiss = useToasts((s) => s.dismiss)

  return (
    <div className="pointer-events-none fixed bottom-14 right-6 z-50 flex flex-col gap-2 w-[360px]">
      {toasts.map((t) => (
        <Toast key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  )
}

function Toast({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  useEffect(() => {
    // hook reservado por si en el futuro queremos pausar al hover
  }, [])

  const palette: Record<ToastItem['variant'], { ring: string; icon: React.ReactNode }> = {
    success: {
      ring: 'border-pcpi-success/30 bg-pcpi-success/10',
      icon: <CheckCircle2 className="h-4 w-4 text-pcpi-success" />,
    },
    error: {
      ring: 'border-pcpi-danger/30 bg-pcpi-danger/10',
      icon: <XCircle className="h-4 w-4 text-pcpi-danger" />,
    },
    info: {
      ring: 'border-pcpi-accent/30 bg-pcpi-accent/10',
      icon: <CheckCircle2 className="h-4 w-4 text-pcpi-accent" />,
    },
  }
  const meta = palette[item.variant]

  return (
    <div
      className={cn(
        'pointer-events-auto flex items-start gap-2 rounded-md border p-3 backdrop-blur-md shadow-lg animate-fade-in',
        'bg-pcpi-panel/95 dark:bg-pcpi-panel/95',
        meta.ring,
      )}
    >
      <div className="mt-0.5">{meta.icon}</div>
      <div className="flex-1 text-xs leading-relaxed text-pcpi-text-light dark:text-pcpi-text">
        {item.message}
      </div>
      <button
        onClick={onDismiss}
        className="opacity-50 hover:opacity-100"
        aria-label="Cerrar notificación"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
