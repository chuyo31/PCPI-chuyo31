import { NavLink } from 'react-router-dom'
import { Logo } from './Logo'
import { CATEGORIES } from '@/catalog/categories'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/utils/cn'

interface NavEntry {
  to: string
  label: string
  emoji: string
}

const TOP: NavEntry[] = [
  { to: '/', label: 'Inicio', emoji: '🏠' },
  { to: '/catalog', label: 'Todos los programas', emoji: '📦' },
]

const BOTTOM: NavEntry[] = [
  { to: '/packs', label: 'Packs', emoji: '📦' },
  { to: '/history', label: 'Historial', emoji: '📜' },
  { to: '/settings', label: 'Configuración', emoji: '⚙️' },
  { to: '/about', label: 'Acerca de', emoji: 'ℹ️' },
]

export function Sidebar() {
  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-white/5 bg-pcpi-panel-light dark:bg-pcpi-panel">
      <div className="flex h-16 items-center px-4 border-b border-white/5">
        <Logo size="sm" />
      </div>

      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-0.5 p-3">
          {TOP.map((n) => (
            <NavItem key={n.to} {...n} />
          ))}

          <Separator className="my-3" />
          <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-pcpi-text-muted">
            Categorías
          </div>

          {CATEGORIES.map((c) => (
            <NavItem
              key={c.id}
              to={`/category/${c.id}`}
              label={c.name}
              emoji={c.emoji}
            />
          ))}

          <Separator className="my-3" />

          {BOTTOM.map((n) => (
            <NavItem key={n.to} {...n} />
          ))}
        </nav>
      </ScrollArea>
    </aside>
  )
}

function NavItem({ to, label, emoji }: NavEntry) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-200',
          'text-pcpi-text-light dark:text-pcpi-text',
          isActive
            ? 'bg-pcpi-accent/15 text-pcpi-accent font-medium'
            : 'hover:bg-white/5 dark:hover:bg-white/10',
        )
      }
    >
      <span className="text-base leading-none">{emoji}</span>
      <span className="truncate">{label}</span>
    </NavLink>
  )
}
