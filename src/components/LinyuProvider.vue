<template>
  <NConfigProvider :theme-overrides="themeOverrides">
    <slot></slot>
  </NConfigProvider>
</template>

<script setup lang="ts">
  import { GlobalThemeOverrides } from 'naive-ui'

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
      colorFocus: 'rgba(var(--button-soft-bg),0.8)',
      colorDisabled: 'rgba(var(--button-soft-bg),0.8)',
      colorHover: 'rgba(var(--button-soft-bg),0.8)',
      border: '1px solid var(--button-soft-bg)',
      borderHover: '1px solid var(--button-soft-bg)',
      borderPressed: '1px solid var(--button-soft-bg)',
      borderFocus: '1px solid var(--button-soft-bg)',
      borderDisabled: '1px solid var(--button-soft-bg)',
      textColor: '#000',
      textColorPressed: '#000',
      textColorFocus: '#000',
      textColorDisabled: '#000',
      textColorHover: '#000',
      rippleColor: 'var(--button-soft-bg)'
    },
    Checkbox: {
      borderFocus: '1px solid var(--primary-color)',
      borderChecked: '1px solid var(--primary-color)',
      boxShadowFocus: '0 0 0 1px rgba(var(--primary-rgb),0.3)',
      colorChecked: 'var(--primary-color)'
    },
    Input: {
      borderRadius: '5px',
      borderFocus: '1px solid var(--primary-color)',
      borderHover: '1px solid var(--primary-color)',
      loadingColor: 'var(--primary-color)',
      caretColor: 'var(--primary-color)',
      boxShadowFocus: '0 0 0 1px rgba(var(--primary-rgb),0.3)'
    }
  }
</script>
