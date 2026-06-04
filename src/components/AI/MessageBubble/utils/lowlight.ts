import { common, createLowlight } from 'lowlight'
import dockerfile from 'highlight.js/lib/languages/dockerfile'
import dart from 'highlight.js/lib/languages/dart'
import elixir from 'highlight.js/lib/languages/elixir'
import haskell from 'highlight.js/lib/languages/haskell'
import scala from 'highlight.js/lib/languages/scala'
import powershell from 'highlight.js/lib/languages/powershell'
import nginx from 'highlight.js/lib/languages/nginx'
import apache from 'highlight.js/lib/languages/apache'
import cmake from 'highlight.js/lib/languages/cmake'
import groovy from 'highlight.js/lib/languages/groovy'
import handlebars from 'highlight.js/lib/languages/handlebars'
import protobuf from 'highlight.js/lib/languages/protobuf'
import clojure from 'highlight.js/lib/languages/clojure'
import coffeescript from 'highlight.js/lib/languages/coffeescript'
import erlang from 'highlight.js/lib/languages/erlang'
import fsharp from 'highlight.js/lib/languages/fsharp'
import ocaml from 'highlight.js/lib/languages/ocaml'
import lisp from 'highlight.js/lib/languages/lisp'
import matlab from 'highlight.js/lib/languages/matlab'
import julia from 'highlight.js/lib/languages/julia'
import hljsHttp from 'highlight.js/lib/languages/http'
import latex from 'highlight.js/lib/languages/latex'

/** `common` 已含 typescript / javascript / python / bash / rust 等 */
export const aiLowlight = createLowlight(common)

aiLowlight.register({
  dockerfile,
  dart,
  elixir,
  haskell,
  scala,
  powershell,
  nginx,
  apache,
  cmake,
  groovy,
  handlebars,
  protobuf,
  clojure,
  coffeescript,
  erlang,
  fsharp,
  ocaml,
  lisp,
  matlab,
  julia,
  http: hljsHttp,
  latex
})

type HastNode = {
  type?: string
  tagName?: string
  value?: string
  properties?: { className?: string[] }
  children?: HastNode[]
}

/** markdown / IDE 常见 fence 语言名 → lowlight 已注册名 */
const LANGUAGE_ALIASES: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  py: 'python',
  python3: 'python',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  yml: 'yaml',
  md: 'markdown',
  html: 'xml',
  htm: 'xml',
  cs: 'csharp',
  'c#': 'csharp',
  'c++': 'cpp',
  docker: 'dockerfile',
  gql: 'graphql',
  ps: 'powershell',
  ps1: 'powershell',
  rb: 'ruby',
  rs: 'rust',
  kt: 'kotlin',
  kts: 'kotlin',
  pl: 'perl',
  vb: 'vbnet',
  tex: 'latex',
  vue: 'javascript',
  toml: 'ini',
  text: 'plaintext',
  txt: 'plaintext'
}

function escapeHtml(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function hastNodeToHtml(node: HastNode): string {
  if (node.type === 'text') {
    return escapeHtml(node.value ?? '')
  }

  if (node.type === 'element' && node.tagName) {
    const classList = node.properties?.className
    const classAttr = classList?.length ? ` class="${classList.join(' ')}"` : ''
    const inner = (node.children ?? []).map(hastNodeToHtml).join('')
    return `<${node.tagName}${classAttr}>${inner}</${node.tagName}>`
  }

  return (node.children ?? []).map(hastNodeToHtml).join('')
}

function resolveLanguage(language: string | null | undefined): string | null {
  if (!language || language === 'plaintext') return null
  const normalized = language.trim().toLowerCase()
  const aliased = LANGUAGE_ALIASES[normalized] ?? normalized
  const languages = aiLowlight.listLanguages()
  return languages.includes(aliased) ? aliased : null
}

export function highlightCodeToHtml(code: string, language: string | null | undefined) {
  const text = code.replace(/\n+$/, '')
  if (!text) return ''

  try {
    const lang = resolveLanguage(language)
    const tree = lang ? aiLowlight.highlight(lang, text) : aiLowlight.highlightAuto(text)
    return (tree.children ?? []).map(hastNodeToHtml).join('')
  } catch {
    return escapeHtml(text)
  }
}
