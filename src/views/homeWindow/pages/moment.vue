<template>
  <div class="moment">
    <div class="moment__body">
      <aside class="moment__sider">
        <MomentFloatNav v-model:active-filter="activeFilter" @refresh="onRefresh" @compose="showCompose = true" />
      </aside>

      <MomentFeed
        ref="feedRef"
        :cover-user-id="userStore.userInfo.id"
        :view-user-id="feedViewUserId"
        :enabled="activeFilter !== 'special'"
        @settings="onSettings" />
    </div>

    <MomentComposeModal
      v-model:show="showCompose"
      :user-id="userStore.userInfo.id"
      :username="userStore.userInfo.username"
      @success="onComposeSuccess" />

    <MomentExpireDaysModal v-model:show="showExpireDays" :user-id="userStore.userInfo.id" />
  </div>
</template>

<script setup lang="ts">
  defineOptions({ name: 'moment' })
  import MomentFeed from '@/components/Moment/MomentFeed.vue'
  import MomentFloatNav from '@/components/Moment/MomentFloatNav.vue'
  import MomentComposeModal from '@/components/Modal/MomentComposeModal.vue'
  import MomentExpireDaysModal from '@/components/Modal/MomentExpireDaysModal.vue'
  import { useUserStore } from '@/stores/user/user'
  import type { MomentFilter } from '@/types/api/moment'
  import { useI18n } from 'vue-i18n'

  const { t } = useI18n()
  const userStore = useUserStore()

  const activeFilter = ref<MomentFilter>('all')
  const showCompose = ref(false)
  const showExpireDays = ref(false)
  const feedRef = ref<InstanceType<typeof MomentFeed> | null>(null)

  const feedViewUserId = computed(() => {
    if (activeFilter.value === 'mine') return userStore.userInfo.id
    return undefined
  })

  const onComposeSuccess = () => {
    feedRef.value?.refresh()
  }

  const onRefresh = () => {
    feedRef.value?.refresh()?.then(() => {
      window.$message.success(t('moment.refreshed'))
    })
  }

  const onSettings = () => {
    showExpireDays.value = true
  }

  onActivated(() => {
    feedRef.value?.refresh()
  })
</script>

<style scoped lang="scss">
  .moment {
    position: relative;
    height: 100%;
    overflow: hidden;
    background-color: var(--bg-content-color);
    display: flex;
    justify-content: center;

    &::before {
      content: '';
      position: absolute;
      top: -120px;
      right: -120px;
      width: 400px;
      height: 400px;
      background: radial-gradient(circle, rgba(var(--primary-rgb), 0.08) 0%, transparent 70%);
      pointer-events: none;
      z-index: 0;
    }

    &__body {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: stretch;
      width: 100%;
      max-width: min(780px, 100%);
      height: 100%;
      padding: 0 clamp(8px, 2vw, 16px);
      box-sizing: border-box;
    }

    &__sider {
      flex: 0 0 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding-right: 20px;
    }
  }

  @media (max-width: 640px) {
    .moment__body {
      max-width: 100%;
      padding: 0 8px;
    }

    .moment__sider {
      flex: 0 0 40px;
      padding-right: 4px;
    }
  }
</style>
