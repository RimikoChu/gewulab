// 大气环流实验室的计算核心。画面、读数、任务判定都从这里取数，界面和场景文件里不做计算。
// 很多量是“示意”：为了看得清做了简化（气压场用几条高斯带和几个高低压中心叠成，风按气压梯度再按纬度偏转），
// 界面上标“约”或“示意”，规格卡 docs/specs/circulation.md 里写明。经度东经为正、纬度北纬为正，单位都是度。
const RAD = Math.PI / 180
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x))
const r1 = (x: number) => Math.round(x * 10) / 10

/** 黄赤交角（度），教材 23°26′ */
export const TILT = 23.4
/** 地球自转角速度（rad/s）、地球半径（m） */
export const OMEGA = 7.292e-5, EARTH_A = 6.371e6

// ---------- 太阳直射点和季节 ----------
/** 二分二至：日序（一年中的第几天）和日期 */
export const TERMS = [
  { key: 'mar', name: '春分', date: '3月21日前后', day: 80 },
  { key: 'jun', name: '夏至', date: '6月22日前后', day: 173 },
  { key: 'sep', name: '秋分', date: '9月23日前后', day: 266 },
  { key: 'dec', name: '冬至', date: '12月22日前后', day: 356 },
] as const
export type TermKey = (typeof TERMS)[number]['key']
export const YEAR = 365
/** 第 day 天太阳直射点的纬度（度）：按正弦变化，春分 0°、夏至北回归线、冬至南回归线（示意，不计近日点带来的不对称） */
export const subsolarLat = (day: number) => r1(TILT * Math.sin(2 * Math.PI * (day - 80) / YEAR))
/** 不取整的直射点纬度（画面连续移动用） */
export const subsolarRaw = (day: number) => TILT * Math.sin(2 * Math.PI * (day - 80) / YEAR)
/** 最接近的节气（相差两天以内），没有就是 null */
export function nearTerm(day: number) {
  const d = ((day % YEAR) + YEAR) % YEAR
  return TERMS.find(t => Math.min(Math.abs(d - t.day), YEAR - Math.abs(d - t.day)) < 2) ?? null
}
/** 各月中旬的日序 */
export const MONTH_DAY = [15, 46, 74, 105, 135, 166, 196, 227, 258, 288, 319, 349]
export const monthOf = (day: number) => { const d = ((day % YEAR) + YEAR) % YEAR; let m = 0; for (let i = 0; i < 12; i++) if (d >= MONTH_DAY[i] - 15) m = i; return m + 1 }

/** 气压带、风带随直射点移动的最大幅度（度，示意）：直射点到回归线时移动约 5° */
export const SHIFT_MAX = 5
/** 直射点在 sunLat 时，气压带、风带整体移动多少度（北移为正） */
export const beltShift = (sunLat: number) => SHIFT_MAX * sunLat / TILT

// ---------- 七个气压带、六个风带 ----------
export type BeltKind = 'low' | 'high'
/** 七个气压带：基本位置（直射点在赤道时）、高低、成因 */
export const BELTS = [
  { key: 'polarN', name: '极地高气压带', lat: 90, kind: 'high', why: '极地气温低，空气冷却下沉', cause: '热力' },
  { key: 'splN', name: '副极地低气压带', lat: 60, kind: 'low', why: '来自极地的冷空气和来自副热带的暖空气相遇，暖空气被抬升', cause: '动力' },
  { key: 'sthN', name: '副热带高气压带', lat: 30, kind: 'high', why: '高空气流向右偏成西风，在 30° 附近堆积下沉', cause: '动力' },
  { key: 'eq', name: '赤道低气压带', lat: 0, kind: 'low', why: '赤道终年受热多，空气膨胀上升', cause: '热力' },
  { key: 'sthS', name: '副热带高气压带', lat: -30, kind: 'high', why: '高空气流向左偏成西风，在 30° 附近堆积下沉', cause: '动力' },
  { key: 'splS', name: '副极地低气压带', lat: -60, kind: 'low', why: '冷暖空气相遇，暖空气被抬升', cause: '动力' },
  { key: 'polarS', name: '极地高气压带', lat: -90, kind: 'high', why: '极地气温低，空气冷却下沉', cause: '热力' },
] as const
export type BeltKey = (typeof BELTS)[number]['key']
/** 六个风带：所在的纬度范围（基本位置）和风向 */
export const WINDS = [
  { key: 'polarEN', name: '极地东风带', from: 60, to: 90, dir: '东北风' },
  { key: 'westN', name: '西风带', from: 30, to: 60, dir: '西南风' },
  { key: 'tradeN', name: '东北信风带', from: 0, to: 30, dir: '东北风' },
  { key: 'tradeS', name: '东南信风带', from: -30, to: 0, dir: '东南风' },
  { key: 'westS', name: '西风带', from: -60, to: -30, dir: '西北风' },
  { key: 'polarES', name: '极地东风带', from: -90, to: -60, dir: '东南风' },
] as const
export type WindKey = (typeof WINDS)[number]['key']
/** 直射点在 sunLat 时，一个气压带的中心纬度（两极的高压不动） */
export const beltLat = (key: BeltKey, sunLat = 0) => { const b = BELTS.find(x => x.key === key)!; return Math.abs(b.lat) === 90 ? b.lat : r1(b.lat + beltShift(sunLat)) }

