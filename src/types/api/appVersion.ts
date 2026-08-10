export interface AppVersionCheckParam {
  platform: string
}

export interface AppVersionCheckResult {
  platform: string
  latestVersion: string
  latestVersionCode: number
  minSupportVersion: string
  minSupportVersionCode: number
  downloadUrl: string
  updateDesc: string
}
