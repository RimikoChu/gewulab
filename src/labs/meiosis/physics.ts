// 减数分裂和遗传规律实验室的计算核心。画面、读数、任务判定、随堂检测都从这里取数，界面文件里不做计算。
// 取值约定写在规格卡 docs/specs/meiosis.md 里：减数分裂的示意细胞 2n = 4；果蝇 2n = 8，人 2n = 46。
// 场景单位 1 = 1 cm（这里只做遗传学计算，不涉及长度）。

/** 固定种子的随机数：每次打开抽到的果蝇都一样 */
export function rng(seed: number) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296 }

// ---------- 分数 ----------
export interface Frac { n: number; d: number }
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a))
export const frac = (n: number, d: number): Frac => { const g = gcd(n, d) || 1; return { n: n / g, d: d / g } }
export const mul = (a: Frac, b: Frac) => frac(a.n * b.n, a.d * b.d)
export const fstr = (f: Frac) => (f.d === 1 ? String(f.n) : `${f.n}/${f.d}`)
export const fval = (f: Frac) => f.n / f.d

// ---------- 染色体数 ----------
export const CHROMOSOMES = { model: 4, fly: 8, human: 46 } as const

// ---------- 第 1、2 课：减数分裂各时期 ----------
/**
 * 减数分裂各时期（一个细胞里）。chr、dna 都按 2n 体细胞的倍数写：chr 以 n 为单位，dna 以 n 为单位（复制前的体细胞 DNA 记作 2n）。
 * 例如 2n = 4 时，chr: 2 → 4 条；dna: 4 → 8 个。
 */
export const PHASES = [
  { id: 'g1', name: '间期（复制前）', short: '间期', chr: 2, dna: 2, sister: false, division: 0 },
  { id: 's', name: '间期（复制后）', short: '复制', chr: 2, dna: 4, sister: true, division: 0 },
  { id: 'pro1', name: '减数第一次分裂前期', short: '前期Ⅰ', chr: 2, dna: 4, sister: true, division: 1 },
  { id: 'meta1', name: '减数第一次分裂中期', short: '中期Ⅰ', chr: 2, dna: 4, sister: true, division: 1 },
  { id: 'ana1', name: '减数第一次分裂后期', short: '后期Ⅰ', chr: 2, dna: 4, sister: true, division: 1 },
  { id: 'telo1', name: '减数第一次分裂末期', short: '末期Ⅰ', chr: 1, dna: 2, sister: true, division: 1 },
  { id: 'pro2', name: '减数第二次分裂前期', short: '前期Ⅱ', chr: 1, dna: 2, sister: true, division: 2 },
  { id: 'meta2', name: '减数第二次分裂中期', short: '中期Ⅱ', chr: 1, dna: 2, sister: true, division: 2 },
  { id: 'ana2', name: '减数第二次分裂后期', short: '后期Ⅱ', chr: 2, dna: 2, sister: false, division: 2 },
  { id: 'telo2', name: '减数第二次分裂末期', short: '末期Ⅱ', chr: 1, dna: 1, sister: false, division: 2 },
] as const
export type PhaseId = typeof PHASES[number]['id']
export const phase = (id: PhaseId) => PHASES.find(p => p.id === id)!
/** 一个细胞在这个时期里的数目：染色体、核 DNA、染色单体、四分体、同源染色体对数。twoN 是体细胞的染色体数 */
export function count(id: PhaseId, twoN: number) {
  const p = phase(id), n = twoN / 2
  const chr = p.chr * n, dna = p.dna * n
  return {
    chr, dna,
    chromatid: p.sister ? dna : 0,
    tetrad: id === 'pro1' || id === 'meta1' ? n : 0,
    homologPairs: p.division === 0 || id === 'pro1' || id === 'meta1' || id === 'ana1' ? n : 0,
  }
}
/** 末期Ⅰ以后的细胞里还有没有同源染色体：没有 */
export const hasHomologs = (id: PhaseId) => phase(id).division < 2 && id !== 'telo1'

/** 第 2 课的曲线：按时期依次取一个细胞里的染色体数和核 DNA 数 */
export const curve = (twoN: number) => PHASES.map(p => ({ id: p.id, short: p.short, ...count(p.id, twoN) }))

// ---------- 第 3 课：精子和卵细胞的形成 ----------
export const GAMETOGENESIS = {
  sperm: { origin: '精原细胞', primary: '初级精母细胞', secondary: ['次级精母细胞', '次级精母细胞'], end: ['精细胞', '精细胞', '精细胞', '精细胞'], gametes: 4, polar: 0, equal: true },
  egg: { origin: '卵原细胞', primary: '初级卵母细胞', secondary: ['次级卵母细胞', '极体'], end: ['卵细胞', '极体', '极体', '极体'], gametes: 1, polar: 3, equal: false },
} as const
export type GameteKind = keyof typeof GAMETOGENESIS
/** 一个原始生殖细胞经减数分裂最后得到几个能受精的生殖细胞 */
export const gametesFrom = (k: GameteKind) => GAMETOGENESIS[k].gametes

