import { useMessageUploadStore } from '@/stores/messageUpload'

export const useMessageUploadProgress = (messageId: MaybeRefOrGetter<string | undefined>) => {
  const store = useMessageUploadStore()

  const progress = computed(() => {
    const id = toValue(messageId)
    if (!id) return undefined
    return store.progressById[id]
  })

  const uploading = computed(() => progress.value !== undefined)
  const uploadProgress = computed(() => progress.value ?? 0)

  return { uploading, uploadProgress }
}
