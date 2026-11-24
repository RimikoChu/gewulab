// 呼吸实验室的计算核心：各课的数据表、呼吸动作的几何、气压和扩散的计算。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 数的来历写在规格卡 docs/specs/breath.md 里；拿不准的数没有放进界面。
export const round = (x: number, d = 1) => Math.round(x * 10 ** d) / 10 ** d
const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const DEG = Math.PI / 180

/** 外界气压（kPa） */
export const P0 = 101.3

// ---------- 第 1 课 呼吸道 ----------
export const AIRWAY = [
  { key: 'nose', name: '鼻', job: '鼻毛挡住灰尘；鼻黏膜分泌黏液，黏膜里有丰富的毛细血管，使空气清洁、湿润、温暖' },
  { key: 'pharynx', name: '咽', job: '空气和食物的共同通道' },
  { key: 'larynx', name: '喉', job: '气体的通道，也是发声的器官；会厌在吞咽时盖住喉口' },
  { key: 'trachea', name: '气管', job: '内表面有纤毛和黏液，粘住灰尘、细菌，纤毛摆动把它们送到咽喉，咳出就是痰' },
  { key: 'bronchi', name: '支气管', job: '把空气送进左右两肺' },
] as const
export type AirwayKey = (typeof AIRWAY)[number]['key']
/** 灰尘的三档大小（示意） */
export type DustSize = 'big' | 'mid' | 'fine'
export const DUST_NAME: Record<DustSize, string> = { big: '大颗', mid: '小颗', fine: '很细的' }
/** 一颗灰尘在哪里被拦下：大颗挂在鼻毛上，小颗粘在气管的黏液上，很细的有少数一直进到肺里 */
export const catchAt = (s: DustSize): 'hair' | 'mucus' | 'lung' => (s === 'big' ? 'hair' : s === 'mid' ? 'mucus' : 'lung')
/** 一口气里的灰尘（示意）：大颗 6、小颗 8、很细的 2 */
export const DUST: DustSize[] = [...Array(6).fill('big'), ...Array(8).fill('mid'), ...Array(2).fill('fine')]
export function dustTally(list: DustSize[] = DUST) {
  const t = { hair: 0, mucus: 0, lung: 0 }
  for (const d of list) t[catchAt(d)]++
  return t
}

// ---------- 第 2 课 肺和肺泡 ----------
/** 模型里画出的支气管分支级数（主支气管算第 1 级，到肺泡前的细支气管） */
export const TREE_LEVELS = 7
/** 肺泡里的氧到血液里，要穿过几层细胞：肺泡壁一层、毛细血管壁一层 */
export const WALLS = [{ name: '肺泡壁', cells: 1 }, { name: '毛细血管壁', cells: 1 }] as const
export const layersToCross = () => WALLS.reduce((s, w) => s + w.cells, 0)

// ---------- 第 3 课 胸廓（肋间肌） ----------
/** 肋间肌全力收缩时肋骨上提的角度（度；示意，动作放大） */
export const RIB_PUMP = 12
/** 肋骨同时向外翻的角度（度；示意，动作放大） */
export const RIB_BUCKET = 10
/** 静止时胸廓的前后径、左右径（cm，成年人大致尺寸，示意） */
export const CHEST = { depth: 18, width: 28 }
/** 肋骨前端到肋头的长度在正中面上的投影（cm），和肋骨前端向下斜的角度（度） */
const RIB_L = 17, RIB_SLOPE = 35
/** 肋骨侧面最远处到正中的距离（cm），和它向下垂的角度（度） */
const RIB_SIDE = 14, RIB_DROOP = 30
/** 收缩程度 k（0 舒张，1 收缩到底）时肋骨上提的角度（度） */
export const ribTurn = (k: number) => RIB_PUMP * clamp01(k)
/** 前后径：肋骨前端绕肋头往上转，前端离脊柱更远 */
export const chestDepth = (k: number) => CHEST.depth + RIB_L * (Math.cos((RIB_SLOPE - ribTurn(k)) * DEG) - Math.cos(RIB_SLOPE * DEG))
/** 左右径：肋骨像桶的提手一样往上往外翻 */
export const chestWidth = (k: number) => CHEST.width + 2 * RIB_SIDE * (Math.cos((RIB_DROOP - RIB_BUCKET * clamp01(k)) * DEG) - Math.cos(RIB_DROOP * DEG))

// ---------- 第 4 课 膈和钟罩模型 ----------
/** 膈肌收缩到底时膈顶下降的距离（cm；示意，动作放大） */
export const DIA_DROP = 3
export const diaDrop = (k: number) => DIA_DROP * clamp01(k)
/** 钟罩模型：钟罩内半径（cm），罩里的空气（mL，示意），橡皮膜最多拉下（cm），每个气球没吹时里面的气（mL） */
export const JAR = { r: 7, air: 1500, pull: 3, balloon0: 15 }
/** 球冠的体积（cm³ = mL）：半径 r 的口，凸出 h */
export const capVolume = (r: number, h: number) => Math.PI * h * (3 * r * r + h * h) / 6
/** 橡皮膜拉下 k（0–1）时钟罩里多出来的空间（mL） */
export const jarExtra = (k: number) => capVolume(JAR.r, JAR.pull * clamp01(k))
/** 钟罩里的空气被拉大了 dV（mL）、气球还没来得及鼓的那一下，罩里的气压（kPa）：pV 不变 */
export const jarPressure = (dV: number) => P0 * JAR.air / (JAR.air + dV)
/** 一个气球里有 V mL 气时的半径（cm） */
export const balloonR = (V: number) => Math.cbrt(3 * V / (4 * Math.PI))
/** 气压重新相等后，两个气球一共鼓起来的体积就等于多出来的空间（mL） */
export const balloonsGain = (k: number) => jarExtra(k)

