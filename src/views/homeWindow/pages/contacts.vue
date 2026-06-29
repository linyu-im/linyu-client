<template>
  <div class="contacts">
    <Split :min-size="220" :max-size="320" :default-size="270">
      <template #first>
        <div class="contacts__sider">
          <div class="contacts__toolbar">
            <n-input
              size="small"
              type="text"
              class="contacts__search text-14px"
              :placeholder="t('contacts.searchPlaceholder')"
              clearable>
              <template #prefix>
                <svg class="size-16px text-[var(--text-secondary-color)]">
                  <use href="#search"></use>
                </svg>
              </template>
            </n-input>
            <n-button class="contacts__toolbar-btn">
              <svg class="size-16px text-[var(--text-secondary-color)] bg-transparent">
                <use href="#plus"></use>
              </svg>
            </n-button>
          </div>
          <n-scrollbar class="contacts__scroll">
            <div class="contacts__list">
              <div
                class="contacts__menu-item"
                :class="{ active: selectedId === 'new-friend' }"
                @click="onSelect('new-friend')">
                <div class="text-14px">{{ t('contacts.menu.newFriend') }}</div>
                <div class="flex items-center gap-6px text-[var(--text-secondary-color)]">
                  <svg class="size-18px">
                    <use href="#right-arrow"></use>
                  </svg>
                </div>
              </div>
              <div
                class="contacts__menu-item"
                :class="{ active: selectedId === 'group-notice' }"
                @click="onSelect('group-notice')">
                <div class="text-14px">{{ t('contacts.menu.groupNotice') }}</div>
                <div class="flex items-center gap-6px text-[var(--text-secondary-color)]">
                  <n-badge :value="2" :max="99" color="#ff5f5f" />
                  <svg class="size-18px">
                    <use href="#right-arrow"></use>
                  </svg>
                </div>
              </div>

              <div class="contacts__group">
                <div class="contacts__group-title" @click="toggleGroup('enterprise')">
                  <div class="contacts__group-left">
                    <svg class="contacts__group-arrow" :class="{ expanded: expandedGroups.enterprise }">
                      <use href="#right-arrow"></use>
                    </svg>
                    <span>{{ t('contacts.menu.myEnterprise') }}</span>
                  </div>
                  <span class="contacts__group-count">{{ enterpriseList.length }}</span>
                </div>
                <template v-if="expandedGroups.enterprise">
                  <div v-if="enterpriseListLoading" class="contacts__loading">{{ t('contacts.loading') }}</div>
                  <div v-else-if="enterpriseList.length === 0" class="contacts__empty">
                    {{ t('contacts.emptyEnterprises') }}
                  </div>
                  <div
                    v-else
                    v-for="enterprise in enterpriseList"
                    :key="enterprise.id"
                    class="contacts__entry"
                    :class="{ active: selectedId === enterprise.id }"
                    @click="onSelect(enterprise.id)">
                    <Avatar class="size-34px rounded-5px bg-#FFF" type="enterprise" :id="enterprise.peerId" />
                    <div class="min-w-0 flex-1">
                      <div class="text-14px truncate">{{ enterprise.enterpriseName || '-' }}</div>
                      <div class="contacts__sub">({{ enterprise.enterpriseMemberNum ?? 0 }})</div>
                    </div>
                  </div>
                </template>
              </div>
              <div class="contacts__group">
                <div class="contacts__group-title" @click="toggleGroup('group')">
                  <div class="contacts__group-left">
                    <svg class="contacts__group-arrow" :class="{ expanded: expandedGroups.group }">
                      <use href="#right-arrow"></use>
                    </svg>
                    <span>{{ t('contacts.menu.myGroup') }}</span>
                  </div>
                  <span class="contacts__group-count">{{ groupList.length }}</span>
                </div>
                <template v-if="expandedGroups.group">
                  <div v-if="groupListLoading" class="contacts__loading">{{ t('contacts.loading') }}</div>
                  <div v-else-if="groupList.length === 0" class="contacts__empty">{{ t('contacts.emptyGroups') }}</div>
                  <div
                    v-else
                    v-for="contact in groupList"
                    :key="contact.id"
                    class="contacts__entry"
                    :class="{ active: selectedId === contact.id }"
                    @click="onSelect(contact.id)">
                    <Avatar class="size-34px rounded-5px bg-#FFF" type="group" :id="contact.peerId" />
                    <div class="min-w-0 flex-1">
                      <div class="text-14px truncate">{{ contact.groupName }}</div>
                      <div v-if="contact.groupMemberNum != null" class="contacts__sub">
                        ({{ contact.groupMemberNum }})
                      </div>
                    </div>
                  </div>
                </template>
              </div>
              <div class="contacts__group">
                <div class="contacts__group-title" @click="toggleGroup('friend')">
                  <div class="contacts__group-left">
                    <svg class="contacts__group-arrow" :class="{ expanded: expandedGroups.friend }">
                      <use href="#right-arrow"></use>
                    </svg>
                    <span>{{ t('contacts.menu.myFriends') }}</span>
                  </div>
                  <span class="contacts__group-count">{{ friendList.length }}</span>
                </div>
                <template v-if="expandedGroups.friend">
                  <div v-if="friendListLoading" class="contacts__loading">{{ t('contacts.loading') }}</div>
                  <div v-else-if="friendList.length === 0" class="contacts__empty">
                    {{ t('contacts.emptyFriends') }}
                  </div>
                  <template v-else>
                    <div v-for="group in friendGroups" :key="group.letter" class="contacts__alpha-group">
                      <div class="contacts__alpha-title">{{ group.letter }}</div>
                      <div class="contacts__alpha-divider" />
                      <div
                        v-for="contact in group.items"
                        :key="contact.id"
                        class="contacts__entry"
                        :class="{ active: selectedId === contact.id }"
                        @click="onSelect(contact.id)">
                        <Avatar class="size-34px rounded-5px bg-#FFF" :id="contact.peerId" />
                        <div class="min-w-0 flex-1">
                          <div class="text-14px truncate">{{ getContactDisplayName(contact) }}</div>
                          <div class="contacts__sub">
                            <span>[</span>
                            <img v-if="contact.emotionUrl" :src="contact.emotionUrl" class="size-12px" />
                            <div v-if="contact.emotionUrl">{{ contact.emotionName }}</div>
                            <span>]</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </template>
                </template>
              </div>
            </div>
          </n-scrollbar>
        </div>
      </template>
      <template #second>
        <div class="contacts__detail">
          <ContactsNewFriend v-if="activeView === 'newFriend'" />
          <ContactsGroupNotice v-else-if="activeView === 'groupNotice'" />
          <ContactsGroupProfile
            v-else-if="activeView === 'groupProfile' && activeGroup"
            :group-id="activeGroup.peerId"
            :remark="activeGroup.remark"
            @remark-updated="onGroupRemarkUpdated" />
          <ContactsEnterpriseProfile
            v-else-if="activeView === 'enterpriseProfile' && activeEnterprise"
            :enterprise-id="activeEnterprise.peerId" />
          <ContactsFriendProfile
            v-else-if="activeFriendUserId"
            :user-id="activeFriendUserId"
            @remark-updated="onFriendRemarkUpdated" />
        </div>
      </template>
    </Split>
  </div>
