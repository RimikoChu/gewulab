// 天气和气候实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 取值约定写在规格卡 docs/specs/climate.md 里。“山前气象站”和身后大山的数都是示意数据。

const r1 = (x: number) => Math.round(x * 10) / 10

// ---------- 山前气象站的多年平均资料（示意） ----------
export const MONTHS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
/** 逐月平均气温（℃） */
export const TEMP = [-4, -1, 6, 14, 20, 25, 27, 25, 20, 13, 5, -2]
/** 逐月降水量（mm） */
export const RAIN = [3, 5, 9, 22, 35, 75, 180, 150, 50, 22, 8, 3]
/** 气象站的海拔（m） */
export const STATION_ALT = 200

export const annual = (r: number[] = RAIN) => r.reduce((a, b) => a + b, 0)
export const annualMeanTemp = (t: number[] = TEMP) => t.reduce((a, b) => a + b, 0) / t.length
/** 最热月：月份序号（0 起）和气温 */
export const hottest = (t: number[] = TEMP) => { const i = t.indexOf(Math.max(...t)); return { i, t: t[i] } }
export const coldest = (t: number[] = TEMP) => { const i = t.indexOf(Math.min(...t)); return { i, t: t[i] } }
/** 气温年较差 = 最热月 − 最冷月 */
export const yearRange = (t: number[] = TEMP) => hottest(t).t - coldest(t).t
/** 雨季：月降水量超过全年平均月降水量 1.5 倍的连续月份（返回第一个和最后一个月的序号） */
export function rainySeason(r: number[] = RAIN): [number, number] {
  const lim = (annual(r) / 12) * 1.5, wet = r.map(x => x > lim)
  const a = wet.indexOf(true), b = wet.lastIndexOf(true)
  return [a, b]
}

// ---------- 第 1 课：天气预报（示意） ----------
export type Wx = 'sun' | 'rain' | 'cloud'
export type DayKey = 'today' | 'tomorrow' | 'after'
export const FORECAST: Record<DayKey, { name: string; wx: Wx; text: string; lo: number; hi: number; wind: string }> = {
  today: { name: '今天', wx: 'sun', text: '晴', lo: 22, hi: 31, wind: '南风 2 级' },
  tomorrow: { name: '明天', wx: 'rain', text: '小雨', lo: 20, hi: 26, wind: '西南风 3 级' },
  after: { name: '后天', wx: 'cloud', text: '多云', lo: 21, hi: 29, wind: '南风 2 级' },
}

// ---------- 第 2 课：气温的日变化（示意） ----------
export const T_MIN = 18, T_MAX = 30, H_MIN = 5, H_MAX = 14
/** 一天里某个时刻的气温：5 时最低、14 时最高，两段余弦接起来 */
export function dayTemp(h: number) {
  const x = ((h % 24) + 24) % 24
  if (x >= H_MIN && x <= H_MAX) return T_MIN + (T_MAX - T_MIN) * (1 - Math.cos(Math.PI * (x - H_MIN) / (H_MAX - H_MIN))) / 2
  const since = (x - H_MAX + 24) % 24   // 14 时以后过了几小时（到次日 5 时共 15 小时）
  return T_MAX - (T_MAX - T_MIN) * (1 - Math.cos(Math.PI * since / (24 - H_MAX + H_MIN))) / 2
}
/** 四个观测时刻 */
export const OBS_HOURS = [2, 8, 14, 20]
/** 温度表的读数，读到 0.1 ℃ */
export const readAt = (h: number) => r1(dayTemp(h))
export const dailyMean = (xs: number[]) => r1(xs.reduce((a, b) => a + b, 0) / xs.length)
export const dailyRange = (max: number, min: number) => r1(max - min)

