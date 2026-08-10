import { defineStore } from 'pinia'

type SearchChatRecordStore = {
  keyword: string
}

export const useSearchChatRecordStore = defineStore('searchChatRecord', {
  persist: false,
  share: {
    enable: true,
    initialize: true
  },
  state: (): SearchChatRecordStore => ({
    keyword: ''
  }),
  actions: {
    setKeyword(keyword: string) {
      this.$patch((state) => {
        state.keyword = keyword
      })
    },
    reset() {
      this.$patch((state) => {
        state.keyword = ''
      })
    }
  }
})
