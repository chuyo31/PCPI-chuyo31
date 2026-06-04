import { cn } from '@/utils/cn'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showSubtitle?: boolean
}

/**
 * Logo PCPI: icono (monitor con flecha de descarga) + título + subtítulo.
 * - Adaptable a modo oscuro/claro (usa currentColor).
 * - Fondo transparente.
 * - Pensado como SVG inline para no depender de assets externos en el esqueleto.
 */
export function Logo({ className, size = 'md', showSubtitle = true }: LogoProps) {
  const iconSize = size === 'lg' ? 56 : size === 'md' ? 40 : 28
  const titleClass =
    size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-xl' : 'text-base'
  const subClass =
    size === 'lg' ? 'text-sm' : size === 'md' ? 'text-[11px]' : 'text-[10px]'

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <PCPIIcon size={iconSize} />
      <div className="leading-tight">
        <div className={cn('font-extrabold tracking-tight text-pcpi-text-light dark:text-pcpi-text', titleClass)}>
          PCPI
        </div>
        {showSubtitle && (
          <div className={cn('font-light tracking-wide text-pcpi-text-muted-light dark:text-pcpi-text-muted', subClass)}>
            PC Post Install
          </div>
        )}
      </div>
    </div>
  )
}

function PCPIIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="pcpi-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>

      <rect x="4" y="6" width="40" height="28" rx="4" fill="url(#pcpi-grad)" opacity="0.18" />
      <rect x="4" y="6" width="40" height="28" rx="4" stroke="url(#pcpi-grad)" strokeWidth="2" />

      <path
        d="M24 13 V23 M24 23 L19 18 M24 23 L29 18"
        stroke="url(#pcpi-grad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="14" y1="27" x2="34" y2="27" stroke="url(#pcpi-grad)" strokeWidth="2" strokeLinecap="round" />

      <rect x="17" y="38" width="14" height="3" rx="1.5" fill="url(#pcpi-grad)" />
      <rect x="20" y="34" width="8" height="4" rx="1" fill="url(#pcpi-grad)" opacity="0.6" />
    </svg>
  )
}
