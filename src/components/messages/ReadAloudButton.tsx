import { useTranslate } from '../../i18n/index.js'
import {
  describeReadAloudError,
  stopReadAloud,
  toggleReadAloud,
  useReadAloud,
} from '../../services/speech/readAloud.js'
import { useSettings } from '../../services/settings.js'
import { IconPlayMediaOutline16 } from '../base/icons.js'
import { IconButton } from '../base/IconButton.js'
import { showToast } from '../base/toastState.js'
import { ReadingBars } from './ReadingBars.js'

/**
 * 朗读按钮：未朗读时点击开始，加载中或朗读中点击停止；正文原样提交，由服务端过滤 markdown。
 * 顶栏静音开关打开时按钮置灰并吸附当前播放。
 */
export const ReadAloudButton = ({ messageId, text }: { messageId: string; text: string }) => {
  const t = useTranslate()
  const muted = useSettings((state) => state.readAloudMuted)
  const status = useReadAloud((state) => (state.messageId === messageId ? state.status : 'idle'))
  return (
    <IconButton
      icon={status === 'idle' ? <IconPlayMediaOutline16 /> : <ReadingBars mode={status} />}
      tooltip={muted ? t('ttsMuted') : status === 'idle' ? t('ttsPlay') : t('ttsStop')}
      tooltipPlacement="bottom"
      disabled={muted}
      onClick={() => {
        if (muted) {
          return
        }
        if (status !== 'idle') {
          stopReadAloud()
          return
        }
        toggleReadAloud(messageId, text, (error) => showToast(describeReadAloudError(error)))
      }}
    />
  )
}
