export interface Sticker {
  id: string
  name: string
  iconUrl: string
  type: string
  iconValue: string
  stickerPackId: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface StickerPack {
  id: string
  name: string
  description: string
  packIconUrl: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  stickers: Sticker[]
}
