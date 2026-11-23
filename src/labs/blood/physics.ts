// 血液循环实验室的计算核心：各课的数据表和判定。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 数的来历写在规格卡 docs/specs/blood.md 里；拿不准的数没有放进来。

export const round = (x: number, d = 1) => Math.round(x * 10 ** d) / 10 ** d
const clamp01 = (x: number) => Math.min(1, Math.max(0, x))

// ---------- 第 1 课 血液的组成 ----------
/** 静置后各层占试管里血液的比例（自上而下）。血浆约 55%（教材）；中间那一薄层的厚度是示意 */
export const LAYERS = [
  { key: 'plasma', name: '血浆', share: 0.55, color: '#e9c46a' },
  { key: 'buffy', name: '白细胞和血小板', share: 0.012, color: '#efe9dc' },
  { key: 'red', name: '红细胞', share: 0.438, color: '#7a1020' },
] as const
export type LayerKey = (typeof LAYERS)[number]['key']
/** 血细胞一共占多少（%） */
export const cellsPct = () => Math.round((1 - LAYERS[0].share) * 100)
export const plasmaPct = () => Math.round(LAYERS[0].share * 100)
/**
 * 静置的进度 k（0 刚加完抗凝剂，1 分好层）时，三层各自的厚度（占血液总高度的比例，自上而下）。
 * 血细胞往下沉，上面先清出血浆；分层的界面匀速下移，k = 1 时到位
 */
export function layers(k: number) {
  const t = clamp01(k), e = t * t * (3 - 2 * t)
  const plasma = LAYERS[0].share * e, buffy = LAYERS[1].share * e
  return { plasma, buffy, mixed: 1 - plasma - buffy }
}

export const CELLS = {
  rbc: { name: '红细胞', shape: '两面凹的圆饼状', nucleus: '没有细胞核', many: '数量最多', job: '运输氧，也运输一部分二氧化碳' },
  wbc: { name: '白细胞', shape: '比红细胞大，形状多样', nucleus: '有细胞核', many: '数量少', job: '能穿过血管壁吞噬病菌，对人体有防御和保护作用' },
  plt: { name: '血小板', shape: '最小，形状不规则', nucleus: '没有细胞核', many: '数量较多', job: '受伤时聚集在伤口处止血，并加速血液凝固' },
} as const
export type CellKey = keyof typeof CELLS
/** 第 1 课依次认的：一层血浆，再三种血细胞 */
export const L1_ORDER = ['plasma', 'rbc', 'wbc', 'plt'] as const
export type L1Step = (typeof L1_ORDER)[number]

// ---------- 第 2 课 三种血管 ----------
export const VESSELS = {
  artery: { name: '动脉', wall: '较厚，弹性大', lumen: '较小', speed: '快', flow: '从心脏流向全身各处', valve: '没有瓣膜（只在和心脏相连处有动脉瓣）', rel: 1 },
  vein: { name: '静脉', wall: '较薄，弹性小', lumen: '大', speed: '慢', flow: '从全身各处流回心脏', valve: '四肢静脉里有静脉瓣', rel: 0.45 },
  capillary: { name: '毛细血管', wall: '非常薄，只有一层上皮细胞', lumen: '最小，只允许红细胞单行通过', speed: '最慢', flow: '连通最小的动脉和静脉', valve: '没有', rel: 0.12 },
} as const
export type VesselKey = keyof typeof VESSELS
/** 画面里红细胞在这种血管里走得多快（相对值，示意） */
export const speedOf = (v: VesselKey) => VESSELS[v].rel
/** 毛细血管的内径（µm，教材）和红细胞的直径（µm） */
export const CAP_UM: [number, number] = [8, 10]
export const RBC_UM = 7.5
/** 内径 d 的血管里，红细胞最多能并排几个通过 */
export const singleFile = (d: number, rbc = RBC_UM) => Math.max(1, Math.floor(d / rbc))
/** 静脉瓣：血往心脏流时瓣膜贴着管壁打开；往回流时被冲得合上 */
export const veinValveOpen = (towardHeart: boolean) => towardHeart

