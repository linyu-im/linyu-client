type EscapeDismissHandler = () => void

const overlayStack: EscapeDismissHandler[] = []

export function registerEscapeOverlay(dismiss: EscapeDismissHandler) {
  overlayStack.push(dismiss)
  return () => {
    const index = overlayStack.lastIndexOf(dismiss)
    if (index !== -1) {
      overlayStack.splice(index, 1)
    }
  }
}

export function dismissTopEscapeOverlay(): boolean {
  const dismiss = overlayStack[overlayStack.length - 1]
  if (!dismiss) return false
  dismiss()
  return true
}

export function useEscapeOverlay(dismiss: () => void, visible: MaybeRefOrGetter<boolean>) {
  let unregister: (() => void) | undefined

  watch(
    () => toValue(visible),
    (isVisible) => {
      unregister?.()
      unregister = undefined
      if (isVisible) {
        unregister = registerEscapeOverlay(dismiss)
      }
    },
    { immediate: true }
  )

  onBeforeUnmount(() => {
    unregister?.()
  })
}
