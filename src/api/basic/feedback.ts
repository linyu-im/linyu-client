import { readFile } from '@tauri-apps/plugin-fs'
import type { FeedbackCreateParam } from '@/types/api/feedback'
import { formData, post, type ApiResponse } from '@/utils/network/http'

export async function uploadImage(path: string): Promise<ApiResponse<string>> {
  const bytes = await readFile(path)
  const fileName = path.split(/[/\\]/).pop() || 'image.png'
  const body = new FormData()
  body.append('file', new Blob([bytes]), fileName)
  return formData<string>('/api/basic/v1/feedback/image/upload', body)
}

export function create(data: FeedbackCreateParam): Promise<ApiResponse<void>> {
  return post<void, FeedbackCreateParam>('/api/basic/v1/feedback/create', data)
}
