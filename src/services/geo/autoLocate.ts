import { showToast } from '../../components/base/toastState.js'
import { setLocation, useSettings } from '../settings.js'
import { detectLocation } from './detectLocation.js'

let attempted = false

/**
 * 首次需要位置时自动取一次：填省市并提示，失败静默（用户仍可手选）。
 * 只尝试一次，避免每次打开设置都申请定位。
 */
export const autoLocate = async (): Promise<boolean> => {
  if (attempted) {
    return false
  }
  attempted = true
  if (useSettings.getState().location) {
    return false
  }
  try {
    const detected = await detectLocation()
    if (!detected.provinceCode) {
      return false
    }
    setLocation({
      region: 'CN',
      province: detected.provinceCode,
      city: detected.cityCode,
    })
    showToast({ key: 'settingsLocationDetected', params: { place: detected.label } })
    return true
  } catch {
    return false
  }
}
