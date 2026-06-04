import MarkdownIt from 'markdown-it'

const markdown = new MarkdownIt({
  html: true,
  linkify: true,
  breaks: true,
  typographer: true
})

/** markdown-it 围栏代码末尾常会多一个换行，去掉以免代码块底部空一行 */
const defaultFence =
  markdown.renderer.rules.fence ?? ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))

markdown.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const token = tokens[idx]
  const trimmed = token.content.replace(/\n+$/, '')
  if (trimmed !== token.content) {
    tokens[idx] = Object.assign(Object.create(token), { content: trimmed })
  }
  return defaultFence(tokens, idx, options, env, self)
}

function encodeLatex(latex: string) {
  return encodeURIComponent(latex.trim())
}

/** 将 LaTeX 公式替换为 Tiptap 可解析的占位节点 HTML */
export function injectMathPlaceholders(source: string) {
  let text = source

  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_match, latex: string) => {
    return `\n<div data-type="math-block" data-latex="${encodeLatex(latex)}"></div>\n`
  })

  text = text.replace(/(?<!\$)\$([^$\n]+?)\$(?!\$)/g, (_match, latex: string) => {
    return `<span data-type="math-inline" data-latex="${encodeLatex(latex)}"></span>`
  })

  return text
}

export function aiMarkdownToHtml(markdownSource: string) {
  const normalized = injectMathPlaceholders(markdownSource ?? '')
  return markdown.render(normalized)
}
