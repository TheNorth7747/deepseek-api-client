/**
 * 品牌鲸形：直接使用官方图标资源（public/brand/whale.png，取自 deepseek.com 的站点图标）。
 * 用 <img> 而非内联 SVG，避免手绘描摹与官方造型产生偏差。
 */
export const BrandMark = ({ size = 64 }: { size?: number }) => (
  <img
    className="ds-brand-mark"
    src="./brand/whale.png"
    width={size}
    height={size}
    alt="DeepSeek"
    draggable={false}
    style={{ display: 'block', width: size, height: size, objectFit: 'contain' }}
  />
)
