<template>
  <div class="settings-page">
    <SettingCard>
      <div class="settings-page__profile">
        <div class="settings-page__profile-main">
          <Avatar :id="userStore.userInfo.id" class="settings-page__avatar" :size="48" round />
          <div class="settings-page__profile-info">
            <div class="settings-page__name">{{ userStore.userInfo.username }}</div>
            <div class="settings-page__sub">{{ userStore.userInfo.account }}</div>
          </div>
        </div>
      </div>
      <section class="settings-page__devices">
        <div class="settings-page__section-label">{{ t('settings.account.loggedDevices') }}</div>

        <div v-if="hasDesktopDevices" class="settings-page__devices-group">
          <div class="settings-page__devices-group-title">{{ t('settings.account.desktopDevices') }}</div>
          <div v-if="currentDesktopDevice" class="settings-page__device-card">
            <div class="settings-page__device-icon" aria-hidden="true">
              <svg class="settings-page__device-icon-svg" viewBox="0 0 24 24">
                <use href="#computer"></use>
              </svg>
            </div>
            <div class="settings-page__device-info">
              <div class="settings-page__device-name">{{ currentDesktopDevice.name }}</div>
              <div class="settings-page__device-platform">{{ getPlatformLabel(currentDesktopDevice.platform) }}</div>
            </div>
            <span class="settings-page__device-current">{{ t('settings.account.currentDevice') }}</span>
            <n-button size="small" @click="onLogout">{{ t('settings.account.deviceLogout') }}</n-button>
          </div>
          <div v-for="device in otherDesktopDevices" :key="device.id" class="settings-page__device-card">
            <div class="settings-page__device-icon" aria-hidden="true">
              <svg class="settings-page__device-icon-svg" viewBox="0 0 24 24">
                <use href="#computer"></use>
              </svg>
            </div>
            <div class="settings-page__device-info">
              <div class="settings-page__device-name">{{ device.name }}</div>
              <div class="settings-page__device-platform">{{ getPlatformLabel(device.platform) }}</div>
            </div>
            <n-button size="small" @click="onDeviceLogout(device.id)">
              {{ t('settings.account.deviceLogout') }}
            </n-button>
          </div>
        </div>

        <div v-if="currentMobileDevice" class="settings-page__devices-current">
          <div class="settings-page__device-card">
            <div class="settings-page__device-icon" aria-hidden="true">
              <svg class="settings-page__device-icon-svg" viewBox="0 0 24 24">
                <use href="#phone"></use>
              </svg>
            </div>
            <div class="settings-page__device-info">
              <div class="settings-page__device-name">{{ currentMobileDevice.name }}</div>
              <div class="settings-page__device-platform">{{ getPlatformLabel(currentMobileDevice.platform) }}</div>
            </div>
            <span class="settings-page__device-current">{{ t('settings.account.currentDevice') }}</span>
            <n-button size="small" @click="onLogout">{{ t('settings.account.deviceLogout') }}</n-button>
          </div>
        </div>

        <div v-if="hasMobileDevices" class="settings-page__devices-group">
          <div class="settings-page__devices-group-title">{{ t('settings.account.mobileDevices') }}</div>
          <div v-for="device in mobileDevices" :key="device.id" class="settings-page__device-card">
            <div class="settings-page__device-icon" aria-hidden="true">
              <svg class="settings-page__device-icon-svg" viewBox="0 0 24 24">
                <use href="#smartphone"></use>
              </svg>
            </div>
            <div class="settings-page__device-info">
              <div class="settings-page__device-name">{{ device.name }}</div>
              <div class="settings-page__device-platform">{{ getPlatformLabel(device.platform) }}</div>
            </div>
            <n-button size="small" @click="onDeviceLogout(device.id)">
              {{ t('settings.account.deviceLogout') }}
            </n-button>
          </div>
        </div>
      </section>
      <SettingRow :label="t('settings.account.keepHistory')">
        <n-switch v-model:value="appSettings.account.keepChatHistory" />
      </SettingRow>
    </SettingCard>

    <SettingCard>
      <SettingRow :label="t('settings.account.storage')">
        <n-button size="small" @click="onTodo">{{ t('settings.account.manage') }}</n-button>
      </SettingRow>
      <SettingRow :label="t('settings.account.storagePath')">
        <template #desc>
          <span class="settings-page__path" :title="storagePath">{{ storagePath }}</span>
        </template>
        <n-button size="small" @click="onTodo">{{ t('settings.account.change') }}</n-button>
      </SettingRow>
      <div class="settings-page__footer">
        <n-button size="small" @click="onTodo">{{ t('settings.account.clearHistory') }}</n-button>
      </div>
    </SettingCard>
  </div>
</template>

