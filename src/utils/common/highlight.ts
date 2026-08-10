export interface HighlightSegment {
  text: string
  highlight: boolean
}

export function getHighlightSegments(text: string, keywordText: string): HighlightSegment[] {
  if (!text) return []
  const trimmedKeyword = keywordText.trim()
  if (!trimmedKeyword) {
    return [{ text, highlight: false }]
  }

  const lowerText = text.toLowerCase()
  const lowerKeyword = trimmedKeyword.toLowerCase()
  const highlightIndices = new Set<number>()
  let keywordIndex = 0

  for (let textIndex = 0; textIndex < lowerText.length && keywordIndex < lowerKeyword.length; textIndex++) {
    if (lowerText[textIndex] === lowerKeyword[keywordIndex]) {
      highlightIndices.add(textIndex)
      keywordIndex++
    }
  }

  const segments: HighlightSegment[] = []
  let start = 0

  while (start < text.length) {
    const highlighted = highlightIndices.has(start)
    let end = start + 1
    while (end < text.length && highlightIndices.has(end) === highlighted) {
      end++
    }
    segments.push({ text: text.slice(start, end), highlight: highlighted })
    start = end
  }

  return segments
}
