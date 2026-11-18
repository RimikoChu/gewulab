# 格物实验室

按课本单元组织的互动实验室：每个单元一间实验室，打开就能动手，适合课堂投屏。

## 目录

| 路径 | 内容 |
|---|---|
| `src/` | 首页（React + Vite + TypeScript + Tailwind，组件基于 shadcn/ui） |
| `src/labs.ts` | 实验室清单和封面线稿 |
| `public/labs/quake/` | 地震实验室：六课加随堂小测（原生 ES 模块 + Canvas，第 1 课用 three.js） |
| `DESIGN.md` | 前端规范：颜色、字号、组件用法、封面画法、动效、文案 |

## 本地运行

```bash
npm install
```

```bash
npm run dev
```

打开终端里显示的地址即可。地震实验室在 `/labs/quake/index.html`。

## 打包

```bash
npm run build
```

产物在 `dist/`，是纯静态文件。

## 说明

- 实验里的地形、烈度公式等为教学示意，数据来源和待核实项见各实验的规格文档。
- 第三方组件：shadcn/ui、Magic UI、Radix（均为 MIT 许可）。