<script setup lang="ts">
  import { onMounted, ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import Avatar from '@/components/Avatar.vue'
  import { useUserStore } from '@/stores/user'
  import { useAppSettingsStore } from '@/stores/appSettings'
  import { closeCurrentWindow } from '@/utils/window'
  import { resolveMessageStorageRoot } from '@/utils/messageFileSave'
  import SettingCard from '@/components/Set/SettingCard.vue'
  import SettingRow from '@/components/Set/SettingRow.vue'

  type DevicePlatform = 'android' | 'ios' | 'windows' | 'macos'
  type DeviceType = 'mobile' | 'desktop'

  interface LoggedDevice {
    id: string
    name: string
    platform: DevicePlatform
    type: DeviceType
    isCurrent?: boolean
  }

  const { t } = useI18n()
  const userStore = useUserStore()
  const appSettings = useAppSettingsStore()

  const storagePath = ref('')

  onMounted(() => {
    resolveMessageStorageRoot(appSettings.storage.path).then((path) => {
      storagePath.value = path
    })
  })

  const devices = ref<LoggedDevice[]>([
    { id: 'mobile-1', name: 'BKQ-AN80', platform: 'android', type: 'mobile' },
    { id: 'desktop-1', name: 'Windows PC', platform: 'windows', type: 'desktop', isCurrent: true }
  ])

  const currentMobileDevice = computed(() => devices.value.find((d) => d.isCurrent && d.type === 'mobile'))
  const currentDesktopDevice = computed(() => devices.value.find((d) => d.isCurrent && d.type === 'desktop'))
  const hasMobileDevices = computed(() => devices.value.some((d) => d.type === 'mobile'))
  const hasDesktopDevices = computed(() => devices.value.some((d) => d.type === 'desktop'))
  const mobileDevices = computed(() => devices.value.filter((d) => d.type === 'mobile' && !d.isCurrent))
  const otherDesktopDevices = computed(() => devices.value.filter((d) => d.type === 'desktop' && !d.isCurrent))

  const platformLabelKeys: Record<DevicePlatform, string> = {
    android: 'settings.account.platformAndroid',
    ios: 'settings.account.platformIos',
    windows: 'settings.account.platformWindows',
    macos: 'settings.account.platformMacos'
  }

  const getPlatformLabel = (platform: DevicePlatform) => t(platformLabelKeys[platform])

  const onTodo = () => {
    window.$message?.info(t('settings.todo'))
  }

  const onDeviceLogout = (deviceId: string) => {
    devices.value = devices.value.filter((d) => d.id !== deviceId)
    window.$message?.success(t('settings.account.deviceLogoutSuccess'))
  }

  const onLogout = () => {
    userStore.removeAuthInfo()
    closeCurrentWindow()
    window.$message?.success(t('settings.account.logoutSuccess'))
  }
</script>

<style scoped lang="scss">
  .settings-page {
    &__profile {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 16px 18px 10px;
    }

    &__profile-main {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }

    &__avatar {
      flex-shrink: 0;
    }

    &__name {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-color);
    }

    &__sub {
      margin-top: 2px;
      font-size: 12px;
      color: var(--text-secondary-color);
    }

    &__devices {
      padding: 14px 18px;
      border-top: 1px solid var(--divider-color);
    }

    &__section-label {
      font-size: 14px;
      color: var(--text-color);
      line-height: 1.4;
    }

    &__devices-current {
      margin-top: 12px;
    }

    &__devices-group {
      margin-top: 12px;

      & + & {
        margin-top: 14px;
      }
    }

    &__devices-group-title {
      margin-bottom: 8px;
      font-size: 12px;
      color: var(--text-secondary-color);
      line-height: 1.4;
    }

    &__device-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 8px;
      border: 1px solid color-mix(in srgb, var(--border-color) 55%, transparent);
      background-color: color-mix(in srgb, var(--input-soft-bg) 70%, transparent);

      & + & {
        margin-top: 8px;
      }
    }

    &__device-icon {
      flex: 0 0 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      width: 40px;
      height: 40px;
      border-radius: 6px;
      background-color: color-mix(in srgb, var(--bg-muted-color) 80%, var(--bg-secondary-color));
      border: 1px solid color-mix(in srgb, var(--border-color) 40%, transparent);
    }

    &__device-icon-svg {
      flex: 0 0 auto;
      display: block;
      width: 20px;
      height: 20px;
      color: var(--text-secondary-color);
    }

    &__device-info {
      flex: 1;
      min-width: 0;
    }

    &__device-name {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-color);
      line-height: 1.35;
    }

    &__device-platform {
      margin-top: 2px;
      font-size: 12px;
      color: var(--text-secondary-color);
      line-height: 1.35;
    }

    &__device-current {
      flex-shrink: 0;
      font-size: 12px;
      color: var(--text-secondary-color);
      white-space: nowrap;
    }

    &__path {
      display: block;
      word-break: break-all;
      line-height: 1.45;
    }

    &__footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding: 12px 18px;
      border-top: 1px solid var(--divider-color);
    }
  }
</style>
