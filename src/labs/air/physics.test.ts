// 空气和氧气实验室的计算核对：这里的数字要和规格卡 docs/specs/air.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { AIR, BELL, BOIL, JAR_L, MNO2, RHO, bottleMass, bubbleRate, burnAt, catalystMass, collect, combines, distill, floats, gasLoss, gathered, isCombination, isOxidation, jarMass, o2Used, outsideDropMM, phenomenon, relights, riseMM } from './physics'

describe('空气和氧气', () => {
  it('第 1 课：钟罩容积 10.0 L，消耗 21% 的氧气，水面上升 105 mm', () => {
    expect(BELL.area * BELL.height / 10 / 1000).toBeCloseTo(BELL.volume, 6)
    expect(riseMM(0.21)).toBeCloseTo(105, 6)
    expect(o2Used(0.21)).toBeCloseTo(2.1, 6)
    expect(riseMM(gasLoss('p')) / BELL.height).toBeCloseTo(0.21, 6)
  })
  it('第 1 课：换木炭，生成的二氧化碳占了氧气的位置，水面几乎不动', () => { expect(riseMM(gasLoss('c'))).toBe(0) })
  it('第 1 课：升进钟罩的水来自罩外，罩外水面下降 35 mm', () => { expect(outsideDropMM(105)).toBeCloseTo(35, 6) })
  it('第 2 课：250 mL 氧气 0.357 g、空气 0.323 g，相差 0.034 g', () => {
    expect(bottleMass(RHO.o2, JAR_L)).toBeCloseTo(0.357, 3)
    expect(jarMass('air')).toBeCloseTo(0.323, 3)
    expect(jarMass('o2') - jarMass('air')).toBeCloseTo(0.034, 3)
  })
  it('第 2 课：带火星的木条只在氧气里复燃', () => { expect(relights('o2')).toBe(true); expect(relights('air')).toBe(false) })
  it('第 3 课：21% 算“空气”一档，100% 算“氧气”一档', () => {
    expect(burnAt(21)).toBe('air'); expect(burnAt(100)).toBe('o2')
    expect(phenomenon('fe', 'air')).toContain('不能燃烧'); expect(phenomenon('fe', 'o2')).toContain('火星四射')
    expect(phenomenon('s', 'air')).toContain('淡蓝色'); expect(phenomenon('s', 'o2')).toContain('蓝紫色')
  })
  it('第 4 课：木炭、硫、铁丝燃烧是化合反应，石蜡燃烧不是；四个都是氧化反应', () => {
    expect(isCombination(2, 1)).toBe(true); expect(isCombination(2, 2)).toBe(false); expect(isCombination(1, 2)).toBe(false)
    expect((['c', 's', 'fe', 'wax'] as const).map(combines)).toEqual([true, true, true, false])
    expect((['c', 's', 'fe', 'wax'] as const).every(isOxidation)).toBe(true)
  })
  it('第 5 课：排水法收满一瓶 250 mL，排出 250 mL 水', () => { expect(collect(JAR_L)).toBeCloseTo(250, 6); expect(gathered(1e3)).toBe(JAR_L); expect(gathered(0)).toBe(0) })
  it('第 6 课：加入 2.0 g 二氧化锰，回收还是 2.0 g；加了以后反应快得多', () => { expect(catalystMass(MNO2)).toBe(2.0); expect(bubbleRate(true)).toBeGreaterThan(bubbleRate(false) * 10) })
  it('第 7 课：−196 ℃ 氮先馏出 78%，−183 ℃ 氧再馏出 21%', () => {
    expect(distill(-200)).toEqual({ stage: 'liquid', n2: 0, o2: 0 })
    expect(distill(BOIL.n2)).toEqual({ stage: 'n2', n2: 78, o2: 0 })
    expect(distill(-190).o2).toBe(0)
    expect(distill(BOIL.o2)).toEqual({ stage: 'o2', n2: 78, o2: 21 })
    expect(AIR.n2 + AIR.o2 + AIR.rare + AIR.co2 + AIR.other).toBeCloseTo(100, 6)
  })
  it('拓展：氦气比空气轻得多，气球上升；空气球不会', () => { expect(floats(RHO.he)).toBe(true); expect(floats(RHO.air)).toBe(false) })
})