// ---------- 第 3 课 / 拓展：气温随海拔降低 ----------
/** 每升高 100 m 降多少（℃） */
export const LAPSE = 0.6
/** 从 alt0 处的气温 t0，算 alt 处的气温 */
export const lapse = (t0: number, alt0: number, alt: number) => r1(t0 - LAPSE * (alt - alt0) / 100)
/** 场景里的大山：1 个单位高 = 10 m；地面（y = 0）是海拔 200 m */
export const M_PER_UNIT = 10
export const altAt = (y: number) => STATION_ALT + y * M_PER_UNIT
export const yAt = (alt: number) => (alt - STATION_ALT) / M_PER_UNIT
/** 山上的几处（海拔 m） */
export const MOUNT = { foot: 200, mid: 2700, peak: 4700, pass: 4370, lee: 600 }
/** 第 3 课用 7 月的平均气温 */
export const JULY = TEMP[6]
/** 月平均气温 0 ℃ 的高度（m），示意的“雪线” */
export const snowLine = (tFoot: number, altFoot = STATION_ALT) => Math.round(altFoot + (tFoot / LAPSE) * 100)

// ---------- 第 4 课：雨量器 ----------
/** 承水口直径 20 cm，面积（cm²） */
export const GAUGE_AREA = Math.PI * 10 * 10
/** 专用量杯一次最多量多少（mm） */
export const CUP_MAX = 10
/** 储水瓶里的水（mL）：降水深度 × 承水口面积 */
export const bottleMl = (mm: number) => Math.round((mm / 10) * GAUGE_AREA)
/** 要倒几杯，每杯读多少 */
export function cupsFor(mm: number) {
  const n = Math.max(1, Math.ceil(mm / CUP_MAX - 1e-9)), out: number[] = []
  for (let i = 0; i < n; i++) out.push(r1(Math.min(CUP_MAX, mm - i * CUP_MAX)))
  return out
}
export const RAIN_DAYS = {
  d3: { name: '7 月 3 日', mm: 6.4 },
  d9: { name: '7 月 9 日', mm: 18.0 },
  d21: { name: '7 月 21 日', mm: 52.0 },
} as const
export type RainDay = keyof typeof RAIN_DAYS
export const GRADES: [number, string][] = [[10, '小雨'], [25, '中雨'], [50, '大雨'], [100, '暴雨'], [250, '大暴雨'], [Infinity, '特大暴雨']]
/** 24 小时降水量的等级 */
export const rainGrade = (mm: number) => GRADES.find(([lim]) => mm < lim)![1]

// ---------- 第 5 课 / 拓展：两坡的年降水量（示意） ----------
export const SLOPE_RAIN = { foot: annual(), mid: 1450, lee: 200 }
/** 迎风坡是背风坡的几倍 */
export const SLOPE_RATIO = Math.round(SLOPE_RAIN.mid / SLOPE_RAIN.lee)

// ---------- 地球仪上的气温和降水（简化模型，示意） ----------
/**
 * 气温（℃）。lat 纬度（北正南负），land 这一带陆地占多少（0–1），month 1 或 7。
 * 年平均随纬度降低；冬夏变幅随纬度增大，陆地的变幅比海洋大得多。
 */
export function tempModel(lat: number, land: number, month: 1 | 7) {
  const a = Math.abs(lat)
  const mean = 27 - 0.0072 * a * a - (lat < 0 ? 0.0016 * a * a : 0)
  const amp = (0.06 + 0.3 * land) * a
  const summer = (month === 7) === (lat >= 0) ? 1 : -1
  return mean + summer * amp
}
/**
 * 降水多少（0 很少 – 1 很多）。inland 深入内陆的程度（0–1），west 这一点东边是陆地、西边是海的程度（0–1，大陆西岸），
 * east 大陆东岸的程度。赤道最多，回归线附近少，中纬度又多一些，两极最少。
 */
export function rainModel(lat: number, inland: number, west: number, east: number) {
  const a = Math.abs(lat)
  let p = 0.95 * Math.exp(-((a / 11) ** 2)) + 0.5 * Math.exp(-(((a - 50) / 13) ** 2)) + 0.12
  const sub = Math.exp(-(((a - 24) / 9) ** 2))           // 回归线附近
  p *= 1 - 0.8 * sub * west                               // 西岸更干
  p += 0.55 * sub * east                                  // 东岸多雨
  p *= 1 - 0.72 * inland                                  // 越往内陆越少
  if (a > 66) p *= 0.5
  return Math.min(1, Math.max(0, p))
}
/** 降水多少换成一句话 */
export const rainWord = (p: number) => (p > 0.6 ? '多雨' : p > 0.32 ? '降水中等' : '少雨')