// ---------- 第 3 课 心脏的结构 ----------
export const CHAMBERS = {
  ra: { name: '右心房', vessel: '上腔静脉、下腔静脉', kind: '静脉', blood: 'vein' as Blood, wall: 1 },
  rv: { name: '右心室', vessel: '肺动脉', kind: '动脉', blood: 'vein' as Blood, wall: 2 },
  la: { name: '左心房', vessel: '肺静脉', kind: '静脉', blood: 'artery' as Blood, wall: 1 },
  lv: { name: '左心室', vessel: '主动脉', kind: '动脉', blood: 'artery' as Blood, wall: 3 },
}
export type ChamberKey = keyof typeof CHAMBERS
/** 认腔的顺序：最后一个是壁最厚的 */
export const L3_ORDER: ChamberKey[] = ['ra', 'rv', 'la', 'lv']
/** 壁最厚的腔 */
export const thickest = () => (Object.keys(CHAMBERS) as ChamberKey[]).reduce((a, b) => (CHAMBERS[b].wall > CHAMBERS[a].wall ? b : a))
/** 血：动脉血（含氧多，鲜红）、静脉血（含氧少，暗红，画面里用暗蓝） */
export type Blood = 'artery' | 'vein'
export const BLOOD = { artery: { name: '动脉血', note: '含氧多，颜色鲜红' }, vein: { name: '静脉血', note: '含氧少，颜色暗红' } } as const

// ---------- 第 4 课 心脏怎样泵血 ----------
/** 心率（次/分） */
export const HR = 75
/** 一次心跳的时长（s） */
export const period = (hr = HR) => 60 / hr
/** 心率 75 次/分时一次心跳的三个时期（教材的心动周期图） */
export const PHASES = [
  { key: 'atria', name: '心房收缩', short: '心房收缩，心室舒张', sec: 0.1 },
  { key: 'ventricles', name: '心室收缩', short: '心室收缩，心房舒张', sec: 0.3 },
  { key: 'rest', name: '全心舒张', short: '心房和心室都舒张', sec: 0.4 },
] as const
export type PhaseKey = (typeof PHASES)[number]['key']
/** 一次心跳开始后 t 秒（任意长，按周期取余）处在哪个时期，以及在这个时期里走了几成 */
export function phaseAt(t: number, hr = HR): { key: PhaseKey; k: number } {
  const T = period(hr), scale = T / PHASES.reduce((s, p) => s + p.sec, 0)
  let x = ((t % T) + T) % T
  for (const p of PHASES) { const d = p.sec * scale; if (x < d) return { key: p.key, k: x / d }; x -= d }
  return { key: 'rest', k: 1 }
}
/** 各时期两种瓣膜开着没有 */
export const valves = (p: PhaseKey) => ({ av: p !== 'ventricles', sl: p === 'ventricles' })
/** 血能不能从 a 流到 b：只能 静脉 → 心房 → 心室 → 动脉，而且要那道瓣膜开着 */
export type Site = 'vein' | 'atrium' | 'ventricle' | 'artery'
const ORDER: Site[] = ['vein', 'atrium', 'ventricle', 'artery']
export function canFlow(a: Site, b: Site, p: PhaseKey) {
  const i = ORDER.indexOf(a), j = ORDER.indexOf(b)
  if (j !== i + 1) return false
  if (a === 'atrium') return valves(p).av
  if (a === 'ventricle') return valves(p).sl
  return true
}
/** 收缩的强弱（0 不收缩，1 收缩到最紧），给画面用：这个时期里先收紧再放松 */
export function squeeze(p: PhaseKey, k: number) {
  const s = Math.sin(Math.PI * clamp01(k))
  return { atria: p === 'atria' ? s : 0, ventricles: p === 'ventricles' ? s : 0 }
}

