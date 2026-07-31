export type FilePreviewKind = 'markdown' | 'text' | 'image' | 'video' | 'audio' | 'word' | 'sheet' | 'pdf'

export interface FilePreviewConfig {
  extension: string
  kind: FilePreviewKind
  maxBytes: number
  mimeType: string
}

const MB = 1024 * 1024

const TEXT_EXTENSIONS = new Set([
  'txt',
  'log',
  'json',
  'jsonc',
  'yml',
  'yaml',
  'xml',
  'html',
  'htm',
  'css',
  'scss',
  'sass',
  'less',
  'js',
  'jsx',
  'mjs',
  'cjs',
  'ts',
  'tsx',
  'vue',
  'java',
  'c',
  'h',
  'cpp',
  'hpp',
  'cs',
  'go',
  'rs',
  'py',
  'rb',
  'php',
  'sh',
  'bash',
  'zsh',
  'ps1',
  'sql',
  'ini',
  'conf',
  'config',
  'properties',
  'toml',
  'env',
  'csv'
])

const IMAGE_MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  avif: 'image/avif'
}

const VIDEO_MIME_TYPES: Record<string, string> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  ogv: 'video/ogg',
  ogg: 'video/ogg',
  mov: 'video/quicktime',
  m4v: 'video/x-m4v'
}

const AUDIO_MIME_TYPES: Record<string, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  oga: 'audio/ogg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  flac: 'audio/flac'
}

const MIME_TYPE_EXTENSIONS: Record<string, string> = {
  'application/msword': 'doc',
  'application/pdf': 'pdf',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/markdown': 'md',
  'text/plain': 'txt'
}

export const normalizeFileExtension = (fileName = '', fileType = '') => {
  const fileNameWithoutQuery = fileName.split(/[?#]/, 1)[0]
  const lastDotIndex = fileNameWithoutQuery.lastIndexOf('.')
  const fileNameExtension =
    lastDotIndex > -1
      ? fileNameWithoutQuery
          .slice(lastDotIndex + 1)
          .trim()
          .toLowerCase()
      : ''
  if (fileNameExtension) return fileNameExtension

  const normalizedFileType = fileType.trim().replace(/^\./, '').toLowerCase()
  if (!normalizedFileType) return ''
  const mimeType = normalizedFileType.split(';', 1)[0]
  return MIME_TYPE_EXTENSIONS[mimeType] ?? (normalizedFileType.includes('/') ? '' : normalizedFileType)
}

export const resolveFilePreviewConfig = (fileName = '', fileType = ''): FilePreviewConfig | null => {
  const extension = normalizeFileExtension(fileName, fileType)
  if (!extension) return null

  if (extension === 'md' || extension === 'markdown') {
    return { extension, kind: 'markdown', maxBytes: 5 * MB, mimeType: 'text/markdown;charset=utf-8' }
  }
  if (TEXT_EXTENSIONS.has(extension)) {
    return { extension, kind: 'text', maxBytes: 5 * MB, mimeType: 'text/plain;charset=utf-8' }
  }
  if (IMAGE_MIME_TYPES[extension]) {
    return { extension, kind: 'image', maxBytes: 30 * MB, mimeType: IMAGE_MIME_TYPES[extension] }
  }
  if (VIDEO_MIME_TYPES[extension]) {
    return { extension, kind: 'video', maxBytes: 150 * MB, mimeType: VIDEO_MIME_TYPES[extension] }
  }
  if (AUDIO_MIME_TYPES[extension]) {
    return { extension, kind: 'audio', maxBytes: 80 * MB, mimeType: AUDIO_MIME_TYPES[extension] }
  }
  if (extension === 'docx') {
    return {
      extension,
      kind: 'word',
      maxBytes: 20 * MB,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }
  }
  if (extension === 'xlsx' || extension === 'xls') {
    return {
      extension,
      kind: 'sheet',
      maxBytes: 20 * MB,
      mimeType:
        extension === 'xlsx'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/vnd.ms-excel'
    }
  }
  if (extension === 'pdf') {
    return { extension, kind: 'pdf', maxBytes: 50 * MB, mimeType: 'application/pdf' }
  }
  return null
}

export const isFilePreviewTooLarge = (fileSize: number, config: FilePreviewConfig) =>
  Number.isFinite(fileSize) && fileSize > config.maxBytes

export const formatPreviewLimit = (maxBytes: number) => `${Math.round(maxBytes / MB)} MB`
