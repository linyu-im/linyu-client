import { defineStore } from 'pinia'

type GroupNoticeStore = {
  groupId: string
  groupName: string
}

export const useGroupNoticeStore = defineStore('groupNotice', {
  persist: true,
  share: {
    enable: true,
    initialize: true
  },
  state: (): GroupNoticeStore => ({
    groupId: '',
    groupName: ''
  }),
  actions: {
    open(groupId: string, groupName: string) {
      this.$patch((state) => {
        state.groupId = groupId
        state.groupName = groupName
      })
    },
    reset() {
      this.$patch((state) => {
        state.groupId = ''
        state.groupName = ''
      })
    }
  }
})
