<template>
  <section class="skills-market">
    <header class="skills-market__header">
      <div>
        <span class="skills-market__eyebrow">{{ t('ai.work.skills.eyebrow') }}</span>
        <h1>{{ t('ai.work.skills.title') }}</h1>
        <p>{{ t('ai.work.skills.subtitle') }}</p>
      </div>
      <n-input v-model:value="query" clearable class="skills-market__search" :placeholder="t('ai.work.skills.search')">
        <template #prefix>
          <svg><use href="#search" /></svg>
        </template>
      </n-input>
    </header>

    <div class="skills-market__tip">
      <div class="skills-market__tip-copy">
        <span>{{ t('ai.work.skills.tip') }}</span>
        <strong>{{ t('ai.work.skills.tipTitle') }}</strong>
        <p>{{ t('ai.work.skills.tipDesc') }}</p>
      </div>
      <div class="skills-market__tip-visual">
        <img src="/skill_bg.png" alt="" />
      </div>
    </div>

    <div class="skills-market__filters">
      <button
        v-for="filter in filters"
        :key="filter"
        type="button"
        :class="{ active: activeFilter === filter }"
        @click="activeFilter = filter">
        {{ filter === 'all' ? t('ai.work.skills.filters.all') : filter }}
      </button>
    </div>

    <div class="skills-market__grid">
      <article v-for="skill in filteredSkills" :key="skill.id" class="skills-market__card">
        <div class="skills-market__icon">
          <img v-if="skill.iconUrl" :src="skill.iconUrl" :alt="skill.name" />
          <svg v-else><use href="#star" /></svg>
        </div>
        <div class="skills-market__identity">
          <div class="skills-market__title-row">
            <strong>{{ skill.name }}</strong>
            <n-tag v-if="skill.featured" size="tiny" round>{{ t('ai.work.skills.official') }}</n-tag>
          </div>
          <p>{{ skill.description }}</p>
        </div>
        <div class="skills-market__tags">
          <span v-for="capability in skill.capabilities" :key="capability">{{ capability }}</span>
        </div>
        <footer>
          <small>{{ skill.author }} · v{{ skill.version }}</small>
          <div class="skills-market__actions">
            <template v-if="!skill.installed">
              <n-button size="tiny" type="primary" :loading="busyId === skill.id" @click="onInstall(skill.id)">
                {{ t('ai.work.skills.install') }}
              </n-button>
            </template>
            <template v-else>
              <n-switch
                size="small"
                :value="skill.enabled"
                :loading="busyId === skill.id"
                @update:value="onToggle(skill.id, $event)" />
              <n-button size="tiny" quaternary :loading="busyId === skill.id" @click="onUninstall(skill)">
                {{ t('ai.work.skills.uninstall') }}
              </n-button>
            </template>
          </div>
        </footer>
      </article>
      <div v-if="!filteredSkills.length" class="skills-market__empty">{{ t('ai.work.skills.empty') }}</div>
    </div>
  </section>
</template>

<script setup lang="ts">
  import { useWorkAssistantStore } from '@/stores/app/workAssistant'
  import { parseWorkError } from '@/services/workError'
  import { useI18n } from 'vue-i18n'

  const { t } = useI18n()
  const dialog = useDialog()
  const store = useWorkAssistantStore()
  const query = ref('')
  const activeFilter = ref('all')
  const busyId = ref('')

  const filters = computed(() => {
    const categories = Array.from(new Set(store.skills.map((skill) => skill.category.trim()).filter(Boolean))).sort(
      (a, b) => a.localeCompare(b)
    )
    return ['all', ...categories]
  })

  const filteredSkills = computed(() => {
    const keyword = query.value.trim().toLowerCase()
    return store.skills.filter((skill) => {
      const categoryMatches = activeFilter.value === 'all' || skill.category === activeFilter.value
      const textMatches =
        !keyword ||
        `${skill.name} ${skill.description} ${skill.capabilities.join(' ')} ${skill.category}`
          .toLowerCase()
          .includes(keyword)
      return categoryMatches && textMatches
    })
  })

  const showError = (error: unknown) => {
    window.$message?.error(t(parseWorkError(error).key))
  }

  const onInstall = async (id: string) => {
    busyId.value = id
    try {
      await store.installSkill(id)
      window.$message?.success(t('ai.work.skills.installed'))
    } catch (error) {
      showError(error)
    } finally {
      busyId.value = ''
    }
  }

  const onUninstall = (skill: { id: string; name: string }) => {
    dialog.warning({
      title: t('ai.work.skills.uninstall'),
      content: t('ai.work.skills.uninstallConfirm', { name: skill.name }),
      positiveText: t('ai.work.skills.uninstall'),
      negativeText: t('common.cancel'),
      onPositiveClick: () => {
        busyId.value = skill.id
        return store
          .uninstallSkill(skill.id)
          .then(() => {
            window.$message?.success(t('ai.work.skills.uninstalled'))
          })
          .catch(showError)
          .finally(() => {
            busyId.value = ''
          })
      }
    })
  }

  const onToggle = async (id: string, enabled: boolean) => {
    busyId.value = id
    try {
      await store.toggleSkill(id, enabled)
    } catch (error) {
      showError(error)
    } finally {
      busyId.value = ''
    }
  }

  onMounted(() => {
    if (!store.skills.length) {
      store.refreshSkills().catch(showError)
    }
  })
