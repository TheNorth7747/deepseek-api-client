"""把 Android 原生工程的启动图标与启动画面换成本项目的品牌标记。

用法（需要 Pillow）：
    python tools/make_android_icons.py
读取 android/app/src/main/res 下已有的 PNG 尺寸，按同样尺寸重绘，
因此新增密度目录时不用改脚本。
"""

from __future__ import annotations

import pathlib

from PIL import Image, ImageDraw

from make_app_icons import BRAND_BOTTOM, BRAND_TOP, draw_icon

HERE = pathlib.Path(__file__).resolve().parent.parent
RES = HERE / "android" / "app" / "src" / "main" / "res"


def circle_mask(size: int) -> Image.Image:
    mask = Image.new("L", (size * 4, size * 4), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size * 4 - 1, size * 4 - 1), fill=255)
    return mask.resize((size, size), Image.LANCZOS)


def glyph_layer(size: int) -> Image.Image:
    """自适应图标前景：透明底 + 居中鲸形，四周留出约 1/3 的安全边距。"""
    big = size * 4
    canvas = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    inner = round(big * 0.58)
    mark = draw_icon(inner, rounded=False)
    # 只保留白色图形与鲸形本体：把整图缩放到中心
    canvas.alpha_composite(mark, ((big - inner) // 2, (big - inner) // 2))
    return canvas.resize((size, size), Image.LANCZOS)


def splash(size_wh: tuple[int, int]) -> Image.Image:
    w, h = size_wh
    canvas = Image.new("RGBA", (w, h), (255, 255, 255, 255))
    mark = draw_icon(round(min(w, h) * 0.28), rounded=True)
    canvas.alpha_composite(mark, ((w - mark.width) // 2, (h - mark.height) // 2))
    return canvas.convert("RGB")


def main() -> None:
    if not RES.exists():
        raise SystemExit(f"未找到 Android 资源目录：{RES}")

    for density in ("mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"):
        folder = RES / f"mipmap-{density}"
        if not folder.exists():
            continue
        for name in ("ic_launcher.png", "ic_launcher_round.png", "ic_launcher_foreground.png"):
            target = folder / name
            if not target.exists():
                continue
            with Image.open(target) as existing:
                size = existing.size

            if name == "ic_launcher_foreground.png":
                icon = glyph_layer(size[0])
            elif name == "ic_launcher_round.png":
                base = draw_icon(size[0], rounded=False).convert("RGBA")
                base.putalpha(circle_mask(size[0]))
                icon = base
            else:
                icon = draw_icon(size[0], rounded=True)

            icon.save(target)
            print(f"wrote {target.relative_to(HERE)} {size}")

    for splash_png in RES.glob("drawable*/splash.png"):
        with Image.open(splash_png) as existing:
            size = existing.size
        splash(size).save(splash_png)
        print(f"wrote {splash_png.relative_to(HERE)} {size}")

    # 自适应图标背景色：与品牌蓝一致
    background = RES / "values" / "ic_launcher_background.xml"
    if background.exists():
        background.write_text(
            '<?xml version="1.0" encoding="utf-8"?>\n'
            "<resources>\n"
            f'    <color name="ic_launcher_background">#{BRAND_TOP[0]:02X}{BRAND_TOP[1]:02X}{BRAND_TOP[2]:02X}</color>\n'
            "</resources>\n",
            encoding="utf-8",
        )
        print(f"wrote {background.relative_to(HERE)}")
    _ = BRAND_BOTTOM


if __name__ == "__main__":
    main()
