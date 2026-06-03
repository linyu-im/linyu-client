<template>
  <n-spin :show="loading" class="contacts-profile-spin">
    <n-scrollbar class="contacts-profile__scroll">
      <div class="contacts-profile">
        <div class="contacts-profile__content">
          <div class="contacts-profile__head">
            <Avatar class="size-72px rounded-10px bg-#FFF shrink-0" type="enterprise" :id="enterpriseId" />
            <div class="min-w-0 flex-1">
              <div class="contacts-profile__title-row">
                <div class="contacts-profile__title">
                  {{ enterpriseInfo?.name || '-' }}
                  <n-tag size="small" round type="info">{{ enterpriseInfo?.enterpriseTag || '-' }}</n-tag>
                </div>
                <n-button size="tiny" round>{{ t('contacts.enterprise.actions.leave') }}</n-button>
              </div>
              <div class="contacts-profile__sub">
                <span>
                  [ {{ enterpriseInfo?.location || '-' }}
                  <span class="contacts-profile__meta-sep">·</span>
                  {{ enterpriseInfo?.memberNum ?? 0 }}人 ]
                </span>
              </div>
              <div class="contacts-profile__sub contacts-profile__sub--member">
                <span class="contacts-profile__member-title">{{ infoMemberName }}</span>
                <span class="contacts-profile__meta-sep">|</span>
                <span class="contacts-profile__muted">
                  {{ infoJobTitles.length > 0 ? infoJobTitles.join(' / ') : '-' }}
                </span>
                <span class="contacts-profile__meta-sep">|</span>
                <span class="contacts-profile__joined-days">
                  {{ t('contacts.enterprise.labels.joinedDays', { days: joinedDaysText }) }}
                </span>
              </div>
            </div>
          </div>

          <n-divider class="contacts-profile__divider" />

          <div class="contacts-profile__path-row">
            <n-breadcrumb class="contacts-profile__breadcrumb" separator=">">
              <n-breadcrumb-item @click="onSelectDepartment('')">{{ enterpriseInfo?.name || '-' }}</n-breadcrumb-item>
              <n-breadcrumb-item
                v-for="department in departmentBreadcrumb"
                :key="department.id"
                @click="onSelectDepartment(department.id)">
                {{ department.name }}
              </n-breadcrumb-item>
            </n-breadcrumb>

            <div class="contacts-profile__toolbar">
              <a href="javascript:void(0)" class="contacts-profile__invite-link">
                {{ t('contacts.enterprise.actions.inviteMember') }}
              </a>
            </div>
          </div>

          <div class="contacts-profile__departments">
            <div
              v-for="department in visibleDepartments"
              :key="department.id"
              class="contacts-profile__department"
              :class="{ active: currentDepartmentId === department.id }"
              @click="onSelectDepartment(department.id)">
              <div class="contacts-profile__department-icon">
                <svg class="size-20px text-[var(--primary-color)] shrink-0">
                  <use href="#group"></use>
                </svg>
              </div>
              <div class="truncate">{{ department.name }}</div>
              <span class="contacts-profile__muted">({{ department.memberNum }})</span>
            </div>
          </div>

          <div class="contacts-profile__members">
            <div v-for="member in visibleMembers" :key="member.id" class="contacts-profile__member">
              <Avatar class="size-42px rounded-6px bg-#FFF shrink-0" :id="member.userId" />
              <div class="min-w-0 flex-1 flex flex-col justify-center gap-4px">
                <div class="contacts-profile__member-name">
                  <span class="truncate">{{ member.memberName || member.username || '-' }}</span>
                  <ColorTag
                    v-if="getRoleTagLabel(member.roles)"
                    :label="getRoleTagLabel(member.roles)"
                    :color="getRoleTagColor(member.roles)" />
                </div>
                <div class="contacts-profile__muted">
                  {{ member.jobTitle }}
                </div>
              </div>
              <div class="contacts-profile__member-actions">
                <n-button size="tiny" round>{{ t('contacts.actions.sendMessage') }}</n-button>
                <n-button size="tiny" round type="error" ghost>
                  {{ t('contacts.enterprise.actions.removeMember') }}
                </n-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </n-scrollbar>
  </n-spin>
</template>

