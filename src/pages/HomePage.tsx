import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, Sparkles, Heart, ShieldCheck, RotateCw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useInstaller, isAppInstalled, isAppUpgradable } from '@/services/installer'
import { useCatalog } from '@/services/catalog'
import { formatDate } from '@/utils/format'

export function HomePage() {
  const installedById = useInstaller((s) => s.installedById)
  const upgradableById = useInstaller((s) => s.upgradableById)
  const refresh = useInstaller((s) => s.refreshSystemState)
  const catalog = useCatalog((s) => s.catalog)
  const packs = useCatalog((s) => s.packs)
  const source = useCatalog((s) => s.source)
  const lastUpdate = useCatalog((s) => s.lastUpdate)
  const [lastSync, setLastSync] = useState<string>('—')

  useEffect(() => {
    void (async () => {
      await refresh()
      setLastSync(new Date().toLocaleString())
    })()
  }, [refresh])

  const featuredPacks = packs.filter((p) => p.featured)
  const total = catalog.length
  const openSource = catalog.filter((a) => a.tags.includes('opensource')).length
  const free = catalog.filter((a) => a.tags.includes('free') || a.tags.includes('opensource')).length
  const installedCount = catalog.filter((a) => isAppInstalled(installedById, a)).length
  const upgradableCount = catalog.filter((a) => isAppUpgradable(upgradableById, a)).length
  const catalogStamp = source === 'remote' && lastUpdate ? formatDate(lastUpdate) : 'Bundle'

  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <section className="rounded-2xl border border-white/5 bg-gradient-to-br from-pcpi-accent/20 via-violet-500/10 to-transparent p-8">
        <div className="flex items-center gap-3 text-sm text-pcpi-accent">
          <Sparkles className="h-4 w-4" />
          <span className="font-medium">Tu PC listo tras el formateo</span>
        </div>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight">PCPI</h1>
        <p className="mt-2 max-w-2xl text-pcpi-text-muted-light dark:text-pcpi-text-muted">
          Software gratuito, legal y de confianza para preparar tu PC tras una instalación limpia
          de Windows. Sin visitar webs, sin malware, sin perder tiempo.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/packs">📦 Ver packs</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/catalog">Explorar catálogo</Link>
          </Button>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Stat icon={<Package className="h-4 w-4" />} label="Apps disponibles" value={total} />
        <Stat icon={<Heart className="h-4 w-4" />} label="Open Source" value={openSource} />
        <Stat icon={<ShieldCheck className="h-4 w-4" />} label="Gratuitas" value={free} />
        <Stat icon={<Package className="h-4 w-4" />} label="Instaladas (catálogo)" value={installedCount} />
        <Stat icon={<RotateCw className="h-4 w-4" />} label="Con actualización" value={upgradableCount} />
        <Stat icon={<Sparkles className="h-4 w-4" />} label="Última sync" value={lastSync} small />
      </section>

      <div className="text-xs text-pcpi-text-muted">
        Catálogo:{' '}
        <span className="font-medium">
          {source === 'remote' ? 'Remoto' : 'Bundle (versión empaquetada)'}
        </span>
        {' · '}
        {source === 'remote' ? `Actualizado el ${catalogStamp}` : 'Pulsa “Actualizar catálogo” para sincronizar.'}
      </div>

      {/* Featured Packs */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Packs destacados</h2>
          <Link to="/packs" className="text-sm text-pcpi-accent hover:underline">
            Ver todos →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featuredPacks.map((p) => (
            <Link key={p.id} to={`/pack/${p.id}`}>
              <Card className="h-full hover:scale-[1.03] hover:border-pcpi-accent/30 hover:shadow-xl hover:shadow-pcpi-accent/10">
                <CardContent className="flex h-full flex-col gap-3 p-5">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{p.emoji}</div>
                    <div>
                      <div className="font-semibold">{p.name}</div>
                      <div className="text-xs text-pcpi-text-muted">{p.apps.length} aplicaciones</div>
                    </div>
                  </div>
                  <p className="text-sm text-pcpi-text-muted line-clamp-2">{p.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

function Stat({
  icon,
  label,
  value,
  small,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  small?: boolean
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <div className="flex items-center gap-2 text-pcpi-text-muted text-xs">
          {icon}
          <span>{label}</span>
        </div>
        <div className={small ? 'text-sm font-medium' : 'text-2xl font-bold'}>{value}</div>
      </CardContent>
    </Card>
  )
}
