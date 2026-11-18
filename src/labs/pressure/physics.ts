// 压强实验室的计算核心。画面、读数、任务判定都从这里取数。
// 物理量一律用国际单位；场景单位 1 = 1 m。
export const G = 9.8 // N/kg

// ---------- 第 3 课 水里的压强 ----------
// 地点在水库岸边：岸上的小吊臂吊着一只压力探头，可以放进水库，也可以转过去放进旁边的泥浆井。
export const PLACES = {
  water: { name: '水库', liquid: '水', rho: 1000 },
  mud: { name: '泥浆井', liquid: '泥浆', rho: 1200 },
} as const
export type PlaceKey = keyof typeof PLACES
export const DIRS = { up: '朝上', side: '朝侧面', down: '朝下' } as const
export type DirKey = keyof typeof DIRS
/** 水深 6 m；探头一开始悬在水面上方 1.6 m；最深能放到 5.5 m */
export const SITE3 = { depth: 6, gap: 1.6, maxH: 5.5, shallow: 2.5, deep: 5 }
export const maxDrop3 = SITE3.gap + SITE3.maxH
/** 要让探头在液面下 h 米，吊臂该放下多少 */
export const dropFor = (h: number) => SITE3.gap + h

/** drop：探头从起点往下放了多少米。h 是橡皮膜中心在液面下的深度；液体压强和朝向无关 */
export function solve3(drop: number, place: PlaceKey) {
  const rho = PLACES[place].rho, h = Math.max(0, drop - SITE3.gap)
  return { rho, h, p: rho * G * h, inAir: drop < SITE3.gap - 1e-6, above: SITE3.gap - drop }
}
export type Lesson3Result = ReturnType<typeof solve3>
/** 帕 → 千帕，一位小数 */
export const kPa = (x: number) => (x / 1000).toFixed(1)

// ---------- 第 1 课 压出来的坑 ----------
// 地点在坝区工地的沙地。一块混凝土预制块：2 m × 1 m × 0.5 m，重 23.52 kN。换放法就是换受力面积。
export const SLAB = { weight: 2400 * 2 * 1 * 0.5 * G }
/** 三种放法：着地的面积 S、朝镜头的宽 w、高 h、前后的厚 d */
export const POSES = {
  flat: { name: '平放', S: 2, w: 2, h: 0.5, d: 1 },
  side: { name: '侧放', S: 1, w: 2, h: 1, d: 0.5 },
  end: { name: '立放', S: 0.5, w: 1, h: 2, d: 0.5 },
} as const
export type PoseKey = keyof typeof POSES
/** n：叠了几块。坑深按压强成正比示意：每 11.76 kPa 陷 10 cm */
export function solve1(pose: PoseKey, n: number) {
  const F = SLAB.weight * n, S = POSES[pose].S, p = F / S
  return { F, S, p, sink: Math.min(0.9, p / 11760 * 0.1) }
}
/** 牛 → 千牛，两位小数 */
export const kN = (x: number) => (x / 1000).toFixed(2)

// ---------- 第 2 课 压强 ----------
// 地点在工地的软土路。两辆车都是 20 吨：履带挖掘机和轮式卡车。卡车还可以垫上钢板再开。
export const CARS = {
  truck: { name: '卡车', mass: 20000, S: 0.3, how: '6 个轮子，每个着地 0.05 m²' },
  digger: { name: '挖掘机', mass: 20000, S: 4.2, how: '两条履带，每条 3.5 m × 0.6 m' },
} as const
export type CarKey = keyof typeof CARS
export const PLATE_S = 12                 // 垫的两块钢板一共 12 m²
/** 陷多深按压强成正比示意，最多陷半米 */
export function solve2(car: CarKey, plates: boolean) {
  const F = CARS[car].mass * G, S = car === 'truck' && plates ? PLATE_S : CARS[car].S, p = F / S
  return { F, S, p, sink: Math.min(0.5, p / 653333 * 0.5) }
}

// ---------- 第 4 课 大坝为什么上窄下宽 ----------
// 一座 110 m 高的混凝土坝，水库最深蓄到 100 m。液体压强只看密度和深度。
export const DAM = { height: 110, max: 100, crest: 10, base: 80 }
/** 水面下 h 米处的压强 */
export const pWater = (h: number) => 1000 * G * Math.max(0, h)