</template>

<script setup lang="ts">
  defineOptions({ name: 'contacts' })
  import ContactsEnterpriseProfile from '@/components/Contacts/ContactsEnterpriseProfile.vue'
  import ContactsFriendProfile from '@/components/Contacts/ContactsFriendProfile.vue'
  import ContactsGroupNotice from '@/components/Contacts/ContactsGroupNotice.vue'
  import ContactsGroupProfile from '@/components/Contacts/ContactsGroupProfile.vue'
  import ContactsNewFriend from '@/components/Contacts/ContactsNewFriend.vue'
  import { contactsApi } from '@/api'
  import { useHomeTabStore } from '@/stores/homeTab'
  import type { Contact, ContactsMenuView } from '@/types/api/contacts'
  import { getNameInitial } from '@/utils/pinyin'
  import { useI18n } from 'vue-i18n'

  type GroupKey = 'enterprise' | 'group' | 'friend'
  type FriendGroup = { letter: string; items: Contact[] }

  const { t } = useI18n()
  const homeTabStore = useHomeTabStore()

  const selectedId = ref('new-friend')
  const expandedGroups = ref<Record<GroupKey, boolean>>({
    enterprise: false,
    group: false,
    friend: true
  })

  const enterpriseList = ref<Contact[]>([])
  const enterpriseListLoading = ref(false)

  const groupList = ref<Contact[]>([])
  const groupListLoading = ref(false)

  const friendList = ref<Contact[]>([])
  const friendListLoading = ref(false)

  const getContactDisplayName = (contact: Contact) => contact.remark || contact.username

  const zhPinyinCollator = new Intl.Collator('zh-Hans-CN-u-co-pinyin')

  const friendGroups = computed<FriendGroup[]>(() => {
    const sorted = [...friendList.value].sort((a, b) =>
      zhPinyinCollator.compare(getContactDisplayName(a), getContactDisplayName(b))
    )
    const groups = new Map<string, Contact[]>()
    for (const contact of sorted) {
      const letter = getNameInitial(getContactDisplayName(contact))
      const current = groups.get(letter) ?? []
      current.push(contact)
      groups.set(letter, current)
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([letter, items]) => ({ letter, items }))
  })

  const fetchGroupList = async () => {
    if (groupListLoading.value) return
    groupListLoading.value = true
    try {
      const res = await contactsApi.groupList()
      if (res.code === 0 && res.data) {
        groupList.value = res.data
      } else {
        window.$message.error(res.msg)
      }
    } finally {
      groupListLoading.value = false
    }
  }

  const fetchEnterpriseList = async () => {
    if (enterpriseListLoading.value) return
    enterpriseListLoading.value = true
    try {
      const res = await contactsApi.enterpriseList()
      if (res.code === 0 && res.data) {
        enterpriseList.value = res.data
      } else {
        window.$message.error(res.msg)
      }
    } finally {
      enterpriseListLoading.value = false
    }
  }

  const fetchFriendList = async () => {
    if (friendListLoading.value) return
    friendListLoading.value = true
    try {
      const res = await contactsApi.friendList()
      if (res.code === 0 && res.data) {
        friendList.value = res.data
      } else {
        window.$message.error(res.msg)
      }
    } finally {
      friendListLoading.value = false
    }
  }

  onActivated(() => {
    void fetchEnterpriseList()
    void fetchGroupList()
    void fetchFriendList()
  })

  onMounted(() => {
    void fetchEnterpriseList()
    void fetchGroupList()
    void fetchFriendList()
  })

  const activeGroup = computed(() => groupList.value.find((item) => item.id === selectedId.value))
  const activeEnterprise = computed(() => enterpriseList.value.find((item) => item.id === selectedId.value))

  const activeContact = computed(() => friendList.value.find((item) => item.id === selectedId.value))

  const activeFriendUserId = computed(() => activeContact.value?.peerId ?? '')

  const activeView = computed<ContactsMenuView>(() => {
    if (selectedId.value === 'new-friend') return 'newFriend'
    if (selectedId.value === 'group-notice') return 'groupNotice'
    if (activeFriendUserId.value) return 'friendProfile'
    if (activeGroup.value) return 'groupProfile'
    if (activeEnterprise.value) return 'enterpriseProfile'
    return 'newFriend'
  })

  const onSelect = (id: string) => {
    selectedId.value = id
  }

  const onFriendRemarkUpdated = (payload: { peerId: string; remark: string }) => {
    const contact = friendList.value.find((item) => item.peerId === payload.peerId)
    if (contact) contact.remark = payload.remark
  }

  const onGroupRemarkUpdated = (payload: { peerId: string; remark: string }) => {
    const contact = groupList.value.find((item) => item.peerId === payload.peerId)
    if (contact) contact.remark = payload.remark
  }

  const toggleGroup = (group: GroupKey) => {
    expandedGroups.value[group] = !expandedGroups.value[group]
  }

  const applyContactsPayload = () => {
    const payload = homeTabStore.consumeTabPayload('contacts')
    if (!payload) return

    if (payload.selectedId) {
      selectedId.value = payload.selectedId
      return
    }

    if (payload.peerId) {
      const contact = friendList.value.find((item) => item.peerId === payload.peerId)
      if (contact) {
        expandedGroups.value.friend = true
        selectedId.value = contact.id
      }
    }
  }

  watch(
    () => homeTabStore.tabPayload.contacts,
    () => {
      applyContactsPayload()
    }
  )

  watch(friendList, () => {
    if (homeTabStore.tabPayload.contacts?.peerId) {
      applyContactsPayload()
    }
  })
