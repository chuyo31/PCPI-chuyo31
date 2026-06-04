import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatDuration } from '@/utils/format'

interface Entry {
  date: string
  appId: string
  appName: string
  version?: string
  result: 'ok' | 'error'
  durationMs: number
}

export function HistoryPage() {
  const [items, setItems] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      setItems(await window.pcpi.history.list())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const clear = async () => {
    await window.pcpi.history.clear()
    await load()
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">Historial</h1>
          <p className="text-sm text-pcpi-text-muted">{items.length} instalaciones registradas.</p>
        </div>
        <Button variant="ghost" onClick={clear} disabled={items.length === 0}>
          <Trash2 className="h-4 w-4" /> Limpiar historial
        </Button>
      </header>

      {loading ? (
        <p className="text-pcpi-text-muted">Cargando…</p>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-pcpi-text-muted">
            Todavía no has instalado nada con PCPI.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-pcpi-text-muted">
                <tr className="border-b border-white/5">
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Aplicación</th>
                  <th className="px-4 py-3">Versión</th>
                  <th className="px-4 py-3">Duración</th>
                  <th className="px-4 py-3">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-2 text-pcpi-text-muted">
                      {new Date(it.date).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 font-medium">{it.appName}</td>
                    <td className="px-4 py-2 text-pcpi-text-muted">{it.version ?? '—'}</td>
                    <td className="px-4 py-2 text-pcpi-text-muted">{formatDuration(it.durationMs)}</td>
                    <td className="px-4 py-2">
                      {it.result === 'ok' ? (
                        <Badge variant="success">OK</Badge>
                      ) : (
                        <Badge variant="danger">Error</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
