// 基因的表达实验室的计算核心：碱基配对、复制、转录、遗传密码、翻译、突变。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 遗传密码用标准遗传密码表。序列一律按 5′→3′ 写，除非函数名里说明是模板链（3′→5′ 写）。
export type DnaBase = 'A' | 'T' | 'G' | 'C'
export type RnaBase = 'A' | 'U' | 'G' | 'C'
export type Base = DnaBase | 'U'

const DNA_PAIR: Record<DnaBase, DnaBase> = { A: 'T', T: 'A', G: 'C', C: 'G' }
/** 嘌呤（双环，画得长）：A、G；其余是嘧啶 */
export const isPurine = (b: Base) => b === 'A' || b === 'G'
/** 两个碱基之间的氢键数：A—T（A—U）两根，G—C 三根 */
export const hBonds = (b: Base) => (b === 'G' || b === 'C' ? 3 : 2)

// ---------- 第 1 课：碱基互补配对、反向平行 ----------
/** 第 1 课那条链（5′→3′） */
export const L1_TOP = 'ATGCGTACCGAG'
/** 逐个配对：和 s 一一对着的那条链（方向和 s 相反，所以从左往右是 3′→5′） */
export const complement = (s: string) => [...s].map(b => DNA_PAIR[b as DnaBase]).join('')
/** 互补链按 5′→3′ 写出来：反向互补 */
export const antiparallel = (s: string) => [...complement(s)].reverse().join('')
/** 以 s 为一条链的双链 DNA 里 A、T、G、C 各多少个 */
export function counts(s: string) {
  const all = s + complement(s), n = (b: DnaBase) => [...all].filter(x => x === b).length
  return { A: n('A'), T: n('T'), G: n('G'), C: n('C') }
}
/** 双链中嘌呤和嘧啶之比 (A+G)/(T+C) */
export const purineRatio = (s: string) => { const c = counts(s); return (c.A + c.G) / (c.T + c.C) }

// ---------- 第 2 课：半保留复制 ----------
export const L2_SEQ = 'GATTCGCAATGCCTAG'
/** 一个 DNA 复制 n 代以后：DNA 个数、含母链的 DNA 个数、母链占全部链的比例、一共用掉的游离脱氧核苷酸（bp 是碱基对数） */
export function replicate(n: number, bp: number) {
  const dna = 2 ** n
  return { dna, withParent: n === 0 ? 1 : 2, onlyNew: n === 0 ? 0 : dna - 2, strands: 2 * dna, parentShare: 2 / (2 * dna), used: (dna - 1) * 2 * bp }
}

// ---------- 第 3 课：DNA 的多样性 ----------
/** n 对碱基，排列方式有几种 */
export const variety = (n: number) => 4 ** n
export const L3_PAIRS = [1, 3, 10] as const

// ---------- 第 4 课：转录 ----------
/** 第 4 课的基因：非模板链（编码链），5′→3′。教学用的示意序列 */
export const GENE = 'ATGGCTCACGAGTGGAAATGA'
/** 模板链，按 3′→5′ 从左往右写（和编码链一一对着） */
export const TEMPLATE = complement(GENE)
const RNA_PAIR: Record<DnaBase, RnaBase> = { A: 'U', T: 'A', G: 'C', C: 'G' }
/** 以模板链（3′→5′ 写）为模板合成的 mRNA（5′→3′） */
export const transcribe = (template: string) => [...template].map(b => RNA_PAIR[b as DnaBase]).join('')
/** 编码链把 T 换成 U，就是 mRNA */
export const tToU = (s: string) => s.replace(/T/g, 'U')
export const MRNA = transcribe(TEMPLATE)

