import { useState } from 'react'
import { Loader2, RotateCcw, Download } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useSettings } from '@/services/settings'
import { useCatalog } from '@/services/catalog'
import { useToasts } from '@/components/Toast'
import { formatDate } from '@/utils/format'

export function SettingsPage() {
  const settings = useSettings((s) => s.settings)
  const update = useSettings((s) => s.update)
  const catalogSource = useCatalog((s) => s.source)
  const catalogLastUpdate = useCatalog((s) => s.lastUpdate)
  const catalogLoading = useCatalog((s) => s.loading)
  const updateCatalog = useCatalog((s) => s.update)
  const resetCatalog = useCatalog((s) => s.reset)
  const pushToast = useToasts((s) => s.push)

  const [resetting, setResetting] = useState(false)

  const onUpdate = async () => {
    const result = await updateCatalog()
    pushToast(result.message, result.ok ? 'success' : 'error')
  }

  const onReset = async () => {
    setResetting(true)
    try {
      await resetCatalog()
      pushToast('Catálogo restablecido al del bundle.', 'info')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-sm text-pcpi-text-muted">
          Personaliza el comportamiento y el aspecto de PCPI.
        </p>
      </header>

      <Card>
        <CardContent className="flex flex-col divide-y divide-white/5 p-0">
          <Row label="Tema" description="Modo oscuro, claro o seguir el sistema.">
            <select
              value={settings.theme}
              onChange={(e) => update({ theme: e.target.value as 'dark' | 'light' | 'system' })}
              className="h-9 rounded-md border border-white/10 bg-pcpi-card/40 px-3 text-sm"
            >
              <option value="dark">Oscuro</option>
              <option value="light">Claro</option>
              <option value="system">Sistema</option>
            </select>
          </Row>

          <Row label="Idioma" description="Idioma de la interfaz.">
            <select
              value={settings.language}
              onChange={(e) => update({ language: e.target.value as 'es' | 'en' })}
              className="h-9 rounded-md border border-white/10 bg-pcpi-card/40 px-3 text-sm"
            >
              <option value="es">Español</option>
              <option value="en">English (próximamente)</option>
            </select>
          </Row>

          <Toggle
            label="Animaciones"
            description="Activa o desactiva transiciones y animaciones de la UI."
            value={settings.animations}
            onChange={(v) => update({ animations: v })}
          />
          <Toggle
            label="Actualizaciones automáticas"
            description="Detectar y notificar cuando hay nuevas versiones."
            value={settings.autoUpdate}
            onChange={(v) => update({ autoUpdate: v })}
          />
          <Toggle
            label="Mostrar software beta"
            description="Incluye versiones beta en el catálogo."
            value={settings.showBeta}
            onChange={(v) => update({ showBeta: v })}
          />
          <Toggle
            label="Mostrar software experimental"
            description="Incluye software experimental (puede ser inestable)."
            value={settings.showExperimental}
            onChange={(v) => update({ showExperimental: v })}
          />
        </CardContent>
      </Card>

      {/* Fuente del catálogo */}
      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-lg font-semibold">Fuente del catálogo</h2>
            <p className="text-xs text-pcpi-text-muted">
              Define desde dónde se descarga el catálogo de aplicaciones y packs cuando pulsas “Actualizar catálogo”.
            </p>
          </div>
          {catalogSource === 'remote' ? (
            <Badge variant="success">Remoto · {catalogLastUpdate ? formatDate(catalogLastUpdate) : '—'}</Badge>
          ) : (
            <Badge variant="outline">Bundle</Badge>
          )}
        </div>

        <Card>
          <CardContent className="flex flex-col gap-4 p-6">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">URL de catalog.json</span>
              <Input
                value={settings.catalogUrl}
                onChange={(e) => update({ catalogUrl: e.target.value })}
                placeholder="https://raw.githubusercontent.com/usuario/repo/main/catalog.json"
                className="font-mono text-xs"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">URL de packs.json</span>
              <Input
                value={settings.packsUrl}
                onChange={(e) => update({ packsUrl: e.target.value })}
                placeholder="https://raw.githubusercontent.com/usuario/repo/main/packs.json"
                className="font-mono text-xs"
              />
            </label>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button onClick={onUpdate} disabled={catalogLoading}>
                {catalogLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Descargar catálogo ahora
              </Button>
              <Button
                variant="outline"
                onClick={onReset}
                disabled={resetting || catalogSource === 'bundle'}
              >
                <RotateCcw className={`h-4 w-4 ${resetting ? 'animate-spin' : ''}`} />
                Restablecer al catálogo del bundle
              </Button>
            </div>

            <p className="text-xs text-pcpi-text-muted">
              El catálogo del bundle siempre está disponible como fallback. Si la descarga falla,
              la app sigue funcionando con la versión empaquetada.
            </p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardContent className="flex flex-wrap gap-2 p-6">
          <Button variant="outline" disabled>Limpiar caché</Button>
          <Button variant="outline" disabled>Exportar configuración</Button>
          <Button variant="outline" disabled>Importar configuración</Button>
        </CardContent>
      </Card>
    </div>
  )
}

function Row({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-5">
      <div>
        <div className="font-medium">{label}</div>
        {description && <div className="text-xs text-pcpi-text-muted">{description}</div>}
      </div>
      <div>{children}</div>
    </div>
  )
}

function Toggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string
  description?: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <Row label={label} description={description}>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative h-6 w-11 rounded-full transition-colors ${
          value ? 'bg-pcpi-accent' : 'bg-white/15'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            value ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </Row>
  )
}