// ---------- 第 5 课 船怎样翻过大坝 ----------
// 引水渠上的一座小船闸：下游水深 2 m，上游水深 6 m，中间是闸室。阀门打开，闸室就和那一侧连通。
export const LOCK = { low: 2, up: 6, start: 4, rate: 0.9 }
export interface Lock5 { vLow: boolean; vUp: boolean; gLow: boolean; gUp: boolean; c: number; boat: 0 | 1 | 2 }
export const lockStart: Lock5 = { vLow: false, vUp: false, gLow: false, gUp: false, c: LOCK.start, boat: 0 }
const same = (a: number, b: number) => Math.abs(a - b) < 0.02
/** 闸室的水面要往哪个高度去（没有阀门、闸门开着就停在原处） */
export const lockGoal = (s: Lock5) => (s.vLow || s.gLow) && !(s.vUp || s.gUp) ? LOCK.low : (s.vUp || s.gUp) && !(s.vLow || s.gLow) ? LOCK.up : s.c
/** 把船从下游送到上游：下一步该做什么。返回 null 表示正在等水面变平，或者已经到了 */
export function lockNext(s: Lock5): { key: 'vLow' | 'vUp' | 'gLow' | 'gUp' | 'go'; text: string } | null {
  if (s.boat === 2) return null
  if (s.boat === 0) {
    if (s.gUp) return { key: 'gUp', text: '关上游闸门' }
    if (s.vUp) return { key: 'vUp', text: '关上游阀门' }
    if (!same(s.c, LOCK.low)) return s.vLow ? null : { key: 'vLow', text: '开下游阀门' }
    return s.gLow ? { key: 'go', text: '船开进闸室' } : { key: 'gLow', text: '开下游闸门' }
  }
  if (s.gLow) return { key: 'gLow', text: '关下游闸门' }
  if (s.vLow) return { key: 'vLow', text: '关下游阀门' }
  if (!same(s.c, LOCK.up)) return s.vUp ? null : { key: 'vUp', text: '开上游阀门' }
  return s.gUp ? { key: 'go', text: '船开到上游' } : { key: 'gUp', text: '开上游闸门' }
}
/** 现在能不能动这个阀门或闸门；不能动时返回原因 */
export function lockBlock(s: Lock5, key: 'vLow' | 'vUp' | 'gLow' | 'gUp'): string | null {
  const lowSide = key === 'vLow' || key === 'gLow', opening = !s[key]
  if (!opening) return null
  if (lowSide ? (s.vUp || s.gUp) : (s.vLow || s.gLow)) return '另一头还开着：两头同时打开，上游的水会一直往下游流'
  if (key === 'gLow' && !same(s.c, LOCK.low)) return '闸门两边的水面不一样高，水压着闸门，打不开'
  if (key === 'gUp' && !same(s.c, LOCK.up)) return '闸门两边的水面不一样高，水压着闸门，打不开'
  return null
}

// ---------- 第 6 课 空气也在压 ----------
// 托里拆利实验：1 m 长的玻璃管装满水银，倒插在水银槽里。水银柱的竖直高度只由大气压决定。
export const HG = 13600
export const SPOTS = {
  crest: { name: '坝顶', p0: 101300, note: '接近标准大气压' },
  peak: { name: '雪山顶', p0: 70100, note: '比坝顶高约 3000 m' },
} as const
export type SpotKey = keyof typeof SPOTS
export const TUBE = { len: 1, tilt: 30 }
/** tilt：管子偏离竖直多少度。返回水银柱的竖直高度和它在管里的长度（m）；管子太斜时水银会充满整根管 */
export function solve6(spot: SpotKey, tilt: number) {
  const h0 = SPOTS[spot].p0 / (HG * G), len = h0 / Math.cos(tilt * Math.PI / 180)
  const full = len >= TUBE.len
  return { h: full ? TUBE.len * Math.cos(tilt * Math.PI / 180) : h0, len: Math.min(TUBE.len, len), full, p0: SPOTS[spot].p0 }
}

// ---------- 第 7 课 流得快，压得轻 ----------
// 风洞里一段机翼模型：上表面的气流比下表面快，压强小。读数用简化模型算，只用来比大小。
export const WIND = { low: 10, high: 30, wingS: 2, wingW: 400 }
/** v：风速（m/s）。上表面比周围低多少、下表面比周围高多少、上下压强差（Pa），以及升力（N） */
export function solve7(v: number) {
  const top = 0.3375 * v * v, bot = 0.0585 * v * v, dp = top + bot, lift = dp * WIND.wingS
  return { top, bot, dp, lift, up: lift > WIND.wingW }
}
/** 往两张纸中间吹气：两张纸下端的间距（m），原来是 0.5 m */
export const paperGap = (v: number) => Math.max(0.02, 0.5 - 2 * 1.2 * Math.sin(Math.min(0.2, 0.00023 * v * v)))

// ---------- 拓展课：半球 · 下潜 · 高原 · 千斤顶 ----------
export const P0 = 101300
/** 马德堡半球：我们这一对的半径是 0.2 m。抽成真空后，要多大的力才能拉开（N） */
export const BALL = { r: 0.2, step: 2000, max: 16000 }
export const ballHold = (vac: number) => P0 * vac * Math.PI * BALL.r ** 2
/** 下潜：潜到水库最深处 100 m。每平方米舱盖上压着多少吨 */
export const tonPerM2 = (h: number) => 1000 * h / 1000
/** 烧水：气压越低，沸点越低。高压锅里约 2 个大气压 */
export const BOIL = { crest: 100, peak: 90, cooker: 120 }
/** 液压千斤顶：小活塞 10 cm²，大活塞 1000 cm²，顶着一块 23.52 kN 的混凝土 */
export const JACK = { s1: 0.001, s2: 0.1, load: 23520, weak: 100, strong: 300 }
