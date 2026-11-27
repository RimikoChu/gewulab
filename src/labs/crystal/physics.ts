// 分子的形状和晶体实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 角度用度，长度用 pm，密度用 g/cm³，温度用 °C。取值约定写在规格卡 docs/specs/crystal.md 里。
export type V3 = [number, number, number]
const RAD = Math.PI / 180

// ---------- 第 1–4 课：分子 ----------
export type El = 'H' | 'B' | 'C' | 'N' | 'O' | 'F' | 'Na' | 'Cl' | 'Cs' | 'Cu'
/** 价电子数和电负性（鲍林标度，教材的取值） */
export const ATOM: Partial<Record<El, { valence: number; en: number }>> = {
  H: { valence: 1, en: 2.1 }, B: { valence: 3, en: 2.0 }, C: { valence: 4, en: 2.5 }, N: { valence: 5, en: 3.0 }, O: { valence: 6, en: 3.5 }, F: { valence: 7, en: 4.0 },
}
export type MolKey = 'CO2' | 'BF3' | 'CH4' | 'NH3' | 'H2O'
/** center 中心原子，ligand 配位原子，x 配位原子数，angle 教材上的键角，order 键是单键还是双键 */
export const MOLS: Record<MolKey, { name: string; text: string; center: El; ligand: El; x: number; angle: number; order: 1 | 2; shape: string; vsepr: string }> = {
  CO2: { name: '二氧化碳', text: 'CO₂', center: 'C', ligand: 'O', x: 2, angle: 180, order: 2, shape: '直线形', vsepr: '直线形' },
  BF3: { name: '三氟化硼', text: 'BF₃', center: 'B', ligand: 'F', x: 3, angle: 120, order: 1, shape: '平面三角形', vsepr: '平面三角形' },
  CH4: { name: '甲烷', text: 'CH₄', center: 'C', ligand: 'H', x: 4, angle: Math.acos(-1 / 3) / RAD, order: 1, shape: '正四面体形', vsepr: '正四面体形' },
  NH3: { name: '氨', text: 'NH₃', center: 'N', ligand: 'H', x: 3, angle: 107, order: 1, shape: '三角锥形', vsepr: '四面体形' },
  H2O: { name: '水', text: 'H₂O', center: 'O', ligand: 'H', x: 2, angle: 105, order: 1, shape: 'V 形', vsepr: '四面体形' },
}
/** 一个配位原子最多能接受的电子数：氢是 1，其余是 8 − 价电子数 */
export const accept = (el: El) => el === 'H' ? 1 : 8 - ATOM[el]!.valence
/** σ 键电子对数 = 配位原子数 */
export const sigmaPairs = (m: MolKey) => MOLS[m].x
/** 中心原子上的孤电子对数：½(a − x·b) */
export const lonePairs = (m: MolKey) => (ATOM[MOLS[m].center]!.valence - MOLS[m].x * accept(MOLS[m].ligand)) / 2
/** 价层电子对数 */
export const pairs = (m: MolKey) => sigmaPairs(m) + lonePairs(m)
/** n 对电子对离得最远时，两两之间的夹角（度）：2 对 180，3 对 120，4 对 arccos(−1/3) */
export const idealAngle = (n: number) => n === 2 ? 180 : n === 3 ? 120 : Math.acos(-1 / 3) / RAD

