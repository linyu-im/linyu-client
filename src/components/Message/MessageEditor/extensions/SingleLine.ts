import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Slice, Fragment } from '@tiptap/pm/model'

export interface SingleLineOptions {
  /** Enter 发送时返回 true；Ctrl/Cmd+Enter 发送时返回 false（允许换行） */
  shouldSubmitOnEnter?: () => boolean
  onSubmit?: () => boolean | void
}

export const SingleLine = Extension.create<SingleLineOptions>({
  name: 'singleLine',

  addOptions() {
    return {
      shouldSubmitOnEnter: () => true,
      onSubmit: undefined
    }
  },

  addKeyboardShortcuts() {
    const submit = () => this.options.onSubmit?.() !== false
    const submitOnEnter = () => this.options.shouldSubmitOnEnter?.() !== false
    return {
      Enter: () => {
        if (submitOnEnter()) return submit()
        return false
      },
      'Shift-Enter': () => {
        // Enter 发送模式下拦截换行；Ctrl+Enter 发送模式允许换行
        return submitOnEnter()
      },
      'Mod-Enter': () => submit()
    }
  },

  addProseMirrorPlugins() {
    const shouldSanitize = () => this.options.shouldSubmitOnEnter?.() !== false

    return [
      new Plugin({
        key: new PluginKey('singleLinePasteSanitizer'),
        props: {
          transformPastedHTML(html) {
            if (!shouldSanitize()) return html
            return html.replace(/<br\s*\/?>/gi, ' ').replace(/\r?\n/g, ' ')
          },
          transformPastedText(text) {
            if (!shouldSanitize()) return text
            return text.replace(/\r?\n/g, ' ')
          },
          transformPasted(slice) {
            if (!shouldSanitize()) return slice
            const inlineNodes: any[] = []
            slice.content.descendants((node) => {
              if (node.isInline) {
                inlineNodes.push(node)
                return false
              }
              return true
            })
            if (inlineNodes.length === 0) return slice
            return new Slice(Fragment.from(inlineNodes), 0, 0)
          }
        }
      })
    ]
  }
})
