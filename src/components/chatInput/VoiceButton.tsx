import clsx from 'clsx'
import { useRef } from 'react'
import { useTranslate } from '../../i18n/index.js'
import { IconMicFill16, IconMicOutline16 } from '../base/icons.js'
import { Tooltip } from '../base/Tooltip.js'
import type { VoiceInputStatus } from './useVoiceInput.js'
import styles from './VoiceButton.module.css'

/** 上滑超过这个距离（px）即进入「取消」待定态 */
export const CANCEL_DISTANCE = 64
/** 短于这个时长的按压视为「点了一下」，只提示需要按住 */
const TAP_MS = 220

/**
 * 语音按钮：按住说话，松手转写；按住后上滑超过阈值，松手即取消（蓝→红）。
 * 单击不再切换录音，避免和长按手势打架。
 */
export const VoiceButton = ({
  status,
  disabled = false,
  seconds,
  onHoldStart,
  onHoldMove,
  onHoldEnd,
  onTapHint,
}: {
  status: VoiceInputStatus
  /** 环境不支持录音时置灰 */
  disabled?: boolean
  /** 本次录音已录秒数 */
  seconds: number
  onHoldStart: () => void
  onHoldMove: (offsetY: number) => void
  onHoldEnd: (cancelled: boolean) => void
  onTapHint: () => void
}) => {
  const t = useTranslate()
  const recording = status === 'recording'
  const startedAt = useRef(0)
  const cancelled = useRef(false)

  const label = disabled ? t('voiceInputRequiresHttps') : t('voiceHoldToTalk')

  const finish = (element: HTMLElement, pointerId: number) => {
    try {
      element.releasePointerCapture(pointerId)
    } catch {
      // 指针可能已失效
    }
    if (!startedAt.current) {
      return
    }
    const held = Date.now() - startedAt.current
    startedAt.current = 0
    if (held < TAP_MS && !cancelled.current) {
      onHoldEnd(true)
      onTapHint()
      return
    }
    onHoldEnd(cancelled.current)
    cancelled.current = false
  }

  return (
    <>
      {recording ? <span className={styles.timer}>{t('voiceInputTimer', { seconds })}</span> : null}
      <Tooltip content={label}>
        <button
          type="button"
          className={clsx(
            styles.button,
            recording && styles.recording,
            disabled && styles.disabled
          )}
          aria-label={label}
          aria-pressed={recording}
          aria-disabled={disabled}
          onPointerDown={(event) => {
            if (disabled || startedAt.current) {
              return
            }
            try {
              event.currentTarget.setPointerCapture(event.pointerId)
            } catch {
              // 合成事件或指针已失效时忽略
            }
            startedAt.current = Date.now()
            cancelled.current = false
            onHoldStart()
          }}
          onPointerMove={(event) => {
            if (!startedAt.current) {
              return
            }
            const offset = Math.min(0, event.clientY - (event.currentTarget.getBoundingClientRect().bottom - 18))
            onHoldMove(offset)
            cancelled.current = offset < -CANCEL_DISTANCE
          }}
          onPointerUp={(event) => finish(event.currentTarget, event.pointerId)}
          onPointerCancel={(event) => finish(event.currentTarget, event.pointerId)}
          onContextMenu={(event) => event.preventDefault()}
        >
          {recording ? (
            <span className={styles.active}>
              <span className={styles.halo} />
              <span className={styles.core} />
              <span className={styles.outline}>
                <IconMicOutline16 />
              </span>
              <span className={styles.glyph}>
                <IconMicFill16 />
              </span>
            </span>
          ) : status === 'transcribing' ? (
            <span className={styles.loading} />
          ) : (
            <IconMicOutline16 />
          )}
        </button>
      </Tooltip>
    </>
  )
}
