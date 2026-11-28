// 种群和生态系统实验室的计算核对：这里的数字要和规格卡 docs/specs/population.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { AGES, ENERGY, K_OF, MARK, PP, QUADRATS, balance, countQuadrat, efficiency, firstPeak, fishYield, growthRate, jGrowth, lincoln, lincolnLost, logistic, logisticRate, maxRate, meanDensity, outSum, projectAge, simulate, tHalf } from './physics'

describe('种群和生态系统', () => {
  it('第 1 课：五个样方按“计上不计下”数出 7、9、8、6、10 株，平均 8.0 株/m²', () => {
    expect(QUADRATS.map(q => countQuadrat(q))).toEqual([7, 9, 8, 6, 10])
    expect(meanDensity('half')).toBeCloseTo(8, 6)
  })
  it('第 1 课：压线的全都数，平均 9.6 株/m²，偏大', () => { expect(meanDensity('all')).toBeCloseTo(9.6, 6) })
  it('第 2 课：N = 40 × 50 ÷ 10 = 200 只；标记脱落 2 只时估成 250 只', () => {
    expect(lincoln(MARK.M, MARK.n, MARK.m)).toBe(200)
    expect(lincoln(MARK.M, MARK.n, MARK.m)).toBe(MARK.real)
    expect(lincolnLost()).toBe(250)
  })
  it('第 3 课：增长率 25%、0、−18%；5 年后 305、100、37 只', () => {
    expect(growthRate('grow')).toBeCloseTo(0.25, 6); expect(growthRate('stable')).toBeCloseTo(0, 6); expect(growthRate('decline')).toBeCloseTo(-0.18, 6)
    expect(Math.round(projectAge('grow', 5))).toBe(305); expect(Math.round(projectAge('stable', 5))).toBe(100); expect(Math.round(projectAge('decline', 5))).toBe(37)
    for (const a of Object.values(AGES)) expect(a.young + a.adult + a.old).toBe(100)
  })
  it('第 4 课：20 只起，λ=1.3 时 10 年后 276 只，λ=1.5 时 1153 只，λ=1 时不变', () => {
    expect(Math.round(jGrowth(1.3, 10))).toBe(276); expect(Math.round(jGrowth(1.5, 10))).toBe(1153); expect(jGrowth(1, 10)).toBe(20)
  })
  it('第 5 课：K=2400 时第 8.0 年到 K/2，最大增长速率 360 只/年；20 年后接近 K', () => {
    expect(tHalf(K_OF.good)).toBeCloseTo(7.97, 2)
    expect(logistic(K_OF.good, tHalf(K_OF.good))).toBeCloseTo(1200, 6)
    expect(maxRate(K_OF.good)).toBeCloseTo(360, 6); expect(maxRate(K_OF.poor)).toBeCloseTo(180, 6)
    expect(logisticRate(1200, 2400)).toBeGreaterThan(logisticRate(600, 2400)); expect(logisticRate(1200, 2400)).toBeGreaterThan(logisticRate(1800, 2400))
    expect(Math.round(logistic(K_OF.good, 20))).toBe(2398); expect(Math.round(logistic(K_OF.poor, 20))).toBe(1200)
  })
  it('第 6 课：狐上岛后兔和狐此起彼伏，狐的峰值比兔晚；最后趋向兔 500 只、狐约 24 只', () => {
    const pts = simulate(true), h = firstPeak(pts, 'H'), p = firstPeak(pts, 'P')
    expect(h.t).toBeCloseTo(14.25, 6); expect(Math.round(h.v)).toBe(1053)
    expect(p.t).toBeCloseTo(17.25, 6); expect(Math.round(p.v)).toBe(43)
    expect(p.t - h.t).toBeCloseTo(3, 6)
    expect(Math.round(pts.at(-1)!.H)).toBe(555); expect(Math.round(pts.at(-1)!.P)).toBe(31)
    expect(balance().H).toBeCloseTo(500, 6); expect(balance().P).toBeCloseTo(23.75, 6)
    expect(Math.min(...pts.map(q => q.H))).toBeGreaterThan(50)
  })
  it('第 6 课：把狐移走，兔又按 S 形增长回到 K', () => {
    const end = simulate(true).at(-1)!, back = simulate(false, end.H)
    expect(back.at(-1)!.H).toBeGreaterThan(PP.K * 0.99)
  })
  it('第 7 课：每个营养级的四个去向加起来等于同化量；传递效率 15%、12%', () => {
    for (const l of ENERGY) expect(outSum(l)).toBe(l.got)
    expect(ENERGY[0].next).toBe(ENERGY[1].got); expect(ENERGY[1].next).toBe(ENERGY[2].got)
    expect(efficiency(0)).toBeCloseTo(0.15, 6); expect(efficiency(1)).toBeCloseTo(0.12, 6)
  })
  it('拓展：渔场剩 K/2 时每年能捕 1000 尾，剩 K/4、3K/4 时都只有 750 尾', () => {
    expect(fishYield('half')).toBe(1000); expect(fishYield('quarter')).toBe(750); expect(fishYield('most')).toBe(750)
  })
})
