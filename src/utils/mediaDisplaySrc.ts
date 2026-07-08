/** 已展示媒体时预加载新地址，加载完成后再切换，避免发送成功替换消息时闪烁。返回 true 表示已延迟切换。 */
export const preloadMediaDisplaySrc = (
  currentSrc: string,
  nextSrc: string,
  isReady: boolean,
  onSwap: () => void
): boolean => {
  if (!currentSrc || currentSrc === nextSrc || !isReady) return false

  const image = new Image()
  image.onload = onSwap
  image.onerror = onSwap
  image.src = nextSrc
  return true
}
