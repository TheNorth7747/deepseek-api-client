"""生成 chat-demo 的 PWA / APP 图标：品牌蓝圆角方块 + 白色对话框。

用法（需要 Pillow）：
    python tools/make_app_icons.py
输出到 public/icons/，供 manifest.webmanifest 与 index.html 引用。
"""

from __future__ import annotations

import pathlib

from PIL import Image, ImageDraw

BRAND_TOP = (47, 85, 242)
BRAND_BOTTOM = (86, 128, 255)
HERE = pathlib.Path(__file__).resolve().parent.parent
OUT = HERE / "public" / "icons"
SS = 4  # 超采样倍数，边缘靠缩小消除锯齿


def rounded_mask(size: int, radius: int) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    return mask


def draw_icon(size: int, rounded: bool = True) -> Image.Image:
    big = size * SS
    icon = Image.new("RGBA", (big, big), (0, 0, 0, 0))

    # 品牌渐变底
    gradient = Image.new("RGBA", (big, big))
    pen = ImageDraw.Draw(gradient)
    for y in range(big):
        ratio = y / (big - 1)
        pen.line(
            [(0, y), (big, y)],
            fill=tuple(round(BRAND_TOP[i] + (BRAND_BOTTOM[i] - BRAND_TOP[i]) * ratio) for i in range(3))
            + (255,),
        )
    # maskable 图标由系统自己裁切，底图必须铺满，否则会被二次裁成双层圆角
    icon.paste(gradient, (0, 0), rounded_mask(big, round(big * 0.2266)) if rounded else None)

    # 白色对话框：圆角矩形 + 左下角尾巴，内容保持在中心 80% 安全区内
    layer = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    box = (round(big * 0.25), round(big * 0.281), round(big * 0.75), round(big * 0.641))
    draw.rounded_rectangle(box, radius=round(big * 0.105), fill=(255, 255, 255, 255))
    tail = [
        (round(big * 0.344), round(big * 0.612)),
        (round(big * 0.438), round(big * 0.612)),
        (round(big * 0.344), round(big * 0.742)),
    ]
    draw.polygon(tail, fill=(255, 255, 255, 255))
    draw.ellipse(
        (
            round(big * 0.322),
            round(big * 0.592),
            round(big * 0.372),
            round(big * 0.642),
        ),
        fill=(255, 255, 255, 255),
    )

    # 三个蓝点
    dot_y = round(big * 0.461)
    dot_r = round(big * 0.043)
    for cx in (0.406, 0.5, 0.594):
        x = round(big * cx)
        draw.ellipse((x - dot_r, dot_y - dot_r, x + dot_r, dot_y + dot_r), fill=BRAND_TOP + (255,))

    icon = Image.alpha_composite(icon, layer)
    return icon.resize((size, size), Image.LANCZOS)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, size, rounded in (
        ("icon-1024.png", 1024, True),
        ("icon-512.png", 512, True),
        ("icon-192.png", 192, True),
        ("icon-maskable-512.png", 512, False),
        ("apple-touch-icon-180.png", 180, False),
    ):
        draw_icon(size, rounded).save(OUT / name)
        print(f"wrote {OUT / name}")


if __name__ == "__main__":
    main()
