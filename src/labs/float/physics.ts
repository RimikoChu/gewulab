// 浮力实验室的计算核心。画面、读数、任务判定都从这里取数。
// 第 4 课的场景在造船厂：吊车把物块放进注满水的试验水池，溢出的水流进计量槽，计量槽放在地磅上。
// 物理量一律用国际单位；场景单位 1 = 1 m。
export const G = 9.8 // N/kg

export const LIQUIDS = {
  fresh: { name: '淡水', rho: 1000, color: '#2a9fc4' },
  sea: { name: '海水', rho: 1030, color: '#23a391' },
} as const
export type LiquidKey = keyof typeof LIQUIDS

/** 物块：底面都是 1 m × 1 m，高度不同 */
export const BLOCKS = {
  steel1: { name: '钢锭 1 m³', short: '钢 1 m³', h: 1, rho: 7850, color: '#8d949c', metal: true },
  steel2: { name: '钢锭 2 m³', short: '钢 2 m³', h: 2, rho: 7850, color: '#8d949c', metal: true },
  concrete1: { name: '混凝土块 1 m³', short: '混凝土 1 m³', h: 1, rho: 2400, color: '#b9b4a8', metal: false },
} as const
export type BlockKey = keyof typeof BLOCKS
export const BLOCK_SIDE = 1

/** 试验水池：内部 3 m × 3 m，溢水口（也就是满水位）离地 3 m */
export const POOL = { side: 3, brim: 3, floor: 0.3 }
/** 计量槽：内部 1.6 m × 1.6 m，自重 5.00 kN */
export const TANK = { side: 1.6, weight: 5000, height: 1.3 }
/** 物块底面一开始悬在水面上方 0.5 m；每按一次升降 0.1 m */
export const START_GAP = 0.5
export const STEP = 0.1
export const maxDrop = (b: BlockKey) => START_GAP + BLOCKS[b].h + 0.4

/** drop：物块从起点往下放了多少米；spilled：已经流进计量槽的水（m³），只增不减 */
export interface Lesson4State { drop: number; block: BlockKey; liquid: LiquidKey; spilled: number }

export function solve({ drop, block, liquid, spilled }: Lesson4State) {
  const rho = LIQUIDS[liquid].rho, b = BLOCKS[block]
  const A = POOL.side ** 2, a = BLOCK_SIDE ** 2
  const bottom = START_GAP - drop                                  // 物块底面相对满水位的高度（m），负数表示在水面以下
  // 水池里少了 spilled 的水；水面高度 level（相对满水位，≤ 0）和浸入深度 depth 互相决定
  let depth = Math.min(b.h, Math.max(0, (-bottom - spilled / A) / (1 - a / A)))
  let level = (a * depth - spilled) / A
  let extra = 0
  if (level > 1e-9) {                                              // 水面要高过溢水口：多出来的水流走
    depth = Math.min(b.h, Math.max(0, -bottom)); level = 0
    extra = a * depth - spilled
  }
  const vImm = a * depth, vOut = spilled + extra
  const gBlock = b.rho * a * b.h * G
  const fBuoy = rho * G * vImm, gOut = rho * G * vOut
  return {
    rho, bottom, level, depth, frac: depth / b.h, vImm, vOut, extra,
    gBlock, fPull: gBlock - fBuoy, fBuoy,
    gTank: TANK.weight, gTotal: TANK.weight + gOut, gOut,
    tankLevel: vOut / TANK.side ** 2,
    equal: vImm > 1e-6 && Math.abs(fBuoy - gOut) < 5,              // 相差不到 0.005 kN
    lifted: vImm < vOut - 1e-6,                                    // 物块比刚才提起来了一些，槽里的水比现在排开的多
  }
}
/** 把新溢出的水记进计量槽 */
export function advance(st: Lesson4State): Lesson4State {
  const r = solve(st)
  return r.extra > 0 ? { ...st, spilled: st.spilled + r.extra } : st
}
export type Lesson4Result = ReturnType<typeof solve>
/** 牛 → 千牛，两位小数 */
export const kN = (x: number) => (Math.abs(x) < 5 ? 0 : x / 1000).toFixed(2)
