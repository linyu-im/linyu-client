import { Extensions } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import { MathBlock } from '../extensions/MathBlock'
import { MathInline } from '../extensions/MathInline'
import CodeBlockView from '../views/CodeBlockView.vue'
import { aiLowlight } from './lowlight'

const AiCodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return VueNodeViewRenderer(CodeBlockView)
  }
})

let cachedExtensions: Extensions | null = null

export function createAiReaderExtensions(): Extensions {
  if (cachedExtensions) return cachedExtensions

  cachedExtensions = [
    StarterKit.configure({
      codeBlock: false,
      link: false,
      dropcursor: false,
      gapcursor: false,
      heading: { levels: [1, 2, 3, 4] }
    }),
    AiCodeBlock.configure({
      lowlight: aiLowlight,
      HTMLAttributes: {
        class: 'ai-message-body__code-block'
      }
    }),
    Image.configure({
      inline: false,
      allowBase64: true,
      HTMLAttributes: {
        class: 'ai-message-body__image'
      }
    }),
    Link.configure({
      openOnClick: true,
      HTMLAttributes: {
        class: 'ai-message-body__link',
        rel: 'noopener noreferrer',
        target: '_blank'
      }
    }),
    MathBlock,
    MathInline
  ]

  return cachedExtensions
}
