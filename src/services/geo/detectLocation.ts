import { registerPlugin } from '@capacitor/core'
import { isNativePlatform } from '../../app/native.js'
import { provinces } from '../location.js'
import { nearestProvince } from './provinceCenters.js'
import { nearestCity } from './cityCenters.js'

type NativeLocation = {
  latitude: number
  longitude: number
  countryCode?: string
  province?: string
  city?: string
}

const DeviceLocation = registerPlugin<{ getLocation: () => Promise<NativeLocation> }>(
  'DeviceLocation'
)

export type DetectedLocation = {
  region: string
  provinceCode?: string
  cityCode?: string
  /** 用于提示的展示名，如「广东省 深圳市」 */
  label: string
}

/** Geocoder 返回的「广东省」「深圳市」对齐到本地省市表用的键 */
const normalize = (name: string) =>
  name.replace(/(省|市|特别行政区|自治区|自治州|壮族|回族|维吾尔|地区|盟)$/gu, '').trim()

const matchProvince = (name: string) => {
  const target = normalize(name)
  if (!target) {
    return undefined
  }
  return provinces.find(
    (item) => item.name === name || normalize(item.name) === target || normalize(item.name).startsWith(target)
  )
}

const matchCity = (provinceCode: string, name: string) => {
  const province = provinces.find((item) => item.code === provinceCode)
  if (!province) {
    return undefined
  }
  const target = normalize(name)
  if (!target) {
    return undefined
  }
  return province.cities.find(
    (city) => city.name === name || normalize(city.name) === target || normalize(city.name).startsWith(target)
  )
}

const fromNative = async (): Promise<DetectedLocation> => {
  const result = await DeviceLocation.getLocation()
  const region = result.countryCode?.toUpperCase() || 'CN'
  if (region !== 'CN') {
    return { region, label: region }
  }
  const province = matchProvince(result.province ?? '')
  const city = province ? matchCity(province.code, result.city ?? '') : undefined
  if (province) {
    return {
      region,
      provinceCode: province.code,
      cityCode: city?.code,
      label: [province.name, city?.name].filter(Boolean).join(' '),
    }
  }
  // Geocoder 不可用（部分 ROM / 模拟器 / 无地理编码服务）：先用离最近地级市兜底，
  // 再退到最近省会，尽量避免让用户手选。
  const cityCode = nearestCity(result.latitude, result.longitude)
  if (cityCode) {
    const provinceCode = `${cityCode.slice(0, 2)}0000`
    const provinceItem = provinces.find((item) => item.code === provinceCode)
    const cityItem = provinceItem?.cities.find((item) => item.code === cityCode)
    if (provinceItem && cityItem) {
      return {
        region,
        provinceCode,
        cityCode,
        label: `${provinceItem.name} ${cityItem.name}`
      }
    }
  }
  const fallbackCode = nearestProvince(result.latitude, result.longitude)
  const fallback = provinces.find((item) => item.code === fallbackCode)
  return {
    region,
    provinceCode: fallback?.code,
    cityCode: undefined,
    label: fallback?.name ?? '',
  }
}

/** 浏览器/桌面兜底：定位精度更低，且不做省市反查 */
const fromBrowser = (): Promise<DetectedLocation> =>
  new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('unsupported'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      () => resolve({ region: 'CN', label: '' }),
      (error) => reject(error),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
    )
  })

/**
 * 获取当前所在省市。
 * 原生壳走自定义插件（LocationManager + Geocoder），网页端只在拿到坐标时返回空省市，
 * 由调用方提示「手动选择」。
 */
export const detectLocation = async (): Promise<DetectedLocation> => {
  if (isNativePlatform()) {
    return fromNative()
  }
  return fromBrowser()
}
