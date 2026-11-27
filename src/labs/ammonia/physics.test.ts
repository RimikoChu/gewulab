// 合成氨工厂实验室的计算核对：这里的数字要和规格卡 docs/specs/ammonia.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { FEED, KC, Kc, RUNS4, START3, T_EQ, atEq, cond2, conversion, equilibrium, kf, loopPass, loopUse, loopsFor, nh3Eq, nh3Out, no2, no2Ratio, rate1, reading1, run, ureaFromNH3 } from './physics'

describe('合成氨工厂', () => {
  it('第 1 课：2 min 时的读数是 0.80、2.40、0.40 mol/L', () => { expect(reading1()).toEqual({ n2: 0.8, h2: 2.4, nh3: 0.4 }) })
  it('第 1 课：v(N₂) : v(H₂) : v(NH₃) = 0.10 : 0.30 : 0.20', () => { const v = rate1(); expect(v.n2).toBeCloseTo(0.1, 6); expect(v.h2).toBeCloseTo(0.3, 6); expect(v.nh3).toBeCloseTo(0.2, 6) })
  it('第 2 课：活化分子百分数 10%、升温 13.5%、催化剂约 25%', () => {
    expect(cond2('base').f).toBeCloseTo(0.1, 2); expect(cond2('hot').f).toBeCloseTo(0.135, 3); expect(cond2('cat').f).toBeCloseTo(0.252, 3)
    expect(cond2('base').hits).toBe(6); expect(cond2('conc').hits).toBe(12); expect(cond2('conc').f).toBeCloseTo(cond2('base').f, 9)
  })
  it('第 3 课：正向开始到平衡是 0.50、1.50、1.00 mol/L，v正 = v逆', () => {
    const c = run(START3.fwd, T_EQ); expect(c.n2).toBeCloseTo(0.5, 2); expect(c.h2).toBeCloseTo(1.5, 2); expect(c.nh3).toBeCloseTo(1, 2); expect(atEq(c)).toBe(true)
  })
  it('第 3 课：只有 2 mol/L 氨开始，达到同一平衡', () => { const c = run(START3.rev, T_EQ); expect(c.nh3).toBeCloseTo(1, 2); expect(c.n2).toBeCloseTo(0.5, 2) })
  it('第 4 课：K 约 0.59，三组起始浓度 K 都一样', () => {
    expect(KC).toBeCloseTo(0.593, 3)
    for (const r of RUNS4) expect(Kc(run(r.c0, T_EQ))).toBeCloseTo(KC, 2)
  })
  it('第 4 课：N₂ 加倍，H₂ 的转化率升高、N₂ 的降低', () => {
    const a = conversion(RUNS4[0].c0, equilibrium(RUNS4[0].c0)), b = conversion(RUNS4[1].c0, equilibrium(RUNS4[1].c0))
    expect(a.n2).toBeCloseTo(0.5, 6); expect(b.h2).toBeGreaterThan(a.h2); expect(b.n2).toBeLessThan(a.n2)
  })
  it('第 5 课：25 °C 时 NO₂ 分解度约 0.19；热水里变深、冰水里变浅', () => {
    const c = no2(25); expect(c.no2 / 2 / (c.n2o4 + c.no2 / 2)).toBeCloseTo(0.19, 2)
    expect(no2Ratio(80)).toBeGreaterThan(1.5); expect(no2Ratio(0)).toBeLessThan(0.7)
  })
  it('第 5 课：推活塞体积减半，NO₂ 浓度最后在原来的 1 倍和 2 倍之间', () => { const r = no2Ratio(25, 0.5); expect(r).toBeGreaterThan(1); expect(r).toBeLessThan(2) })
  it('第 6 课：课本表 20 MPa 时 500 °C 19.1%、30 MPa 时 26.4%，插值连续', () => {
    expect(nh3Eq(500, 20)).toBeCloseTo(19.1, 6); expect(nh3Eq(500, 30)).toBeCloseTo(26.4, 6); expect(nh3Eq(300, 20)).toBeCloseTo(64.2, 6)
    expect(nh3Eq(450, 20)).toBeLessThan(38.2); expect(nh3Eq(450, 20)).toBeGreaterThan(19.1)
  })
  it('第 6 课：出塔氨含量 300 °C 约 1.2%、500 °C 约 14.8%，500 °C 最高', () => {
    expect(nh3Out(300, 20)).toBeCloseTo(1.2, 1); expect(nh3Out(400, 20)).toBeCloseTo(8.0, 1); expect(nh3Out(500, 20)).toBeCloseTo(14.8, 1); expect(nh3Out(600, 20)).toBeCloseTo(9.1, 1)
  })
  it('第 7 课：单程转化率约 26%，循环 11 次利用率超过 95%', () => { expect(loopPass()).toBeCloseTo(0.258, 2); expect(loopUse(loopPass(), 10)).toBeGreaterThan(0.94); expect(loopsFor(0.95)).toBe(11) })
  it('拓展课：1 t 氨约制 1.76 t 尿素', () => { expect(ureaFromNH3(1)).toBeCloseTo(1.76, 2) })
  it('速率常数定标在合理范围', () => { expect(kf()).toBeGreaterThan(0); expect(FEED.n2).toBe(1) })
})
