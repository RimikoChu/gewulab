// 洋流和厄尔尼诺实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 经度一律用东经为正的度数，为了一条洋流画得连续，可以超过 180（比如 250 就是 110°W）；纬度北纬为正。
// 取值约定写在规格卡 docs/specs/ocean.md 里。水温、温跃层深度、海温距平都是“示意”的简化模型，界面上标“示意”。

export type LL = [number, number]
const RAD = Math.PI / 180
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))
/** 经度换到 −180–180 */
export const wrapLon = (lon: number) => ((((lon + 180) % 360) + 360) % 360) - 180

// ---------- 世界的主要洋流 ----------
export interface Current { name: string; warm: boolean; pts: LL[] }
/** 每条洋流沿流动方向的一串经纬度点（画在离岸一点的海上，方向和教材的世界洋流分布图一致） */
export const CURRENTS = {
  // 北太平洋：中低纬顺时针
  npNEC: { name: '北赤道暖流', warm: true, pts: [[255, 13], [230, 13], [200, 13], [170, 13.5], [145, 14], [129, 15]] },
  kuroshio: { name: '日本暖流', warm: true, pts: [[126, 17], [123.6, 23], [127, 28.5], [133, 31.8], [140, 34.6], [147, 37]] },
  npc: { name: '北太平洋暖流', warm: true, pts: [[151, 39], [168, 41.5], [188, 43.5], [208, 45], [226, 45.5]] },
  calif: { name: '加利福尼亚寒流', warm: false, pts: [[231, 45], [234, 40], [238.5, 33.5], [243.5, 27], [249, 21]] },
  ecc: { name: '赤道逆流', warm: true, pts: [[132, 6], [160, 6.5], [190, 7], [220, 7], [250, 7], [266, 7]] },
  // 北太平洋：中高纬逆时针
  alaska: { name: '阿拉斯加暖流', warm: true, pts: [[226, 49], [224, 54], [216, 57.5], [206, 55.2], [194, 52.2], [181, 51.3], [171, 52.6]] },
  oyashio: { name: '千岛寒流', warm: false, pts: [[165, 53.6], [161, 50.5], [154.5, 45.5], [148, 41.5]] },
  // 南太平洋：逆时针
  spSEC: { name: '南赤道暖流', warm: true, pts: [[275, -3], [255, -5], [225, -8], [195, -11], [170, -13], [157, -15]] },
  eac: { name: '东澳大利亚暖流', warm: true, pts: [[156, -17], [155.6, -23], [155.6, -29], [153.6, -35], [151, -40]] },
  wwdP: { name: '西风漂流', warm: false, pts: [[152, -46], [175, -51], [205, -53], [235, -53], [262, -51], [283, -47]] },
  peru: { name: '秘鲁寒流', warm: false, pts: [[284.5, -44], [285, -36], [284.5, -28], [283.5, -20], [280.5, -12.5], [276.5, -5.5]] },
  // 北大西洋
  naNEC: { name: '北赤道暖流', warm: true, pts: [[-21, 17], [-34, 15.5], [-48, 15], [-60, 15.5]] },
  gulf: { name: '墨西哥湾暖流', warm: true, pts: [[-79.4, 27], [-78.6, 31], [-74.3, 35.4], [-68, 38.6], [-58, 41.2], [-48, 43.6]] },
  nac: { name: '北大西洋暖流', warm: true, pts: [[-44, 45.5], [-32, 49], [-20, 53], [-11, 57], [-3.5, 61.2], [6, 64.5], [14, 70.2]] },
  canary: { name: '加那利寒流', warm: false, pts: [[-13.5, 41], [-13.5, 34], [-19, 26], [-22, 19.5]] },
  labrador: { name: '拉布拉多寒流', warm: false, pts: [[-60, 62.5], [-57, 57.5], [-52.8, 52.5], [-49.5, 47.5], [-49, 43.5]] },
  egc: { name: '东格陵兰寒流', warm: false, pts: [[-12, 77], [-17, 71], [-30, 65.5], [-39, 60.2]] },
  // 南大西洋：逆时针
  saSEC: { name: '南赤道暖流', warm: true, pts: [[8, -3], [-6, -5], [-20, -7], [-32, -8.5]] },
  brazil: { name: '巴西暖流', warm: true, pts: [[-34, -11], [-37, -19.5], [-43.5, -27], [-50, -36]] },
  wwdA: { name: '西风漂流', warm: false, pts: [[-48, -45], [-30, -47], [-10, -46], [8, -44]] },
  benguela: { name: '本格拉寒流', warm: false, pts: [[15.5, -35], [12.6, -27], [9.8, -20], [7, -13]] },
  // 南印度洋：逆时针
  iSEC: { name: '南赤道暖流', warm: true, pts: [[112, -12], [95, -12], [78, -13], [62, -14], [53, -14.5]] },
  mozam: { name: '莫桑比克暖流', warm: true, pts: [[43, -12], [40.5, -18], [37.4, -24], [33, -30.5]] },
  wwdI: { name: '西风漂流', warm: false, pts: [[25, -42], [50, -45], [80, -46], [105, -44]] },
  wAus: { name: '西澳大利亚寒流', warm: false, pts: [[112.5, -38], [111.5, -30], [110, -22.5]] },
  // 北印度洋季风洋流：冬季逆时针、夏季顺时针
  monW: { name: '季风洋流（冬季）', warm: true, pts: [[97, 6.5], [88, 5], [80, 4.4], [72, 5], [63, 7.5], [55, 8.5], [50.6, 5], [46.5, 0.5], [52, -3], [66, -3.5], [82, -3], [96, -2]] },
  monS: { name: '季风洋流（夏季）', warm: true, pts: [[46.5, -1], [49.5, 4], [54, 9.5], [61, 12], [68, 11], [74, 6.5], [80, 4.4], [88, 5], [97, 6]] },
} satisfies Record<string, Current>
export type CurrentKey = keyof typeof CURRENTS
export const CURRENT = CURRENTS as Record<CurrentKey, Current>

