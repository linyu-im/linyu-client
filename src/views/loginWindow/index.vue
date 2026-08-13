<template>
  <div class="login">
    <!-- 顶部操作栏 -->
    <ToolBar class="login__toolbar">
      <div class="flex gap-5px items-center">
        <svg class="size-24px pointer-events-none">
          <use href="#linyu"></use>
        </svg>
        <div
          class="text-14px font-bold select-none bg-gradient-to-r from-[var(--primary-color)] to-[var(--primary-strong-color)] bg-clip-text text-transparent">
          Linyu
        </div>
      </div>
      <div class="flex">
        <n-dropdown :options="setttngsOptions" trigger="click">
          <SvgIconButton href="#settings" />
        </n-dropdown>
        <SvgIconButton href="#minimize" @click="minimizeCurrentWindow" />
        <SvgIconButton href="#close" hover-bg="var(--red)" hover-color="#FFF" @click="exitApp" />
      </div>
    </ToolBar>

    <!-- 内容部分 -->
    <div class="login__content">
      <template v-if="versionChecking">
        <div class="flex flex-1 flex-col items-center justify-center gap-12px select-none">
          <n-spin size="medium" />
          <div class="text-12px text-[var(--text-secondary-color)]">{{ t('update.checking') }}</div>
        </div>
      </template>
      <template v-else-if="showNetworkSettings">
        <div class="login__network">
          <div class="login__network-header">
            <SvgIconButton href="#left-arrow" @click="onCancelNetworkSettings" />
            <div class="login__network-title">{{ t('login.networkSettings.title') }}</div>
            <div class="size-28px" />
          </div>
          <div class="login__network-form">
            <div class="login__network-field">
              <div class="login__network-label">{{ t('login.networkSettings.serviceUrl') }}</div>
              <n-input
                v-model:value="networkServiceUrlDraft"
                clearable
                :placeholder="t('login.networkSettings.serviceUrlPlaceholder')" />
            </div>
            <div class="login__network-actions">
              <n-button type="primary" @click="onConfirmNetworkSettings">
                {{ t('login.networkSettings.confirm') }}
              </n-button>
              <n-button class="login__network-cancel" @click="onCancelNetworkSettings">
                {{ t('login.networkSettings.cancel') }}
              </n-button>
            </div>
          </div>
        </div>
      </template>
      <template v-else>
        <div class="flex justify-center m-t-40px m-b-40px select-none">
          <div class="login__avatar-wrapper">
            <Avatar v-if="currentAccountUserId" :id="currentAccountUserId" :size="72" round />
            <n-avatar v-else class="w-full h-full bg-#FFF" fallback-src="/avatar.png" src="/avatar.png" />
          </div>
        </div>

        <!-- 账号密码 -->
        <div class="flex flex-col gap-10px">
          <div ref="accountInputRef" class="login__account-input">
            <n-input type="text" v-model:value="accountInfo.account" :placeholder="t('login.input.account')" clearable>
              <template v-if="loginHistoryStore.accounts.length" #suffix>
                <div class="n-input__eye" @click.stop="toggleAccountHistory">
                  <i class="n-base-icon">
                    <svg
                      class="login__account-chevron size-16px"
                      :class="{ 'login__account-chevron--open': accountHistoryVisible }">
                      <use href="#left-arrow" />
                    </svg>
                  </i>
                </div>
              </template>
            </n-input>
            <div v-if="accountHistoryVisible && loginHistoryStore.accounts.length" class="login__account-history">
              <div class="login__account-history__scroll">
                <div
                  v-for="item in loginHistoryStore.accounts"
                  :key="item.account"
                  class="login__account-history__item"
                  @click="onSelectHistoryAccount(item)">
                  <Avatar :id="item.userId" :size="28" round />
                  <span class="login__account-history__text">{{ item.account }}</span>
                  <button
                    type="button"
                    class="login__account-history__remove"
                    @click.stop="onRemoveHistoryAccount(item.account)">
                    <svg class="size-12px"><use href="#close" /></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <n-input
            type="password"
            :show-password-on="passwordFreeMode ? undefined : 'click'"
            :readonly="passwordFreeMode"
            :value="accountInfo.password"
            :placeholder="t('login.input.password')"
            clearable
            @update:value="onPasswordUpdate" />
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <n-checkbox size="small" :checked="keepLoginChecked" @update:checked="onKeepLoginChange" />
              <span class="text-12px text-[var(--text-secondary-color)] m-l-5px">{{ t('login.keepLogin') }}</span>
            </div>
            <span class="text-12px color-[var(--primary-color)] cursor-pointer" @click="onForgotPassword">
              {{ t('login.forgotPassword') }}
            </span>
          </div>
        </div>

        <!-- 登录和协议 -->
        <div class="m-t-25px">
          <n-button
            class="login__btn-gradient"
            type="primary"
            :loading="loginLoading"
            :disabled="loginButtonDisabled"
            @click="onAccountLogin">
            {{ loginText }}
          </n-button>
          <div class="flex gap-5px m-t-10px justify-center items-center select-none">
            <n-checkbox v-model:checked="termsChecked" size="small" />
            <i18n-t
              scope="global"
              keypath="login.terms.text1"
              tag="div"
              class="inline text-12px text-[var(--text-secondary-color)]">
              <template #text2>
                <span class="color-[var(--primary-color)] cursor-pointer">
                  {{ t('login.terms.text2') }}
                </span>
              </template>
              <template #text3>
                <span class="color-[var(--primary-color)] cursor-pointer">
                  {{ t('login.terms.text3') }}
                </span>
              </template>
            </i18n-t>
          </div>
        </div>

        <!-- 其他登录方式 -->
        <div class="m-t-25px flex flex-col flex-1">
          <n-divider class="text-12px text-[var(--text-secondary-color)] select-none !m-0">
            <span class="font-400">{{ t('login.other.text') }}</span>
          </n-divider>
          <div class="flex flex-col justify-center items-center flex-1">
            <div class="flex gap-20px">
              <n-tooltip trigger="hover">
                <template #trigger>
                  <n-button circle size="large" class="other-login__button" @click="() => onOauth2Login('scan')">
                    <template #icon>
                      <svg class="size-20px color-[var(--primary-color)]"><use href="#scanqr" /></svg>
                    </template>
                  </n-button>
                </template>
                {{ t('login.other.scan') }}
              </n-tooltip>
              <n-tooltip trigger="hover">
                <template #trigger>
                  <n-button circle size="large" class="other-login__button" @click="() => onOauth2Login('github')">
                    <template #icon>
                      <svg class="size-20px"><use href="#github" /></svg>
                    </template>
                  </n-button>
                </template>
                {{ t('login.other.github') }}
              </n-tooltip>
              <n-tooltip trigger="hover">
                <template #trigger>
                  <n-button circle size="large" class="other-login__button" @click="() => onOauth2Login('gitee')">
                    <template #icon>
                      <svg class="size-18px color-[#C71D23]"><use href="#gitee" /></svg>
                    </template>
                  </n-button>
                </template>
                {{ t('login.other.gitee') }}
              </n-tooltip>
            </div>
            <div class="text-12px text-[var(--text-secondary-color)] m-t-20px">
              <span>{{ t('login.register.tip') }}</span>
              <span class="color-[var(--primary-color)] cursor-pointer" @click="onGoRegister">
                {{ t('login.register.text') }}
              </span>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- 底部内容 -->
    <div data-tauri-drag-region class="login__footer">
      <div>{{ t('login.footer.provider') }}</div>
      <div class="cursor-pointer">{{ t('login.footer.support') }}</div>
    </div>

    <ForceUpdatePanel v-model:show="showForceUpdate" />
  </div>
