/**
 * 原生壳（Capacitor Android/iOS）适配。
 *
 * WebView 里 `env(safe-area-inset-*)` 不一定有值：Android WebView 常常返回 0，
 * 而系统状态栏已经压在 WebView 上方。这里测一次真实值，测不到时按平台给兜底高度，
 * 写进 `--app-safe-top` / `--app-safe-bottom`，CSS 统一用
 * `var(--app-safe-top, env(safe-area-inset-top))` 读取。
 */

type CapacitorGlobal = { getPlatform?: () => string; isNativePlatform?: () => boolean }

const STATUS_BAR_FALLBACK = { android: 24, ios: 0 }

/** 读一次 env() 的真实像素值；不支持时返回 0 */
const readInset = (edge: 'top' | 'bottom') => {
  const probe = document.createElement('div')
  probe.style.cssText = `position:fixed;${edge}:env(safe-area-inset-${edge});left:0;width:0;height:0;visibility:hidden;pointer-events:none`
  document.body.appendChild(probe)
  const value = Number.parseFloat(getComputedStyle(probe)[edge === 'top' ? 'top' : 'bottom'])
  probe.remove()
  return Number.isFinite(value) ? value : 0
}

export const setupNativeInsets = () => {
  const capacitor = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor
  if (!capacitor?.isNativePlatform?.()) {
    return
  }
  const platform = capacitor.getPlatform?.() ?? 'android'
  const top = readInset('top')
  const bottom = readInset('bottom')
  const fallbackTop = STATUS_BAR_FALLBACK[platform === 'ios' ? 'ios' : 'android']
  const root = document.documentElement
  root.style.setProperty('--app-safe-top', `${top || fallbackTop}px`)
  root.style.setProperty('--app-safe-bottom', `${bottom}px`)
  root.dataset.nativePlatform = platform
}

/**
 * 是否运行在原生壳（Android / iOS）里。
 */
export const isNativePlatform = (): boolean => {
  const capacitor = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor
  return Boolean(capacitor?.isNativePlatform?.())
}
/**
 * 是否运行在原生 Android 壳里。
 * Android WebView 的文件选择器不识别 `capture`，`<input capture>` 只会打开系统相册，
 * 所以「拍照」入口在原生 Android 上先隐藏，等接入 @capacitor/camera 再打开。
 */
export const isNativeAndroid = (): boolean => {
  const capacitor = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor
  return Boolean(capacitor?.isNativePlatform?.()) && capacitor?.getPlatform?.() === 'android'
}