/** 绕南极一整圈的西风漂流（拓展、第 3 课用），由三大洋的三段接起来 */
export const WWD_RING: LL[] = [[0, -48], [30, -48], [60, -49], [90, -50], [120, -50], [150, -51], [180, -53], [210, -55], [240, -56], [270, -57], [285, -58.5], [300, -58], [315, -54], [330, -50], [345, -48]]

// ---------- 第 1 课：洋流的成因 ----------
/** 风海流：盛行风吹动海面，表层海水大致顺着风向流动 */
export const WIND_BELTS = {
  trade: { name: '东北信风', blowsTo: '向西南', current: '北赤道暖流', flowsTo: '自东向西' },
  west: { name: '盛行西风', blowsTo: '向东北', current: '北太平洋暖流', flowsTo: '自西向东' },
} as const
export type Belt = keyof typeof WIND_BELTS
/** 风吹向的方位角（度，正北 0、正东 90），洋流方向取风向的东西分量（大尺度上大致顺风） */
export function driftOf(belt: Belt) {
  const windFrom = belt === 'trade' ? 45 : 225   // 东北风从东北吹来，西南风从西南吹来
  const toward = (windFrom + 180) % 360
  const east = Math.sin(toward * RAD)
  return { toward, flow: east < 0 ? '自东向西' : '自西向东' }
}

/** 海水密度（kg/m³）：线性近似 ρ = ρ₀[1 − α(T − 10) + β(S − 35)]，温度越高越轻、盐度越高越重 */
export const RHO0 = 1027, ALPHA = 1.7e-4, BETA = 7.6e-4
export const seaDensity = (T: number, S: number) => RHO0 * (1 - ALPHA * (T - 10) + BETA * (S - 35))
/** 直布罗陀海峡两侧的海水（示意值，来历见规格卡） */
export const STRAIT = {
  atl: { name: '大西洋一侧', T: 16, S: 36.2 },
  med: { name: '地中海一侧', T: 13, S: 38.4 },
} as const
/** 两侧密度谁大：密度大的一侧的海水从底层流出，另一侧从表层流入 */
export function straitFlow() {
  const a = seaDensity(STRAIT.atl.T, STRAIT.atl.S), m = seaDensity(STRAIT.med.T, STRAIT.med.S)
  return { atl: a, med: m, surface: m > a ? '大西洋 → 地中海' : '地中海 → 大西洋', bottom: m > a ? '地中海 → 大西洋' : '大西洋 → 地中海' }
}

