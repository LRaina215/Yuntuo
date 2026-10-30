# 云拓技术方案介绍

8 页 16:9 开场介绍，用于比赛宣讲视频和现场讲解。

| 文件 | 用途 |
|---|---|
| [yuntuo_tech_intro.pptx](yuntuo_tech_intro.pptx) | 可编辑 PPT，文字、形状、箭头和图片均为独立对象 |
| [png/](png) | 1920 × 1080 页面图片，可直接放进视频 |
| [slides.html](slides.html) | 页面源文件，Edge 或 Chrome 打开即可预览 |

## 页面内容

1. 封面：云拓 YunTuo Robot 与整车装配渲染
2. 项目概况：轮腿构型与赛题任务 1–6 的对应关系
3. 系统架构：FPGA 实时闭环与 RK3588 任务理解的分工
4. FPGA 片上设计：RTL 流水线、PicoRV32 软核、强化学习控制与资源时序
5. 感知与导航：雷达深度帧到路径规划的处理链与局部代价图
6. 运动控制：原 4500 策略的网络结构与片上部署参数
7. 边缘智能与交互：语音找物流程、Web 控制台与微信小程序
8. 设计亮点

## 图片来源

| 图片 | 来源 |
|---|---|
| 整车渲染（第 1、8 页） | `Structure/YunTuo_full_assembly_20261030/YunTuo_full_assembly.glb` 整车装配：车架、轮腿、XT-M60、RK3588、带亚克力板的 ACX750、Astra Pro Plus、SG90 超声波云台、侧边 OV5640 与 5 寸电容触摸屏 |
| 局部代价图（第 5 页） | NAV 导航闭环仿真输出（5 m 场地，trav v3） |
| 动力学仿真（第 6 页） | NAV `control/sim2sim/model4500_mujoco/mujoco_preview.png` |
| Web 与小程序截图、小程序码（第 7 页） | [showcase/assets](../showcase/assets)，来源见 [screenshots.md](../showcase/screenshots.md) |
| 竞赛、CHY 与云拓标志 | [showcase/assets](../showcase/assets)：竞赛标志去黑底，CHY 单色稿着浅青色，云拓标志为深色页面版本 |

第 2 页左侧为实车照片占位图，比例 4:3（4000 × 3000 px）。在 PowerPoint 中右键“更改图片”替换，位置与尺寸保持不变；同时把 `assets/ph-robot-photo.png` 换成实拍照片，HTML 与 PNG 会一起更新。

资源与时序数字来自 NAV [PNR63 实现报告](https://github.com/LRaina215/SOC_FPGA_NAV/blob/main/docs/4_design/g2_PNR63_review_20261028.md)，最终位流变化后需同步修改第 4 页。

## 重新生成

依赖：Node.js 与 `playwright-core@1.50.0`、`pptxgenjs@4.0.1`；Python 3.12 与 Pillow、NumPy；本机 Chrome。脚本默认从 `D:/tools/pptx_build/node_modules` 加载 Node 依赖，可用环境变量 `PPTX_BUILD_NODE` 指定其他目录。

在 `presentation/` 目录运行：

```bash
node tools/render_robot.mjs   # 整车 GLB → assets/robot-*.png，可在参数中指定其他 GLB
py -3.12 tools/prep_assets.py # 标志适配、渲染裁边、代价图、截图与占位图
node tools/shoot.mjs png      # slides.html → png/slide-*.png
node tools/html2pptx.mjs      # slides.html → yuntuo_tech_intro.pptx
```

`render_robot.mjs` 默认读取总仓库同级目录下的 `Structure/YunTuo_full_assembly_20261030`；`prep_assets.py` 读取同级 `nav/`（NAV 本地克隆）中的仿真输出与 MuJoCo 截图。这些目录不在本仓库中。云拓标志改动时，运行 `node tools/raster_logo.mjs` 重新生成 `assets/yuntuo-mark.png`。

`slides.html` 中带 `data-ppt` 属性的元素会转换为 PPT 对象；光晕与点阵背景合成为每页背景图。修改页面后重新运行后两条命令即可。
