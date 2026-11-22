// 质量与密度实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 质量用克，体积用立方厘米（1 mL = 1 cm³），密度用 g/cm³；取值约定写在规格卡 docs/specs/density.md 里。
const r1 = (x: number) => Math.round(x * 10) / 10
const sum = (a: readonly number[]) => a.reduce((s, x) => s + x, 0)

// ---------- 密度表（课本常见值，g/cm³） ----------
export const RHO = {
  al: { name: '铝', rho: 2.7 }, cu: { name: '铜', rho: 8.9 }, fe: { name: '铁', rho: 7.9 },
  water: { name: '水', rho: 1.0 }, ice: { name: '冰', rho: 0.9 }, alcohol: { name: '酒精', rho: 0.8 },
} as const
export type Stuff = keyof typeof RHO
export type Metal3 = 'al' | 'fe' | 'cu'
/** 质量（g）= 密度 × 体积 */
export const massOf = (s: Stuff, V: number) => r1(RHO[s].rho * V)
/** 体积（cm³）= 质量 ÷ 密度 */
export const volumeOf = (s: Stuff, m: number) => r1(m / RHO[s].rho)
/** 密度（g/cm³）= 质量 ÷ 体积 */
export const density = (m: number, V: number) => m / V
/** 1 g/cm³ = 1×10³ kg/m³：换成 kg/m³ */
export const toSI = (gcm3: number) => gcm3 * 1000
/** 把 kg/m³ 写成 “2.7×10³” 这样 */
export const sci = (kgm3: number) => `${(kgm3 / 1000).toFixed(1)}×10³`

// ---------- 托盘天平 ----------
/** 砝码盒里的一套砝码（g），从大到小；标尺 0–5 g，分度值 0.2 g；天平的称量 200 g */
export const WEIGHTS = [100, 50, 20, 20, 10, 5] as const
export const RIDER = { max: 5, step: 0.2 }
export const CAPACITY = 200
/** 用这套砝码称质量 m：从大到小逐个试，放上去偏重（右盘下沉）就取下，最后移游码。steps 是试的全过程，on 是留在盘里的砝码（序号），rider 是游码的示数 */
export function weigh(m: number) {
  const steps: { i: number; w: number; keep: boolean }[] = []; let s = 0
  WEIGHTS.forEach((w, i) => { const keep = s + w <= m + 1e-9; steps.push({ i, w, keep }); if (keep) s += w })
  return { steps, on: steps.filter(x => x.keep).map(x => x.i), sum: s, rider: r1(m - s) }
}
/** 读数（g）= 右盘砝码的总质量 + 游码在标尺上的示数 */
export const reading = (on: readonly number[], rider: number) => r1(sum(on.map(i => WEIGHTS[i])) + rider)
/** 横梁歪多少（−1 到 1）：正数是左盘下沉、指针偏向分度盘左侧。两边相差 SENS 克以上就歪到头 */
export const SENS = 2
export const tilt = (left: number, right: number) => Math.max(-1, Math.min(1, (left - right) / SENS))
export const pointerSays = (t: number) => Math.abs(t) < 0.03 ? '指在分度盘中央' : t > 0 ? '偏向左侧' : '偏向右侧'
/** 写成 “50 g + 20 g” 这样 */
export const weightsText = (on: readonly number[]) => on.length ? on.map(i => `${WEIGHTS[i]} g`).join(' + ') : '没有砝码'

// ---------- 第 1 课：质量不随形状、状态、位置改变 ----------
export const THINGS = {
  shape: { name: '橡皮泥', m: 62.4, from: '搓成球', to: '压成饼', act: '压成饼' },
  state: { name: '密封杯和冰', m: 86, from: '冰', to: '水', act: '等冰熔化' },
  place: { name: '铝块', m: massOf('al', 20), from: '化验室', to: '料场', act: '拿到料场' },
} as const
export type ThingKey = keyof typeof THINGS
/** 密封杯里那些冰的质量（g）：熔化前后的体积由密度算出 */
export const ICE_M = 36

// ---------- 第 2 课：用天平称一块铜 ----------
/** 开始时游码不在零刻度线上（g）；游码归零以后横梁仍然左边重一点，相当于左盘多了 TRIM 克，要靠平衡螺母调回来 */
export const START = { rider: 1.2, trim: 0.8 }
export const COPPER = massOf('cu', 10)

