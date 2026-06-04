import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { HomePage } from '@/pages/HomePage'
import { CatalogPage } from '@/pages/CatalogPage'
import { CategoryPage } from '@/pages/CategoryPage'
import { AppDetailPage } from '@/pages/AppDetailPage'
import { PacksPage } from '@/pages/PacksPage'
import { PackDetailPage } from '@/pages/PackDetailPage'
import { HistoryPage } from '@/pages/HistoryPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { AboutPage } from '@/pages/AboutPage'
import { useSettings } from '@/services/settings'
import { useTheme } from '@/hooks/useTheme'
import { useInstaller } from '@/services/installer'
import { useCatalog } from '@/services/catalog'

export function App() {
  const loadSettings = useSettings((s) => s.load)
  const loadCatalog = useCatalog((s) => s.load)
  const refreshSystem = useInstaller((s) => s.refreshSystemState)
  useTheme()

  useEffect(() => {
    void (async () => {
      // El orden importa: primero settings (con las URLs), luego catálogo
      // (que las usaría si actualizara), luego refresh del sistema.
      await loadSettings()
      await loadCatalog()
      await refreshSystem()
    })()
  }, [loadSettings, loadCatalog, refreshSystem])

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/category/:id" element={<CategoryPage />} />
        <Route path="/app/:id" element={<AppDetailPage />} />
        <Route path="/packs" element={<PacksPage />} />
        <Route path="/pack/:id" element={<PackDetailPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
