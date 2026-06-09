import type { QueueStatus } from '@/services/installer'

/** Etiqueta corta para la UI según estado de la cola. */
export function queueStatusLabel(
  status: QueueStatus,
  percent: number,
  message?: string,
): string {
  if (
    message &&
    (status === 'downloading' ||
      status === 'waiting_install' ||
      status === 'installing' ||
      status === 'verifying' ||
      status === 'starting')
  ) {
    return message.length > 48 ? `${message.slice(0, 45)}…` : message
  }

  switch (status) {
    case 'pending':
      return 'En cola'
    case 'starting':
      return 'Iniciando Winget…'
    case 'downloading':
      return percent > 0 ? `Descargando ${percent}%` : 'Descargando instalador…'
    case 'waiting_install':
      return message ?? 'En cola para instalar…'
    case 'verifying':
      return 'Verificando instalador…'
    case 'installing':
      return percent > 0 ? `Instalando ${percent}%` : 'Ejecutando instalador…'
    case 'completed':
      return 'Completado'
    case 'cancelled':
      return message ?? 'Cancelada'
    case 'error':
      return message ?? 'Error'
    default:
      return status
  }
}

/** ¿Mostrar barra indeterminada (sin porcentaje fiable)? */
export function isIndeterminateProgress(status: QueueStatus, percent: number): boolean {
  return (
    (status === 'starting' ||
      status === 'downloading' ||
      status === 'waiting_install' ||
      status === 'verifying' ||
      status === 'installing') &&
    percent <= 0
  )
}
