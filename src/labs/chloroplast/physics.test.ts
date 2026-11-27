// 光反应和暗反应实验室的计算核对：这里的数字要和规格卡 docs/specs/chloroplast.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { GREEN_LEAF, STEADY, YELLOW_LEAF, absorb, after, bandAt, bandVisible, bandsTopDown, bestTemp, calvin, co2Boost, compensation, fixCO2, granaCount, groupShare, lineSafe, mainlyAbsorbs, netColor, netOf, photolysis, rates, reduceC3, saturation, shift, stepPools, thylakoidCount, widestBand, zones } from './physics'

describe('光反应和暗反应', () => {
  it('第 1 课：模型里有 14 个基粒、106 个类囊体', () => { expect(granaCount()).toBe(14); expect(thylakoidCount()).toBe(106) })

  it('第 2 课：色素带从上到下是胡萝卜素、叶黄素、叶绿素 a、叶绿素 b', () => { expect(bandsTopDown().map(p => p.name)).toEqual(['胡萝卜素', '叶黄素', '叶绿素 a', '叶绿素 b']) })
  it('第 2 课：最宽的是叶绿素 a；叶绿素约占 3/4', () => { expect(widestBand().name).toBe('叶绿素 a'); expect(groupShare('叶绿素')).toBeCloseTo(0.75, 6); expect(groupShare('类胡萝卜素')).toBeCloseTo(0.25, 6) })
  it('第 2 课：层析到一半，胡萝卜素走得比叶绿素 b 远；滤液细线不能没进层析液', () => { expect(bandAt('carotene', 0.5)).toBeGreaterThan(bandAt('chlb', 0.5)); expect(lineSafe(1, 0.5)).toBe(true); expect(lineSafe(1, 1.5)).toBe(false) })

  it('第 3 课：叶绿素主要吸收蓝紫光和红光，绿光吸收得最少', () => { expect(mainlyAbsorbs('chl')).toEqual({ blue: true, green: false, red: true }); const z = zones('chl'); expect(z.green).toBeLessThan(0.1); expect(absorb('chl', 664)).toBeGreaterThan(0.7) })
  it('第 3 课：类胡萝卜素主要吸收蓝紫光', () => { expect(mainlyAbsorbs('car')).toEqual({ blue: true, green: false, red: false }) })

  it('第 4 课：2 个水分子光解放出 1 个 O₂、4 个 H⁺、4 个电子，可以生成 2 个 NADPH', () => { expect(photolysis(2)).toEqual({ water: 2, o2: 1, h: 4, e: 4, nadph: 2 }); expect(photolysis(12).o2).toBe(6) })

  it('第 5 课：1 个 CO₂ 和 1 个 C₅ 生成 2 个 C₃，碳原子数守恒', () => { const f = fixCO2(1); expect(f.c3).toBe(2); expect(f.carbonIn).toBe(6); expect(f.carbonOut).toBe(6) })
  it('第 5 课：2 个 C₃ 还原后再生 1 个 C₅，留下 1 个碳去合成糖类；转 6 圈攒够 1 个葡萄糖', () => { expect(reduceC3(2)).toEqual({ sugarCarbon: 1, c5: 1, carbon: 6 }); expect(calvin(6).glucose).toBe(1); expect(calvin(5).glucose).toBe(0) })

  it('第 6 课：稳定状态下固定和还原相抵，ATP 和 NADPH 的产生和消耗相抵', () => { const r = rates(STEADY, true, true); expect(r.reduce).toBeCloseTo(2 * r.fix, 6); expect(r.supply).toBeCloseTo(0.2 * r.reduce, 6); const p = stepPools(STEADY, true, true, 5); expect(p.c3).toBeCloseTo(6, 3); expect(p.c5).toBeCloseTo(3, 3) })
  it('第 6 课：突然停止光照，C₃ 增多、C₅ 减少、ATP 和 NADPH 减少', () => { expect(shift('dark')).toEqual({ c3: '增多', c5: '减少', e: '减少' }) })
  it('第 6 课：突然停止供应 CO₂，C₃ 减少、C₅ 增多、ATP 和 NADPH 增多', () => { expect(shift('noCO2')).toEqual({ c3: '减少', c5: '增多', e: '增多' }) })
  it('第 6 课：C₅ 加上一半的 C₃ 总量不变', () => { const p = after(false, true, 4); expect(p.c5 + p.c3 / 2).toBeCloseTo(STEADY.c5 + STEADY.c3 / 2, 6) })

  it('第 7 课：光补偿点约 4，光饱和点约 47', () => { expect(compensation('light')).toBeCloseTo(4.04, 1); expect(saturation('light')).toBeCloseTo(46.7, 0) })
  it('第 7 课：黑暗中只有呼吸，净光合速率是 −2；光补偿点处为 0', () => { expect(netOf('light', 0)).toBeCloseTo(-2, 6); expect(netOf('light', compensation('light'))).toBeCloseTo(0, 4) })
  it('第 7 课：CO₂ 浓度升高，速率先升后平；温度有一个最适值', () => { expect(netOf('co2', 400)).toBeGreaterThan(netOf('co2', 100)); expect(netOf('co2', 1200) - netOf('co2', 1000)).toBeLessThan(0.3); const t = bestTemp(); expect(t).toBeGreaterThan(20); expect(t).toBeLessThan(26); expect(netOf('temp', 45)).toBeLessThan(netOf('temp', 25)) })

  it('拓展：黄叶上看得清的只有胡萝卜素和叶黄素', () => { expect((['carotene', 'lutein', 'chla', 'chlb'] as const).map(k => bandVisible(YELLOW_LEAF, k))).toEqual([true, true, false, false]); expect(bandVisible(GREEN_LEAF, 'chlb')).toBe(true) })
  it('拓展：同样强度下红蓝光比绿光的净光合速率高；增施 CO₂ 后速率提高', () => { expect(netColor('redblue')).toBeGreaterThan(netColor('green')); const b = co2Boost(); expect(b.after).toBeGreaterThan(b.before) })
})
