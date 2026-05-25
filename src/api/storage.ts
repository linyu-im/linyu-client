import { readFile } from '@tauri-apps/plugin-fs'
import { formData, type ApiResponse } from '@/utils/http'

export async function upload<T = any>(path: string): Promise<ApiResponse<T>> {
  const bytes = await readFile(path)
  const body = new FormData()
  body.append('file', new Blob([bytes]))
  return formData<T>('/api/basic/v1/storage/upload', body)
}