</template>

<script setup lang="tsx">
  import SvgIconButton from '@/components/SvgIconButton.vue'
  import Avatar from '@/components/Avatar.vue'
  import ForceUpdatePanel from '@/components/Modal/ForceUpdatePanel.vue'
  import { authApi, oauth2Api } from '@/api'
  import { useAppUpdateStore } from '@/stores/app/appUpdate'
  import {
    closeWebviewWindow,
    createChangePwdWindow,
    createHomeWinodw,
    createRegisterWindow,
    exitApp,
    hideCurrentWindow,
    minimizeCurrentWindow,
    ShowCurrentWindow
  } from '@/utils/desktop/window'
  import { CHANGE_PWD_WINDOW_LABEL, REGISTER_WINDOW_LABEL } from '@/constants/window'
  import { useI18n } from 'vue-i18n'
  import { useUserStore } from '@/stores/user/user'
  import { useLoginHistoryStore, type LoginHistoryItem } from '@/stores/user/loginHistory'
  import { invoke } from '@tauri-apps/api/core'
  import { openUrl } from '@/utils/desktop/open'
  import { once } from '@tauri-apps/api/event'
  import { OAuth2LoginPayload } from '@/types/cmd/login'
  import { LoginResult } from '@/types/api/auth'
  import { useSystemSettingStore } from '@/stores/app/systemSetting'
  import { isValidServiceUrl } from '@/constants/network'
  import { LangEnum, ThemePatternEnum } from '@/constants/system'
  import { onClickOutside } from '@vueuse/core'
  import { computed, nextTick, onMounted, ref, watch, watchEffect } from 'vue'

  const FAKE_PASSWORD = '********'

  const { t } = useI18n()
  const userStore = useUserStore()
  const loginHistoryStore = useLoginHistoryStore()
  const systemSetting = useSystemSettingStore()
  const appUpdateStore = useAppUpdateStore()
  const showForceUpdate = ref(false)
  const versionChecking = ref(true)

  const accountInputRef = ref<HTMLElement>()
  const accountHistoryVisible = ref(false)
  const showNetworkSettings = ref(false)
  const networkServiceUrlDraft = ref('')

  const accountInfo = ref({ account: '', password: '' })
  const loginLoading = ref(false)
  const loginButtonDisabled = ref(true)
  const termsChecked = ref(false)
  const keepLoginChecked = ref(false)
  const passwordFreeMode = ref(false)

  const setttngsOptions = [
    {
      label: () => t('login.settings.theme.text'),
      key: 'pattern',
      children: [
        {
          label: () => renderThemeColorOptions(ThemePatternEnum.LIGHT, t('login.settings.theme.light')),
          key: 'light',
          props: {
            onClick: () => onSetThemeColor(ThemePatternEnum.LIGHT)
          }
        },
        {
          label: () => renderThemeColorOptions(ThemePatternEnum.DARK, t('login.settings.theme.dark')),
          key: 'dark',
          props: {
            onClick: () => onSetThemeColor(ThemePatternEnum.DARK)
          }
        },
        {
          label: () => renderThemeColorOptions(ThemePatternEnum.OS, t('login.settings.theme.system')),
          key: 'system',
          props: {
            onClick: () => onSetThemeColor(ThemePatternEnum.OS)
          }
        }
      ]
    },
    {
      label: () => t('login.settings.language'),
      key: 'language',
      children: [
        {
          label: () => renderLanguageOptions(LangEnum.ZH, '中文'),
          key: 'zh',
          props: {
            onClick: () => onSetLanguage(LangEnum.ZH)
          }
        },
        {
          label: () => renderLanguageOptions(LangEnum.EN, 'English'),
          key: 'en',
          props: {
            onClick: () => onSetLanguage(LangEnum.EN)
          }
        }
      ]
    },
    {
      label: () => t('login.settings.network'),
      key: 'network',
      props: {
        onClick: () => onOpenNetworkSettings()
      }
    }
  ]

  const loginText = computed(() => {
    if (loginLoading.value) {
      return t('login.text.loading')
    }
    return t('login.text.default')
  })

  const currentAccountUserId = computed(() => {
    const account = accountInfo.value.account.trim()
    if (!account) return ''
    const item = loginHistoryStore.findByAccount(account)
    return item?.userId || ''
  })

  const renderLanguageOptions = (lang: LangEnum, langName: string) => {
    return (
      <div class="flex items-center justify-between">
        <p>{langName}</p>
        {lang === systemSetting.preferences.lang && (
          <svg class="size-16px m-l-5px text-[var(--primary-color)]">
            <use href="#check"></use>
          </svg>
        )}
      </div>
    )
  }

  const renderThemeColorOptions = (themeColor: ThemePatternEnum, themeColorName: string) => {
    return (
      <div class="flex items-center justify-between">
        <p>{themeColorName}</p>
        {themeColor === systemSetting.themes.pattern && (
          <svg class="size-16px m-l-5px text-[var(--primary-color)]">
            <use href="#check"></use>
          </svg>
        )}
      </div>
    )
  }

  const onSetThemeColor = (pattern: ThemePatternEnum) => {
    systemSetting.setThemePattern(pattern)
  }

  const onOpenNetworkSettings = () => {
    networkServiceUrlDraft.value = systemSetting.network?.serviceUrl || ''
    showNetworkSettings.value = true
    accountHistoryVisible.value = false
  }

  const onCancelNetworkSettings = () => {
    showNetworkSettings.value = false
    networkServiceUrlDraft.value = systemSetting.network?.serviceUrl || ''
  }

  const onConfirmNetworkSettings = () => {
    const nextUrl = networkServiceUrlDraft.value.trim()
    if (nextUrl && !isValidServiceUrl(nextUrl)) {
      window.$message.error(t('login.networkSettings.invalidUrl'))
      return
    }
    systemSetting.setNetworkServiceUrl(nextUrl)
    showNetworkSettings.value = false
  }

  const onSetLanguage = (lang: LangEnum) => {
    systemSetting.setLang(lang)
  }

  const applyAccountKeepLoginState = (account: string) => {
    const item = loginHistoryStore.findByAccount(account.trim())
    if (item?.keepLogin && item.token) {
      keepLoginChecked.value = true
      passwordFreeMode.value = true
      accountInfo.value.password = FAKE_PASSWORD
      return
    }
    keepLoginChecked.value = !!item?.keepLogin
    passwordFreeMode.value = false
    accountInfo.value.password = ''
  }

  const exitPasswordFreeMode = () => {
    if (!passwordFreeMode.value) return
    passwordFreeMode.value = false
    accountInfo.value.password = ''
  }

  const loginSuccess = (info: LoginResult) => {
    if (info.account) {
      loginHistoryStore.addAccount({
        account: info.account,
        userId: info.userId,
        keepLogin: keepLoginChecked.value,
        token: keepLoginChecked.value ? info.token : undefined
      })
    }
    userStore.setAuthInfo({ token: info?.token || '', userId: info?.userId || '' })
    createHomeWinodw()
    void closeWebviewWindow(REGISTER_WINDOW_LABEL)
    void closeWebviewWindow(CHANGE_PWD_WINDOW_LABEL)
    void hideCurrentWindow()
  }

  const toggleAccountHistory = () => {
    accountHistoryVisible.value = !accountHistoryVisible.value
  }

  const onSelectHistoryAccount = (item: LoginHistoryItem) => {
    accountInfo.value.account = item.account
    accountHistoryVisible.value = false
    applyAccountKeepLoginState(item.account)
  }

  const onRemoveHistoryAccount = (account: string) => {
    loginHistoryStore.removeAccount(account)
    if (accountInfo.value.account === account) {
      const nextAccount = loginHistoryStore.accounts[0]?.account || ''
      accountInfo.value.account = nextAccount
      if (nextAccount) {
        applyAccountKeepLoginState(nextAccount)
      } else {
        keepLoginChecked.value = false
        passwordFreeMode.value = false
        accountInfo.value.password = ''
      }
    }
    if (!loginHistoryStore.accounts.length) {
      accountHistoryVisible.value = false
    }
  }

  const onPasswordUpdate = (val: string) => {
    if (passwordFreeMode.value) {
      if (val !== FAKE_PASSWORD) {
        exitPasswordFreeMode()
      }
      return
    }
    accountInfo.value.password = val
  }

  const onKeepLoginChange = (val: boolean) => {
    keepLoginChecked.value = val
    const account = accountInfo.value.account.trim()
    if (!val && account) {
      loginHistoryStore.clearKeepLogin(account)
      exitPasswordFreeMode()
    }
  }

  const onKeepLoginExpired = (account: string, message?: string) => {
    loginHistoryStore.clearKeepLogin(account)
    keepLoginChecked.value = false
    passwordFreeMode.value = false
    accountInfo.value.password = ''
    window.$message.error(message || t('login.keepLoginExpired'))
  }

  const onAccountLogin = () => {
    loginLoading.value = true
    const account = accountInfo.value.account.trim()

    if (passwordFreeMode.value) {
      const item = loginHistoryStore.findByAccount(account)
      const token = item?.token
      if (!token) {
        loginLoading.value = false
        onKeepLoginExpired(account)
        return
      }
      userStore.$patch((state) => {
        state.authInfo.token = token
      })
      authApi.tokenReset().then((res) => {
        loginLoading.value = false
        if (res.code === 0 && res.data) {
          loginSuccess(res.data)
        } else {
          onKeepLoginExpired(account, res.msg || t('login.keepLoginExpired'))
        }
      })
      return
    }

    authApi.accountLogin({ account, password: accountInfo.value.password }).then((res) => {
      loginLoading.value = false
      if (res.code === 0 && res.data) {
        loginSuccess(res.data)
      } else {
        window.$message.error(res.msg)
      }
    })
  }

  const onOauth2Login = async (oauthType: string) => {
    const urlInfo = await oauth2Api.oauth2Url({ type: oauthType })
    await invoke('start_oauth_server', { oauthType: oauthType, redirectUrl: urlInfo.data?.redirectUrl || '' })
    await openUrl(urlInfo.data?.authUrl || '')
    await once<OAuth2LoginPayload>('oauth-code', (event) => {
      loginLoading.value = true
      authApi.oauth2Login({ code: event.payload.code, type: oauthType }).then((res) => {
        loginLoading.value = false
        if (res.code === 0 && res.data) {
          loginSuccess(res.data)
        } else {
          window.$message.error(res.msg)
        }
      })
    })
  }

  const onGoRegister = () => {
    void createRegisterWindow()
  }

  const onForgotPassword = () => {
    void createChangePwdWindow('recover')
  }

  onClickOutside(accountInputRef, () => {
    accountHistoryVisible.value = false
  })

  watch(
    () => accountInfo.value.account,
    (account) => {
      accountHistoryVisible.value = false
      applyAccountKeepLoginState(account)
    }
  )

  onMounted(() => {
    const latestAccount = loginHistoryStore.accounts[0]
    if (latestAccount) {
      accountInfo.value.account = latestAccount.account
      applyAccountKeepLoginState(latestAccount.account)
    }
    versionChecking.value = true
    appUpdateStore
      .check({ silent: true })
      .then((info) => {
        showForceUpdate.value = info.needForce
        versionChecking.value = false
      })
      .catch((error: Error) => {
        console.error('[AppUpdate] login check failed:', error)
        showForceUpdate.value = false
        versionChecking.value = false
      })
    nextTick(() => {
      ShowCurrentWindow()
    })
  })

  watchEffect(() => {
    const hasAccount = accountInfo.value.account.trim() !== ''
    const hasPassword = passwordFreeMode.value || accountInfo.value.password !== ''
    loginButtonDisabled.value = !hasAccount || !hasPassword || loginLoading.value || !termsChecked.value
  })
