import { useI18n } from 'vue-i18n'
import { useForwardMessageModal } from '@/composables/useForwardMessageModal'
import { useMessageActionsStore } from '@/stores/message/messageActions'
import type { Message } from '@/types/api/message'

interface DeleteMessageOptions {
  onBeforeDelete?: (message: Message) => void
  onDeleted?: (message: Message) => void
  onFailed?: (message: Message) => void
}

export function useMessageBubbleActions() {
  const { t } = useI18n()
  const messageActionsStore = useMessageActionsStore()
  const { openForwardMessageModal } = useForwardMessageModal()

  const forwardMessage = (message: Message) => {
    openForwardMessageModal(message)
  }

  const deleteMessage = (message: Message, options: DeleteMessageOptions = {}) => {
    if (!message.id) return Promise.resolve(false)

    options.onBeforeDelete?.(message)

    return messageActionsStore
      .deleteLocalMessage(message)
      .then(() => {
        options.onDeleted?.(message)
        return true
      })
      .catch(() => {
        options.onFailed?.(message)
        window.$message.error(t('message.bubbleMenu.deleteFailed'))
        return false
      })
  }

  return {
    forwardMessage,
    deleteMessage
  }
}
