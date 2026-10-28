# 2026-10-28 版本与联调记录

本页记录 2026-10-28 的组件版本与联调结果。各仓库的最新代码入口见[组件索引](../components/README.md)，开发进度见[NAV 整车总计划](https://github.com/LRaina215/SOC_FPGA_NAV/blob/main/docs/1_plan/system_integration_plan_20261021.md)。

仓库调整记录：NAV 开发分支于 2026-10-28 合入 main；Yuntuo 随后改用普通分支链接组织代码入口。下表提交号用于追溯当日结果。

## 当日版本

| 组件 | 提交 | 主要内容 |
|---|---|---|
| NAV＋Control | `45341d41d76717ff6570077e066dad96d8875485` | 原4500同片联合工程、PNR63及落地记录、10月28日文档对账 |
| RK/Web | `bfb7a3480809a3d5a5b5d46ade3365392c8ea160` | 已有模型与任务服务、地图上传/预览、视频链及最新接口边界说明 |
| 小程序 | `b4be81c89f78b16d962d1d9467adba60b2ace229` | HLS/图片回退、缓冲恢复和维护文档；不代表新微信包已经发布 |

引用的提交在创建前均已核对存在于对应远端分支。这里的版本固定不包含原工作目录中尚未提交的构建器/SFP修改、私人配置或预览快照。

## 已有证据与未通过项目

| 部分 | 已有结果 | 保留边界 |
|---|---|---|
| FPGA资源与实现 | SYN50/PNR63实际BSRAM280/340，内部50/100MHz报告setup/hold0 | 最差setup裕量+0.030ns；完整外部IO/CDC/复位签核未闭合 |
| 运动控制 | IR5断轮、红外2/4覆盖、BMI连续4次重下载恢复有分项实测 | 原4500未重训；控制外围授权/接管逻辑有修改 |
| 落地 | 零目标站立A/B均未倒但摇摆滑移，直接SAFE前进命令传到策略 | 后退−0.15m/s阶段失败；绕过导航CPU，不能当自主导航或失联回稳通过 |
| RK任务与通信 | 目标核对、严格停稳反馈、重复STATUS处理、真串口地图/任务专项已有交付 | 平均速度硬件授权不是任务停稳；长期遥测仍有间歇丢字节 |
| Web与地图 | 已有地图上传、ACK进度和明确标记的独立预览 | 示例地图非真实场地量测；网页选图到真板完整成功仍未验收 |
| 小程序 | 用户确认基础真机功能；新增视频在开发者工具有记录 | 新HLS/缓冲修复的新版手机验收与发包未确认 |

最后已知实板收尾是10月28日01:41:44的hold F322；同日13:13公网网关正常但RK离线，状态与视频请求超时。上述是带时间的记录，不表示创建总仓库时重新测试了设备，也不用于推断离线根因。

## 相关文档

- [完整总体架构](https://github.com/LRaina215/SOC_FPGA_NAV/blob/main/docs/system_architecture.md)
- [PNR63与落地结果核对](https://github.com/LRaina215/SOC_FPGA_NAV/blob/main/docs/4_design/g2_PNR63_review_20261028.md)
- [接口定义](https://github.com/LRaina215/SOC_FPGA_NAV/blob/main/docs/2_interface/icd.md)
- [RK/Web联调边界](https://github.com/LRaina215/QHXD_Web/blob/yuntuo-fpga/docs/REAL_FPGA_INTEGRATION_20261027.md)
- [小程序维护记录](https://github.com/LRaina215/QHXD_Miniprogram/blob/yuntuo/MAINTENANCE.md)

成功与失败记录都随组件版本保留；本次创建总仓库没有重新构建、部署、操作实车或改变各组件默认分支。
