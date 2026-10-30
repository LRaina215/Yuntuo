# 云拓交互式项目介绍

[index.html](index.html) 是可离线打开的单文件项目介绍，包含车体三维结构、系统架构、FPGA 导航与控制、RK3588 模型部署、任务流程和两端应用入口。

## 打开页面

下载 `index.html`，使用新版 Edge 或 Chrome 打开。模型、脚本、样式和图片均已内嵌，无需启动服务或联网加载资源。GitHub 文件页展示 HTML 源码，可点击 **Download raw file** 下载。

- Web 控制台：[lingxunrobot.cn](https://lingxunrobot.cn)
- 微信小程序：扫描页面中的小程序码，点击可放大。

## 交互内容

| 区域 | 操作与内容 |
|---|---|
| 车体结构 | 拖动旋转、滚轮或双指缩放、切换视角、拆解滑块，分别查看 FPGA、RK3588、XT-M60、RGB-D、SG90 超声波云台、OV5640、触摸屏、车架和轮腿 |
| 系统架构 | 点击交互端、云端、RK3588 或 FPGA，查看职责与数据流 |
| 导航地图 | 切换高程、原始地形、膨胀和路径；在路径层点击空地重设示意目标 |
| XT-M60 雷达 | 旋转查看原厂三维模型，了解深度阵列、接收/发射视场及雷达到 FPGA 导航的数据链路 |
| 边缘智能 | 切换视觉、语言、语音与视频服务，查看模型部署和输入输出 |
| 任务流程 | 选择找物、巡检或跟随，逐步查看或自动播放流程 |
| 双端应用 | 查看线上 Web 与微信开发者工具的实际界面截图，放大原图并打开应用入口 |

架构、地图、模型、任务流程和双端截图在进入视野后自动轮播，每 **2.5 秒**切换一次。点击选项可直接查看内容，再停留 2.5 秒后继续自动切换。离开视野或切换到其他浏览器标签时暂停计时，返回后继续播放。

页面通过滚动入场、内容切换、视角与拆解缓动展示结构关系，配合轻量的流程光点和视觉扫描。系统开启“减少动态效果”时，关闭装饰和切换动效，内容仍按节奏自动切换。

模型区域支持方向键旋转、`+` / `-` 缩放；路径图支持方向键微调目标；小程序码弹窗可按 Escape 关闭。其余控件支持键盘聚焦与操作。

车架与轮腿来自项目 `Structure/fpga-main/fpga-main/car/urdf/all1.urdf`。整车视图将前置 XT-M60 从机身中独立出来，共有 17 个可查看组件：上层 ACX750 FPGA 带亚克力保护板，下层为 RK3588 计算盒，前上方为无底座 Astra Pro Plus，相机顶面中央安装 SG90 与 YB-MVU04，侧边为 OV5640；5 寸电容触摸屏叠放于 FPGA 亚克力板上。胶垫、转接片和安装托架为布置示意件。结构拆解保留器件颜色和亚克力透明效果。独立雷达视图采用原厂 STEP 的 15 个 CAD 实体，技术参数和来源见 [雷达与视觉感知](hardware.md)。地图与任务采用示意场景说明设计；双端展示使用实际界面截图。页面不连接机器人控制接口。

## 页面源码

```text
showcase/
├── index.html                 # 可独立分发的离线页面
├── src/
│   ├── template.html          # 页面结构与正文
│   ├── styles.css             # 桌面、手机布局
│   ├── motion.css             # 品牌适配、动效与减少动态效果设置
│   ├── presentation.css       # 自动轮播与截图展示
│   ├── lidar.css              # 雷达原厂模型、规格与数据链路
│   └── app.js                 # 三维模型与页面交互
├── assets/
│   ├── robot-model.json       # 压缩后的整车网格、器件颜色与透明材质
│   ├── lidar-model.json       # 原厂 XT-M60 STEP 的网格
│   ├── fpga-competition.jpg   # FPGA 创新设计竞赛标志
│   ├── chy-logo.png           # CHY 透明底单色标志
│   ├── chy-reference.png      # CHY 原始设计参考
│   ├── miniprogram-code.png   # 云拓小程序码原图
│   ├── yuntuo-avatar.svg      # 与 Web 同源的机器人标志
│   ├── yuntuo-avatar-dark.svg # 介绍页深色配色版本
│   ├── web-console.png        # 线上 Web 实际界面截图
│   ├── miniprogram-home.jpg   # 小程序总览实际界面截图
│   ├── miniprogram-assistant.jpg # 小程序助手实际界面截图
│   └── preview.png            # README 页面预览
├── vendor/                    # Three.js r149 与 MIT 许可
└── tools/
    ├── build.py               # 生成单文件 HTML
    ├── pack_assembly.py       # 从整车装配导出更新模型
    ├── pack_lidar.py          # 原厂 STEP 网格化，需要 CadQuery
    └── pack_urdf.py           # 从基础 URDF / STL 更新模型
```

修改 `src/` 后，在总仓库根目录运行：

```bash
python showcase/tools/build.py
```

构建只使用 Python 标准库。模型更新工具另需 NumPy：

```bash
python showcase/tools/pack_assembly.py --assembly /path/to/YunTuo_full_assembly_20261030
python showcase/tools/build.py
```

模型工具读取整车装配的 `assembly_layout.json` 与 `preview/geometry.json.gz`，对顶点采用每轴 16 位量化、索引和 gzip 压缩，保留三角面与逐顶点颜色。透明亚克力单独渲染，设备作为独立组件参与选择与拆解。页面使用浏览器 `DecompressionStream` 解码，再由 Three.js 渲染。`pack_urdf.py` 可用于只展示基础 URDF 的页面。

更新独立雷达模型时，在安装 CadQuery 的环境中运行 `python showcase/tools/pack_lidar.py --step /path/to/XT-M60_3D模型.stp`，随后重新构建 HTML。

## 内容与素材

- 系统功能与部署依据：[总体设计方案](https://github.com/LRaina215/SOC_FPGA_NAV/blob/main/docs/system_architecture.md)。
- 结构交互参考用户提供的 `robot-teardown(1).html`；模型采用云拓自己的 URDF / STL。
- Three.js r149 来自参考页内附的 MIT 版本；许可见 [THREE-LICENSE.txt](vendor/THREE-LICENSE.txt)，完整许可也随单文件页面分发。
- FPGA 竞赛标志与小程序码使用项目提供的原图。
- YunTuo Robot 使用 Web 与小程序内现有的轮腿机器人图形，介绍页保留几何轮廓并采用深色页面配色，详见 [branding.md](branding.md)。
- 双端截图保留原始界面，通过页面边框和尺寸适配展示；来源与拍摄记录见 [screenshots.md](screenshots.md)。
- CHY 标志由原始小写字标与双弧线造型重新设计，生成方式与提示词见 [branding.md](branding.md)。页面通过 CSS 为透明底单色标志着色。

更新公开介绍时同步正文、组件链接和 README 预览；具体构建、测试与联调记录仍保留在各组件仓库。
