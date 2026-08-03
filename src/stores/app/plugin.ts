import { defineStore } from 'pinia'
import * as pluginService from '@/services/pluginService'
import type { InstalledPlugin, PluginPermission } from '@/types/plugin'

type PluginStore = {
  installedPlugins: InstalledPlugin[]
  developerMode: boolean
  loading: boolean
  operationIds: string[]
}

export const usePluginStore = defineStore('plugin', {
  persist: {
    pick: ['developerMode']
  },
  share: {
    enable: true,
    initialize: true
  },
  state: (): PluginStore => ({
    installedPlugins: [],
    developerMode: false,
    loading: false,
    operationIds: []
  }),
  actions: {
    refresh() {
      this.$patch((state) => {
        state.loading = true
      })
      return pluginService
        .list()
        .then((plugins) => {
          this.$patch((state) => {
            state.installedPlugins = plugins
          })
          return plugins
        })
        .finally(() => {
          this.$patch((state) => {
            state.loading = false
          })
        })
    },

    commitInstall(transactionId: string, permissions: PluginPermission[]) {
      return pluginService.commitInstall(transactionId, permissions).then((record) => {
        this.$patch((state) => {
          const index = state.installedPlugins.findIndex((item) => item.id === record.id)
          if (index >= 0) {
            state.installedPlugins.splice(index, 1, record)
          } else {
            state.installedPlugins.unshift(record)
          }
        })
        return record
      })
    },

    uninstallPlugin(pluginId: string, deleteData = false) {
      this.setOperation(pluginId, true)
      return pluginService
        .uninstall(pluginId, deleteData)
        .then(() => {
          this.$patch((state) => {
            state.installedPlugins = state.installedPlugins.filter((item) => item.id !== pluginId)
          })
        })
        .finally(() => this.setOperation(pluginId, false))
    },

    setPluginEnabled(pluginId: string, enabled: boolean) {
      this.setOperation(pluginId, true)
      return pluginService
        .setEnabled(pluginId, enabled)
        .then(() => {
          this.$patch((state) => {
            const plugin = state.installedPlugins.find((item) => item.id === pluginId)
            if (plugin) {
              plugin.enabled = enabled
            }
          })
        })
        .finally(() => this.setOperation(pluginId, false))
    },

    setDeveloperMode(enabled: boolean) {
      this.$patch((state) => {
        state.developerMode = enabled
      })
    },

    setOperation(pluginId: string, active: boolean) {
      this.$patch((state) => {
        if (active && !state.operationIds.includes(pluginId)) {
          state.operationIds.push(pluginId)
        } else if (!active) {
          state.operationIds = state.operationIds.filter((id) => id !== pluginId)
        }
      })
    }
  }
})
