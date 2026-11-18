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

// ---------- 第 1 课 水里变轻了（称重法） ----------
// 地点在码头岸边：岸上的吊车把物体放进港池。水面很大，放进去水位不变。物体形状不规则，体积不好量，但浮力能直接“称”出来。
export const ITEMS = {
  anchor: { name: '船锚', mat: '铸钢', mass: 3000, rho: 7850, h: 1.8 },
  prop: { name: '螺旋桨', mat: '青铜', mass: 4400, rho: 8800, h: 1.7 },
  slab: { name: '混凝土块', mat: '混凝土', mass: 2400, rho: 2400, h: 1 },
} as const
export type ItemKey = keyof typeof ITEMS
/** 第 1 课的高度都相对港池水面来算 */
export const BASE1 = 0
export const maxDrop1 = (k: ItemKey) => START_GAP + ITEMS[k].h + 0.25

/** drop：物体从起点往下放了多少米。浸入的体积按“浸入的高度占全高的比例”估算 */
export function solve1(drop: number, item: ItemKey) {
  const it = ITEMS[item], V = it.mass / it.rho, rho = LIQUIDS.fresh.rho
  const bottom = BASE1 + START_GAP - drop                              // 物体底部相对水面的高度
  const depth = Math.min(it.h, Math.max(0, BASE1 - bottom))
  const vImm = V * depth / it.h
  const g = it.mass * G, fBuoy = rho * G * vImm
  return { bottom, depth, frac: depth / it.h, level: BASE1, vImm, volume: V, g, fBuoy, fPull: g - fBuoy, inAir: vImm < 1e-6, under: depth > it.h - 1e-4 }
}
export type Lesson1Result = ReturnType<typeof solve1>

// ---------- 第 2 课 浮力从哪来（上下表面的压力差） ----------
// 地点在深水船坞：水深 7 m，钢箱可以放得很深。钢箱底面是 1 m × 1 m。只算水产生的压强：p = ρ g h，面上的压力 F = p S。
export const BOXES = {
  b1: { name: '钢箱 1 m 高', short: '1 m 高', h: 1, mass: 3000, shallow: 1, deep: 5 },
  b2: { name: '钢箱 2 m 高', short: '2 m 高', h: 2, mass: 6000, shallow: 1, deep: 4 },
} as const
export type BoxKey = keyof typeof BOXES
/** 第 2 课的高度都相对船坞水面来算 */
export const BASE2 = 0
export const DOCK2 = { depth: 7 }
const LOWEST = -DOCK2.depth + 0.4                                 // 钢箱底面最低能到的位置（相对水面）
export const maxDrop2 = () => BASE2 + START_GAP - LOWEST
/** 要让顶面在水下 t 米，吊车该放下多少 */
export const dropForTop = (k: BoxKey, t: number) => START_GAP + BOXES[k].h + t

export function solve2(drop: number, box: BoxKey) {
  const b = BOXES[box], rho = LIQUIDS.fresh.rho, k = rho * G
  const bottom = BASE2 + START_GAP - drop                           // 底面相对水面的高度
  const wet = Math.min(b.h, Math.max(0, BASE2 - bottom))            // 浸在水里的高度；船坞很大，水面不动
  const level = BASE2
  const dBot = Math.max(0, level - bottom), dTop = dBot - b.h       // 底面、顶面在水面下多深（顶面为负表示还露在外面）
  const fUp = k * dBot, fDown = k * Math.max(0, dTop)               // 面积 1 m²
  const fSide = k * (Math.max(0, dTop) + dBot) / 2 * wet            // 每个侧面：平均压强 × 浸湿的面积
  const g = b.mass * G, fBuoy = fUp - fDown
  return { bottom, level, wet, dBot, dTop, fUp, fDown, fSide, fBuoy, g, fPull: g - fBuoy, pBot: k * dBot, pTop: k * Math.max(0, dTop), rho, under: wet > b.h - 1e-4, inAir: wet < 1e-6 }
}
export type Lesson2Result = ReturnType<typeof solve2>

