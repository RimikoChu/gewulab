// 热力环流和风实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 取值约定写在规格卡 docs/specs/wind.md 里：g = 9.8 N/kg，干空气气体常数 R = 287 J/(kg·K)。
// 很多量是“示意”：为了看得清做了简化，界面上标“约”或“示意”，规格卡里写明。
export const G = 9.8                // N/kg
export const R_AIR = 287            // J/(kg·K)
export const K0 = 273.15

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x))
const r1 = (x: number) => Math.round(x * 10) / 10

// ---------- 第 1 课 大气的垂直分层 ----------
/** 三处探空站：地面气温（示意）和对流层顶的高度（教材：低纬 17～18 km、中纬 10～12 km、高纬 8～9 km） */
export const LATS = {
  low: { name: '低纬度', t0: 26, top: 17 },
  mid: { name: '中纬度', t0: 15, top: 12 },
  high: { name: '高纬度', t0: 0, top: 9 },
} as const
export type LatKey = keyof typeof LATS
/** 对流层里每升高 1 km 气温约降 6 ℃（教材：每升高 100 m 约降 0.6 ℃） */
export const LAPSE = 6
/** 平流层顶约 50 km；平流层下部气温几乎不变，到 20 km 以上随高度升高（臭氧吸收紫外线） */
export const STRAT_TOP = 50, STRAT_FLAT = 20, STRAT_TOP_T = -2
/** 探空气球升到约 30 km 胀破 */
export const BURST = 30
/** 画面里最高画到 80 km */
export const TOP_KM = 80

/** 对流层顶的气温（℃） */
export const tropoT = (lat: LatKey) => LATS[lat].t0 - LAPSE * LATS[lat].top
/** 高度 h（km）处的气温（℃）：对流层线性递减；平流层先不变，20 km 以上升到 50 km 的 −2 ℃；高层大气先降后升（示意） */
export function tempAt(lat: LatKey, h: number) {
  const L = LATS[lat], tt = tropoT(lat)
  if (h <= L.top) return L.t0 - LAPSE * h
  const flat = Math.max(L.top, STRAT_FLAT)
  if (h <= flat) return tt
  if (h <= STRAT_TOP) return tt + (STRAT_TOP_T - tt) * (h - flat) / (STRAT_TOP - flat)
  if (h <= 85) return STRAT_TOP_T + (-90 - STRAT_TOP_T) * (h - STRAT_TOP) / 35
  return -90 + (h - 85) * 3
}
export type LayerKey = 'tropo' | 'strato' | 'upper'
export const LAYER_NAME: Record<LayerKey, string> = { tropo: '对流层', strato: '平流层', upper: '高层大气' }
export function layerAt(lat: LatKey, h: number): LayerKey { return h <= LATS[lat].top ? 'tropo' : h <= STRAT_TOP ? 'strato' : 'upper' }

// ---------- 第 2、3 课 大气的受热过程 ----------
/** 到达大气上界的太阳辐射记作 100 份，分给四处（示意；多云取全球平均的近似，见规格卡） */
export const SKIES = {
  clear: { name: '晴天', reflect: 8, absorb: 20, groundReflect: 7, ground: 65, counter: 0.7 },
  cloudy: { name: '阴天', reflect: 52, absorb: 25, groundReflect: 3, ground: 20, counter: 0.95 },
} as const
export type SkyKey = keyof typeof SKIES
/** 一天里没有太阳辐射时的“基准”气温（℃，示意） */
export const T_BASE = 18
/** 白天最高气温：基准 + 地面吸收的份数 × 0.2 ℃（示意） */
export const dayMax = (sky: SkyKey) => T_BASE + SKIES[sky].ground * 0.2
/** 夜里最低气温：大气逆辐射还回来得越多，降得越少（示意）。counter 是逆辐射还回的比例 */
export const nightMinOf = (counter: number) => T_BASE - 20 * (1 - counter)
export const nightMin = (sky: SkyKey) => nightMinOf(SKIES[sky].counter)
/** 昼夜温差 */
export const dayRange = (sky: SkyKey) => r1(dayMax(sky) - nightMin(sky))
/** 塑料大棚：棚膜让太阳短波辐射进来，挡住棚里地面的长波辐射，还回的比例约 0.9（示意） */
export const FILM_COUNTER = 0.9
export const houseMin = () => nightMinOf(FILM_COUNTER)