<script setup lang="ts">
  import ColorTag from '@/components/ColorTag.vue'
  import { enterpriseApi } from '@/api'
  import {
    ENTERPRISE_MEMBER_ROLE_COLORS,
    hasEnterpriseMemberRoleTag,
    isEnterpriseMemberRole
  } from '@/constants/enterprise'
  import type { EnterprisInfo } from '@/types/api/enterprise'
  import type { EnterpriseDepartment } from '@/types/api/enterpriseDepartment'
  import type { EnterpriseMember } from '@/types/api/enterpriseMember'
  import { useI18n } from 'vue-i18n'

  const props = defineProps<{
    enterpriseId: string
  }>()

  const { t } = useI18n()

  const loading = ref(false)
  const enterpriseInfo = ref<EnterprisInfo | null>(null)
  const departments = ref<EnterpriseDepartment[]>([])
  const currentDepartmentId = ref('')

  const fetchEnterpriseProfile = async () => {
    if (!props.enterpriseId) return

    loading.value = true
    enterpriseInfo.value = null
    departments.value = []
    currentDepartmentId.value = ''

    try {
      const [infoRes, deptRes] = await Promise.all([
        enterpriseApi.getEnterpriseInfo({ enterpriseId: props.enterpriseId }),
        enterpriseApi.getEnterpriseDepartment({ enterpriseId: props.enterpriseId })
      ])

      if (infoRes.code === 0 && infoRes.data) {
        enterpriseInfo.value = infoRes.data
      } else {
        window.$message.error(infoRes.msg)
      }

      if (deptRes.code === 0 && deptRes.data) {
        departments.value = deptRes.data
      } else {
        window.$message.error(deptRes.msg)
      }
    } finally {
      loading.value = false
    }
  }

  watch(
    () => props.enterpriseId,
    () => {
      void fetchEnterpriseProfile()
    },
    { immediate: true }
  )

  const currentDepartment = computed(() => departments.value.find((item) => item.id === currentDepartmentId.value))

  const departmentBreadcrumb = computed(() => {
    const byId = new Map(departments.value.map((item) => [item.id, item] as const))
    const chain: EnterpriseDepartment[] = []
    const visited = new Set<string>()
    let cursor: EnterpriseDepartment | undefined = currentDepartment.value

    while (cursor && !visited.has(cursor.id)) {
      chain.unshift(cursor)
      visited.add(cursor.id)
      if (!cursor.parentId) break
      cursor = byId.get(cursor.parentId)
    }

    return chain
  })

  const infoMembers = computed(() => enterpriseInfo.value?.userEnterpriseMembers || [])

  const infoMemberName = computed(() => infoMembers.value[0]?.memberName || infoMembers.value[0]?.username || '-')

  const infoJobTitles = computed(() => {
    const titles = infoMembers.value.map((item) => item.jobTitle?.trim()).filter((item): item is string => !!item)
    return [...new Set(titles)]
  })

  const visibleDepartments = computed(() =>
    departments.value.filter((item) => {
      if (!currentDepartmentId.value) return !item.parentId
      return item.parentId === currentDepartmentId.value
    })
  )

  const visibleMembers = computed<EnterpriseMember[]>(() => {
    const allMembers = enterpriseInfo.value?.userEnterpriseMembers || []
    const department = currentDepartment.value
    if (!department) {
      return allMembers.filter((item) => !item.departmentId && !item.departmentName)
    }

    if (department.members?.length) return department.members

    return allMembers.filter((item) => item.departmentId === department.id || item.departmentName === department.name)
  })

  const joinedDaysText = computed(() => {
    const validTimes = infoMembers.value
      .map((item) => item.joinedAt?.trim())
      .filter((item): item is string => !!item)
      .map((item) => new Date(item.replace(' ', 'T')).getTime())
      .filter((time) => Number.isFinite(time))

    if (validTimes.length === 0) return '-'

    const earliestTime = Math.min(...validTimes)
    const diffMs = Date.now() - earliestTime
    return Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24))).toString()
  })

  const onSelectDepartment = (id: string) => {
    currentDepartmentId.value = id
  }

  const getRoleTagLabel = (role?: string) => {
    if (!hasEnterpriseMemberRoleTag(role)) return ''
    return t(`contacts.enterprise.roles.${role}`)
  }

  const getRoleTagColor = (role?: string) => {
    if (!role || !isEnterpriseMemberRole(role)) return ''
    return ENTERPRISE_MEMBER_ROLE_COLORS[role] || ''
  }