/** 补偿流：离岸风把表层海水吹走 offshore（0–1），深层冷水上升补充，上升流强弱和它成正比 */
export const upwelling = (offshore: number) => clamp(offshore)

// ---------- 第 2、3 课：洋流的分布 ----------
/** 一组洋流首尾接成的环在地图上（东为右、北为上）是顺时针还是逆时针：按鞋带公式的有向面积判断 */
export function loopSense(keys: CurrentKey[]): 'cw' | 'ccw' {
  const pts = keys.flatMap(k => CURRENT[k].pts)
  let a = 0
  for (let i = 0; i < pts.length; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length]; a += x1 * y2 - x2 * y1 }
  return a < 0 ? 'cw' : 'ccw'
}
export const SENSE_NAME = { cw: '顺时针', ccw: '逆时针' } as const
/** 各个大洋环流由哪几条洋流组成（按流动顺序） */
export const GYRES = {
  np: { name: '北太平洋', keys: ['npNEC', 'kuroshio', 'npc', 'calif'] as CurrentKey[] },
  sp: { name: '南太平洋', keys: ['spSEC', 'eac', 'wwdP', 'peru'] as CurrentKey[] },
  na: { name: '北大西洋', keys: ['naNEC', 'gulf', 'nac', 'canary'] as CurrentKey[] },
  sa: { name: '南大西洋', keys: ['saSEC', 'brazil', 'wwdA', 'benguela'] as CurrentKey[] },
  si: { name: '南印度洋', keys: ['iSEC', 'mozam', 'wwdI', 'wAus'] as CurrentKey[] },
  npN: { name: '北太平洋中高纬', keys: ['npc', 'alaska', 'oyashio'] as CurrentKey[] },
  monW: { name: '北印度洋（冬季）', keys: ['monW'] as CurrentKey[] },
  monS: { name: '北印度洋（夏季）', keys: ['monS'] as CurrentKey[] },
} as const
export type GyreKey = keyof typeof GYRES
export const gyreSense = (g: GyreKey) => loopSense(GYRES[g].keys)
/** 环流的大洋西岸（大陆东岸）是暖流还是寒流：找最靠西的那条经向洋流 */
export function westSide(g: GyreKey) {
  const ks = GYRES[g].keys.filter(k => { const p = CURRENT[k].pts; return Math.abs(p[p.length - 1][1] - p[0][1]) > 8 })
  if (!ks.length) return null
  const mid = (k: CurrentKey) => CURRENT[k].pts.reduce((s, p) => s + p[0], 0) / CURRENT[k].pts.length
  const w = ks.reduce((a, b) => (mid(a) < mid(b) ? a : b)), e = ks.reduce((a, b) => (mid(a) > mid(b) ? a : b))
  return { west: CURRENT[w], east: CURRENT[e] }
}
/** 北印度洋的季风洋流：冬季吹东北季风，洋流向西流，逆时针；夏季吹西南季风，向东流，顺时针 */
export const MONSOON = {
  win: { name: '冬季', wind: '东北季风', gyre: 'monW' as GyreKey },
  sum: { name: '夏季', wind: '西南季风', gyre: 'monS' as GyreKey },
} as const

