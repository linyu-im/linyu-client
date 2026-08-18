import type { Sticker, StickerPack } from '@/types/api/sticker'
import { getDb } from './connection'

export const DEFAULT_STICKER_PACK_ID = 'default'

const STICKER_SELECT_FIELDS = `id, name, icon_url AS iconUrl, type, icon_value AS iconValue,
  sticker_pack_id AS stickerPackId, created_at AS createdAt, updated_at AS updatedAt,
  deleted_at AS deletedAt`

const PACK_SELECT_FIELDS = `id, name, description, pack_icon_url AS packIconUrl,
  created_at AS createdAt, updated_at AS updatedAt, deleted_at AS deletedAt`

function stickerValues(sticker: Sticker) {
  return [
    sticker.id,
    sticker.name,
    sticker.iconUrl || '',
    sticker.type || '',
    sticker.iconValue || '',
    sticker.stickerPackId,
    sticker.createdAt || '',
    sticker.updatedAt || '',
    sticker.deletedAt ?? null
  ]
}

async function insertStickers(stickers: Sticker[]): Promise<void> {
  if (!stickers.length) {
    return
  }
  const db = await getDb()
  for (const sticker of stickers) {
    await db.execute(
      `INSERT INTO t_sticker
        (id, name, icon_url, type, icon_value, sticker_pack_id, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      stickerValues(sticker)
    )
  }
}

export async function queryDefaultStickers(): Promise<Sticker[]> {
  const db = await getDb()
  return db.select<Sticker[]>(
    `SELECT ${STICKER_SELECT_FIELDS}
     FROM t_sticker
     WHERE sticker_pack_id = ?
     ORDER BY id ASC`,
    [DEFAULT_STICKER_PACK_ID]
  )
}

export async function replaceDefaultStickers(list: Sticker[]): Promise<void> {
  const db = await getDb()
  await db.execute(`DELETE FROM t_sticker WHERE sticker_pack_id = ?`, [DEFAULT_STICKER_PACK_ID])
  await insertStickers(list.map((sticker) => ({ ...sticker, stickerPackId: DEFAULT_STICKER_PACK_ID })))
}

export async function queryStickerPacks(): Promise<StickerPack[]> {
  const db = await getDb()
  const packs = await db.select<Omit<StickerPack, 'stickers'>[]>(
    `SELECT ${PACK_SELECT_FIELDS}
     FROM t_sticker_pack
     WHERE id != ?
     ORDER BY id ASC`,
    [DEFAULT_STICKER_PACK_ID]
  )
  if (!packs.length) {
    return []
  }

  const stickers = await db.select<Sticker[]>(
    `SELECT ${STICKER_SELECT_FIELDS}
     FROM t_sticker
     WHERE sticker_pack_id != ?
     ORDER BY sticker_pack_id ASC, id ASC`,
    [DEFAULT_STICKER_PACK_ID]
  )

  const stickerMap = new Map<string, Sticker[]>()
  for (const sticker of stickers) {
    const group = stickerMap.get(sticker.stickerPackId)
    if (group) {
      group.push(sticker)
    } else {
      stickerMap.set(sticker.stickerPackId, [sticker])
    }
  }

  return packs.map((pack) => ({
    ...pack,
    stickers: stickerMap.get(pack.id) ?? []
  }))
}

export async function replaceStickerPacks(packs: StickerPack[]): Promise<void> {
  const db = await getDb()
  const userPacks = packs.filter((pack) => pack.id !== DEFAULT_STICKER_PACK_ID)

  await db.execute(`DELETE FROM t_sticker WHERE sticker_pack_id != ?`, [DEFAULT_STICKER_PACK_ID])
  await db.execute(`DELETE FROM t_sticker_pack`)

  for (const pack of userPacks) {
    await db.execute(
      `INSERT INTO t_sticker_pack
        (id, name, description, pack_icon_url, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        pack.id,
        pack.name,
        pack.description || '',
        pack.packIconUrl || '',
        pack.createdAt || '',
        pack.updatedAt || '',
        pack.deletedAt ?? null
      ]
    )
  }

  const stickers = userPacks.flatMap((pack) =>
    (pack.stickers ?? [])
      .filter((sticker) => (sticker.stickerPackId || pack.id) !== DEFAULT_STICKER_PACK_ID)
      .map((sticker) => ({ ...sticker, stickerPackId: sticker.stickerPackId || pack.id }))
  )
  await insertStickers(stickers)
}
