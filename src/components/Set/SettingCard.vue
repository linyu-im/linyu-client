<template>
  <section class="setting-card">
    <slot />
  </section>
</template>

<style scoped lang="scss">
  .setting-card {
    padding: 4px 0;
    border-radius: 10px;
    background-color: color-mix(in srgb, var(--card-bg-color) 45%, var(--bg-primary-color));
    border: 1px solid color-mix(in srgb, var(--border-color) 55%, transparent);
    overflow: hidden;

    & + & {
      margin-top: 14px;
    }
  }
</style>
