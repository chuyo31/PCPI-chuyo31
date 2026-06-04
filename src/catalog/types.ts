export type CategoryId =
  | 'browsers'
  | 'multimedia'
  | 'video'
  | 'photo'
  | 'audio'
  | 'streaming'
  | 'pdf'
  | 'office'
  | 'email'
  | 'utilities'
  | 'downloaders'
  | 'remote'
  | 'cloud'
  | 'dev'
  | 'gaming'
  | 'communication'
  | 'ai'
  | 'security'

export type Tag =
  | 'essential'
  | 'popular'
  | 'opensource'
  | 'free'
  | 'recommended'
  | 'new'
  | 'lightweight'
  | 'gaming'
  | 'dev'
  | 'multimedia'

export type License = 'GPL' | 'MIT' | 'Apache-2.0' | 'BSD' | 'Freeware' | 'Proprietary' | 'Other'

export interface AppEntry {
  /** Id único interno (kebab-case). */
  id: string
  name: string
  developer: string
  description: string
  category: CategoryId
  /** ID exacto de Winget (ej. "VideoLAN.VLC"). */
  wingetId: string
  version?: string
  releaseDate?: string
  /** Peso aproximado en MB. */
  sizeMb?: number
  license: License
  website?: string
  iconUrl?: string
  screenshots?: string[]
  tags: Tag[]
}

export interface Pack {
  id: string
  name: string
  description: string
  emoji: string
  /** Lista de `AppEntry.id`. */
  apps: string[]
  /** Si es true, se muestra destacado en la home. */
  featured?: boolean
  /** Si es true, muestra el botón "DEJAR PC LISTO". */
  isPostFormat?: boolean
}

export interface CategoryMeta {
  id: CategoryId
  name: string
  emoji: string
}