</script>

<style scoped lang="scss">
  .skills-market {
    width: 100%;
    max-width: 1040px;
    margin: 0 auto;
    padding: 34px 38px 50px;
    box-sizing: border-box;
    &__header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 24px;
    }
    &__eyebrow {
      color: var(--primary-color);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    h1 {
      margin: 7px 0 5px;
      font-size: 25px;
      color: var(--text-color);
    }
    p {
      margin: 0;
      color: var(--text-secondary-color);
      font-size: 13px;
      line-height: 1.6;
    }
    &__search {
      width: 260px;
    }
    &__search svg {
      width: 15px;
      height: 15px;
    }
    &__tip {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      overflow: hidden;
      margin: 24px 0 18px;
      min-height: 112px;
      padding: 16px 24px;
      border: 1px solid color-mix(in srgb, var(--primary-color) 18%, var(--border-color));
      border-radius: 14px;
      background: linear-gradient(
        120deg,
        color-mix(in srgb, var(--primary-color) 8%, var(--card-bg-color)) 0%,
        color-mix(in srgb, var(--primary-color) 3%, var(--bg-secondary-color)) 48%,
        var(--card-bg-color) 100%
      );
      box-sizing: border-box;
    }
    &__tip-copy {
      position: relative;
      z-index: 1;
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 6px;
      max-width: 560px;
      min-width: 0;
    }
    &__tip-copy > span {
      display: inline-flex;
      align-items: center;
      align-self: flex-start;
      padding: 2px 9px;
      border-radius: 999px;
      background: var(--primary-color);
      color: #fff;
      font-size: 11px;
      font-weight: 600;
      line-height: 1.4;
      letter-spacing: 0.02em;
    }
    &__tip-copy strong {
      color: var(--text-color);
      font-size: 18px;
      font-weight: 700;
      line-height: 1.3;
    }
    &__tip-copy p {
      margin: 0;
      color: var(--text-secondary-color);
      font-size: 12px;
      line-height: 1.6;
    }
    &__tip-visual {
      position: relative;
      flex: none;
      width: min(220px, 32%);
      height: 112px;
      pointer-events: none;
    }
    &__tip-visual img {
      position: absolute;
      right: -4px;
      bottom: -10px;
      width: 100%;
      height: 128px;
      object-fit: contain;
      object-position: right bottom;
      display: block;
    }
    @media (max-width: 720px) {
      &__tip {
        flex-direction: column;
        align-items: stretch;
        padding: 16px 16px 0;
        min-height: 0;
      }
      &__tip-copy {
        max-width: none;
      }
      &__tip-visual {
        align-self: flex-end;
        width: min(180px, 62%);
        height: 96px;
      }
      &__tip-visual img {
        height: 108px;
        bottom: -4px;
      }
    }
    &__filters {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-bottom: 14px;
    }
    &__filters button {
      padding: 6px 11px;
      border: 0;
      border-radius: 7px;
      background: transparent;
      color: var(--text-secondary-color);
      font-size: 12px;
      cursor: pointer;
    }
    &__filters button:hover,
    &__filters button.active {
      background: var(--bg-muted-color);
      color: var(--text-color);
    }
    &__grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
      gap: 12px;
    }
    &__empty {
      grid-column: 1 / -1;
      padding: 28px 12px;
      color: var(--text-muted-color);
      font-size: 13px;
      text-align: center;
    }
    &__card {
      display: grid;
      grid-template-columns: 42px 1fr;
      gap: 12px;
      padding: 16px;
      border: 1px solid color-mix(in srgb, var(--border-color) 75%, transparent);
      border-radius: 12px;
      background: var(--content-card-bg);
      transition: border-color 0.15s ease;
    }
    &__card:hover {
      border-color: color-mix(in srgb, var(--primary-color) 35%, var(--border-color));
    }
    &__icon {
      display: grid;
      place-items: center;
      width: 42px;
      height: 42px;
      border-radius: 10px;
      overflow: hidden;
      background: var(--bg-muted-color);
      color: var(--primary-color);
    }
    &__icon svg {
      width: 20px;
      height: 20px;
    }
    &__icon img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    &__identity {
      min-width: 0;
    }
    &__title-row {
      display: flex;
      align-items: center;
      gap: 7px;
    }
    &__title-row strong {
      color: var(--text-color);
      font-size: 14px;
    }
    &__identity p {
      margin-top: 5px;
      font-size: 12px;
    }
    &__tags {
      grid-column: 1 / -1;
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
    }
    &__tags span {
      padding: 3px 7px;
      border-radius: 5px;
      background: var(--bg-muted-color);
      color: var(--text-muted-color);
      font-size: 10px;
    }
    footer {
      grid-column: 1 / -1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding-top: 10px;
      border-top: 1px solid var(--divider-color);
    }
    footer small {
      color: var(--text-muted-color);
      font-size: 10px;
      line-height: 1.4;
    }
    &__actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }
  }
</style>