// ---------- 气压场（示意） ----------
/**
 * 一个状态下的大气：
 * k 0 → 1：从单圈环流（地球不自转）过渡到三圈环流（加上地转偏向力）；
 * sunLat：直射点纬度，气压带随它移动；
 * centers：叠上海陆热力差异形成的高低压中心（1 月、7 月）；amt 是它们的分量 0–1。
 */
export interface Air { k: number; sunLat: number; centers?: Month | null; amt?: number }
export type Month = 'jan' | 'jul'
/** 1 月、7 月北半球海平面上的高低压中心（位置是示意的大致位置，强弱是示意的相对值） */
export const CENTERS: Record<Month, { key: string; name: string; lon: number; lat: number; p: number; r: number; on: 'land' | 'sea'; named: boolean }[]> = {
  jan: [
    { key: 'asiaH', name: '亚洲高压', lon: 98, lat: 46, p: 1.0, r: 18, on: 'land', named: true },
    { key: 'naH', name: '北美高压', lon: -105, lat: 50, p: 0.55, r: 14, on: 'land', named: true },
    { key: 'aleutL', name: '阿留申低压', lon: 178, lat: 52, p: -0.85, r: 15, on: 'sea', named: true },
    { key: 'iceL', name: '冰岛低压', lon: -28, lat: 62, p: -0.75, r: 13, on: 'sea', named: true },
  ],
  jul: [
    { key: 'asiaL', name: '亚洲低压', lon: 75, lat: 31, p: -1.0, r: 24, on: 'land', named: true },
    { key: 'hawH', name: '夏威夷高压', lon: -150, lat: 34, p: 0.85, r: 22, on: 'sea', named: true },
    { key: 'wpH', name: '', lon: 145, lat: 28, p: 0.6, r: 15, on: 'sea', named: false },
    { key: 'azoH', name: '亚速尔高压', lon: -35, lat: 35, p: 0.8, r: 16, on: 'sea', named: true },
    { key: 'naL', name: '', lon: -105, lat: 38, p: -0.35, r: 12, on: 'land', named: false },
  ],
}
const gauss = (d: number, s: number) => Math.exp(-(d * d) / (2 * s * s))
/** 两个经度相差多少度（−180–180） */
const dLon = (a: number, b: number) => ((a - b + 540) % 360) - 180
/** 球面上两点的角距离（度） */
export function arcDeg(lon1: number, lat1: number, lon2: number, lat2: number) {
  const p1 = lat1 * RAD, p2 = lat2 * RAD, dl = (lon2 - lon1) * RAD
  const c = Math.sin(p1) * Math.sin(p2) + Math.cos(p1) * Math.cos(p2) * Math.cos(dl)
  return Math.acos(clamp(c, -1, 1)) / RAD
}
/** 单圈环流的近地面气压：赤道低、两极高（−1–1） */
const single = (lat: number) => -Math.cos(2 * lat * RAD)
/** 三圈环流的近地面气压：七条高斯带（−1–1），中纬三条随直射点移动 */
const SIGMA = 10
function three(lat: number, sunLat: number) {
  const s = beltShift(sunLat)
  let p = 0
  for (const b of BELTS) { const c = Math.abs(b.lat) === 90 ? b.lat : b.lat + s; p += (b.kind === 'high' ? 1 : -1) * gauss(lat - c, SIGMA) }
  return p
}
/** 近地面的气压（示意的相对值，正为高压、负为低压） */
export function pressure(lon: number, lat: number, a: Air) {
  let p = (1 - a.k) * single(lat) + a.k * three(lat, a.sunLat)
  const amt = a.centers ? a.amt ?? 1 : 0
  if (amt > 0 && a.centers) {
    // 中心形成以后，带状分布被切断：离中心越近，原来的带剩得越少
    let near = 0, add = 0
    for (const c of CENTERS[a.centers]) { const d = arcDeg(lon, lat, c.lon, c.lat); near = Math.max(near, gauss(d, c.r * 1.3)); add += c.p * gauss(d, c.r) }
    p = p * (1 - amt * (0.35 + 0.6 * near)) + amt * add
  }
  return p
}

