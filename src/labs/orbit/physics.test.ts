// 地球的运动实验室的计算核对：这里的数字要和规格卡 docs/specs/orbit.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { CITIES, YEAR, clockText, dayLength, geoDir, hoursText, isDay, localTime, noonAltitude, orbitDir, pendulumRate, shadowLength, subsolarLat, timeGap, utcForNoon, zones } from './physics'

describe('地球的运动', () => {
  it('第 2 课：北京和伦敦的地方时相差约 7 小时 44 分；东边的早', () => {
    expect(hoursText(timeGap(116, 0))).toBe('7 小时 44 分'); expect(hoursText(timeGap(116, 87.6))).toBe('1 小时 54 分')
    expect(localTime(utcForNoon(CITIES.beijing.lon), CITIES.beijing.lon)).toBeCloseTo(12, 6)
    expect(clockText(localTime(utcForNoon(116), 0))).toBe('04:16')
  })
  it('第 3 课：公转一圈回到原处；半年后在太阳的另一侧', () => {
    const a = orbitDir(0), b = orbitDir(YEAR), c = orbitDir(YEAR / 2)
    expect(b[0]).toBeCloseTo(a[0], 6); expect(b[2]).toBeCloseTo(a[2], 6); expect(c[2]).toBeCloseTo(-a[2], 6)
  })
  it('第 4 课：四个节气的直射点是 0°、北纬 23.5°、0°、南纬 23.5°', () => {
    expect(subsolarLat(0)).toBeCloseTo(0, 6); expect(subsolarLat(YEAR / 4)).toBeCloseTo(23.5, 6); expect(subsolarLat(YEAR / 2)).toBeCloseTo(0, 6); expect(subsolarLat(YEAR * 3 / 4)).toBeCloseTo(-23.5, 6)
  })
  it('第 4 课：画面和读数一致——夏至这天，北纬 23.5° 的正午点正对太阳', () => {
    const day = YEAR / 4, p = geoDir(23.5, 0, day, 12), [dx, , dz] = orbitDir(day)
    expect(p[0] * -dx + p[1] * 0 + p[2] * -dz).toBeCloseTo(1, 6)
  })
  it('第 5 课：北京夏至昼长约 14 小时 51 分，冬至约 9 小时 9 分；赤道 12 小时；北纬 70° 夏至极昼', () => {
    expect(hoursText(dayLength(40, 23.5))).toBe('14 小时 51 分'); expect(hoursText(dayLength(40, -23.5))).toBe('9 小时 09 分')
    expect(dayLength(0, 23.5)).toBeCloseTo(12, 6); expect(dayLength(70, 23.5)).toBe(24); expect(dayLength(70, -23.5)).toBe(0)
  })
  it('第 6 课：北京正午太阳高度 73.5°、50°、26.5°；10 m 的旗杆影长 2.96 m、8.39 m、20.06 m', () => {
    expect(noonAltitude(40, 23.5)).toBeCloseTo(73.5, 6); expect(noonAltitude(40, 0)).toBeCloseTo(50, 6); expect(noonAltitude(40, -23.5)).toBeCloseTo(26.5, 6)
    expect(shadowLength(10, 73.5)).toBeCloseTo(2.96, 2); expect(shadowLength(10, 50)).toBeCloseTo(8.39, 2); expect(shadowLength(10, 26.5)).toBeCloseTo(20.06, 2)
  })
  it('第 7 课：倾斜 23.5° 时回归线 23.5°、极圈 66.5°；不倾斜时直射点一直在赤道', () => {
    expect(zones(23.5)).toEqual({ tropic: 23.5, polar: 66.5 }); expect(subsolarLat(YEAR / 4, 0)).toBeCloseTo(0, 6)
  })
  it('第 1 课：北京正午时是白天，半天以后是黑夜', () => {
    const u = utcForNoon(116.4); expect(isDay(39.9, 116.4, 0, u)).toBe(true); expect(isDay(39.9, 116.4, 0, u + 12)).toBe(false)
  })
  it('拓展：北纬 40° 的傅科摆每小时转约 9.6°', () => { expect(pendulumRate(40)).toBeCloseTo(9.64, 2) })
})
