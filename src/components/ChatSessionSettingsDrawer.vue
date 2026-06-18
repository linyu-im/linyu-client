<template>
  <div v-if="show" class="chat-settings-backdrop" @click="onClose" />
  <Transition name="chat-settings-panel">
    <aside v-if="show" class="chat-settings-panel" @click.stop>
      <div class="chat-settings-drawer">
        <n-scrollbar class="chat-settings-drawer__scroll">
          <div class="chat-settings-drawer__inner">
            <section v-if="peerInfo" class="chat-settings-drawer__card chat-settings-drawer__user">
              <Avatar :id="peerInfo.id" :size="36" class="chat-settings-drawer__user-avatar" :profile-enabled="true" />
              <div class="chat-settings-drawer__user-info">
                <div class="chat-settings-drawer__user-name">{{ peerInfo.remark || peerInfo.username }}</div>
                <span v-if="peerInfo.account" class="chat-settings-drawer__user-id">{{ peerInfo.account }}</span>
              </div>
              <button type="button" class="chat-settings-drawer__share-btn">
                <svg class="chat-settings-drawer__share-icon" aria-hidden="true">
                  <use href="#share" />
                </svg>
                <span>{{ t('message.chatSettings.share') }}</span>
              </button>
            </section>

            <section class="chat-settings-drawer__card">
              <div class="chat-settings-drawer__section-head">
                <span class="chat-settings-drawer__title">{{ t('message.chatSettings.exclusiveRobot') }}</span>
                <span class="chat-settings-drawer__subtitle">{{ t('message.chatSettings.exclusiveRobotDesc') }}</span>
              </div>
              <div class="chat-settings-drawer__robot-list">
                <div v-for="robot in robots" :key="robot.id" class="chat-settings-drawer__robot-item">
                  <Avatar class="chat-settings-drawer__robot-avatar" :id="robot.id" type="robot" :size="36" round />
                  <span class="chat-settings-drawer__robot-name">{{ robot.robotName }}</span>
                </div>
                <button
                  type="button"
                  class="chat-settings-drawer__robot-item chat-settings-drawer__robot-add"
                  @click="onAddRobot">
                  <span class="chat-settings-drawer__robot-add-icon" aria-hidden="true">
                    <svg class="size-14px">
                      <use href="#plus" />
                    </svg>
                  </span>
                  <span class="chat-settings-drawer__robot-name">{{ t('message.chatSettings.add') }}</span>
                </button>
              </div>
            </section>

            <SettingCard>
              <SettingRow :label="t('message.chatSettings.pinChat')">
                <n-switch v-model:value="pinChat" size="small" />
              </SettingRow>
              <SettingRow :label="t('message.chatSettings.mute')" :border="false">
                <n-switch v-model:value="muteChat" size="small" />
              </SettingRow>
            </SettingCard>

            <section class="chat-settings-drawer__card">
              <button type="button" class="chat-settings-drawer__action">
                {{ t('message.chatSettings.viewHistory') }}
              </button>
            </section>

            <section class="chat-settings-drawer__card">
              <button type="button" class="chat-settings-drawer__action chat-settings-drawer__action--danger">
                {{ t('message.chatSettings.deleteHistory') }}
              </button>
            </section>

            <button type="button" class="chat-settings-drawer__footer-action">
              {{ t('message.chatSettings.deleteFriend') }}
            </button>
          </div>
        </n-scrollbar>
      </div>
    </aside>
  </Transition>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import { robotApi } from '@/api'
  import SettingCard from '@/components/Set/SettingCard.vue'
  import SettingRow from '@/components/Set/SettingRow.vue'
  import type { Robot } from '@/types/api/robot'
  import type { UserInfoResult } from '@/types/api/user'

  const props = defineProps<{
    show: boolean
    peerInfo: UserInfoResult | null
  }>()

  const emit = defineEmits<{
    close: []
  }>()

  const { t } = useI18n()

  const onClose = () => {
    emit('close')
  }

  const onAddRobot = () => {
    window.$message.info(t('message.chatSettings.addTodo'))
  }

  const pinChat = ref(true)
  const muteChat = ref(false)
  const robots = ref<Robot[]>([])

  const fetchRobots = () => {
    robotApi.listRobots().then((res) => {
      if (res.code === 0 && res.data) {
        robots.value = res.data
      } else {
        window.$message.error(res.msg)
      }
    })
  }

  watch(
    () => props.show,
    (visible) => {
      if (visible) {
        fetchRobots()
      }
    },
    { immediate: true }
  )
</script>

