import { registerPlugin } from '@capacitor/core'

/**
 * 原生安装器：把缓存目录里的 APK 通过 FileProvider 交给系统安装界面。
 * 覆盖安装（同包名 + 同签名 + 更高 versionCode）不会清数据，对话与设置都会保留。
 */
export const AppUpdater = registerPlugin<{
  install: (options: { fileName: string }) => Promise<void>
  openExternal: (options: { url: string }) => Promise<void>
}>('AppUpdater')
