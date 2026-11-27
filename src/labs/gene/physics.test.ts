// 遗传和变异实验室的计算核对：这里的数字要和规格卡 docs/specs/gene.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { CHROMOSOMES, DRAW_TOTAL, F1_N, F2_N, MENDEL, PODS, boys, cross, draws, f2Bed, gamete, isRelative, isTall, mean, pairs, peanuts, phenotype, podSeeds, ratio, tally, testCross, zygote, HEIGHT, KARYOTYPE, VARIATION } from './physics'

describe('遗传和变异', () => {
  it('第 1 课：高茎和矮茎是相对性状，高茎和圆粒不是', () => {
    expect(isRelative({ species: '豌豆', trait: '茎的高度', form: '高茎' }, { species: '豌豆', trait: '茎的高度', form: '矮茎' })).toBe(true)
    expect(isRelative({ species: '豌豆', trait: '茎的高度', form: '高茎' }, { species: '豌豆', trait: '种子的形状', form: '圆粒' })).toBe(false)
    expect(HEIGHT.tall / HEIGHT.short).toBeCloseTo(5, 6)
  })
  it('第 2 课：豌豆体细胞 14 条染色体，7 对', () => { expect(CHROMOSOMES.pea).toBe(14); expect(pairs(CHROMOSOMES.pea)).toBe(7) })
  it('第 3 课：14 → 7 → 14', () => { const g = gamete(CHROMOSOMES.pea); expect(g).toBe(7); expect(zygote(g, g)).toBe(14) })
  it('第 4 课：高茎 DD × 矮茎 dd，子一代全是 Dd 高茎', () => {
    const f1 = cross('DD', 'dd'); expect(f1.every(g => g === 'Dd')).toBe(true); expect(phenotype('Dd')).toBe('高茎'); expect(F1_N).toBe(24)
  })
  it('第 5 课：Dd × Dd 是 1∶2∶1，高∶矮 3∶1；孟德尔 787∶277 = 2.84', () => {
    expect(tally(cross('Dd', 'Dd'))).toEqual({ DD: 1, Dd: 2, dd: 1 })
    expect(ratio(MENDEL.stem.a, MENDEL.stem.b)).toBe(2.84)
    const bed = f2Bed(); expect(bed.length).toBe(F2_N)
    const tall = bed.filter(isTall).length; expect(tall / (F2_N - tall)).toBeGreaterThan(2.3); expect(tall / (F2_N - tall)).toBeLessThan(4)
  })
  it('第 6 课：男 22 对 + XY；摸 50 次男女都接近一半', () => {
    expect(KARYOTYPE.male.sex).toBe('XY'); expect(KARYOTYPE.male.auto * 2 + 2).toBe(CHROMOSOMES.human)
    const b = boys(draws(DRAW_TOTAL)); expect(b).toBeGreaterThan(18); expect(b).toBeLessThan(32)
  })
  it('第 7 课：大花生平均比小花生长；贫瘠土里结小果不能遗传', () => {
    expect(mean(peanuts('big'))).toBeGreaterThan(mean(peanuts('small')) + 0.6); expect(VARIATION.soil.heritable).toBe(false)
  })
  it('拓展：测交 Dd × dd 一半矮茎；豆荚里圆粒约占 3/4', () => {
    expect(tally(testCross('Dd'))).toEqual({ DD: 0, Dd: 2, dd: 2 }); expect(testCross('DD').every(isTall)).toBe(true)
    const s = podSeeds(PODS.reduce((a, b) => a + b, 0)); const round = s.filter(Boolean).length
    expect(round).toBeGreaterThan(s.length / 2)
    expect(ratio(MENDEL.seed.a, MENDEL.seed.b)).toBe(2.96)
  })
})