// ---------- 表层水温（示意模型） ----------
/** 离一条折线最近的角距离（度，按纬度余弦压缩经度） */
function distTo(lon: number, lat: number, pts: LL[]) {
  let best = 1e9
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], c = Math.cos(lat * RAD)
    const dx0 = wrapLon(lon - ax) * c, dy0 = lat - ay, ux = wrapLon(bx - ax) * c, uy = by - ay
    const t = clamp((dx0 * ux + dy0 * uy) / Math.max(1e-6, ux * ux + uy * uy))
    best = Math.min(best, Math.hypot(dx0 - ux * t, dy0 - uy * t))
  }
  return best
}
/** 同纬度平均的表层水温（°C，示意）：赤道约 28 °C，往两极降低 */
export const zonalSST = (lat: number) => Math.max(-1.5, 28 - 30 * Math.sin(Math.abs(lat) * RAD) ** 2)
/** 暖流让流经海区比同纬度高、寒流让它低：离洋流越近影响越大（最多 ±4 °C，示意） */
export const CURRENT_DT = 4
// 赤道附近的几条洋流东西向流，对“比同纬度暖或冷”影响小，不计
const SST_KEYS = (Object.keys(CURRENTS) as CurrentKey[]).filter(k => !['monW', 'monS', 'ecc', 'npNEC', 'spSEC', 'naNEC', 'saSEC', 'iSEC'].includes(k))
/** 每条洋流的经纬度范围（外扩 14°），离得远的格子直接跳过，算得快些 */
const BOX = new Map(SST_KEYS.map(k => { const p = CURRENT[k].pts; return [k, [Math.min(...p.map(q => q[1])) - 14, Math.max(...p.map(q => q[1])) + 14]] as const }))
export function sstAt(lon: number, lat: number, enso = 1) {
  let t = zonalSST(lat)
  for (const k of SST_KEYS) {
    const [b0, b1] = BOX.get(k)!; if (lat < b0 || lat > b1) continue
    const c = CURRENT[k], d = distTo(lon, lat, c.pts)
    if (d < 14) t += (c.warm ? 1 : -1) * CURRENT_DT * Math.exp(-(d * d) / 30)
  }
  t += eastPacificAnomaly(lon, lat, enso)
  return t
}
/** 赤道东太平洋的海温距平（°C，示意）：正常年份东边冷水上泛，厄尔尼诺时偏暖 */
export function eastPacificAnomaly(lon: number, lat: number, k: number) {
  const L = ((lon % 360) + 360) % 360
  const band = Math.exp(-(lat * lat) / 60), east = clamp((L - 180) / 60) * clamp((285 - L) / 8)
  return band * east * (ninoIndex(k) - 2.4)
}
/** 表层水温比同纬度平均高多少（°C，示意） */
export const sstAnomaly = (lon: number, lat: number, enso = 1) => sstAt(lon, lat, enso) - zonalSST(lat)
export function sstAnomGrid(W: number, H: number, enso = 1) {
  const g = new Float32Array(W * H)
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) g[j * W + i] = sstAnomaly(-180 + (i + 0.5) * 360 / W, -90 + (j + 0.5) * 180 / H, enso)
  return g
}
/** 一张表层水温网格（W×H，行从南到北），给地球贴图用 */
export function sstGrid(W: number, H: number, enso = 1) {
  const g = new Float32Array(W * H)
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) g[j * W + i] = sstAt(-180 + (i + 0.5) * 360 / W, -90 + (j + 0.5) * 180 / H, enso)
  return g
}

// ---------- 第 4 课：对沿岸气候的影响 ----------
export const COASTS = {
  europe: { name: '西欧沿岸', lon: -12, lat: 52, current: 'nac' as CurrentKey, effect: '增温增湿', climate: '温和湿润（温带海洋性气候）' },
  peru: { name: '秘鲁沿岸', lon: -79, lat: -14, current: 'peru' as CurrentKey, effect: '降温减湿', climate: '干燥少雨（沿岸荒漠）' },
} as const
export type CoastKey = keyof typeof COASTS
/** 洋流流经的海区比同纬度平均偏暖还是偏冷（°C，示意） */
export const coastDT = (c: CoastKey) => sstAt(COASTS[c].lon, COASTS[c].lat) - zonalSST(COASTS[c].lat)
/** 暖流增温增湿、寒流降温减湿 */
export const climateEffect = (warm: boolean) => (warm ? '增温增湿' : '降温减湿')