// ---------- 近地面的风（示意） ----------
/** 近地面风和水平气压梯度力的最大夹角（度）：北半球向右、南半球向左偏，赤道上为 0（地转偏向力随纬度增大） */
export const TURN_MAX = 55
/** 纬度 lat 处风向偏离气压梯度力的角度（度，北半球为正 = 向右）；k 是自转的分量 */
export const turnAt = (lat: number, k = 1) => k * TURN_MAX * Math.sin(clamp(Math.abs(lat) * 3, 0, 90) * RAD) * Math.sign(lat)
/**
 * 近地面的风：先取水平气压梯度力（从高压指向低压），再按纬度偏转。返回 [向东分量, 向北分量]，大小已归一到 0–1 附近。
 */
export function surfaceWind(lon: number, lat: number, a: Air): [number, number] {
  const h = 0.5, la = clamp(lat, -89, 89), cl = Math.max(0.05, Math.cos(la * RAD))
  const dpdn = (pressure(lon, la + h, a) - pressure(lon, la - h, a)) / (2 * h)
  const dpde = (pressure(lon + h / cl, la, a) - pressure(lon - h / cl, la, a)) / (2 * h)
  const e = -dpde * 12, n = -dpdn * 12                       // 气压梯度力：指向气压低的一侧
  const t = turnAt(la, a.k) * RAD, c = Math.cos(t), s = Math.sin(t)
  return [e * c + n * s, -e * s + n * c]                     // 顺时针转 t（北半球向右）
}
const DIR8 = ['北', '东北', '东', '东南', '南', '西南', '西', '西北']
/** 风向：风从哪个方向吹来（八个方位） */
export function windName([e, n]: [number, number]) {
  const toward = Math.atan2(e, n) / RAD, from = ((toward + 180) % 360 + 360) % 360
  return DIR8[Math.round(from / 45) % 8] + '风'
}
/** 风从哪个方位角吹来（度，从北顺时针） */
export const windFrom = ([e, n]: [number, number]) => ((Math.atan2(e, n) / RAD + 180) % 360 + 360) % 360
/** 某处近地面的风向名称 */
export const windAtName = (lon: number, lat: number, a: Air) => windName(surfaceWind(lon, lat, a))

// ---------- 第 1、2 课 单圈环流到三圈环流 ----------
/** 三个环流圈：纬度范围和名称（北半球；南半球对称） */
export const CELLS = [
  { key: 'low', name: '低纬环流', from: 0, to: 30, upAt: 0 },
  { key: 'mid', name: '中纬环流', from: 30, to: 60, upAt: 60 },
  { key: 'high', name: '高纬环流', from: 60, to: 90, upAt: 60 },
] as const
/** 单圈环流时近地面各处的高低：受热的赤道上升成低压，冷却的极地下沉成高压 */
export const singleKind = (lat: number): BeltKind => (Math.abs(lat) < 45 ? 'low' : 'high')
/** 示意：赤道高空向北流的气流的南北向速度（m/s） */
export const UPPER_V = 20
/**
 * 赤道高空向极地流去的气流，到纬度 lat 时风向偏离正北多少度（示意）。
 * 按绕地轴的角动量守恒：东西向速度 u = Ωa·sin²φ / cosφ，南北向速度取 UPPER_V，偏向角 = arctan(u / v)。
 */
export function upperHeading(lat: number) {
  const p = Math.abs(lat) * RAD, u = OMEGA * EARTH_A * Math.sin(p) ** 2 / Math.cos(p)
  return Math.atan2(u, UPPER_V) / RAD
}
/** 这股气流从赤道走到纬度 lat 时，往东偏过去多少经度（度）：dλ/dφ = u / (v·cosφ)，积分得 (Ωa/v)(tanφ − φ) */
export const upperDrift = (lat: number) => { const p = Math.abs(lat) * RAD; return (OMEGA * EARTH_A / UPPER_V) * (Math.tan(p) - p) / RAD }

