import * as React from 'react'
import * as ProgressPrimitive from '@radix-ui/react-progress'
import { cn } from '@/utils/cn'

export interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  /** Barra animada cuando Winget aún no reporta porcentaje. */
  indeterminate?: boolean
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, indeterminate, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      'relative h-2 w-full overflow-hidden rounded-full bg-white/10',
      className,
    )}
    {...props}
  >
    {indeterminate ? (
      <div
        className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-pcpi-accent animate-[progress-indeterminate_1.4s_ease-in-out_infinite]"
        aria-hidden
      />
    ) : (
      <ProgressPrimitive.Indicator
        className="h-full w-full flex-1 bg-pcpi-accent transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
      />
    )}
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
