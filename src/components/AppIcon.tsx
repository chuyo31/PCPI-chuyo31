import { useMemo, useState } from 'react'
import type { AppEntry } from '@/catalog/types'
import { getAppIconCandidates } from '@/utils/appIcon'
import { cn } from '@/utils/cn'

interface AppIconProps {
  app: AppEntry
  className?: string
  imgClassName?: string
  fallbackClassName?: string
}

export function AppIcon({
  app,
  className,
  imgClassName,
  fallbackClassName,
}: AppIconProps) {
  const candidates = useMemo(() => getAppIconCandidates(app), [app])
  const [index, setIndex] = useState(0)
  const [failedAll, setFailedAll] = useState(candidates.length === 0)

  const initial = app.name.charAt(0).toUpperCase()
  const src = failedAll ? null : candidates[index]

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-pcpi-accent/80 to-violet-500/80 text-white font-bold',
        className,
      )}
    >
      {src ? (
        <img
          key={src}
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          className={cn(
            'h-full w-full object-contain bg-white/95 p-0.5 dark:bg-pcpi-bg/40',
            imgClassName,
          )}
          onError={() => {
            if (index < candidates.length - 1) {
              setIndex((i) => i + 1)
            } else {
              setFailedAll(true)
            }
          }}
        />
      ) : (
        <span className={fallbackClassName}>{initial}</span>
      )}
    </div>
  )
}
