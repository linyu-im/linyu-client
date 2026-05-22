<template>
  <span v-if="level >= 0" class="level-tag" :class="`level-tag--${tier}`">Lv.{{ level }}</span>
</template>

<script setup lang="ts">
  const props = defineProps<{
    level: number
  }>()

  const tier = computed(() => {
    if (props.level >= 100) return 'gold'
    if (props.level >= 50) return 'purple'
    return 'primary'
  })
</script>

<style scoped lang="scss">
  .level-tag {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
    padding: 2px 7px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 600;
    line-height: 1.2;
    letter-spacing: 0.3px;
    user-select: none;

    &--primary {
      color: var(--primary-color);
      background: color-mix(in srgb, var(--primary-color) 12%, transparent);
      border: 1px solid color-mix(in srgb, var(--primary-color) 25%, transparent);
    }

    &--purple {
      color: var(--purple);
      background: color-mix(in srgb, var(--purple) 12%, transparent);
      border: 1px solid color-mix(in srgb, var(--purple) 25%, transparent);
    }

    &--gold {
      color: var(--gold);
      background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--gold) 22%, transparent),
        color-mix(in srgb, var(--gold) 8%, transparent)
      );
      border: 1px solid color-mix(in srgb, var(--gold) 35%, transparent);
    }
  }
</style>
