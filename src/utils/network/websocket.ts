import WebSocket, { type Message } from '@tauri-apps/plugin-websocket'
import { useUserStore } from '@/stores/user/user'
import { useWebSocketStore } from '@/stores/chat/websocket'
import { WsResponse, type WsRequest } from '@/types/api/websocket'

const WS_URL: string = import.meta.env.VITE_WEBSOCKET_URL + '/api/ws'
const DEVICE = 'desktop'
const HEARTBEAT_ROUTE = 'heartbeat'
const HEARTBEAT_INTERVAL_MS = 30_000

/** 最大重连次�?n */
const MAX_RECONNECT_ATTEMPTS = 10
/** 重连基础间隔 t（ms），�?k 次等�?k * t */
const RECONNECT_BASE_INTERVAL_MS = 3_000

let socket: WebSocket | null = null
let removeMessageListener: (() => void) | null = null
let heartbeatTimer: ReturnType<typeof setInterval> | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let seqCounter = 0
let connecting: Promise<void> | null = null
let reconnectAttempts = 0
let manualClose = false
let handlingConnectionLost = false
const wsStore = useWebSocketStore()

function nextSeqId(): string {
  seqCounter += 1
  return `${Date.now()}-${seqCounter}`
}

function buildRequest(route: string, device?: string, seqId?: string, data?: unknown): WsRequest {
  const request: WsRequest = {
    device: device || DEVICE,
    seqId: seqId || nextSeqId(),
    route
  }
  if (data !== undefined) {
    request.data = data
  }
  return request
}

function getReconnectDelayMs(attempt: number): number {
  return RECONNECT_BASE_INTERVAL_MS * attempt
}

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
}

function resetReconnectState() {
  reconnectAttempts = 0
  clearReconnectTimer()
}

function canReconnect(): boolean {
  return !manualClose && Boolean(useUserStore().authInfo.token) && Boolean(WS_URL)
}

function scheduleReconnect(reason: string) {
  if (!canReconnect()) return
  if (connecting) return

  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error(`[WebSocket] reconnect gave up after ${MAX_RECONNECT_ATTEMPTS} attempts, last reason: ${reason}`)
    return
  }

  reconnectAttempts += 1
  const delay = getReconnectDelayMs(reconnectAttempts)
  console.warn(
    `[WebSocket] will reconnect in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}), reason: ${reason}`
  )

  clearReconnectTimer()
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    void attemptReconnect()
  }, delay)
}

async function attemptReconnect() {
  if (!canReconnect()) return

  try {
    await connectWebSocketInternal()
    console.log('[WebSocket] reconnected')
  } catch (error) {
    console.error('[WebSocket] reconnect failed:', error)
    scheduleReconnect('connect failed')
  }
}

async function handleConnectionLost(reason: string) {
  if (manualClose || handlingConnectionLost) return
  handlingConnectionLost = true
  try {
    await cleanupSocket()
    scheduleReconnect(reason)
  } finally {
    handlingConnectionLost = false
  }
}

function onMessage(msg: Message) {
  if (msg.type === 'Text') {
    try {
      const response = JSON.parse(msg.data) as WsResponse
      if (response.route === 'server') {
        //回复ack消息
        sendWsRequest('ack', response.device, response.seqId)
        wsStore.receiveMsg(response.data?.content || null)
      }
    } catch {
      console.log('[WebSocket] received:', msg.data)
    }
    return
  }
  if (msg.type === 'Close') {
    console.log('[WebSocket] closed:', msg.data)
    void handleConnectionLost('server closed connection')
    return
  }
  console.log('[WebSocket] received:', msg)
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
}

async function sendHeartbeat() {
  try {
    await sendWsRequest(HEARTBEAT_ROUTE)
  } catch (error) {
    console.error('[WebSocket] heartbeat failed:', error)
    void handleConnectionLost('heartbeat failed')
  }
}

function startHeartbeat() {
  stopHeartbeat()
  void sendHeartbeat()
  heartbeatTimer = setInterval(() => {
    void sendHeartbeat()
  }, HEARTBEAT_INTERVAL_MS)
}

async function cleanupSocket() {
  stopHeartbeat()
  removeMessageListener?.()
  removeMessageListener = null

  if (!socket) return

  try {
    await socket.disconnect()
  } catch (error) {
    console.error('[WebSocket] cleanup disconnect error:', error)
  }
  socket = null
}

export function isWebSocketConnected(): boolean {
  return socket !== null
}

async function connectWebSocketInternal(): Promise<void> {
  if (connecting) {
    return connecting
  }

  const token = useUserStore().authInfo.token
  if (!token) {
    console.warn('[WebSocket] skip connect: missing token')
    return
  }
  if (!WS_URL) {
    console.warn('[WebSocket] skip connect: VITE_WEBSOCKET_URL is empty')
    return
  }

  connecting = (async () => {
    await cleanupSocket()

    socket = await WebSocket.connect(WS_URL, {
      headers: {
        Authorization: token,
        device: DEVICE
      }
    })

    removeMessageListener = socket.addListener(onMessage)
    startHeartbeat()
    resetReconnectState()
    console.log('[WebSocket] connected:', WS_URL)
  })()

  try {
    await connecting
  } catch (error) {
    await cleanupSocket()
    throw error
  } finally {
    connecting = null
  }
}

/** 建立 WebSocket 连接�?*/
export async function connectWebSocket(): Promise<void> {
  manualClose = false
  resetReconnectState()

  try {
    await connectWebSocketInternal()
  } catch (error) {
    console.error('[WebSocket] connect failed:', error)
    scheduleReconnect('initial connect failed')
    throw error
  }
}

/** 发�?ws 请求 */
export async function sendWsRequest(route: string, device?: string, seqId?: string, data?: unknown): Promise<void> {
  if (!socket) {
    throw new Error('WebSocket is not connected')
  }
  const payload = buildRequest(route, device, seqId, data)
  await socket.send(JSON.stringify(payload))
}

/** 关闭连接并停止心跳（不会触发重连�?*/
export async function disconnectWebSocket(): Promise<void> {
  manualClose = true
  resetReconnectState()
  await cleanupSocket()
  console.log('[WebSocket] disconnected')
}
