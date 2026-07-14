import { PluginKey } from '@tiptap/pm/state'
import { VueRenderer } from '@tiptap/vue-3'
import type { SuggestionOptions } from '@tiptap/suggestion'
import MentionList from '../MentionList.vue'
import type { MentionItem } from '@/types/common'

export interface MentionSuggestionOptions {
  /** 查询匹配的成员 */
  fetchItems: (query: string) => MentionItem[] | Promise<MentionItem[]>
  /** 弹层最多返回多少条；不传则返回全部，由 MentionList 滚动展示 */
  limit?: number
}

/**
 * 基于 @tiptap/suggestion 的 @ 提及弹层配置。
 */
export const buildMentionSuggestion = (
  options: MentionSuggestionOptions
): Omit<SuggestionOptions<MentionItem>, 'editor'> => {
  return {
    char: '@',
    allowedPrefixes: null,
    allowSpaces: false,
    startOfLine: false,
    pluginKey: new PluginKey('mentionSuggestion'),
    items: async ({ query }) => {
      const list = await options.fetchItems(query)
      return options.limit != null ? list.slice(0, options.limit) : list
    },
    render: () => {
      let component: VueRenderer | null = null
      let popup: HTMLDivElement | null = null

      const ensurePopup = () => {
        if (popup) return popup
        popup = document.createElement('div')
        popup.className = 'rich-editor-mention-popup'
        popup.style.position = 'absolute'
        popup.style.zIndex = '9999'
        popup.style.pointerEvents = 'auto'
        document.body.appendChild(popup)
        return popup
      }

      const updatePosition = (rect: DOMRect | null) => {
        if (!popup || !rect) return
        const { innerHeight, innerWidth, scrollX, scrollY } = window
        popup.style.visibility = 'hidden'
        popup.style.left = '0px'
        popup.style.top = '0px'
        const popupRect = popup.getBoundingClientRect()
        const margin = 6
        let top = rect.bottom + margin
        if (top + popupRect.height > innerHeight && rect.top - margin - popupRect.height > 0) {
          top = rect.top - margin - popupRect.height
        }
        let left = rect.left
        if (left + popupRect.width > innerWidth) {
          left = Math.max(0, innerWidth - popupRect.width - 4)
        }
        popup.style.left = `${left + scrollX}px`
        popup.style.top = `${top + scrollY}px`
        popup.style.visibility = 'visible'
      }

      return {
        onStart: (props) => {
          component = new VueRenderer(MentionList, {
            props,
            editor: props.editor
          })
          if (!props.clientRect) return
          const node = ensurePopup()
          node.innerHTML = ''
          if (component.element) {
            node.appendChild(component.element)
          }
          updatePosition(props.clientRect())
        },
        onUpdate: (props) => {
          component?.updateProps(props)
          if (props.clientRect) {
            updatePosition(props.clientRect())
          }
        },
        onKeyDown: (props) => {
          if (props.event.key === 'Escape') {
            popup?.remove()
            popup = null
            component?.destroy()
            component = null
            return true
          }
          const ref = component?.ref as { onKeyDown?: (p: { event: KeyboardEvent }) => boolean } | undefined
          return ref?.onKeyDown?.({ event: props.event }) ?? false
        },
        onExit: () => {
          popup?.remove()
          popup = null
          component?.destroy()
          component = null
        }
      }
    }
  }
}