// ---------- 第 4 课 热力环流 ----------
/** 高度 z（m）处的气压（hPa）：气柱平均气温 tC（℃），地面气压 ps（hPa）。压高公式 p = ps·e^(−gz/RT) */
export const pAt = (ps: number, tC: number, z: number) => ps * Math.exp(-G * z / (R_AIR * (tC + K0)))
/** 气压为 p 的等压面离地多高（m） */
export const isoZ = (ps: number, tC: number, p: number) => R_AIR * (tC + K0) / G * Math.log(ps / p)
/** 热力环流的三处：A 受热，B、C 冷却。heated 为 false 时三处一样 */
export const CIRC = { t0: 20, dA: 6, dB: -2, p0: 1013, psA: 1011, psB: 1014, zUp: 1500 }
export function columns(heated: boolean) {
  const c = CIRC
  const A = heated ? { t: c.t0 + c.dA, ps: c.psA } : { t: c.t0, ps: c.p0 }
  const B = heated ? { t: c.t0 + c.dB, ps: c.psB } : { t: c.t0, ps: c.p0 }
  return { A: { ...A, up: pAt(A.ps, A.t, c.zUp) }, B: { ...B, up: pAt(B.ps, B.t, c.zUp) } }
}
/** 画面里的两张等压面：近地面一张、高空一张（hPa） */
export const ISO_LOW = 1012.5, ISO_UP = 851
/** 一张等压面在 A、B 两处离地的高度（m） */
export function isoHeights(heated: boolean, p: number) {
  const k = columns(heated)
  return { A: isoZ(k.A.ps, k.A.t, p), B: isoZ(k.B.ps, k.B.t, p) }
}

// ---------- 第 5、6 课 大气的水平运动 ----------
/** 示意的天气图：等压线每隔 4 hPa 一条，相邻两条相距 500 km；城市在北纬 30° */
export const MAP = { dp: 4, dn: 500e3, lat: 30, omega: 7.292e-5 }
/** 地转偏向参数 f = 2Ω sinφ（1/s） */
export const coriolisF = (lat = MAP.lat) => 2 * MAP.omega * Math.sin(lat * Math.PI / 180)
/** 水平气压梯度力（每千克空气，N/kg）：(1/ρ)·Δp/Δn */
export const pgf = (rho: number) => (MAP.dp * 100) / MAP.dn / rho
/** 受力的几种情形：只有水平气压梯度力；高空（不计摩擦）；近地面海面、陆地（摩擦系数取 k/f 的比值，示意） */
export const CASES = {
  pgfOnly: { name: '只有气压梯度力', rho: 0.9, cor: 0, fr: 0 },
  north: { name: '北半球高空', rho: 0.9, cor: 1, fr: 0 },
  south: { name: '南半球高空', rho: 0.9, cor: -1, fr: 0 },
  sea: { name: '海面上', rho: 1.2, cor: 1, fr: 0.4 },
  land: { name: '陆地上', rho: 1.2, cor: 1, fr: 0.9 },
} as const
export type CaseKey = keyof typeof CASES
/**
 * 稳定以后的风：风向和水平气压梯度力的夹角 θ（度，北半球往右偏为正），和等压线的夹角 α = 90° − |θ|，风速 v（m/s）。
 * 三力平衡：气压梯度力 = 地转偏向力（f v，垂直于风）+ 摩擦力（k v，和风相反） ⇒ tan α = k/f，v = P / √(f² + k²)。
 * 只有气压梯度力时没有稳定的风，风沿力的方向越吹越快：返回 θ = 0、v 为 null。
 */
