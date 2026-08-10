<template>
  <div class="contacts">
    <Split :min-size="220" :max-size="320" :default-size="270">
      <template #first>
        <div class="contacts__sider">
          <div class="contacts__toolbar">
            <ContactsSearchPopover :placeholder="t('contacts.searchPlaceholder')" />
            <n-dropdown :options="addMenuOptions" placement="bottom-start" trigger="click" @select="onAddMenuSelect">
              <n-button class="contacts__toolbar-btn">
                <svg class="size-16px text-[var(--text-secondary-color)] bg-transparent">
                  <use href="#plus"></use>
                </svg>
              </n-button>
            </n-dropdown>
          </div>
          <n-scrollbar class="contacts__scroll" :theme-overrides="{ width: '6px' }">
            <div class="contacts__list">
              <div
                class="contacts__menu-item"
                :class="{ active: selectedId === 'new-friend' }"
                @click="onSelect('new-friend')">
                <div class="text-14px">{{ t('contacts.menu.newFriend') }}</div>
                <div class="flex items-center gap-6px text-[var(--text-secondary-color)]">
                  <n-badge v-if="newFriendBadgeCount > 0" :value="newFriendBadgeCount" :max="99" color="#ff5f5f" />
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
                  <n-badge v-if="groupNoticeBadgeCount > 0" :value="groupNoticeBadgeCount" :max="99" color="#ff5f5f" />
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
                  <span class="contacts__group-count">{{ contactsStore.enterpriseList.length }}</span>
                </div>
                <template v-if="expandedGroups.enterprise">
                  <div
                    v-if="contactsStore.enterpriseListLoading && contactsStore.enterpriseList.length === 0"
                    class="contacts__loading">
                    {{ t('contacts.loading') }}
                  </div>
                  <div v-else-if="contactsStore.enterpriseList.length === 0" class="contacts__empty">
                    {{ t('contacts.emptyEnterprises') }}
                  </div>
                  <div
                    v-else
                    v-for="enterprise in contactsStore.enterpriseList"
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
                  <span class="contacts__group-count">{{ contactsStore.groupList.length }}</span>
                </div>
                <template v-if="expandedGroups.group">
                  <div
                    v-if="contactsStore.groupListLoading && contactsStore.groupList.length === 0"
                    class="contacts__loading">
                    {{ t('contacts.loading') }}
                  </div>
                  <div v-else-if="contactsStore.groupList.length === 0" class="contacts__empty">
                    {{ t('contacts.emptyGroups') }}
                  </div>
                  <div
                    v-else
                    v-for="contact in contactsStore.groupList"
                    :key="contact.id"
                    class="contacts__entry"
                    :class="{ active: selectedId === contact.id }"
                    @click="onSelect(contact.id)">
                    <Avatar class="size-34px rounded-5px bg-#FFF" type="group" :id="contact.peerId" />
                    <div class="min-w-0 flex-1">
                      <div class="text-14px truncate">{{ contact.remark || contact.groupName }}</div>
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
                  <span class="contacts__group-count">{{ contactsStore.friendList.length }}</span>
                </div>
                <template v-if="expandedGroups.friend">
                  <div
                    v-if="contactsStore.friendListLoading && contactsStore.friendList.length === 0"
                    class="contacts__loading">
                    {{ t('contacts.loading') }}
                  </div>
                  <div v-else-if="contactsStore.friendList.length === 0" class="contacts__empty">
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
                            <EmotionIcon :url="contact.emotionUrl" :size="18" />
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
            v-else-if="activeView === 'friendProfile' && activeFriendUserId"
            :user-id="activeFriendUserId"
            @remark-updated="onFriendRemarkUpdated" />
          <div v-else class="contacts__detail-empty">
            <LinyuEmpty />
          </div>
        </div>
      </template>
    </Split>
    <CreateGroupModal v-model:show="showCreateGroupModal" />
  </div>
</template>