// ---------- 第 5 课 吸气和呼气时的气压 ----------
/** 肺的容积（L）：平静呼气末 2.5，平静吸气末 3.0（示意） */
export const LUNG = { rest: 2.5, tidal: 0.5 }
/** 气道阻力（kPa·s/L，示意） */
export const R_AIR = 0.25
export const lungVolume = (k: number) => LUNG.rest + LUNG.tidal * clamp01(k)
/**
 * 往前走 dt 秒：n 是肺里的气（按外界气压折算的升数），这 dt 秒里肺的容积从 Va 匀速变到 Vb（L）。
 * 肺内气压 p = P0·n/V（温度不变时 pV 和气的多少成正比）；气流 q = (P0 − p)/R，正的是往里流（L/s）。
 * 时间常数只有几毫秒，所以按 0.2 ms 一小步走。
 */
export function breathStep(n: number, Va: number, Vb: number, dt: number) {
  let q = 0, V = Va
  const steps = Math.max(1, Math.ceil(dt / 0.0002)), h = dt / steps
  for (let i = 1; i <= steps; i++) { V = Va + (Vb - Va) * i / steps; q = (P0 - P0 * n / V) / R_AIR; n += q * h }
  return { n, p: P0 * n / V, q }
}
/** 肺内气压和外界差多少（Pa） */
export const diffPa = (p: number) => Math.round((p - P0) * 1000)
/** 气流方向 */
export const flowDir = (p: number): 'in' | 'out' | 'none' => { const d = diffPa(p); return d <= -3 ? 'in' : d >= 3 ? 'out' : 'none' }

// ---------- 第 6 课 肺泡里的气体交换 ----------
/** 两边的含量往中间扩散：从多的一边到少的一边，总量不变。rate 每秒拉近的比例 */
export function diffuse(a: number, b: number, rate: number, dt: number) {
  const m = (a + b) / 2, k = Math.exp(-2 * rate * dt)
  return [m + (a - m) * k, m + (b - m) * k] as [number, number]
}
/** 相对含量（示意，只用来比多少）：肺泡里的气、流进来的静脉血 */
export const GAS = { o2: { alv: 1, vein: 0.4 }, co2: { alv: 0.4, vein: 0.46 } } as const
export type GasKey = keyof typeof GAS
/**
 * 一段血流过肺泡，走到 s（0 流进来，1 流出去）时血里的这种气是多少。肺泡里的气被不停换新，看作不变；
 * hold 为真（屏住呼吸）时肺泡里的氧慢慢少、二氧化碳慢慢多，差小了，交换就慢
 */
export function bloodAlong(g: GasKey, s: number, hold = 0) {
  const alv = g === 'o2' ? GAS.o2.alv - 0.45 * clamp01(hold) : GAS.co2.alv + 0.05 * clamp01(hold)
  const v = GAS[g].vein
  return alv + (v - alv) * Math.exp(-6 * clamp01(s))
}
/** 往哪里走 */
export const gasDir = (g: GasKey) => (GAS[g].alv > GAS[g].vein ? '肺泡 → 血液' : '血液 → 肺泡')

// ---------- 第 7 课 吸入和呼出的气体 ----------
/** 吸入的空气和呼出的气体的成分（体积分数 %，教材的表） */
export const AIR = [
  { key: 'n2', name: '氮气', in: 78, out: 78 },
  { key: 'o2', name: '氧气', in: 21, out: 16 },
  { key: 'co2', name: '二氧化碳', in: 0.03, out: 4 },
  { key: 'h2o', name: '水', in: 0.07, out: 1.1 },
  { key: 'other', name: '其他气体', in: 0.9, out: 0.9 },
] as const
const share = (k: string, side: 'in' | 'out') => AIR.find(a => a.key === k)![side]
/** 每瓶通入的气体（mL，示意） */
export const PUSH_ML = 300
/** 通入 mL 毫升气体，里面有多少二氧化碳（mL） */
export const co2In = (kind: 'breath' | 'air', mL: number) => round(mL * share('co2', kind === 'breath' ? 'out' : 'in') / 100, 2)
/** 浑浊程度（0 清，1 很浑；示意）：通入的二氧化碳越多越浑 */
export const cloud = (co2mL: number) => round(1 - Math.exp(-co2mL / 5), 3)
/** 呼出的气体里二氧化碳是空气里的多少倍 */
export const co2Times = () => Math.round(share('co2', 'out') / share('co2', 'in'))

// ---------- 拓展 测胸围差、海姆立克急救 ----------
/** 一位同学的三次测量（cm，示意）：尽力吸气后、尽力呼气后 */
export const GIRTH: [number, number][] = [[84.0, 77.5], [84.5, 77.0], [83.5, 77.5]]
export const girthDiff = (i: number) => round(GIRTH[i][0] - GIRTH[i][1], 1)
export const girthAvg = () => round(GIRTH.reduce((s, _, i) => s + girthDiff(i), 0) / GIRTH.length, 1)
/** 海姆立克：气道堵住时，肺里 LUNG.rest 升的气被压小 dV 升，肺内气压升高多少（kPa） */
export const thrust = (dV: number) => round(P0 * LUNG.rest / (LUNG.rest - dV) - P0, 1)
export const THRUST_DV = 0.1
