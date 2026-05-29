import { pinyin } from 'pinyin-pro'

/** First letter for contact list grouping (A–Z, or #). */
export function getNameInitial(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '#'

  const first = trimmed.charAt(0)
  if (/[a-zA-Z]/.test(first)) return first.toUpperCase()
  if (/[0-9]/.test(first)) return '#'

  const initial = pinyin(first, { pattern: 'first', toneType: 'none' }).charAt(0)
  if (!initial) return '#'

  const upper = initial.toUpperCase()
  return /[A-Z]/.test(upper) ? upper : '#'
}
