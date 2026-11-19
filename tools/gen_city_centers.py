"""生成地级市中心坐标表（离线最近邻兜底用）。

数据源：阿里云 DataV 行政区划 GeoJSON（免密钥，国内可直连）。
只保留项目里 cityNames 已有 adcode，避免与本地省市表不一致。

用法：python tools/gen_city_centers.py
产物：src/services/geo/cityCenters.ts
"""

from __future__ import annotations

import json
import pathlib
import re
import urllib.request

HERE = pathlib.Path(__file__).resolve().parent.parent
LOCATION_DATA = HERE / "src" / "services" / "locationData.ts"
OUT = HERE / "src" / "services" / "geo" / "cityCenters.ts"
BASE = "https://geo.datav.aliyun.com/areas_v3/bound/{code}_full.json"


def fetch(url: str) -> dict:
    request = urllib.request.Request(url, headers={"User-Agent": "deepseek-api-client/1.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def known_city_codes() -> set[str]:
    text = LOCATION_DATA.read_text(encoding="utf-8")
    block = text[text.index("cityNames") :]
    return set(re.findall(r"'(\d{6})':", block))


def main() -> None:
    cities = known_city_codes()
    print(f"本地城市表：{len(cities)} 个")

    countries = fetch(BASE.format(code="100000"))
    provinces = [
        feature["properties"]["adcode"]
        for feature in countries["features"]
        if feature["properties"].get("level") == "province"
    ]
    print(f"省级单位：{len(provinces)}")

    rows: list[tuple[str, float, float]] = []
    for adcode in provinces:
        try:
            data = fetch(BASE.format(code=adcode))
        except Exception as error:  # 某个省失败不影响整体
            print(f"  跳过 {adcode}: {error}")
            continue
        for feature in data.get("features", []):
            props = feature["properties"]
            raw_code = props.get("adcode")
            center = props.get("center") or props.get("centroid")
            if raw_code is None or not center:
                continue
            code = str(raw_code)
            if code not in cities:
                continue
            lon, lat = float(center[0]), float(center[1])
            rows.append((code, round(lat, 4), round(lon, 4)))

    rows.sort(key=lambda item: item[0])
    print(f"生成条目：{len(rows)}")

    lines = [
        "/**",
        " * 地级市中心坐标（离线最近邻兜底）。",
        " * 由 tools/gen_city_centers.py 从阿里云 DataV 行政区划数据生成，请勿手工编辑。",
        " */",
        "export const cityCenters: { code: string; lat: number; lon: number }[] = [",
    ]
    for code, lat, lon in rows:
        lines.append(f"  {{ code: '{code}', lat: {lat}, lon: {lon} }},")
    lines.append("]")
    lines.append("")
    lines.append("/** 取最近的地级市中心；超过 2.5 度视为不可信，返回 undefined */")
    lines.append("export const nearestCity = (lat: number, lon: number) => {")
    lines.append("  let best: { code: string; distance: number } | undefined")
    lines.append("  for (const city of cityCenters) {")
    lines.append("    const dLat = city.lat - lat")
    lines.append("    const dLon = (city.lon - lon) * Math.cos((lat * Math.PI) / 180)")
    lines.append("    const distance = Math.sqrt(dLat * dLat + dLon * dLon)")
    lines.append("    if (!best || distance < best.distance) {")
    lines.append("      best = { code: city.code, distance }")
    lines.append("    }")
    lines.append("  }")
    lines.append("  return best && best.distance <= 2.5 ? best.code : undefined")
    lines.append("}")
    lines.append("")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"写入 {OUT}")


if __name__ == "__main__":
    main()
