import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { Footer } from './Footer'
import { InstallQueueBar } from './InstallQueueBar'
import { ToastViewport } from './Toast'
import { TooltipProvider } from '@/components/ui/tooltip'

export function Layout() {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-screen w-screen overflow-hidden bg-pcpi-bg-light text-pcpi-text-light dark:bg-pcpi-bg dark:text-pcpi-text">
        <Sidebar />

        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-7xl p-6 animate-fade-in">
              <Outlet />
            </div>
          </main>
          <InstallQueueBar />
          <Footer />
        </div>

        <ToastViewport />
      </div>
    </TooltipProvider>
  )
}
