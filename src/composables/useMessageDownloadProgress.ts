import { useMessageDownloadStore } from '@/stores/message/messageDownload'

export const useMessageDownloadProgress = (messageId: MaybeRefOrGetter<string | undefined>) => {
  const store = useMessageDownloadStore()

  const progress = computed(() => {
    const id = toValue(messageId)
    if (!id) return undefined
    return store.progressById[id]
  })

  const downloading = computed(() => progress.value !== undefined)
  const downloadProgress = computed(() => progress.value ?? 0)

  return { downloading, downloadProgress }
}
