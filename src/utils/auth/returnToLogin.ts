import { useAvCallStore } from '@/stores/app/avCall'
import { useMessageRemindStore } from '@/stores/message/messageRemind'
import { useMessageUploadStore } from '@/stores/message/messageUpload'
import { useUserStore } from '@/stores/user/user'
import { CALL_INVITE_WINDOW_LABEL, CALL_WINDOW_LABEL } from '@/constants/window'
import {
  closeWebviewWindow,
  createLoginWindow,
  sweepWindowsByReason,
  type WindowDismissAction
} from '@/utils/desktop/window'
import { pauseAllSpaceDownloads } from '@/utils/file/spaceDownloadManager'
import { pauseAllSpaceUploads } from '@/utils/file/spaceUploadManager'
import i18n from '@/services/i18n'

export type ReturnToLoginReason = 'logout' | 'unauthorized' | 'passwordReset'

export interface ReturnToLoginOptions {
  reason?: ReturnToLoginReason
  silent?: boolean
  /** 本次扫窗对这些 label 使用 retain，不关闭 */
  retainLabels?: string[]
}

let inFlight: Promise<void> | null = null

const stopBusinessServices = async () => {
  await Promise.all([
    closeWebviewWindow(CALL_WINDOW_LABEL).catch(() => undefined),
    closeWebviewWindow(CALL_INVITE_WINDOW_LABEL).catch(() => undefined)
  ])
  useAvCallStore().clear()
  pauseAllSpaceUploads()
  pauseAllSpaceDownloads()
  useMessageRemindStore().clearAll()
  useMessageUploadStore().clearAll()
}

const notifyByReason = (reason: ReturnToLoginReason, silent?: boolean) => {
  if (silent) return
  const t = i18n.global.t
  if (reason === 'unauthorized') {
    window.$message?.error(t('auth.unauthorized'))
    return
  }
  if (reason === 'logout') {
    window.$message?.success(t('settings.account.logoutSuccess'))
  }
}

const runReturnToLogin = async (options: ReturnToLoginOptions = {}) => {
  const reason = options.reason || 'logout'
  await stopBusinessServices()
  useUserStore().removeAuthInfo()
  // 提示需在业务窗销毁前发出
  notifyByReason(reason, options.silent)
  // 先确保登录窗就绪（retain），再扫窗关闭当前业务窗，避免本窗口被销毁后后续逻辑中断
  await createLoginWindow()
  const overrides: Partial<Record<string, WindowDismissAction>> = {}
  for (const label of options.retainLabels || []) {
    overrides[label] = 'retain'
  }
  await sweepWindowsByReason('returnToLogin', overrides)
}

/** 统一回登录：停业务 → 清认证 → 按 dismissPolicy 扫窗 → 重建登录窗 */
export const returnToLogin = (options: ReturnToLoginOptions = {}) => {
  if (inFlight) return inFlight
  inFlight = runReturnToLogin(options).finally(() => {
    inFlight = null
  })
  return inFlight
}
