# 仓库组织与版本更新

## 为什么采用组件引用

三个工程已经各有代码历史、配置与维护入口。总仓库用Git子模块记录它们的提交，在GitHub上显示为可点击的目录；它不会复制组件历史，也不会把NAV、Web和小程序混成同一个构建工程。

| 路径 | 包含内容 | 维护分支 |
|---|---|---|
| `components/nav-control` | 导航RTL/固件、原4500控制副本、同片联合工程、仿真及系统文档 | `main` |
| `components/rk-web` | RK模型服务、视觉/语音、任务桥接、Web和云网关 | `yuntuo-fpga` |
| `components/miniprogram` | 微信小程序源码及专项验证 | `yuntuo` |

控制上游仓库是来源参考；目前运行适配与联合记录在NAV中，不单独固定第二份Control指针。某些仓库默认分支不是上述项目开发分支，因此不要只点默认首页就判断当前代码版本。

## 总仓库记录什么

- `.gitmodules`记录组件地址与维护分支。
- Git树中的子模块指针记录具体提交，普通子模块初始化按这个提交检出，不会自动跟随维护分支。
- README记录可读的入口与版本表，`docs/baseline.md`说明这一组版本的验证范围。
- 总体设计和整车总计划只引用NAV中的既有文档，不另建同名副本。

目录刚克隆时可能为空；执行README中的初始化命令后才会下载代码。该仓库可以作为版本组合入口，但不是一条命令就完成模型部署、FPGA构建或实车验收的安装器。

## 更新组件版本

正常开发继续在各组件原仓库进行：先完成必要验证并提交、推送，然后决定总仓库是否引用该提交。总仓库中已初始化的子模块可以这样更新（用已核对的真实提交替换占位符）：

```bash
git -C components/nav-control fetch origin
git -C components/nav-control checkout --detach <已推送的提交>
git add components/nav-control
```

随后同步README版本表及`docs/baseline.md`，检查`git diff --cached --submodule=short`，提交并推送总仓库。Web、小程序同理。更新前检查组件工作区，已有本地改动应留在所属开发工作区，不能覆盖。

不要把`git submodule update --remote`当作普通同步：它会选维护分支的新版本，改变当前组合。想重现总仓库已记录的组合时，使用`git submodule update --init --recursive`。

## 现有本机工作目录

总仓库位于`D:/Desktop/SOC FPGA/Yuntuo`。原开发目录`nav`、`QHXD_Web`和`QHXD_Miniprogram`继续保留原位置。2026-10-28按用户要求，NAV开发分支已快进合入main，本地nav也已切到main；已有未提交改动原样保留。Web和小程序分支未变。

本机总仓库创建时只登记子模块指针，没有重复下载现有工程。GitHub可以直接跳转，其他电脑可按README递归克隆。总仓库`main`与NAV的`main`属于两个不同仓库。创建后用户明确要求合并NAV：main从`7cd63d9`快进至`45341d4`，包含开发分支227个提交，已推送；原`codex/integration-g2-20261022`分支保留。`.gitmodules`现在将NAV维护分支设为main，固定指针仍为`45341d4`，不改变原版本组合。

总仓库采用私有可见性，与私有NAV的访问范围一致。Web和小程序的原可见性保持；将来如果改变总仓库可见性，也不会自动改变子模块访问权限。
