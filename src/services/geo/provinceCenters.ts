/**
 * 省级行政中心坐标（近似值）。
 * 用途：设备 Geocoder 不可用时（部分 Custom ROM / 无地理编码服务的模拟器），
 * 用最近省会的粗略距离兜底到省级，至少把「省份」填上，城市留给用户手选。
 */
export const provinceCenters: { code: string; lat: number; lon: number }[] = [
  { code: '110000', lat: 39.9042, lon: 116.4074 },
  { code: '120000', lat: 39.1256, lon: 117.1901 },
  { code: '130000', lat: 38.0428, lon: 114.5149 },
  { code: '140000', lat: 37.8706, lon: 112.5489 },
  { code: '150000', lat: 40.8414, lon: 111.7519 },
  { code: '210000', lat: 41.8057, lon: 123.4315 },
  { code: '220000', lat: 43.8171, lon: 125.3235 },
  { code: '230000', lat: 45.8038, lon: 126.5349 },
  { code: '310000', lat: 31.2304, lon: 121.4737 },
  { code: '320000', lat: 32.0603, lon: 118.7969 },
  { code: '330000', lat: 30.2741, lon: 120.1551 },
  { code: '340000', lat: 31.8206, lon: 117.2272 },
  { code: '350000', lat: 26.0745, lon: 119.2965 },
  { code: '360000', lat: 28.682, lon: 115.8579 },
  { code: '370000', lat: 36.6512, lon: 117.1201 },
  { code: '410000', lat: 34.7466, lon: 113.6254 },
  { code: '420000', lat: 30.5928, lon: 114.3055 },
  { code: '430000', lat: 28.2282, lon: 112.9388 },
  { code: '440000', lat: 23.1291, lon: 113.2644 },
  { code: '450000', lat: 22.817, lon: 108.3665 },
  { code: '460000', lat: 20.044, lon: 110.1999 },
  { code: '500000', lat: 29.563, lon: 106.5516 },
  { code: '510000', lat: 30.5728, lon: 104.0668 },
  { code: '520000', lat: 26.6477, lon: 106.6302 },
  { code: '530000', lat: 25.0389, lon: 102.7183 },
  { code: '540000', lat: 29.6525, lon: 91.1721 },
  { code: '610000', lat: 34.3416, lon: 108.9398 },
  { code: '620000', lat: 36.0611, lon: 103.8343 },
  { code: '630000', lat: 36.6171, lon: 101.7782 },
  { code: '640000', lat: 38.4872, lon: 106.2309 },
  { code: '650000', lat: 43.8256, lon: 87.6168 },
  { code: '710000', lat: 25.033, lon: 121.5654 },
  { code: '810000', lat: 22.3193, lon: 114.1694 },
  { code: '820000', lat: 22.1987, lon: 113.5439 },
]

/** 取最近的省级中心；距离用经纬度平方差近似，够省级判断用 */
export const nearestProvince = (lat: number, lon: number): string | undefined => {
  let best: string | undefined
  let bestDistance = Number.POSITIVE_INFINITY
  for (const center of provinceCenters) {
    const dLat = center.lat - lat
    const dLon = (center.lon - lon) * Math.cos((lat * Math.PI) / 180)
    const distance = dLat * dLat + dLon * dLon
    if (distance < bestDistance) {
      bestDistance = distance
      best = center.code
    }
  }
  return best
}