export function steadyWind(c: CaseKey) {
  const C = CASES[c], f = coriolisF(), P = pgf(C.rho)
  if (!C.cor) return { theta: 0, cross: 90, v: null as number | null, P }
  const k = C.fr * f, alpha = Math.atan(C.fr) * 180 / Math.PI
  return { theta: C.cor * (90 - alpha), cross: alpha, v: P / Math.hypot(f, k), P }
}
/** 第 t 秒（画面里的时间）风转到哪：从顺着气压梯度力的方向逐渐转到稳定的方向（示意：转动按指数趋近） */
export const TAU = 1.6
export function windAt(c: CaseKey, t: number) {
  const s = steadyWind(c), k = 1 - Math.exp(-Math.max(0, t) / TAU)
  return { theta: s.theta * k, speed: s.v === null ? Math.min(1.6, 0.25 + t * 0.32) : 1 * Math.min(1, 0.15 + k) }
}
/** 一团空气走过的路线：画面坐标里的点（x 向东、y 向北），气压梯度力指向北。dt 0.05 s，共 n 步 */
export function parcelPath(c: CaseKey, n = 160, dt = 0.05, scale = 2.2) {
  const pts: [number, number][] = [[0, 0]]; let x = 0, y = 0
  for (let i = 1; i <= n; i++) {
    const w = windAt(c, i * dt), a = w.theta * Math.PI / 180
    x += Math.sin(a) * w.speed * dt * scale; y += Math.cos(a) * w.speed * dt * scale
    pts.push([x, y])
  }
  return pts
}
/** 风从哪个方向吹来：画面里风吹向的方向 θ（度，从北顺时针），返回十六方位的名称 */
const DIR16 = ['北', '北东北', '东北', '东北偏东', '东', '东南偏东', '东南', '东南偏南', '南', '西南偏南', '西南', '西南偏西', '西', '西北偏西', '西北', '西北偏北']
const DIR16_FIX: Record<string, string> = { 北东北: '东北偏北' }
export function windName(toward: number) {
  const from = ((toward + 180) % 360 + 360) % 360, n = DIR16[Math.round(from / 22.5) % 16]
  return (DIR16_FIX[n] ?? n) + '风'
}

// ---------- 第 7 课 生活中的热力环流 ----------
/** 三处的地面气温（℃，示意）：白天、夜晚。warm 是近地面气温较高、气压较低的一侧 */
export const PLACES = {
  coast: { name: '海陆风', a: '陆地', b: '海面', day: [30, 24], night: [18, 22] },
  valley: { name: '山谷风', a: '山坡', b: '山谷上空同高度', day: [26, 22], night: [12, 16] },
  city: { name: '城市热岛', a: '城区', b: '郊区', day: [31, 28], night: [26, 21] },
} as const
export type PlaceKey = keyof typeof PLACES
/** 近地面的风：总是从气温低、气压高的一侧吹向气温高、气压低的一侧 */
export function breeze(place: PlaceKey, day: boolean) {
  const P = PLACES[place], [ta, tb] = day ? P.day : P.night
  const toA = ta > tb   // 近地面风吹向 a 一侧
  const name = place === 'coast' ? (toA ? '海风' : '陆风') : place === 'valley' ? (toA ? '谷风' : '山风') : '城市风'
  return { ta, tb, toA, diff: r1(Math.abs(ta - tb)), name }
}

// ---------- 拓展课 城市热岛和工厂 ----------
/** 城市热岛环流的范围：近地面从郊区吹向城区的风，伸到离市中心约 R 远（示意，画面里的距离） */
export const ISLAND_R = 36
export const SITES = { near: { name: '近郊', d: 27 }, far: { name: '远郊', d: 58 } } as const
export type SiteKey = keyof typeof SITES
/** 工厂的烟会不会被城市风带回城里 */
export const smokeToCity = (site: SiteKey) => SITES[site].d < ISLAND_R
/**
 * 城市热岛环流的风场（示意，画面单位/秒）：d 是离市中心的东西距离（东为正），y 是高度。
 * 近地面吹向市中心，市中心上空上升，高空向外流，在离市中心约 R 处下沉；R 以外只有一点偏西的背景风（吹向东）。
 */
export function islandWind(d: number, y: number): [number, number] {
  const ad = Math.abs(d), s = Math.sign(d) || 1
  if (ad > ISLAND_R + 6) return [0.6, 0]
  const low = y < 9 ? 1 : y < 14 ? (14 - y) / 5 : 0, high = y > 18 ? 1 : y > 13 ? (y - 13) / 5 : 0
  let vx = -s * 2.6 * low * Math.min(1, ad / 4) + s * 1.6 * high
  let vy = 0
  if (ad < 10) vy = 1.4
  else if (ad > ISLAND_R - 13 && ad < ISLAND_R + 3) vy = -1.3
  if (ad > ISLAND_R) vx *= Math.max(0, 1 - (ad - ISLAND_R) / 6)
  return [vx, vy]
}
