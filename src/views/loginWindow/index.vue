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
        <SvgIconButton href="#minimize" @click="minimizeCurrentWindow" />
        <SvgIconButton href="#close" hover-bg="var(--red)" hover-color="#FFF" @click="closeCurrentWindow" />
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
          <n-checkbox size="small" />
          <span class="text-12px text-[var(--text-secondary-color)] m-l-5px">{{ t('login.autoLogin') }}</span>
        </div>
      </div>

      <!-- 登录和协议 -->
      <div class="m-t-25px">
        <n-button
          class="w-full h-38px bg-gradient-to-r from-[var(--primary-color)] to-[var(--primary-strong-color)] hover:from-[var(--primary-soft-color)] hover:to-[var(--primary-strong-color)]"
          type="primary"
          @click="onLogin">
          {{ t('login.loginText') }}
        </n-button>
        <div class="flex gap-5px m-t-10px justify-center select-none">
          <n-checkbox size="small" />
          <div class="flex text-12px text-[var(--text-secondary-color)]">
            <span>{{ t('login.terms.text1') }}</span>
            <span class="color-[var(--primary-color)] cursor-pointer">{{ t('login.terms.text2') }}</span>
            <span>{{ t('login.terms.text3') }}</span>
            <span class="color-[var(--primary-color)] cursor-pointer">{{ t('login.terms.text4') }}</span>
          </div>
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
            <n-button size="small" class="other-login__button">
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

<script setup lang="ts">
  import SvgIconButton from '@/components/SvgIconButton.vue'
  import { userApi } from '@/api'
  import { closeCurrentWindow, createWebviewWindow, minimizeCurrentWindow } from '@/utils/window'
  import { useI18n } from 'vue-i18n'
  const { t } = useI18n()

  const accountInfo = ref({
    account: '',
    password: ''
  })

  const onLogin = () => {
    userApi.accountLogin({ account: accountInfo.value.account, password: accountInfo.value.password }).then((res) => {
      if (res.code === 0) {
        createWebviewWindow('Linyu', 'home', { width: 600, height: 400 })
      }
    })
  }
</script>

<style scoped lang="scss">
  .login {
    height: 100vh;
    width: 100vw;
    display: flex;
    flex-direction: column;

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
      background-color: #fff;
      padding: 0px 20px;
      display: flex;
      flex-direction: column;

      .other-login__button {
        width: 90px;
        height: 32px;
        border-radius: 5px;
        font-size: 12px;
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
      color: var(--text-secondary-color);
      user-select: none;
    }

    :deep(.n-input) {
      background-color: #f7f7f7;

      .n-input__input-el {
        padding: 0;
        height: 40px;
        line-height: 40px;
      }
    }
  }
</style>
