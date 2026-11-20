// 机械运动实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 长度用米、时间用秒、速度用米每秒；取值约定写在规格卡 docs/specs/motion.md 里。

// ---------- 第 1 课：用刻度尺量长度 ----------
/** 被量的那张车票的真实长度（cm），和刻度尺的分度值（cm） */
export const TICKET = 8.64, DIVISION = 0.1
export const WAYS = {
  good: { name: '零刻度对齐，视线正对', off: 0, tilt: 0, say: '读到分度值的下一位：8.6 是准确值，最后的 4 是估读的' },
  shifted: { name: '没有对齐零刻度', off: 0.5, tilt: 0, say: '左端压在 0.50 cm 处，直接读右端的数就多出了 0.50 cm' },
  slanted: { name: '斜着看', off: 0, tilt: 0.12, say: '视线没有正对刻度线，读出来偏大' },
} as const
export type WayKey = keyof typeof WAYS
/** 按这种做法读出来的数（cm），保留到分度值的下一位 */
export const rulerReading = (w: WayKey) => Math.round((TICKET + WAYS[w].off + WAYS[w].tilt) * 100) / 100
/** 几次测量取平均（cm），结果保留的位数和测量值一样 */
export const mean = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length * 100) / 100

// ---------- 第 2 课：停表 ----------
/** 停表的读数：小表盘读分，大表盘读秒，加起来 */
export const stopwatch = (seconds: number) => ({ min: Math.floor(seconds / 60), sec: Math.round((seconds % 60) * 10) / 10 })
export const RUNS = { fast: { name: '高铁', seconds: 6.0 }, slow: { name: '货运列车', seconds: 96.5 } } as const
export type RunKey = keyof typeof RUNS

// ---------- 第 3 课：参照物 ----------
export const REFS = { platform: '站台', mine: '自己坐的这列车', other: '旁边开走的那列车' } as const
export type RefKey = keyof typeof REFS
export const THINGS = { me: '坐在车里的我', other: '旁边那列车', platform: '站台' } as const
export type ThingKey = keyof typeof THINGS
/** 各样东西相对站台的速度（m/s）：我坐的车停着，旁边那列车在开 */
const V_GROUND: Record<RefKey & ThingKey | 'me' | 'mine', number> = { platform: 0, me: 0, mine: 0, other: 5 }
/** 以某个参照物来看，这样东西是运动的还是静止的 */
export const moving = (thing: ThingKey, ref: RefKey) => V_GROUND[thing] !== V_GROUND[ref]

// ---------- 第 4 课：速度 ----------
export const TRAINS = { hsr: { name: '高铁', kmh: 300 }, normal: { name: '普通列车', kmh: 120 }, freight: { name: '货运列车', kmh: 72 } } as const
export type TrainKey = keyof typeof TRAINS
/** 1 m/s = 3.6 km/h */
export const toMs = (kmh: number) => kmh / 3.6
export const toKmh = (ms: number) => ms * 3.6
/** 速度 = 路程 ÷ 时间 */
export const speed = (s: number, t: number) => s / t
/** 这列车 t 秒走多远（m） */
export const distance = (train: TrainKey, t: number) => toMs(TRAINS[train].kmh) * t

// ---------- 第 5 课：匀速和变速 ----------
export const ACC = 0.5, CRUISE = 10        // 出站时的加速度（m/s²）、匀速段的速度（m/s）
/** 列车出站：从静止匀加速；另一列一直匀速。t 秒时离起点多远（m） */
export const posAt = (kind: 'uniform' | 'speeding', t: number) => kind === 'uniform' ? CRUISE * t : 0.5 * ACC * t * t
/** 每隔 1 秒记一次位置，相邻两次之间走的路程（m） */
export const gaps = (kind: 'uniform' | 'speeding', n: number) => Array.from({ length: n }, (_, i) => posAt(kind, i + 1) - posAt(kind, i))

// ---------- 第 6 课：测量平均速度（小车从斜面上滑下） ----------
export const RAMP = { s: 0.9, t: 3.0 }      // 斜面全长（m）、小车滑完全程的时间（s）
/** 小车从静止匀加速下滑，滑到 s 处用的时间（s） */
export const rampTime = (s: number) => RAMP.t * Math.sqrt(s / RAMP.s)
export const PARTS = {
  whole: { name: '全程', from: 0, to: RAMP.s },
  upper: { name: '上半段', from: 0, to: RAMP.s / 2 },
  lower: { name: '下半段', from: RAMP.s / 2, to: RAMP.s },
} as const
export type PartKey = keyof typeof PARTS
/** 这一段的路程、时间和平均速度 */
export const part = (k: PartKey) => { const p = PARTS[k], s = p.to - p.from, t = rampTime(p.to) - rampTime(p.from); return { s, t, v: s / t } }

// ---------- 第 7 课：赶火车 ----------
export const TRIP = { km: 300, hours: 1.5 }
export const tripSpeed = () => TRIP.km / TRIP.hours
export const BRIDGE = { train: 200, bridge: 1000, v: 30 }
/** 整列车完全通过大桥：车头上桥到车尾下桥，走的是桥长加车长 */
export const bridgeTime = () => (BRIDGE.train + BRIDGE.bridge) / BRIDGE.v
/** 容易算错的做法：只算了桥长 */
export const bridgeTimeWrong = () => BRIDGE.bridge / BRIDGE.v

// ---------- 拓展 ----------
export const REPEATS = [8.64, 8.63, 8.65, 8.64]
