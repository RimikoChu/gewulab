// 接触法制硫酸实验室的计算核对：这里的数字要和规格卡 docs/specs/sulfuric.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { FEED, HX, O2_EXACT, PRESS, SAMPLE, T3, TABLE, TEMPS, acidFromOre, areaTimes, bestTemp, burned, carbonFromSucrose, conv3, dirtAt, exchange, gainByPressure, left3, poisons, rates3, slagFromFeS2, so2FromCu, so2FromFeS2, tailAfter, tailSO2, waterFromBluestone, xEq, xOut, xTable } from './physics'

describe('接触法制硫酸', () => {
  it('第 1 课：1 t FeS₂ 完全焙烧得约 1.07 t SO₂，留下约 0.67 t Fe₂O₃', () => { expect(so2FromFeS2(1)).toBeCloseTo(1.067, 3); expect(slagFromFeS2(1)).toBeCloseTo(0.667, 3) })
  it('第 1 课：粒径碎到十分之一，表面积是 10 倍；矿粉 10 s 烧掉 99%，块矿 39%', () => { expect(areaTimes(30, 3)).toBe(10); expect(burned('fine', 10) * 100).toBeCloseTo(99.3, 1); expect(burned('lump', 10) * 100).toBeCloseTo(39.3, 1) })
  it('第 2 课：除尘去矿尘，洗涤去砷硒化合物，干燥去水；干燥后不再使催化剂中毒', () => {
    expect(dirtAt('dust').dust).toBeLessThan(dirtAt('out').dust); expect(dirtAt('wash').arsenic).toBe(0); expect(dirtAt('dry').water).toBe(0)
    expect(poisons('out')).toBe(true); expect(poisons('dry')).toBe(false)
  })
  it('第 3 课：450 °C、常压平衡转化率 97.5%，还剩 2.5%；有没有催化剂平衡一样', () => {
    expect(xTable(T3, 0.1)).toBe(97.5); expect(left3()).toBeCloseTo(2.5, 6)
    expect(conv3('cat', 60)).toBeCloseTo(97.4, 1); expect(conv3('none', 60)).toBeCloseTo(6.8, 1)
    const r = rates3('cat', 1e6); expect(r.fwd).toBeCloseTo(r.rev, 6)
  })
  it('第 4 课：常压下 400、550 °C 的平衡转化率是 99.2%、85.6%；出口转化率 450 °C 最高', () => {
    expect(xTable(400, 0.1)).toBe(99.2); expect(xTable(550, 0.1)).toBe(85.6)
    expect(bestTemp()).toBe(450); expect(xOut(400)).toBeCloseTo(91.1, 1); expect(xOut(450)).toBeCloseTo(97.3, 1); expect(xOut(550)).toBeCloseTo(85.6, 1)
  })
  it('第 5 课：450 °C 从常压加到 10 MPa 只多 2.2 个百分点', () => { expect(gainByPressure(10)).toBeCloseTo(2.2, 6) })
  it('第 5 课：按平衡常数算的转化率和数据表差不到 0.1', () => {
    for (const t of TEMPS) PRESS.forEach((p, j) => expect(Math.abs(xEq(t, p) - TABLE[t][j])).toBeLessThan(0.1))
  })
  it('第 5 课：氧气恰好够时（3.5%）平衡转化率约 89.5%，过量（11%）时 97.5%', () => { expect(O2_EXACT).toBe(3.5); expect(xEq(450, 0.1, O2_EXACT)).toBeCloseTo(89.5, 0); expect(xEq(450, 0.1, FEED.o2)).toBeCloseTo(97.5, 1) })
  it('第 6 课：转化率 97.5% 时尾气含 SO₂ 约 0.19%，氨水吸收后约 0.01%', () => { expect(tailSO2(97.5)).toBeCloseTo(0.195, 3); expect(tailAfter(97.5)).toBeCloseTo(0.01, 2) })
  it('第 7 课：25 g 胆矾失水 9 g；34.2 g 蔗糖留下 14.4 g 碳；6.4 g 铜生成 2.24 L SO₂', () => {
    expect(waterFromBluestone(SAMPLE.bluestone)).toBeCloseTo(9, 6); expect(carbonFromSucrose(SAMPLE.sucrose)).toBeCloseTo(14.4, 6); expect(so2FromCu(SAMPLE.cu)).toBeCloseTo(2.24, 6)
  })
  it('拓展：100 t 含 FeS₂ 60% 的矿石理论上制 100 t 98% 的硫酸', () => { expect(acidFromOre(100, 0.6)).toBeCloseTo(100, 6) })
  it('拓展：热交换器把 60 °C 的冷气预热到 424 °C，580 °C 的热气降到 216 °C', () => { const r = exchange(HX.hot, HX.cold, HX.eff); expect(r.coldOut).toBeCloseTo(424, 6); expect(r.hotOut).toBeCloseTo(216, 6) })
})
