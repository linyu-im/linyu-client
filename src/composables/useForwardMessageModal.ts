import { h } from 'vue'
import { useModal } from 'naive-ui'
import ForwardMessageModal from '@/components/Modal/ForwardMessageModal.vue'
import type { Message } from '@/types/api/message'

export function useForwardMessageModal() {
  const modal = useModal()

  const openForwardMessageModal = (message: Message) => {
    let modalInst: ReturnType<typeof modal.create> | null = null

    modalInst = modal.create({
      transformOrigin: 'center',
      maskClosable: false,
      closeOnEsc: false,
      style: {
        width: '720px',
        maxWidth: '92vw',
        boxShadow: 'none'
      },
      render() {
        return h(ForwardMessageModal, {
          message,
          onClose: () => modalInst?.destroy()
        })
      }
    })
  }

  return { openForwardMessageModal }
}
