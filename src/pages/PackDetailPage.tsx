import { ArrowLeft, Download } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { AppCard } from '@/components/AppCard'
import { appsInPack, findPack, useCatalog } from '@/services/catalog'
import { useInstaller } from '@/services/installer'

export function PackDetailPage() {
  const { id } = useParams<{ id: string }>()
  const packs = useCatalog((s) => s.packs)
  const catalog = useCatalog((s) => s.catalog)
  const pack = id ? findPack(id, packs) : undefined
  const enqueue = useInstaller((s) => s.enqueue)
  const runQueue = useInstaller((s) => s.runQueue)

  void catalog // mantener suscripción para re-render si cambia el catálogo

  if (!pack) {
    return (
      <div>
        <Link to="/packs" className="text-sm text-pcpi-accent hover:underline">
          ← Volver a packs
        </Link>
        <p className="mt-4 text-pcpi-text-muted">Pack no encontrado.</p>
      </div>
    )
  }

  const apps = appsInPack(pack.id)
  const installAll = () => {
    enqueue(apps.map((a) => a.id))
    void runQueue()
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/packs"
        className="inline-flex items-center gap-1 text-sm text-pcpi-text-muted hover:text-pcpi-accent"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a packs
      </Link>

      <header className="flex items-start gap-6">
        <div className="text-5xl">{pack.emoji}</div>
        <div className="flex-1">
          <h1 className="text-3xl font-extrabold">{pack.name}</h1>
          <p className="mt-1 text-sm text-pcpi-text-muted">{pack.description}</p>
          <div className="mt-4">
            <Button onClick={installAll}>
              <Download className="h-4 w-4" /> Instalar todo ({apps.length})
            </Button>
          </div>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {apps.map((a) => (
          <AppCard key={a.id} app={a} />
        ))}
      </div>
    </div>
  )
}