// ---------- 第 3 课：量筒 ----------
/** 量筒：量程 100 mL，分度值 1 mL，内半径 1.5 cm */
export const CYL = { max: 100, step: 1, r: 1.5 }
/** 截面是圆的容器里，V 毫升的液体有多高（cm） */
export const columnCm = (V: number, r: number) => V / (Math.PI * r * r)
/** 视线和水平方向夹 deg 度（俯视为正）、对准凹液面最低处时，在量筒壁的刻度上读到多少：俯视偏大，仰视偏小 */
export const SIGHT = 15
export const sightReading = (V: number, deg: number, r = CYL.r) => V + r * Math.tan(deg * Math.PI / 180) / columnCm(1, r)
/** 排水法：浸没前后两次读数的差就是固体的体积（cm³） */
export const displaced = (v1: number, v2: number) => v2 - v1
export const STONE = { m: 52, v1: 40, v: 20 }
export const stoneV2 = () => STONE.v1 + STONE.v

// ---------- 第 4 课：同种物质的质量和体积 ----------
export const BLOCK_V = [6, 10, 20] as const
export const blocks = (s: Metal3) => BLOCK_V.map(V => ({ V, m: massOf(s, V) }))

// ---------- 第 5 课：密度 ----------
export const BAR_V = 20
export const BARS: Metal3[] = ['al', 'fe', 'cu']

// ---------- 第 6 课：测石块和盐水的密度 ----------
/** 盐水：空烧杯 cup 克；烧杯里装 v 毫升；这杯盐水的密度 rho；全倒进量筒时烧杯壁上沾住 stick 毫升；方法乙倒出 part 毫升 */
export const BRINE = { cup: 40, v: 60, rho: 1.1, stick: 2, part: 40 }
/** 烧杯和盐水的总质量 */
export const brineTotal = () => r1(BRINE.cup + BRINE.v * BRINE.rho)
/** 做法甲：称总质量，把盐水全部倒进量筒读体积。烧杯壁上沾着的没倒出来，体积偏小，密度偏大 */
export function brineAll() { const m1 = brineTotal(), V = BRINE.v - BRINE.stick, m = r1(m1 - BRINE.cup); return { m0: BRINE.cup, m1, m, V, rho: density(m, V) } }
/** 做法乙：称总质量，倒一部分进量筒读体积，再称剩下的。倒出去多少就量多少 */
export function brinePart() { const m1 = brineTotal(), V = BRINE.part, m2 = r1(m1 - V * BRINE.rho), m = r1(m1 - m2); return { m1, m2, m, V, rho: density(m, V) } }
export const stoneRho = () => density(STONE.m, STONE.v)

// ---------- 第 7 课：密度的应用 ----------
/** 一块不知道是什么的金属 */
export const UNKNOWN = { m: 158, v1: 40, v: 20 }
/** 对着密度表认物质：密度和表里哪一种对得上 */
export const identify = (rho: number): Stuff | null => (Object.keys(RHO) as Stuff[]).find(k => Math.abs(RHO[k].rho - rho) < 0.05) ?? null
/** 料场上的一块大铝锭（m） */
export const SLAB = { l: 2, w: 1, h: 0.5, stuff: 'al' as Stuff }
export const slabV = () => SLAB.l * SLAB.w * SLAB.h
/** 大铝锭的质量（kg）= 密度 × 体积 */
export const slabM = () => toSI(RHO[SLAB.stuff].rho) * slabV()
/** 一只铁球 */
export const BALL = { m: 47.4, v1: 40, v: 10, stuff: 'fe' as Stuff }
/** 铁球的半径（cm）：由体积算出 */
export const ballR = () => Math.cbrt(3 * BALL.v / (4 * Math.PI))
/** 铁球里真正是铁的那部分体积、空心部分的体积（cm³） */
export const solidV = () => volumeOf(BALL.stuff, BALL.m)
export const hollowV = () => r1(BALL.v - solidV())

// ---------- 拓展 ----------
/** 一杯水结成冰：质量不变，体积变大 */
export const FREEZE = { m: 90 }
/** 结冰的湖：从冰面下到湖底，水温（℃） */
export const LAKE = [0, 1, 2, 3, 4] as const
