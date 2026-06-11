import { open } from '@tauri-apps/plugin-dialog'
import { readFile } from '@tauri-apps/plugin-fs'

const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
  zip: 'application/zip',
  rar: 'application/vnd.rar',
  '7z': 'application/x-7z-compressed',
  txt: 'text/plain',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  mp4: 'video/mp4',
  mp3: 'audio/mpeg'
}

const getFileNameFromPath = (path: string) => path.replace(/^.*[/\\]/, '')

const guessMimeFromName = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return MIME_BY_EXT[ext] ?? 'application/octet-stream'
}

export const readPathAsFile = async (path: string) => {
  const bytes = await readFile(path)
  const name = getFileNameFromPath(path)
  const type = guessMimeFromName(name)
  return new File([bytes], name, { type })
}

interface PickFilesOptions {
  title: string
  multiple?: boolean
  filters?: { name: string; extensions: string[] }[]
}

export const pickFiles = async (options: PickFilesOptions) => {
  const selected = await open({
    multiple: options.multiple ?? true,
    title: options.title,
    filters: options.filters
  })
  if (!selected) return []

  const paths = Array.isArray(selected) ? selected : [selected]
  const files: File[] = []
  for (const path of paths) {
    files.push(await readPathAsFile(path))
  }
  return files
}

export const IMAGE_FILE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp']
