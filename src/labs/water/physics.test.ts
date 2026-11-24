// 水的净化和组成实验室的计算核对：这里的数字要和规格卡 docs/specs/water.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { FEED_NTU, HARD, NTU_LIMIT, PLANT, RIVER_NTU, colorLeft, diyTurb, drip, DAY, YEAR, filtered, foam, gas, isHard, isPure, murk, passes, settle, timeFor, CURRENT } from './physics'

describe('水的净化和组成', () => {
  it('第 1 课：河水是混合物，蒸馏水是纯净物', () => { expect(isPure('river')).toBe(false); expect(isPure('distilled')).toBe(true) })
  it('第 1 课：河水约 60 NTU，比清水浑得多', () => { expect(RIVER_NTU).toBe(60); expect(murk(RIVER_NTU)).toBeGreaterThan(0.8); expect(murk(0.3)).toBe(0) })
  it('第 2 课：静置够久，不加明矾约 25 NTU，加明矾约 6 NTU', () => { expect(settle(false, 60)).toBeCloseTo(25, 3); expect(settle(true, 60)).toBeCloseTo(6, 3); expect(settle(true, 0)).toBe(60) })
  it('第 3 课：完好的滤纸滤出约 2 NTU，破了的约 21 NTU', () => { expect(FEED_NTU).toBe(25); expect(filtered(25, 'ok')).toBeCloseTo(2, 6); expect(filtered(25, 'torn')).toBeCloseTo(21.25, 6) })
  it('第 4 课：直接过滤颜色不变，加活性炭约剩 5%', () => { expect(colorLeft(false)).toBe(1); expect(colorLeft(true)).toBeCloseTo(0.05, 6) })
  it('第 5 课：六站，只有消毒是化学变化；出厂水不超过 1 NTU', () => { expect(PLANT.length).toBe(6); expect(PLANT.filter(s => s.chem).map(s => s.id)).toEqual(['chlorine']); expect(passes(PLANT[5].ntu)).toBe(true); expect(passes(RIVER_NTU)).toBe(false); expect(NTU_LIMIT).toBe(1) })
  it('第 6 课：井水是硬水，煮沸和蒸馏以后泡沫变多', () => { expect(isHard(HARD.well)).toBe(true); expect(isHard(HARD.boiled)).toBe(false); expect(foam(HARD.distilled).foam).toBeGreaterThan(foam(HARD.boiled).foam); expect(foam(HARD.boiled).foam).toBeGreaterThan(foam(HARD.well).foam) })
  it('第 7 课：1.0 A 通电 157.5 s，负极 20.0 mL 氢气、正极 10.0 mL 氧气', () => { const g = gas(CURRENT, 157.5); expect(g.h2).toBeCloseTo(20, 1); expect(g.o2).toBeCloseTo(10, 1); expect(timeFor(CURRENT, 20)).toBeCloseTo(157.5, 0) })
  it('拓展：每秒一滴，一分钟 3 mL，一天 4.32 L，一年约 1577 L', () => { expect(drip(1, 60)).toBeCloseTo(3, 6); expect(drip(1, DAY) / 1000).toBeCloseTo(4.32, 6); expect(Math.round(drip(1, YEAR) / 1000)).toBe(1577) })
  it('拓展：四层都装好，出水比原水清得多', () => { expect(diyTurb(4)).toBeLessThan(diyTurb(0) / 10) })
})