// ---------- 第 5 课：对渔场的影响 ----------
export const FISHERIES = {
  hokkaido: { name: '北海道渔场', lon: 145, lat: 41.5, keys: ['kuroshio', 'oyashio'] as CurrentKey[], cause: '寒暖流交汇' },
  newfound: { name: '纽芬兰渔场', lon: -50, lat: 45, keys: ['gulf', 'labrador'] as CurrentKey[], cause: '寒暖流交汇' },
  northsea: { name: '北海渔场', lon: 3, lat: 57, keys: ['nac', 'egc'] as CurrentKey[], cause: '寒暖流交汇' },
  peru: { name: '秘鲁渔场', lon: -79, lat: -10, keys: ['peru'] as CurrentKey[], cause: '上升流' },
} as const
export type FishKey = keyof typeof FISHERIES
/** 渔场的成因：有一冷一暖两条洋流就是寒暖流交汇，只有离岸的寒流就是上升流 */
export function fishCause(f: FishKey) {
  const ks = FISHERIES[f].keys, warm = ks.some(k => CURRENT[k].warm), cold = ks.some(k => !CURRENT[k].warm)
  return warm && cold ? '寒暖流交汇' : '上升流'
}

// ---------- 第 6 课：对航行和污染的影响 ----------
/** 航程、船速、流速（km、km/h）：顺流航速相加，逆流相减 */
export const VOYAGE = { km: 1000, ship: 30, current: 3.6 }
export const voyageHours = (withFlow: boolean, v = VOYAGE) => v.km / (v.ship + (withFlow ? v.current : -v.current))
/** 漂流浮标一天漂多远（km）：流速 m/s × 86 400 s */
export const driftKmPerDay = (ms: number) => (ms * 86400) / 1000
/** 日本暖流的流速（m/s，约） */
export const KUROSHIO_MS = 1

// ---------- 第 7 课：厄尔尼诺和拉尼娜 ----------
/** 信风强弱：正常 1，厄尔尼诺时减弱，拉尼娜时增强（示意） */
export const ENSO = {
  normal: { name: '正常年份', k: 1 },
  nino: { name: '厄尔尼诺', k: 0.3 },
  nina: { name: '拉尼娜', k: 1.5 },
} as const
export type EnsoKey = keyof typeof ENSO
/** 温跃层深度（m，示意）：西太平洋、东太平洋。信风越强，暖水越往西堆，西边越深、东边越浅 */
export const thermoWest = (k: number) => 100 + 60 * k
export const thermoEast = (k: number) => Math.max(20, 140 - 90 * k)
/** 东太平洋表层水温距平（°C，示意）：信风减弱为正，增强为负 */
export const ninoIndex = (k: number) => Math.round((1 - k) * 4 * 10) / 10
/** 秘鲁沿岸上升流强弱（0–1.5，和信风同步） */
export const ensoUpwelling = (k: number) => upwelling(k / 1.5) * 1.5
/** 沿赤道某个经度的表层水温（°C，示意）和温跃层深度（m） */
export function equatorProfile(lon: number, k: number) {
  const L = ((lon % 360) + 360) % 360, x = clamp((L - 125) / (280 - 125))     // 0 西太平洋，1 东太平洋
  const warmW = 29.5, coldE = 24 + ninoIndex(k)
  const s = x ** (1.6 / Math.max(0.35, k))                                      // 信风弱时暖水更往东摊开
  return { sst: warmW + (coldE - warmW) * s, z: thermoWest(k) + (thermoEast(k) - thermoWest(k)) * x ** 1.1 }
}
/** 降水异常：厄尔尼诺时秘鲁沿岸多雨、印尼和澳大利亚东部干旱；拉尼娜相反 */
export function rainfall(e: EnsoKey) {
  if (e === 'nino') return { peru: '多雨，易洪涝', west: '少雨，易干旱' }
  if (e === 'nina') return { peru: '更干旱', west: '多雨，易洪涝' }
  return { peru: '干燥少雨', west: '多雨' }
}
/** 渔获：上升流带来营养盐，上升流强渔获多（示意，正常年份记 100） */
export const catchIndex = (k: number) => Math.round(100 * Math.min(1.25, k))

// ---------- 拓展：垃圾带、冰山 ----------
/** 北太平洋副热带环流的中心（示意） */
export const GYRE_CENTER: LL = [210, 32]
/** 漂浮垃圾 t 天后离环流中心的距离（度，示意）：表层海水在环流中心辐合，越聚越拢 */
export const debrisDistance = (d0: number, days: number) => d0 * Math.exp(-days / 1500)
/** 冰山顺着拉布拉多寒流南下，碰到墨西哥湾暖流后很快融化：融化的纬度约 43°N（示意） */
export const ICEBERG_MELT_LAT = 43