</script>

<style scoped lang="scss">
  .login {
    height: 100vh;
    width: 100vw;
    display: flex;
    flex-direction: column;
    color: var(--text-color);
    user-select: none;

    .login__toolbar {
      height: 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 10px;
    }

    .login__content {
      flex: 1;
      background-color: var(--bg-secondary-color);
      padding: 0 20px;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;

      &::before {
        content: '';
        position: absolute;
        top: -50%;
        right: -30%;
        width: 500px;
        height: 500px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(var(--primary-rgb), 0.05), transparent 70%);
        pointer-events: none;
        animation: float-1 12s ease-in-out infinite;
      }

      &::after {
        content: '';
        position: absolute;
        bottom: -30%;
        left: -20%;
        width: 400px;
        height: 400px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(var(--primary-rgb), 0.03), transparent 60%);
        pointer-events: none;
        animation: float-2 15s ease-in-out infinite;
      }

      @keyframes float-1 {
        0%,
        100% {
          transform: translate(0, 0) scale(1) rotate(0deg);
        }
        25% {
          transform: translate(-30px, 40px) scale(1.1) rotate(5deg);
        }
        50% {
          transform: translate(-50px, 20px) scale(1.05) rotate(-3deg);
        }
        75% {
          transform: translate(-20px, -10px) scale(1.15) rotate(2deg);
        }
      }

      @keyframes float-2 {
        0%,
        100% {
          transform: translate(0, 0) scale(1) rotate(0deg);
        }
        33% {
          transform: translate(40px, -30px) scale(1.1) rotate(-4deg);
        }
        66% {
          transform: translate(20px, 20px) scale(1.08) rotate(6deg);
        }
      }

      .login__avatar-wrapper {
        position: relative;
        width: 72px;
        height: 72px;
        border-radius: 50%;
        overflow: hidden;
        box-shadow: 0 4px 24px rgba(var(--primary-rgb), 0.25);
        border: 1px solid var(--primary-color);

        &::after {
          content: '';
          position: absolute;
          inset: -10px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(var(--primary-rgb), 0.3), transparent 70%);
          z-index: -1;
        }
      }

      .other-login__button {
        width: 42px;
        height: 42px;
        border-radius: 50%;
        transition: all 0.3s ease;

        &:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        &:active {
          transform: scale(0.95);
        }
      }

      .login__btn-gradient {
        width: 100%;
        height: 38px;
        background: linear-gradient(to right, var(--primary-color), var(--primary-strong-color));

        &:not(.n-button--disabled):hover {
          background: linear-gradient(to right, var(--primary-soft-color), var(--primary-strong-color));
        }
      }

      .login__network {
        display: flex;
        flex-direction: column;
        min-height: 0;
        padding-top: 12px;
      }

      .login__network-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin: 0 -10px 24px;
      }

      .login__network-title {
        flex: 1;
        text-align: center;
        font-size: 15px;
        font-weight: 600;
        color: var(--text-color);
        user-select: none;
      }

      .login__network-form {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .login__network-field {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .login__network-label {
        font-size: 13px;
        color: var(--text-secondary-color);
        user-select: none;
      }

      .login__network-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }

      .login__network-cancel {
        color: var(--text-color);
        background-color: var(--button-soft-bg) !important;
        border: 1px solid var(--border-color);

        &:hover {
          color: var(--text-color);
          background-color: var(--button-soft-bg) !important;
          border-color: var(--border-color);
          filter: brightness(1.05);
        }
      }

      .login__account-input {
        position: relative;
        width: 100%;
        z-index: 2;
      }

      .login__account-chevron {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
        transform: rotate(-90deg);
        transition: transform 0.2s ease;

        &--open {
          transform: rotate(90deg);
        }
      }

      .login__account-history {
        position: absolute;
        top: calc(100% + 5px);
        left: 0;
        right: 0;
        z-index: 10;
        padding: 4px;
        border-radius: 8px;
        background-color: var(--bg-primary-color);
        border: 1px solid var(--border-color);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);

        &__scroll {
          max-height: 182px;
          overflow-y: auto;
        }

        &__item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 6px;
          cursor: pointer;
          transition: background-color 0.2s ease;

          &:hover {
            background-color: var(--button-soft-bg);

            .login__account-history__remove {
              opacity: 1;
              pointer-events: auto;
            }
          }

          & + & {
            margin-top: 2px;
          }
        }

        &__text {
          flex: 1;
          min-width: 0;
          font-size: 14px;
          color: var(--text-color);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        &__remove {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          width: 22px;
          height: 22px;
          padding: 0;
          border: none;
          background: transparent;
          color: var(--text-secondary-color);
          cursor: pointer;
          opacity: 0;
          pointer-events: none;
          transition:
            opacity 0.2s ease,
            color 0.2s ease;

          &:hover {
            color: var(--text-color);
          }
        }
      }
    }

    .login__footer {
      height: 32px;
      background-color: var(--toolbar-bg-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 10px;
      font-size: 12px;
      color: var(--text-muted-color);
      user-select: none;
    }

    :deep(.n-input) {
      .n-input__input-el {
        padding: 0;
        height: 40px;
        line-height: 40px;
        user-select: text;
      }
    }
  }
</style>
