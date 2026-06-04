import type { CategoryMeta } from './types'

export const CATEGORIES: CategoryMeta[] = [
  { id: 'browsers', name: 'Navegadores', emoji: '🌐' },
  { id: 'multimedia', name: 'Multimedia', emoji: '🎥' },
  { id: 'video', name: 'Edición de vídeo', emoji: '🎬' },
  { id: 'photo', name: 'Edición fotográfica', emoji: '🖼️' },
  { id: 'audio', name: 'Audio y Producción Musical', emoji: '🎵' },
  { id: 'streaming', name: 'Streaming y Grabación', emoji: '🎙️' },
  { id: 'pdf', name: 'PDF', emoji: '📄' },
  { id: 'office', name: 'Ofimática', emoji: '💼' },
  { id: 'email', name: 'Correo Electrónico', emoji: '📧' },
  { id: 'utilities', name: 'Utilidades', emoji: '🛠️' },
  { id: 'downloaders', name: 'Gestores de Descargas', emoji: '📥' },
  { id: 'remote', name: 'Acceso Remoto', emoji: '🌍' },
  { id: 'cloud', name: 'Nube y Sincronización', emoji: '☁️' },
  { id: 'dev', name: 'Programación', emoji: '💻' },
  { id: 'gaming', name: 'Gaming', emoji: '🎮' },
  { id: 'communication', name: 'Comunicación', emoji: '💬' },
  { id: 'ai', name: 'Inteligencia Artificial', emoji: '🤖' },
  { id: 'security', name: 'Seguridad', emoji: '🔒' },
]

export function categoryName(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.name ?? id
}

export function categoryEmoji(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.emoji ?? '📦'
}