const norm = (v: V3): V3 => { const l = Math.hypot(...v); return [v[0] / l, v[1] / l, v[2] / l] }
/** 各根键、各对孤电子对从中心原子指出去的方向（单位向量）。按教材的键角摆 */
export function dirs(m: MolKey): { bonds: V3[]; lone: V3[] } {
  const a = MOLS[m].angle * RAD
  if (m === 'CO2') return { bonds: [[1, 0, 0], [-1, 0, 0]], lone: [] }
  if (m === 'BF3') return { bonds: [90, 210, 330].map(d => [Math.cos(d * RAD), Math.sin(d * RAD), 0] as V3), lone: [] }
  if (m === 'H2O') { const b = 57 * RAD; return { bonds: [[Math.sin(a / 2), -Math.cos(a / 2), 0], [-Math.sin(a / 2), -Math.cos(a / 2), 0]], lone: [[0, Math.cos(b), Math.sin(b)], [0, Math.cos(b), -Math.sin(b)]] } }
  // 三根键绕竖轴均匀排开：键和竖轴的夹角 t 由键角定，cos a = 1 − 1.5 sin² t
  const t = Math.asin(Math.sqrt((1 - Math.cos(a)) / 1.5))
  const three = [90, 210, 330].map(d => norm([Math.sin(t) * Math.cos(d * RAD), -Math.cos(t), Math.sin(t) * Math.sin(d * RAD)]))
  return m === 'CH4' ? { bonds: [[0, 1, 0], ...three], lone: [] } : { bonds: three, lone: [[0, 1, 0]] }
}
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
/** 键角（度）：由摆出来的两根键算，应当和教材的键角一致 */
export const bondAngle = (m: MolKey) => { const b = dirs(m).bonds; return Math.acos(Math.max(-1, Math.min(1, dot(b[b.length - 2], b[b.length - 1])))) / RAD }
/** 度分写法：109.47 → 109°28′，整度不写分 */
export function angleText(deg: number) { const t = Math.round(deg * 60), d = Math.floor(t / 60), mm = t % 60; return mm ? `${d}°${mm}′` : `${d}°` }
/** 杂化：杂化轨道数 = 价层电子对数；rest 是没参加杂化的 p 轨道数 */
export function hybrid(m: MolKey) { const n = pairs(m); return { n, type: n === 2 ? 'sp' : n === 3 ? 'sp²' : 'sp³', rest: 4 - n, angle: idealAngle(n) } }
/** 一根键的极性指向哪一头：1 指向配位原子，−1 指向中心原子（指向电负性大的） */
export const bondPolar = (m: MolKey) => ATOM[MOLS[m].ligand]!.en > ATOM[MOLS[m].center]!.en ? 1 : -1
/** 各根键的极性的向量和（一根键记 1）：vec 方向，size 大小 */
export function dipoleSum(m: MolKey) {
  const s = bondPolar(m), v: V3 = [0, 0, 0]
  for (const b of dirs(m).bonds) { v[0] += s * b[0]; v[1] += s * b[1]; v[2] += s * b[2] }
  const size = Math.hypot(...v)
  return { vec: v, size: size < 1e-6 ? 0 : size, polar: size > 1e-6 }
}

// ---------- 第 5、6 课：晶胞 ----------
export type Pos = 'corner' | 'edge' | 'face' | 'body'
export const POS: Record<Pos, { name: string; share: number; text: string; by: number }> = {
  corner: { name: '顶点', share: 1 / 8, text: '1/8', by: 8 }, edge: { name: '棱上', share: 1 / 4, text: '1/4', by: 4 },
  face: { name: '面上', share: 1 / 2, text: '1/2', by: 2 }, body: { name: '体内', share: 1, text: '1', by: 1 },
}
export const POS_KEYS: Pos[] = ['corner', 'edge', 'face', 'body']
export type CellKey = 'NaCl' | 'CsCl' | 'diamond' | 'dryice' | 'Cu'
/** kind：粒子叫什么（界面上的写法）；a 晶胞边长（pm）；M 一个“化学式单位”的摩尔质量；Z 一个晶胞里有几个化学式单位 */
export const CELLS: Record<CellKey, { name: string; formula: string; a: number; M: number; kinds: Record<string, string> }> = {
  NaCl: { name: '氯化钠', formula: 'NaCl', a: 564, M: 58.5, kinds: { Na: 'Na⁺', Cl: 'Cl⁻' } },
  CsCl: { name: '氯化铯', formula: 'CsCl', a: 412, M: 168.5, kinds: { Cs: 'Cs⁺', Cl: 'Cl⁻' } },
  diamond: { name: '金刚石', formula: 'C', a: 357, M: 12, kinds: { C: '碳原子' } },
  dryice: { name: '干冰', formula: 'CO₂', a: 558, M: 44, kinds: { CO2: 'CO₂ 分子' } },
  Cu: { name: '铜', formula: 'Cu', a: 361, M: 63.5, kinds: { Cu: '铜原子' } },
}
export interface Site { p: V3; el: string; pos: Pos }
/** 位置类别：分数坐标里有几个是 0 或 1 */
export function classify(p: V3): Pos { const n = p.filter(v => v === 0 || v === 1).length; return n === 3 ? 'corner' : n === 2 ? 'edge' : n === 1 ? 'face' : 'body' }
const CORNERS: V3[] = [0, 1].flatMap(x => [0, 1].flatMap(y => [0, 1].map(z => [x, y, z] as V3)))
const FACES: V3[] = [[0.5, 0.5, 0], [0.5, 0.5, 1], [0.5, 0, 0.5], [0.5, 1, 0.5], [0, 0.5, 0.5], [1, 0.5, 0.5]]
const EDGES: V3[] = [0, 1].flatMap(u => [0, 1].flatMap(v => [[0.5, u, v], [u, 0.5, v], [u, v, 0.5]] as V3[]))
const FCC = [...CORNERS, ...FACES]
/** 金刚石晶胞里体内的四个碳原子 */
export const DIAMOND_IN: V3[] = [[0.25, 0.25, 0.25], [0.75, 0.75, 0.25], [0.75, 0.25, 0.75], [0.25, 0.75, 0.75]]
/** 一个晶胞图上画出来的全部粒子 */
export function sites(c: CellKey): Site[] {
  const of = (ps: V3[], el: string) => ps.map(p => ({ p, el, pos: classify(p) }))
  if (c === 'NaCl') return [...of(FCC, 'Cl'), ...of(EDGES, 'Na'), ...of([[0.5, 0.5, 0.5]], 'Na')]
  if (c === 'CsCl') return [...of(CORNERS, 'Cl'), ...of([[0.5, 0.5, 0.5]], 'Cs')]
  if (c === 'diamond') return [...of(FCC, 'C'), ...of(DIAMOND_IN, 'C')]
  return of(FCC, c === 'dryice' ? 'CO2' : 'Cu')
}
/** 某一类位置上画了几个某种粒子（不给 el 就不分种类） */
export const drawn = (c: CellKey, pos: Pos, el?: string) => sites(c).filter(s => s.pos === pos && (!el || s.el === el)).length
/** 属于这个晶胞的粒子数：每个粒子按位置乘上份额 */
export const count = (c: CellKey, el?: string) => Math.round(sites(c).filter(s => !el || s.el === el).reduce((n, s) => n + POS[s.pos].share, 0) * 1e6) / 1e6
/** 一个晶胞里有几个化学式单位（NaCl 是 4，金刚石是 8 个 C） */
export const formulaUnits = (c: CellKey) => count(c, Object.keys(CELLS[c].kinds)[0])
export const NA = 6.02e23
/** 晶胞的体积（cm³）：a 是 pm，1 pm = 10⁻¹⁰ cm */
export const cellVolume = (c: CellKey) => (CELLS[c].a * 1e-10) ** 3
/** 由晶胞算密度（g/cm³）：N·M ÷ (N_A·a³) */
export const density = (c: CellKey) => formulaUnits(c) * CELLS[c].M / (NA * cellVolume(c))