// ---------- 第 5、6 课 体循环、肺循环 ----------
export const SYSTEMIC = { name: '体循环', from: 'lv' as ChamberKey, to: 'ra' as ChamberKey, start: '主动脉', stops: ['左心室', '主动脉', '各级动脉', '全身各处毛细血管', '各级静脉', '上、下腔静脉', '右心房'], change: '动脉血变成静脉血' }
export const PULMONARY = { name: '肺循环', from: 'rv' as ChamberKey, to: 'la' as ChamberKey, start: '肺动脉', stops: ['右心室', '肺动脉', '肺部毛细血管', '肺静脉', '左心房'], change: '静脉血变成动脉血' }
/** 血流经某处的毛细血管以后变成什么血 */
export const bloodAfter = (where: 'lung' | 'tissue'): Blood => (where === 'lung' ? 'artery' : 'vein')
/** 体循环里血去的几处，各经哪根腔静脉回来 */
export const ORGANS = {
  leg: { name: '下肢', back: '下腔静脉' },
  head: { name: '头部', back: '上腔静脉' },
  arm: { name: '上肢', back: '上腔静脉' },
  gut: { name: '腹部', back: '下腔静脉' },
} as const
export type OrganKey = keyof typeof ORGANS
/** 血量（kg）：成年人的血量大致相当于体重的 7%–8% */
export const bloodMass = (kg: number): [number, number] => [round(kg * 0.07, 1), round(kg * 0.08, 1)]
export const BODY_KG = 60

// ---------- 第 7 课 在哪里换了气 ----------
/** 吸入和呼出的气体里氧、二氧化碳的体积分数（%） */
export const AIR = { in: { o2: 21, co2: 0.03 }, out: { o2: 16, co2: 4 } } as const
/** 气体从多的一侧扩散到少的一侧：返回往哪边走 */
export const diffuses = (a: number, b: number): 'a→b' | 'b→a' | 'none' => (a > b ? 'a→b' : a < b ? 'b→a' : 'none')
/** 两处的气体交换：氧、二氧化碳各从哪里到哪里；血由什么变成什么。高、低只是比较，不是测得的数 */
export const EXCHANGE = {
  lung: { name: '肺泡处', o2: { from: '肺泡', to: '血液' }, co2: { from: '血液', to: '肺泡' }, before: 'vein' as Blood, after: bloodAfter('lung') },
  tissue: { name: '组织处', o2: { from: '血液', to: '组织细胞' }, co2: { from: '组织细胞', to: '血液' }, before: 'artery' as Blood, after: bloodAfter('tissue') },
}
/** 两处“谁的氧多”：1 多、0 少（只用来判断扩散方向） */
export const O2_LEVEL = { lung: { side: 1, blood: 0 }, tissue: { side: 0, blood: 1 } } as const
export type ExKey = keyof typeof EXCHANGE

// ---------- 拓展 量血压、数脉搏 ----------
/** mmHg 换成 kPa（1 mmHg = 133.3 Pa） */
export const kPa = (mmHg: number) => round(mmHg * 0.13332, 1)
/** 健康成年人的血压范围（kPa，教材） */
export const BP_NORMAL = { sys: [12, 18.7], dia: [8, 12] } as const
/** 示意的一次测量（mmHg） */
export const BP_READ = { sys: 120, dia: 80 }
export const bpOk = (sysMmHg: number, diaMmHg: number) => {
  const s = kPa(sysMmHg), d = kPa(diaMmHg)
  return s >= BP_NORMAL.sys[0] && s <= BP_NORMAL.sys[1] && d >= BP_NORMAL.dia[0] && d <= BP_NORMAL.dia[1]
}
/** 拓展课那位同学安静时的心率（次/分，示意） */
export const HR_X = 72
/** 心率 hr 时，sec 秒里脉搏跳几次 */
export const beats = (hr: number, sec: number) => Math.floor(hr * sec / 60 + 1e-9)
/** 测血压时袖带里的气压（mmHg，示意）：先打气到 170，再慢慢放气。k 是测量的进度（0–1） */
export const cuffAt = (k: number) => Math.round(k < 0.3 ? 170 * k / 0.3 : 170 * (1 - (k - 0.3) / 0.7 * 0.9))
