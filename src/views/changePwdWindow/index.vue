<template>
  <div class="change-pwd">
    <div data-tauri-drag-region class="change-pwd__toolbar">
      <div class="change-pwd__toolbar-spacer" />
      <div class="flex">
        <SvgIconButton href="#minimize" @click="minimizeCurrentWindow" />
        <SvgIconButton href="#close" hover-bg="var(--red)" hover-color="#FFF" @click="closeCurrentWindow" />
      </div>
    </div>

    <div v-if="step === 'success'" class="change-pwd__success">
      <div class="change-pwd__success-icon" aria-hidden="true">
        <img class="change-pwd__success-icon-img" src="/password.png" alt="" />
      </div>
      <h1 class="change-pwd__success-title">{{ t('changePwd.success.title') }}</h1>
      <p class="change-pwd__success-subtitle">{{ t('changePwd.success.subtitle') }}</p>
      <p class="change-pwd__success-subtitle">{{ t('changePwd.success.securityTip') }}</p>
      <n-button class="change-pwd__btn-gradient" type="primary" @click="onBackToLogin">
        {{ t('changePwd.success.backToLogin') }}
      </n-button>
    </div>

    <div v-else class="change-pwd__body">
      <div class="change-pwd__form">
        <h1 class="change-pwd__title">{{ pageTitle }}</h1>
        <p class="change-pwd__subtitle">{{ t('changePwd.subtitle') }}</p>

        <div class="change-pwd__fields">
          <div class="change-pwd__field">
            <label class="change-pwd__label">{{ t('changePwd.form.email') }}</label>
            <n-input v-model:value="form.email" :placeholder="t('changePwd.form.emailPlaceholder')" />
          </div>

          <div class="change-pwd__field">
            <label class="change-pwd__label">{{ t('changePwd.form.code') }}</label>
            <n-input
              v-model:value="form.code"
              :placeholder="t('changePwd.form.codePlaceholder')"
              maxlength="6"
              :allow-input="onlyAllowCode">
              <template #suffix>
                <n-button
                  text
                  type="primary"
                  class="change-pwd__code-btn"
                  :disabled="sendCodeDisabled"
                  @click="onSendCode">
                  {{ sendCodeText }}
                </n-button>
              </template>
            </n-input>
          </div>

          <div class="change-pwd__field">
            <label class="change-pwd__label">{{ t('changePwd.form.password') }}</label>
            <n-input
              v-model:value="form.password"
              type="password"
              show-password-on="click"
              :placeholder="t('changePwd.form.passwordPlaceholder')"
              maxlength="20" />
            <p class="change-pwd__hint">{{ t('changePwd.form.passwordHint') }}</p>
          </div>

          <div class="change-pwd__field">
            <label class="change-pwd__label">{{ t('changePwd.form.confirmPassword') }}</label>
            <n-input
              v-model:value="form.confirmPassword"
              type="password"
              show-password-on="click"
              :placeholder="t('changePwd.form.confirmPasswordPlaceholder')"
              maxlength="20" />
          </div>
        </div>

        <n-button
          class="change-pwd__btn-gradient m-t-24px"
          type="primary"
          :loading="submitting"
          :disabled="submitDisabled"
          @click="onSubmit">
          {{ t('changePwd.form.submit') }}
        </n-button>

        <div v-if="mode === 'recover'" class="change-pwd__footer-link">
          <span>{{ t('changePwd.hasPassword.tip') }}</span>
          <span class="change-pwd__link" @click="onBackToLogin">{{ t('changePwd.hasPassword.login') }}</span>
        </div>

        <p class="change-pwd__security">{{ t('changePwd.form.securityTip') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import SvgIconButton from '@/components/SvgIconButton.vue'
  import { passwordApi } from '@/api'
  import { CHANGE_PWD_WINDOW_LABEL } from '@/constants/window'
  import { useUserStore } from '@/stores/user/user'
  import { returnToLogin } from '@/utils/auth/returnToLogin'
  import {
    closeCurrentWindow,
    createLoginWindow,
    minimizeCurrentWindow,
    ShowCurrentWindow,
    type ChangePwdWindowMode
  } from '@/utils/desktop/window'
  import { useI18n } from 'vue-i18n'
  import { useRoute } from 'vue-router'

  const { t } = useI18n()
  const route = useRoute()
  const userStore = useUserStore()

  const mode = computed<ChangePwdWindowMode>(() => (route.query.mode === 'change' ? 'change' : 'recover'))
  const pageTitle = computed(() => (mode.value === 'change' ? t('changePwd.titleChange') : t('changePwd.titleRecover')))

  const step = ref<'form' | 'success'>('form')
  const form = ref({
    email: '',
    code: '',
    password: '',
    confirmPassword: ''
  })
  const codeCountdown = ref(0)
  const sendingCode = ref(false)
  const submitting = ref(false)
  let codeTimer: ReturnType<typeof setInterval> | null = null

  const onlyAllowCode = (value: string) => /^\d*$/.test(value)

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const isValidPassword = (password: string) => {
    if (password.length < 8 || password.length > 20) return false
    const hasLetter = /[a-zA-Z]/.test(password)
    const hasNumber = /\d/.test(password)
    const hasSpecial = /[^a-zA-Z0-9]/.test(password)
    return hasLetter && hasNumber && hasSpecial
  }

  const sendCodeDisabled = computed(() => !form.value.email.trim() || codeCountdown.value > 0 || sendingCode.value)

  const sendCodeText = computed(() => {
    if (codeCountdown.value > 0) {
      return t('changePwd.form.resendCode', { seconds: codeCountdown.value })
    }
    return t('changePwd.form.sendCode')
  })

  const submitDisabled = computed(() => {
    return (
      !form.value.email.trim() ||
      !form.value.code.trim() ||
      !form.value.password ||
      !form.value.confirmPassword ||
      submitting.value
    )
  })

  const clearCodeTimer = () => {
    if (codeTimer) {
      clearInterval(codeTimer)
      codeTimer = null
    }
  }

  const startCodeCountdown = () => {
    clearCodeTimer()
    codeCountdown.value = 60
    codeTimer = setInterval(() => {
      if (codeCountdown.value <= 1) {
        codeCountdown.value = 0
        clearCodeTimer()
        return
      }
      codeCountdown.value -= 1
    }, 1000)
  }

  const onSendCode = () => {
    if (sendCodeDisabled.value) return
    const email = form.value.email.trim()
    if (!isValidEmail(email)) {
      window.$message.error(t('changePwd.form.emailInvalid'))
      return
    }
    sendingCode.value = true
    passwordApi
      .sendEmailCode({ email })
      .then((res) => {
        if (res.code === 0) {
          startCodeCountdown()
          window.$message.success(t('changePwd.form.sendCodeSuccess'))
          return
        }
        window.$message.error(res.msg)
      })
      .finally(() => {
        sendingCode.value = false
      })
  }

  const onSubmit = () => {
    if (submitDisabled.value) return
    const email = form.value.email.trim()
    const code = form.value.code.trim()
    const password = form.value.password
    const confirmPassword = form.value.confirmPassword

    if (!isValidEmail(email)) {
      window.$message.error(t('changePwd.form.emailInvalid'))
      return
    }
    if (!isValidPassword(password)) {
      window.$message.error(t('changePwd.form.passwordInvalid'))
      return
    }
    if (password !== confirmPassword) {
      window.$message.error(t('changePwd.form.passwordMismatch'))
      return
    }

    submitting.value = true
    passwordApi
      .reset({ email, code, password, confirmPassword })
      .then((res) => {
        if (res.code === 0) {
          step.value = 'success'
          void returnToLogin({
            reason: 'passwordReset',
            silent: true,
            retainLabels: [CHANGE_PWD_WINDOW_LABEL]
          })
          return
        }
        window.$message.error(res.msg)
      })
      .finally(() => {
        submitting.value = false
      })
  }

  const onBackToLogin = () => {
    void createLoginWindow().then(() => closeCurrentWindow())
  }

  onMounted(() => {
    if (mode.value === 'change') {
      form.value.email = userStore.userInfo.email || ''
    }
    nextTick(() => {
      ShowCurrentWindow()
    })
  })

  onUnmounted(() => {
    clearCodeTimer()
  })
</script>

<style lang="scss" scoped>
  .change-pwd {
    position: relative;
    height: 100vh;
    width: 100vw;
    display: flex;
    flex-direction: column;
    color: var(--text-color);
    overflow: hidden;
    background-color: var(--bg-secondary-color);

    &__toolbar {
      height: 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 10px;
      flex-shrink: 0;
    }

    &__toolbar-spacer {
      flex: 1;
    }

    &__body {
      flex: 1;
      min-height: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px 24px 40px;
    }

    &__form {
      width: 100%;
      max-width: 380px;
    }

    &__title {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
      line-height: 1.3;
    }

    &__subtitle {
      margin: 10px 0 0;
      font-size: 13px;
      line-height: 1.5;
      color: var(--text-secondary-color);
    }

    &__fields {
      margin-top: 28px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    &__field {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    &__label {
      font-size: 13px;
      color: var(--text-color);
    }

    &__hint {
      margin: 0;
      font-size: 12px;
      line-height: 1.4;
      color: var(--text-secondary-color);
    }

    &__code-btn {
      font-size: 13px;
    }

    &__btn-gradient {
      width: 100%;
      height: 40px;
      border: none;
      background: linear-gradient(to right, var(--primary-color), var(--primary-strong-color));

      &:not(.n-button--disabled):hover {
        background: linear-gradient(to right, var(--primary-soft-color), var(--primary-strong-color));
      }
    }

    &__footer-link {
      margin-top: 18px;
      display: flex;
      justify-content: center;
      gap: 4px;
      font-size: 12px;
      color: var(--text-secondary-color);
    }

    &__link {
      color: var(--primary-color);
      cursor: pointer;
    }

    &__security {
      margin: 28px 0 0;
      text-align: center;
      font-size: 12px;
      line-height: 1.5;
      color: var(--text-secondary-color);
    }

    &__success {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      text-align: center;
      user-select: none;
      -webkit-user-select: none;
    }

    &__success-icon {
      margin-bottom: 20px;
    }

    &__success-icon-img {
      width: 98px;
      height: 98px;
      object-fit: contain;
      display: block;
    }

    &__success-title {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
    }

    &__success-subtitle {
      margin: 12px 0 0;
      max-width: 420px;
      font-size: 13px;
      line-height: 1.6;
      color: var(--text-secondary-color);
    }

    &__success .change-pwd__btn-gradient {
      margin-top: 28px;
      max-width: 380px;
    }
  }
</style>