</script>

<style scoped lang="scss">
  .contacts-profile-spin {
    width: 100%;
    min-width: 0;
    height: 100%;
    overflow: hidden;

    :deep(.n-spin-container),
    :deep(.n-spin-content) {
      width: 100%;
      min-width: 0;
      height: 100%;
    }
  }

  .contacts-profile__scroll {
    height: 100%;

    :deep(.n-scrollbar-container) {
      height: 100%;
    }
  }

  .contacts-profile {
    --row-height: 62px;

    width: 100%;
    min-width: 0;
    max-width: 860px;
    margin: 0 auto;
    box-sizing: border-box;

    &__content {
      padding: 22px 24px 20px;
      box-sizing: border-box;
    }

    &__head {
      display: flex;
      gap: 16px;
      align-items: flex-start;
      min-width: 0;
    }

    &__title-row {
      display: flex;
      gap: 12px;
      align-items: center;
      justify-content: space-between;
    }

    &__title {
      font-size: 22px;
      font-weight: 600;
      line-height: 1.15;
      min-width: 0;
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }

    &__count {
      margin-left: 8px;
      color: var(--text-secondary-color);
      font-weight: 400;
    }

    &__sub {
      margin-top: 8px;
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      color: var(--text-secondary-color);
      font-size: 12px;
    }

    &__sub--member {
      margin-top: 10px;
      gap: 8px;
      color: var(--text-secondary-color);
    }

    &__member-title {
      color: var(--text-secondary-color);
      font-size: 12px;
      line-height: 1.3;
    }

    &__meta-sep {
      color: color-mix(in srgb, var(--text-secondary-color) 75%, transparent);
      user-select: none;
    }

    &__muted {
      color: var(--text-secondary-color);
      font-size: 12px;
    }

    &__joined-days {
      color: var(--primary-color);
      font-size: 12px;
      user-select: none;
    }

    &__divider {
      margin: 14px 0 12px;
    }

    &__path-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      min-width: 0;
      flex-wrap: wrap;
    }

    &__breadcrumb {
      display: flex;
      align-items: center;
      min-width: 0;
      flex: 1;

      :deep(.n-breadcrumb-item:last-child .n-breadcrumb-item__link),
      :deep(.n-breadcrumb-item:last-child .n-breadcrumb-item__link:hover) {
        color: var(--text-muted-color);
      }
    }

    &__crumb-sep {
      color: var(--text-secondary-color);
      font-size: 20px;
      font-weight: 500;
    }

    &__toolbar {
      display: flex;
      justify-content: flex-end;
      flex-shrink: 0;
    }

    &__invite-link {
      color: var(--primary-color);
      text-decoration: underline;
      font-size: 12px;
      cursor: pointer;
    }

    &__departments {
      display: flex;
      flex-direction: column;
    }

    &__department {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px;
      min-height: var(--row-height);
      box-sizing: border-box;
      border-radius: 8px;
      cursor: pointer;
      border: 1px solid transparent;
      user-select: none;
      background: transparent;
      font-size: 16px;

      &:hover {
        background: color-mix(in srgb, var(--card-bg-color) 60%, transparent);
      }
    }

    &__department-icon {
      width: 42px;
      height: 42px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: color-mix(in srgb, var(--primary-color) 15%, transparent);
    }

    &__members {
      display: flex;
      flex-direction: column;
    }

    &__member {
      display: flex;
      align-items: center;
      padding: 10px;
      min-height: var(--row-height);
      box-sizing: border-box;
      border-radius: 8px;
      border: 1px solid transparent;
      background: transparent;
      cursor: pointer;
      gap: 10px;

      &:hover {
        background: color-mix(in srgb, var(--card-bg-color) 60%, transparent);
      }

      &:hover .contacts-profile__member-actions {
        opacity: 1;
        visibility: visible;
        transform: translateX(0);
      }
    }

    &__member-name {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      font-size: 16px;
    }

    &__member-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: nowrap;
      opacity: 0;
      visibility: hidden;
      transform: translateX(4px);
      transition:
        opacity 0.16s ease,
        transform 0.16s ease,
        visibility 0.16s ease;
    }
  }
</style>