<style scoped lang="scss">
  .chat-settings-backdrop {
    position: absolute;
    inset: 0;
    z-index: 9;
    background: transparent;
  }

  .chat-settings-panel {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 10;
    width: 280px;
    background: var(--bg-secondary-color);
    border-left: 1px solid var(--divider-color);
    box-shadow: -2px 0 10px color-mix(in srgb, #000 6%, transparent);
    box-sizing: border-box;
    will-change: transform;

    html[data-theme='dark'] & {
      box-shadow: -2px 0 12px color-mix(in srgb, #000 32%, transparent);
    }
  }

  .chat-settings-panel-enter-active,
  .chat-settings-panel-leave-active {
    transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .chat-settings-panel-enter-from,
  .chat-settings-panel-leave-to {
    transform: translateX(100%);
  }

  .chat-settings-drawer {
    height: 100%;
    box-sizing: border-box;

    &__scroll {
      height: 100%;
    }

    &__inner {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 12px 10px 18px;
      box-sizing: border-box;
      user-select: none;
    }

    &__card {
      padding: 10px 12px;
      border-radius: 8px;
      background: var(--bg-primary-color);
      border: 1px solid color-mix(in srgb, var(--border-color) 55%, transparent);

      html[data-theme='dark'] & {
        background: color-mix(in srgb, var(--card-bg-color) 28%, var(--bg-secondary-color));
        border-color: color-mix(in srgb, var(--border-color) 35%, transparent);
      }
    }

    :deep(.setting-card) {
      padding: 2px 0;
      border-radius: 8px;
      background: var(--bg-primary-color);
    }

    html[data-theme='dark'] & :deep(.setting-card) {
      background: color-mix(in srgb, var(--card-bg-color) 28%, var(--bg-secondary-color));
      border-color: color-mix(in srgb, var(--border-color) 35%, transparent);
    }

    :deep(.setting-row) {
      gap: 10px;
      padding: 9px 12px;
      min-height: 40px;
    }

    :deep(.setting-row__label) {
      font-size: 14px;
      line-height: 1.4;
    }

    &__user {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    &__user-avatar {
      flex-shrink: 0;
    }

    &__user-info {
      min-width: 0;
      flex: 1;
      user-select: none;
    }

    &__user-name {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-color);
      line-height: 1.4;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__user-id {
      display: block;
      margin-top: 2px;
      font-size: 12px;
      line-height: 1.35;
      color: var(--text-secondary-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__share-btn {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      flex-shrink: 0;
      height: 28px;
      padding: 0 10px;
      border: 1px solid var(--border-color);
      border-radius: 999px;
      background: var(--bg-primary-color);
      font-size: 12px;
      color: var(--text-color);
      cursor: pointer;
      transition:
        border-color 0.2s ease,
        color 0.2s ease;

      html[data-theme='dark'] & {
        background: color-mix(in srgb, var(--card-bg-color) 22%, var(--bg-secondary-color));
        border-color: color-mix(in srgb, var(--border-color) 35%, transparent);
      }

      &:hover {
        border-color: var(--primary-color);
        color: var(--primary-color);
      }
    }

    &__share-icon {
      width: 12px;
      height: 12px;
      color: currentColor;
    }

    &__section-head {
      display: flex;
      align-items: baseline;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 10px;
    }

    &__title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-color);
      line-height: 1.4;
    }

    &__subtitle {
      font-size: 12px;
      color: var(--text-secondary-color);
      line-height: 1.4;
    }

    &__robot-list {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      flex-wrap: wrap;
    }

    &__robot-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      width: 40px;
      border: none;
      padding: 0;
      background: transparent;
    }

    &__robot-avatar {
      border: 1px solid color-mix(in srgb, var(--border-color) 70%, transparent);
    }

    &__robot-name {
      width: 100%;
      font-size: 10px;
      color: var(--text-muted-color);
      text-align: center;
      line-height: 1.3;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__robot-add {
      cursor: pointer;

      &:hover .chat-settings-drawer__robot-add-icon {
        border-color: var(--primary-color);
        color: var(--primary-color);
      }
    }

    &__robot-add-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 1px dashed color-mix(in srgb, var(--border-color) 85%, transparent);
      color: var(--text-secondary-color);
      box-sizing: border-box;
      transition:
        border-color 0.2s ease,
        color 0.2s ease;
    }

    &__action {
      display: block;
      width: 100%;
      padding: 1px 0;
      border: none;
      background: transparent;
      font-size: 14px;
      line-height: 1.45;
      color: var(--text-color);
      text-align: left;
      cursor: pointer;

      &:hover {
        color: var(--primary-color);
      }

      &--danger {
        color: var(--red);

        &:hover {
          color: color-mix(in srgb, var(--red) 85%, var(--text-color));
        }
      }
    }

    &__footer-action {
      display: block;
      width: 100%;
      padding: 6px 0;
      border: none;
      background: transparent;
      font-size: 14px;
      line-height: 1.45;
      color: var(--red);
      text-align: center;
      cursor: pointer;

      &:hover {
        color: color-mix(in srgb, var(--red) 85%, var(--text-color));
      }
    }
  }
</style>
