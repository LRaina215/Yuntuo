# 项目标识

## YunTuo Robot

云拓采用“轮腿机器人跨台阶”的图形作为应用标志。Web 的 `BrandMark` 与小程序内的 `mark.png` 使用这一造型；小程序码中心使用配套的“云拓”中文字标。

介绍页沿用现有机器人图形的全部几何轮廓，用深色背景、浅青主体和暖色台阶线适配页面配色。页头、联合标识、页尾及浏览器图标使用同一份 SVG。

- 原始图形：[yuntuo-avatar.svg](assets/yuntuo-avatar.svg)
- 深色页面版本：[yuntuo-avatar-dark.svg](assets/yuntuo-avatar-dark.svg)
- 图形来源：[Web 品牌目录](https://github.com/LRaina215/QHXD_Web/tree/yuntuo-fpga/frontend/public/brand)

| 元素 | 页面配色 |
|---|---|
| 图标背景、轮毂 | `#173C45` |
| 机器人、镜头 | `#7FE7E1` |
| 相机面罩 | `#08121A` |
| 台阶地形线 | `#F5AB79` |

更新图形时，以 Web 品牌目录中的 SVG 为来源，同步应用图标和介绍页版本。页面配色变体保持机身、双镜头、轮腿与台阶的比例和位置关系。

## CHY 标志

CHY 标志保留原图的小写斜体字标与上下双弧线，调整字形、间距和弧线比例，用于云拓项目的联合标识。

- 设计参考：[chy-reference.png](assets/chy-reference.png)
- 透明底单色稿：[chy-logo.png](assets/chy-logo.png)
- 网站显示：通过 CSS 将单色稿着为浅青色，与 FPGA 竞赛标志和 YunTuo Robot 字标并列。

单色稿为 PNG。需要生产丝印时，应由印制方按实际尺寸处理图稿。

### 生成记录

使用内置 imagegen，以原始 CHY 图片作为编辑目标。最终采用的提示词如下：

> Create a production-ready FLAT ONE-COLOR logo based on this exact reference's lowercase italic chy and two enclosing arcs. This is a flat logo export for a website, NOT a luminous sign, NOT a rendered object, NOT a mockup. Crisp opaque solid BLACK (#000000) lettering and two solid black tapered elliptical swooshes ONLY. Transparent empty pixels everywhere else. Do not add haze, glow, gradients, shadows, lighting, textures, outlines, backdrop, or any decorative effects. The word must read exactly 'chy', lowercase, in a polished italic geometric letter style; preserve recognizability and good spacing. Single centered logo at large scale on a landscape canvas, modest margins. Entire mark solid opaque black. True transparent background. The resulting silhouette should work as a monochrome silk-screen stencil.
