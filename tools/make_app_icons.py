"""生成应用图标：官方鲸鱼标识 + 右下角「API+」角标。

用法（需要 Pillow）：
    python tools/make_app_icons.py

产物：
    public/icons/icon-1024.png、icon-512.png、icon-192.png（圆角，PWA any）
    public/icons/icon-maskable-512.png（满底，Android/PWA maskable）
    public/icons/apple-touch-icon-180.png（方形不圆角，iOS 自己裁）
"""

from __future__ import annotations

import pathlib

from PIL import Image, ImageDraw, ImageFont

HERE = pathlib.Path(__file__).resolve().parent.parent
WHALE = HERE / "public" / "brand" / "whale.png"
OUT = HERE / "public" / "icons"

BRAND = (77, 107, 254)  # 官方品牌蓝 rgb(77,107,254)
SS = 4  # 超采样倍数

FONT_CANDIDATES = (
    r"C:\Windows\Fonts\arialbd.ttf",
    r"C:\Windows\Fonts\segoeuib.ttf",
    r"C:\Windows\Fonts\seguisb.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
)


def rounded_mask(size: int, radius: int) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    return mask


def white_whale(size: int) -> Image.Image:
    """把官方蓝色鲸鱼转成白色版本（保留 alpha 形状）。"""
    whale = Image.open(WHALE).convert("RGBA")
    alpha = whale.split()[3]
    white = Image.new("RGBA", whale.size, (255, 255, 255, 255))
    white.putalpha(alpha)
    return white.resize((size, size), Image.LANCZOS)


def load_font(px: int) -> ImageFont.FreeTypeFont:
    for path in FONT_CANDIDATES:
        if pathlib.Path(path).exists():
            return ImageFont.truetype(path, px)
    return ImageFont.load_default()


def draw_badge(canvas: Image.Image, big: int) -> None:
    """右下角白色胶囊 + 品牌蓝「API+」。"""
    font_size = round(big * 0.10)
    font = load_font(font_size)
    draw = ImageDraw.Draw(canvas)
    text = "API+"
    left, top, right, bottom = draw.textbbox((0, 0), text, font=font)
    text_w, text_h = right - left, bottom - top

    pad_x = round(big * 0.028)
    pad_y = round(big * 0.016)
    pill_w = text_w + pad_x * 2
    pill_h = text_h + pad_y * 2
    margin = round(big * 0.038)
    x1 = big - margin - pill_w
    y1 = big - margin - pill_h

    draw.rounded_rectangle(
        (x1, y1, x1 + pill_w, y1 + pill_h),
        radius=pill_h // 2,
        fill=(255, 255, 255, 255),
    )
    draw.text(
        (x1 + pad_x - left, y1 + pad_y - top),
        text,
        font=font,
        fill=BRAND + (255,),
    )


def build_icon(size: int, rounded: bool, badge: bool = True) -> Image.Image:
    big = size * SS
    canvas = Image.new("RGBA", (big, big), BRAND + (255,))

    # 鲸鱼：居中偏上，给右下角角标留位置
    whale_size = round(big * 0.62)
    whale = white_whale(whale_size)
    canvas.alpha_composite(whale, ((big - whale_size) // 2, round(big * 0.16)))

    if badge:
        draw_badge(canvas, big)

    if rounded:
        mask = rounded_mask(big, round(big * 0.2266))
        out = Image.new("RGBA", (big, big), (0, 0, 0, 0))
        out.paste(canvas, (0, 0), mask)
        canvas = out

    return canvas.resize((size, size), Image.LANCZOS)


def build_foreground(size: int) -> Image.Image:
    """Android 自适应图标前景：透明底，内容收在中心 66% 安全区内。"""
    big = size * SS
    canvas = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    inner = round(big * 0.62)
    layer = Image.new("RGBA", (inner, inner), (0, 0, 0, 0))
    whale_size = round(inner * 0.86)
    layer.alpha_composite(white_whale(whale_size), ((inner - whale_size) // 2, round(inner * 0.06)))
    draw = ImageDraw.Draw(layer)
    font = load_font(round(inner * 0.15))
    text = "API+"
    left, top, right, bottom = draw.textbbox((0, 0), text, font=font)
    pad_x, pad_y = round(inner * 0.04), round(inner * 0.024)
    pill_w, pill_h = (right - left) + pad_x * 2, (bottom - top) + pad_y * 2
    x1 = inner - round(inner * 0.04) - pill_w
    y1 = inner - round(inner * 0.04) - pill_h
    draw.rounded_rectangle((x1, y1, x1 + pill_w, y1 + pill_h), radius=pill_h // 2, fill=(255, 255, 255, 255))
    draw.text((x1 + pad_x - left, y1 + pad_y - top), text, font=font, fill=BRAND + (255,))
    offset = (big - inner) // 2
    canvas.alpha_composite(layer, (offset, offset))
    return canvas.resize((size, size), Image.LANCZOS)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, size, rounded in (
        ("icon-1024.png", 1024, True),
        ("icon-512.png", 512, True),
        ("icon-192.png", 192, True),
        ("icon-maskable-512.png", 512, False),
        ("apple-touch-icon-180.png", 180, False),
    ):
        build_icon(size, rounded).save(OUT / name)
        print(f"wrote {OUT / name}")


if __name__ == "__main__":
    main()
