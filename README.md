# 格物实验室

按课本单元组织的互动实验室：每个单元一间实验室，打开就能动手，适合课堂投屏。

在线使用：**https://rimikochu.github.io/gewulab/**（打开首页，点一间实验室就能用，不用注册、不用安装）

每间实验室是一个三维大场景，分七课、一节拓展课和一节随堂检测：

- **动手做**：按提示一步步操作，任务自动打勾，做完一课，结论出现在屏幕底部，不挡画面。
- **自动演示带讲解**：右上角的“自动演示 · 讲解”会把这一课从头做到结论，边做边用男声讲解，适合老师投屏。
- **离线也能用**：每间都能下载成一个独立网页，拷到教室电脑上双击就开（见下文“离线使用”）。

## 现在有的实验室

24 间，按学科：

| 学科 | 实验室 |
|---|---|
| 物理 | 压强、浮力、机械运动、光的折射和凸透镜成像、声现象、光的反射和平面镜、质量与密度、物态变化、力和运动、简单机械、电路、欧姆定律 |
| 化学 | 原电池、燃烧和灭火、水的净化和组成、碳和二氧化碳 |
| 生物 | 光合作用和呼吸作用、细胞、植物的一生、血液循环、呼吸 |
| 地理 | 地球的运动、水循环、板块运动 |

另有一间地震实验室是最早的旧版，等待按新规范重做。全部规划 72 间，哪些已完成、哪些可以认领，见 [`docs/roadmap.md`](docs/roadmap.md)；每次上线了什么，见首页右上角的“更新记录”。

## 一起来做

欢迎学科老师、开发者，以及你们用的 AI 助手一起加新的实验室。

**最快的办法**：把 [`docs/start-prompt.md`](docs/start-prompt.md) 里的那段话贴给你的 AI 助手。它会列出[还可以认领的实验室](https://github.com/RimikoChu/gewulab/issues?q=is%3Aissue+is%3Aopen+label%3A可认领)让你选，然后照规范开工。

| 想了解 | 看这里 |
|---|---|
| 怎么参与、怎么提交 | [`CONTRIBUTING.md`](CONTRIBUTING.md) |
| 一间实验室要做成什么样 | [`docs/lab-standard.md`](docs/lab-standard.md) |
| 让 AI 助手来做 | [`docs/start-prompt.md`](docs/start-prompt.md)（给人贴的话）、[`AGENTS.md`](AGENTS.md)（助手读的规则） |
| 怎么审别人的提交 | [`docs/review-checklist.md`](docs/review-checklist.md) |
| 总规划：72 间，哪些可以认领 | [`docs/roadmap.md`](docs/roadmap.md) |

## 目录

| 路径 | 内容 |
|---|---|
| `src/labs/<名字>/` | 一间实验室的全部代码，包括解说词 `narration.ts` |
| `src/lab-kit/` | 实验页的公共部件：舞台、常驻画布、拼模型的工具、金属材质、贴图、讲解、常用状态 |
| `src/components/lab/` | 实验页的界面外壳：顶栏、课程块、面板、操作条、结论条、自动演示 |
| `src/labs.ts` | 首页的实验室清单和封面 |
| `src/changelog.ts` | 首页“更新记录”的内容 |
| `docs/specs/` | 每间实验室的规格卡 |
| `scripts/` | 检查脚本、新建实验室的脚手架、离线打包、讲解录音生成（`voice.mjs`）、封面生成（`covers/`） |
| `public/assets/` | 素材：天空、贴图、地球影像、讲解录音（`voice/<名字>/`），来源和许可见其中的 `README.md` |
| `DESIGN.md` | 前端规范：颜色、字号、组件用法、封面画法、动效、文案 |
| `public/labs/quake/` | 地震实验室的旧版本 |

## 本地运行

```bash
npm install
```

```bash
npm run dev
```

打开终端里显示的地址即可。实验室在 `/labs/<名字>/index.html#课号`。

## 讲解录音

自动演示的讲解是先写解说词（各实验室的 `narration.ts`），再合成录音放进仓库，学生打开页面时不联网、不再合成。

```bash
npm run voice -- <名字>
```

合成要用维护者的语音合成密钥，密钥不放进仓库。贡献者只要写好解说词，录音由维护者生成；写法见规范 5.11a。

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

- **直接下载**：首页点开一间已上线的实验室，详情里有“离线包”，标签栏下面有按学科和全部的离线包。也可以到[发布页](https://github.com/RimikoChu/gewulab/releases/tag/offline)自己挑：`gewulab-<目录名>.zip` 是单间，`gewulab-phys.zip` 这类是一个学科，`gewulab-all.zip` 是全部。
- **自己打**：`npm run build:offline`（只打一间：`npm run build:offline -- leaf`），结果在 `dist-offline/`。
- **怎么用**：解压，双击 `index.html` 进目录，或者直接双击某一间的 `.html`。用新一些的 Chrome、Edge 或 Safari。

离线包跟着 `main` 自动更新。

## 说明

- 实验里的数值、地形、模型多为教学示意，数据来源和待核实事项见各实验室的规格卡（`docs/specs/`）。
- 第三方组件：shadcn/ui、Magic UI、Radix（均为 MIT 许可）。

## 许可

**AGPL-3.0**，见 [`LICENSE`](LICENSE)。可以免费使用、修改、再分发，课堂上随便用；但分发出去或者放到网上给别人用的时候，必须把完整的源码按同样的许可公开，不能做成不公开源码的产品。需要不公开源码使用的机构，请联系维护者另行商议授权。

版权归格物实验室的贡献者所有。参与贡献前请读 [贡献者协议](CLA.md)。

2026 年 11 月 19 日之前的版本是按 MIT 许可发布的；从这一天起的版本改用 AGPL-3.0。

`public/assets/` 里的第三方素材按各自的许可（CC0 和公有领域）；讲解录音是本项目用语音合成生成的。清单在 [`public/assets/README.md`](public/assets/README.md)。“格物实验室”这个名称和标志不在许可范围内。
