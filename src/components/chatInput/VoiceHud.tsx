import clsx from 'clsx'
import { createPortal } from 'react-dom'
import { useTranslate } from '../../i18n/index.js'
import styles from './VoiceHud.module.css'

/**
 * 录音提示浮层：挂在 body 上，避免被输入卡片的 overflow 裁掉。
 * 上滑超过阈值时整块由蓝转红，提示「松手即取消」。
 */
export const VoiceHud = ({
  open,
  seconds,
  cancelling,
}: {
  open: boolean
  seconds: number
  cancelling: boolean
}) => {
  const t = useTranslate()
  if (!open) {
    return null
  }
  return createPortal(
    <div
      className={clsx(styles.hud, cancelling && styles.cancel)}
      role="status"
      aria-live="polite"
    >
      <span className={styles.glow} aria-hidden="true" />
      <span className={styles.wave} aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>
      <span className={styles.text}>
        {cancelling ? t('voiceReleaseToCancel') : t('voiceReleaseToSend')}
      </span>
      <span className={styles.meta}>
        {cancelling ? '' : `${seconds}s · ${t('voiceSlideUpToCancel')}`}
      </span>
    </div>,
    document.body
  )
}