// ---------- 第 5 课 气压带、风带对气候的影响 ----------
/** 气压带的半宽（度，示意）：离中心这么近就算受这个气压带控制。赤道低压宽一些 */
export const HALF = { eq: 9, other: 5 }
export type Ctrl = 'eq' | 'sthN' | 'sthS' | 'splN' | 'splS' | 'polarN' | 'polarS' | WindKey
export const CTRL_NAME: Record<Ctrl, string> = {
  eq: '赤道低气压带', sthN: '副热带高气压带', sthS: '副热带高气压带', splN: '副极地低气压带', splS: '副极地低气压带', polarN: '极地高气压带', polarS: '极地高气压带',
  polarEN: '极地东风带', westN: '西风带', tradeN: '东北信风带', tradeS: '东南信风带', westS: '西风带', polarES: '极地东风带',
}
/** 受它控制时多雨还是少雨（示意：低压带上升气流多雨；高压带下沉气流少雨；西风从海洋上吹来多雨；信风、极地东风多来自干冷的陆地或高纬，按少雨算） */
export const CTRL_WET: Record<Ctrl, boolean> = { eq: true, splN: true, splS: true, westN: true, westS: true, sthN: false, sthS: false, polarN: false, polarS: false, tradeN: false, tradeS: false, polarEN: false, polarES: false }
/** 纬度 lat 处、第 day 天受哪个气压带或风带控制 */
export function controlAt(lat: number, day: number): Ctrl {
  const s = beltShift(subsolarRaw(day))
  if (Math.abs(lat - s) <= HALF.eq) return 'eq'
  const n = lat > s, m = n ? 1 : -1
  const sth = m * 30 + s, spl = m * 60 + s
  if (Math.abs(lat - sth) <= HALF.other) return n ? 'sthN' : 'sthS'
  if (Math.abs(lat - spl) <= HALF.other) return n ? 'splN' : 'splS'
  if ((n ? lat : -lat) >= 85) return n ? 'polarN' : 'polarS'
  if (n) return lat < sth ? 'tradeN' : lat < spl ? 'westN' : 'polarEN'
  return lat > sth ? 'tradeS' : lat > spl ? 'westS' : 'polarES'
}
/** 三个地方 */
export const PLACES = {
  athens: { name: '雅典', lon: 23.7, lat: 38.0, climate: '地中海气候' },
  singapore: { name: '新加坡', lon: 103.8, lat: 1.3, climate: '热带雨林气候' },
  darwin: { name: '达尔文', lon: 130.8, lat: -12.5, climate: '热带草原气候' },
} as const
export type PlaceKey = keyof typeof PLACES
/** 一个地方十二个月各受谁控制、多雨还是少雨 */
export const yearOf = (p: PlaceKey) => MONTH_DAY.map(d => { const c = controlAt(PLACES[p].lat, d); return { c, wet: CTRL_WET[c] } })

// ---------- 第 6 课 海陆热力性质差异 ----------
/** 1 月：陆地比同纬度的海洋冷；7 月：陆地比海洋热。返回陆地相对海洋的冷暖（−1 冷、+1 热） */
export const landVsSea = (m: Month) => (m === 'jan' ? -1 : 1)
/** 某个月北半球被切断的是哪一个气压带 */
export const brokenBelt = (m: Month): BeltKey => (m === 'jan' ? 'splN' : 'sthN')
/** 季节 → 那个月中旬的日序 */
export const MONTH_OF: Record<Month, number> = { jan: MONTH_DAY[0], jul: MONTH_DAY[6] }
/** 1 月、7 月的完整大气（三圈环流 + 季节移动 + 高低压中心） */
export const airOf = (m: Month, amt = 1): Air => ({ k: 1, sunLat: subsolarRaw(MONTH_OF[m]), centers: m, amt })

