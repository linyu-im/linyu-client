<template>
  <div class="message">
    <div class="chatlist">
      <div class="chatlist__title">
        <n-input type="text" style="width: 190px; height: 28px" class="text-14px" placeholder="搜索" clearable>
          <template #prefix>
            <svg class="size-16px text-[var(--text-secondary-color)]">
              <use href="#search"></use>
            </svg>
          </template>
        </n-input>
        <n-button class="size-28px p-0 rounded-5px m-l-10px">
          <svg class="size-16px text-[var(--text-secondary-color)]">
            <use href="#plus"></use>
          </svg>
        </n-button>
      </div>
      <n-scrollbar style="margin-top: 10px; margin-bottom: 10px">
        <div class="chatlist__content">
          <div class="chatlist__item top">
            <n-badge :value="5" :max="99" class="select-none pointer-events-none p-0 text-1px" :offset="[-3, 3]">
              <n-avatar class="size-38px rounded-5px bg-#FFF" fallback-src="/avatar.png" src="/avatar.png" />
            </n-badge>
            <div class="flex-1 min-w-0 m-l-10px h-40px flex flex-col justify-center gap-8px">
              <div class="flex justify-between items-center">
                <div class="text-14px truncate">小娜娜22222222222222222222222222222222222</div>
                <div class="text-[var(--text-secondary-color)] text-10px flex-shrink-0 m-l-5px">昨天10:20</div>
              </div>
              <div class="text-[var(--text-secondary-color)] text-12px truncate">
                你在干什么?1111111111111112221111111
              </div>
            </div>
          </div>
          <div class="chatlist__item top">
            <n-badge :value="5" :max="99" class="select-none pointer-events-none p-0 text-1px" :offset="[-3, 3]">
              <n-avatar class="size-38px rounded-5px bg-#FFF" fallback-src="/avatar.png" src="/avatar.png" />
            </n-badge>
            <div class="flex-1 min-w-0 m-l-10px h-40px flex flex-col justify-center gap-8px">
              <div class="flex justify-between items-center">
                <div class="text-14px truncate">小娜娜22222222222222222222222222222222222</div>
                <div class="text-[var(--text-secondary-color)] text-10px flex-shrink-0 m-l-5px">昨天10:20</div>
              </div>
              <div class="text-[var(--text-secondary-color)] text-12px truncate">
                你在干什么?1111111111111112221111111
              </div>
            </div>
          </div>
          <div class="chatlist__item">
            <n-badge :value="5" :max="99" class="select-none pointer-events-none p-0 text-1px" :offset="[-3, 3]">
              <n-avatar class="size-38px rounded-5px bg-#FFF" fallback-src="/avatar.png" src="/avatar.png" />
            </n-badge>
            <div class="flex-1 min-w-0 m-l-10px h-40px flex flex-col justify-center gap-8px">
              <div class="flex justify-between items-center">
                <div class="text-14px truncate">小娜娜22222222222222222222222222222222222</div>
                <div class="text-[var(--text-secondary-color)] text-10px flex-shrink-0 m-l-5px">昨天10:20</div>
              </div>
              <div class="text-[var(--text-secondary-color)] text-12px truncate">
                你在干什么?1111111111111112221111111
              </div>
            </div>
          </div>
          <div class="chatlist__item active">
            <n-badge :value="5" :max="99" class="select-none pointer-events-none p-0 text-1px" :offset="[-3, 3]">
              <n-avatar class="size-38px rounded-5px bg-#FFF" fallback-src="/avatar.png" src="/avatar.png" />
            </n-badge>
            <div class="flex-1 min-w-0 m-l-10px h-40px flex flex-col justify-center gap-8px">
              <div class="flex justify-between items-center">
                <div class="text-14px truncate">小娜娜22222222222222222222222222222222222</div>
                <div class="text-[var(--text-secondary-color)] text-10px flex-shrink-0 m-l-5px">昨天10:20</div>
              </div>
              <div class="text-[var(--text-secondary-color)] text-12px truncate">
                你在干什么?1111111111111112221111111
              </div>
            </div>
          </div>
          <div class="chatlist__item">
            <n-badge :value="5" :max="99" class="select-none pointer-events-none p-0 text-1px" :offset="[-3, 3]">
              <n-avatar class="size-38px rounded-5px bg-#FFF" fallback-src="/avatar.png" src="/avatar.png" />
            </n-badge>
            <div class="flex-1 min-w-0 m-l-10px h-40px flex flex-col justify-center gap-8px">
              <div class="flex justify-between items-center">
                <div class="text-14px truncate">小娜娜22222222222222222222222222222222222</div>
                <div class="text-[var(--text-secondary-color)] text-10px flex-shrink-0 m-l-5px">昨天10:20</div>
              </div>
              <div class="text-[var(--text-secondary-color)] text-12px truncate">
                你在干什么?1111111111111112221111111
              </div>
            </div>
          </div>
          <div class="chatlist__item">
            <n-badge :value="5" :max="99" class="select-none pointer-events-none p-0 text-1px" :offset="[-3, 3]">
              <n-avatar class="size-38px rounded-5px bg-#FFF" fallback-src="/avatar.png" src="/avatar.png" />
            </n-badge>
            <div class="flex-1 min-w-0 m-l-10px h-40px flex flex-col justify-center gap-8px">
              <div class="flex justify-between items-center">
                <div class="text-14px truncate">小娜娜22222222222222222222222222222222222</div>
                <div class="text-[var(--text-secondary-color)] text-10px flex-shrink-0 m-l-5px">昨天10:20</div>
              </div>
              <div class="text-[var(--text-secondary-color)] text-12px truncate">
                你在干什么?1111111111111112221111111
              </div>
            </div>
          </div>
          <div class="chatlist__item">
            <n-badge :value="5" :max="99" class="select-none pointer-events-none p-0 text-1px" :offset="[-3, 3]">
              <n-avatar class="size-38px rounded-5px bg-#FFF" fallback-src="/avatar.png" src="/avatar.png" />
            </n-badge>
            <div class="flex-1 min-w-0 m-l-10px h-40px flex flex-col justify-center gap-8px">
              <div class="flex justify-between items-center">
                <div class="text-14px truncate">小娜娜22222222222222222222222222222222222</div>
                <div class="text-[var(--text-secondary-color)] text-10px flex-shrink-0 m-l-5px">昨天10:20</div>
              </div>
              <div class="text-[var(--text-secondary-color)] text-12px truncate">
                你在干什么?1111111111111112221111111
              </div>
            </div>
          </div>
          <div class="chatlist__item">
            <n-badge :value="5" :max="99" class="select-none pointer-events-none p-0 text-1px" :offset="[-3, 3]">
              <n-avatar class="size-38px rounded-5px bg-#FFF" fallback-src="/avatar.png" src="/avatar.png" />
            </n-badge>
            <div class="flex-1 min-w-0 m-l-10px h-40px flex flex-col justify-center gap-8px">
              <div class="flex justify-between items-center">
                <div class="text-14px truncate">小娜娜22222222222222222222222222222222222</div>
                <div class="text-[var(--text-secondary-color)] text-10px flex-shrink-0 m-l-5px">昨天10:20</div>
              </div>
              <div class="text-[var(--text-secondary-color)] text-12px truncate">
                你在干什么?1111111111111112221111111
              </div>
            </div>
          </div>
          <div class="chatlist__item">
            <n-badge :value="5" :max="99" class="select-none pointer-events-none p-0 text-1px" :offset="[-3, 3]">
              <n-avatar class="size-38px rounded-5px bg-#FFF" fallback-src="/avatar.png" src="/avatar.png" />
            </n-badge>
            <div class="flex-1 min-w-0 m-l-10px h-40px flex flex-col justify-center gap-8px">
              <div class="flex justify-between items-center">
                <div class="text-14px truncate">小娜娜22222222222222222222222222222222222</div>
                <div class="text-[var(--text-secondary-color)] text-10px flex-shrink-0 m-l-5px">昨天10:20</div>
              </div>
              <div class="text-[var(--text-secondary-color)] text-12px truncate">
                你在干什么?1111111111111112221111111
              </div>
            </div>
          </div>
          <div class="chatlist__item">
            <n-badge :value="5" :max="99" class="select-none pointer-events-none p-0 text-1px" :offset="[-3, 3]">
              <n-avatar class="size-38px rounded-5px bg-#FFF" fallback-src="/avatar.png" src="/avatar.png" />
            </n-badge>
            <div class="flex-1 min-w-0 m-l-10px h-40px flex flex-col justify-center gap-8px">
              <div class="flex justify-between items-center">
                <div class="text-14px truncate">小娜娜22222222222222222222222222222222222</div>
                <div class="text-[var(--text-secondary-color)] text-10px flex-shrink-0 m-l-5px">昨天10:20</div>
              </div>
              <div class="text-[var(--text-secondary-color)] text-12px truncate">
                你在干什么?1111111111111112221111111
              </div>
            </div>
          </div>
          <div class="chatlist__item">
            <n-badge :value="5" :max="99" class="select-none pointer-events-none p-0 text-1px" :offset="[-3, 3]">
              <n-avatar class="size-38px rounded-5px bg-#FFF" fallback-src="/avatar.png" src="/avatar.png" />
            </n-badge>
            <div class="flex-1 min-w-0 m-l-10px h-40px flex flex-col justify-center gap-8px">
              <div class="flex justify-between items-center">
                <div class="text-14px truncate">小娜娜22222222222222222222222222222222222</div>
                <div class="text-[var(--text-secondary-color)] text-10px flex-shrink-0 m-l-5px">昨天10:20</div>
              </div>
              <div class="text-[var(--text-secondary-color)] text-12px truncate">
                你在干什么?1111111111111112221111111
              </div>
            </div>
          </div>
          <div class="chatlist__item">
            <n-badge :value="5" :max="99" class="select-none pointer-events-none p-0 text-1px" :offset="[-3, 3]">
              <n-avatar class="size-38px rounded-5px bg-#FFF" fallback-src="/avatar.png" src="/avatar.png" />
            </n-badge>
            <div class="flex-1 min-w-0 m-l-10px h-40px flex flex-col justify-center gap-8px">
              <div class="flex justify-between items-center">
                <div class="text-14px truncate">1小娜娜22222222222222222222222222222222222</div>
                <div class="text-[var(--text-secondary-color)] text-10px flex-shrink-0 m-l-5px">昨天10:20</div>
              </div>
              <div class="text-[var(--text-secondary-color)] text-12px truncate">
                你在干什么?1111111111111112221111111
              </div>
            </div>
          </div>
        </div>
      </n-scrollbar>
    </div>
    <div class="content">
      <linyu-empty />
    </div>
  </div>
</template>
<script setup lang="ts"></script>
<style scoped lang="scss">
  .message {
    display: flex;
    height: 100%;

    .chatlist {
      display: flex;
      flex-direction: column;
      width: 240px;
      padding: 10px;
      border-right: 1px var(--divider-color) solid;
      height: calc(100% - 48px);

      .chatlist__title {
        display: flex;
        justify-content: center;
        flex-shrink: 0;
      }

      .chatlist__content {
        display: flex;
        flex-direction: column;
        gap: 2px;

        .chatlist__item {
          border-radius: 5px;
          width: 100%;
          display: flex;
          padding: 10px;
          align-items: center;
          user-select: none;
          box-sizing: border-box;
          border: 1px transparent solid;

          &:hover,
          &.top:hover {
            background-color: color-mix(in srgb, var(--card-bg-color) 60%, transparent);
          }

          &.top {
            background-color: var(--card-bg-color);
          }

          &.active {
            background-color: color-mix(in srgb, var(--primary-color) 5%, transparent);
            border: 1px color-mix(in srgb, var(--primary-color) 60%, transparent) solid;
          }
        }
      }
    }
    .content {
      flex: 1;
    }
  }
</style>
