import { isNativePlatform } from '../../app/native.js'

/** 仓库与更新源；改这里即可指向你自己的 fork */
export const REPO = 'TheNorth7747/deepseek-api-client'
export const REPO_URL = `https://github.com/${REPO}`
const RELEASES_API = `https://api.github.com/repos/${REPO}/releases/latest`
const RELEASES_PAGE = `https://github.com/${REPO}/releases/latest`

export type UpdateInfo = {
  current: string
  latest: string
  hasUpdate: boolean
  /** 发布说明（markdown 原文） */
  notes: string
  /** APK 直链，原生壳直接用 Filesystem 下载 */
  apkUrl: string | null
  /** 网页端跳转用 */
  pageUrl: string
  publishedAt?: string
}

const normalize = (version: string) => version.replace(/^v/i, '').trim()

/** a 是否比 b 新（按数字段比较，忽略 pre-release 后缀） */
export const isNewer = (a: string, b: string): boolean => {
  const pa = normalize(a).split('.').map((part) => Number.parseInt(part, 10) || 0)
  const pb = normalize(b).split('.').map((part) => Number.parseInt(part, 10) || 0)
  const length = Math.max(pa.length, pb.length)
  for (let i = 0; i < length; i += 1) {
    const left = pa[i] ?? 0
    const right = pb[i] ?? 0
    if (left !== right) {
      return left > right
    }
  }
  return false
}

/** 允许用 localStorage 覆盖更新源，便于本地联调（例如指向 mock 服务） */
const endpoint = () =>
  (typeof localStorage === 'undefined' ? null : localStorage.getItem('chat-demo:update-endpoint')) ||
  RELEASES_API

type GithubRelease = {
  tag_name?: string
  name?: string
  body?: string
  html_url?: string
  published_at?: string
  assets?: { name?: string; browser_download_url?: string }[]
}

/**
 * 查询最新版本。
 * 走 GitHub Releases 公开接口（无需 token，限流 60 次/小时/IP），
 * 浏览器端若被 CORS 挡住会抛错，由调用方提示手动前往 Release 页。
 */
export const checkUpdate = async (signal?: AbortSignal): Promise<UpdateInfo> => {
  const response = await fetch(endpoint(), {
    headers: { Accept: 'application/vnd.github+json' },
    signal,
  })
  if (!response.ok) {
    throw new Error(`update-check-${response.status}`)
  }
  const release = (await response.json()) as GithubRelease
  const latest = normalize(release.tag_name ?? release.name ?? '')
  if (!latest) {
    throw new Error('update-check-invalid')
  }
  const apk = release.assets?.find((asset) => asset.name?.toLowerCase().endsWith('.apk'))
  return {
    current: normalize(__APP_VERSION__),
    latest,
    hasUpdate: isNewer(latest, __APP_VERSION__),
    notes: release.body ?? '',
    apkUrl: apk?.browser_download_url ?? null,
    pageUrl: release.html_url || RELEASES_PAGE,
    publishedAt: release.published_at,
  }
}

export type InstallResult = 'installed' | 'opened-page'

const APK_FILE = 'update.apk'

/**
 * 下载并安装：原生壳写缓存目录 → 交给系统安装器；网页端打开 Release 页。
 * 注意：同包名、同签名、versionCode 递增的安装是「覆盖升级」，应用数据（含 IndexedDB 里的对话）会保留。
 */
export const downloadAndInstall = async (
  info: UpdateInfo
): Promise<InstallResult> => {
  if (!isNativePlatform() || !info.apkUrl) {
    window.open(info.pageUrl, '_blank', 'noopener,noreferrer')
    return 'opened-page'
  }

  const [{ Filesystem, Directory }, { AppUpdater }] = await Promise.all([
    import('@capacitor/filesystem'),
    import('./appUpdater.js'),
  ])

  await Filesystem.downloadFile({
    url: info.apkUrl,
    path: APK_FILE,
    directory: Directory.Cache,
  })

  await AppUpdater.install({ fileName: APK_FILE })
  return 'installed'
}
