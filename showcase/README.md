# 云拓交互式项目介绍

[index.html](index.html) 是可离线打开的单文件项目介绍，包含车体三维结构、系统架构、FPGA 导航与控制、RK3588 模型部署、任务流程和两端应用入口。

## 打开页面

下载 `index.html`，使用新版 Edge 或 Chrome 打开。模型、脚本、样式和图片均已内嵌，无需启动服务或联网加载资源。GitHub 文件页展示 HTML 源码，可点击 **Download raw file** 下载。

- Web 控制台：[lingxunrobot.cn](https://lingxunrobot.cn)
- 微信小程序：扫描页面中的小程序码，点击可放大。

## 交互内容

| 区域 | 操作与内容 |
|---|---|
| 车体结构 | 拖动旋转、滚轮或双指缩放、切换视角、拆解滑块、部件选择、线框与自动旋转 |
| 系统架构 | 点击交互端、云端、RK3588 或 FPGA，查看职责与数据流 |
| 导航地图 | 切换高程、原始地形、膨胀和路径；在路径层点击空地重设示意目标 |
| 边缘智能 | 切换视觉、语言、语音与视频服务，查看模型部署和输入输出 |
| 任务流程 | 选择找物、巡检或跟随，逐步查看或自动播放流程 |
| 双端应用 | 查看 Web 与微信小程序的功能布局，并打开实际访问入口 |

模型区域支持方向键旋转、`+` / `-` 缩放；路径图支持方向键微调目标；小程序码弹窗可按 Escape 关闭。其余控件支持键盘聚焦与操作。

车体来自项目 `Structure/car/car/urdf/car.urdf` 和配套 STL，保留 7 个 link、6 个 joint 的装配关系。结构拆解用于展示部件组成。地图、任务与终端布局采用示意场景说明设计，页面不连接机器人控制接口。

## 页面源码

```text
showcase/
├── index.html                 # 可独立分发的离线页面
├── src/
│   ├── template.html          # 页面结构与正文
│   ├── styles.css             # 桌面、手机布局
│   └── app.js                 # 三维模型与页面交互
├── assets/
│   ├── robot-model.json       # 压缩后的 URDF 网格与装配信息
│   ├── fpga-competition.jpg   # FPGA 创新设计竞赛标志
│   ├── chy-logo.png           # CHY 透明底单色标志
│   ├── chy-reference.png      # CHY 原始设计参考
│   ├── miniprogram-code.png   # 云拓小程序码原图
│   └── preview.png            # README 页面预览
├── vendor/                    # Three.js r149 与 MIT 许可
└── tools/
    ├── build.py               # 生成单文件 HTML
    └── pack_urdf.py           # 从 URDF / STL 更新模型
```

修改 `src/` 后，在总仓库根目录运行：

```bash
python showcase/tools/build.py
```

构建只使用 Python 标准库。模型更新工具另需 NumPy：

```bash
python showcase/tools/pack_urdf.py --urdf /path/to/car/urdf/car.urdf
python showcase/tools/build.py
```

模型工具对顶点采用每轴 16 位量化、共享顶点索引和 gzip 压缩，保留原始三角面。页面使用浏览器 `DecompressionStream` 解码，再由 Three.js 渲染。部件材质用于区分结构。

## 内容与素材

- 系统功能与部署依据：[总体设计方案](https://github.com/LRaina215/SOC_FPGA_NAV/blob/main/docs/system_architecture.md)。
- 结构交互参考用户提供的 `robot-teardown(1).html`；模型采用云拓自己的 URDF / STL。
- Three.js r149 来自参考页内附的 MIT 版本；许可见 [THREE-LICENSE.txt](vendor/THREE-LICENSE.txt)，完整许可也随单文件页面分发。
- FPGA 竞赛标志与小程序码使用项目提供的原图。
- CHY 标志由原始小写字标与双弧线造型重新设计，生成方式与提示词见 [branding.md](branding.md)。页面通过 CSS 为透明底单色标志着色。

更新公开介绍时同步正文、组件链接和 README 预览；具体构建、测试与联调记录仍保留在各组件仓库。
