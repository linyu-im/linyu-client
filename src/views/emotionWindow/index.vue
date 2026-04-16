<template>
  <div class="emotion">
    <div data-tauri-drag-region class="emotion__toolbar">
      <SvgIconButton href="#close" hover-bg="var(--red)" hover-color="#FFF" @click="closeCurrentWindow" />
    </div>
    <div class="emotion__content">
      <div data-tauri-drag-region class="h-120px flex justify-center items-center flex-shrink-0">
        <div v-if="userStore.userInfo.emotionId" class="flex items-center justify-center">
          <img class="size-28px m-r-10px" :src="userStore.userInfo.emotionUrl" alt="" />
          <span>{{ userStore.userInfo.emotionName }}</span>
        </div>
        <span v-else>暂未设置心情</span>
      </div>
      <div class="emotion__container">
        <div class="emotion__card">
          <div class="emotion__item" :class="{ active: !activeEmotionId }" @click="() => onSelectEmotion('', '', '')">
            <img class="size-22px" src="/emotion/nothing.png" alt="" />
            <span class="text-center h-20px">无</span>
          </div>
          <div
            v-for="item in emotionList"
            :key="item.id"
            class="emotion__item"
            :class="{ active: activeEmotionId === item.id }"
            @click="() => onSelectEmotion(item.id, item.emotionName, item.url)">
            <img class="size-22px" :src="item.url" alt="" />
            <span class="text-center h-20px">{{ item.emotionName }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { emotionApi, userApi } from '@/api'
  import { useUserStore } from '@/stores/user'
  import { EmotionListResult } from '@/types/api/emotion'
  import { closeCurrentWindow } from '@/utils/window'

  const emotionList = ref<EmotionListResult[]>([])
  const userStore = useUserStore()
  const activeEmotionId = ref<string>(userStore.userInfo.emotionId)

  const onEmotionList = () => {
    emotionApi.list().then((res) => {
      if (res.code === 0 && res.data) {
        emotionList.value = res.data
      } else {
        window.$message.error(res.msg)
      }
    })
  }

  const onSelectEmotion = (emotionId: string, emotionName: string, emotionUrl: string) => {
    userApi.userEmotionSet(emotionId).then((res) => {
      if (res.code === 0) {
        activeEmotionId.value = emotionId
        userStore.setUserEmotion(emotionId, emotionName, emotionUrl)
      } else {
        window.$message.error(res.msg)
      }
    })
  }

  onMounted(() => {
    onEmotionList()
  })
</script>

<style scoped lang="scss">
  .emotion {
    height: 100vh;
    width: 100vw;
    display: flex;
    flex-direction: column;
    color: var(--text-color);
    overflow: hidden;
    background: linear-gradient(to bottom, rgb(var(--bg-muted-rgb), 0.8), rgb(var(--bg-secondary-rgb), 0.6));
    user-select: none;

    .emotion__toolbar {
      height: 38px;
      display: flex;
      justify-content: end;
      align-items: center;
      padding: 0 3px;
    }

    .emotion__content {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 10px 0;
      overflow: hidden;

      .emotion__container {
        display: flex;
        overflow-y: auto;
        scrollbar-width: none;
        justify-content: center;
        flex: 1;
        min-height: 0;

        .emotion__card {
          width: 80%;
          background-color: rgba(var(--bg-muted-rgb), 0.5);
          border-radius: 5px;
          padding: 20px;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
          display: grid;
          grid-template-columns: repeat(4, 64px);
          gap: 8px;
          justify-content: center;
          height: fit-content;

          .emotion__item {
            height: 64px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            font-size: 10px;
            gap: 8px;
            border-radius: 5px;
            user-select: none;
            cursor: pointer;
            padding: 0 4px;
            transition: background-color 0.2s ease;

            &:hover {
              background-color: var(--icon-hover-color);
            }

            &.active {
              background: color-mix(in srgb, var(--primary-color) 90%, transparent);
              color: white;
            }
          }
        }
      }
    }
  }
</style>
