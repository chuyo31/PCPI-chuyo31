import { Search, Moon, Sun, RefreshCw, Loader2, CheckCircle2, Scan } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useTheme } from '@/hooks/useTheme'
import { useInstaller } from '@/services/installer'
import { useCatalog } from '@/services/catalog'
import { isAppInstalled, isAppUpgradable } from '@/services/installer'
import { useToasts } from '@/components/Toast'
import { formatDate } from '@/utils/format'
import { cn } from '@/utils/cn'

export function Header() {
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const refreshSystem = useInstaller((s) => s.refreshSystemState)
  const catalog = useCatalog((s) => s.catalog)
  const updateCatalog = useCatalog((s) => s.update)
  const catalogLoading = useCatalog((s) => s.loading)
  const catalogSource = useCatalog((s) => s.source)
  const catalogLastUpdate = useCatalog((s) => s.lastUpdate)
  const pushToast = useToasts((s) => s.push)
  const [query, setQuery] = useState('')
  const [scanning, setScanning] = useState(false)

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    navigate(q ? `/catalog?q=${encodeURIComponent(q)}` : '/catalog')
  }

  const onScanSystem = async () => {
    setScanning(true)
    try {
      await refreshSystem()
      const { installedById, upgradableById } = useInstaller.getState()
      const inst = catalog.filter((a) => isAppInstalled(installedById, a)).length
      const upg = catalog.filter((a) => isAppUpgradable(upgradableById, a)).length
      pushToast(`${inst} instaladas del catálogo · ${upg} con actualización`, 'success')
    } catch {
      pushToast('No se pudo escanear el sistema con Winget', 'error')
    } finally {
      setScanning(false)
    }
  }

  const onUpdateCatalog = async () => {
    const result = await updateCatalog()
    if (result.ok) {
      pushToast(`Catálogo actualizado · ${result.counts.catalog} apps · ${result.counts.packs} packs`, 'success')
      // Refresca también el estado del sistema (instalados/actualizables)
      // por si el nuevo catálogo añadió apps que ya tenías instaladas.
      void refreshSystem()
    } else {
      pushToast(`No se pudo actualizar el catálogo: ${result.message}`, 'error')
    }
  }

  const tooltipText =
    catalogSource === 'remote' && catalogLastUpdate
      ? `Catálogo remoto · Actualizado el ${formatDate(catalogLastUpdate)}`
      : 'Usando el catálogo del bundle. Pulsa para descargar el último desde el repositorio.'

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-white/5 bg-pcpi-panel-light/80 dark:bg-pcpi-panel/80 px-6 backdrop-blur-md">
      <form onSubmit={onSubmit} className="relative flex-1 max-w-2xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-pcpi-text-muted" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar aplicaciones, desarrolladores, categorías…"
          className="pl-9 h-10"
        />
      </form>

      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={onScanSystem} disabled={scanning}>
              {scanning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Scan className="h-4 w-4" />
              )}
              <span className="hidden lg:inline">Escanear PC</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Detectar qué apps del catálogo ya están instaladas y cuáles tienen actualización (Winget).
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onUpdateCatalog}
              disabled={catalogLoading}
              className="relative"
            >
              {catalogLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="hidden md:inline">Actualizar catálogo</span>

              {/* Dot indicator: verde si remoto, gris si bundle. */}
              <span
                aria-hidden
                className={cn(
                  'absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-pcpi-panel',
                  catalogSource === 'remote' ? 'bg-pcpi-success' : 'bg-pcpi-text-muted',
                )}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="flex items-start gap-1.5">
              {catalogSource === 'remote' ? (
                <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-pcpi-success" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5 mt-0.5 text-pcpi-text-muted" />
              )}
              <span>{tooltipText}</span>
            </div>
          </TooltipContent>
        </Tooltip>

        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Cambiar tema">
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  )
}
