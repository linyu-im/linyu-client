import { Node, mergeAttributes, nodeInputRule } from '@tiptap/core'

export interface FileChipAttrs {
  name: string
  size: number
  mime: string
  url: string
}

export interface FileChipOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fileChip: {
      /** 在当前选区位置插入文件标签 */
      insertFileChip: (attrs: FileChipAttrs) => ReturnType
    }
  }
}

const humanSize = (size: number) => {
  if (!size || size <= 0) return ''
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let n = size
  let i = 0
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i++
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)}${units[i]}`
}

/**
 * 行内文件附件节点：以胶囊形式展示文件名 + 大小。
 */
export const FileChip = Node.create<FileChipOptions>({
  name: 'fileChip',
  inline: true,
  group: 'inline',
  atom: true,
  selectable: false,
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {}
    }
  },

  addAttributes() {
    return {
      name: { default: '' },
      size: { default: 0 },
      mime: { default: '' },
      url: { default: '' }
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-type="file-chip"]' }]
  },

  renderHTML({ HTMLAttributes, node }) {
    const name = node.attrs.name || 'file'
    const sizeText = humanSize(node.attrs.size)
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'file-chip',
        class: 'rich-editor-file-chip',
        title: sizeText ? `${name} · ${sizeText}` : name,
        contenteditable: 'false'
      }),
      ['span', { class: 'rich-editor-file-chip__icon' }, '📄'],
      ['span', { class: 'rich-editor-file-chip__name' }, name],
      ...(sizeText ? [['span', { class: 'rich-editor-file-chip__size' }, sizeText] as any] : [])
    ]
  },

  addCommands() {
    return {
      insertFileChip:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs
          })
        }
    }
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: /\[file:([^\]]+)\]$/,
        type: this.type,
        getAttributes: (match) => ({ name: match[1], size: 0, mime: '', url: '' })
      })
    ]
  }
})
