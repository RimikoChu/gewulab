// 碳和二氧化碳实验室的计算核对：这里的数字要和规格卡 docs/specs/carbon.md 里写的一致。
import { describe, expect, it } from 'vitest'
import {
  BOTTLE, C60_BOND, CUO, DIAMOND_BOND, MARBLE, TARGET_PPM, bonds, c60Atoms, caco3FromCO2, candleOut, co2FromCaCO3, collected, cuFromCuO, degree,
  diamondAtoms, dissolved, fullTime, graphiteAtoms, greenhouseStep, photoRel, solidMass, squeeze, sublime,
} from './physics'

describe('碳和二氧化碳', () => {
  it('第 1 课：C₆₀ 有 60 个原子、90 根键，每个原子连 3 根', () => {
    const a = c60Atoms(), b = bonds(a, C60_BOND)
    expect(a.length).toBe(60); expect(b.length).toBe(90)
    for (let i = 0; i < 60; i++) expect(degree(b, i)).toBe(3)
  })
  it('第 1 课：金刚石里中心那个碳原子连着 4 个碳原子', () => {
    const a = diamondAtoms(), b = bonds(a, DIAMOND_BOND), c = a.findIndex(p => Math.hypot(...p) < 1e-9)
    expect(degree(b, c)).toBe(4)
  })
  it('第 1 课：石墨层内每个碳原子最多连 3 个', () => {
    const a = graphiteAtoms(), b = bonds(a, 1)
    expect(Math.max(...a.map((_, i) => degree(b, i)))).toBe(3)
  })
  it('第 2 课：10 g 碳酸钙完全反应生成 4.4 g 二氧化碳', () => { expect(co2FromCaCO3(MARBLE)).toBeCloseTo(4.4, 6) })
  it('第 2 课：稀盐酸能集满，稀硫酸集不满', () => {
    expect(collected('hcl', fullTime() + 0.01)).toBe(1)
    expect(collected('h2so4', 60)).toBeLessThan(0.3)
  })
  it('第 3 课：500 mL 的瓶加 170 mL 水，气体从 330 mL 减到 160 mL', () => {
    const s = squeeze(BOTTLE.V, BOTTLE.water)
    expect(s.gas).toBe(330); expect(s.left).toBe(160)
  })
  it('第 3 课：下层的蜡烛先灭', () => {
    const t = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4]
    expect(t.find(x => candleOut(0, x))!).toBeLessThan(t.find(x => candleOut(1, x))!)
  })
  it('第 4 课：44 g 二氧化碳生成 100 g 碳酸钙', () => { expect(caco3FromCO2(44)).toBeCloseTo(100, 6) })
  it('第 5 课：5 °C 时 100 / 300 kPa 约溶解 2.7 / 8.2 g/L', () => {
    expect(dissolved(5, 100)).toBeCloseTo(2.73, 2); expect(dissolved(5, 300)).toBeCloseTo(8.2, 1)
    expect(dissolved(5, 300) / dissolved(5, 100)).toBeCloseTo(3, 6)
  })
  it('第 6 课：2.00 g 氧化铜还原得到 1.60 g 铜', () => {
    expect(cuFromCuO(CUO)).toBeCloseTo(1.6, 6); expect(solidMass(100)).toBeCloseTo(1.6, 6)
  })
  it('第 7 课：有光时浓度下降，补气到 1000 ppm 停下，天黑后回升', () => {
    expect(greenhouseStep(420, true, false, 1)).toBeLessThan(420)
    let c = 300; for (let i = 0; i < 100; i++) c = greenhouseStep(c, true, true, 0.5)
    expect(c).toBe(TARGET_PPM)
    expect(greenhouseStep(500, false, false, 1)).toBeGreaterThan(500)
    expect(photoRel(400)).toBeCloseTo(100, 6); expect(photoRel(1000)).toBeGreaterThan(130)
  })
  it('拓展：干冰越放越少', () => { expect(sublime(0)).toBe(20); expect(sublime(10)).toBeLessThan(20) })
})
