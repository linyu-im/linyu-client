import type { Point } from '@/types/screenshot'

export const getMosaicRadius = (strokeWidth: number) => Math.max(6, strokeWidth * 3)

export const getMosaicStampPoints = (points: Point[], radius: number): Point[] => {
  if (!points.length) return []
  const step = Math.max(radius * 0.55, 4)
  const stamps: Point[] = [{ ...points[0] }]

  for (let i = 1; i < points.length; i += 1) {
    const from = points[i - 1]
    const to = points[i]
    const distance = Math.hypot(to.x - from.x, to.y - from.y)
    const count = Math.max(1, Math.floor(distance / step))

    for (let j = 1; j <= count; j += 1) {
      const ratio = j / (count + 1)
      stamps.push({
        x: from.x + (to.x - from.x) * ratio,
        y: from.y + (to.y - from.y) * ratio
      })
    }

    stamps.push({ ...to })
  }

  return stamps
}
