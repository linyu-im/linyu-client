<template>
  <div class="register">
    <div class="register__wave" aria-hidden="true">
      <svg class="register__wave-svg register__wave-svg--back" viewBox="0 0 1440 320" preserveAspectRatio="none">
        <path
          class="register__wave-path register__wave-path--3"
          d="M0,220 C180,250 320,140 480,155 C680,175 760,250 920,210 C1100,160 1240,80 1440,95 L1440,320 L0,320 Z" />
      </svg>
      <svg class="register__wave-svg register__wave-svg--mid" viewBox="0 0 1440 320" preserveAspectRatio="none">
        <path
          class="register__wave-path register__wave-path--2"
          d="M0,245 C160,210 280,170 420,195 C600,230 720,270 900,230 C1080,185 1220,120 1440,145 L1440,320 L0,320 Z" />
      </svg>
      <svg class="register__wave-svg register__wave-svg--front" viewBox="0 0 1440 320" preserveAspectRatio="none">
        <path
          class="register__wave-path register__wave-path--1"
          d="M0,265 C120,250 200,235 320,250 C480,275 620,295 780,270 C980,235 1180,160 1440,175 L1440,320 L0,320 Z" />
      </svg>
    </div>

    <div data-tauri-drag-region class="register__toolbar">
      <div class="register__toolbar-spacer" />
      <div class="flex">
        <SvgIconButton href="#minimize" @click="minimizeCurrentWindow" />
        <SvgIconButton href="#close" hover-bg="var(--red)" hover-color="#FFF" @click="closeCurrentWindow" />
      </div>
    </div>

    <div v-if="step === 'success'" class="register__success">
      <div class="register__success-inner">
        <h1 class="register__success-title">{{ t('register.success.title') }}</h1>
        <p class="register__success-subtitle">{{ t('register.success.subtitle') }}</p>

        <div class="register__account-card">
          <svg class="register__account-card-decor" viewBox="0 0 802 294" preserveAspectRatio="none" aria-hidden="true">
            <path
              d="M0 270 C105 225, 190 222, 285 254 C380 286, 475 292, 575 269 C660 249, 723 228, 802 235 L802 294 L0 294 Z"
              fill="rgba(0, 31, 99, 0.28)" />
            <path
              d="M0 291 C120 264, 200 254, 305 272 C420 292, 537 287, 646 262 C706 248, 755 243, 802 246 L802 294 L0 294 Z"
              fill="rgba(13, 45, 123, 0.18)" />
            <path
              d="M490 294 C555 207, 620 130, 802 52"
              fill="none"
              stroke="rgba(124, 181, 255, 0.2)"
              stroke-width="1.3" />
            <path
              d="M505 294 C594 238, 676 193, 802 177"
              fill="none"
              stroke="rgba(93, 156, 255, 0.11)"
              stroke-width="1.1" />
          </svg>

          <div class="register__account-card-content">
            <div class="register__account-info">
              <div class="register__account-label">{{ t('register.success.accountLabel') }}</div>
              <div class="register__account-number">{{ successAccount }}</div>
              <div class="register__account-tip">{{ t('register.success.accountTip') }}</div>
            </div>
            <button type="button" class="register__account-copy" @click="onCopyAccount">
              {{ t('register.success.copyAccount') }}
            </button>
          </div>
        </div>

        <n-button class="register__success-action" type="primary" @click="onStartExperience">
          {{ t('register.success.start') }}
        </n-button>
      </div>
      <div class="register__copyright register__copyright--success">{{ t('login.footer.provider') }}</div>
    </div>

    <div v-else class="register__body">
      <section class="register__hero" data-tauri-drag-region>
        <div class="register__hero-header">
          <svg class="register__hero-logo">
            <use href="#linyu"></use>
          </svg>
          <div>
            <h1 class="register__hero-title">{{ t('register.welcome.title') }}</h1>
            <p class="register__hero-subtitle">{{ t('register.welcome.subtitle') }}</p>
          </div>
        </div>

        <div class="register__hero-main">
          <n-carousel
            class="register__carousel"
            autoplay
            :interval="4000"
            :show-arrow="false"
            dot-type="line"
            draggable>
            <div v-for="item in features" :key="item.titleHighlightKey" class="register__slide">
              <img class="register__slide-image" :src="item.image" alt="" draggable="false" />
              <h2 class="register__slide-title">
                <span class="register__slide-title-em">{{ t(item.titleHighlightKey) }}</span>
                {{ t(item.titleRestKey) }}
              </h2>
              <p class="register__slide-desc">{{ t(item.descKey) }}</p>
            </div>
          </n-carousel>
        </div>

        <div class="register__copyright">{{ t('login.footer.provider') }}</div>
      </section>

      <section class="register__panel">
        <div class="register__card">
          <div class="register__card-header">
            <h2 class="register__card-title">{{ t('register.form.title') }}</h2>
            <p class="register__card-subtitle">{{ t('register.form.subtitle') }}</p>
          </div>

          <div class="register__fields">
            <div class="register__field">
              <n-input
                v-model:value="form.account"
                :placeholder="t('register.form.account')"
                maxlength="20"
                :status="accountStatus"
                :allow-input="onlyAllowAccount">
                <template #prefix>
                  <svg class="register__field-icon"><use href="#user" /></svg>
                </template>
                <template #suffix>
                  <div class="register__account-suffix">
                    <n-button
                      text
                      type="primary"
                      class="register__check-btn"
                      :loading="accountChecking"
                      :disabled="accountCheckDisabled"
                      @click="onCheckAccount">
                      {{ t('register.form.checkAccount') }}
                    </n-button>
                    <n-popover trigger="click" placement="top" :width="260">
                      <template #trigger>
                        <button type="button" class="register__tip-btn" tabindex="-1">
                          <svg class="register__field-icon"><use href="#question" /></svg>
                        </button>
                      </template>
                      <span class="register__tip-text">{{ t('register.form.accountHint') }}</span>
                    </n-popover>
                  </div>
                </template>
              </n-input>
              <p v-if="accountError" class="register__field-error">{{ accountError }}</p>
            </div>

            <div class="register__field">
              <n-input v-model:value="form.email" :placeholder="t('register.form.email')">
                <template #prefix>
                  <svg class="register__field-icon"><use href="#email" /></svg>
                </template>
                <template #suffix>
                  <n-button
                    text
                    type="primary"
                    class="register__code-btn"
                    :disabled="sendCodeDisabled"
                    @click="onSendCode">
                    {{ sendCodeText }}
                  </n-button>
                </template>
              </n-input>
            </div>

            <div class="register__field">
              <n-input
                v-model:value="form.code"
                :placeholder="t('register.form.code')"
                maxlength="6"
                :allow-input="onlyAllowCode">
                <template #prefix>
                  <svg class="register__field-icon"><use href="#verify-code" /></svg>
                </template>
              </n-input>
            </div>

            <div class="register__field">
              <n-input
                v-model:value="form.password"
                type="password"
                show-password-on="click"
                :placeholder="t('register.form.password')"
                maxlength="20">
                <template #prefix>
                  <svg class="register__field-icon"><use href="#lock" /></svg>
                </template>
                <template #suffix>
                  <n-popover trigger="click" placement="top" :width="240">
                    <template #trigger>
                      <button type="button" class="register__tip-btn" tabindex="-1">
                        <svg class="register__field-icon"><use href="#question" /></svg>
                      </button>
                    </template>
                    <span class="register__tip-text">{{ t('register.form.passwordHint') }}</span>
                  </n-popover>
                </template>
              </n-input>
            </div>

            <div class="register__field">
              <n-input
                v-model:value="form.confirmPassword"
                type="password"
                show-password-on="click"
                :placeholder="t('register.form.confirmPassword')"
                maxlength="20">
                <template #prefix>
                  <svg class="register__field-icon"><use href="#lock" /></svg>
                </template>
              </n-input>
            </div>
          </div>

          <div class="register__terms">
            <n-checkbox v-model:checked="termsChecked" size="small" />
            <i18n-t
              scope="global"
              keypath="register.terms.text1"
              tag="div"
              class="inline text-12px text-[var(--text-secondary-color)]">
              <template #text2>
                <span class="color-[var(--primary-color)] cursor-pointer">{{ t('register.terms.text2') }}</span>
              </template>
              <template #text3>
                <span class="color-[var(--primary-color)] cursor-pointer">{{ t('register.terms.text3') }}</span>
              </template>
            </i18n-t>
          </div>

          <n-button
            class="register__submit"
            type="primary"
            :loading="registering"
            :disabled="submitDisabled"
            @click="onSubmit">
            {{ t('register.form.submit') }}
          </n-button>

          <div class="register__login-link">
            <span>{{ t('register.hasAccount.tip') }}</span>
            <span class="register__login-action" @click="onGoLogin">{{ t('register.hasAccount.login') }}</span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
  import SvgIconButton from '@/components/SvgIconButton.vue'
  import { registerApi } from '@/api'
  import {
    backToLoginWindow,
    closeCurrentWindow,
    minimizeCurrentWindow,
    ShowCurrentWindow
  } from '@/utils/desktop/window'
  import { writeText } from '@tauri-apps/plugin-clipboard-manager'
  import { useI18n } from 'vue-i18n'

  const { t } = useI18n()

  const step = ref<'form' | 'success'>('form')
  const successAccount = ref('')

  const form = ref({
    account: '',
    email: '',
    code: '',
    password: '',
    confirmPassword: ''
  })
  const termsChecked = ref(false)
  const codeCountdown = ref(0)
  const accountError = ref('')
  const accountChecking = ref(false)
  const sendingCode = ref(false)
  const registering = ref(false)
  let codeTimer: ReturnType<typeof setInterval> | null = null
  let accountCheckSeq = 0

  const features = [
    {
      image: '/register-logo-mian-1.png',
      titleHighlightKey: 'register.features.secure.titleHighlight',
      titleRestKey: 'register.features.secure.titleRest',
      descKey: 'register.features.secure.desc'
    },
    {
      image: '/register-logo-mian-2.png',
      titleHighlightKey: 'register.features.efficient.titleHighlight',
      titleRestKey: 'register.features.efficient.titleRest',
      descKey: 'register.features.efficient.desc'
    },
    {
      image: '/register-logo-mian-3.png',
      titleHighlightKey: 'register.features.simple.titleHighlight',
      titleRestKey: 'register.features.simple.titleRest',
      descKey: 'register.features.simple.desc'
    }
  ]

  const onlyAllowCode = (value: string) => /^\d*$/.test(value)

  const onlyAllowAccount = (value: string) => /^[a-zA-Z0-9_-]*$/.test(value)

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  /** 4-20 位，字母开头，仅字母数字下划线中划线 */
  const isValidAccount = (account: string) => /^[a-zA-Z][a-zA-Z0-9_-]{3,19}$/.test(account)

  const accountStatus = computed(() => (accountError.value ? 'error' : undefined))

  const accountCheckDisabled = computed(() => !form.value.account.trim() || accountChecking.value)

  const sendCodeDisabled = computed(() => !form.value.email.trim() || codeCountdown.value > 0 || sendingCode.value)

  const sendCodeText = computed(() => {
    if (codeCountdown.value > 0) {
      return t('register.form.resendCode', { seconds: codeCountdown.value })
    }
    return t('register.form.sendCode')
  })

  const submitDisabled = computed(() => {
    return (
      !form.value.account.trim() ||
      !form.value.email.trim() ||
      !form.value.code.trim() ||
      !form.value.password ||
      !form.value.confirmPassword ||
      !termsChecked.value ||
      !!accountError.value ||
      accountChecking.value ||
      registering.value
    )
  })

  const isValidPassword = (password: string) => {
    if (password.length < 8 || password.length > 20) return false
    const hasLetter = /[a-zA-Z]/.test(password)
    const hasNumber = /\d/.test(password)
    const hasSpecial = /[^a-zA-Z0-9]/.test(password)
    return hasLetter && hasNumber && hasSpecial
  }

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

  const onCheckAccount = () => {
    if (accountCheckDisabled.value) return
    const account = form.value.account.trim()
    accountError.value = ''
    if (!isValidAccount(account)) {
      accountError.value = t('register.form.accountInvalid')
      return
    }
    const seq = ++accountCheckSeq
    accountChecking.value = true
    registerApi
      .checkAccount({ account })
      .then((res) => {
        if (seq !== accountCheckSeq) return
        if (res.code !== 0) {
          window.$message.error(res.msg)
          return
        }
        // data 为 true 表示账号已被使用
        if (res.data === true) {
          accountError.value = t('register.form.accountTaken')
          return
        }
        window.$message.success(t('register.form.accountAvailable'))
      })
      .finally(() => {
        if (seq === accountCheckSeq) {
          accountChecking.value = false
        }
      })
  }

  watch(
    () => form.value.account,
    () => {
      accountError.value = ''
      accountCheckSeq += 1
      accountChecking.value = false
    }
  )

  const onSendCode = () => {
    if (sendCodeDisabled.value) return
    const email = form.value.email.trim()
    if (!isValidEmail(email)) {
      window.$message.error(t('register.form.emailInvalid'))
      return
    }
    sendingCode.value = true
    registerApi
      .sendEmailCode({ email })
      .then((res) => {
        if (res.code === 0) {
          startCodeCountdown()
          window.$message.success(t('register.form.sendCodeSuccess'))
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
    const account = form.value.account.trim()
    const email = form.value.email.trim()
    const code = form.value.code.trim()
    const password = form.value.password
    const confirmPassword = form.value.confirmPassword

    if (!isValidAccount(account)) {
      accountError.value = t('register.form.accountInvalid')
      return
    }
    if (!isValidEmail(email)) {
      window.$message.error(t('register.form.emailInvalid'))
      return
    }
    if (!isValidPassword(password)) {
      window.$message.error(t('register.form.passwordInvalid'))
      return
    }
    if (password !== confirmPassword) {
      window.$message.error(t('register.form.passwordMismatch'))
      return
    }

    registering.value = true
    registerApi
      .checkAccount({ account })
      .then((checkRes) => {
        if (checkRes.code !== 0) {
          window.$message.error(checkRes.msg)
          return null
        }
        if (checkRes.data === true) {
          accountError.value = t('register.form.accountTaken')
          return null
        }
        return registerApi.registerEmail({
          email,
          code,
          account,
          password,
          confirmPassword
        })
      })
      .then((res) => {
        if (!res) return
        if (res.code === 0) {
          successAccount.value = account
          step.value = 'success'
          return
        }
        window.$message.error(res.msg)
      })
      .finally(() => {
        registering.value = false
      })
  }

  const onCopyAccount = () => {
    if (!successAccount.value) return
    writeText(successAccount.value)
      .then(() => {
        window.$message.success(t('register.success.copySuccess'))
      })
      .catch(() => {
        window.$message.error(t('register.success.copyFailed'))
      })
  }

  const onStartExperience = () => {
    void backToLoginWindow()
  }

  const onGoLogin = () => {
    void backToLoginWindow()
  }

  onMounted(() => {
    nextTick(() => {
      ShowCurrentWindow()
    })
  })

  onUnmounted(() => {
    clearCodeTimer()
  })
</script>

<style scoped lang="scss">
  .register {
    --register-wave-1: rgba(var(--primary-rgb), 0.1);
    --register-wave-2: rgba(var(--primary-rgb), 0.065);
    --register-wave-3: rgba(var(--primary-rgb), 0.045);

    position: relative;
    height: 100vh;
    width: 100vw;
    display: flex;
    flex-direction: column;
    color: var(--text-color);
    overflow: hidden;
    background-color: var(--bg-secondary-color);

    &__wave {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 260px;
      overflow: hidden;
      pointer-events: none;
      user-select: none;
      z-index: 0;
      -webkit-mask-image: linear-gradient(
        to bottom,
        transparent 0%,
        rgba(0, 0, 0, 0.08) 12%,
        rgba(0, 0, 0, 0.55) 42%,
        #000 72%,
        #000 100%
      );
      mask-image: linear-gradient(
        to bottom,
        transparent 0%,
        rgba(0, 0, 0, 0.08) 12%,
        rgba(0, 0, 0, 0.55) 42%,
        #000 72%,
        #000 100%
      );
    }

    &__wave-svg {
      position: absolute;
      left: 0;
      width: 100%;
      height: 100%;
      filter: blur(0.6px);
    }

    &__wave-svg--back {
      bottom: 0;
    }

    &__wave-svg--mid {
      bottom: -6px;
    }

    &__wave-svg--front {
      bottom: -12px;
    }

    &__wave-path--1 {
      fill: var(--register-wave-1);
    }

    &__wave-path--2 {
      fill: var(--register-wave-2);
    }

    &__wave-path--3 {
      fill: var(--register-wave-3);
    }

    &__toolbar {
      position: relative;
      z-index: 1;
      height: 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 10px;
      flex-shrink: 0;
      background-color: transparent;
    }

    &__toolbar-spacer {
      flex: 1;
    }

    &__body {
      position: relative;
      z-index: 1;
      flex: 1;
      min-height: 0;
      display: grid;
      grid-template-columns: 1.05fr 0.95fr;
      background: transparent;
    }

    &__success {
      position: relative;
      z-index: 1;
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px 40px 48px;
    }

    &__success-inner {
      width: 100%;
      max-width: 560px;
      display: flex;
      flex-direction: column;
      align-items: center;
      animation: register-card-in 0.45s ease-out;
    }

    &__success-title {
      margin: 0;
      font-size: 36px;
      font-weight: 800;
      line-height: 1.25;
      color: var(--text-color);
      text-align: center;
    }

    &__success-subtitle {
      margin: 12px 0 0;
      font-size: 14px;
      line-height: 1.5;
      color: var(--text-secondary-color);
      text-align: center;
    }

    &__account-card {
      position: relative;
      width: 100%;
      max-width: 560px;
      height: 200px;
      margin-top: 32px;
      box-sizing: border-box;
      overflow: hidden;
      border-radius: 18px;
      background:
        radial-gradient(
          360px 220px at 90% 48%,
          rgba(23, 111, 255, 0.55) 0%,
          rgba(7, 80, 210, 0.2) 52%,
          rgba(0, 0, 0, 0) 78%
        ),
        linear-gradient(112deg, #063893 0%, #04358d 22%, #073e9f 52%, #0758d5 78%, #0867eb 100%);
      border: 1px solid rgba(89, 155, 255, 0.66);
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.08),
        inset 0 -1px 0 rgba(0, 17, 62, 0.18),
        0 10px 28px rgba(0, 0, 0, 0.1);
    }

    &__account-card-decor {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      user-select: none;
    }

    &__account-card-content {
      position: relative;
      z-index: 2;
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      padding: 0 36px;
      gap: 20px;
    }

    &__account-info {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      min-width: 0;
      transform: translateY(-2px);
    }

    &__account-label {
      margin-bottom: 12px;
      font-size: 15px;
      line-height: 1;
      font-weight: 400;
      color: rgba(222, 233, 255, 0.76);
      letter-spacing: 0.2px;
    }

    &__account-number {
      font-size: 34px;
      line-height: 1;
      font-weight: 700;
      color: #f7f9ff;
      letter-spacing: 1.5px;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }

    &__account-tip {
      margin-top: 14px;
      font-size: 14px;
      line-height: 1.4;
      font-weight: 400;
      color: rgba(204, 219, 247, 0.67);
      letter-spacing: 0.2px;
    }

    &__account-copy {
      flex: none;
      width: 108px;
      height: 40px;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      border: 1.5px solid rgba(225, 237, 255, 0.88);
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.005));
      color: rgba(240, 246, 255, 0.96);
      font-size: 14px;
      line-height: 1;
      font-weight: 400;
      cursor: pointer;
      outline: none;
      transform: translateY(-2px);
      transition:
        background 0.16s ease,
        border-color 0.16s ease,
        transform 0.12s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.09);
        border-color: rgba(255, 255, 255, 1);
      }

      &:active {
        background: rgba(255, 255, 255, 0.13);
        transform: translateY(-1px) scale(0.985);
      }

      &:focus-visible {
        box-shadow: 0 0 0 3px rgba(102, 170, 255, 0.23);
      }
    }

    &__success-action {
      width: 220px;
      height: 44px;
      margin-top: 32px;
      font-size: 15px;
      font-weight: 600;
      background: linear-gradient(to right, var(--primary-color), var(--primary-strong-color));

      &:not(.n-button--disabled):hover {
        background: linear-gradient(to right, var(--primary-soft-color), var(--primary-strong-color));
      }
    }

    &__hero {
      position: relative;
      display: flex;
      flex-direction: column;
      padding: 8px 40px 40px;
      overflow: hidden;
    }

    &__hero-header {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: flex-start;
      gap: 14px;
      flex-shrink: 0;
    }

    &__hero-logo {
      width: 42px;
      height: 42px;
      flex-shrink: 0;
      color: var(--primary-color);
    }

    &__hero-title {
      margin: 0;
      font-size: 28px;
      line-height: 1.25;
      font-weight: 700;
      color: var(--text-color);
    }

    &__hero-subtitle {
      margin: 6px 0 0;
      font-size: 13px;
      line-height: 1.5;
      color: var(--text-secondary-color);
    }

    &__hero-main {
      position: relative;
      z-index: 1;
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 100%;
      padding: 12px 0 28px;
    }

    &__carousel {
      width: 100%;
      max-width: 420px;
      height: 360px;
    }

    &__slide {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 8px 16px 36px;
      box-sizing: border-box;
      user-select: none;
    }

    &__slide-image {
      width: min(100%, 300px);
      max-height: 240px;
      object-fit: contain;
    }

    &__slide-title {
      margin: 22px 0 0;
      font-size: 30px;
      font-weight: 800;
      line-height: 1.3;
      letter-spacing: 2px;
      color: var(--text-color);
      text-align: center;
    }

    &__slide-title-em {
      color: var(--primary-color);
      margin-right: -2px;
    }

    &__slide-desc {
      margin: 8px 0 0;
      font-size: 13px;
      line-height: 1.5;
      color: var(--text-secondary-color);
      text-align: center;
    }

    &__copyright {
      position: absolute;
      z-index: 1;
      left: 40px;
      bottom: 16px;
      font-size: 12px;
      color: var(--text-muted-color);
      user-select: none;

      &--success {
        left: 24px;
      }
    }

    &__panel {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px 28px 20px;
    }

    &__card {
      width: 100%;
      max-width: 420px;
      padding: 28px 28px 24px;
      border-radius: 16px;
      background: var(--bg-primary-color);
      border: 1px solid var(--border-color);
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.12);
      animation: register-card-in 0.45s ease-out;
    }

    &__card-header {
      margin-bottom: 18px;
    }

    &__card-title {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      line-height: 1.3;
    }

    &__card-subtitle {
      margin: 6px 0 0;
      font-size: 13px;
      color: var(--text-secondary-color);
    }

    &__fields {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    &__field-icon {
      width: 16px;
      height: 16px;
      color: var(--text-secondary-color);
    }

    &__account-suffix {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    &__check-btn {
      font-size: 12px;
      padding: 0 4px;
      height: auto;
      white-space: nowrap;
    }

    &__tip-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      border: none;
      background: transparent;
      cursor: pointer;
      color: var(--text-secondary-color);

      &:hover {
        color: var(--primary-color);
      }
    }

    &__tip-text {
      font-size: 12px;
      line-height: 1.5;
      color: var(--text-secondary-color);
    }

    &__field-error {
      margin: 6px 0 0;
      padding-left: 2px;
      font-size: 12px;
      line-height: 1.4;
      color: var(--red);
    }

    &__code-btn {
      font-size: 12px;
      padding: 0 4px;
      height: auto;
      white-space: nowrap;
    }

    &__terms {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 16px;
      user-select: none;
    }

    &__submit {
      width: 100%;
      height: 42px;
      margin-top: 12px;
      font-size: 15px;
      background: linear-gradient(to right, var(--primary-color), var(--primary-strong-color));

      &:not(.n-button--disabled):hover {
        background: linear-gradient(to right, var(--primary-soft-color), var(--primary-strong-color));
      }
    }

    &__login-link {
      margin-top: 14px;
      text-align: center;
      font-size: 13px;
      color: var(--text-secondary-color);
      user-select: none;
    }

    &__login-action {
      margin-left: 4px;
      color: var(--primary-color);
      cursor: pointer;

      &:hover {
        opacity: 0.85;
      }
    }

    :deep(.n-input) {
      --n-color: var(--input-soft-bg);
      --n-color-focus: var(--input-soft-bg);
      --n-color-disabled: var(--input-soft-bg);
      background-color: var(--input-soft-bg);

      .n-input__prefix {
        margin-right: 8px;
      }

      .n-input__input-el,
      .n-input__textarea-el {
        height: 42px;
        line-height: 42px;
        background-color: transparent !important;
        color: var(--text-color);
      }

      .n-input__input-el:-webkit-autofill,
      .n-input__input-el:-webkit-autofill:hover,
      .n-input__input-el:-webkit-autofill:focus {
        -webkit-text-fill-color: var(--text-color);
        box-shadow: 0 0 0 1000px var(--input-soft-bg) inset;
        transition: background-color 99999s ease-out;
      }
    }
  }

  html[data-theme='dark'] .register {
    --register-wave-1: rgba(var(--primary-rgb), 0.03);
    --register-wave-2: rgba(var(--primary-rgb), 0.02);
    --register-wave-3: rgba(var(--primary-rgb), 0.012);
  }

  @keyframes register-card-in {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
