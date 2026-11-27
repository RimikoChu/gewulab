// 地球和经纬网实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 长度用 km（地球）和 m（船上的东西）；角度用度。取值约定写在规格卡 docs/specs/globe.md 里。
const RAD = Math.PI / 180

/** 地球平均半径（km） */
export const R_EARTH = 6371
/** 地球直径（km） */
export const D_EARTH = 2 * R_EARTH
/** 地轴和地面的夹角（°）：地球仪上就这样斜着装 */
export const AXIS_TO_GROUND = 66.5
/** 船上那只大地球仪的直径（m） */
export const GLOBE_D = 1.2742

// ---------- 写法 ----------
/** 纬度的写法：北纬 30°、南纬 30°、赤道 0° */
export const latText = (lat: number) => lat === 0 ? '0°' : `${lat > 0 ? '北纬' : '南纬'} ${fmt(Math.abs(lat))}°`
/** 经度的写法：东经 120°、西经 60°、0°、180° */
export const lonText = (lon: number) => { const a = Math.abs(norm(lon)); return a === 0 || a === 180 ? `${a}°` : `${norm(lon) > 0 ? '东经' : '西经'} ${fmt(a)}°` }
/** 简写：30°N、120°E */
export const latShort = (lat: number) => lat === 0 ? '0°' : `${fmt(Math.abs(lat))}°${lat > 0 ? 'N' : 'S'}`
export const lonShort = (lon: number) => { const a = Math.abs(norm(lon)); return a === 0 || a === 180 ? `${a}°` : `${fmt(a)}°${norm(lon) > 0 ? 'E' : 'W'}` }
const fmt = (x: number) => Number.isInteger(x) ? String(x) : x.toFixed(1)
/** 经度归到 (-180, 180]，东经为正 */
export const norm = (lon: number) => { const x = ((lon % 360) + 540) % 360 - 180; return x === -180 ? 180 : x }
/** 长度换成“万 km”，两位小数 */
export const wan = (km: number) => (km / 1e4).toFixed(2)

// ---------- 第 1 课：远处的船先露桅杆 ----------
/** 示意的海面半径（m）：真实地球太大，几百米里看不出弯，画面里把弯曲放大了 */
export const SEA_R = 2000
/** 观察的高度（m）：站在船头高处 */
export const EYE = 30
/** 货轮最高处（桅杆顶）离水面的高度（m） */
export const SHIP_TOP = 52
/** 货轮停的三个位置（m，离观察者的距离） */
export const SHIP_STOPS = [570, 470, 330] as const
/** 海平线离观察者多远（m） */
export const horizon = (R = SEA_R, h = EYE) => Math.sqrt(2 * R * h)
/** 远处的东西被海面挡住的高度（m）；海面是平的就挡不住 */
export const hiddenHeight = (d: number, flat = false, R = SEA_R, h = EYE) => { if (flat) return 0; const x = d - horizon(R, h); return x > 0 ? (x * x) / (2 * R) : 0 }
/** 弯的海面上，离船中心水平距离 x 处的海面比船边低多少（m）、海面倾斜多少（弧度）：画货轮的位置用 */
export const seaDrop = (x: number, R = SEA_R) => ({ dy: R - Math.sqrt(R * R - x * x), tilt: Math.asin(x / R) })
/** 露出海面的部分占全船高度的百分比 */
export const visiblePct = (d: number, flat = false) => Math.max(0, Math.min(100, (1 - hiddenHeight(d, flat) / SHIP_TOP) * 100))

// ---------- 第 2 课：地球仪 ----------
/** 赤道周长（km） */
export const equatorLength = () => 2 * Math.PI * R_EARTH
/** 地球仪的比例尺分母：地球直径 ÷ 地球仪直径 */
export const globeScale = (d = GLOBE_D) => (D_EARTH * 1000) / d

// ---------- 第 3 课：纬线 ----------
/** 一条纬线的长度（km） */
export const parallelLength = (lat: number) => Math.max(0, 2 * Math.PI * R_EARTH * Math.cos(lat * RAD))
export const PARALLELS = [0, 30, 60, -30, 90] as const

// ---------- 第 4 课：经线 ----------
/** 一条经线的长度（km）：半个大圆 */
export const meridianLength = () => Math.PI * R_EARTH
export const MERIDIANS = [0, 120, -60, 180] as const

