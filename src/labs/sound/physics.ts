// 声现象实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 长度用米，时间用秒，频率用赫兹，声音的强弱用分贝；取值约定写在规格卡 docs/specs/sound.md 里。

// ---------- 第 1 课：声音的产生 ----------
/** 这支音叉每秒振动的次数（Hz）：标准音 A */
export const FORK_HZ = 440
/** 振动一次要多久（s） */
export const period = (f: number) => 1 / f
/** 物体在振动才发声；振动停了，发声也停了 */
export const sounding = (vibrating: boolean) => vibrating

// ---------- 第 2 课：声音的传播 ----------
/** 玻璃罩里剩下的空气（占原来的百分之几）：罩好、抽掉一半、抽到很少 */
export const AIR = [100, 50, 5] as const
/** 罩外听到的铃声有多响（0–1，示意）：空气越少越轻。这里简单地取成和剩下的空气成正比 */
export const heard = (air: number) => Math.max(0, Math.min(1, air / 100))
export const heardWord = (air: number) => air >= 90 ? '清楚' : air >= 40 ? '变轻了' : air >= 1 ? '几乎听不到' : '听不到'
/** 声音能不能在这种地方传播：固体、液体、气体都行，真空不行 */
export const MEDIA = { gas: true, liquid: true, solid: true, vacuum: false } as const

// ---------- 第 3 课：声速和回声 ----------
/** 15 ℃ 时空气里的声速（m/s） */
export const V_AIR = 340
/** 水（常温）和钢铁里的声速（m/s） */
export const V_WATER = 1500, V_STEEL = 5200
export const WALLS = [17, 34, 68] as const
/** 对着 d 米外的墙喊一声，过多久听到回声（s）：声音走了一个来回 */
export const echoTime = (d: number, v = V_AIR) => 2 * d / v
/** 反过来：过了 t 秒听到回声，障碍物有多远（m） */
export const echoDistance = (t: number, v = V_AIR) => v * t / 2
/** 回声比原声晚到 0.1 s 以上，人耳才能把它们分开 */
export const ECHO_GAP = 0.1
export const canTell = (t: number) => t >= ECHO_GAP - 1e-9
/** 画面里把声音放慢了多少倍 */
export const SLOW = 15
/** 拍手之后过了 t 秒，声音的波前离拍手的人多远（m）：先往外走，碰到墙再折回来；回到原处就停 */
export const frontAt = (t: number, d: number, v = V_AIR) => { const s = v * t; return s <= d ? s : Math.max(0, 2 * d - s) }

// ---------- 第 4 课：音调和频率 ----------
/** 钢尺伸出桌边的长度（cm） */
export const OVERHANG = [20, 15, 10] as const
/** 伸出 L 厘米时振动的快慢，是伸出 20 cm 时的多少倍：一端固定的薄钢片，频率和伸出长度的平方成反比 */
export const rate = (L: number) => (OVERHANG[0] / L) ** 2
export const pitchWord = (L: number) => L >= 20 ? '低' : L >= 15 ? '高一些' : '高'

// ---------- 第 5 课：响度 ----------
/** 轻敲、重敲时鼓面的振幅（mm）；分贝仪离鼓的两个位置（m） */
export const AMPS = { soft: 1, hard: 2 } as const
export type HitKey = keyof typeof AMPS
export const NEAR = 0.5, FAR = 1
/** 轻敲、分贝仪在 0.5 m 处时的读数（dB）：这套器材的设定 */
export const L0 = 74
/** 分贝仪的读数（dB）：振幅加倍约高 6 dB，距离加倍约低 6 dB */
export const level = (amp: number, dist: number) => L0 + 20 * Math.log10(amp / AMPS.soft) - 20 * Math.log10(dist / NEAR)

// ---------- 第 6 课：音色 ----------
/** 三种乐器发同一个音时，波形里各次谐波的多少（示意）：音叉只有基音，所以是最简单的正弦波 */
export const TONES = {
  fork: { name: '音叉', mix: [1] },
  guitar: { name: '吉他', mix: [1, 0.55, 0.38, 0.18, 0.1] },
  flute: { name: '长笛', mix: [1, 0.62, 0.08, 0.14] },
} as const
export type ToneKey = keyof typeof TONES
const peaks = new Map<ToneKey, number>()
const raw = (k: ToneKey, ph: number) => TONES[k].mix.reduce((s: number, a, i) => s + a * Math.sin((i + 1) * ph + i * 0.6), 0)
/** 波形：ph 是相位（一个周期是 2π），返回 −1 到 1。三种乐器的周期一样（音调相同）、最大值一样（响度相同），只有形状不同 */
export function wave(k: ToneKey, ph: number) {
  if (!peaks.has(k)) { let m = 0; for (let i = 0; i < 720; i++) m = Math.max(m, Math.abs(raw(k, i / 720 * Math.PI * 2))); peaks.set(k, m) }
  return raw(k, ph) / peaks.get(k)!
}

// ---------- 第 7 课：噪声的控制 ----------
/** 没有任何措施时，人耳处的噪声（dB）；每用上一种办法降多少（dB，示意） */
export const NOISE = 90, CUT = 15
export const WAYS = {
  source: { name: '声源处', how: '给风机罩上隔音罩', say: '防止噪声产生' },
  path: { name: '传播途中', how: '中间推来一道隔音屏', say: '阻断噪声传播' },
  ear: { name: '人耳处', how: '戴上隔音耳罩', say: '防止噪声进入耳朵' },
} as const
export type WayKey = keyof typeof WAYS
/** 用上 n 种办法以后，耳朵里听到多少分贝 */
export const noiseAfter = (n: number) => NOISE - CUT * n
/** 这么响意味着什么：90 dB 以上损害听力，70 dB 以上干扰工作学习，50 dB 以上影响休息睡眠 */
export const verdict = (db: number) => db >= 90 ? '长期听会损害听力' : db >= 70 ? '干扰谈话，影响工作' : db >= 50 ? '影响休息和睡眠' : '比较安静'

// ---------- 拓展 ----------
/** 人能听到的频率范围（Hz） */
export const HEAR = [20, 20000] as const
export const band = (f: number) => f < HEAR[0] ? '次声波' : f > HEAR[1] ? '超声波' : '听得见'
/** 扫频：k 从 0 到 1，频率从 2 Hz 按倍数均匀升到 200000 Hz */
export const sweep = (k: number) => 2 * 10 ** (5 * Math.max(0, Math.min(1, k)))
/** 声呐：超声波在海水里走一个来回用了 t 秒，海有多深（m） */
export const SONAR_T = 4
export const seaDepth = (t: number, v = V_WATER) => v * t / 2
/** 共鸣：两支音叉频率相同，敲响一支，另一支也跟着振动 */
export const resonates = (f1: number, f2: number) => f1 === f2
