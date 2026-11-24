// 水的净化和组成实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 取值约定写在规格卡 docs/specs/water.md 里。浊度、泡沫、颜色残留是示意的简化模型；电解水按法拉第定律算。

// ---------- 浊度和画面 ----------
/** 出厂水浑浊度的限值（NTU，GB 5749-2022） */
export const NTU_LIMIT = 1
/** 河水原水的浊度（NTU，示意） */
export const RIVER_NTU = 60
/** 浑浊程度 0–1：按浊度的对数映射。0.3 NTU 以下算清水，200 NTU 算最浑 */
export function murk(ntu: number) { const lo = Math.log10(0.3), hi = Math.log10(200); return Math.max(0, Math.min(1, (Math.log10(Math.max(0.01, ntu)) - lo) / (hi - lo))) }
/** 浊度在界面上的写法：小于 10 保留一位小数，否则取整 */
export const fmtNtu = (ntu: number) => ntu < 10 ? ntu.toFixed(1) : String(Math.round(ntu))

// ---------- 第 1 课：天然水里有什么 ----------
export const WATERS = {
  river: { name: '河水', pure: false, has: ['水', '泥沙等不溶性杂质', '可溶性杂质', '细菌等微生物'] },
  distilled: { name: '蒸馏水', pure: true, has: ['只有水'] },
} as const
export type WaterKey = keyof typeof WATERS
export type Kind = 'pure' | 'mix'
export const KIND_NAME: Record<Kind, string> = { pure: '纯净物', mix: '混合物' }
/** 是纯净物还是混合物 */
export const isPure = (w: WaterKey) => WATERS[w].pure
export const kindOf = (w: WaterKey): Kind => isPure(w) ? 'pure' : 'mix'

// ---------- 第 2 课：沉淀 ----------
/** 静置能沉到的浊度：不加明矾只沉下较粗的泥沙；加了明矾，细小的悬浮物也聚成矾花沉下去（示意） */
export const SETTLE = { plain: { floor: 25, tau: 3.2 }, alum: { floor: 6, tau: 2.6 } } as const
/** 静置 t 秒（画面上的时间）后上层水的浊度 */
export function settle(alum: boolean, t: number) { const s = alum ? SETTLE.alum : SETTLE.plain; return s.floor + (RIVER_NTU - s.floor) * Math.exp(-Math.max(0, t) / s.tau) }
/** 沉到杯底的泥占全部能沉下去的几成（0–1），画杯底的泥层用 */
export function sunk(alum: boolean, t: number) { const top = settle(alum, t); return (RIVER_NTU - top) / (RIVER_NTU - SETTLE.alum.floor) }

// ---------- 第 3 课：过滤 ----------
/** 第 3 课倒进漏斗的水：静置后的上层河水 */
export const FEED_NTU = SETTLE.plain.floor
/** 滤纸让多少浊度漏过去（示意）：完好的滤纸挡住几乎全部的泥，破了的几乎挡不住 */
export const PAPER = { ok: { name: '完好的滤纸', pass: 0.08 }, torn: { name: '破了的滤纸', pass: 0.85 } } as const
export type PaperKey = keyof typeof PAPER
export const filtered = (ntu: number, paper: PaperKey) => ntu * PAPER[paper].pass

// ---------- 第 4 课：吸附 ----------
/** 过滤以后颜色还剩原来的几成（示意）：溶在水里的色素能穿过滤纸；活性炭把它吸附住 */
export const colorLeft = (carbon: boolean) => carbon ? 0.05 : 1
export const pct = (k: number) => `${Math.round(k * 100)}%`

