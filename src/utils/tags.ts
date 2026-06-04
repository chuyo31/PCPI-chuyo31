import type { Tag } from '@/catalog/types'

export interface TagMeta {
  id: Tag
  label: string
  emoji: string
  className: string
}

export const TAG_META: Record<Tag, TagMeta> = {
  essential:   { id: 'essential',   label: 'Imprescindible', emoji: '🔥', className: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  popular:     { id: 'popular',     label: 'Popular',        emoji: '⭐', className: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  opensource:  { id: 'opensource',  label: 'Open Source',    emoji: '💚', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  free:        { id: 'free',        label: 'Gratuito',       emoji: '🆓', className: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
  recommended: { id: 'recommended', label: 'Recomendado',    emoji: '🚀', className: 'bg-violet-500/15 text-violet-400 border-violet-500/30' },
  new:         { id: 'new',         label: 'Nuevo',          emoji: '🆕', className: 'bg-pink-500/15 text-pink-400 border-pink-500/30' },
  lightweight: { id: 'lightweight', label: 'Ligero',         emoji: '⚡', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  gaming:      { id: 'gaming',      label: 'Gaming',         emoji: '🎮', className: 'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30' },
  dev:         { id: 'dev',         label: 'Desarrollo',     emoji: '💻', className: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  multimedia:  { id: 'multimedia',  label: 'Multimedia',     emoji: '🎥', className: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
}
