const FILE_ICON_NAMES = [
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'txt',
  'rar',
  'audio',
  'video',
  'img',
  'unknown'
] as const

export type FileIconName = (typeof FILE_ICON_NAMES)[number]

const EXTENSION_ICON_MAP: Record<string, FileIconName> = {
  pdf: 'pdf',
  doc: 'doc',
  docx: 'docx',
  xls: 'xls',
  xlsx: 'xlsx',
  csv: 'xlsx',
  ppt: 'ppt',
  pptx: 'pptx',
  txt: 'txt',
  md: 'txt',
  log: 'txt',
  ini: 'txt',
  conf: 'txt',
  yaml: 'txt',
  yml: 'txt',
  rar: 'rar',
  zip: 'rar',
  tar: 'rar',
  gz: 'rar',
  tgz: 'rar',
  bz2: 'rar',
  xz: 'rar',
  '7z': 'rar',
  zst: 'rar',
  mp3: 'audio',
  wav: 'audio',
  flac: 'audio',
  aac: 'audio',
  ogg: 'audio',
  m4a: 'audio',
  wma: 'audio',
  ape: 'audio',
  mp4: 'video',
  avi: 'video',
  mkv: 'video',
  mov: 'video',
  wmv: 'video',
  flv: 'video',
  webm: 'video',
  m4v: 'video',
  mpeg: 'video',
  mpg: 'video',
  jpg: 'img',
  jpeg: 'img',
  png: 'img',
  gif: 'img',
  webp: 'img',
  bmp: 'img',
  svg: 'img',
  ico: 'img',
  heic: 'img',
  heif: 'img'
}

const MIME_ICON_MAP: Record<string, FileIconName> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'text/csv': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'text/plain': 'txt',
  'application/zip': 'rar',
  'application/x-rar-compressed': 'rar',
  'application/x-7z-compressed': 'rar',
  'application/x-tar': 'rar',
  'application/gzip': 'rar',
  'audio/': 'audio',
  'video/': 'video',
  'image/': 'img'
}

const FILE_ICON_BASE = '/file'

export const getFileExtension = (fileName: string) => {
  const base = fileName.trim().split(/[\\/]/).pop() ?? ''
  const dot = base.lastIndexOf('.')
  if (dot <= 0 || dot === base.length - 1) return ''
  return base.slice(dot + 1).toLowerCase()
}

/** 拆分展示用文件名：主体 + 后缀（含 `.`） */
export const splitFileName = (fileName: string) => {
  const name = fileName.trim().split(/[\\/]/).pop() ?? ''
  const ext = getFileExtension(name)
  if (!ext) {
    return { base: name, suffix: '' }
  }
  const suffix = `.${ext}`
  return {
    base: name.slice(0, -suffix.length),
    suffix
  }
}

const FILE_NAME_ELLIPSIS = '…'
/** 中间省略时保留的主体末尾字符数 */
const FILE_NAME_TAIL_KEEP = 2
/** 主体展示最大字数（约两行宽度，后缀另拼） */
const FILE_NAME_BASE_MAX_LEN = 22

/**
 * 中间省略主体：保留开头 + … + 末尾 2 字，后缀由组件单独拼接
 * 例：林语产品…33 + .pdf
 */
export const truncateFileBase = (base: string, maxLen = FILE_NAME_BASE_MAX_LEN) => {
  if (base.length <= maxLen) return base

  const tail = base.slice(-FILE_NAME_TAIL_KEEP)
  const headLen = maxLen - FILE_NAME_ELLIPSIS.length - tail.length
  if (headLen < 1) {
    return `${FILE_NAME_ELLIPSIS}${tail}`
  }

  return `${base.slice(0, headLen)}${FILE_NAME_ELLIPSIS}${tail}`
}

export const isFileNameTruncated = (base: string, maxLen = FILE_NAME_BASE_MAX_LEN) => {
  return base.length > maxLen
}

export const resolveFileIconName = (fileName: string, fileType?: string): FileIconName => {
  const ext = getFileExtension(fileName)
  if (ext && EXTENSION_ICON_MAP[ext]) {
    return EXTENSION_ICON_MAP[ext]
  }

  const mime = (fileType ?? '').trim().toLowerCase()
  if (mime) {
    const exact = MIME_ICON_MAP[mime]
    if (exact) return exact

    for (const [prefix, icon] of Object.entries(MIME_ICON_MAP)) {
      if (prefix.endsWith('/') && mime.startsWith(prefix)) {
        return icon
      }
    }
  }

  return 'unknown'
}

export const getFileIconUrl = (fileName: string, fileType?: string) => {
  const name = resolveFileIconName(fileName, fileType)
  if (!FILE_ICON_NAMES.includes(name)) {
    return `${FILE_ICON_BASE}/unknown.png`
  }
  return `${FILE_ICON_BASE}/${name}.png`
}