// ---------- 剖面（画在切开的地球上）----------
/** 剖面上每个经度（−180–180，每度一格）的海水分两层：上层的值、下层的值、分界面深度（m）。
 *  温度模式下值是水温（°C），盐度模式下值是盐度（‰） */
export interface FaceProfile { top: Float32Array; bottom: Float32Array; z: Float32Array; mode: 'temp' | 'salt' }
export function faceProfile(kind: 'equator' | 'peru' | 'strait', k = 1): FaceProfile {
  const top = new Float32Array(360), bottom = new Float32Array(360), z = new Float32Array(360)
  for (let i = 0; i < 360; i++) {
    const lon = i - 180 + 0.5
    if (kind === 'equator') {
      const L = ((lon % 360) + 360) % 360, inPac = L > 118 && L < 290
      const p = equatorProfile(L, k)
      top[i] = inPac ? p.sst : 27; z[i] = inPac ? p.z : 100; bottom[i] = 6
    } else if (kind === 'peru') {
      // 南纬 12° 一线：离秘鲁海岸越近，上升流把冷水抬得越高（u 是上升流强弱）
      const near = Math.exp(-(((lon + 77.5) / 5) ** 2)) * (lon < -76 ? 1 : 0)
      top[i] = sstAt(lon, -12) - 3 * k * near; z[i] = 90 - 75 * k * near; bottom[i] = 8
    } else {
      // 直布罗陀海峡一线：大西洋海水盐度低，从表层流进地中海；地中海海水盐度高，从底层流出
      const med = clamp((lon + 5.2) / 1.2)
      top[i] = STRAIT.atl.S; bottom[i] = STRAIT.atl.S + (STRAIT.med.S - STRAIT.atl.S) * (lon < -5.6 ? clamp((lon + 8) / 2.4) * 0.8 : 1)
      z[i] = med > 0 ? 150 : 150 + (-5.6 - lon) * 120
    }
  }
  return { top, bottom, z, mode: kind === 'strait' ? 'salt' : 'temp' }
}
/** 海底深度（剖面用，单位是剖面上那一层的厚度）：从水陆分布的一行算起，离岸越远越深，近岸是大陆架。
 *  water 是这一纬度上每度一格是不是海；over 里给的经度段直接用给定的深度（海峡这种贴图分辨不出的地方） */
export function seabedRow(water: boolean[], over?: LL[]) {
  const n = water.length, d = new Float32Array(n), per = n / 360
  // 小岛（不到 2.5° 宽）在剖面上画成浅海，不然一条细细的岩石会把海水那一层切断
  water = water.slice()
  for (let i = 0; i < n; i++) if (!water[i] && water[(i - 1 + n) % n]) {
    let k = 0; while (k < 2.5 * per && !water[(i + k) % n]) k++
    if (k < 2.5 * per) for (let j = 0; j < k; j++) water[(i + j) % n] = true
  }
  for (let i = 0; i < n; i++) {
    if (!water[i]) { d[i] = 0; continue }
    let k = 1; while (k < 40 * per && water[(i + k) % n] && water[(i - k + n) % n]) k++
    d[i] = Math.min(1.25, 0.16 + Math.max(0, k / per - 1) * 0.3)
  }
  if (over && over.length > 1) for (let i = 0; i < n; i++) {
    const lon = -180 + (i + 0.5) / per
    if (lon < over[0][0] || lon > over[over.length - 1][0]) continue
    let j = 0; while (j < over.length - 2 && lon > over[j + 1][0]) j++
    const [a, da] = over[j], [b, db] = over[j + 1], t = clamp((lon - a) / Math.max(1e-6, b - a))
    d[i] = da + (db - da) * t
  }
  return d
}
/** 直布罗陀海峡一线（36°N）的海底：大西洋深、海峡处的海槛浅、地中海又变深（示意） */
export const STRAIT_BED: LL[] = [[-14, 1.6], [-9.5, 1.45], [-7.4, 1.0], [-6.4, 0.62], [-5.8, 0.48], [-5.3, 0.55], [-4.6, 1.05], [-2, 1.35], [0.6, 1.25], [1.6, 0]]

