import { IconMenuOutline20, IconNewChatOutline20, IconVolumeMuteOutline20, IconVolumeOutline20 } from '../base/icons.js'
import { useTranslate } from '../../i18n/index.js'
import { newChat } from '../../services/chat/store.js'
import { setReadAloudMuted, useSettings } from '../../services/settings.js'
import { stopReadAloud } from '../../services/speech/readAloud.js'
import { IconButton } from '../base/IconButton.js'
import { openMobileSider } from '../sider/mobileSiderState.js'
import styles from './MobileHeader.module.css'

/**
 * 移动端顶栏，对齐官方 App：
 * 左侧悬浮圆形按钮打开侧边栏；中间标题；右侧胶囊内是「静音开关」和「开启新对话」。
 */
export const MobileHeader = ({ title }: { title?: string }) => {
  const t = useTranslate()
  const muted = useSettings((state) => state.readAloudMuted)
  return (
    <div className={styles.header}>
      <IconButton
        size="xl"
        tone="primary"
        className={styles.round}
        icon={<IconMenuOutline20 />}
        aria-label={t('expandSiderbarButton')}
        onClick={openMobileSider}
      />
      {title === undefined ? null : <div className={styles.title}>{title}</div>}
      <div className={styles.pill}>
        <IconButton
          size="m"
          tone="primary"
          icon={muted ? <IconVolumeMuteOutline20 /> : <IconVolumeOutline20 />}
          tooltip={t('toggleSilent')}
          onClick={() => {
            const next = !useSettings.getState().readAloudMuted
            if (next) {
              stopReadAloud()
            }
            setReadAloudMuted(next)
          }}
        />
        <IconButton
          size="m"
          tone="primary"
          icon={<IconNewChatOutline20 />}
          tooltip={t('newChat')}
          onClick={newChat}
        />
      </div>
    </div>
  )
}
