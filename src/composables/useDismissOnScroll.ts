const SCROLL_LISTENER_OPTIONS: AddEventListenerOptions = { capture: true, passive: true }

export function useDismissOnScroll(dismiss: () => void, visible: MaybeRefOrGetter<boolean>) {
  const onScroll = () => {
    if (toValue(visible)) {
      dismiss()
    }
  }

  const bind = () => {
    document.addEventListener('scroll', onScroll, SCROLL_LISTENER_OPTIONS)
  }

  const unbind = () => {
    document.removeEventListener('scroll', onScroll, SCROLL_LISTENER_OPTIONS)
  }

  watch(
    () => toValue(visible),
    (isVisible) => {
      unbind()
      if (isVisible) {
        bind()
      }
    },
    { immediate: true }
  )

  onBeforeUnmount(() => {
    unbind()
  })
}
