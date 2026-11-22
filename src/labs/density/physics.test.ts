// 质量与密度实验室的计算核对：这里的数字要和规格卡 docs/specs/density.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { BALL, BARS, BAR_V, COPPER, FREEZE, ICE_M, RHO, SIGHT, START, STONE, THINGS, UNKNOWN, blocks, brineAll, brinePart, brineTotal, columnCm, density, displaced, hollowV, identify, massOf, pointerSays, reading, sci, sightReading, slabM, slabV, solidV, stoneRho, stoneV2, tilt, toSI, volumeOf, weigh, weightsText } from './physics'

describe('质量与密度', () => {
  it('第 1 课：橡皮泥 62.4 g、密封杯和冰 86 g、铝块 54 g，变化前后用的砝码和游码都一样', () => {
    expect(THINGS.shape.m).toBe(62.4); expect(weigh(62.4).on.map(i => [100, 50, 20, 20, 10, 5][i])).toEqual([50, 10]); expect(weigh(62.4).rider).toBe(2.4)
    expect(weigh(THINGS.state.m).rider).toBe(1); expect(reading(weigh(86).on, 1)).toBe(86)
    expect(THINGS.place.m).toBe(54); expect(weigh(54).rider).toBe(4)
  })
  it('第 1 课：36 g 冰的体积是 40 cm³，化成水是 36 cm³，质量不变', () => { expect(volumeOf('ice', ICE_M)).toBe(40); expect(volumeOf('water', ICE_M)).toBe(36) })
  it('第 2 课：开始时游码在 1.2 g，指针偏右；游码归零后指针偏左；调好平衡螺母指在中央', () => {
    expect(pointerSays(tilt(START.trim, START.rider))).toBe('偏向右侧'); expect(pointerSays(tilt(START.trim, 0))).toBe('偏向左侧'); expect(pointerSays(tilt(0, 0))).toBe('指在分度盘中央')
  })
  it('第 2 课：称 89 g 的铜块，100 g 和第二个 20 g 放上去偏重要取下，留下 50 + 20 + 10 + 5，游码 4.0 g', () => {
    const w = weigh(COPPER)
    expect(COPPER).toBe(89); expect(w.steps.map(s => s.keep)).toEqual([false, true, true, false, true, true]); expect(w.sum).toBe(85); expect(w.rider).toBe(4)
    expect(reading(w.on, w.rider)).toBe(89); expect(weightsText(w.on)).toBe('50 g + 20 g + 10 g + 5 g')
    expect(tilt(89, 100)).toBe(-1); expect(tilt(89, 85)).toBe(1); expect(tilt(89, 89)).toBe(0)
  })
  it('第 3 课：量筒里 1 mL 的水柱高约 0.14 cm；40 mL 时俯视读到约 43 mL，仰视约 37 mL', () => {
    expect(columnCm(1, 1.5)).toBeCloseTo(0.1415, 3); expect(sightReading(40, 0)).toBe(40)
    expect(sightReading(40, SIGHT)).toBeCloseTo(42.8, 1); expect(sightReading(40, -SIGHT)).toBeCloseTo(37.2, 1)
  })
  it('第 3 课：水 40 mL，放进石块后 60 mL，石块的体积是 20 cm³', () => { expect(stoneV2()).toBe(60); expect(displaced(STONE.v1, stoneV2())).toBe(20) })
  it('第 4 课：6、10、20 cm³ 的铝块是 16.2、27、54 g，铜块是 53.4、89、178 g；比值分别是 2.7 和 8.9', () => {
    expect(blocks('al').map(b => b.m)).toEqual([16.2, 27, 54]); expect(blocks('cu').map(b => b.m)).toEqual([53.4, 89, 178])
    for (const b of blocks('al')) expect(density(b.m, b.V)).toBeCloseTo(2.7, 6)
    for (const b of blocks('cu')) expect(density(b.m, b.V)).toBeCloseTo(8.9, 6)
  })
  it('第 5 课：20 cm³ 的铝、铁、铜是 54、158、178 g；2.7 g/cm³ = 2.7×10³ kg/m³', () => {
    expect(BARS.map(k => massOf(k, BAR_V))).toEqual([54, 158, 178]); expect(toSI(RHO.al.rho)).toBe(2700); expect(sci(toSI(RHO.cu.rho))).toBe('8.9×10³'); expect(sci(toSI(RHO.water.rho))).toBe('1.0×10³')
    expect(weigh(158).rider).toBe(3); expect(weigh(178).rider).toBe(3)
  })
  it('第 6 课：石块 52 g、20 cm³，密度 2.6 g/cm³', () => { expect(stoneRho()).toBeCloseTo(2.6, 6) })
  it('第 6 课：盐水全倒进量筒只读到 58 mL，算出约 1.14 g/cm³（偏大）；倒出 40 mL、剩 62 g，算出 1.10 g/cm³', () => {
    expect(brineTotal()).toBe(106)
    const a = brineAll(), b = brinePart()
    expect(a.V).toBe(58); expect(a.m).toBe(66); expect(a.rho).toBeCloseTo(1.138, 3)
    expect(b.m2).toBe(62); expect(b.m).toBe(44); expect(b.rho).toBeCloseTo(1.1, 6); expect(a.rho).toBeGreaterThan(b.rho)
  })
  it('第 7 课：158 g、20 cm³ 的金属块密度 7.9 g/cm³，是铁', () => { expect(density(UNKNOWN.m, UNKNOWN.v)).toBeCloseTo(7.9, 6); expect(identify(density(UNKNOWN.m, UNKNOWN.v))).toBe('fe'); expect(identify(5)).toBe(null) })
  it('第 7 课：2 m × 1 m × 0.5 m 的铝锭体积 1 m³，质量 2.7×10³ kg', () => { expect(slabV()).toBe(1); expect(slabM()).toBe(2700) })
  it('第 7 课：47.4 g、10 cm³ 的铁球，铁只占 6 cm³，空心部分 4 cm³', () => { expect(density(BALL.m, BALL.v)).toBeCloseTo(4.74, 6); expect(solidV()).toBe(6); expect(hollowV()).toBe(4) })
  it('拓展：90 g 水的体积是 90 cm³，结成冰是 100 cm³', () => { expect(volumeOf('water', FREEZE.m)).toBe(90); expect(volumeOf('ice', FREEZE.m)).toBe(100) })
})
