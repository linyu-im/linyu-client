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
    textColorFocusError: '#FFF'
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
      rippleColor: 'var(--button-soft-bg)'
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
    Checkbox: {
      border: '1px solid var(--border-color)',
      borderFocus: '1px solid var(--primary-color)',
      borderChecked: '1px solid var(--primary-color)',
      boxShadowFocus: '0 0 0 1px rgba(var(--primary-rgb),0.3)',
      colorChecked: 'var(--primary-color)',
      color: 'var(--button-soft-bg)'
    },
    Radio: {
      border: '1px solid var(--border-color)',
      borderHover: '1px solid var(--primary-color)',
      borderFocus: '1px solid var(--primary-color)',
      borderChecked: '1px solid var(--primary-color)',
      borderDisabled: '1px solid var(--border-color)',
      borderDisabledChecked: '1px solid var(--border-color)',
      boxShadowFocus: '0 0 0 1px rgba(var(--primary-rgb),0.3)',
      color: 'var(--button-soft-bg)',
      colorDisabled: 'color-mix(in srgb, var(--button-soft-bg) 60%, transparent)',
      colorActive: 'var(--primary-color)',
      dotColorActive: '#FFF',
      textColor: 'var(--text-color)',
      textColorDisabled: 'var(--text-secondary-color)'
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
      boxShadowSuccess: '0 0 0 1px rgba(var(--primary-rgb),0.3)',
      colorInfo: 'var(--bg-muted-color)',
      textColorInfo: 'var(--text-color)',
      boxShadowInfo: '0 0 0 1px rgba(var(--primary-rgb),0.3)',
      iconColorInfo: 'var(--primary-color)',
      iconColorSuccess: 'var(--primary-color)'
    },
    Divider: {
      color: 'var(--divider-color)'
    },
    Dropdown: {
      color: 'color-mix(in srgb, var(--bg-muted-color) 80%, transparent)',
      optionTextColor: 'var(--text-color)',
      optionTextColorHover: 'var(--primary-color)',
      optionColorHover: 'color-mix(in srgb, var(--bg-muted-color) 60%, transparent)',
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
          optionColorPending: 'color-mix(in srgb, var(--icon-hover-color) 85%, transparent)',
          optionColorActive: 'color-mix(in srgb, var(--primary-color) 10%, transparent)',
          optionColorActivePending: 'color-mix(in srgb, var(--primary-color) 10%, transparent)',
          optionCheckColor: 'var(--primary-color)',
          groupHeaderTextColor: 'var(--text-secondary-color)',
          actionDividerColor: 'var(--divider-color)'
        }
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
