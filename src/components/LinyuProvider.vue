<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <n-message-provider :max="3" container-style="word-break: break-all !important">
      <slot></slot>
      <naive-component-content />
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
  import { useSystemSettingStore } from '@/stores/systemSetting'
  import { GlobalThemeOverrides } from 'naive-ui'

  let systemSetting = useSystemSettingStore()

  const NaiveComponentContent = defineComponent({
    name: 'NaiveComponentContent',
    setup() {
      window.$message = useMessage()
    },
    render() {
      return h('div')
    }
  })

  const themeOverrides: GlobalThemeOverrides = {
    Button: {
      borderRadius: '5px',
      // 主要
      colorPrimary: 'var(--primary-color)',
      colorPressedPrimary: 'var(--primary-color)',
      colorFocusPrimary: 'rgba(var(--primary-rgb),0.8)',
      colorDisabledPrimary: 'rgba(var(--primary-rgb),0.8)',
      colorHoverPrimary: 'rgba(var(--primary-rgb),0.8)',
      borderPrimary: '1px solid var(--primary-color)',
      borderHoverPrimary: '1px solid var(--primary-color)',
      borderPressedPrimary: '1px solid var(--primary-color)',
      borderFocusPrimary: '1px solid var(--primary-color)',
      borderDisabledPrimary: '1px solid var(--primary-color)',
      textColorPrimary: '#FFF',
      textColorPressedPrimary: '#FFF',
      textColorFocusPrimary: '#FFF',
      textColorDisabledPrimary: '#FFF',
      textColorHoverPrimary: '#FFF',
      rippleColorPrimary: 'var(--primary-color)',
      // 默认
      color: 'var(--button-soft-bg)',
      colorPressed: 'var(--button-soft-bg)',
      colorFocus: 'color-mix(in srgb, var(--button-soft-bg) 60%, transparent)',
      colorDisabled: 'color-mix(in srgb, var(--button-soft-bg) 60%, transparent)',
      colorHover: 'color-mix(in srgb, var(--button-soft-bg) 60%, transparent)',
      border: '1px solid var(--button-soft-bg)',
      borderHover: '1px solid var(--button-soft-bg)',
      borderPressed: '1px solid var(--button-soft-bg)',
      borderFocus: '1px solid var(--button-soft-bg)',
      borderDisabled: '1px solid var(--button-soft-bg)',
      textColor: 'var(--text-color)',
      textColorPressed: 'var(--text-color)',
      textColorFocus: 'var(--text-color)',
      textColorDisabled: 'var(--text-color)',
      textColorHover: 'var(--text-color)',
      rippleColor: 'var(--button-soft-bg)'
    },
    Checkbox: {
      border: '1px solid var(--border-color)',
      borderFocus: '1px solid var(--primary-color)',
      borderChecked: '1px solid var(--primary-color)',
      boxShadowFocus: '0 0 0 1px rgba(var(--primary-rgb),0.3)',
      colorChecked: 'var(--primary-color)',
      color: 'var(--button-soft-bg)'
    },
    Input: {
      border: '1px solid var(--border-color)',
      borderRadius: '5px',
      borderFocus: '1px solid var(--primary-color)',
      borderHover: '1px solid var(--primary-color)',
      loadingColor: 'var(--primary-color)',
      caretColor: 'var(--primary-color)',
      boxShadowFocus: '0 0 0 1px rgba(var(--primary-rgb),0.3)',
      placeholderColor: 'var(--text-secondary-color)',
      textColor: 'var(--text-color)',
      color: 'var(--input-soft-bg)',
      colorFocus: 'var(--input-soft-bg)'
    },
    Message: {
      maxWidth: '90vw',
      colorError: 'var(--bg-muted-color)',
      textColorError: 'var(--text-color)',
      boxShadowError: '0 0 0 1px rgba(var(--primary-rgb),0.3)',
      colorSuccess: 'var(--bg-muted-color)',
      textColorSuccess: 'var(--text-color)',
      boxShadowSuccess: '0 0 0 1px rgba(var(--primary-rgb),0.3)'
    },
    Divider: {
      color: 'var(--divider-color)'
    },
    Dropdown: {
      color: 'var(--bg-muted-color)',
      optionTextColor: 'var(--text-color)',
      optionTextColorHover: 'var(--primary-color)',
      optionColorHover: 'var(--bg-muted-color)',
      dividerColor: 'var(--divider-color)'
    },
    Popover: {
      color: 'var(--bg-muted-color)',
      textColor: 'var(--text-color)',
      border: '1px solid var(--border-color)'
    },
    Badge: {
      color: 'var(--red)',
      fontSize: '10px'
    },
    Scrollbar: {
      width: '6px',
      color: 'color-mix(in srgb, var(--scrollbar-color) 50%, transparent)',
      colorHover: 'color-mix(in srgb, var(--scrollbar-color) 50%, transparent)'
    }
  }

  let media = window.matchMedia('(prefers-color-scheme: dark)')

  const handleThememChange = () => {
    systemSetting.sycnOsTheme()
  }

  onMounted(() => {
    media.addEventListener('change', handleThememChange)
  })

  onBeforeUnmount(() => {
    media?.removeEventListener('change', handleThememChange)
  })
</script>
<style></style>
