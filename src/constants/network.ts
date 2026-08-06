// WebSocket 配置
export const WS_URL = import.meta.env.VITE_WEBSOCKET_URL + '/api/ws'
export const WS_DEVICE = 'desktop'
export const WS_HEARTBEAT_ROUTE = 'heartbeat'
export const WS_HEARTBEAT_INTERVAL_MS = 30_000
export const WS_MAX_RECONNECT_ATTEMPTS = 10
export const WS_RECONNECT_BASE_INTERVAL_MS = 3_000

// HTTP 服务地址
export const SERVICE_URL = import.meta.env.VITE_SERVICE_URL
