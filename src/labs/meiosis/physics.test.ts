// 减数分裂和遗传规律实验室的计算核对：这里的数字要和规格卡 docs/specs/meiosis.md 里写的一致。
import { describe, expect, it } from 'vitest'
import {
  CHROMOSOMES, COLORBLIND, DI_SAMPLE, F2_SAMPLE, FLY_F1, FLY_F2, TEST_SAMPLE, XF2_SAMPLE, cbOdds, count, countWing, curve, diGametes, diPunnett, diRatio,
  eyeTally, fstr, gameteKinds, gametesFrom, isMale, pAffected, pCarrierGivenNormal, pChildOf, phenoRatio, punnett, showsRecessive, tally, xCross, zygote,
} from './physics'

describe('第 1 课 减数第一次分裂', () => {
  it('2n = 4：前期Ⅰ 2 个四分体、8 条染色单体、8 个核 DNA', () => { const c = count('pro1', 4); expect([c.tetrad, c.chromatid, c.dna, c.chr]).toEqual([2, 8, 8, 4]) })
  it('末期Ⅰ 每个子细胞 2 条染色体，仍有染色单体', () => { const c = count('telo1', 4); expect([c.chr, c.dna, c.chromatid]).toEqual([2, 4, 4]) })
  it('果蝇 2n = 8：前期Ⅰ 4 个四分体', () => { expect(count('pro1', CHROMOSOMES.fly).tetrad).toBe(4) })
})
describe('第 2 课 减数第二次分裂', () => {
  it('后期Ⅱ 染色体暂时回到 4 条，没有染色单体', () => { const c = count('ana2', 4); expect([c.chr, c.chromatid]).toEqual([4, 0]) })
  it('末期Ⅱ 精细胞 2 条染色体、2 个核 DNA', () => { const c = count('telo2', 4); expect([c.chr, c.dna]).toEqual([2, 2]) })
  it('曲线：核 DNA 2→4→…→1（以 n 计）；减半只在末期Ⅰ和末期Ⅱ', () => {
    const k = curve(4)
    expect(k.map(d => d.dna)).toEqual([4, 8, 8, 8, 8, 4, 4, 4, 4, 2])
    expect(k.map(d => d.chr)).toEqual([4, 4, 4, 4, 4, 2, 2, 2, 4, 2])
  })
})
describe('第 3 课 精子和卵细胞的形成', () => {
  it('一个精原细胞 4 个精子；一个卵原细胞 1 个卵细胞、3 个极体', () => { expect(gametesFrom('sperm')).toBe(4); expect(gametesFrom('egg')).toBe(1) })
})
describe('第 4 课 受精作用', () => {
  it('两对同源染色体 4 种配子；人 2²³ 种', () => { expect(gameteKinds(2)).toBe(4); expect(gameteKinds(23)).toBe(8388608) })
  it('受精卵：2 + 2 = 4；人 23 + 23 = 46', () => { expect(zygote(2, 2)).toBe(4); expect(zygote(23, 23)).toBe(CHROMOSOMES.human) })
  it('AaBb 产生 AB、Ab、aB、ab', () => { expect(diGametes('AaBb')).toEqual(['AB', 'Ab', 'aB', 'ab']) })
})
describe('第 5 课 分离定律', () => {
  it('Vv × Vv：VV∶Vv∶vv = 1∶2∶1，长翅∶残翅 = 3∶1', () => { const c = punnett('Vv', 'Vv'); expect(tally(c)).toEqual({ VV: 1, Vv: 2, vv: 1 }); expect(phenoRatio(c)).toEqual([3, 1]) })
  it('测交 Vv × vv：1∶1', () => { expect(phenoRatio(punnett('Vv', 'vv'))).toEqual([2, 2]) })
  it('麻醉板上抽到的果蝇：子二代 48 只 38∶10，测交 40 只', () => { expect(countWing(F2_SAMPLE)).toEqual({ long: 38, short: 10 }); expect(TEST_SAMPLE.length).toBe(40) })
})
describe('第 6 课 自由组合定律', () => {
  it('EeVv × EeVv：16 格，9∶3∶3∶1', () => { const p = diPunnett('EeVv', 'EeVv'); expect(p.cells.length).toBe(16); expect(diRatio(p.cells)).toEqual([9, 3, 3, 1]) })
  it('子二代抽 64 只', () => { expect(DI_SAMPLE.length).toBe(64) })
})
describe('第 7 课 伴性遗传', () => {
  it('红眼♀ × 白眼♂：子一代全是红眼', () => { expect(FLY_F1.every(g => !showsRecessive(g))).toBe(true) })
  it('子二代红眼∶白眼 = 3∶1，白眼全是雄蝇', () => { const t = eyeTally(FLY_F2); expect([t.red, t.white, t.whiteMale]).toEqual([3, 1, 1]) })
  it('抽到的子二代里白眼都是雄蝇', () => { expect(XF2_SAMPLE.filter(showsRecessive).every(isMale)).toBe(true) })
  it('携带者女 × 正常男：儿子 1/2 色盲，女儿 1/2 携带者、不色盲', () => { const o = cbOdds('carrier'); expect([fstr(o.son), fstr(o.carrier), fstr(o.girl)]).toEqual(['1/2', '1/2', '0']) })
  it('色盲女 × 正常男：儿子全色盲，女儿全是携带者', () => { const o = cbOdds('affected'); expect([fstr(o.son), fstr(o.carrier)]).toEqual(['1', '1']); expect(xCross(COLORBLIND.affected.mom, COLORBLIND.affected.dad).length).toBe(4) })
})
describe('拓展 遗传咨询', () => {
  it('Aa × Aa：患病 1/4；正常孩子是携带者 2/3；和携带者结婚 1/6', () => {
    expect(fstr(pAffected('Aa', 'Aa'))).toBe('1/4'); expect(fstr(pCarrierGivenNormal('Aa', 'Aa'))).toBe('2/3'); expect(fstr(pChildOf(pCarrierGivenNormal('Aa', 'Aa')))).toBe('1/6')
  })
})
