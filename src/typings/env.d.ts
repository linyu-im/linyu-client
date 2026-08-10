/// <reference types="vite/client" />

declare const __APP_VERSION__: string
declare const __APP_VERSION_CODE__: number

declare module 'spark-md5' {
  const SparkMD5: {
    hash(str: string): string
    append(str: string): SparkMD5
    end(): string
    reset(): SparkMD5
    getState(): { buff: Uint8Array; length: number; hash: number[] }
    setState(state: { buff: Uint8Array; length: number; hash: number[] }): SparkMD5
    destroy(): void
  }
  export default SparkMD5
}
interface ImportMetaEnv {
  readonly VITE_SERVICE_URL: string
  readonly VITE_WEBSOCKET_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare interface Window {
  $message: ReturnType<typeof useMessage>
}