// ---------- 地球仪上的几处 ----------
export type LL = [number, number]
export const PLACES = {
  singapore: { name: '新加坡', at: [103.8, 1.3] as LL },
  sahara: { name: '撒哈拉沙漠西岸', at: [-14.5, 23.5] as LL },
  guangzhou: { name: '广州', at: [113.3, 23.1] as LL },
  shanghai: { name: '上海', at: [121.5, 31.2] as LL },
  urumqi: { name: '乌鲁木齐', at: [87.6, 43.8] as LL },
  haikou: { name: '海口', at: [110.3, 20.0] as LL },
  harbin: { name: '哈尔滨', at: [126.6, 45.8] as LL },
  lhasa: { name: '拉萨', at: [91.1, 29.6] as LL },
  london: { name: '伦敦', at: [-0.1, 51.5] as LL },
}
export type PlaceKey = keyof typeof PLACES
/** 第 5 课看的几处：降水多还是少（教材上的结论） */
export const RAIN_SPOTS: { id: string; places: PlaceKey[]; words: string[]; face: number; note: string }[] = [
  { id: 'eq', places: ['singapore'], words: ['多雨'], face: 100, note: '赤道附近终年多雨' },
  { id: 'west', places: ['sahara', 'guangzhou'], words: ['少雨', '多雨'], face: 50, note: '回归线附近，大陆西岸少雨，东岸多雨' },
  { id: 'inland', places: ['shanghai', 'urumqi'], words: ['多雨', '少雨'], face: 105, note: '沿海多雨，越往内陆越少' },
]

// ---------- 第 7 课：影响气候的因素 ----------
export type Factor = 'lat' | 'sea' | 'land' | 'current'
export const FACTOR_NAMES: Record<Factor, string> = { lat: '纬度位置', sea: '海陆位置', land: '地形地势', current: '洋流' }
export const FACTORS: { id: string; places: PlaceKey[]; tags: string[]; factor: Factor; fact: string; why: string }[] = [
  { id: 'lat', places: ['haikou', 'harbin'], tags: ['冬季温暖', '冬季严寒'], factor: 'lat', fact: '海口冬季温暖，哈尔滨冬季严寒', why: '海口纬度低，得到的太阳光热多；哈尔滨纬度高，得到的少' },
  { id: 'sea', places: ['urumqi'], tags: ['降水少'], factor: 'sea', fact: '乌鲁木齐降水少，冬冷夏热', why: '它深居亚欧大陆内部，离海洋远，海洋上的湿润空气很难到达' },
  { id: 'land', places: ['lhasa'], tags: ['夏季凉爽'], factor: 'land', fact: '拉萨纬度和杭州差不多，夏季却很凉爽', why: '拉萨在青藏高原上，海拔高，气温低' },
  { id: 'current', places: ['london'], tags: ['冬季温和'], factor: 'current', fact: '伦敦纬度比哈尔滨还高，冬季却比较温和', why: '北大西洋暖流从它西边的大洋上流过，带来温暖湿润的空气' },
]

// ---------- 拓展：翻山的四站 ----------
export type StopKey = 'foot' | 'mid' | 'pass' | 'lee'
export const STOPS: Record<StopKey, { name: string; alt: number; rain: number | null; sky: string }> = {
  foot: { name: '迎风坡山脚', alt: MOUNT.foot, rain: SLOPE_RAIN.foot, sky: '多云' },
  mid: { name: '迎风坡山腰', alt: MOUNT.mid, rain: SLOPE_RAIN.mid, sky: '云雾、下雨' },
  pass: { name: '山口', alt: MOUNT.pass, rain: null, sky: '寒冷，风大' },
  lee: { name: '背风坡山脚', alt: MOUNT.lee, rain: SLOPE_RAIN.lee, sky: '晴，干燥' },
}
export const stopTemp = (k: StopKey, tFoot = JULY) => lapse(tFoot, STATION_ALT, STOPS[k].alt)
