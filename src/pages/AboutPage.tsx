import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Logo } from '@/components/Logo'
import { Heart, Sparkles, Github, ExternalLink } from 'lucide-react'
import { useCatalog } from '@/services/catalog'
import { formatDate } from '@/utils/format'

export function AboutPage() {
  const [version, setVersion] = useState('—')
  const [platform, setPlatform] = useState('—')
  const [winget, setWinget] = useState<{ available: boolean; version?: string; error?: string }>({
    available: false,
  })
  const catalogSource = useCatalog((s) => s.source)
  const catalogLastUpdate = useCatalog((s) => s.lastUpdate)
  const catalogCount = useCatalog((s) => s.catalog.length)
  const packsCount = useCatalog((s) => s.packs.length)

  useEffect(() => {
    void (async () => {
      if (!window.pcpi) return
      setVersion(await window.pcpi.app.getVersion())
      setPlatform(await window.pcpi.app.getPlatform())
      setWinget(await window.pcpi.packages.isAvailable())
    })()
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
          <Logo size="lg" />
          <p className="max-w-md italic text-pcpi-text-muted">
            "Tu PC listo tras el formateo"
          </p>

          <div className="mt-2 grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
            <span className="text-pcpi-text-muted">Versión</span><span>{version}</span>
            <span className="text-pcpi-text-muted">Plataforma</span><span>{platform}</span>
            <span className="text-pcpi-text-muted">Winget</span>
            <span>
              {winget.available
                ? `Disponible (v${winget.version ?? '?'})`
                : 'No disponible'}
            </span>
            <span className="text-pcpi-text-muted">Catálogo</span>
            <span>
              {catalogSource === 'remote' ? 'Remoto' : 'Bundle'} ·{' '}
              {catalogCount} apps · {packsCount} packs
            </span>
            {catalogSource === 'remote' && catalogLastUpdate && (
              <>
                <span className="text-pcpi-text-muted">Última sync</span>
                <span>{formatDate(catalogLastUpdate)}</span>
              </>
            )}
          </div>

          <div className="mt-6 flex items-center gap-4 text-sm text-pcpi-text-muted">
            <span className="flex items-center gap-1">
              Creado por <strong className="text-pcpi-text">Chuyo31</strong>
              <Heart className="h-3.5 w-3.5 text-pcpi-danger" />
            </span>
            <span className="flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-pcpi-accent" /> Powered by AI
            </span>
          </div>

          <div className="mt-4 flex gap-3 text-sm">
            <a
              className="inline-flex items-center gap-1 text-pcpi-accent hover:underline"
              onClick={(e) => {
                e.preventDefault()
                window.pcpi?.app.openExternal('https://github.com/microsoft/winget-cli')
              }}
              href="#"
            >
              <Github className="h-4 w-4" /> Winget CLI
            </a>
            <a
              className="inline-flex items-center gap-1 text-pcpi-accent hover:underline"
              onClick={(e) => {
                e.preventDefault()
                window.pcpi?.app.openExternal('https://winget.run')
              }}
              href="#"
            >
              <ExternalLink className="h-4 w-4" /> winget.run
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
