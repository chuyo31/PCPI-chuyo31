import { useEffect } from 'react'
import { useSettings } from '@/services/settings'

/**
 * Aplica la clase `dark` al <html> según los settings persistidos.
 * Soporta también el modo "system" reaccionando a cambios del SO.
 */
export function useTheme() {
  const theme = useSettings((s) => s.settings.theme)
  const update = useSettings((s) => s.update)

  useEffect(() => {
    const root = document.documentElement

    const apply = () => {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const isDark = theme === 'dark' || (theme === 'system' && prefersDark)
      root.classList.toggle('dark', isDark)
    }

    apply()

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => theme === 'system' && apply()
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const toggle = () => {
    void update({ theme: theme === 'dark' ? 'light' : 'dark' })
  }

  return { theme, toggle, setTheme: (t: 'dark' | 'light' | 'system') => update({ theme: t }) }
}
