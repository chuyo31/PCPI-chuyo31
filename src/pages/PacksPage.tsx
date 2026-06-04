import { Link } from 'react-router-dom'
import { Rocket } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useCatalog, appsInPack } from '@/services/catalog'
import { useInstaller } from '@/services/installer'

export function PacksPage() {
  const enqueue = useInstaller((s) => s.enqueue)
  const runQueue = useInstaller((s) => s.runQueue)
  const packs = useCatalog((s) => s.packs)

  const installPack = (packId: string) => {
    const apps = appsInPack(packId).map((a) => a.id)
    enqueue(apps)
    void runQueue()
  }

  const postFormat = packs.find((p) => p.isPostFormat)

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold">Packs</h1>
        <p className="text-sm text-pcpi-text-muted">
          Conjuntos de aplicaciones para cubrir un escenario completo con un solo clic.
        </p>
      </header>

      {postFormat && (
        <Card className="border-pcpi-accent/30 bg-gradient-to-r from-pcpi-accent/15 via-violet-500/10 to-transparent">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-3xl">{postFormat.emoji}</div>
              <div className="mt-2 text-xl font-semibold">{postFormat.name}</div>
              <p className="text-sm text-pcpi-text-muted">{postFormat.description}</p>
              <p className="mt-1 text-xs text-pcpi-text-muted">
                {postFormat.apps.length} aplicaciones esenciales
              </p>
            </div>
            <Button size="lg" onClick={() => installPack(postFormat.id)}>
              <Rocket className="h-5 w-5" /> DEJAR PC LISTO
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {packs.filter((p) => !p.isPostFormat).map((p) => (
          <Card key={p.id} className="flex flex-col">
            <CardContent className="flex flex-1 flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="text-3xl">{p.emoji}</div>
                <div className="text-right">
                  <div className="text-xs text-pcpi-text-muted">{p.apps.length} apps</div>
                </div>
              </div>
              <div className="font-semibold">{p.name}</div>
              <p className="line-clamp-3 text-sm text-pcpi-text-muted">{p.description}</p>
              <div className="mt-auto flex gap-2">
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <Link to={`/pack/${p.id}`}>Ver detalles</Link>
                </Button>
                <Button size="sm" className="flex-1" onClick={() => installPack(p.id)}>
                  Instalar pack
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