// ---------- 第 3 课 和什么有关（控制变量） ----------
// 地点在材料试验间：并排三只液槽（淡水、海水、柴油），头顶的行车把物块吊到其中一只上方。
// 物块都是 1 m³ 的正方体，只是材料不同。每次只改一个条件。
export const MATS = {
  steel: { name: '钢', rho: 7850, color: '#aeb6be', metal: 0.85, rough: 0.42 },
  alu: { name: '铝', rho: 2700, color: '#e3e7ea', metal: 0.95, rough: 0.28 },
  concrete: { name: '混凝土', rho: 2400, color: '#b9b4a8', metal: 0, rough: 0.9 },
} as const
export type MatKey = keyof typeof MATS
export const LIQUIDS3 = {
  fresh: { name: '淡水', rho: 1000, color: '#2a9fc4' },
  sea: { name: '海水', rho: 1030, color: '#23a391' },
  diesel: { name: '柴油', rho: 850, color: '#c79a2e' },
} as const
export type Liquid3Key = keyof typeof LIQUIDS3
export const BASE3 = -0.3
/** 液槽：内部 2.4 m 见方，深度和试验水池一样 */
export const TANK3 = { side: 2.4 }
export const maxDrop3 = () => BASE3 + START_GAP - (POOL.floor - POOL.brim + 0.15)
/** 要让 1 m³ 物块的顶面在液面下 t 米（t 为负表示露出一截），吊车该放下多少 */
export const dropForTop3 = (t: number) => t >= 0 ? START_GAP - 1 / TANK3.side ** 2 + 1 + t : START_GAP + (1 + t) * (1 - 1 / TANK3.side ** 2)

export function solve3(drop: number, mat: MatKey, liquid: Liquid3Key) {
  const A = TANK3.side ** 2, rho = LIQUIDS3[liquid].rho
  const bottom = BASE3 + START_GAP - drop
  const wet = Math.min(1, Math.max(0, (BASE3 - bottom) / (1 - 1 / A)))
  const level = BASE3 + wet / A
  const dTop = Math.max(0, level - bottom) - 1
  const g = MATS[mat].rho * G, fBuoy = rho * G * wet
  return { bottom, level, wet, frac: wet, dTop, rho, vImm: wet, g, fBuoy, fPull: g - fBuoy, under: wet > 1 - 1e-4, inAir: wet < 1e-6 }
}
export type Lesson3Result = ReturnType<typeof solve3>

// ---------- 第 5 课 沉还是浮（浮沉条件） ----------
// 地点在港池：物体都是 1 m³ 的正方体，直接放在水里，不挂吊车：它自己上浮、下沉、停住。水面很大，水位不变。
export const FLOATERS = {
  wood: { name: '木箱', mass: 600 },
  ice: { name: '冰块', mass: 900 },
  tank: { name: '压载箱', mass: 0 },        // 质量可调：空箱 400 kg，再往里加水
  steel: { name: '钢锭', mass: 7850 },
} as const
export type FloaterKey = keyof typeof FLOATERS
export const TANK5 = { empty: 400, min: 400, max: 1500, step: 100 }   // 压载箱总质量的范围（kg）
export const BASE5 = -0.35
const FLOOR5 = POOL.floor - POOL.brim                                 // 池底（相对满水位）
export const TOP5 = 0.9                                               // 物体最高能被提到的位置（底面相对满水位）

