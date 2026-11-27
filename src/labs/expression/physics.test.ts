// 基因的表达实验室的计算核对：这里的数字要和规格卡 docs/specs/expression.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { AA_NAME, CODE, GENE, HBB, L1_TOP, MRNA, STOPS, TEMPLATE, anticodon, antiparallel, aaName, complement, counts, mutantProtein, mutate, purineRatio, replicate, samePrint, synonyms, tToU, transcribe, translate, variety } from './physics'

describe('基因的表达', () => {
  it('第 1 课：ATGCGTACCGAG 的互补链逐个是 TACGCATGGCTC，按 5′→3′ 写是 CTCGGTACGCAT', () => {
    expect(complement(L1_TOP)).toBe('TACGCATGGCTC')
    expect(antiparallel(L1_TOP)).toBe('CTCGGTACGCAT')
  })
  it('第 1 课：双链里 A=T=5，G=C=7，(A+G)/(T+C)=1', () => {
    expect(counts(L1_TOP)).toEqual({ A: 5, T: 5, G: 7, C: 7 })
    expect(purineRatio(L1_TOP)).toBe(1)
  })
  it('第 2 课：复制 1、2、3 代，DNA 2、4、8 个，含母链的总是 2 个；16 对碱基用掉 32、96、224 个脱氧核苷酸', () => {
    expect([1, 2, 3].map(n => replicate(n, 16).dna)).toEqual([2, 4, 8])
    expect([1, 2, 3].map(n => replicate(n, 16).withParent)).toEqual([2, 2, 2])
    expect([1, 2, 3].map(n => replicate(n, 16).used)).toEqual([32, 96, 224])
    expect(replicate(3, 16).parentShare).toBeCloseTo(1 / 8, 9)
  })
  it('第 3 课：1、3、10 对碱基的排列方式 4、64、1048576 种', () => {
    expect([1, 3, 10].map(variety)).toEqual([4, 64, 1048576])
  })
  it('第 4 课：模板链 TACCGAGTGCTCACCTTTACT 转录出 AUGGCUCACGAGUGGAAAUGA，就是编码链把 T 换成 U', () => {
    expect(TEMPLATE).toBe('TACCGAGTGCTCACCTTTACT')
    expect(transcribe(TEMPLATE)).toBe('AUGGCUCACGAGUGGAAAUGA')
    expect(MRNA).toBe(tToU(GENE))
  })
  it('第 5 课：标准密码表 64 个密码子，3 个终止；AUG 是甲硫氨酸，丙氨酸有 4 个密码子', () => {
    expect(Object.keys(CODE)).toHaveLength(64)
    expect(STOPS.sort()).toEqual(['UAA', 'UAG', 'UGA'])
    expect(aaName('AUG')).toBe('甲硫氨酸')
    expect(aaName('UGG')).toBe('色氨酸')
    expect(aaName('GAG')).toBe('谷氨酸')
    expect(synonyms('A').sort()).toEqual(['GCA', 'GCC', 'GCG', 'GCU'])
    expect(Object.keys(CODE).filter(c => CODE[c] !== '*')).toHaveLength(61)
  })
  it('第 6 课：21 个碱基翻译出 6 个氨基酸，读到 UGA 停；甲硫氨酸的反密码子是 UAC', () => {
    const t = translate(MRNA)
    expect(t.list.map(x => AA_NAME[x.aa])).toEqual(['甲硫氨酸', '丙氨酸', '组氨酸', '谷氨酸', '色氨酸', '赖氨酸'])
    expect(t.stop).toBe(true)
    expect(anticodon('AUG')).toBe('UAC')
  })
  it('第 7 课：β 链基因 GAG → GTG，谷氨酸换成缬氨酸，只变一个；增添、缺失从第 7 个起往后都变', () => {
    expect(translate(tToU(HBB)).list.map(x => x.aa).join('')).toBe('MVHLTPEEK')
    expect(mutate(HBB, 'sub').slice(18, 21)).toBe('GTG')
    const sub = mutantProtein('sub')
    expect(sub.aa[6]).toBe('V'); expect(sub.changed).toBe(1)
    expect(mutantProtein('ins').first).toBe(6)
    expect(mutantProtein('del').first).toBe(6)
    expect(mutantProtein('none').changed).toBe(0)
  })
  it('拓展：现场样本和第 2 个人的条带一样', () => {
    expect(samePrint('scene', 'p2')).toBe(true)
    expect(samePrint('scene', 'p1')).toBe(false)
  })
})
