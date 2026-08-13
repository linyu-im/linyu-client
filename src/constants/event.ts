// 呼叫/通话事件
export const CALL_JOIN_EVENT = 'call:join'
export const CALL_REMOTE_HANGUP_EVENT = 'call:remote-hangup'
export const CALL_ROOM_CHANGE_EVENT = 'call:room-change'
export const CALL_INVITE_UPDATE_EVENT = 'callinvite:update'
export const CALL_INVITE_HANGUP_EVENT = 'callinvite:hangup'

// 导航/窗口事件
export const HOME_TAB_NAVIGATE_EVENT = 'home-tab://navigate'
export const SETTINGS_NAVIGATE_EVENT = 'settings:navigate'
export const MESSAGE_REMIND_SHOW_EVENT = 'message-remind://show-near-tray'
export const TRAY_MENU_SYNC_EVENT = 'tray://menu-sync'

// 插件运行时事件
export const PLUGIN_RUNTIME_REQUEST_EVENT = 'plugin-runtime:request'
export const PLUGIN_RUNTIME_RESPONSE_EVENT = 'plugin-runtime:response'
export const PLUGIN_LIFECYCLE_EVENT = 'plugin:lifecycle'
export const PLUGIN_APPEARANCE_EVENT = 'system.appearanceChanged'

// 通知/工作事件
export const APP_NOTIFICATION_ACTION_EVENT = 'app://notification-action'
export const WORK_EVENT = 'work://event'

// 上传/下载进度事件
export const UPLOAD_FILE_PROGRESS_EVENT = 'upload-file-progress'
export const SPACE_UPLOAD_FILE_PROGRESS_EVENT = 'space-upload-file-progress'
export const SPACE_DOWNLOAD_FILE_PROGRESS_EVENT = 'space-download-file-progress'

// 服务端聊天消息跨窗口广播事件（WS 仅在 home 连接）
export const CHAT_SERVER_MESSAGE_EVENT = 'chat://server-message'
