// 机械振动和机械波实验室的计算核对：这里的数字要和规格卡 docs/specs/wave.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { BREAK, BUOY, GAPS, HORN, SPRINGS, TOW, TWIN, WATER, axisAmp, bend, buoyAmp, buoyFreeT, doppler, firstNode, gFrom, gain, gapField, gapRatio, heaveStep, lamAhead, lamBehind, lambda, pathDiff, pendT, ring, shadowAmp, shm, speed, spotAmp, spotAt, springT, standAmp, stretch, towField, travel, wedge } from './physics'

describe('机械振动和机械波', () => {
  it('第 1 课：0.5 kg、50 N/m 的周期 0.63 s，10 次全振动 6.28 s', () => {
    expect(springT(SPRINGS.a.m, SPRINGS.a.k)).toBeCloseTo(0.628, 3)
    expect(springT(SPRINGS.a.m, SPRINGS.a.k) * 10).toBeCloseTo(6.28, 2)
  })
  it('第 1 课：质量 4 倍周期 2 倍；劲度系数也 4 倍周期还原', () => {
    expect(springT(SPRINGS.b.m, SPRINGS.b.k)).toBeCloseTo(1.257, 3)
    expect(springT(SPRINGS.c.m, SPRINGS.c.k)).toBeCloseTo(0.628, 3)
  })
  it('第 1 课：挂 0.5 kg 伸长 0.098 m；半个周期后到另一侧', () => {
    expect(stretch(0.5, 50)).toBeCloseTo(0.098, 6)
    expect(shm(0.05, 0.628, 0.314)).toBeCloseTo(-0.05, 6)
  })
  it('第 2 课：摆长 1.00 m 周期 2.01 s，0.25 m 周期 1.00 s', () => {
    expect(pendT(1)).toBeCloseTo(2.007, 3)
    expect(pendT(0.25)).toBeCloseTo(1.004, 3)
    expect(pendT(1) / pendT(0.25)).toBeCloseTo(2, 9)
  })
  it('第 2 课：用 l = 1.00 m、T = 2.007 s 算出 g = 9.8', () => { expect(gFrom(1, pendT(1))).toBeCloseTo(9.8, 9) })
  it('第 3 课：0.25、0.5、1 Hz 的涌浪里，浮标振幅 0.13、0.50、0.03 m', () => {
    expect(buoyAmp(0.25)).toBeCloseTo(0.132, 3)
    expect(buoyAmp(0.5)).toBeCloseTo(0.5, 9)
    expect(buoyAmp(1)).toBeCloseTo(0.033, 3)
    expect(gain(0.5)).toBeCloseTo(5, 9)
  })
  it('第 3 课：一步一步算出来的受迫振动，稳定后的振幅和公式一致；自由振动周期 2.01 s', () => {
    let y = 0, v = 0, max = 0; const dt = 1 / 240
    for (let i = 0; i < 240 * 40; i++) { const t = i * dt; [y, v] = heaveStep(y, v, BUOY.A * Math.sin(2 * Math.PI * 0.5 * t), dt); if (t > 30) max = Math.max(max, Math.abs(y)) }
    expect(max).toBeCloseTo(0.5, 1)
    expect(buoyFreeT()).toBeCloseTo(2.01, 2)
  })
  it('第 4 课：0.5 Hz 波长 4 m，1 Hz 波长 2 m，波速都是 2 m/s', () => {
    expect(lambda(0.5)).toBe(4); expect(lambda(1)).toBe(2)
    expect(speed(lambda(0.5), 0.5)).toBe(WATER.v); expect(speed(lambda(1), 1)).toBe(WATER.v)
  })
  it('第 4 课：波 2 s 传到 4 m 处，没传到的地方不动；相距一个波长的两点步调一致', () => {
    expect(travel(0.2, 0.5, 4, 1.9)).toBe(0)
    expect(travel(0.2, 0.5, 2, 5.3)).toBeCloseTo(travel(0.2, 0.5, 6, 7.3), 9)
    expect(travel(0.2, 0.5, 2, 6.3)).toBeCloseTo(-travel(0.2, 0.5, 4, 6.3), 9)
  })
  it('第 5 课：P、Q、R 的路程差 0、2、4 m，两个波源都开时振幅 0.30、0、0.30 m', () => {
    expect([pathDiff('P'), pathDiff('Q'), pathDiff('R')]).toEqual([0, 2, 4])
    expect(spotAmp('P', 2)).toBeCloseTo(0.3, 9); expect(spotAmp('Q', 2)).toBeCloseTo(0, 9); expect(spotAmp('R', 2)).toBeCloseTo(0.3, 9)
    expect(spotAmp('Q', 1)).toBe(0.15); expect(TWIN.A).toBe(0.15)
  })
  it('第 5 课：观察点的位置和 r1、r2 对得上；两列波在 Q 点相消', () => {
    const [x, z] = spotAt('Q')
    expect(Math.hypot(x + 4, z)).toBeCloseTo(12, 9); expect(Math.hypot(x - 4, z)).toBeCloseTo(10, 9)
    expect(ring(0.1, 0.5, 12, 20.3) + ring(0.1, 0.5, 10, 20.3)).toBeCloseTo(0, 9)
  })
  it('第 6 课：口门是波长的 4 倍、1 倍、1 倍', () => { expect([gapRatio('wide'), gapRatio('narrow'), gapRatio('long')]).toEqual([4, 1, 1]) })
  it('第 6 课：堤后 B 点的振幅是正后方 C 点的 14%、62%、63%', () => {
    expect(shadowAmp('wide')).toBeCloseTo(0.04, 2); expect(axisAmp('wide')).toBeCloseTo(0.27, 2)
    expect(shadowAmp('narrow')).toBeCloseTo(0.05, 2); expect(axisAmp('narrow')).toBeCloseTo(0.08, 2)
    expect(shadowAmp('long')).toBeCloseTo(0.07, 2); expect(axisAmp('long')).toBeCloseTo(0.12, 2)
    expect(bend('wide')).toBeCloseTo(0.14, 2); expect(bend('narrow')).toBeCloseTo(0.62, 2); expect(bend('long')).toBeCloseTo(0.63, 2)
  })
  it('第 6 课：宽口门正后方的波和外海来波差不多一样高', () => {
    const [re, im] = gapField(GAPS.wide.d, 4, 0, 6)
    expect(Math.hypot(re, im)).toBeGreaterThan(0.8); expect(Math.hypot(re, im)).toBeLessThan(1.25)
    expect(BREAK.A).toBe(0.2)
  })
  it('第 7 课：艇速 1 m/s，前方 1.00 Hz、后方 0.33 Hz；0.5 m/s 时 0.67、0.40 Hz', () => {
    expect(doppler(TOW.f, 1)).toBeCloseTo(1, 9); expect(doppler(TOW.f, -1)).toBeCloseTo(0.333, 3)
    expect(doppler(TOW.f, 0.5)).toBeCloseTo(0.667, 3); expect(doppler(TOW.f, -0.5)).toBeCloseTo(0.4, 9)
    expect(lamAhead(TOW.f, 1)).toBe(2); expect(lamBehind(TOW.f, 1)).toBe(6)
  })
  it('第 7 课：运动波源的波场，正前方相邻两个波峰相距 2 m', () => {
    // t = 14 s 时艇在 x = 14；艇前方的波：x 相差 2 m 的两点位移相同
    expect(towField(0.12, 0.5, 1, 20, 0, 14)).toBeCloseTo(towField(0.12, 0.5, 1, 22, 0, 14), 6)
    expect(towField(0.12, 0.5, 1, -10, 0, 14)).toBeCloseTo(towField(0.12, 0.5, 1, -4, 0, 14), 6)
  })
  it('第 7 课：400 Hz 的汽笛，船以 17 m/s 驶来听到 421 Hz，驶离 381 Hz', () => {
    expect(doppler(HORN.f, HORN.u, HORN.v)).toBeCloseTo(421, 0); expect(doppler(HORN.f, -HORN.u, HORN.v)).toBeCloseTo(381, 0)
  })
  it('拓展：驻波的波节离岸壁 λ/4，波腹振幅 2A；艇速 4 m/s 时艏波半顶角 30°', () => {
    expect(firstNode(4)).toBe(1); expect(standAmp(1, 4)).toBeCloseTo(0, 9); expect(standAmp(0, 4)).toBeCloseTo(0.2, 9); expect(standAmp(2, 4)).toBeCloseTo(0.2, 9)
    expect(wedge(4)).toBeCloseTo(30, 6); expect(wedge(3)).toBeCloseTo(41.8, 1)
  })
})
