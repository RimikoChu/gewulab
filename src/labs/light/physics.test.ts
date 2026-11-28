// 光的波动性和光电效应实验室的计算核对：这里的数字要和规格卡 docs/specs/light.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { GAPS, DISTS, L5, LIGHTS, NA, RIG, SLITS, analyzer, arThickness, centralWidth, doubleSlitI, ekMax, emits, filmFringes, filmReflect, filmStep, filmThickness, freq14, fringeGap, headReading, photoCurrent, photonEV, photonHits, planckFrom, polarized, reflectance, stopU, toEV, W0, wavelengthFrom } from './physics'

describe('光的波动性和光电效应', () => {
  it('第 1 课：红光、缝距 0.20 mm、屏距 1.20 m，条纹间距 3.9 mm', () => { expect(fringeGap(1.2, 650, 0.2)).toBeCloseTo(3.9, 6) })
  it('第 1 课：亮纹中心最亮，相邻亮纹正中间是暗纹；挡住一条缝就没有暗纹', () => {
    expect(doubleSlitI(0, 1.2, 650, 0.2)).toBeCloseTo(1, 6)
    expect(doubleSlitI(1.95, 1.2, 650, 0.2)).toBeCloseTo(0, 6)
    expect(doubleSlitI(1.95, 1.2, 650, 0.2, false)).toBeGreaterThan(0.2)
  })
  it('第 2 课：缝距减半间距加倍，屏距减半间距减半，波长越短间距越小', () => {
    expect(fringeGap(DISTS[0], 650, GAPS[1])).toBeCloseTo(7.8, 6)
    expect(fringeGap(DISTS[1], 650, GAPS[0])).toBeCloseTo(1.95, 6)
    expect(fringeGap(1.2, LIGHTS.green.nm, 0.2)).toBeCloseTo(3.192, 6)
    expect(fringeGap(1.2, LIGHTS.blue.nm, 0.2)).toBeCloseTo(2.7, 6)
  })
  it('第 3 课：红色滤光片，第 1 条 2.320 mm，第 6 条 13.870 mm，算出 660 nm', () => {
    expect(headReading('red', 1)).toBeCloseTo(2.32, 6); expect(headReading('red', 6)).toBeCloseTo(13.87, 6)
    expect(wavelengthFrom(headReading('red', 1), headReading('red', 6), 6)).toBeCloseTo(660, 4)
  })
  it('第 3 课：绿色滤光片，第 6 条 11.980 mm，算出 540 nm', () => {
    expect(headReading('green', 6)).toBeCloseTo(11.98, 6)
    expect(wavelengthFrom(headReading('green', 1), headReading('green', 6), 6)).toBeCloseTo(RIG.filters.green.nm, 4)
  })
  it('第 4 课：钠黄光下相邻亮纹处膜厚相差约 221 nm；膜极薄处是暗的', () => {
    expect(filmStep(NA)).toBeCloseTo(221.4, 1)
    expect(filmReflect(0, NA)).toBe(0)
    expect(filmReflect(filmStep(NA) / 2, NA)).toBeCloseTo(1, 6)
  })
  it('第 4 课：膜上薄下厚；刚拉出来 7 条亮纹，流了一阵 11 条', () => {
    expect(filmThickness(1, 0)).toBeGreaterThan(filmThickness(0, 0)); expect(filmThickness(0, 1)).toBe(0)
    expect(filmFringes(0, NA)).toBe(7); expect(filmFringes(1, NA)).toBe(11)
  })
  it('第 5 课：缝宽 0.40 mm 中央亮纹宽 3.9 mm，调到 0.10 mm 变成 15.6 mm', () => {
    expect(centralWidth(L5, 650, SLITS[0])).toBeCloseTo(3.9, 6); expect(centralWidth(L5, 650, SLITS[1])).toBeCloseTo(15.6, 6)
  })
  it('第 5 课：两片偏振片平行最亮，垂直全暗，45° 是一半', () => {
    expect(analyzer(0)).toBeCloseTo(1, 9); expect(analyzer(90)).toBeCloseTo(0, 9); expect(analyzer(45)).toBeCloseTo(0.5, 9); expect(polarized(0)).toBeCloseTo(0.5, 9)
  })
  it('第 6 课：红光 4.62×10¹⁴ Hz 低于钾的截止频率，再强也没有电流；绿光 5.64×10¹⁴ Hz 有电流，光强加倍电流加倍', () => {
    expect(freq14(650)).toBeCloseTo(4.62, 2); expect(freq14(532)).toBeCloseTo(5.64, 2)
    expect(emits(650)).toBe(false); expect(photoCurrent(650, 2)).toBe(0)
    expect(photoCurrent(532, 1)).toBe(12); expect(photoCurrent(532, 2)).toBe(24)
  })
  it('第 7 课：逸出功 2.25 eV；遏止电压 绿 0.08 V、蓝 0.51 V、紫 0.82 V，和光强无关', () => {
    expect(toEV(W0)).toBeCloseTo(2.25, 2)
    expect(stopU(532)).toBeCloseTo(0.08, 2); expect(stopU(450)).toBeCloseTo(0.51, 2); expect(stopU(405)).toBeCloseTo(0.82, 2)
    expect(ekMax(450)).toBeCloseTo(photonEV(450) - 2.254, 2)
    expect(photoCurrent(450, 1, stopU(450))).toBe(0); expect(photoCurrent(450, 2, stopU(450))).toBe(0); expect(photoCurrent(450, 2, 0.2)).toBeGreaterThan(0)
  })
  it('第 7 课：由蓝光和紫光的遏止电压算回普朗克常量 6.63×10⁻³⁴ J·s', () => { expect(planckFrom(450, stopU(450), 405, stopU(405)) / 1e-34).toBeCloseTo(6.63, 6) })
  it('拓展：增透膜厚约 100 nm，反射从 4.0% 降到约 1.4%', () => {
    expect(arThickness()).toBeCloseTo(99.6, 1); expect(reflectance(false) * 100).toBeCloseTo(4.0, 6); expect(reflectance(true) * 100).toBeCloseTo(1.41, 2)
  })
  it('拓展：一个一个光子落点随机，攒多了亮纹处多、暗纹处少', () => {
    const hits = photonHits(3000, 1.2, 650, 0.2), near = (c: number) => hits.filter(([x]) => Math.abs(x - c) < 0.5).length
    expect(hits.length).toBe(3000); expect(near(0)).toBeGreaterThan(near(1.95) * 5)
  })
})