// ---------- 第 5 课：自来水厂 ----------
/** 水厂的各站，按水流的顺序；ntu 是这一站出水的浊度（示意），chem 是这一步是不是化学变化 */
export const PLANT = [
  { id: 'intake', name: '取水', place: '取水泵房', ntu: RIVER_NTU, chem: false, what: '水泵把河水抽进厂里' },
  { id: 'floc', name: '絮凝沉淀', place: '絮凝沉淀池', ntu: 3, chem: false, what: '加入絮凝剂，矾花沉到池底' },
  { id: 'sand', name: '过滤', place: '滤池', ntu: 0.5, chem: false, what: '穿过砂层，除去剩下的不溶性杂质' },
  { id: 'carbon', name: '吸附', place: '活性炭池', ntu: 0.3, chem: false, what: '活性炭吸附色素和异味' },
  { id: 'chlorine', name: '消毒', place: '加氯间', ntu: 0.3, chem: true, what: '投加消毒剂，杀死细菌等微生物' },
  { id: 'clear', name: '配水', place: '清水池和送水泵房', ntu: 0.3, chem: false, what: '在清水池里存放，再由水泵送往城市' },
] as const
export type StationId = (typeof PLANT)[number]['id']
export const stationTurb = (i: number) => PLANT[Math.max(0, Math.min(PLANT.length - 1, i))].ntu
/** 出厂水合不合格 */
export const passes = (ntu: number) => ntu <= NTU_LIMIT

// ---------- 第 6 课：硬水和软水 ----------
/** 几种水的硬度（mg/L，以碳酸钙计，示意；界面不显示这个数） */
export const HARD = { well: 340, boiled: 340 * 0.35, distilled: 0 } as const
export type HardKey = keyof typeof HARD
export const HARD_NAME: Record<HardKey, string> = { well: '井水', boiled: '煮沸过的井水', distilled: '蒸馏水' }
/** 加肥皂水振荡后：泡沫高度（cm）和浮渣多少（0–1），示意 */
export function foam(hard: number) { return { foam: 3.6 * Math.exp(-hard / 110), scum: Math.min(1, hard / 300) } }
/** 泡沫多不多（界面上用这句话） */
export const foamWord = (hard: number) => foam(hard).foam > 2 ? '泡沫多，浮渣少' : foam(hard).foam > 0.8 ? '泡沫较多，有少量浮渣' : '泡沫少，浮渣多'
/** 一个大气压下水的沸点（°C）；室温 */
export const BOIL = 100, ROOM = 20
/** 是不是硬水（示意分界：泡沫少于 1 cm 算硬水） */
export const isHard = (hard: number) => foam(hard).foam < 1

// ---------- 第 7 课：水的组成 ----------
export const F = 96485          // 法拉第常数，C/mol
export const VM = 24.5          // 气体摩尔体积，L/mol（约 25 °C）
export const CURRENT = 1.0      // 电流，A
/** 画面加快的倍数 */
export const FAST = 15
/** 通电 t 秒（真实时间）后：负极的氢气、正极的氧气各多少 mL。n(H₂) = I·t / (2F)，氧气是氢气的一半 */
export function gas(I: number, t: number) { const h2 = I * Math.max(0, t) / (2 * F) * VM * 1000; return { h2, o2: h2 / 2 } }
/** 收集到 h2 mL 氢气要通电多少秒 */
export const timeFor = (I: number, h2: number) => h2 / 1000 / VM * 2 * F / I
/** 这一课收集到多少氢气就停 */
export const H2_GOAL = 20
export const fmtMl = (v: number) => v.toFixed(1)

// ---------- 拓展：滴水的龙头 ----------
export const DROP_ML = 0.05      // 一滴约 0.05 mL（估）
/** 每秒 n 滴，t 秒漏掉多少 mL */
export const drip = (perSec: number, sec: number) => perSec * sec * DROP_ML
export const DAY = 86400, YEAR = 365 * DAY
/** 简易净水器从上到下的四层 */
export const LAYERS = [
  { id: 'pebble', name: '小卵石', what: '挡住大的颗粒' },
  { id: 'sand', name: '石英砂', what: '滤去细小的泥沙' },
  { id: 'carbon', name: '活性炭', what: '吸附色素和异味' },
  { id: 'cotton', name: '蓬松棉', what: '托住上面几层，不让炭粉流出' },
] as const
/** 自制净水器出水的浊度（示意）：装了几层就去掉多少 */
export const diyTurb = (n: number) => RIVER_NTU * [1, 0.45, 0.12, 0.08, 0.06][Math.max(0, Math.min(4, n))]
