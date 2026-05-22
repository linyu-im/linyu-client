import type { MomentMediaItem, MomentVisibleType } from '@/types/api/moment'

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

export function sortMomentMedia(media: MomentMediaItem[] | null | undefined): MomentMediaItem[] {
  if (!media?.length) return []
  return [...media].sort((a, b) => a.sort - b.sort)
}
