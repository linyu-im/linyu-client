<template>
  <div class="settings-page">
    <div class="settings-page__main">
      <SettingCard>
        <SettingRow :label="t('settings.about.version')" :desc="appVersion || '-'" :border="false">
          <n-badge :show="hasUpdateBadge" dot :color="'var(--red)'" :offset="[-2, 2]">
            <n-button size="small" :loading="checking" @click="onCheckUpdate">
              {{ t('settings.about.checkUpdate') }}
            </n-button>
          </n-badge>
        </SettingRow>
        <SettingRow :label="t('settings.about.website')">
          <n-button size="small" @click="onOpenWebsite">{{ t('settings.about.viewWebsite') }}</n-button>
        </SettingRow>
      </SettingCard>
    </div>

    <footer class="settings-page__footer">
      <div class="settings-page__footer-links">
        <button type="button" class="settings-page__link" @click="onOpenTerms">
          {{ t('settings.about.terms') }}
        </button>
        <span class="settings-page__sep">|</span>
        <button type="button" class="settings-page__link" @click="onOpenPrivacy">
          {{ t('settings.about.privacy') }}
        </button>
        <span class="settings-page__sep">|</span>
        <button type="button" class="settings-page__link" @click="onOpenFeedback">
          {{ t('settings.about.feedback') }}
        </button>
      </div>

      <div class="settings-page__copyright">
        <p>{{ t('settings.about.copyright') }}</p>
        <p>{{ t('settings.about.rights') }}</p>
      </div>
    </footer>

    <UpdateModal v-model:show="showUpdateModal" />
  </div>
</template>

<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import { useI18n } from 'vue-i18n'
  import SettingCard from '@/components/Set/SettingCard.vue'
  import SettingRow from '@/components/Set/SettingRow.vue'
  import UpdateModal from '@/components/Modal/UpdateModal.vue'
  import { OFFICIAL_WEBSITE_URL, PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from '@/constants/network'
  import { useAppUpdateStore } from '@/stores/app/appUpdate'
  import { getAppVersion } from '@/utils/app/version'
  import { openUrl } from '@/utils/desktop/open'
  import { createFeedbackWinodw } from '@/utils/desktop/window'

  const { t } = useI18n()
  const appUpdateStore = useAppUpdateStore()
  const { checking, needUpdate, needForce } = storeToRefs(appUpdateStore)

  const appVersion = ref('')
  const showUpdateModal = ref(false)
  const hasUpdateBadge = computed(() => needUpdate.value || needForce.value)

  const onCheckUpdate = () => {
    appUpdateStore
      .check()
      .then((info) => {
        if (info.needUpdate || info.needForce) {
          showUpdateModal.value = true
        } else {
          window.$message?.success(t('update.latest'))
        }
      })
      .catch(() => {
        window.$message?.error(t('update.checkFailed'))
      })
  }

  const onOpenWebsite = () => {
    void openUrl(OFFICIAL_WEBSITE_URL)
  }

  const onOpenTerms = () => {
    void openUrl(TERMS_OF_SERVICE_URL)
  }

  const onOpenPrivacy = () => {
    void openUrl(PRIVACY_POLICY_URL)
  }

  const onOpenFeedback = () => {
    void createFeedbackWinodw()
  }

  onMounted(() => {
    getAppVersion().then((version) => {
      appVersion.value = version
    })
  })
</script>

<style scoped lang="scss">
  .settings-page {
    display: flex;
    flex-direction: column;
    min-height: calc(100vh - 66px);
    box-sizing: border-box;

    &__main {
      flex: 1 0 auto;
    }

    &__footer {
      flex-shrink: 0;
      margin-top: auto;
      padding-top: 32px;
      padding-bottom: 8px;
    }

    &__footer-links {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 4px;
      font-size: 12px;
    }

    &__link {
      padding: 0;
      border: none;
      background: transparent;
      color: var(--text-muted-color);
      cursor: pointer;
      transition: color 0.15s ease;

      &:hover {
        color: var(--primary-color);
      }
    }

    &__sep {
      color: var(--text-muted-color);
      opacity: 0.6;
    }

    &__copyright {
      margin-top: 12px;
      text-align: center;
      font-size: 12px;
      color: var(--text-muted-color);
      line-height: 1.6;

      p {
        margin: 0;
      }
    }
  }
</style>
