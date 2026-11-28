// 各课放大窗里用到的分子“帧”：反应前一帧、反应后一帧，同一个原子在两帧里用同一个名字。坐标单位 Å，写在纸面上。
import { build, chain, join, moved, tetra, type Atom, type Bond, type Frame, type Heavy } from './mol'

// ---------- 第 2 课：断链 ----------
/** n 个碳的烷烃从第 cut 个碳后面断开：前一段补一个氢成为烷烃，后一段少一个氢、头上成双键 */
export function crackFrames(n: number, cut: number): [Frame, Frame] {
  const ids = Array.from({ length: n }, (_, i) => 'c' + i), x0 = -(n - 1) * 0.63
  const from = chain(ids, x0)
  // 挪走的那个氢：后一段第二个碳上的（它是末端碳时有三个氢，挪第三个）
  const donor = ids[cut + 1], gift = donor + (cut + 1 === n - 1 ? 'c' : 'b'), last = ids[cut - 1]
  const A = cut === 1 ? build([{ id: ids[0], el: 'C', p: [x0 - 1.1, 0], h: [ids[0] + 'a', ids[0] + 'b', ids[0] + 'c', gift] }], [])
    : chain(ids.slice(0, cut), x0 - 1.1, { hs: { [last]: [last + 'a', last + 'b', gift] } })
  const B = chain(ids.slice(cut), x0 + cut * 1.26 + 1.1, { phase: cut % 2, dbl: 0, hs: { [donor]: cut + 1 === n - 1 ? [donor + 'a', donor + 'b'] : [donor + 'a'] } })
  B.bonds.forEach(b => { if (b.n === 2) b.c = '#ffb347' })
  return [from, join(A, B)]
}
export const CRACK_FRAMES = [crackFrames(16, 8), crackFrames(8, 4), crackFrames(4, 2), crackFrames(4, 1)]

// ---------- 第 3 课：甲烷的取代 ----------
/** 取代的先后：先换哪个位置上的氢 */
const ORDER = [1, 0, 2, 3]
/** 取代了 n 个氢以后的样子。waiting：右上角有没有一个等着的氯分子 */
export function methaneFrame(n: number, waiting: boolean): Frame {
  const atoms: Atom[] = [{ id: 'c', el: 'C', p: [0, 0.4, 0] }], bonds: Bond[] = []
  ORDER.forEach((slot, k) => {
    const done = k < n, len = done ? 1.77 : 1.09, d = tetra(slot, len)
    if (done) { atoms.push({ id: `cl${k}a`, el: 'Cl', p: [d[0], d[1] + 0.4, d[2]] }); bonds.push({ a: 'c', b: `cl${k}a`, n: 1 }) }
    else { atoms.push({ id: `h${k}`, el: 'H', p: [d[0], d[1] + 0.4, d[2]] }); bonds.push({ a: 'c', b: `h${k}`, n: 1 }) }
    if (done) { const x = -3.75 + k * 2.5; atoms.push({ id: `h${k}`, el: 'H', p: [x - 0.64, -3.3 + (k % 2) * 0.5, 0] }, { id: `cl${k}b`, el: 'Cl', p: [x + 0.64, -3.3 + (k % 2) * 0.5, 0] }); bonds.push({ a: `h${k}`, b: `cl${k}b`, n: 1 }) }
  })
  if (waiting && n < 4) { atoms.push({ id: `cl${n}a`, el: 'Cl', p: [2.5, 2.1, 0] }, { id: `cl${n}b`, el: 'Cl', p: [3.6, 3.3, 0] }); bonds.push({ a: `cl${n}a`, b: `cl${n}b`, n: 1 }) }
  return { atoms, bonds }
}

