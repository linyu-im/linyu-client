<template>
  <div v-if="show" class="chat-settings-backdrop" @click="onClose" />
  <Transition name="chat-settings-panel">
    <aside v-if="show" class="chat-settings-panel" @click.stop>
      <div class="chat-settings-drawer">
        <n-scrollbar class="chat-settings-drawer__scroll">
          <ChatSessionUserSettings
            v-if="sceneType === SceneType.User"
            :show="show"
            :user-info="userInfo"
            :chat-id="chatId"
            @history-deleted="emit('history-deleted')"
            @friend-deleted="emit('friend-deleted')" />
          <ChatSessionGroupSettings
            v-else-if="sceneType === SceneType.Group"
            :show="show"
            :group-info="groupInfo"
            :chat-id="chatId"
            @history-deleted="emit('history-deleted')"
            @group-dissolved="emit('group-dissolved')" />
        </n-scrollbar>
      </div>
    </aside>
  </Transition>
</template>

<script setup lang="ts">
  import { SceneType } from '@/constants/common'
  import ChatSessionGroupSettings from './ChatSessionGroupSettings.vue'
  import ChatSessionUserSettings from './ChatSessionUserSettings.vue'
  import type { GroupInfoResult } from '@/types/api/group'
  import type { User } from '@/types/api/user'

  const props = withDefaults(
    defineProps<{
      show: boolean
      chatId: string
      sceneType?: SceneType
      userInfo?: User | null
      groupInfo?: GroupInfoResult | null
    }>(),
    {
      sceneType: SceneType.User,
      userInfo: null,
      groupInfo: null
    }
  )

  const emit = defineEmits<{
    close: []
    'history-deleted': []
    'group-dissolved': []
    'friend-deleted': []
  }>()

  const onClose = () => {
    emit('close')
  }
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
  }
</style>