/** 物体底面在 b（相对水面）时：浸入多深、水面多高、受多大浮力 */
export const SEA5 = { depth: 3, top: 0.9 }                            // 港池水深；物体最高能被提到的位置（底面相对水面）
export function wet5(b: number, rho: number) {
  const wet = Math.min(1, Math.max(0, -b))
  const level = 0
  return { wet, level, fBuoy: rho * G * wet, dTop: Math.max(0, level - b) - 1 }
}
export type Motion5 = 'float' | 'hover' | 'sunk' | 'rising' | 'sinking' | 'air'
/** 往前算一小步。返回新的位置、速度，以及水底的支持力 */
export function step5(b: number, v: number, mass: number, rho: number, dt: number) {
  const { fBuoy, wet } = wet5(b, rho)
  const net = fBuoy - mass * G
  let nv = v + (net / (mass + 500 * wet)) * dt            // 在水里动，还要带着一部分水一起动
  nv -= (wet > 0 ? 0.9 * nv + 1.0 * nv * Math.abs(nv) : 0.05 * nv) * dt   // 水的阻力：慢的时候正比于速度，快的时候正比于速度的平方
  nv = Math.max(-1.4, Math.min(1.4, nv))
  let nb = b + nv * dt, support = 0
  if (nb <= -SEA5.depth) { nb = -SEA5.depth; if (nv < 0) nv = 0; if (net < 0) support = -net }
  if (nb > SEA5.top) { nb = SEA5.top; nv = 0 }
  return { b: nb, v: nv, support }
}
/** 现在算哪种状态 */
export function motion5(b: number, v: number, mass: number, rho: number): Motion5 {
  const { wet, fBuoy } = wet5(b, rho), net = fBuoy - mass * G
  if (wet < 1e-4) return 'air'
  if (Math.abs(v) > 0.015) return v > 0 ? 'rising' : 'sinking'
  if (b <= -SEA5.depth + 1e-4 && net < -1) return 'sunk'
  if (wet < 1 - 1e-3) return 'float'
  return Math.abs(net) < 30 ? 'hover' : net > 0 ? 'rising' : 'sinking'
}
/** 漂浮时静止的位置（底面相对水面）；浮不起来则返回 null */
export function rest5(mass: number, rho: number) {
  const wet = mass / rho
  return wet < 1 ? -wet : null
}

// ---------- 第 6 课 钢铁变成船（排水量、载重线） ----------
// 一艘方头驳船：长 20 m、宽 6 m、型深 3 m，空船 60 吨；每只集装箱 20 吨。吃水 2 m 是满载线。
export const BARGE = { L: 20, B: 6, D: 3, empty: 60000, box: 20000, line: 2, maxBoxes: 12 }
export const FULL6 = Math.round((BARGE.line * BARGE.L * BARGE.B * 1000 - BARGE.empty) / BARGE.box)   // 在江水里装到满载线要几箱：9
export const WATERS = { river: { name: '江水', rho: 1000 }, sea: { name: '海水', rho: 1030 } } as const
export type WaterKey = keyof typeof WATERS
/** 同样 60 吨的钢，轧成钢板时的体积 */
export const PLATE_V = BARGE.empty / 7850

export function solve6(boxes: number, water: WaterKey) {
  const rho = WATERS[water].rho, mass = BARGE.empty + boxes * BARGE.box
  const vDisp = mass / rho, draft = vDisp / (BARGE.L * BARGE.B)
  return { rho, mass, cargo: boxes * BARGE.box, vDisp, draft, g: mass * G, fBuoy: mass * G, over: draft > BARGE.line + 1e-3, freeboard: BARGE.D - draft }
}
export type Lesson6Result = ReturnType<typeof solve6>
/** 千克 → 吨 */
export const ton = (kg: number) => (kg / 1000).toFixed(kg % 1000 === 0 ? 0 : 1)

// ---------- 第 7 课 飘在空中（热气球、密度计） ----------
// 热气球：球囊体积 2800 m³。球外是 20 °C 的空气；加热球内空气，它变稀，气球整体变轻。
export const BALLOON = { V: 2800, rhoOut: 1.2, tOut: 20, tMin: 20, tMax: 120, tStep: 10, top: 22 }
const rhoAt = (t: number) => BALLOON.rhoOut * (273 + BALLOON.tOut) / (273 + t)
/** 球囊、吊篮、燃烧器和驾驶员的总质量：正好在 80 °C 时悬停 */
export const BASKET = Math.round((BALLOON.rhoOut - rhoAt(80)) * BALLOON.V)
/** 再上两位乘客：正好在 100 °C 时悬停 */
export const RIDERS = Math.round((BALLOON.rhoOut - rhoAt(100)) * BALLOON.V) - BASKET

