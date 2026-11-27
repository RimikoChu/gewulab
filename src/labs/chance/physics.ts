// 概率实验室的计算核心。画面、读数、任务判定、随堂检测都从这里取数，界面文件里不做计算。
// 随机数一律用固定种子的伪随机数：同一课每次做、自动演示、测试，结果都一样，可以复现。取值约定见规格卡 docs/specs/chance.md。

// ---------- 通用 ----------
/** 固定种子的伪随机数（mulberry32）：返回一个函数，每调用一次给出 [0, 1) 里的下一个数 */
export function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)
/** 分数 m/n 约分 */
export function simp(m: number, n: number) { const g = gcd(m, n) || 1; return { m: m / g, n: n / g } }
/** 概率写成分数：0、1 直接写；能约分的写成“6/36 = 1/6” */
export function fracText(m: number, n: number, full = true) {
  if (m === 0) return full ? `0/${n} = 0` : '0'
  if (m === n) return full ? `${n}/${n} = 1` : '1'
  const s = simp(m, n)
  return s.n === n || !full ? `${s.m}/${s.n}` : `${m}/${n} = ${s.m}/${s.n}`
}
/** 频率一律保留三位小数 */
export const f3 = (v: number) => v.toFixed(3)

// ---------- 第 1 课 摸球箱：必然事件、不可能事件、随机事件 ----------
export type Ball = 'red' | 'white'
export const BOX1 = {
  jia: { name: '甲箱', red: 5, white: 0 },
  yi: { name: '乙箱', red: 0, white: 5 },
  bing: { name: '丙箱', red: 3, white: 2 },
} as const
export type Box1 = keyof typeof BOX1
export const DRAWS1 = 5
/** 事件“摸到红球”在这只箱子里是哪一种事件 */
export function kind1(box: Box1): '必然事件' | '不可能事件' | '随机事件' {
  const b = BOX1[box]
  return b.red === b.red + b.white ? '必然事件' : b.red === 0 ? '不可能事件' : '随机事件'
}
/** 从箱子里摸一个、看颜色、放回，连做 5 次；round 是第几轮（丙箱做两轮，两轮结果不一样） */
export function draws1(box: Box1, round = 0): Ball[] {
  const b = BOX1[box], list: Ball[] = [...Array(b.red).fill('red'), ...Array(b.white).fill('white')]
  const r = rng(SEED1[box] + round * 101)
  return Array.from({ length: DRAWS1 }, () => list[Math.floor(r() * list.length)])
}
const SEED1: Record<Box1, number> = { jia: 11, yi: 12, bing: 6 }

// ---------- 第 2 课 骰子：概率 P(A) = m/n，0 ≤ P(A) ≤ 1 ----------
export const FACES = [1, 2, 3, 4, 5, 6]
export type DieEv = 'six' | 'even' | 'lt7' | 'seven'
export const DIE_EV: Record<DieEv, { name: string; faces: number[] }> = {
  six: { name: '点数为 6', faces: [6] },
  even: { name: '点数为偶数', faces: [2, 4, 6] },
  lt7: { name: '点数小于 7', faces: [1, 2, 3, 4, 5, 6] },
  seven: { name: '点数为 7', faces: [] },
}
/** 掷一枚骰子，事件包含几种结果、概率多少 */
export function dieProb(ev: DieEv) { const m = DIE_EV[ev].faces.length; return { m, n: 6, p: m / 6, text: fracText(m, 6) } }
/** 第 2 课第一次掷骰子掷出的点数（固定种子） */
export const roll2 = () => 1 + Math.floor(rng(23)() * 6)

// ---------- 第 3 课 转盘和扑克：每种结果可能性相等时 P(A) = m/n ----------
/** 转盘分成 8 个大小相同的扇形，从指针正下方开始顺时针的颜色 */
export const WHEEL = ['red', 'yellow', 'green', 'red', 'green', 'yellow', 'red', 'green'] as const
export type Hue = (typeof WHEEL)[number]
export const HUE_NAME: Record<Hue, string> = { red: '红', yellow: '黄', green: '绿' }
export function wheelProb(ev: 'red' | 'notRed') {
  const m = WHEEL.filter(c => (ev === 'red' ? c === 'red' : c !== 'red')).length
  return { m, n: WHEEL.length, p: m / WHEEL.length, text: fracText(m, WHEEL.length) }
}
/** 第 3 课转一次转盘停在第几格（固定种子），和转过的整圈数 */
export const spin3 = () => { const r = rng(31); return { sector: Math.floor(r() * WHEEL.length), turns: 4 + Math.floor(r() * 2) } }
/** 13 张黑桃，从 A 到 K */
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
export const FACE_CARDS = ['J', 'Q', 'K']
export function cardProb() { return { m: FACE_CARDS.length, n: RANKS.length, p: FACE_CARDS.length / RANKS.length, text: fracText(FACE_CARDS.length, RANKS.length) } }
/** 洗好扣着的 13 张牌的顺序，和抽出来的那一张（第几张） */
export function deck3() { const r = rng(37), d = [...RANKS]; for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [d[i], d[j]] = [d[j], d[i]] } return { order: d, pick: 7 } }

