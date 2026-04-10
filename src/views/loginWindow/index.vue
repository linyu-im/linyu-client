<template>
  <div class="login">
    <!-- 顶部操作栏 -->
    <div data-tauri-drag-region class="login__toolbar">
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
    </div>

    <!-- 内容部分 -->
    <div data-tauri-drag-region class="login__content">
      <div class="flex flex-col justify-center items-center m-25px select-none">
        <n-avatar class="size-48px rounded-12px bg-#FFF" fallback-src="/avatar.png" src="/avatar.png" />
        <div class="text-20px font-bold tracking-2px m-t-15px">{{ t('login.welcome.text1') }}</div>
        <div class="text-12px tracking-2px text-[var(--text-secondary-color)] m-t-5px">
          {{ t('login.welcome.text2') }}
        </div>
      </div>

      <!-- 账号密码 -->
      <div class="flex flex-col gap-10px">
        <n-input type="text" v-model:value="accountInfo.account" :placeholder="t('login.input.account')" clearable />
        <n-input
          type="password"
          show-password-on="click"
          v-model:value="accountInfo.password"
          :placeholder="t('login.input.password')"
          clearable />
        <div class="flex items-center">
          <n-checkbox size="small" v-model:checked="globalStore.isAutoLogin" @update:checked="onAutoLoginChange" />
          <span class="text-12px text-[var(--text-secondary-color)] m-l-5px">{{ t('login.autoLogin') }}</span>
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
          <i18n-t keypath="login.terms.text1" tag="div" class="inline text-12px text-[var(--text-secondary-color)]">
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
          <div class="w-full flex justify-between">
            <n-button size="small" class="other-login__button">
              <template #icon>
                <svg class="size-20px"><use href="#scanqr" /></svg>
              </template>
              {{ t('login.other.scan') }}
            </n-button>
            <n-button size="small" class="other-login__button">
              <template #icon>
                <svg class="size-16px"><use href="#github" /></svg>
              </template>
              {{ t('login.other.github') }}
            </n-button>
            <n-button size="small" class="other-login__button" @click="() => onOauth2Login('gitee')">
              <template #icon>
                <svg class="size-14px"><use href="#gitee" /></svg>
              </template>
              {{ t('login.other.gitee') }}
            </n-button>
          </div>
          <div class="text-12px text-[var(--text-secondary-color)] m-t-20px">
            <span>{{ t('login.register.tip') }}</span>
            <span class="color-[var(--primary-color)] cursor-pointer">{{ t('login.register.text') }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部内容 -->
    <div data-tauri-drag-region class="login__footer">
      <div>{{ t('login.footer.provider') }}</div>
      <div class="cursor-pointer">{{ t('login.footer.support') }}</div>
    </div>
  </div>
</template>

<script setup lang="tsx">
  import SvgIconButton from '@/components/SvgIconButton.vue'
  import { oauth2Api, userApi } from '@/api'
  import { createWebviewWindow, exitApp, minimizeCurrentWindow } from '@/utils/window'
  import { useI18n } from 'vue-i18n'
  import { useUserStore } from '@/stores/user'
  import { useGlobalStore } from '@/stores/global'
  import { invoke } from '@tauri-apps/api/core'
  import { openUrl } from '@/utils/open'
  import { once } from '@tauri-apps/api/event'
  import { OAuth2LoginPayload } from '@/types/cmd/login'
  import { LoginResult } from '@/types/api/user'
  import { useSystemSettingStore } from '@/stores/systemSetting'
  import { LangEnum, ThemePatternEnum } from '@/constants/system'

  const { t } = useI18n()
  const userStore = useUserStore()
  const globalStore = useGlobalStore()
  const systemSetting = useSystemSettingStore()

  const accountInfo = ref({ account: '', password: '' })
  const loginLoading = ref(false)
  const loginButtonDisabled = ref(true)
  const termsChecked = ref(false)
  const loginType = ref('')

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
    }
  ]

  const loginText = computed(() => {
    if (loginLoading.value) {
      return loginType.value === 'auto' ? t('login.text.autoLoginLoading') : t('login.text.loading')
    }
    return t('login.text.default')
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

  const onSetLanguage = (lang: LangEnum) => {
    systemSetting.setLang(lang)
  }

  const loginSuccess = (info: LoginResult) => {
    userStore.setUserInfo({ token: info?.token || '', userId: info?.userId || '' })
    createWebviewWindow('Linyu', 'home', { width: 600, height: 400 })
  }

  const onAccountLogin = () => {
    loginType.value = 'manual'
    loginLoading.value = true
    userApi.accountLogin({ account: accountInfo.value.account, password: accountInfo.value.password }).then((res) => {
      loginLoading.value = false
      if (res.code === 0 && res.data) {
        loginSuccess(res.data)
      } else {
        window.$message.error(res.msg)
      }
    })
  }

  const onAutoLogin = () => {
    loginType.value = 'auto'
    loginLoading.value = true
    loginButtonDisabled.value = true
    userApi.tokenReset().then((res) => {
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
      userApi.oauth2Login({ code: event.payload.code, type: oauthType }).then((res) => {
        loginLoading.value = false
        if (res.code === 0 && res.data) {
          loginSuccess(res.data)
        } else {
          window.$message.error(res.msg)
        }
      })
    })
  }

  const onAutoLoginChange = (val: boolean) => {
    globalStore.setIsAutoLogin(val)
  }

  onMounted(() => {
    if (globalStore.isAutoLogin) {
      onAutoLogin()
    }
  })

  watchEffect(() => {
    loginButtonDisabled.value =
      accountInfo.value.account === '' || accountInfo.value.password === '' || loginLoading.value || !termsChecked.value
  })
</script>

<style scoped lang="scss">
  .login {
    height: 100vh;
    width: 100vw;
    display: flex;
    flex-direction: column;
    color: var(--text-color);

    .login__toolbar {
      height: 40px;
      background-color: var(--toolbar-bg-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 10px;
    }

    .login__content {
      flex: 1;
      background-color: var(--bg-primary-color);
      padding: 0 20px;
      display: flex;
      flex-direction: column;

      .other-login__button {
        width: 90px;
        height: 32px;
        border-radius: 5px;
        font-size: 12px;
      }

      .login__btn-gradient {
        width: 100%;
        height: 38px;
        background: linear-gradient(to right, var(--primary-color), var(--primary-strong-color));

        &:not(.n-button--disabled):hover {
          background: linear-gradient(to right, var(--primary-soft-color), var(--primary-strong-color));
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
      background-color: var(--input-soft-bg);

      .n-input__input-el {
        padding: 0;
        height: 40px;
        line-height: 40px;
      }
    }
  }
</style>