// ---------- 第 4 课：乙烯和溴的加成 ----------
const br2: Heavy[] = [{ id: 'br1', el: 'Br', p: [-1.14, 3.2] }, { id: 'br2', el: 'Br', p: [1.14, 3.2] }]
export const ETHENE_BR2: [Frame, Frame] = [
  build([{ id: 'c1', el: 'C', p: [-0.67, -0.4], flat: true, h: ['h1a', 'h1b'] }, { id: 'c2', el: 'C', p: [0.67, -0.4], flat: true, h: ['h2a', 'h2b'] }, ...br2], [['c1', 'c2', 2], ['br1', 'br2']]),
  build([{ id: 'c1', el: 'C', p: [-0.75, 0.2], h: ['h1a', 'h1b'] }, { id: 'c2', el: 'C', p: [0.75, -0.2], h: ['h2a', 'h2b'] }, { id: 'br1', el: 'Br', p: [-1.45, 2.0] }, { id: 'br2', el: 'Br', p: [1.45, -2.0] }], [['c1', 'c2'], ['c1', 'br1'], ['c2', 'br2']]),
]
ETHENE_BR2[0].bonds[0].c = '#ffb347'
/** 甲烷和溴：碰到一起也不反应 */
export const METHANE_BR2: Frame = join(build([{ id: 'c', el: 'C', p: [0, -0.5], h: ['h1', 'h2', 'h3', 'h4'] }], []), build(br2, [['br1', 'br2']]))
/** 单独的乙烯、甲烷（通进高锰酸钾溶液那一边时看） */
export const ETHENE: Frame = build([{ id: 'c1', el: 'C', p: [-0.67, 0], flat: true, h: ['h1a', 'h1b'] }, { id: 'c2', el: 'C', p: [0.67, 0], flat: true, h: ['h2a', 'h2b'] }], [['c1', 'c2', 2]])
ETHENE.bonds[0].c = '#ffb347'
export const METHANE: Frame = build([{ id: 'c', el: 'C', p: [0, 0], h: ['h1', 'h2', 'h3', 'h4'] }], [])

// ---------- 第 5 课：苯 ----------
const ring = (i: number, r: number): [number, number] => [r * Math.cos(Math.PI / 2 - i * Math.PI / 3), r * Math.sin(Math.PI / 2 - i * Math.PI / 3)]
/** 苯环上第 i 根碳碳键的中点方向上、离圆心 r 的位置（标键长用） */
export const benzeneBond = (i: number, r: number): [number, number] => [r * Math.cos(Math.PI / 3 - i * Math.PI / 3), r * Math.sin(Math.PI / 3 - i * Math.PI / 3)]
function benzeneHeavy(sub: boolean): Heavy[] { return Array.from({ length: 6 }, (_, i) => ({ id: 'c' + i, el: 'C' as const, p: ring(i, 1.4), flat: true, h: sub && i === 1 ? [] : ['h' + i] })) }
const ringBonds: [string, string, number?][] = Array.from({ length: 6 }, (_, i) => ['c' + i, 'c' + (i + 1) % 6])
export const BENZENE: Frame = build(benzeneHeavy(false), ringBonds, [{ at: [0, 0, 0], r: 0.82 }])
/** 苯和液溴：反应前溴分子在右上角；反应后一个溴接到环上，换下来的氢和另一个溴结成溴化氢 */
export const BROMINATION: [Frame, Frame] = [
  join(BENZENE, build([{ id: 'bra', el: 'Br', p: [3.0, 2.2] }, { id: 'brb', el: 'Br', p: [3.9, 4.0] }], [['bra', 'brb']])),
  build([...benzeneHeavy(true), { id: 'bra', el: 'Br', p: ring(1, 3.3) }, { id: 'h1', el: 'H', p: [3.3, -2.7] }, { id: 'brb', el: 'Br', p: [4.5, -3.3] }], [...ringBonds, ['c1', 'bra'], ['h1', 'brb']], [{ at: [0, 0, 0], r: 0.82 }]),
]