// ---------- 第 5 课：电子海图上的定位 ----------
/** 海图的范围：20°S–20°N，160°E 向东跨过 180° 到 160°W */
export const CHART = { lat: [-20, 20] as [number, number], lon: [160, -160] as [number, number] }
export const CHART_POINTS = { A: { lat: 10, lon: 170 }, B: { lat: 10, lon: -170 }, C: { lat: -10, lon: 170 }, D: { lat: -10, lon: -170 } } as const
export type PointKey = keyof typeof CHART_POINTS
/** 三站：卫星定位屏上显示的船位 */
export const STOPS: { lat: number; lon: number }[] = [{ lat: 10, lon: 170 }, { lat: -10, lon: -170 }, { lat: 10, lon: -170 }]
/** 一个经纬度对应海图上的哪个点；对不上就是 null */
export const pointAt = (lat: number, lon: number): PointKey | null => (Object.keys(CHART_POINTS) as PointKey[]).find(k => CHART_POINTS[k].lat === lat && norm(CHART_POINTS[k].lon) === norm(lon)) ?? null
/** 海图上从西往东量，一个经度离左边缘多少度（跨过 180° 也连续） */
export const eastOf = (lon: number, from: number) => ((norm(lon) - norm(from)) % 360 + 360) % 360

// ---------- 第 6 课：半球 ----------
export type Split = 'eq' | 'zero' | 'std'
export const CITIES = {
  beijing: { name: '北京', lat: 40, lon: 116 },
  london: { name: '伦敦', lat: 51.5, lon: 0 },
  newyork: { name: '纽约', lat: 40.7, lon: -74 },
  sydney: { name: '悉尼', lat: -33.9, lon: 151.2 },
} as const
export type CityKey = keyof typeof CITIES
export const hemiNS = (lat: number) => lat > 0 ? '北半球' : lat < 0 ? '南半球' : '赤道上'
/** 东西半球：std 用 20°W 和 160°E 分；zero 用 0° 和 180° 分 */
export const hemiEW = (lon: number, split: 'zero' | 'std' = 'std') => {
  const x = norm(lon)
  if (split === 'zero') return x >= 0 && x < 180 ? '东半球' : '西半球'
  return x >= -20 && x < 160 ? '东半球' : '西半球'
}
/** 一座城市在某种分法下落在哪个半球 */
export const hemiOf = (c: CityKey, s: Split) => s === 'eq' ? hemiNS(CITIES[c].lat) : hemiEW(CITIES[c].lon, s)
/** 分界线所在的经度：东半球正中的那条经线（画面用它摆分界面） */
export const eastCenter = (s: 'zero' | 'std') => s === 'zero' ? 90 : 70

// ---------- 第 7 课：方向 ----------
export type Dir = '正北' | '正南' | '正东' | '正西' | '东北' | '西北' | '东南' | '西南' | '同一点'
/** 乙在甲的哪个方向：纬度差定南北，经度差（取不超过 180° 的那一边）定东西 */
export function direction(a: { lat: number; lon: number }, b: { lat: number; lon: number }): Dir {
  const dLat = b.lat - a.lat, dLon = norm(b.lon - a.lon)
  const ns = dLat > 0 ? '北' : dLat < 0 ? '南' : '', ew = dLon > 0 && dLon < 180 ? '东' : dLon < 0 ? '西' : ''
  if (!ns && !ew) return '同一点'
  if (!ns) return `正${ew}` as Dir
  if (!ew) return `正${ns}` as Dir
  return `${ew}${ns}` as Dir
}
export const PAPER = { lat: [10, 50] as [number, number], lon: [110, 150] as [number, number] }
export const START = { lat: 20, lon: 120 }
export const GOALS = [{ id: 'jia', name: '甲', lat: 40, lon: 120 }, { id: 'yi', name: '乙', lat: 20, lon: 140 }, { id: 'bing', name: '丙', lat: 40, lon: 140 }] as const
export const DIR_OPTIONS: Dir[] = ['正北', '正东', '东北', '西南']

// ---------- 拓展 1：六分仪量纬度 ----------
/** 北极星的高度角（°）：约等于当地纬度；南半球看不到 */
export const polarisAltitude = (lat: number) => Math.max(0, lat)
export const SEXTANT_LATS = [0, 18, 40] as const

// ---------- 拓展 2：经度一度有多长 ----------
/** 沿经线走 dLat 度、或沿纬线（在 lat 上）走 dLon 度的距离（km） */
export const arcLength = (deg: number, alongParallelAt: number | null = null) => (Math.PI * R_EARTH / 180) * deg * (alongParallelAt === null ? 1 : Math.cos(alongParallelAt * RAD))
export const ROUTES = {
  meridian: { name: '沿经线向北', from: { lat: 0, lon: 120 }, to: { lat: 10, lon: 120 }, km: () => arcLength(10) },
  equator: { name: '赤道上向东', from: { lat: 0, lon: 120 }, to: { lat: 0, lon: 130 }, km: () => arcLength(10, 0) },
  north60: { name: '60°N 上向东', from: { lat: 60, lon: 120 }, to: { lat: 60, lon: 130 }, km: () => arcLength(10, 60) },
} as const
export type RouteKey = keyof typeof ROUTES