export function solve7(t: number, riders: boolean) {
  const rhoIn = rhoAt(t), load = BASKET + (riders ? RIDERS : 0)
  const fBuoy = BALLOON.rhoOut * G * BALLOON.V                    // 球外空气给的浮力：只要体积不变就不变
  const gAir = rhoIn * G * BALLOON.V, gLoad = load * G            // 球内热空气的重力；球囊和吊篮的重力
  return { rhoIn, load, fBuoy, gAir, gLoad, g: gAir + gLoad, net: fBuoy - gAir - gLoad }
}
export type Lesson7Result = ReturnType<typeof solve7>
export type Flight = 'ground' | 'rising' | 'hover' | 'falling' | 'tether'
/** 往前算一小步：alt 是吊篮离地的高度 */
export function step7(alt: number, v: number, net: number, dt: number) {
  let nv = v + (net / 4500 - 0.3 * v - 0.12 * v * Math.abs(v)) * dt
  let na = alt + nv * dt
  if (na <= 0) { na = 0; if (nv < 0) nv = 0 }
  if (na >= BALLOON.top) { na = BALLOON.top; if (nv > 0) nv = 0 }
  return { alt: na, v: nv }
}
export function flight7(alt: number, v: number, net: number): Flight {
  if (alt <= 1e-3 && net <= 40) return 'ground'
  if (alt >= BALLOON.top - 1e-3 && net > 40) return 'tether'
  if (Math.abs(v) > 0.05) return v > 0 ? 'rising' : 'falling'
  return Math.abs(net) < 40 ? 'hover' : net > 0 ? 'rising' : 'falling'
}

// 密度计：质量 60 g，下面的玻璃泡 40 cm³，上面的细管截面 1 cm²。漂浮时 F浮 = G，液体越密，浸入越浅。
export const METER = { mass: 0.06, bulb: 40e-6, area: 1e-4, stem: 0.36, bulbLen: 0.1 }
/** 细管浸在液面下的长度（m） */
export const stemIn = (rho: number) => (METER.mass / rho - METER.bulb) / METER.area

// ---------- 拓展课：冰山 · 沉船 · 太空 · 王冠 ----------
const AREA = POOL.side ** 2
/** 冰山：一块 1 m³ 的冰（900 kg）浮在水里。melt 从 0 到 1 是融化的进度 */
export function iceBerg(melt: number, rho: number) {
  const left = 900 * (1 - melt)                         // 还没化的冰（kg）
  const vDisp = left / rho, vMelt = 900 * melt / 1000   // 冰排开的水、已经化成的水（m³）
  const side = Math.cbrt(1 - melt)                      // 冰块现在的边长
  const level = BASE5 + (vDisp + vMelt) / AREA
  const draft = side > 1e-3 ? vDisp / (side * side) : 0
  return { left, vDisp, vMelt, side, level, bottom: level - draft, under: side > 1e-3 ? draft / side : 0, rise: (vDisp + vMelt - 900 / rho) / AREA }
}
/** 沉船打捞：沉在池底的一段钢船体，往上面系浮筒 */
export const WRECK = { mass: 3000, V: 3000 / 7850, bagV: 0.5, bagMass: 20, maxBags: 8 }
export function salvage(bags: number, rho: number) {
  const mass = WRECK.mass + bags * WRECK.bagMass, V = WRECK.V + bags * WRECK.bagV
  const g = mass * G, fBuoy = rho * G * V
  return { mass, V, g, fBuoy, net: fBuoy - g, level: BASE5 + V / AREA, up: fBuoy > g }
}
/** 太空：同一只木箱，重力可以“关掉”。和第 5 课一样往前算一小步，只是 g 可以变 */
export function stepG(b: number, v: number, mass: number, rho: number, g: number, dt: number) {
  const wet = Math.min(1, Math.max(0, (BASE5 - b) / (1 - 1 / AREA)))
  const net = (rho * wet - mass) * g
  let nv = v + (net / (mass + 500 * wet)) * dt
  nv -= (wet > 0 ? 0.9 * nv + 1.0 * nv * Math.abs(nv) : 0.05 * nv) * dt
  let nb = b + nv * dt
  if (nb <= FLOOR5) { nb = FLOOR5; if (nv < 0) nv = 0 }
  if (nb > TOP5) { nb = TOP5; nv = 0 }
  return { b: nb, v: nv, wet, fBuoy: rho * wet * g, level: BASE5 + wet / AREA }
}
/** 王冠：质量都是 1000 g。纯金的体积小；掺了三成银的王冠体积大一些 */
export const GOLD = { mass: 1000, rho: 19.3 }
export const CROWN = { gold: { name: '金块', V: 1000 / 19.3 }, crown: { name: '王冠', V: 700 / 19.3 + 300 / 10.5 } } as const
export type CrownKey = keyof typeof CROWN
export const CYL = { r: 0.02, start: 0 }                 // 接水的量杯：内半径（m）、一开始的水量（mL）
