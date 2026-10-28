# 仓库组织

云拓按 FPGA、RK3588 与 Web、微信小程序三个部分组织代码。各仓库保留自己的开发环境、构建流程和提交历史；Yuntuo 总仓库提供统一的项目介绍与访问入口。

## 组件与维护分支

| 组件 | 代码入口 | 内容 |
|---|---|---|
| nav-control | [SOC_FPGA_NAV · main](https://github.com/LRaina215/SOC_FPGA_NAV/tree/main) | 雷达感知、地图、定位、规划、探索、跟踪、轮腿控制及同片联合工程 |
| rk-web | [QHXD_Web · yuntuo-fpga](https://github.com/LRaina215/QHXD_Web/tree/yuntuo-fpga) | RK3588 模型服务、任务桥接、Web 控制台、云网关与视频服务 |
| miniprogram | [QHXD_Miniprogram · yuntuo](https://github.com/LRaina215/QHXD_Miniprogram/tree/yuntuo) | 微信端任务操作、语音助手、地图、视频和状态展示 |

FPGA 仓库中的 `control/` 维护原 4500 控制代码，`integration/` 维护导航与控制的联合工程。控制代码的来源和适配关系见 [control/FORK.md](https://github.com/LRaina215/SOC_FPGA_NAV/blob/main/control/FORK.md)。

## 浏览与获取

README 和[组件索引](../components/README.md)直接链接各仓库的维护分支，打开即可浏览该分支的最新代码。下载命令见 [README](../README.md#获取代码)。

本地可将三个仓库克隆到 `components/nav-control`、`components/rk-web` 和 `components/miniprogram`，也可继续使用各自的开发目录。总仓库忽略这三个本地克隆目录，组件改动在对应仓库中提交。

## 文档分工

- **Yuntuo README**：介绍项目、系统架构、各部分功能与代码入口。
- **[交互式项目介绍](../showcase/README.md)**：通过可离线打开的 HTML 展示车体结构、系统协作、导航流程与模型部署，并提供 Web 和小程序访问入口。
- **NAV 文档**：维护总体设计、FPGA 接口、导航控制设计、硬件操作和整车开发计划。
- **RK/Web 文档**：维护模型部署、任务服务、Web 与云网关配置。
- **小程序文档**：维护页面、开发环境、视频接入和移动端使用说明。
- **版本与联调记录**：在 [docs/baseline.md](baseline.md) 中记录历史版本，链接对应专项报告。

## 日常维护

代码和部署说明随各组件更新；总仓库同步功能介绍、目录变化和文档链接。组件分支有新提交后，分支链接会直接展示新内容，无需在总仓库更新版本指针。

私有仓库的访问由 GitHub 账号权限管理。各仓库独立设置访问权限。
