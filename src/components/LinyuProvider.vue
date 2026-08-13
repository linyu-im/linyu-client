<template>
  <n-config-provider :theme-overrides="themeOverrides" :locale="naiveLocale" :date-locale="naiveDateLocale">
    <n-dialog-provider>
      <n-message-provider :max="3" container-style="word-break: break-all !important">
        <n-modal-provider>
          <slot></slot>
          <naive-component-content />
        </n-modal-provider>
      </n-message-provider>
    </n-dialog-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
  import { LangEnum } from '@/constants/system'
  import { useSystemSettingStore } from '@/stores/app/systemSetting'
  import { dateEnUS, dateZhCN, enUS, type GlobalThemeOverrides, zhCN } from 'naive-ui'
  import { useI18n } from 'vue-i18n'

  let systemSetting = useSystemSettingStore()
  const { locale } = useI18n()

  const naiveLocale = computed(() => (locale.value === LangEnum.EN ? enUS : zhCN))
  const naiveDateLocale = computed(() => (locale.value === LangEnum.EN ? dateEnUS : dateZhCN))

  const NaiveComponentContent = defineComponent({
    name: 'NaiveComponentContent',
    setup() {
      window.$message = useMessage()
    },
    render() {
      return h('div')
    }
  })

  const warningButtonPeers = {
    colorWarning: 'var(--primary-color)',
    colorHoverWarning: 'rgba(var(--primary-rgb), 0.8)',
    colorPressedWarning: 'rgba(var(--primary-rgb), 0.8)',
    colorFocusWarning: 'rgba(var(--primary-rgb), 0.8)',
    colorDisabledWarning: 'rgba(var(--primary-rgb), 0.6)',
    borderWarning: '1px solid var(--primary-color)',
    borderHoverWarning: '1px solid var(--primary-color)',
    borderPressedWarning: '1px solid var(--primary-color)',
    borderFocusWarning: '1px solid var(--primary-color)',
    borderDisabledWarning: '1px solid rgba(var(--primary-rgb), 0.6)',
    textColorWarning: '#FFF',
    textColorHoverWarning: '#FFF',
    textColorPressedWarning: '#FFF',
    textColorFocusWarning: '#FFF',
    textColorDisabledWarning: '#FFF',
    rippleColorWarning: 'var(--primary-color)',
    textColorGhostWarning: 'var(--primary-color)',
    textColorGhostHoverWarning: 'var(--primary-color)',
    textColorGhostPressedWarning: 'var(--primary-color)',
    textColorGhostFocusWarning: 'var(--primary-color)',
    textColorGhostDisabledWarning: 'var(--primary-color)',
    textColorTextWarning: 'var(--primary-color)',
    textColorTextHoverWarning: 'var(--primary-color)',
    textColorTextPressedWarning: 'var(--primary-color)',
    textColorTextFocusWarning: 'var(--primary-color)',
    textColorTextDisabledWarning: 'var(--text-secondary-color)'
  }

  const infoSuccessButtonPeers = {
    colorInfo: 'var(--primary-color)',
    colorHoverInfo: 'rgba(var(--primary-rgb), 0.8)',
    colorPressedInfo: 'rgba(var(--primary-rgb), 0.8)',
    colorFocusInfo: 'rgba(var(--primary-rgb), 0.8)',
    colorDisabledInfo: 'rgba(var(--primary-rgb), 0.6)',
    borderInfo: '1px solid var(--primary-color)',
    borderHoverInfo: '1px solid var(--primary-color)',
    borderPressedInfo: '1px solid var(--primary-color)',
    borderFocusInfo: '1px solid var(--primary-color)',
    borderDisabledInfo: '1px solid rgba(var(--primary-rgb), 0.6)',
    textColorInfo: '#FFF',
    textColorHoverInfo: '#FFF',
    textColorPressedInfo: '#FFF',
    textColorFocusInfo: '#FFF',
    textColorDisabledInfo: '#FFF',
    rippleColorInfo: 'var(--primary-color)',
    colorSuccess: 'var(--primary-color)',
    colorHoverSuccess: 'rgba(var(--primary-rgb), 0.8)',
    colorPressedSuccess: 'rgba(var(--primary-rgb), 0.8)',
    colorFocusSuccess: 'rgba(var(--primary-rgb), 0.8)',
    colorDisabledSuccess: 'rgba(var(--primary-rgb), 0.6)',
    borderSuccess: '1px solid var(--primary-color)',
    borderHoverSuccess: '1px solid var(--primary-color)',
    borderPressedSuccess: '1px solid var(--primary-color)',
    borderFocusSuccess: '1px solid var(--primary-color)',
    borderDisabledSuccess: '1px solid rgba(var(--primary-rgb), 0.6)',
    textColorSuccess: '#FFF',
    textColorHoverSuccess: '#FFF',
    textColorPressedSuccess: '#FFF',
    textColorFocusSuccess: '#FFF',
    textColorDisabledSuccess: '#FFF',
    rippleColorSuccess: 'var(--primary-color)'
  }

  const ghostButtonPeers = {
    textColorGhost: 'var(--text-color)',
    textColorGhostHover: 'var(--text-color)',
    textColorGhostPressed: 'var(--text-color)',
    textColorGhostFocus: 'var(--text-color)',
    textColorGhostDisabled: 'var(--text-secondary-color)',
    textColorText: 'var(--text-color)',
    textColorTextHover: 'var(--text-color)',
    textColorTextPressed: 'var(--text-color)',
    textColorTextFocus: 'var(--text-color)',
    textColorTextDisabled: 'var(--text-secondary-color)',
    textColorTextPrimary: 'var(--primary-color)',
    textColorTextHoverPrimary: 'var(--primary-soft-color)',
    textColorTextPressedPrimary: 'var(--primary-strong-color)',
    textColorTextFocusPrimary: 'var(--primary-color)',
    textColorTextDisabledPrimary: 'var(--text-secondary-color)',
    textColorGhostPrimary: 'var(--primary-color)',
    textColorGhostHoverPrimary: 'var(--primary-soft-color)',
    textColorGhostPressedPrimary: 'var(--primary-strong-color)',
    textColorGhostFocusPrimary: 'var(--primary-color)',
    textColorGhostDisabledPrimary: 'var(--text-secondary-color)'
  }

  const defaultButtonPeers = {
    borderRadius: '5px',
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
    rippleColor: 'var(--button-soft-bg)',
    colorPrimary: 'var(--primary-color)',
    colorHoverPrimary: 'rgba(var(--primary-rgb), 0.8)',
    colorPressedPrimary: 'rgba(var(--primary-rgb), 0.8)',
    colorFocusPrimary: 'rgba(var(--primary-rgb), 0.8)',
    borderPrimary: '1px solid var(--primary-color)',
    borderHoverPrimary: '1px solid var(--primary-color)',
    borderPressedPrimary: '1px solid var(--primary-color)',
    borderFocusPrimary: '1px solid var(--primary-color)',
    textColorPrimary: '#FFF',
    textColorHoverPrimary: '#FFF',
    textColorPressedPrimary: '#FFF',
    textColorFocusPrimary: '#FFF',
    colorError: 'var(--red)',
    colorHoverError: 'color-mix(in srgb, var(--red) 88%, #000)',
    colorPressedError: 'color-mix(in srgb, var(--red) 88%, #000)',
    colorFocusError: 'color-mix(in srgb, var(--red) 88%, #000)',
    borderError: '1px solid var(--red)',
    borderHoverError: '1px solid var(--red)',
    borderPressedError: '1px solid var(--red)',
    borderFocusError: '1px solid var(--red)',
    textColorError: '#FFF',
    textColorHoverError: '#FFF',
    textColorPressedError: '#FFF',
    textColorFocusError: '#FFF',
    ...ghostButtonPeers,
    ...warningButtonPeers,
    ...infoSuccessButtonPeers
  }

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
      rippleColor: 'var(--button-soft-bg)',
      // 危险 / 错误
      colorError: 'var(--red)',
      colorHoverError: 'color-mix(in srgb, var(--red) 88%, #000)',
      colorPressedError: 'color-mix(in srgb, var(--red) 88%, #000)',
      colorFocusError: 'color-mix(in srgb, var(--red) 88%, #000)',
      colorDisabledError: 'color-mix(in srgb, var(--red) 60%, transparent)',
      borderError: '1px solid var(--red)',
      borderHoverError: '1px solid var(--red)',
      borderPressedError: '1px solid var(--red)',
      borderFocusError: '1px solid var(--red)',
      borderDisabledError: '1px solid color-mix(in srgb, var(--red) 60%, transparent)',
      textColorError: '#FFF',
      textColorHoverError: '#FFF',
      textColorPressedError: '#FFF',
      textColorFocusError: '#FFF',
      textColorDisabledError: '#FFF',
      rippleColorError: 'var(--red)',
      // ghost / text 取消键等：中性文字，避免串 success/warning 色
      textColorGhost: 'var(--text-color)',
      textColorGhostHover: 'var(--text-color)',
      textColorGhostPressed: 'var(--text-color)',
      textColorGhostFocus: 'var(--text-color)',
      textColorGhostDisabled: 'var(--text-secondary-color)',
      textColorText: 'var(--text-color)',
      textColorTextHover: 'var(--text-color)',
      textColorTextPressed: 'var(--text-color)',
      textColorTextFocus: 'var(--text-color)',
      textColorTextDisabled: 'var(--text-secondary-color)',
      // text / ghost + primary：验证码等文字按钮走主题色
      textColorTextPrimary: 'var(--primary-color)',
      textColorTextHoverPrimary: 'var(--primary-soft-color)',
      textColorTextPressedPrimary: 'var(--primary-strong-color)',
      textColorTextFocusPrimary: 'var(--primary-color)',
      textColorTextDisabledPrimary: 'var(--text-secondary-color)',
      textColorGhostPrimary: 'var(--primary-color)',
      textColorGhostHoverPrimary: 'var(--primary-soft-color)',
      textColorGhostPressedPrimary: 'var(--primary-strong-color)',
      textColorGhostFocusPrimary: 'var(--primary-color)',
      textColorGhostDisabledPrimary: 'var(--text-secondary-color)',
      // warning 实心钮与主题色对齐（dialog.warning 确认钮用 type=warning）
      colorWarning: 'var(--primary-color)',
      colorHoverWarning: 'rgba(var(--primary-rgb), 0.8)',
      colorPressedWarning: 'rgba(var(--primary-rgb), 0.8)',
      colorFocusWarning: 'rgba(var(--primary-rgb), 0.8)',
      colorDisabledWarning: 'rgba(var(--primary-rgb), 0.6)',
      borderWarning: '1px solid var(--primary-color)',
      borderHoverWarning: '1px solid var(--primary-color)',
      borderPressedWarning: '1px solid var(--primary-color)',
      borderFocusWarning: '1px solid var(--primary-color)',
      borderDisabledWarning: '1px solid rgba(var(--primary-rgb), 0.6)',
      textColorWarning: '#FFF',
      textColorHoverWarning: '#FFF',
      textColorPressedWarning: '#FFF',
      textColorFocusWarning: '#FFF',
      textColorDisabledWarning: '#FFF',
      rippleColorWarning: 'var(--primary-color)'
    },
    Carousel: {
      dotColor: 'rgba(var(--primary-rgb), 0.28)',
      dotColorActive: 'var(--primary-color)',
      dotColorFocus: 'rgba(var(--primary-rgb), 0.55)',
      dotSize: '8px',
      dotLineWidth: '14px',
      dotLineWidthActive: '24px',
      arrowColor: 'var(--text-secondary-color)'
    },
    Dialog: {
      color: 'var(--bg-primary-color)',
      textColor: 'var(--text-secondary-color)',
      titleTextColor: 'var(--text-color)',
      titleFontSize: '16px',
      titleFontWeight: '500',
      border: '1px solid var(--border-color)',
      borderRadius: '8px',
      padding: '20px 24px',
      iconColorWarning: 'var(--primary-color)',
      iconColorInfo: 'var(--primary-color)',
      iconColorSuccess: 'var(--primary-color)',
      iconColorError: 'var(--red)',
      peers: {
        Button: defaultButtonPeers
      }
    },
    Modal: {
      color: 'var(--bg-primary-color)',
      boxShadow: '0 8px 28px color-mix(in srgb, #000 14%, transparent)',
      colorModal: 'color-mix(in srgb, #000 35%, transparent)',
      peers: {
        Dialog: {
          peers: {
            Button: defaultButtonPeers
          }
        }
      }
    },
    Card: {
      color: 'var(--bg-primary-color)',
      colorModal: 'var(--bg-primary-color)',
      colorPopover: 'var(--bg-muted-color)',
      colorEmbedded: 'var(--bg-secondary-color)',
      colorEmbeddedModal: 'var(--bg-secondary-color)',
      textColor: 'var(--text-color)',
      titleTextColor: 'var(--text-color)',
      borderColor: 'var(--border-color)',
      actionColor: 'var(--bg-secondary-color)',
      closeIconColor: 'var(--text-secondary-color)',
      closeIconColorHover: 'var(--text-color)',
      closeColorHover: 'var(--bg-muted-color)',
      closeColorPressed: 'var(--bg-muted-color)'
    },
    Tabs: {
      tabTextColorLine: 'var(--text-secondary-color)',
      tabTextColorActiveLine: 'var(--primary-color)',
      tabTextColorHoverLine: 'var(--primary-color)',
      barColor: 'var(--primary-color)',
      paneTextColor: 'var(--text-color)'
    },
    Progress: {
      fillColor: 'var(--primary-color)',
      fillColorInfo: 'var(--primary-color)',
      fillColorSuccess: 'var(--primary-color)',
      fillColorWarning: 'var(--primary-color)',
      lineBgProcessing: 'var(--primary-color)',
      railColor: 'var(--bg-muted-color)',
      textColorCircle: 'var(--text-muted-color)',
      iconColor: 'var(--text-muted-color)'
    },
    Form: {
      labelTextColor: 'var(--text-color)',
      asteriskColor: 'var(--red)',
      feedbackTextColor: 'var(--text-secondary-color)',
      feedbackTextColorError: 'var(--red)',
      labelFontWeight: '500'
    },
    Drawer: {
      color: 'var(--bg-secondary-color)',
      textColor: 'var(--text-color)',
      titleTextColor: 'var(--text-color)',
      titleFontSize: '16px',
      titleFontWeight: '600',
      headerBorderBottom: '1px solid color-mix(in srgb, var(--divider-color) 88%, transparent)',
      footerBorderTop: '1px solid color-mix(in srgb, var(--divider-color) 80%, transparent)',
      boxShadow: '-8px 0 28px color-mix(in srgb, #000 16%, transparent)',
      closeIconColor: 'var(--text-secondary-color)',
      closeIconColorHover: 'var(--text-color)',
      closeIconColorPressed: 'var(--text-color)',
      closeColorHover: 'color-mix(in srgb, var(--bg-primary-color) 85%, transparent)',
      closeColorPressed: 'var(--bg-primary-color)',
      closeBorderRadius: '6px',
      peers: {
        Scrollbar: {
          width: '6px',
          color: 'color-mix(in srgb, var(--scrollbar-color) 90%, transparent)',
          colorHover: 'color-mix(in srgb, var(--scrollbar-color) 90%, transparent)'
        }
      }
    },
    Collapse: {
      titleFontSize: '13px',
      titleFontWeight: '500',
      titleTextColor: 'var(--text-color)',
      textColor: 'var(--text-color)',
      arrowColor: 'var(--text-secondary-color)',
      dividerColor: 'color-mix(in srgb, var(--divider-color) 80%, transparent)'
    },
    Checkbox: {
      border: '1px solid var(--border-color)',
      borderFocus: '1px solid var(--primary-color)',
      borderChecked: '1px solid var(--primary-color)',
      boxShadowFocus: '0 0 0 1px rgba(var(--primary-rgb),0.3)',
      colorChecked: 'var(--primary-color)',
      color: 'var(--button-soft-bg)',
      textColor: 'var(--text-muted-color)',
      textColorDisabled: 'var(--text-muted-color)'
    },
    Radio: {
      boxShadow: 'inset 0 0 0 1px var(--border-color)',
      boxShadowHover: 'inset 0 0 0 1px var(--primary-color)',
      boxShadowActive: 'inset 0 0 0 1px var(--primary-color)',
      boxShadowFocus: 'inset 0 0 0 1px var(--primary-color), 0 0 0 2px rgba(var(--primary-rgb), 0.2)',
      boxShadowDisabled: 'inset 0 0 0 1px var(--border-color)',
      color: 'var(--button-soft-bg)',
      colorDisabled: 'color-mix(in srgb, var(--button-soft-bg) 60%, transparent)',
      colorActive: 'var(--primary-color)',
      dotColorActive: '#FFF',
      dotColorDisabled: 'var(--border-color)',
      textColor: 'var(--text-color)',
      textColorDisabled: 'var(--text-secondary-color)',
      buttonBorderColor: 'var(--border-color)',
      buttonBorderColorActive: 'var(--primary-color)',
      buttonBorderColorHover: 'var(--border-color)',
      buttonColor: 'var(--bg-primary-color)',
      buttonColorActive: 'var(--bg-primary-color)',
      buttonTextColor: 'var(--text-color)',
      buttonTextColorActive: 'var(--primary-color)',
      buttonTextColorHover: 'var(--primary-color)',
      buttonBoxShadowFocus: 'inset 0 0 0 1px var(--primary-color), 0 0 0 2px rgba(var(--primary-rgb), 0.3)',
      buttonBoxShadowHover: 'inset 0 0 0 1px transparent',
      buttonBoxShadow: 'inset 0 0 0 1px transparent'
    },
    Input: {
      border: '1px solid var(--border-color)',
      borderRadius: '5px',
      borderFocus: '1px solid var(--primary-color)',
      borderHover: '1px solid var(--primary-color)',
      borderDisabled: '1px solid var(--border-color)',
      loadingColor: 'var(--primary-color)',
      caretColor: 'var(--primary-color)',
      boxShadowFocus: '0 0 0 1px rgba(var(--primary-rgb),0.3)',
      placeholderColor: 'var(--text-secondary-color)',
      placeholderColorDisabled: 'var(--text-muted-color)',
      textColor: 'var(--text-color)',
      textColorDisabled: 'var(--text-secondary-color)',
      countTextColor: 'var(--text-secondary-color)',
      countTextColorDisabled: 'var(--text-muted-color)',
      color: 'var(--input-soft-bg)',
      colorFocus: 'var(--input-soft-bg)',
      colorDisabled: 'var(--input-soft-bg)',
      colorFocusWarning: 'var(--input-soft-bg)',
      colorFocusError: 'var(--input-soft-bg)',
      borderWarning: '1px solid var(--red)',
      borderHoverWarning: '1px solid var(--red)',
      borderFocusWarning: '1px solid var(--red)',
      borderError: '1px solid var(--red)',
      borderHoverError: '1px solid var(--red)',
      borderFocusError: '1px solid var(--red)',
      boxShadowFocusWarning: '0 0 0 1px color-mix(in srgb, var(--red) 30%, transparent)',
      boxShadowFocusError: '0 0 0 1px color-mix(in srgb, var(--red) 30%, transparent)',
      caretColorWarning: 'var(--red)',
      caretColorError: 'var(--red)',
      loadingColorWarning: 'var(--red)',
      loadingColorError: 'var(--red)',
      iconColor: 'var(--text-secondary-color)',
      iconColorDisabled: 'var(--text-muted-color)',
      iconColorHover: 'var(--text-color)',
      iconColorPressed: 'var(--text-color)',
      clearColor: 'var(--text-secondary-color)',
      clearColorHover: 'var(--text-color)',
      clearColorPressed: 'var(--text-color)',
      suffixTextColor: 'var(--text-secondary-color)'
    },
    Message: {
      maxWidth: '90vw',
      colorError: 'var(--bg-muted-color)',
      textColorError: 'var(--text-color)',
      boxShadowError: '0 0 0 1px rgba(var(--primary-rgb),0.3)',
      colorWarning: 'var(--bg-muted-color)',
      textColorWarning: 'var(--text-color)',
      boxShadowWarning: '0 0 0 1px rgba(var(--primary-rgb),0.3)',
      colorSuccess: 'var(--bg-muted-color)',
      textColorSuccess: 'var(--text-color)',
      boxShadowSuccess: '0 0 0 1px rgba(var(--primary-rgb),0.3)',
      colorInfo: 'var(--bg-muted-color)',
      textColorInfo: 'var(--text-color)',
      boxShadowInfo: '0 0 0 1px rgba(var(--primary-rgb),0.3)',
      iconColorInfo: 'var(--primary-color)',
      iconColorWarning: 'var(--primary-color)',
      iconColorSuccess: 'var(--primary-color)'
    },
    Divider: {
      color: 'var(--divider-color)'
    },
    Dropdown: {
      color: 'var(--bg-muted-color)',
      optionTextColor: 'var(--text-color)',
      optionTextColorHover: 'var(--primary-color)',
      optionTextColorActive: 'var(--primary-color)',
      optionTextColorChildActive: 'var(--primary-color)',
      optionColorHover: 'var(--bg-tertiary-color)',
      optionColorActive: 'var(--bg-tertiary-color)',
      dividerColor: 'var(--divider-color)'
    },
    Popover: {
      color: 'var(--bg-muted-color)',
      textColor: 'var(--text-color)',
      border: '1px solid var(--border-color)'
    },
    Popconfirm: {
      // 与 Dialog 警告图标一致，使用主题色
      iconColor: 'var(--primary-color)',
      peers: {
        Button: defaultButtonPeers,
        Popover: {
          color: 'var(--bg-muted-color)',
          textColor: 'var(--text-color)'
        }
      }
    },
    Badge: {
      color: 'var(--red)',
      fontSize: '10px'
    },
    Scrollbar: {
      width: '6px',
      color: 'color-mix(in srgb, var(--scrollbar-color) 90%, transparent)',
      colorHover: 'color-mix(in srgb, var(--scrollbar-color) 90%, transparent)'
    },
    Spin: {
      color: 'var(--primary-color)'
    },
    Breadcrumb: {
      itemTextColor: 'var(--text-color)',
      itemTextColorHover: 'var(--primary-color)',
      separatorColor: 'var(--text-muted-color)'
    },
    Switch: {
      railColor: 'color-mix(in srgb, var(--border-color) 80%, transparent)',
      railColorActive: 'var(--primary-color)',
      buttonColor: '#FFF',
      loadingColor: 'var(--primary-color)',
      iconColor: 'var(--text-secondary-color)',
      boxShadowFocus: '0 0 0 2px rgba(var(--primary-rgb), 0.28)'
    },
    Select: {
      peers: {
        InternalSelection: {
          borderRadius: '8px',
          heightSmall: '28px',
          heightMedium: '34px',
          textColor: 'var(--text-color)',
          placeholderColor: 'var(--text-secondary-color)',
          color: 'var(--input-soft-bg)',
          colorActive: 'var(--input-soft-bg)',
          colorDisabled: 'var(--input-soft-bg)',
          border: '1px solid color-mix(in srgb, var(--border-color) 75%, transparent)',
          borderHover: '1px solid color-mix(in srgb, var(--border-color) 75%, transparent)',
          borderActive: '1px solid var(--primary-color)',
          borderFocus: '1px solid var(--primary-color)',
          boxShadowHover: 'none',
          boxShadowActive: 'none',
          boxShadowFocus: '0 0 0 1px rgba(var(--primary-rgb), 0.28)',
          arrowColor: 'var(--text-secondary-color)',
          arrowColorDisabled: 'var(--text-secondary-color)',
          caretColor: 'var(--primary-color)',
          loadingColor: 'var(--primary-color)'
        },
        InternalSelectMenu: {
          borderRadius: '8px',
          color: 'var(--bg-muted-color)',
          optionTextColor: 'var(--text-color)',
          optionTextColorActive: 'var(--primary-color)',
          optionTextColorPressed: 'var(--primary-color)',
          optionColorPending: 'var(--bg-tertiary-color)',
          optionColorActive: 'var(--bg-tertiary-color)',
          optionColorActivePending: 'var(--bg-tertiary-color)',
          optionCheckColor: 'var(--primary-color)',
          groupHeaderTextColor: 'var(--text-secondary-color)',
          actionDividerColor: 'var(--divider-color)'
        }
      }
    },
    DynamicTags: {
      peers: {
        Input: {
          border: '1px solid var(--border-color)',
          borderFocus: '1px solid var(--primary-color)',
          borderHover: '1px solid var(--primary-color)',
          borderDisabled: '1px solid var(--border-color)',
          boxShadowFocus: '0 0 0 1px rgba(var(--primary-rgb),0.3)',
          caretColor: 'var(--primary-color)',
          color: 'var(--input-soft-bg)',
          colorFocus: 'var(--input-soft-bg)',
          colorDisabled: 'var(--input-soft-bg)',
          textColor: 'var(--text-color)',
          textColorDisabled: 'var(--text-secondary-color)',
          placeholderColor: 'var(--text-secondary-color)',
          placeholderColorDisabled: 'var(--text-muted-color)'
        },
        Button: defaultButtonPeers
      }
    },
    Tag: {
      borderRadius: '4px',
      heightSmall: '24px',
      fontSizeSmall: '12px',
      color: 'rgba(var(--primary-rgb), 0.14)',
      textColor: 'var(--primary-color)',
      border: '1px solid rgba(var(--primary-rgb), 0.36)',
      colorBordered: 'rgba(var(--primary-rgb), 0.14)',
      textColorBordered: 'var(--primary-color)',
      borderBordered: '1px solid rgba(var(--primary-rgb), 0.36)',
      closeIconColor: 'var(--primary-color)',
      closeIconColorHover: 'var(--primary-strong-color)',
      closeIconColorPressed: 'var(--primary-strong-color)',
      closeIconSizeSmall: '12px'
    },
    DatePicker: {
      panelColor: 'var(--bg-muted-color)',
      panelTextColor: 'var(--text-color)',
      itemTextColor: 'var(--text-color)',
      itemTextColorDisabled: 'var(--text-muted-color)',
      itemTextColorCurrent: 'var(--primary-color)',
      itemTextColorActive: '#FFF',
      itemColorActive: 'var(--primary-color)',
      itemColorIncluded: 'color-mix(in srgb, var(--primary-color) 10%, transparent)',
      itemColorHover: 'color-mix(in srgb, var(--icon-hover-color) 85%, transparent)',
      itemBorderRadius: '8px',
      panelBorderRadius: '10px',
      iconColor: 'var(--text-secondary-color)',
      iconColorDisabled: 'var(--text-secondary-color)',
      calendarTitleTextColor: 'var(--text-color)',
      calendarTitleColorHover: 'color-mix(in srgb, var(--icon-hover-color) 85%, transparent)',
      calendarDaysTextColor: 'var(--text-secondary-color)',
      panelHeaderDividerColor: 'var(--divider-color)',
      calendarDaysDividerColor: 'var(--divider-color)',
      calendarDividerColor: 'var(--divider-color)',
      panelActionDividerColor: 'var(--divider-color)',
      peers: {
        Input: {
          border: '1px solid color-mix(in srgb, var(--border-color) 75%, transparent)',
          borderRadius: '8px',
          borderFocus: '1px solid var(--primary-color)',
          borderHover: '1px solid color-mix(in srgb, var(--border-color) 75%, transparent)',
          loadingColor: 'var(--primary-color)',
          caretColor: 'var(--primary-color)',
          boxShadowFocus: '0 0 0 1px rgba(var(--primary-rgb), 0.28)',
          placeholderColor: 'var(--text-secondary-color)',
          textColor: 'var(--text-color)',
          color: 'var(--input-soft-bg)',
          colorFocus: 'var(--input-soft-bg)',
          iconColor: 'var(--text-secondary-color)',
          iconColorHover: 'var(--text-secondary-color)',
          iconColorPressed: 'var(--text-secondary-color)',
          clearColor: 'var(--text-secondary-color)',
          clearColorHover: 'var(--text-color)',
          clearColorPressed: 'var(--text-color)'
        },
        Button: {
          colorPrimary: 'var(--primary-color)',
          colorHoverPrimary: 'rgba(var(--primary-rgb), 0.8)',
          colorPressedPrimary: 'rgba(var(--primary-rgb), 0.8)',
          colorFocusPrimary: 'rgba(var(--primary-rgb), 0.8)',
          borderPrimary: '1px solid var(--primary-color)',
          borderHoverPrimary: '1px solid var(--primary-color)',
          borderPressedPrimary: '1px solid var(--primary-color)',
          borderFocusPrimary: '1px solid var(--primary-color)',
          textColorPrimary: '#FFF',
          textColorHoverPrimary: '#FFF',
          textColorPressedPrimary: '#FFF',
          textColorFocusPrimary: '#FFF'
        },
        Scrollbar: {
          width: '6px',
          color: 'color-mix(in srgb, var(--scrollbar-color) 90%, transparent)',
          colorHover: 'color-mix(in srgb, var(--scrollbar-color) 90%, transparent)'
        }
      }
    },
    Slider: {
      handleColor: 'var(--primary-color)',
      fillColor: 'var(--primary-color)',
      fillColorHover: 'var(--primary-color)',
      handleSize: '14px',
      railColor: 'color-mix(in srgb, var(--border-color) 70%, transparent)',
      railColorHover: 'color-mix(in srgb, var(--border-color) 70%, transparent)',
      railHeight: '4px',
      handleBoxShadow: 'none',
      handleBoxShadowHover: 'none',
      handleBoxShadowActive: 'none',
      handleBoxShadowFocus: 'none'
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
<style lang="scss">
  .n-dialog {
    .n-dialog__title {
      line-height: 1.4;
    }

    .n-dialog__content {
      margin-top: 8px;
      line-height: 1.5;
    }

    .n-dialog__action {
      padding-top: 4px;
    }

    .n-dialog__icon {
      color: var(--primary-color);
    }

    .n-dialog__action .n-button--ghost {
      --n-color: var(--button-soft-bg);
      --n-color-hover: color-mix(in srgb, var(--button-soft-bg) 60%, transparent);
      --n-color-pressed: var(--button-soft-bg);
      --n-color-focus: var(--button-soft-bg);
      --n-text-color: var(--text-color);
      --n-text-color-hover: var(--text-color);
      --n-text-color-pressed: var(--text-color);
      --n-text-color-focus: var(--text-color);
      --n-border: 1px solid var(--button-soft-bg);
      --n-border-hover: 1px solid var(--button-soft-bg);
      --n-border-pressed: 1px solid var(--button-soft-bg);
      --n-border-focus: 1px solid var(--button-soft-bg);
      --n-box-shadow-focus: none;
      --n-ripple-color: var(--button-soft-bg);
    }

    .n-dialog__action .n-button--warning-type,
    .n-dialog__action .n-button--info-type,
    .n-dialog__action .n-button--success-type {
      --n-color: var(--primary-color);
      --n-color-hover: rgba(var(--primary-rgb), 0.8);
      --n-color-pressed: rgba(var(--primary-rgb), 0.8);
      --n-color-focus: rgba(var(--primary-rgb), 0.8);
      --n-color-disabled: rgba(var(--primary-rgb), 0.6);
      --n-text-color: #fff;
      --n-text-color-hover: #fff;
      --n-text-color-pressed: #fff;
      --n-text-color-focus: #fff;
      --n-text-color-disabled: #fff;
      --n-border: 1px solid var(--primary-color);
      --n-border-hover: 1px solid var(--primary-color);
      --n-border-pressed: 1px solid var(--primary-color);
      --n-border-focus: 1px solid var(--primary-color);
      --n-border-disabled: 1px solid rgba(var(--primary-rgb), 0.6);
      --n-ripple-color: var(--primary-color);
    }
  }

  .n-popconfirm {
    .n-popconfirm__icon {
      color: var(--primary-color);
    }

    .n-popconfirm__action .n-button--ghost {
      --n-color: var(--button-soft-bg);
      --n-color-hover: color-mix(in srgb, var(--button-soft-bg) 60%, transparent);
      --n-color-pressed: var(--button-soft-bg);
      --n-color-focus: var(--button-soft-bg);
      --n-text-color: var(--text-color);
      --n-text-color-hover: var(--text-color);
      --n-text-color-pressed: var(--text-color);
      --n-text-color-focus: var(--text-color);
      --n-border: 1px solid var(--button-soft-bg);
      --n-border-hover: 1px solid var(--button-soft-bg);
      --n-border-pressed: 1px solid var(--button-soft-bg);
      --n-border-focus: 1px solid var(--button-soft-bg);
      --n-box-shadow-focus: none;
      --n-ripple-color: var(--button-soft-bg);
    }

    .n-popconfirm__action .n-button--warning-type,
    .n-popconfirm__action .n-button--info-type,
    .n-popconfirm__action .n-button--success-type,
    .n-popconfirm__action .n-button--primary-type {
      --n-color: var(--primary-color);
      --n-color-hover: rgba(var(--primary-rgb), 0.8);
      --n-color-pressed: rgba(var(--primary-rgb), 0.8);
      --n-color-focus: rgba(var(--primary-rgb), 0.8);
      --n-text-color: #fff;
      --n-text-color-hover: #fff;
      --n-text-color-pressed: #fff;
      --n-text-color-focus: #fff;
      --n-border: 1px solid var(--primary-color);
      --n-border-hover: 1px solid var(--primary-color);
      --n-border-pressed: 1px solid var(--primary-color);
      --n-border-focus: 1px solid var(--primary-color);
      --n-ripple-color: var(--primary-color);
    }
  }

  .n-checkbox .n-checkbox__label {
    color: var(--text-muted-color);
  }

  .n-slider-handle {
    border: 2px solid var(--bg-primary-color);
    box-shadow: none;
  }

  .n-slider-handle:hover,
  .n-slider-handle-wrapper:focus .n-slider-handle,
  .n-slider--active .n-slider-handle {
    background-color: var(--primary-color);
    box-shadow: none;
  }

  .n-tag.n-tag--default:not(.n-tag--disabled) {
    color: var(--primary-color);
    background-color: color-mix(in srgb, var(--primary-color) 14%, transparent);
    border: 1px solid color-mix(in srgb, var(--primary-color) 36%, transparent);

    .n-tag__close {
      color: var(--primary-color);

      &:hover {
        color: var(--primary-strong-color);
      }
    }
  }
</style>
