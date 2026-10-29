"""生成幻灯片素材：标志适配、车体渲染裁边、代价图、占位图。

    node tools/render_robot.mjs   # 先渲染整车图
    py -3.12 tools/prep_assets.py

只读取 showcase/assets 与总仓库同级 nav/ 目录（NAV 本地克隆）中的仿真输出，结果写入 presentation/assets。
云拓标志由 tools/raster_logo.mjs 从 showcase/assets/yuntuo-avatar-dark.svg 生成。
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
YUNTUO = ROOT.parent
DESK = YUNTUO.parent
OUT = ROOT / "assets"
SHOW = YUNTUO / "showcase" / "assets"
NAV_RUN = DESK / "nav/sim/build/batch/f5_a2/f5_search_s2/final_maps.npz"

BG = (8, 18, 26)
PANEL = (16, 35, 45)
LINE = (37, 57, 69)
INK = (236, 243, 244)
MUTED = (145, 167, 179)
CYAN = (127, 231, 225)
ORANGE = (245, 171, 121)
FONT = "C:/Windows/Fonts/msyh.ttc"
FONT_BOLD = "C:/Windows/Fonts/msyhbd.ttc"


def trim(im, pad=0):
    box = im.split()[-1].getbbox()
    l, t, r, b = box
    return im.crop((max(l - pad, 0), max(t - pad, 0), min(r + pad, im.width), min(b + pad, im.height)))


def contest_logo():
    """黑底 JPG 转透明底：按亮度取 alpha，再还原颜色，叠在深色页面上与原图一致。"""
    a = np.asarray(Image.open(SHOW / "fpga-competition.jpg").convert("RGB")).astype(np.float32)
    alpha = a.max(axis=2)
    alpha = np.clip((alpha - 10) / (255 - 10), 0, 1)
    rgb = np.where(alpha[..., None] > 0, a / np.maximum(alpha[..., None], 1e-3), 0)
    out = np.dstack([np.clip(rgb, 0, 255), alpha * 255]).astype(np.uint8)
    im = trim(Image.fromarray(out, "RGBA"), 6)
    # 每页都会放一次，按页面显示尺寸的约 3 倍保存，控制 PPT 体积
    im.resize((900, round(im.height * 900 / im.width)), Image.LANCZOS).save(OUT / "fpga-competition.png", optimize=True)


def chy_logo():
    """透明底单色稿着浅青色，与介绍页一致。"""
    im = Image.open(SHOW / "chy-logo.png").convert("RGBA")
    alpha = im.split()[-1]
    color = Image.new("RGBA", im.size, CYAN + (255,))
    color.putalpha(alpha)
    im = trim(color, 8)
    im.resize((420, round(im.height * 420 / im.width)), Image.LANCZOS).save(OUT / "chy-logo-cyan.png", optimize=True)


def robots():
    """tools/render_robot.mjs 输出的整车渲染图，裁掉透明边。"""
    for name in ["robot-hero", "robot-front"]:
        p = OUT / f"{name}.png"
        trim(Image.open(p).convert("RGBA"), 40).save(p)


def cost_map():
    """NAV 闭环仿真输出的 128×128 局部通行代价，裁到观测区域（3:2），按页面配色着色，每格放大 8 倍。"""
    c = np.flipud(np.load(NAV_RUN)["cost"].astype(int))
    ys, xs = np.nonzero(c != 255)
    w = max(np.ptp(xs) + 8, (np.ptp(ys) + 8) * 3 // 2)
    w += w % 2
    h = w * 2 // 3
    y0 = int(np.clip((ys.min() + ys.max() - h) // 2, 0, 128 - h))
    x0 = int(np.clip((xs.min() + xs.max() - w) // 2, 0, 128 - w))
    c = c[y0:y0 + h, x0:x0 + w]
    img = np.zeros(c.shape + (3,), np.float32)
    img[:] = (12, 27, 37)
    free = c <= 200
    t = np.clip(c[free] / 60.0, 0, 1)[:, None]
    low, high = np.array((54, 140, 146)), np.array(ORANGE)
    img[free] = low + (high - low) * t
    img[c == 253] = (122, 78, 56)
    img[c == 254] = ORANGE
    s = 8
    big = np.kron(img, np.ones((s, s, 1)))
    # 1 m 参考网格（20 格）
    for k in range(0, c.shape[0] + 1, 20):
        big[k * s:k * s + 2, :] = big[k * s:k * s + 2, :] * 0.55 + np.array(LINE) * 0.45
    for k in range(0, c.shape[1] + 1, 20):
        big[:, k * s:k * s + 2] = big[:, k * s:k * s + 2] * 0.55 + np.array(LINE) * 0.45
    im = Image.fromarray(big.astype(np.uint8))
    im.save(OUT / "costmap-sim.png")


def copies():
    """界面截图、小程序码与 MuJoCo 仿真画面按原图复制。"""
    import shutil
    for name in ["web-console.png", "miniprogram-home.jpg", "miniprogram-assistant.jpg", "miniprogram-code.png"]:
        shutil.copyfile(SHOW / name, OUT / name)
    shutil.copyfile(DESK / "nav/control/sim2sim/model4500_mujoco/mujoco_preview.png", OUT / "mujoco-preview.png")


def placeholder(name, w, h, title, lines):
    im = Image.new("RGB", (w, h), PANEL)
    d = ImageDraw.Draw(im)
    u = w / 1000
    step = int(60 * u)
    for x in range(-h, w, step):
        d.line([(x, h), (x + h, 0)], fill=(20, 42, 53), width=max(1, int(2 * u)))
    d.rectangle([int(14 * u), int(14 * u), w - int(14 * u), h - int(14 * u)], outline=CYAN, width=max(2, int(4 * u)))
    cx, cy = w / 2, h * 0.36
    bw, bh = 150 * u, 100 * u
    d.rounded_rectangle([cx - bw / 2, cy - bh / 2, cx + bw / 2, cy + bh / 2], radius=16 * u, outline=CYAN, width=int(7 * u))
    d.rounded_rectangle([cx - 36 * u, cy - bh / 2 - 22 * u, cx + 36 * u, cy - bh / 2 + 4 * u], radius=6 * u, outline=CYAN, width=int(7 * u))
    d.ellipse([cx - 30 * u, cy - 30 * u, cx + 30 * u, cy + 30 * u], outline=CYAN, width=int(7 * u))
    f1 = ImageFont.truetype(FONT_BOLD, int(64 * u))
    f2 = ImageFont.truetype(FONT, int(36 * u))
    y = cy + bh / 2 + 70 * u
    d.text((cx, y), title, font=f1, fill=INK, anchor="mt")
    y += 110 * u
    for i, s in enumerate(lines):
        d.text((cx, y), s, font=f2, fill=CYAN if i == 0 else MUTED, anchor="mt")
        y += 58 * u
    im.save(OUT / f"{name}.png", optimize=True)


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    contest_logo()
    chy_logo()
    robots()
    cost_map()
    copies()
    placeholder("ph-robot-photo", 4000, 3000, "实车照片（占位）",
                ["4:3 横拍 · 4000 × 3000 px", "整车 45° 前侧方，纯色背景，车身完整入画",
                 "PowerPoint 中右键 → 更改图片，位置与尺寸保持不变"])
    for p in sorted(OUT.glob("*.png")):
        print(p.name, Image.open(p).size)
