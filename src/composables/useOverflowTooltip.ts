import type { ComponentPublicInstance, WatchSource } from 'vue'

function resolveTargetEl(el: Element | ComponentPublicInstance | null): HTMLElement | null {
  if (!el) return null
  if (el instanceof HTMLElement) return el
  const root = (el as ComponentPublicInstance).$el
  return root instanceof HTMLElement ? root : null
}

export function isTextOverflowing(el: HTMLElement) {
  return el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1
}

export function useOverflowTooltip(sources: WatchSource | WatchSource[]) {
  const targetRef = ref<HTMLElement | null>(null)
  const isOverflow = ref(false)
  let resizeObserver: ResizeObserver | null = null

  const update = () => {
    nextTick(() => {
      const el = targetRef.value
      isOverflow.value = el ? isTextOverflowing(el) : false
    })
  }

  const bindObserver = () => {
    resizeObserver?.disconnect()
    resizeObserver = null
    const el = targetRef.value
    if (!el || typeof ResizeObserver === 'undefined') return
    resizeObserver = new ResizeObserver(update)
    resizeObserver.observe(el)
  }

  const refresh = () => {
    update()
    bindObserver()
  }

  watch(sources, refresh)

  onMounted(refresh)

  onUnmounted(() => {
    resizeObserver?.disconnect()
    resizeObserver = null
  })

  const bindTargetRef = (el: Element | ComponentPublicInstance | null) => {
    targetRef.value = resolveTargetEl(el)
    refresh()
  }

  return { isOverflow, bindTargetRef, refresh }
}
