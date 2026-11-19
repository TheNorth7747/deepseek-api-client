import { useEffect, useState } from 'react'

/**
 * 让「关掉」也有动画：open 变 false 后先保留挂载，等退场动画播完再卸载。
 * 返回 mounted 控制是否渲染，closing 用于挂退场类名。
 */
export const usePresence = (open: boolean, duration = 200) => {
  const [mounted, setMounted] = useState(open)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      setClosing(false)
      return
    }
    if (!mounted) {
      return
    }
    setClosing(true)
    const timer = setTimeout(() => {
      setMounted(false)
      setClosing(false)
    }, duration)
    return () => clearTimeout(timer)
  }, [open, mounted, duration])

  return { mounted, closing }
}