// ---------- 第 6 课：官能团的转化 ----------
const P = (r: number, deg: number): [number, number] => [r * Math.cos(deg * Math.PI / 180), r * Math.sin(deg * Math.PI / 180)]
/** 乙醇：c2 在原点，甲基在左下，羟基在右下。s 是名字的后缀（同一窗里有两个分子时区分） */
const ethanol = (s = ''): Frame => build([{ id: 'c1' + s, el: 'C', p: P(1.52, 210), h: ['h1a' + s, 'h1b' + s, 'h1c' + s] }, { id: 'c2' + s, el: 'C', p: [0, 0], h: ['h2a' + s, 'h2b' + s] }, { id: 'o' + s, el: 'O', p: P(1.43, 330), h: ['ho' + s] }], [['c1' + s, 'c2' + s], ['c2' + s, 'o' + s]])
/** 乙醛：羟基的氧变成羰基氧（还在右下），c2 上只剩一个氢（朝上） */
const ethanal = (s = ''): Frame => { const f = build([{ id: 'c1' + s, el: 'C', p: P(1.5, 210), h: ['h1a' + s, 'h1b' + s, 'h1c' + s] }, { id: 'c2' + s, el: 'C', p: [0, 0], flat: true, h: ['h2a' + s] }, { id: 'o' + s, el: 'O', p: P(1.22, 330) }], [['c1' + s, 'c2' + s], ['c2' + s, 'o' + s, 2]]); f.bonds[1].c = '#ffb347'; return f }
/** 乙酸：醛基的氢和碳之间插进一个氧，成了羟基（朝上）。x 是新来的那个氧的名字 */
const acid = (s = '', x = 'ox'): Frame => { const f = build([{ id: 'c1' + s, el: 'C', p: P(1.5, 210), h: ['h1a' + s, 'h1b' + s, 'h1c' + s] }, { id: 'c2' + s, el: 'C', p: [0, 0], flat: true }, { id: 'o' + s, el: 'O', p: P(1.22, 330) }, { id: x, el: 'O', p: [0, 1.36] }, { id: 'h2a' + s, el: 'H', p: [-0.85, 1.85] }], [['c1' + s, 'c2' + s], ['c2' + s, 'o' + s, 2], ['c2' + s, x], [x, 'h2a' + s]]); f.bonds[1].c = '#ffb347'; return f }

