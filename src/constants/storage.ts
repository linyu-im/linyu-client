export const STORAGE_LANG_KEY = 'lang'

export const PLUGIN_WINDOW_BOUNDS_KEY_PREFIX = 'linyu:plugin-window-bounds'
export const pluginWindowBoundsKey = (pluginId: string, windowId: string) =>
  `${PLUGIN_WINDOW_BOUNDS_KEY_PREFIX}:${pluginId}:${windowId}`
