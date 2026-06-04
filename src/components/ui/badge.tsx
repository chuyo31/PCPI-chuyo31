import * as React from 'react'
import { cn } from '@/utils/cn'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline' | 'success' | 'warning' | 'danger'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants: Record<NonNullable<BadgeProps['variant']>, string> = {
    default: 'bg-white/10 text-pcpi-text border-transparent',
    outline: 'border border-white/10 text-pcpi-text bg-transparent',
    success: 'bg-pcpi-success/15 text-pcpi-success border border-pcpi-success/30',
    warning: 'bg-pcpi-warning/15 text-pcpi-warning border border-pcpi-warning/30',
    danger: 'bg-pcpi-danger/15 text-pcpi-danger border border-pcpi-danger/30',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium leading-none whitespace-nowrap',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}