/** 第一步：乙烯加水。水从右下来，一个氢加到左边的碳上，羟基加到右边的碳上 */
const step1: [Frame, Frame] = [
  join(build([{ id: 'c1', el: 'C', p: [-1.34, 0], flat: true, h: ['h1a', 'h1b'] }, { id: 'c2', el: 'C', p: [0, 0], flat: true, h: ['h2a', 'h2b'] }], [['c1', 'c2', 2]]), build([{ id: 'o', el: 'O', p: [2.3, -2.1] }, { id: 'h1c', el: 'H', p: [1.4, -2.4] }, { id: 'ho', el: 'H', p: [2.9, -1.4] }], [['o', 'h1c'], ['o', 'ho']])),
  ethanol(),
]
step1[0].bonds[0].c = '#ffb347'
/** 第二步：两个乙醇和一个氧分子，生成两个乙醛和两个水。上面的分子照原样放，下面的上下翻过来，氧分子在右边中间 */
const step2: [Frame, Frame] = [
  join(moved(ethanol('A'), -0.6, 2.4), moved(ethanol('B'), -0.6, -2.4, true), build([{ id: 'oxA', el: 'O', p: [3.4, 0.6] }, { id: 'oxB', el: 'O', p: [3.4, -0.6] }], [['oxA', 'oxB', 2]])),
  (() => {
    const a = moved(ethanal('A'), -0.6, 2.4), b = moved(ethanal('B'), -0.6, -2.4, true)
    const w = (s: string, y: number): Frame => ({ atoms: [{ id: 'ox' + s, el: 'O', p: [3.6, y, 0] }, { id: 'ho' + s, el: 'H', p: [2.9, y + (y > 0 ? 0.6 : -0.6), 0] }, { id: 'h2b' + s, el: 'H', p: [4.4, y + (y > 0 ? 0.5 : -0.5), 0] }], bonds: [{ a: 'ox' + s, b: 'ho' + s, n: 1 }, { a: 'ox' + s, b: 'h2b' + s, n: 1 }] })
    return join(a, b, w('A', 1.3), w('B', -1.3))
  })(),
]
/** 第三步：两个乙醛和一个氧分子，生成两个乙酸。醛基的氢朝着中间，氧分子在正中 */
const step3: [Frame, Frame] = [
  join(moved(ethanal('A'), 0, 2.9, true), moved(ethanal('B'), 0, -2.9), build([{ id: 'oxA', el: 'O', p: [1.9, 0.6] }, { id: 'oxB', el: 'O', p: [1.9, -0.6] }], [['oxA', 'oxB', 2]])),
  join(moved(acid('A', 'oxA'), 0, 2.9, true), moved(acid('B', 'oxB'), 0, -2.9)),
]
/** 第四步：乙酸和乙醇酯化。酸脱羟基、醇脱氢：乙醇的氧接到羰基碳上，乙酸的羟基和乙醇的氢结成水 */
const step4: [Frame, Frame] = (() => {
  const ac = moved(acid('', 'ox'), -1.2, -1.6)
  const alc = build([{ id: 'oe', el: 'O', p: [1.6, 1.6], h: ['he'] }, { id: 'c3', el: 'C', p: [2.9, 2.3], h: ['h3a', 'h3b'] }, { id: 'c4', el: 'C', p: [4.2, 1.5], h: ['h4a', 'h4b', 'h4c'] }], [['oe', 'c3'], ['c3', 'c4']])
  const ester = build([{ id: 'c1', el: 'C', p: [-1.2 + P(1.5, 210)[0], -1.6 + P(1.5, 210)[1]], h: ['h1a', 'h1b', 'h1c'] }, { id: 'c2', el: 'C', p: [-1.2, -1.6], flat: true }, { id: 'o', el: 'O', p: [-1.2 + P(1.22, 330)[0], -1.6 + P(1.22, 330)[1]] },
    { id: 'oe', el: 'O', p: [-1.2, -0.24] }, { id: 'c3', el: 'C', p: [0.05, 0.5], h: ['h3a', 'h3b'] }, { id: 'c4', el: 'C', p: [0.05, 2.02], h: ['h4a', 'h4b', 'h4c'] },
    { id: 'ox', el: 'O', p: [3.6, -1.9] }, { id: 'h2a', el: 'H', p: [2.8, -2.4] }, { id: 'he', el: 'H', p: [4.3, -2.5] }],
  [['c1', 'c2'], ['c2', 'o', 2], ['c2', 'oe'], ['oe', 'c3'], ['c3', 'c4'], ['ox', 'h2a'], ['ox', 'he']])
  ester.bonds[1].c = '#ffb347'
  return [join(ac, alc), ester]
})()
export const ROUTE_FRAMES = [step1, step2, step3, step4]

// ---------- 第 7 课：加聚 ----------
export const MONOMERS = 6
/** 聚合进行到第 j 步：前 j + 1 个单体已经连成链（j = 0 时都还是一个个乙烯），后面的还浮在上面 */
export function polyFrame(j: number): Frame {
  const parts: Frame[] = [], N = MONOMERS, ids = (i: number) => [`m${i}a`, `m${i}b`], x0 = -(2 * N - 1) * 0.63, linked = j >= 1 ? j + 1 : 0
  if (linked) { const cs = Array.from({ length: linked }, (_, i) => ids(i)).flat(); parts.push(chain(cs, x0, { open: linked === N, hs: Object.fromEntries(cs.map(id => [id, [id + 'h1', id + 'h2']])) })) }
  for (let i = linked; i < N; i++) {
    const cx = x0 + (2 * i + 0.5) * 1.26, [a, b] = ids(i), y = 1.5 + (i % 2) * 0.5
    const f = build([{ id: a, el: 'C', p: [cx - 0.67, y], flat: true, h: [a + 'h1', a + 'h2'] }, { id: b, el: 'C', p: [cx + 0.67, y], flat: true, h: [b + 'h1', b + 'h2'] }], [[a, b, 2]])
    f.bonds[0].c = '#ffb347'; parts.push(f)
  }
  return join(...parts)
}
