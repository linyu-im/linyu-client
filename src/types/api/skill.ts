export interface SkillListParam {
  keyword?: string
  category?: string
}

export interface Skill {
  id: string
  name: string
  description: string
  category: string
  version: string
  author: string
  featured: boolean
  capabilities: string[]
  content: string
  iconUrl: string
  createdAt: string
  updatedAt: string
}
