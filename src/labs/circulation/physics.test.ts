// 大气环流实验室的计算核对：这里的数字要和规格卡 docs/specs/circulation.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { TRADES, airOf, beltLat, controlAt, flightHours, monsoonAt, routeKm, subsolarLat, upperDrift, upperHeading, warmSpan, windAtName, yearOf, MONTH_DAY, CTRL_WET, pressure, landVsSea } from './physics'

const flat = { k: 1, sunLat: 0 }
describe('大气环流', () => {
  it('第 1 课：地球不自转，北半球近地面吹北风、南半球吹南风', () => {
    expect(windAtName(0, 30, { k: 0, sunLat: 0 })).toBe('北风')
    expect(windAtName(0, -30, { k: 0, sunLat: 0 })).toBe('南风')
  })
  it('第 2 课：赤道高空向北的气流越走越偏东，到 30°N 偏约 82°（示意）', () => {
    expect(upperHeading(0)).toBeCloseTo(0, 6)
    expect(upperHeading(10)).toBeLessThan(upperHeading(20))
    expect(Math.round(upperHeading(30))).toBe(82)
    expect(Math.round(upperDrift(30))).toBe(72)
  })
  it('第 3 课：三个风带的风向，北半球向右偏、南半球向左偏', () => {
    expect(windAtName(0, 15, flat)).toBe('东北风')
    expect(windAtName(0, 45, flat)).toBe('西南风')
    expect(windAtName(0, 75, flat)).toBe('东北风')
    expect(windAtName(0, -15, flat)).toBe('东南风')
    expect(windAtName(0, -45, flat)).toBe('西北风')
    expect(windAtName(0, -75, flat)).toBe('东南风')
  })
  it('第 4 课：夏至直射点 23.4°N，副热带高气压带（北）移到约 35°N；冬至移到约 25°N', () => {
    expect(subsolarLat(173)).toBeCloseTo(23.4, 1)
    expect(subsolarLat(356)).toBeCloseTo(-23.4, 1)
    expect(beltLat('sthN', 23.4)).toBe(35)
    expect(beltLat('sthN', -23.4)).toBe(25)
    expect(beltLat('eq', 23.4)).toBe(5)
    expect(beltLat('polarN', 23.4)).toBe(90)
  })
  it('第 5 课：雅典夏季受副热带高压控制少雨、冬季受西风带控制多雨；新加坡全年受赤道低压控制', () => {
    expect(controlAt(38, MONTH_DAY[6])).toBe('sthN')
    expect(controlAt(38, MONTH_DAY[0])).toBe('westN')
    expect(yearOf('singapore').every(m => m.c === 'eq')).toBe(true)
    expect(yearOf('darwin')[0].c).toBe('eq')
    expect(yearOf('darwin')[6].c).toBe('tradeS')
    expect(CTRL_WET.sthN).toBe(false)
  })
  it('第 6 课：1 月亚洲高压在陆上，7 月亚洲低压在陆上', () => {
    expect(pressure(98, 46, airOf('jan'))).toBeGreaterThan(0.5)
    expect(pressure(75, 31, airOf('jul'))).toBeLessThan(-0.5)
    expect(pressure(178, 52, airOf('jan'))).toBeLessThan(0)
    expect(pressure(-150, 34, airOf('jul'))).toBeGreaterThan(0)
    expect(landVsSea('jan')).toBe(-1)
  })
  it('第 7 课：东亚冬季西北风、夏季东南风；南亚冬季东北风、夏季西南风', () => {
    expect(monsoonAt('shanghai', 'jan')).toBe('西北风')
    expect(monsoonAt('shanghai', 'jul')).toBe('东南风')
    expect(monsoonAt('mumbai', 'jan')).toBe('东北风')
    expect(monsoonAt('mumbai', 'jul')).toBe('西南风')
  })
  it('拓展：上海到旧金山约 9881 km，往东顺西风约 9.9 h，往西约 12.4 h（示意）', () => {
    expect(routeKm()).toBe(9881)
    expect(flightHours(true)).toBe(9.9)
    expect(flightHours(false)).toBe(12.4)
    expect(warmSpan('weak')).toBeGreaterThan(warmSpan('normal'))
    expect(TRADES.weak.strength).toBeLessThan(TRADES.normal.strength)
  })
})
