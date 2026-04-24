<template>
  <div class="chat-session">
    <!-- 相关用户信息 -->
    <div class="chat-session__header">
      <div class="flex select-none">
        <div class="text-16px font-bold truncate">阿如</div>
        <div class="flex items-center justify-center text-12px text-[var(--text-muted-color)] m-l-10px">
          <img class="size-14px" src="/emotion/empty.png" alt="" />
          <div class="m-l-2px">自由万岁</div>
        </div>
      </div>
      <div class="flex items-center">
        <SvgIconButton href="#record" />
        <SvgIconButton href="#more" />
      </div>
    </div>
    <Split direction="vertical" fixed="second" :min-size="180" :max-size="440" :default-size="260">
      <template #first>
        <div class="chat-session__content"></div>
      </template>
      <template #second>
        <div class="chat-session__input">
          <div class="flex w-full items-center justify-between m-b-5px">
            <div class="flex items-center gap-5px">
              <SvgIconButton href="#emotion" />
              <SvgIconButton href="#scissor" />
              <SvgIconButton href="#folder" />
              <SvgIconButton href="#image" />
              <SvgIconButton href="#microphone" />
            </div>
            <div class="flex items-center gap-5px">
              <SvgIconButton href="#phone" />
              <SvgIconButton href="#video" />
            </div>
          </div>
          <div class="flex-1 flex w-full h-full">
            <n-mention
              :autosize="{
                minRows: 1
              }"
              type="textarea"
              class="w-full h-full" />
          </div>
          <div class="flex w-full items-center justify-end m-t-10px">
            <n-button size="tiny" type="primary" class="w-60px">发送</n-button>
          </div>
        </div>
      </template>
    </Split>
  </div>
</template>
<script lang="ts"></script>
<style scoped lang="scss">
  .chat-session {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;

    .chat-session__header {
      height: 48px;
      display: flex;
      align-items: center;
      border-bottom: 1px var(--divider-color) solid;
      padding: 0 10px;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .chat-session__content {
      height: 100%;
    }

    .chat-session__input {
      display: flex;
      flex-direction: column;
      padding: 5px 15px 10px 15px;
      align-items: flex-start;
      height: 100%;

      :deep(.n-mention) {
        height: 100%;

        .n-input {
          height: 100%;

          .n-input-wrapper {
            height: 100%;
          }

          .n-input__textarea-el {
            height: 100% !important;
            min-height: unset !important;
          }
        }
      }
    }
  }
</style>