// ---------- 第 4 课 列表法：同时掷两枚骰子 ----------
export const PAIRS = FACES.flatMap(a => FACES.map(b => [a, b] as [number, number]))
export const DICE_EV = {
  same: { name: '两枚点数相同', ok: (a: number, b: number) => a === b },
  sum9: { name: '点数之和是 9', ok: (a: number, b: number) => a + b === 9 },
  has2: { name: '至少一枚是 2', ok: (a: number, b: number) => a === 2 || b === 2 },
} as const
export type DiceEv = keyof typeof DICE_EV
export function diceProb(ev: DiceEv) { const m = PAIRS.filter(([a, b]) => DICE_EV[ev].ok(a, b)).length; return { m, n: 36, p: m / 36, text: fracText(m, 36) } }
/** 第 4 课掷一次两枚骰子的结果（第 1 枚白、第 2 枚红） */
export const roll4 = (): [number, number] => { const r = rng(41); return [1 + Math.floor(r() * 6), 1 + Math.floor(r() * 6)] }

// ---------- 第 5 课 树状图：摸两次球，放回和不放回 ----------
/** 箱里三个球：1 个红球、2 个白球（编号白₁、白₂，好区分） */
export const BALLS5 = ['红', '白₁', '白₂']
export type Mode5 = 'back' | 'keep'
/** 两次摸球的全部结果：放回时第二次还是 3 个球；不放回时只剩 2 个 */
export function tree5(mode: Mode5) {
  return BALLS5.flatMap((a, i) => BALLS5.filter((_, j) => mode === 'back' || j !== i).map(b => [a, b] as [string, string]))
}
const white = (s: string) => s.startsWith('白')
/** 事件“两次都摸到白球” */
export function both5(mode: Mode5) { const all = tree5(mode), m = all.filter(([a, b]) => white(a) && white(b)).length; return { m, n: all.length, p: m / all.length, text: fracText(m, all.length) } }
/** 第 5 课摸两次的结果（固定种子） */
export function draw5(mode: Mode5): [number, number] { const r = rng(mode === 'back' ? 51 : 52), a = Math.floor(r() * 3); if (mode === 'back') return [a, Math.floor(r() * 3)]; const rest = [0, 1, 2].filter(i => i !== a); return [a, rest[Math.floor(r() * 2)]] }

// ---------- 第 6 课 抛硬币：频率稳定在概率附近 ----------
export const COIN_P = 0.5
export const CREW = { a: { name: '第一组', seed: 50 }, b: { name: '第二组', seed: 36 } } as const
export type Crew = keyof typeof CREW
export const STOPS = [10, 100, 1000] as const
/** 抛 n 次硬币，每一次是不是正面朝上 */
export function flips(crew: Crew, n = 1000) { const r = rng(CREW[crew].seed); return Array.from({ length: n }, () => r() < COIN_P) }
/** 一串结果的累计频率：第 i 项是前 i + 1 次里“成功”的频率 */
export function running(hits: boolean[]) { let k = 0; return hits.map((h, i) => (k += h ? 1 : 0) / (i + 1)) }
/** 前 n 次里成功了几次 */
export const count = (hits: boolean[], n: number) => hits.slice(0, n).reduce((s, h) => s + (h ? 1 : 0), 0)

// ---------- 第 7 课 抽检：用频率估计次品率 ----------
/** 这一批瓷碗 10000 只。DEFECT 是模拟时用的次品率：现实里不知道，界面上不出现，只能靠抽检估计 */
export const BATCH = 10000
export const DEFECT = 0.04
export const SAMPLES = [50, 200, 1000] as const
/** 流水线上依次抽检的碗，每一只是不是次品 */
export function bowls(n = 1000) { const r = rng(449); return Array.from({ length: n }, () => r() < DEFECT) }
/** 次品率的估计值：抽检够多以后，取频率稳定的那个数（保留两位小数） */
export const rateEstimate = (defects: number, n: number) => Math.round((defects / n) * 100) / 100
/** 这一批里大约有多少只次品 */
export const batchDefects = (rate: number) => Math.round(BATCH * rate)

// ---------- 拓展 投针、抛图钉 ----------
/** 投针：纸上平行线间距 6 cm，针长 3 cm（针长是间距的一半）。这时针和线相交的概率是 1/π，π ≈ 投的次数 ÷ 相交的次数 */
export const NEEDLE = { d: 0.06, l: 0.03 }
export interface Drop { x: number; y: number; th: number; hit: boolean }
/** 投 n 根针：针中点的位置（纸上，m）、方向，是否和某条线相交 */
export function needles(n = 1000, w = 0.54, h = 0.36): Drop[] {
  const r = rng(15)
  return Array.from({ length: n }, () => {
    const x = r() * w, y = r() * h, th = r() * Math.PI
    const dy = Math.abs(Math.sin(th)) * NEEDLE.l / 2, k = Math.floor((y - dy) / NEEDLE.d), k2 = Math.floor((y + dy) / NEEDLE.d)
    return { x, y, th, hit: k !== k2 }
  })
}
/** 由投针的结果估计 π：π ≈ 2l·n / (d·m) */
export const piEstimate = (n: number, m: number) => (m ? (2 * NEEDLE.l * n) / (NEEDLE.d * m) : NaN)
/** 抛图钉：钉尖朝上还是着地（模拟用的倾向见规格卡，界面上不出现）；两种结果不是等可能的 */
const TACK_UP = 0.6
export function tacks(n = 1000) { const r = rng(3); return Array.from({ length: n }, () => r() < TACK_UP) }
