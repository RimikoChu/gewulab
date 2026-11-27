// 导数实验室的计算核对：这里的数字要和规格卡 docs/specs/derivative.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { canArea, canBest, canHeight, classify, extremaOn, FUNCS, fuel, fuelBest, kmh, lineText, monotone, mvtTimes, numSlope, quotient, road, rootsOfSlope, secant3, slope, spanSpeed, tangent, trip, tripSpeed, zoneAvg } from './physics'

describe('导数', () => {
  it('第 1 课：三段的平均速度 2、8、14 m/s', () => {
    expect(spanSpeed('a')).toBeCloseTo(2, 9); expect(spanSpeed('b')).toBeCloseTo(8, 9); expect(spanSpeed('c')).toBeCloseTo(14, 9)
  })
  it('第 2 课：t = 2 s 时差商 4 + Δt，极限 4 m/s = 14.4 km/h', () => {
    expect(quotient(2, 1)).toBeCloseTo(5, 9); expect(quotient(2, 0.1)).toBeCloseTo(4.1, 9); expect(quotient(2, 0.001)).toBeCloseTo(4.001, 9)
    expect(quotient(2, -0.01)).toBeCloseTo(3.99, 9); expect(kmh(4)).toBeCloseTo(14.4, 9)
  })
  it('第 3 课：割线斜率 −4、−5.5、−5.875、−5.995，切线 y = −6x + 26', () => {
    expect(road(3)).toBeCloseTo(8, 9)
    expect(secant3(2)).toBeCloseTo(-4, 9); expect(secant3(1)).toBeCloseTo(-5.5, 9); expect(secant3(0.5)).toBeCloseTo(-5.875, 9); expect(secant3(0.1)).toBeCloseTo(-5.995, 9)
    const t = tangent(road, slope, 3); expect(t.k).toBeCloseTo(-6, 9); expect(t.b).toBeCloseTo(26, 9); expect(lineText(t.k, t.b)).toBe('y = −6x + 26')
  })
  it('第 4 课：五个函数的导数值和公式一致', () => {
    expect(FUNCS.pow.df(2)).toBe(12); expect(FUNCS.sin.df(0)).toBe(1); expect(FUNCS.exp.df(1)).toBeCloseTo(Math.E, 9); expect(FUNCS.ln.df(2)).toBe(0.5); expect(FUNCS.sin2.df(0)).toBe(2)
    for (const c of Object.values(FUNCS)) for (const x of [0.4, 1.3]) expect(numSlope(c.f, x)).toBeCloseTo(c.df(x), 5)
  })
  it('第 5 课：f′ = 0 在 x = 1、5；递增 (0, 1)、(5, 6)，递减 (1, 5)', () => {
    const [a, b] = rootsOfSlope(); expect(a).toBeCloseTo(1, 9); expect(b).toBeCloseTo(5, 9)
    const m = monotone(); expect(m.up[0][1]).toBeCloseTo(1, 9); expect(m.down[0][0]).toBeCloseTo(1, 9); expect(m.down[0][1]).toBeCloseTo(5, 9)
    expect(slope(0)).toBeCloseTo(7.5, 9); expect(slope(3)).toBeCloseTo(-6, 9)
  })
  it('第 6 课：极大值 16、极小值 0，[2, 6] 上最大 13.5（x = 2）最小 0', () => {
    expect(classify(1).kind).toBe('max'); expect(classify(1).left).toBeCloseTo(3.375, 9); expect(classify(1).right).toBeCloseTo(-2.625, 9); expect(road(1)).toBeCloseTo(16, 9)
    expect(classify(5).kind).toBe('min'); expect(road(5)).toBeCloseTo(0, 9)
    const e = extremaOn(2, 6); expect(e.max.x).toBe(2); expect(e.max.y).toBeCloseTo(13.5, 9); expect(e.min.x).toBeCloseTo(5, 9); expect(road(6)).toBeCloseTo(3.5, 9)
  })
  it('第 7 课：r = 3、5 cm 时 S ≈ 276.5、289.1；最省 r ≈ 3.74、h = 2r、S ≈ 264.4', () => {
    expect(canArea(3)).toBeCloseTo(276.55, 2); expect(canArea(5)).toBeCloseTo(289.08, 2); expect(canHeight(3)).toBeCloseTo(11.67, 2); expect(canHeight(5)).toBeCloseTo(4.20, 2)
    const b = canBest(); expect(b.r).toBeCloseTo(3.745, 3); expect(b.h).toBeCloseTo(2 * b.r, 9); expect(b.s).toBeCloseTo(264.36, 2)
  })
  it('拓展：平均 100 km/h，速度等于 100 km/h 在 t = 6 ∓ 2√3；最省油 80 km/h、11.25 L', () => {
    expect(trip(12)).toBeCloseTo(20, 9); expect(zoneAvg()).toBeCloseTo(100, 9); expect(tripSpeed(0)).toBeCloseTo(80, 9); expect(tripSpeed(12)).toBeCloseTo(80, 9); expect(tripSpeed(6)).toBeCloseTo(110, 9)
    for (const t of mvtTimes()) expect(tripSpeed(t)).toBeCloseTo(100, 9)
    const f = fuelBest(); expect(f.v).toBeCloseTo(80, 9); expect(f.q).toBeCloseTo(11.25, 9); expect(fuel(60)).toBeCloseTo(12.396, 3); expect(fuel(100)).toBeCloseTo(12.0625, 9)
  })
})
