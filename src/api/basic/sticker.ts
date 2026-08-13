import { Sticker, StickerPack } from '@/types/api/sticker'
import { ApiResponse, post } from '@/utils/network/http'

export function defaultList(): Promise<ApiResponse<Sticker[]>> {
  return post<Sticker[], void>('/api/basic/v1/sticker/default/list')
}

export function favoriteList(): Promise<ApiResponse<Sticker[]>> {
  return post<Sticker[], void>('/api/basic/v1/sticker/favorite/list')
}

export function userPackList(): Promise<ApiResponse<StickerPack[]>> {
  return post<StickerPack[], void>('/api/basic/v1/sticker/user/pack/list')
}
