import { defineStore } from 'pinia'
import { contactsApi } from '@/api'
import type { Contact } from '@/types/api/contacts'

type ContactsStore = {
  enterpriseList: Contact[]
  groupList: Contact[]
  friendList: Contact[]
  enterpriseListLoading: boolean
  groupListLoading: boolean
  friendListLoading: boolean
}

export const useContactsStore = defineStore('contacts', {
  state: (): ContactsStore => ({
    enterpriseList: [],
    groupList: [],
    friendList: [],
    enterpriseListLoading: false,
    groupListLoading: false,
    friendListLoading: false
  }),
  actions: {
    setEnterpriseList(list: Contact[]) {
      this.$patch((state) => {
        state.enterpriseList = list
      })
    },
    setGroupList(list: Contact[]) {
      this.$patch((state) => {
        state.groupList = list
      })
    },
    setFriendList(list: Contact[]) {
      this.$patch((state) => {
        state.friendList = list
      })
    },
    setEnterpriseListLoading(loading: boolean) {
      this.$patch((state) => {
        state.enterpriseListLoading = loading
      })
    },
    setGroupListLoading(loading: boolean) {
      this.$patch((state) => {
        state.groupListLoading = loading
      })
    },
    setFriendListLoading(loading: boolean) {
      this.$patch((state) => {
        state.friendListLoading = loading
      })
    },
    removeFriendLocal(peerId: string) {
      if (!peerId) return
      this.$patch((state) => {
        state.friendList = state.friendList.filter((item) => item.peerId !== peerId)
      })
    },
    removeGroupLocal(peerId: string) {
      if (!peerId) return
      this.$patch((state) => {
        state.groupList = state.groupList.filter((item) => item.peerId !== peerId)
      })
    },
    patchContactRemark(peerId: string, remark: string) {
      if (!peerId) return
      this.$patch((state) => {
        const friend = state.friendList.find((item) => item.peerId === peerId)
        if (friend) friend.remark = remark
        const group = state.groupList.find((item) => item.peerId === peerId)
        if (group) group.remark = remark
      })
    },
    fetchEnterpriseList() {
      if (this.enterpriseListLoading) return
      if (this.enterpriseList.length === 0) this.setEnterpriseListLoading(true)
      contactsApi
        .enterpriseList()
        .then((res) => {
          if (res.code === 0 && res.data) {
            this.setEnterpriseList(res.data)
          } else {
            window.$message.error(res.msg)
          }
        })
        .finally(() => {
          this.setEnterpriseListLoading(false)
        })
    },
    fetchGroupList() {
      if (this.groupListLoading) return
      if (this.groupList.length === 0) this.setGroupListLoading(true)
      contactsApi
        .groupList()
        .then((res) => {
          if (res.code === 0 && res.data) {
            this.setGroupList(res.data)
          } else {
            window.$message.error(res.msg)
          }
        })
        .finally(() => {
          this.setGroupListLoading(false)
        })
    },
    fetchFriendList() {
      if (this.friendListLoading) return
      if (this.friendList.length === 0) this.setFriendListLoading(true)
      contactsApi
        .friendList()
        .then((res) => {
          if (res.code === 0 && res.data) {
            this.setFriendList(res.data)
          } else {
            window.$message.error(res.msg)
          }
        })
        .finally(() => {
          this.setFriendListLoading(false)
        })
    },
    fetchAll() {
      this.fetchEnterpriseList()
      this.fetchGroupList()
      this.fetchFriendList()
    }
  },
  share: {
    enable: true,
    initialize: true
  }
})