</script>

<style scoped lang="scss">
  .contacts {
    width: 100%;
    min-width: 0;
    height: 100%;
    overflow: hidden;

    &__sider {
      display: flex;
      flex-direction: column;
      width: 100%;
      min-width: 0;
      height: 100%;
      padding: 10px;
      box-sizing: border-box;
      overflow: hidden;
    }

    &__toolbar {
      display: flex;
      align-items: center;
      flex-shrink: 0;
      padding: 0 5px;
    }

    &__search {
      flex: 1;
      min-width: 0;
      height: 28px;
    }

    &__toolbar-btn {
      flex-shrink: 0;
      width: 28px;
      height: 28px;
      padding: 0;
      margin-left: 10px;
      border-radius: 5px;
    }

    &__scroll {
      margin-top: 10px;
      min-height: 0;
    }

    &__list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 10px 0;
    }

    &__menu-item {
      height: 38px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 10px;
      cursor: pointer;
      user-select: none;
      color: var(--text-color);
      border: 1px solid transparent;

      &:hover {
        background-color: color-mix(in srgb, var(--card-bg-color) 60%, transparent);
      }

      &.active {
        background-color: color-mix(in srgb, var(--primary-color) 6%, transparent);
        border-color: color-mix(in srgb, var(--primary-color) 60%, transparent);
      }
    }

    &__group {
      margin-top: 8px;
    }

    &__group-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: var(--text-muted-color);
      font-size: 12px;
      padding: 4px 8px;
      user-select: none;
      cursor: pointer;
    }

    &__group-left {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    &__group-arrow {
      width: 14px;
      height: 14px;
      transition: transform 0.2s ease;
      transform: rotate(0deg);
      color: var(--text-secondary-color);

      &.expanded {
        transform: rotate(90deg);
      }
    }

    &__alpha-group {
      margin-top: 2px;
    }

    &__alpha-title {
      font-size: 12px;
      color: var(--text-secondary-color);
      padding: 6px 10px 2px;
      user-select: none;
    }

    &__alpha-divider {
      height: 1px;
      background-color: var(--divider-color);
      margin: 0 10px 2px;
      opacity: 0.7;
    }

    &__loading {
      font-size: 12px;
      color: var(--text-secondary-color);
      padding: 8px 10px;
      user-select: none;
    }

    &__empty {
      font-size: 12px;
      color: var(--text-secondary-color);
      padding: 8px 10px;
      user-select: none;
      text-align: center;
    }

    &__group-count {
      font-size: 11px;
    }

    &__entry {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border-radius: 6px;
      cursor: pointer;
      border: 1px solid transparent;
      user-select: none;

      &:hover {
        background-color: color-mix(in srgb, var(--card-bg-color) 60%, transparent);
      }

      &.active {
        background-color: color-mix(in srgb, var(--primary-color) 6%, transparent);
        border-color: color-mix(in srgb, var(--primary-color) 60%, transparent);
      }
    }

    &__sub {
      font-size: 12px;
      color: var(--text-secondary-color);
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      margin-top: 5px;
      display: flex;
      align-items: center;
      gap: 2px;
    }

    &__detail {
      display: flex;
      flex-direction: column;
      width: 100%;
      min-width: 0;
      height: 100%;
      box-sizing: border-box;
      overflow: hidden;
    }
  }
</style>
