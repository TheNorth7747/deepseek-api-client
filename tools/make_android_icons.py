"""把 Android 原生工程的启动图标与启动画面换成「官方鲸鱼 + API+ 角标」。

用法（需要 Pillow）：
    python tools/make_android_icons.py

读取 android/app/src/main/res 下已有 PNG 的尺寸，按同样尺寸重绘，
因此新增密度目录时不用改脚本。图标内容由 make_app_icons 统一绘制。
"""

from __future__ import annotations

import pathlib
import sys

from PIL import Image, ImageDraw

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from make_app_icons import BRAND, build_foreground, build_icon  # noqa: E402

HERE = pathlib.Path(__file__).resolve().parent.parent
RES = HERE / "android" / "app" / "src" / "main" / "res"


def circle_mask(size: int) -> Image.Image:
    mask = Image.new("L", (size * 4, size * 4), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size * 4 - 1, size * 4 - 1), fill=255)
    return mask.resize((size, size), Image.LANCZOS)


def splash(size_wh: tuple[int, int]) -> Image.Image:
    w, h = size_wh
    canvas = Image.new("RGBA", (w, h), (255, 255, 255, 255))
    side = round(min(w, h) * 0.3)
    mark = build_icon(side, rounded=True)
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
                icon = build_foreground(size[0])
            elif name == "ic_launcher_round.png":
                base = build_icon(size[0], rounded=False)
                base.putalpha(circle_mask(size[0]))
                icon = base
            else:
                icon = build_icon(size[0], rounded=True)

            icon.save(target)
            print(f"wrote {target.relative_to(HERE)} {size}")

    for splash_png in RES.glob("drawable*/splash.png"):
        with Image.open(splash_png) as existing:
            size = existing.size
        splash(size).save(splash_png)
        print(f"wrote {splash_png.relative_to(HERE)} {size}")

    # 自适应图标背景层：品牌蓝
    background = RES / "values" / "ic_launcher_background.xml"
    if background.exists():
        background.write_text(
            '<?xml version="1.0" encoding="utf-8"?>\n'
            "<resources>\n"
            f'    <color name="ic_launcher_background">#{BRAND[0]:02X}{BRAND[1]:02X}{BRAND[2]:02X}</color>\n'
            "</resources>\n",
            encoding="utf-8",
        )
        print(f"wrote {background.relative_to(HERE)}")


if __name__ == "__main__":
    main()
