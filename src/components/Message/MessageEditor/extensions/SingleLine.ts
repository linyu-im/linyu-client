import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Slice, Fragment } from '@tiptap/pm/model'

export interface SingleLineOptions {
  onEnter?: (event: KeyboardEvent) => boolean | void
}

export const SingleLine = Extension.create<SingleLineOptions>({
  name: 'singleLine',

  addOptions() {
    return {
      onEnter: undefined
    }
  },

  addKeyboardShortcuts() {
    const handleEnter = (event: KeyboardEvent) => {
      const handled = this.options.onEnter?.(event)
      return handled !== false
    }
    return {
      Enter: () => handleEnter(new KeyboardEvent('keydown', { key: 'Enter' })),
      'Shift-Enter': () => true,
      'Mod-Enter': () => handleEnter(new KeyboardEvent('keydown', { key: 'Enter' }))
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('singleLinePasteSanitizer'),
        props: {
          transformPastedHTML(html) {
            return html.replace(/<br\s*\/?>/gi, ' ').replace(/\r?\n/g, ' ')
          },
          transformPastedText(text) {
            return text.replace(/\r?\n/g, ' ')
          },
          transformPasted(slice) {
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
