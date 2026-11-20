// 地球的运动实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 角度在函数里用“度”，方向向量用场景坐标（y 朝上）。取值约定写在规格卡 docs/specs/orbit.md 里。
const RAD = Math.PI / 180
/** 地轴和黄道面（公转轨道面）的夹角：和黄赤交角互余 */
export const axisToOrbit = (tilt: number) => 90 - tilt
export const TILT = 23.5                       // 地轴倾斜的角度（度）
export const YEAR = 365                        // 一年的天数
/** 四个节气：从春分起过了多少天、叫什么、教材上的日期 */
export const TERMS = [
  { key: 'spring', name: '春分', day: 0, date: '3 月 21 日前后' },
  { key: 'summer', name: '夏至', day: YEAR / 4, date: '6 月 22 日前后' },
  { key: 'autumn', name: '秋分', day: YEAR / 2, date: '9 月 23 日前后' },
  { key: 'winter', name: '冬至', day: YEAR * 3 / 4, date: '12 月 22 日前后' },
] as const
export type TermKey = typeof TERMS[number]['key']
export const termOf = (key: TermKey) => TERMS.find(t => t.key === key)!
/** 这一天最靠近哪个节气（差不到两天才算） */
export const nearTerm = (day: number) => TERMS.find(t => Math.abs(((day - t.day + YEAR * 1.5) % YEAR) - YEAR / 2) < 2) ?? null

export const CITIES = {
  beijing: { name: '北京', lat: 39.9, lon: 116.4 },
  london: { name: '伦敦', lat: 51.5, lon: 0 },
  urumqi: { name: '乌鲁木齐', lat: 43.8, lon: 87.6 },
  newyork: { name: '纽约', lat: 40.7, lon: -74 },
} as const
export type CityKey = keyof typeof CITIES

/** 从春分起第几天，写成“6 月 22 日”这样（平年；四个节气对到教材上的日期） */
export function dateText(day: number) {
  const len = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  // 四季并不一样长。把四段各自对到教材上的节气日期：3 月 21 日、6 月 22 日、9 月 23 日、12 月 22 日
  const cum = [0, 93, 186, 276, 365], x = (((day % YEAR) + YEAR) % YEAR) / (YEAR / 4), q = Math.min(3, Math.floor(x))
  let m = 2, d = 20 + Math.round(cum[q] + (x - q) * (cum[q + 1] - cum[q])) % 365     // 3 月是第 2 个（从 0 数），21 日是第 20 天（从 0 数）
  while (d >= len[m]) { d -= len[m]; m = (m + 1) % 12 }
  return `${m + 1} 月 ${d + 1} 日`
}

// ---------- 公转 ----------
/** 地球在轨道上的方位角（弧度）。春分在 90°，从北极上空看逆时针走 */
export const orbitAngle = (day: number) => Math.PI / 2 + 2 * Math.PI * day / YEAR
/** 地球相对太阳的方向（单位向量） */
export const orbitDir = (day: number): [number, number, number] => { const a = orbitAngle(day); return [Math.cos(a), 0, -Math.sin(a)] }
/** 太阳直射点的纬度（度，北正南负）。地轴始终朝同一个方向倾斜，所以直射点一年里在南北回归线之间来回 */
export const subsolarLat = (day: number, tilt = TILT) => Math.asin(Math.sin(tilt * RAD) * Math.sin(2 * Math.PI * day / YEAR)) / RAD
/** 纬度写成“北纬 23.5°”这样 */
export const latText = (lat: number, digits = 1) => Math.abs(lat) < 0.05 ? '0°（赤道）' : `${lat > 0 ? '北纬' : '南纬'} ${Math.abs(lat).toFixed(digits)}°`

// ---------- 昼夜和太阳高度 ----------
/** 正午太阳高度（度） */
export const noonAltitude = (lat: number, sub: number) => 90 - Math.abs(lat - sub)
/** 昼长（小时）。不计大气折射。极昼返回 24，极夜返回 0 */
export function dayLength(lat: number, sub: number) {
  const x = -Math.tan(lat * RAD) * Math.tan(sub * RAD)
  return x <= -1 ? 24 : x >= 1 ? 0 : 2 * Math.acos(x) / RAD / 15
}
/** 小时数写成“14 小时 51 分” */
export const hoursText = (h: number) => { const m = Math.round(h * 60); return `${Math.floor(m / 60)} 小时 ${String(m % 60).padStart(2, '0')} 分` }
/** 杆的影长（m） */
export const shadowLength = (pole: number, altitude: number) => pole / Math.tan(altitude * RAD)

// ---------- 自转和时间 ----------
/** 某个经度的地方时（小时，0–24）。utc 是 0° 经线上的时间 */
export const localTime = (utc: number, lon: number) => (((utc + lon / 15) % 24) + 24) % 24
/** 两地的地方时相差多少小时（东边的早，返回正数表示 a 比 b 早） */
export const timeGap = (lonA: number, lonB: number) => (lonA - lonB) / 15
/** 要让这个经度正好是正午，0° 经线上该是几点 */
export const utcForNoon = (lon: number) => (((12 - lon / 15) % 24) + 24) % 24
/** 钟点写成“19:44” */
export const clockText = (h: number) => { const m = Math.round(h * 60) % 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}` }

// ---------- 把经纬度变成场景里的方向 ----------
/** 地球自转了多少（弧度）：让 0° 经线上的时间正好是 utc */
export function spinAngle(day: number, utc: number, tilt = TILT) {
  const [dx, , dz] = orbitDir(day), s: [number, number, number] = [-dx, 0, -dz]          // 从地球看太阳的方向
  const e = tilt * RAD, lx = s[0] * Math.cos(e) - s[1] * Math.sin(e)                      // 转回地轴竖直的坐标里
  const noon = Math.atan2(-s[2], lx)                                                     // 太阳所在的方位
  return noon - 15 * (12 - utc) * RAD
}
/** 地球上一点（纬度、经度）在场景里的方向（单位向量，相对地心） */
export function geoDir(lat: number, lon: number, day: number, utc: number, tilt = TILT): [number, number, number] {
  const az = lon * RAD + spinAngle(day, utc, tilt), c = Math.cos(lat * RAD)
  const x = c * Math.cos(az), y = Math.sin(lat * RAD), z = -c * Math.sin(az), e = tilt * RAD
  return [x * Math.cos(e) + y * Math.sin(e), -x * Math.sin(e) + y * Math.cos(e), z]       // 再把地轴向 +x 倾斜
}
/** 这一点现在是白天吗：它朝向太阳就是白天 */
export function isDay(lat: number, lon: number, day: number, utc: number, tilt = TILT) {
  const p = geoDir(lat, lon, day, utc, tilt), [dx, , dz] = orbitDir(day)
  return p[0] * -dx + p[2] * -dz > 0
}

// ---------- 五带 ----------
/** 回归线和极圈的纬度，跟着地轴的倾角走 */
export const zones = (tilt: number) => ({ tropic: tilt, polar: 90 - tilt })

// ---------- 拓展：傅科摆 ----------
/** 摆动面每小时转过的角度（度）：15° × sin 纬度 */
export const pendulumRate = (lat: number) => 15 * Math.sin(lat * RAD)
