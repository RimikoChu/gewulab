// 遗传和变异实验室的计算核心：性状表、染色体条数、杂交组合、抽样。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 抽样都用固定种子的随机数，每次打开都一样。取值约定写在规格卡 docs/specs/gene.md 里。

/** 可重复的随机数（线性同余） */
export function rng(seed: number) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296 }

// ---------- 第 1 课：性状和相对性状 ----------
export const TRAITS = {
  stem: { name: '茎的高度', a: '高茎', b: '矮茎' },
  seed: { name: '种子的形状', a: '圆粒', b: '皱粒' },
  flower: { name: '花的颜色', a: '紫花', b: '白花' },
} as const
export type TraitKey = keyof typeof TRAITS
export const TRAIT_KEYS = Object.keys(TRAITS) as TraitKey[]
/** 一个性状表现：哪种生物、哪个性状、什么表现 */
export interface Form { species: string; trait: string; form: string }
/** 同种生物、同一性状的不同表现，才是一对相对性状 */
export const isRelative = (a: Form, b: Form) => a.species === b.species && a.trait === b.trait && a.form !== b.form
/** 画面里的株高（m）：孟德尔论文里高茎 6–7 英尺、矮茎 0.75–1.5 英尺，取整 */
export const HEIGHT = { tall: 2.0, short: 0.4 }

// ---------- 第 2 课：染色体、DNA 和基因 ----------
export const LEVELS = [
  { key: 'cell', name: '细胞', text: '根尖的细胞，中间是细胞核' },
  { key: 'nucleus', name: '细胞核', text: '细胞核里有染色体，分裂时最清楚' },
  { key: 'chromosome', name: '染色体', text: '染色体主要由 DNA 和蛋白质组成' },
  { key: 'dna', name: 'DNA', text: 'DNA 是两条长链盘旋成的双螺旋，是主要的遗传物质' },
  { key: 'gene', name: '基因', text: '基因是有遗传效应的 DNA 片段' },
] as const
export type LevelKey = typeof LEVELS[number]['key']
export const CHROMOSOMES = { pea: 14, human: 46 }
export const pairs = (n: number) => n / 2

// ---------- 第 3 课：经生殖细胞传递 ----------
/** 形成生殖细胞：每对分开，只剩一半 */
export const gamete = (n: number) => n / 2
/** 受精：精子和卵细胞的染色体合在一起 */
export const zygote = (a: number, b: number) => a + b
/** 豌豆 7 对染色体的相对长度（示意，第 1 对最长）；第 1 对上画控制茎高矮的基因 */
export const PEA_LEN = [1, 0.92, 0.86, 0.8, 0.74, 0.68, 0.6]

// ---------- 第 4、5 课：杂交 ----------
export type Genotype = 'DD' | 'Dd' | 'dd'
/** 一对基因的组成：显性的 D 写在前面 */
export const norm = (a: string, b: string): Genotype => ((a === 'D' ? a + b : b + a) as Genotype)
/** 含 D 就是高茎 */
export const phenotype = (g: Genotype) => (g.includes('D') ? '高茎' : '矮茎')
export const isTall = (g: Genotype) => g.includes('D')
/** 两个亲本杂交：每方的两个基因各随一个生殖细胞，组合出四种（遗传图解） */
export function cross(p1: Genotype, p2: Genotype): Genotype[] {
  const out: Genotype[] = []
  for (const a of p1) for (const b of p2) out.push(norm(a, b))
  return out
}
/** 一组基因组成里各有几个 */
export function tally(gs: Genotype[]) { const t = { DD: 0, Dd: 0, dd: 0 }; for (const g of gs) t[g]++; return t }
/** 子一代畦的株数（示意） */
export const F1_N = 24
/** 子二代畦的株数（示意） */
export const F2_N = 96
/** 子二代一畦：每株由 Dd × Dd 随机组合出一个基因组成 */
export function f2Bed(n = F2_N, seed = 1863) {
  const r = rng(seed), out: Genotype[] = []
  for (let i = 0; i < n; i++) out.push(norm(r() < 0.5 ? 'D' : 'd', r() < 0.5 ? 'D' : 'd'))
  return out
}
/** 孟德尔论文里子二代的原数 */
export const MENDEL = {
  stem: { a: 787, b: 277 },
  seed: { a: 5474, b: 1850 },
  flower: { a: 705, b: 224 },
}
/** a ÷ b，保留两位 */
export const ratio = (a: number, b: number) => Math.round((a / b) * 100) / 100

// ---------- 第 6 课：人的性别遗传 ----------
export const KARYOTYPE = { male: { auto: 22, sex: 'XY' }, female: { auto: 22, sex: 'XX' } } as const
export type Sex = keyof typeof KARYOTYPE
/** 教材的模拟：精子袋黑白棋子各 10 枚（黑 Y、白 X），卵细胞袋白棋子 20 枚；每次各摸一枚，记下后放回 */
export const BAGS = { sperm: { X: 10, Y: 10 }, egg: { X: 20 } }
export interface Draw { sperm: 'X' | 'Y'; egg: 'X'; boy: boolean }
export function draws(n: number, seed = 1): Draw[] {
  const r = rng(seed), out: Draw[] = [], total = BAGS.sperm.X + BAGS.sperm.Y
  for (let i = 0; i < n; i++) { const s = r() * total < BAGS.sperm.Y ? 'Y' : 'X'; out.push({ sperm: s, egg: 'X', boy: s === 'Y' }) }
  return out
}
export const ROUND = 10
export const DRAW_TOTAL = 50
export const boys = (ds: Draw[]) => ds.filter(d => d.boy).length

// ---------- 第 7 课：生物的变异 ----------
export const PEANUT = { big: { name: '大花生', mean: 3.2, sd: 0.32 }, small: { name: '小花生', mean: 2.2, sd: 0.24 } } as const
export type PeanutKind = keyof typeof PEANUT
export const SAMPLE = 20
/** 每粒花生果实的长度（cm，一位小数）：正态分布的示意抽样 */
export function peanuts(kind: PeanutKind, n = SAMPLE, seed = kind === 'big' ? 31 : 17) {
  const r = rng(seed), { mean: m, sd } = PEANUT[kind], out: number[] = []
  for (let i = 0; i < n; i++) { const z = Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r()); out.push(Math.round((m + z * sd) * 10) / 10) }
  return out
}
export const mean = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : 0)
/** 两个变异的例子：能不能遗传，看遗传物质变没变 */
export const VARIATION = {
  breed: { text: '大花生和小花生是两个品种，长度不同', heritable: true, why: '品种不同，遗传物质不同' },
  soil: { text: '大花生种在贫瘠的土里，结的果实小', heritable: false, why: '只由环境引起，遗传物质没有改变' },
}

// ---------- 拓展：豆荚里的 3∶1、测交 ----------
/** 子一代（Rr）自花传粉，豆荚里每粒是圆粒（true）还是皱粒：RR、Rr 圆粒，rr 皱粒 */
export function podSeeds(n: number, seed = 3) {
  const r = rng(seed), out: boolean[] = []
  for (let i = 0; i < n; i++) out.push(r() < 0.5 || r() < 0.5)
  return out
}
/** 4 个豆荚，每个的粒数 */
export const PODS = [7, 6, 8, 7]
/** 和矮茎（dd）杂交 */
export const testCross = (g: Genotype) => cross(g, 'dd')
export const TEST_PLANTS = { jia: { name: '甲', g: 'DD' as Genotype }, yi: { name: '乙', g: 'Dd' as Genotype } }
