import { Heart, Sparkles } from 'lucide-react'

export function Footer() {
  return (
    <footer className="flex h-10 items-center justify-between border-t border-white/5 bg-pcpi-panel-light dark:bg-pcpi-panel px-6 text-xs text-pcpi-text-muted-light dark:text-pcpi-text-muted">
      <div className="flex items-center gap-2">
        <span>
          Creado por{' '}
          <span className="font-semibold text-pcpi-text-light dark:text-pcpi-text">Chuyo31</span>
        </span>
        <Heart className="h-3 w-3 text-pcpi-danger" />
      </div>

      <div className="italic">"Tu PC listo tras el formateo"</div>

      <div className="flex items-center gap-1.5">
        <Sparkles className="h-3 w-3 text-pcpi-accent" />
        <span>Powered by AI</span>
      </div>
    </footer>
  )
}
