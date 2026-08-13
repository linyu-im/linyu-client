import type { SkillListParam, Skill } from '@/types/api/skill'
import { post, type ApiResponse } from '@/utils/network/http'

export function list(data?: SkillListParam): Promise<ApiResponse<Skill[]>> {
  return post<Skill[], SkillListParam>('/api/ai/v1/skill/list', data ?? {})
}
