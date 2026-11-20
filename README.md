# 格物实验室

按课本单元组织的互动实验室：每个单元一间实验室，打开就能动手，适合课堂投屏。

## 现在有的实验室

| 实验室 | 学科 | 教材位置 | 入口 |
|---|---|---|---|
| 压强 | 物理 · 初中 | 八年级下册 第九章 | `/labs/pressure/index.html` |
| 浮力 | 物理 · 初中 | 八年级下册 第十章 | `/labs/float/index.html` |
| 地震（旧版，待重做） | 地理 · 高中 | 必修第一册 | `/labs/quake/index.html` |

## 一起来做

欢迎学科老师、开发者，以及你们用的 AI 助手一起加新的实验室。

**最快的办法**：把 [`docs/start-prompt.md`](docs/start-prompt.md) 里的那段话贴给你的 AI 助手。它会列出[还可以认领的实验室](https://github.com/RimikoChu/gewulab/issues?q=is%3Aissue+is%3Aopen+label%3A可认领)让你选，然后照规范开工。

| 想了解 | 看这里 |
|---|---|
| 怎么参与、怎么提交 | [`CONTRIBUTING.md`](CONTRIBUTING.md) |
| 一间实验室要做成什么样 | [`docs/lab-standard.md`](docs/lab-standard.md) |
| 让 AI 助手来做 | [`docs/start-prompt.md`](docs/start-prompt.md)（给人贴的话）、[`AGENTS.md`](AGENTS.md)（助手读的规则） |
| 怎么审别人的提交 | [`docs/review-checklist.md`](docs/review-checklist.md) |
| 总规划：约 70 间，哪些可以认领 | [`docs/roadmap.md`](docs/roadmap.md) |

## 目录

| 路径 | 内容 |
|---|---|
| `src/labs/<名字>/` | 一间实验室的全部代码（参考实现：`pressure`） |
| `src/lab-kit/` | 实验页的公共部件：舞台、常驻画布、拼模型的工具、贴图、常用状态 |
| `src/components/lab/` | 实验页的界面外壳 |
| `src/labs.ts` | 首页的实验室清单和封面线稿 |
| `docs/specs/` | 每间实验室的规格卡 |
| `scripts/` | 检查脚本和新建实验室的脚手架 |
| `DESIGN.md` | 前端规范：颜色、字号、组件用法、封面画法、动效、文案 |
| `public/labs/quake/` | 地震实验室的旧版本 |

## 本地运行

```bash
npm install
```

```bash
npm run dev
```

打开终端里显示的地址即可。

## 检查

```bash
npm run check
```

类型检查、结构检查、计算测试、打包，一次跑完。提交之前要全部通过。

## 打包

```bash
npm run build
```

产物在 `dist/`，是纯静态文件。

## 离线使用

每间实验室都能打成**一个独立的网页文件**：脚本、样式、字体、贴图全写在里面，拷到 U 盘、双击就能打开，不用联网，也不用装任何东西。

- **直接下载**：首页每张已上线的卡片上有“离线包”，标签栏下面有按学科和全部的离线包。也可以到[发布页](https://github.com/RimikoChu/gewulab/releases/tag/offline)自己挑：`gewulab-<目录名>.zip` 是单间，`gewulab-phys.zip` 这类是一个学科，`gewulab-all.zip` 是全部。
- **自己打**：`npm run build:offline`（只打一间：`npm run build:offline -- leaf`），结果在 `dist-offline/`。
- **怎么用**：解压，双击 `index.html` 进目录，或者直接双击某一间的 `.html`。用新一些的 Chrome、Edge 或 Safari。

离线包跟着 `main` 自动更新。

## 说明

- 实验里的地形、烈度公式等为教学示意，数据来源和待核实项见各实验的规格文档。
- 第三方组件：shadcn/ui、Magic UI、Radix（均为 MIT 许可）。

## 许可

**AGPL-3.0**，见 [`LICENSE`](LICENSE)。可以免费使用、修改、再分发，课堂上随便用；但分发出去或者放到网上给别人用的时候，必须把完整的源码按同样的许可公开，不能做成不公开源码的产品。需要不公开源码使用的机构，请联系维护者另行商议授权。

版权归格物实验室的贡献者所有。参与贡献前请读 [贡献者协议](CLA.md)。

2026 年 11 月 19 日之前的版本是按 MIT 许可发布的；从这一天起的版本改用 AGPL-3.0。

`public/assets/` 里的第三方素材按各自的许可（CC0 和公有领域），清单在 [`public/assets/README.md`](public/assets/README.md)。“格物实验室”这个名称和标志不在许可范围内。
