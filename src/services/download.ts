import { isNativePlatform } from '../app/native.js'

/** 保存结果的形态：浏览器直接下载，或交给系统分享面板（原生壳） */
export type SaveResult = 'downloaded' | 'shared'

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result ?? '')
      // "data:application/zip;base64,xxxx" → 只取负载部分
      resolve(result.slice(result.indexOf(',') + 1))
    }
    reader.onerror = () => reject(reader.error ?? new Error('read blob failed'))
    reader.readAsDataURL(blob)
  })

/**
 * 保存 Blob 到用户可拿到的位置。
 *
 * Android WebView 不处理 `<a download>` 触发的 Blob 下载（点了完全没反应），
 * 所以原生壳里改为：写入缓存目录 → 调起系统分享面板，用户可选「保存到文件」。
 * 浏览器里保持原来的 a[download] 行为。
 */
export const saveBlob = async (blob: Blob, name: string): Promise<SaveResult> => {
  if (isNativePlatform()) {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import('@capacitor/filesystem'),
      import('@capacitor/share'),
    ])
    const data = await blobToBase64(blob)
    const { uri } = await Filesystem.writeFile({
      path: name,
      data,
      directory: Directory.Cache,
      recursive: true,
    })
    // 部分精简系统（如 AOSP 模拟器）没有任何能接收 ACTION_SEND 的应用，
    // 此时不吞掉异常，交给调用方提示文件已暂存。
    await Share.share({ title: name, url: uri, dialogTitle: name })
    return 'shared'
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'downloaded'
}