// ---------- 第 7 课 季风 ----------
/** 看风向的两座城市 */
export const CITIES = {
  shanghai: { name: '上海', lon: 121.5, lat: 31.2, region: '东亚' },
  mumbai: { name: '孟买', lon: 72.9, lat: 19.1, region: '南亚' },
} as const
export type CityKey = keyof typeof CITIES
/** 某个月一座城市的风向 */
export const monsoonAt = (city: CityKey, m: Month) => windAtName(CITIES[city].lon, CITIES[city].lat, airOf(m))
/**
 * 一团空气在近地面随风走的路线：每步沿风向走 step 度，共 n 步。返回 [经度, 纬度] 的点列。
 * 用来画“南半球的东南信风越过赤道，向右偏成西南风”这类路线。
 */
export function trace(lon: number, lat: number, a: Air, n = 90, step = 0.6): [number, number][] {
  const out: [number, number][] = [[lon, lat]]; let x = lon, y = lat
  for (let i = 0; i < n; i++) {
    const [e, nn] = surfaceWind(x, y, a), m = Math.hypot(e, nn)
    if (m < 1e-4) break
    y += (nn / m) * step; x += (e / m) * step / Math.max(0.1, Math.cos(y * RAD))
    out.push([x, y])
  }
  return out
}

// ---------- 拓展课 ----------
/** 上海浦东、旧金山两座机场 */
export const AIRPORTS = { pvg: { name: '上海', lon: 121.8, lat: 31.1 }, sfo: { name: '旧金山', lon: -122.4, lat: 37.6 } } as const
/** 大圆航线的长度（km） */
export const routeKm = () => Math.round(arcDeg(AIRPORTS.pvg.lon, AIRPORTS.pvg.lat, AIRPORTS.sfo.lon, AIRPORTS.sfo.lat) * RAD * EARTH_A / 1000)
/** 客机的巡航空速（km/h）和沿航线平均的西风风速（km/h，示意） */
export const FLY = { air: 900, west: 100 }
/** 飞完全程要多少小时：往东顺着西风，地速 = 空速 + 风速；往西逆风，地速 = 空速 − 风速 */
export const flightHours = (east: boolean) => r1(routeKm() / (FLY.air + (east ? 1 : -1) * FLY.west))
/** 大圆航线上的点：t 从 0（上海）到 1（旧金山） */
export function routeAt(t: number): [number, number] {
  const a = AIRPORTS.pvg, b = AIRPORTS.sfo
  const v = (lon: number, lat: number) => [Math.cos(lat * RAD) * Math.cos(lon * RAD), Math.cos(lat * RAD) * Math.sin(lon * RAD), Math.sin(lat * RAD)]
  const p = v(a.lon, a.lat), q = v(b.lon, b.lat), w = arcDeg(a.lon, a.lat, b.lon, b.lat) * RAD
  const s0 = Math.sin((1 - t) * w) / Math.sin(w), s1 = Math.sin(t * w) / Math.sin(w)
  const x = p[0] * s0 + q[0] * s1, y = p[1] * s0 + q[1] * s1, z = p[2] * s0 + q[2] * s1
  return [Math.atan2(y, x) / RAD, Math.atan2(z, Math.hypot(x, y)) / RAD]
}
/** 赤道太平洋：信风强弱和暖水向东伸到哪个经度（示意）。正常年份暖水堆在西边；信风减弱，暖水向东扩展 */
export const TRADES = { normal: { name: '信风正常', east: 165, strength: 1 }, weak: { name: '信风减弱', east: -105, strength: 0.25 } } as const
export type TradeKey = keyof typeof TRADES
/** 暖水在赤道太平洋上从 120°E 向东伸了多少经度 */
export const warmSpan = (t: TradeKey) => ((TRADES[t].east - 120) + 360) % 360

/** 纬度写成 30°N 这样 */
export const fmtLat = (lat: number) => (Math.abs(lat) < 0.05 ? '0°' : `${Math.abs(lat).toFixed(Math.abs(lat) % 1 < 0.05 || Math.abs(lat) % 1 > 0.95 ? 0 : 1)}°${lat > 0 ? 'N' : 'S'}`)
export { dLon }

/** 整个地球的气压网格（经度 −180–180、纬度 −90–90，w × h 格），画气压带用 */
export function pressureGrid(a: Air, w = 180, h = 90) {
  const out = new Float32Array(w * h)
  for (let j = 0; j < h; j++) { const lat = -90 + (j + 0.5) * 180 / h; for (let i = 0; i < w; i++) out[j * w + i] = pressure(-180 + (i + 0.5) * 360 / w, lat, a) }
  return out
}
