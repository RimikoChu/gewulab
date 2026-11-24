// 板块运动实验室的计算核对：这里的数字要和规格卡 docs/specs/plate.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { QUAKES, VOLCANOES } from './plates'
import {
  EVEREST, PLATE_COUNT, atlanticGap, beltCount, distKm, driftSA, farthestFromBoundary, kmAfter, nearestBoundary, peakAt, quakeDepth,
  rateCmYr, riftWidth, rockAge, NATAL, PLACES,
} from './physics'

describe('板块运动', () => {
  it('球面距离：赤道上经度差 1° 约 111 km', () => { expect(distKm([0, 0], [1, 0])).toBeCloseTo(111.19, 1) })
  it('第 1 课：合拢以后纳塔尔贴到尼日利亚一带的海岸（北纬约 6°、东经约 6°）', () => {
    const [lon, lat] = driftSA(NATAL, 1)
    expect(lon).toBeCloseTo(6.1, 0); expect(lat).toBeCloseTo(5.8, 0)
  })
  it('第 1 课：今天的大西洋宽约 4800 km，拼合时为 0', () => { expect(Math.round(atlanticGap(0) / 100) * 100).toBe(4800); expect(atlanticGap(1)).toBeLessThan(1) })
  it('第 2 课：每侧 1.5 cm/年，离中脊 60 km 约 400 万年，120 km 约 800 万年，两侧对称', () => {
    expect(rockAge(60)).toBeCloseTo(4, 6); expect(rockAge(120)).toBeCloseTo(8, 6); expect(rockAge(-60)).toBe(rockAge(60))
  })
  it('第 3 课：六大板块', () => { expect(PLATE_COUNT).toBe(6) })
  it('第 4 课：每年 1 cm，张裂 500 万年裂开 50 km，2500 万年 250 km', () => { expect(riftWidth(5)).toBeCloseTo(50, 6); expect(riftWidth(25)).toBeCloseTo(250, 6) })
  it('第 5 课：碰撞完成时最高峰 8848.86 m，还没碰上时没有山', () => { expect(peakAt(1)).toBeCloseTo(EVEREST, 6); expect(peakAt(0.3)).toBe(0) })
  it('第 6 课：俯冲角 30°，离海沟 60 / 160 / 300 km 的震源约 43 / 100 / 181 km 深', () => {
    expect(Math.round(quakeDepth(60))).toBe(43); expect(Math.round(quakeDepth(160))).toBe(100); expect(Math.round(quakeDepth(300))).toBe(181)
  })
  it('第 7 课：图上每一处火山、地震离板块交界都不超过 400 km', () => { expect(farthestFromBoundary()).toBeLessThan(400) })
  it('第 7 课：环太平洋带上的火山、地震比地中海—喜马拉雅带多', () => {
    const p = beltCount('pacific'), a = beltCount('alpide')
    expect(p.v + p.q).toBeGreaterThan(a.v + a.q); expect(p.v + p.q + a.v + a.q).toBeLessThanOrEqual(VOLCANOES.length + QUAKES.length)
  })
  it('拓展：东京离板块交界不到 250 km，悉尼超过 1500 km', () => { expect(nearestBoundary(PLACES.tokyo.at).km).toBeLessThan(250); expect(nearestBoundary(PLACES.sydney.at).km).toBeGreaterThan(1500) })
  it('拓展：大西洋 4766 km ÷ 1.3 亿年 ≈ 3.7 cm/年；3.7 cm/年走 1 万年约 0.37 km', () => {
    expect(rateCmYr(atlanticGap(0), 130)).toBeCloseTo(3.67, 1); expect(kmAfter(3.7, 0.01)).toBeCloseTo(0.37, 6)
  })
})