// ---------- 第 4 课：受精作用、配子的多样性 ----------
/** 只考虑非同源染色体自由组合（不算交叉互换），n 对同源染色体能产生的配子种类 */
export const gameteKinds = (pairs: number) => 2 ** pairs
/** 受精卵的染色体数：精子 + 卵细胞 */
export const zygote = (sperm: number, egg: number) => sperm + egg
/** 一个精原细胞（不交叉互换）产生 4 个精子，只有 2 种 */
export const kindsFromOneSpermatogonium = 2
/** 得到某一种特定配子的概率：每对都要“选中”那一条 */
export const oneGameteProb = (pairs: number) => frac(1, 2 ** pairs)

// ---------- 第 5 课：分离定律（果蝇长翅 V、残翅 v） ----------
export type Mono = string   // 两个字母，如 'Vv'
/** 一对等位基因按大写在前写好 */
export const norm = (a: string, b: string) => (a === a.toUpperCase() && b !== b.toUpperCase() ? a + b : b === b.toUpperCase() && a !== a.toUpperCase() ? b + a : [a, b].sort().join(''))
/** 一个个体能产生的配子：两个基因分离，各进入一个配子 */
export const gametesOf = (g: Mono) => (g[0] === g[1] ? [g[0]] : [g[0], g[1]])
/** 雌雄配子随机结合的棋盘格：每格出现机会相等，返回 2×2 共 4 格 */
export function punnett(a: Mono, b: Mono) { const out: string[] = []; for (const y of b.split('')) for (const x of a.split('')) out.push(norm(x, y)); return out }
/** 后代各种基因型的份数（共 4 份） */
export function tally(cells: string[]) { const t: Record<string, number> = {}; for (const c of cells) t[c] = (t[c] ?? 0) + 1; return t }
export const dominant = (g: string) => g[0] === g[0].toUpperCase()
export const WING = { V: '长翅', v: '残翅' } as const
export const wingOf = (g: Mono) => (dominant(g) ? WING.V : WING.v)
/** 显性∶隐性 的份数 */
export function phenoRatio(cells: string[]) { const d = cells.filter(dominant).length; return [d, cells.length - d] as [number, number] }
/** 孟德尔豌豆杂交实验中子二代高茎和矮茎的株数 */
export const MENDEL_F2 = { tall: 787, short: 277 }

/** 从一种杂交里按固定种子抽 n 只后代（每只是一个基因型）：体现“比例接近、不一定正好” */
export function sample(a: Mono, b: Mono, n: number, seed: number) {
  const r = rng(seed), A = a.split(''), B = b.split('')
  return Array.from({ length: n }, () => norm(A[Math.floor(r() * 2)], B[Math.floor(r() * 2)]))
}
export const F2_N = 48, TEST_N = 40
export const F2_SAMPLE = sample('Vv', 'Vv', F2_N, 21)
export const TEST_SAMPLE = sample('Vv', 'vv', TEST_N, 33)
/** 数出来的长翅、残翅只数 */
export const countWing = (s: string[]) => { const long = s.filter(dominant).length; return { long, short: s.length - long } }
export const ratioStr = (a: number, b: number) => (b ? (a / b).toFixed(2) : '—')

// ---------- 第 6 课：自由组合定律（体色 E 灰体、e 黑檀体；翅 V 长翅、v 残翅） ----------
export type Di = string   // 四个字母，如 'EeVv'
export const BODY = { E: '灰体', e: '黑檀体' } as const
/** 两对基因各自分离、彼此自由组合：EeVv 产生 EV、Ev、eV、ev 四种配子，各占 1/4 */
export function diGametes(g: Di) { const out: string[] = []; for (const a of gametesOf(g.slice(0, 2))) for (const b of gametesOf(g.slice(2))) out.push(a + b); return out }
/** 4×4 棋盘格：行是母本的配子，列是父本的配子 */
export function diPunnett(a: Di, b: Di) {
  const top = diGametes(a), left = diGametes(b), cells: string[] = []
  for (const y of left) for (const x of top) cells.push(norm(x[0], y[0]) + norm(x[1], y[1]))
  return { top, left, cells }
}
export const diPheno = (g: Di) => `${dominant(g.slice(0, 2)) ? BODY.E : BODY.e}${dominant(g.slice(2)) ? WING.V : WING.v}`
export const DI_ORDER = ['灰体长翅', '灰体残翅', '黑檀体长翅', '黑檀体残翅'] as const
/** 各表型的份数，按 DI_ORDER 排 */
export function diRatio(cells: string[]) { return DI_ORDER.map(p => cells.filter(c => diPheno(c) === p).length) }
/** 两对基因的概率：乘法原理 */
export const pBoth = (p1: Frac, p2: Frac) => mul(p1, p2)
export function diSample(a: Di, b: Di, n: number, seed: number) {
  const r = rng(seed), ga = diGametes(a), gb = diGametes(b)
  return Array.from({ length: n }, () => { const x = ga[Math.floor(r() * ga.length)], y = gb[Math.floor(r() * gb.length)]; return norm(x[0], y[0]) + norm(x[1], y[1]) })
}
export const DI_N = 64
export const DI_SAMPLE = diSample('EeVv', 'EeVv', DI_N, 57)

