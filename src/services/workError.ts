export type WorkErrorAction = 'settings' | 'install' | 'workspace' | 'retry'

export interface ParsedWorkError {
  code: string
  key: string
  action?: WorkErrorAction
}

const errorMap: Record<string, Omit<ParsedWorkError, 'code'>> = {
  WORK_PROVIDER_NOT_CONFIGURED: { key: 'ai.work.errors.providerNotConfigured', action: 'settings' },
  WORK_PROVIDER_NOT_FOUND: { key: 'ai.work.errors.providerNotConfigured', action: 'settings' },
  WORK_PROVIDER_KEY_REQUIRED: { key: 'ai.work.errors.keyRequired', action: 'settings' },
  WORK_PROVIDER_KEY_INVALID: { key: 'ai.work.errors.keyInvalid', action: 'settings' },
  WORK_PROVIDER_URL_INVALID: { key: 'ai.work.errors.endpointInvalid', action: 'settings' },
  WORK_PROVIDER_ENDPOINT_NOT_FOUND: { key: 'ai.work.errors.endpointNotFound', action: 'settings' },
  WORK_PROVIDER_TIMEOUT: { key: 'ai.work.errors.timeout', action: 'retry' },
  WORK_PROVIDER_TEST_FAILED: { key: 'ai.work.errors.connectionFailed', action: 'settings' },
  WORK_PROVIDER_HTTP_ERROR: { key: 'ai.work.errors.connectionFailed', action: 'settings' },
  WORK_PROVIDER_RESPONSE_INVALID: { key: 'ai.work.errors.responseInvalid', action: 'settings' },
  WORK_MODEL_NOT_FOUND: { key: 'ai.work.errors.modelNotConfigured', action: 'settings' },
  WORK_MODEL_NOT_AVAILABLE: { key: 'ai.work.errors.modelUnavailable', action: 'settings' },
  WORK_RUNTIME_NOT_INSTALLED: { key: 'ai.work.errors.runtimeMissing', action: 'install' },
  WORK_RUNTIME_START_FAILED: { key: 'ai.work.errors.runtimeStartFailed', action: 'settings' },
  WORK_RUNTIME_DISCONNECTED: { key: 'ai.work.errors.runtimeDisconnected', action: 'retry' },
  WORK_WORKSPACE_REQUIRED: { key: 'ai.work.errors.workspaceRequired', action: 'workspace' },
  WORK_WORKSPACE_NOT_FOUND: { key: 'ai.work.errors.workspaceMissing', action: 'workspace' },
  WORK_ATTACHMENT_NOT_FOUND: { key: 'ai.work.errors.attachmentMissing', action: 'retry' },
  WORK_ATTACHMENT_READ_FAILED: { key: 'ai.work.errors.attachmentReadFailed', action: 'retry' },
  WORK_KEYRING_FAILED: { key: 'ai.work.errors.keySaveFailed', action: 'settings' },
  WORK_SKILL_CONTENT_REQUIRED: { key: 'ai.work.errors.skillContentRequired', action: 'retry' },
  WORK_SKILL_ID_INVALID: { key: 'ai.work.errors.skillIdInvalid', action: 'retry' },
  WORK_SKILL_LIST_FAILED: { key: 'ai.work.errors.skillListFailed', action: 'retry' }
}

export function parseWorkError(error: unknown): ParsedWorkError {
  const message = error instanceof Error ? error.message : String(error || '')
  if (/model\s+"?.+"?\s+is not configured/i.test(message)) {
    return { code: 'WORK_MODEL_NOT_FOUND', ...errorMap.WORK_MODEL_NOT_FOUND }
  }
  if (/\b(401|unauthorized)\b/i.test(message)) {
    return { code: 'WORK_PROVIDER_KEY_INVALID', ...errorMap.WORK_PROVIDER_KEY_INVALID }
  }
  const code = Object.keys(errorMap).find((item) => message.includes(item)) || 'WORK_UNKNOWN'
  return { code, ...(errorMap[code] || { key: 'ai.work.errors.failed', action: 'retry' as const }) }
}
