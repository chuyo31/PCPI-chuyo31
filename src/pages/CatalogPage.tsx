import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { LayoutGrid, List, CheckSquare, Square, Download } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AppCard } from '@/components/AppCard'
import { useCatalog } from '@/services/catalog'
import { CATEGORIES, categoryName } from '@/catalog/categories'
import { useInstaller, isAppInstalled, isAppUpgradable } from '@/services/installer'
import { cn } from '@/utils/cn'

type View = 'grid' | 'list'
type StatusFilter = 'all' | 'installed' | 'upgradable' | 'not_installed'

export function CatalogPage({ fixedCategory }: { fixedCategory?: string }) {
  const [params, setParams] = useSearchParams()
  const [view, setView] = useState<View>('grid')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const enqueue = useInstaller((s) => s.enqueue)
  const runQueue = useInstaller((s) => s.runQueue)
  const catalog = useCatalog((s) => s.catalog)
  const installedById = useInstaller((s) => s.installedById)
  const upgradableById = useInstaller((s) => s.upgradableById)
  const systemScanReady = useInstaller((s) => s.systemScanReady)

  const q = (params.get('q') ?? '').trim().toLowerCase()
  const category = fixedCategory ?? params.get('category') ?? ''
  const statusFilter = (params.get('status') as StatusFilter) || 'all'

  const counts = useMemo(() => {
    let installed = 0
    let upgradable = 0
    let notInstalled = 0
    for (const a of catalog) {
      const inst = systemScanReady && isAppInstalled(installedById, a)
      const upg = systemScanReady && isAppUpgradable(upgradableById, a)
      if (inst) installed++
      if (upg) upgradable++
      if (systemScanReady && !inst) notInstalled++
    }
    return { installed, upgradable, notInstalled }
  }, [catalog, installedById, upgradableById, systemScanReady])

  const apps = useMemo(() => {
    return catalog.filter((a) => {
      if (category && a.category !== category) return false

      if (systemScanReady && statusFilter !== 'all') {
        const inst = isAppInstalled(installedById, a)
        const upg = isAppUpgradable(upgradableById, a)
        if (statusFilter === 'installed' && !inst) return false
        if (statusFilter === 'upgradable' && !upg) return false
        if (statusFilter === 'not_installed' && inst) return false
      }

      if (!q) return true
      return (
        a.name.toLowerCase().includes(q) ||
        a.developer.toLowerCase().includes(q) ||
        categoryName(a.category).toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q))
      )
    })
  }, [q, category, catalog, statusFilter, installedById, upgradableById, systemScanReady])

  const setStatusFilter = (status: StatusFilter) => {
    const next = new URLSearchParams(params)
    if (status === 'all') next.delete('status')
    else next.set('status', status)
    setParams(next, { replace: true })
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => setSelected(new Set(apps.map((a) => a.id)))
  const clearSelection = () => setSelected(new Set())

  const installSelected = () => {
    if (selected.size === 0) return
    enqueue(Array.from(selected))
    setSelected(new Set())
    void runQueue()
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-bold">
          {fixedCategory ? categoryName(fixedCategory) : 'Todos los programas'}
        </h1>
        <p className="text-sm text-pcpi-text-muted">
          {apps.length} {apps.length === 1 ? 'aplicación' : 'aplicaciones'}
          {selected.size > 0 && ` · ${selected.size} seleccionadas`}
        </p>
      </header>

      {systemScanReady && (
        <div className="flex flex-wrap gap-2">
          <FilterChip
            active={statusFilter === 'all'}
            onClick={() => setStatusFilter('all')}
            label="Todas"
          />
          <FilterChip
            active={statusFilter === 'installed'}
            onClick={() => setStatusFilter('installed')}
            label={`Instaladas (${counts.installed})`}
          />
          <FilterChip
            active={statusFilter === 'upgradable'}
            onClick={() => setStatusFilter('upgradable')}
            label={`Actualizables (${counts.upgradable})`}
            accent="warning"
          />
          <FilterChip
            active={statusFilter === 'not_installed'}
            onClick={() => setStatusFilter('not_installed')}
            label={`No instaladas (${counts.notInstalled})`}
          />
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Filtrar por nombre, desarrollador, etiqueta…"
            value={q}
            onChange={(e) => {
              const next = new URLSearchParams(params)
              if (e.target.value) next.set('q', e.target.value)
              else next.delete('q')
              setParams(next, { replace: true })
            }}
          />
        </div>

        {!fixedCategory && (
          <select
            value={category}
            onChange={(e) => {
              const next = new URLSearchParams(params)
              if (e.target.value) next.set('category', e.target.value)
              else next.delete('category')
              setParams(next, { replace: true })
            }}
            className="h-10 rounded-md border border-white/10 bg-pcpi-card/40 px-3 text-sm"
          >
            <option value="">Todas las categorías</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.name}
              </option>
            ))}
          </select>
        )}

        <Button variant="ghost" size="sm" onClick={selectAll}>
          <CheckSquare className="h-4 w-4" /> Seleccionar todo
        </Button>
        <Button variant="ghost" size="sm" onClick={clearSelection} disabled={selected.size === 0}>
          <Square className="h-4 w-4" /> Deseleccionar
        </Button>

        <Button onClick={installSelected} disabled={selected.size === 0}>
          <Download className="h-4 w-4" /> Instalar {selected.size > 0 && `(${selected.size})`}
        </Button>

        <div className="flex items-center gap-1 rounded-md border border-white/10 p-0.5">
          <button
            onClick={() => setView('grid')}
            className={cn(
              'rounded px-2 py-1 transition',
              view === 'grid' ? 'bg-pcpi-accent text-white' : 'opacity-60 hover:opacity-100',
            )}
            aria-label="Vista tarjetas"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView('list')}
            className={cn(
              'rounded px-2 py-1 transition',
              view === 'list' ? 'bg-pcpi-accent text-white' : 'opacity-60 hover:opacity-100',
            )}
            aria-label="Vista lista"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {apps.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 p-10 text-center text-pcpi-text-muted">
          No se encontraron aplicaciones con esos filtros.
        </div>
      ) : view === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {apps.map((a) => (
            <AppCard
              key={a.id}
              app={a}
              selected={selected.has(a.id)}
              onToggleSelect={() => toggleSelect(a.id)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {apps.map((a) => (
            <div key={a.id} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md border border-white/5 bg-pcpi-panel-light dark:bg-pcpi-panel px-4 py-3 hover:border-pcpi-accent/30">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="accent-pcpi-accent"
                    checked={selected.has(a.id)}
                    onChange={() => toggleSelect(a.id)}
                  />
                  <span className="font-medium">{a.name}</span>
                  <span className="text-xs text-pcpi-text-muted">— {a.developer}</span>
                </div>
                <div className="mt-0.5 truncate text-xs text-pcpi-text-muted">{a.description}</div>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  enqueue([a.id])
                  void runQueue()
                }}
              >
                <Download className="h-3.5 w-3.5" /> Instalar
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FilterChip({
  label,
  active,
  onClick,
  accent,
}: {
  label: string
  active: boolean
  onClick: () => void
  accent?: 'warning'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-xs font-medium transition',
        active
          ? accent === 'warning'
            ? 'border-pcpi-warning bg-pcpi-warning/15 text-pcpi-warning'
            : 'border-pcpi-accent bg-pcpi-accent/15 text-pcpi-accent'
          : 'border-white/10 text-pcpi-text-muted hover:border-white/20',
      )}
    >
      {label}
    </button>
  )
}