// ---------- 第 7 课：四类晶体 ----------
export type CrystalKey = 'Cu' | 'NaCl' | 'dryice' | 'diamond'
/** melt 熔点（干冰是升华的温度；金刚石到 top 还没有熔化）；start 开始加热时的温度；solid、molten：固态、熔融时能不能导电 */
export const CRYSTALS: Record<CrystalKey, { name: string; type: string; particle: string; force: string; melt: number | null; top: number; start: number; solid: boolean; molten: boolean; sublime?: boolean }> = {
  Cu: { name: '铜', type: '金属晶体', particle: '金属阳离子和自由电子', force: '金属键', melt: 1083, top: 1083, start: 25, solid: true, molten: true },
  NaCl: { name: '氯化钠', type: '离子晶体', particle: '阴、阳离子', force: '离子键', melt: 801, top: 801, start: 25, solid: false, molten: true },
  dryice: { name: '干冰', type: '分子晶体', particle: '分子', force: '范德华力', melt: -78.5, top: -78.5, start: -100, solid: false, molten: false, sublime: true },
  diamond: { name: '金刚石', type: '共价晶体', particle: '原子', force: '共价键', melt: null, top: 3500, start: 25, solid: false, molten: false },
}
export const CRYSTAL_KEYS: CrystalKey[] = ['Cu', 'NaCl', 'dryice', 'diamond']
/** 加热到 k（0–1）时的温度：从起点匀速升到熔点（金刚石升到 3500 °C） */
export const heatTemp = (c: CrystalKey, k: number) => CRYSTALS[c].start + (CRYSTALS[c].top - CRYSTALS[c].start) * Math.max(0, Math.min(1, k))
/** 加热到头以后，晶体散开了没有 */
export const breaksUp = (c: CrystalKey) => CRYSTALS[c].melt !== null
/** 加上电压能不能导电：melted 是不是已经熔化 */
export const conducts = (c: CrystalKey, melted: boolean) => melted && breaksUp(c) ? CRYSTALS[c].molten : CRYSTALS[c].solid
/** 温度的写法：整数不带小数，−78.5 留一位 */
export const tempText = (t: number) => `${(Number.isInteger(t) ? String(t) : t.toFixed(1)).replace('-', '−')} °C`

// ---------- 拓展：石墨和金刚石 ----------
export type CarbonKey = 'graphite' | 'diamond'
/** bond 相邻碳原子的距离（pm）；gap 石墨的层间距；neighbors 每个碳原子连着几个碳原子 */
export const CARBON: Record<CarbonKey, { name: string; bond: number; gap: number | null; neighbors: number; hybrid: string; slides: boolean; conducts: boolean }> = {
  graphite: { name: '石墨', bond: 142, gap: 335, neighbors: 3, hybrid: 'sp²', slides: true, conducts: true },
  diamond: { name: '金刚石', bond: 154, gap: null, neighbors: 4, hybrid: 'sp³', slides: false, conducts: false },
}
/** 每个碳原子有 4 个价电子，连着 n 个碳原子各用掉 1 个，剩下几个没有用来形成 σ 键 */
export const spareElectrons = (c: CarbonKey) => 4 - CARBON[c].neighbors
