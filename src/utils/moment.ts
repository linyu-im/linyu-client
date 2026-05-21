import type { Moment, MomentComment, MomentLike, MomentPost, MomentRecord, MomentVisibleType } from '@/types/api/moment'
import { formatTime } from '@/utils/time'

/** 可见性 → assets/icons 图标名 */
export const MOMENT_VISIBILITY_ICON: Record<MomentVisibleType, string> = {
  all: 'visibility-all',
  private: 'visibility-private',
  include: 'visibility-include',
  exclude: 'visibility-exclude'
}

export function parseMomentContent(text: string): Array<{ type: 'text' | 'tag'; value: string }> {
  const parts: Array<{ type: 'text' | 'tag'; value: string }> = []
  const regex = /(#[\u4e00-\u9fa5\w]+)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) })
    }
    parts.push({ type: 'tag', value: match[1] })
    lastIndex = match.index + match[1].length
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) })
  }

  return parts.length ? parts : [{ type: 'text', value: text }]
}

export function imageGridClass(count: number): string {
  if (count === 1) return 'cols-1'
  if (count === 2) return 'cols-2'
  return 'cols-3'
}

function resolveVisibleType(moment: Moment): MomentVisibleType {
  const raw = (moment as { visibleType?: string }).visibleType ?? moment.VisibleType
  const value = String(raw || 'all').toLowerCase()
  if (value === 'private' || value === 'include' || value === 'exclude') return value
  return 'all'
}

function displayName(userId: string, username?: string, fallback?: string): string {
  if (username?.trim()) return username.trim()
  if (fallback) return fallback
  return userId ? `User ${userId.slice(-6)}` : ''
}

function mapComments(comments: MomentComment[] | null, nameFallback: string): MomentPost['comments'] {
  if (!comments?.length) return []

  const nameByUserId = new Map<string, string>()
  for (const c of comments) {
    nameByUserId.set(c.userId, displayName(c.userId, c.username, nameFallback))
  }

  return comments.map((c) => ({
    id: c.id,
    author: {
      id: c.userId,
      name: displayName(c.userId, c.username, nameFallback)
    },
    text: c.content,
    replyTo: c.replyUserId ? nameByUserId.get(c.replyUserId) || c.replyUserId : undefined,
    time: formatTime(c.createdAt),
    likeCount: 0
  }))
}

function mapLikes(
  likes: MomentLike[] | null,
  nameFallback: string
): { likeAuthors: MomentPost['likeAuthors']; liked: boolean; likeCount: number } {
  const list = likes ?? []
  return {
    likeCount: list.length,
    liked: false,
    likeAuthors: list.map((l) => ({
      id: l.userId,
      name: displayName(l.userId, l.username, nameFallback)
    }))
  }
}

export function mapMomentRecordToPost(record: MomentRecord, currentUserId: string, nameFallback = ''): MomentPost {
  const { moment, comments, likes } = record
  const visibility = resolveVisibleType(moment)
  const media = [...(moment.mediaType ?? [])].sort((a, b) => a.sort - b.sort)
  const images = media.length
    ? media.map((m) => ({
        url: m.url,
        thumbUrl: m.thumbUrl,
        isVideo: m.mediaType === 'video'
      }))
    : undefined

  const likeInfo = mapLikes(likes, nameFallback)
  likeInfo.liked = (likes ?? []).some((l) => l.userId === currentUserId)

  return {
    id: moment.id,
    author: {
      id: moment.userId,
      name: displayName(moment.userId, undefined, nameFallback)
    },
    time: formatTime(moment.createdAt),
    visibility,
    content: moment.textContent,
    images,
    location: moment.location || undefined,
    likeCount: likeInfo.likeCount,
    commentCount: comments?.length ?? 0,
    liked: likeInfo.liked,
    likeAuthors: likeInfo.likeAuthors,
    comments: mapComments(comments, nameFallback),
    isMine: moment.userId === currentUserId
  }
}