// ---------- 第 5 课：标准遗传密码表 ----------
const B = 'UCAG'
const AA = 'FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG'
export const AA_NAME: Record<string, string> = {
  F: '苯丙氨酸', L: '亮氨酸', S: '丝氨酸', Y: '酪氨酸', C: '半胱氨酸', W: '色氨酸', P: '脯氨酸', H: '组氨酸', Q: '谷氨酰胺', R: '精氨酸',
  I: '异亮氨酸', M: '甲硫氨酸', T: '苏氨酸', N: '天冬酰胺', K: '赖氨酸', V: '缬氨酸', A: '丙氨酸', D: '天冬氨酸', E: '谷氨酸', G: '甘氨酸', '*': '终止',
}
/** 64 个密码子 → 氨基酸的单字母代号（终止是 *） */
export const CODE: Record<string, string> = Object.fromEntries([...AA].map((a, i) => [B[i >> 4] + B[(i >> 2) & 3] + B[i & 3], a]))
export const START = 'AUG'
export const STOPS = Object.keys(CODE).filter(c => CODE[c] === '*')
export const codonOf = (c: string) => CODE[c]
/** 密码子对应的氨基酸中文名（终止密码子返回“终止”） */
export const aaName = (c: string) => AA_NAME[CODE[c]]
/** 编码某种氨基酸的全部密码子（简并） */
export const synonyms = (aa: string) => Object.keys(CODE).filter(c => CODE[c] === aa)
/** 把 mRNA 从 from 起三个一组切开（剩下不足三个的丢掉） */
export const codons = (m: string, from = 0) => { const out: string[] = []; for (let i = from; i + 3 <= m.length; i += 3) out.push(m.slice(i, i + 3)); return out }
/** 起始密码子在哪（第一个 AUG） */
export const startAt = (m: string) => m.indexOf(START)

// ---------- 第 6 课：翻译 ----------
const R_PAIR: Record<RnaBase, RnaBase> = { A: 'U', U: 'A', G: 'C', C: 'G' }
/** 和密码子配对的反密码子（按和密码子一一对着的顺序写） */
export const anticodon = (c: string) => [...c].map(b => R_PAIR[b as RnaBase]).join('')
/** 从第一个 AUG 读起，读到终止密码子为止（或读到头）。返回每个密码子和它的氨基酸；stop 是有没有读到终止 */
export function translate(m: string) {
  const s = startAt(m)
  if (s < 0) return { list: [] as { codon: string; aa: string }[], stop: false }
  const list: { codon: string; aa: string }[] = []
  for (const c of codons(m, s)) { if (CODE[c] === '*') return { list, stop: true }; list.push({ codon: c, aa: CODE[c] }) }
  return { list, stop: false }
}

// ---------- 第 7 课：基因突变 ----------
/** 人血红蛋白 β 链基因开头的一段（编码链） */
export const HBB = 'ATGGTGCACCTGACTCCTGAGGAGAAG'
/** 突变发生的位置：第 7 个密码子 GAG 的中间那个 A（从 0 数是第 19 个） */
export const HBB_AT = 19
export type Mut = 'none' | 'sub' | 'ins' | 'del'
export const MUTS: Record<Mut, string> = { none: '正常', sub: '替换', ins: '增添', del: '缺失' }
/** 突变后的编码链 */
export function mutate(s: string, kind: Mut, at = HBB_AT) {
  if (kind === 'sub') return s.slice(0, at) + 'T' + s.slice(at + 1)       // A → T：GAG → GTG
  if (kind === 'ins') return s.slice(0, at) + 'G' + s.slice(at)           // 多一个 G
  if (kind === 'del') return s.slice(0, at) + s.slice(at + 1)             // 少一个 A
  return s
}
/** 突变后翻译出的氨基酸，以及和正常的相比，从第几个开始不同、一共不同几个 */
export function mutantProtein(kind: Mut) {
  const norm = translate(tToU(HBB)).list.map(x => x.aa), mut = translate(tToU(mutate(HBB, kind))).list.map(x => x.aa)
  const diff = mut.map((a, i) => a !== norm[i]), changed = diff.filter(Boolean).length
  return { aa: mut, diff, changed, first: diff.indexOf(true) }
}

// ---------- 拓展：DNA 指纹 ----------
/** 每个样本切出来的片段长度（示意）：现场样本和三个人 */
export const PRINTS = {
  scene: [820, 610, 450, 300, 190],
  p1: [900, 610, 380, 300, 150],
  p2: [820, 610, 450, 300, 190],
  p3: [820, 540, 450, 260, 190],
} as const
export type PrintKey = keyof typeof PRINTS
/** 两个样本的条带是否完全一样 */
export const samePrint = (a: PrintKey, b: PrintKey) => PRINTS[a].length === PRINTS[b].length && PRINTS[a].every((x, i) => x === PRINTS[b][i])
/** 片段越短跑得越远：0（加样孔）到 1（胶的另一头）。按长度的对数换算，示意 */
export const bandPos = (len: number) => 1 - (Math.log10(len) - 2) / 1.05