<script setup lang="ts">
  defineOptions({ name: 'contacts' })
  import ContactsSearchPopover from '@/components/Contacts/ContactsSearchPopover.vue'
  import ContactsEnterpriseProfile from '@/components/Contacts/detail/ContactsEnterpriseProfile.vue'
  import ContactsFriendProfile from '@/components/Contacts/detail/ContactsFriendProfile.vue'
  import ContactsGroupNotice from '@/components/Contacts/detail/ContactsGroupNotice.vue'
  import ContactsGroupProfile from '@/components/Contacts/detail/ContactsGroupProfile.vue'
  import ContactsNewFriend from '@/components/Contacts/detail/ContactsNewFriend.vue'
  import CreateGroupModal from '@/components/Modal/CreateGroupModal.vue'
  import { userBadgeApi } from '@/api'
  import { UserBadgeCode } from '@/constants/userBadge'
  import { useContactsStore } from '@/stores/user/contacts'
  import { useHomeTabStore } from '@/stores/app/homeTab'
  import type { Contact, ContactsMenuView } from '@/types/api/contacts'
  import type { UserBadge } from '@/types/api/userBadge'
  import { getNameInitial } from '@/utils/common/pinyin'
  import { createAddContactsWindow } from '@/utils/desktop/window'
  import { useI18n } from 'vue-i18n'

  type GroupKey = 'enterprise' | 'group' | 'friend'
  type FriendGroup = { letter: string; items: Contact[] }

  const { t } = useI18n()
  const homeTabStore = useHomeTabStore()
  const contactsStore = useContactsStore()

  const showCreateGroupModal = ref(false)
  const selectedId = ref('')
  const badgeList = ref<UserBadge[]>([])
  const expandedGroups = ref<Record<GroupKey, boolean>>({
    enterprise: false,
    group: false,
    friend: true
  })

  const addMenuOptions = computed(() => [
    { label: () => t('message.addMenu.addContact'), key: 'addContact' },
    { label: () => t('message.addMenu.createGroup'), key: 'createGroup' }
  ])

  const onAddMenuSelect = (key: string) => {
    switch (key) {
      case 'addContact':
        createAddContactsWindow()
        break
      case 'createGroup':
        showCreateGroupModal.value = true
        break
    }
  }

  const getContactDisplayName = (contact: Contact) => contact.remark || contact.username

  const zhPinyinCollator = new Intl.Collator('zh-Hans-CN-u-co-pinyin')

  const friendGroups = computed<FriendGroup[]>(() => {
    const sorted = [...contactsStore.friendList].sort((a, b) =>
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

  const MENU_BADGE_CODE: Record<string, string> = {
    'new-friend': UserBadgeCode.NewFriend,
    'group-notice': UserBadgeCode.GroupNotion
  }

  const getBadgeCount = (badgeCode: string) =>
    badgeList.value.find((item) => item.badgeCode === badgeCode)?.unreadCount ?? 0

  const newFriendBadgeCount = computed(() => getBadgeCount(UserBadgeCode.NewFriend))
  const groupNoticeBadgeCount = computed(() => getBadgeCount(UserBadgeCode.GroupNotion))

  const clearBadgeCount = (badgeCode: string) => {
    const index = badgeList.value.findIndex((item) => item.badgeCode === badgeCode)
    if (index === -1 || badgeList.value[index].unreadCount === 0) return
    badgeList.value[index] = { ...badgeList.value[index], unreadCount: 0 }
  }

  const fetchBadgeList = () => {
    userBadgeApi.list().then((res) => {
      if (res.code === 0 && res.data) {
        badgeList.value = res.data
        const activeBadgeCode = MENU_BADGE_CODE[selectedId.value]
        if (activeBadgeCode) clearBadgeCount(activeBadgeCode)
      } else {
        window.$message.error(res.msg)
      }
    })
  }

  onActivated(() => {
    contactsStore.fetchAll()
    fetchBadgeList()
  })

  onMounted(() => {
    contactsStore.fetchAll()
    fetchBadgeList()
  })

  const activeGroup = computed(() => contactsStore.groupList.find((item) => item.id === selectedId.value))
  const activeEnterprise = computed(() => contactsStore.enterpriseList.find((item) => item.id === selectedId.value))

  const activeContact = computed(() => contactsStore.friendList.find((item) => item.id === selectedId.value))

  const activeFriendUserId = computed(() => activeContact.value?.peerId ?? '')

  const activeView = computed<ContactsMenuView>(() => {
    if (!selectedId.value) return 'empty'
    if (selectedId.value === 'new-friend') return 'newFriend'
    if (selectedId.value === 'group-notice') return 'groupNotice'
    if (activeFriendUserId.value) return 'friendProfile'
    if (activeGroup.value) return 'groupProfile'
    if (activeEnterprise.value) return 'enterpriseProfile'
    return 'empty'
  })

  const onSelect = (id: string) => {
    selectedId.value = id
    const badgeCode = MENU_BADGE_CODE[id]
    if (badgeCode) clearBadgeCount(badgeCode)
  }

  const onFriendRemarkUpdated = (payload: { peerId: string; remark: string }) => {
    const contact = contactsStore.friendList.find((item) => item.peerId === payload.peerId)
    if (contact) contact.remark = payload.remark
  }

  const onGroupRemarkUpdated = (payload: { peerId: string; remark: string }) => {
    contactsStore.patchContactRemark(payload.peerId, payload.remark)
  }

  const toggleGroup = (group: GroupKey) => {
    expandedGroups.value[group] = !expandedGroups.value[group]
  }

  const applyContactsPayload = () => {
    const payload = homeTabStore.consumeTabPayload('contacts')
    if (!payload) return

    if (payload.selectedId) {
      onSelect(payload.selectedId)
      return
    }

    if (payload.peerId) {
      const contact = contactsStore.friendList.find((item) => item.peerId === payload.peerId)
      if (contact) {
        expandedGroups.value.friend = true
        onSelect(contact.id)
      }
    }
  }

  watch(
    () => homeTabStore.tabPayload.contacts,
    () => {
      applyContactsPayload()
    }
  )

  watch(
    () => contactsStore.friendList,
    () => {
      if (homeTabStore.tabPayload.contacts?.peerId) {
        applyContactsPayload()
      }
    }
  )
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
      box-sizing: border-box;
      overflow: hidden;
    }

    &__toolbar {
      display: flex;
      align-items: center;
      flex-shrink: 0;
      padding: 10px 15px;
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
      flex: 1;
      min-height: 0;
      margin-top: 10px;

      :deep(.n-scrollbar-container) {
        height: 100%;
      }

      :deep(.n-scrollbar-content) {
        box-sizing: border-box;
      }

      :deep(.n-scrollbar-rail--vertical) {
        right: 2px;
      }
    }

    &__list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 0 10px 10px 10px;
      box-sizing: border-box;
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
      background-color: var(--bg-content-color);
    }

    &__detail-empty {
      display: flex;
      height: 100%;
      width: 100%;
      align-items: center;
      justify-content: center;
      background-color: var(--bg-content-color);
    }
  }
</style>
