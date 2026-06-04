import * as React from 'react'
import { cn } from '@/utils/cn'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-md border border-white/10 bg-pcpi-card-light dark:bg-pcpi-card/60 px-3 py-2 text-sm',
        'text-pcpi-text-light dark:text-pcpi-text placeholder:text-pcpi-text-muted-light dark:placeholder:text-pcpi-text-muted',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pcpi-accent focus-visible:ring-offset-0',
        'disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export { Input }