// ---------- 风（画在海面上方的白色箭头）----------
/** 几股盛行风沿着吹的路线 */
export const WINDS = {
  tradeN: [[250, 22], [230, 18], [205, 15], [180, 13], [155, 12], [135, 12]] as LL[],
  tradeN2: [[245, 28], [222, 24], [198, 20], [172, 18], [150, 17]] as LL[],
  westN: [[150, 44], [172, 46], [195, 47], [218, 48], [235, 48]] as LL[],
  westN2: [[148, 38], [170, 39], [195, 41], [220, 42]] as LL[],
  monNE: [[92, 18], [84, 12], [74, 9], [64, 8], [56, 7]] as LL[],
  monNE2: [[96, 12], [88, 8], [78, 6], [68, 4.5]] as LL[],
  monSW: [[48, 2], [56, 9], [65, 13], [75, 15], [86, 17]] as LL[],
  monSW2: [[52, -4], [62, 3], [72, 6.5], [83, 8], [93, 11]] as LL[],
  peruSE: [[-74, -22], [-79, -17], [-85, -13], [-92, -10]] as LL[],
  peruSE2: [[-73, -16], [-78, -12], [-84, -8.5], [-91, -6]] as LL[],
}
/** 西风漂流在南半球是自西向东绕南极一圈流动的 */
export const ringSense = () => { const a = WWD_RING[0][0], b = WWD_RING[1][0]; return b > a ? '自西向东' : '自东向西' }

// ---------- 第 6 课的路线 ----------
/** 浮标在日本暖流里漂过的路线（沿洋流的点），一共漂了多少天（示意） */
export const BUOY_TRACK: LL[] = [[124.6, 24.5], [126, 27], [128.5, 29.5], [131.5, 31.4], [135, 32.9], [138.5, 34], [141.5, 35.4]]
export const BUOY_DAYS = 12
/** 航线：从东海出发沿日本暖流开到房总半岛外海，约 1000 km */
export const ROUTE: LL[] = [[126.2, 27.6], [128.5, 29.6], [131.5, 31.5], [135, 33], [138.5, 34.2], [141.6, 35.2]]
/** 溢油顺着洋流漂：t 天后油带的中心在路线上走到哪（0–1）、沿流方向拉长到原来的几倍（示意） */
export const oilSpread = (days: number) => ({ along: clamp(days / 20), stretch: 1 + days * 0.3, width: 1 + days * 0.06 })

// ---------- 拓展 ----------
/** 漂浮垃圾在北太平洋副热带环流里的一步：绕中心顺时针转，同时慢慢向中心靠拢（示意，dt 单位为天） */
export function debrisStep(p: LL, dt: number): LL {
  const [cx, cy] = GYRE_CENTER, dx = (p[0] - cx) * Math.cos(p[1] * RAD), dy = p[1] - cy
  const r = Math.hypot(dx, dy) || 1e-6, w = 0.004, inward = 1 / 1500
  const vx = (dy / r) * w * r - dx * inward, vy = (-dx / r) * w * r - dy * inward   // 顺时针：东边往南、西边往北
  return [p[0] + (vx * dt) / Math.cos(p[1] * RAD), p[1] + vy * dt]
}
/** 冰山南下的路线：从格陵兰西南的戴维斯海峡出发，顺着拉布拉多寒流到纽芬兰外海 */
export const ICEBERG_TRACK: LL[] = [[-56, 66], [-58.5, 61], [-57, 57.5], [-53, 52.5], [-49.8, 48], [-49, 44.5], [-48.5, 42.5]]
/** 一群漂浮物离环流中心的平均距离（度，按纬度余弦压缩经度） */
export function meanDistance(pts: LL[]) {
  const [cx, cy] = GYRE_CENTER
  return pts.reduce((s, [x, y]) => s + Math.hypot((x - cx) * Math.cos(y * RAD), y - cy), 0) / Math.max(1, pts.length)
}
/** 冰山走到纬度 lat 时还剩多大（0–1）：遇到暖流以后很快融化 */
export const icebergSize = (lat: number) => clamp((lat - ICEBERG_MELT_LAT) / 4)