// ---------- 第 7 课：伴性遗传 ----------
/** 一个个体：两条性染色体，X 上带基因（大写显性），Y 上没有这个基因，用 'Y' 表示 */
export type SexGeno = [string, string]   // 如 ['XW','Xw']、['XW','Y']
export const isMale = (g: SexGeno) => g.includes('Y')
/** 雌雄配子随机结合：返回 4 个后代 */
const upFirst = (a: string, b: string): SexGeno => (b[1] === b[1].toUpperCase() && a[1] !== a[1].toUpperCase() ? [b, a] : [a, b])
export function xCross(mom: SexGeno, dad: SexGeno) { const out: SexGeno[] = []; for (const d of dad) for (const m of mom) out.push(d === 'Y' ? [m, 'Y'] : upFirst(m, d)); return out }
/** X 染色体上的基因是不是表现出隐性性状 */
export const showsRecessive = (g: SexGeno) => g.filter(x => x !== 'Y').every(x => x[1] === x[1].toLowerCase())
export const xStr = (g: SexGeno) => g.map(x => (x === 'Y' ? 'Y' : `X${x[1]}`)).join('')
export const EYE = { W: '红眼', w: '白眼' } as const
/** 白眼果蝇的杂交：P 红眼雌 × 白眼雄 */
export const FLY_P = { mom: ['XW', 'XW'] as SexGeno, dad: ['Xw', 'Y'] as SexGeno }
export const FLY_F1 = xCross(FLY_P.mom, FLY_P.dad)
export const FLY_F2 = xCross(FLY_F1.find(g => !isMale(g))!, FLY_F1.find(isMale)!)
/** 子二代里红眼∶白眼，白眼里雄蝇占几份 */
export function eyeTally(list: SexGeno[]) { const white = list.filter(showsRecessive); return { red: list.length - white.length, white: white.length, whiteMale: white.filter(isMale).length } }
export const XF2_N = 48
export const XF2_SAMPLE = (() => { const r = rng(71); return Array.from({ length: XF2_N }, () => FLY_F2[Math.floor(r() * 4)]) })()

/** 红绿色盲的两种婚配（B 正常，b 色盲） */
export const COLORBLIND = {
  carrier: { name: '携带者女 × 正常男', mom: ['XB', 'Xb'] as SexGeno, dad: ['XB', 'Y'] as SexGeno },
  affected: { name: '色盲女 × 正常男', mom: ['Xb', 'Xb'] as SexGeno, dad: ['XB', 'Y'] as SexGeno },
}
export type CbKey = keyof typeof COLORBLIND
/** 一种婚配里：儿子中色盲的概率、女儿中色盲的概率、女儿中携带者的概率 */
export function cbOdds(k: CbKey) {
  const kids = xCross(COLORBLIND[k].mom, COLORBLIND[k].dad), sons = kids.filter(isMale), girls = kids.filter(g => !isMale(g))
  const carrier = girls.filter(g => !showsRecessive(g) && g.some(x => x === 'Xb')).length
  return { kids, son: frac(sons.filter(showsRecessive).length, sons.length), girl: frac(girls.filter(showsRecessive).length, girls.length), carrier: frac(carrier, girls.length), all: frac(kids.filter(showsRecessive).length, kids.length) }
}

// ---------- 拓展：遗传咨询的概率 ----------
/** 双亲都是 Aa：孩子患病（aa）的概率 */
export const pAffected = (a: Mono, b: Mono) => { const c = punnett(a, b); return frac(c.filter(x => !dominant(x)).length, 4) }
/** 双亲都是 Aa，已知孩子表现正常：他是携带者（Aa）的概率 */
export function pCarrierGivenNormal(a: Mono, b: Mono) { const c = punnett(a, b).filter(dominant); return frac(c.filter(x => x[0] !== x[1]).length, c.length) }
/** 正常个体有 p 的可能是 Aa，和一个 Aa 婚配：孩子患病的概率 */
export const pChildOf = (p: Frac) => mul(p, pAffected('Aa', 'Aa'))
