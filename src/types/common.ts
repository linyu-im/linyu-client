export type FromType = 'user' | 'group' | 'enterprise' | 'robot'

export interface MentionItem {
  id: string
  name: string
  type?: FromType
  tag?: string
}
