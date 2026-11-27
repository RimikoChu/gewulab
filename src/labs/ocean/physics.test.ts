// 洋流和厄尔尼诺实验室的计算核对：这里的数字要和规格卡 docs/specs/ocean.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { debrisStep, icebergSize, meanDistance, COASTS, FISHERIES, catchIndex, coastDT, climateEffect, debrisDistance, driftKmPerDay, driftOf, ensoUpwelling, equatorProfile, fishCause, gyreSense, ninoIndex, rainfall, seaDensity, straitFlow, thermoEast, thermoWest, voyageHours, westSide, zonalSST, type FishKey } from './physics'

describe('洋流和厄尔尼诺', () => {
  it('第 1 课：信风吹出自东向西的洋流，西风吹出自西向东的洋流', () => {
    expect(driftOf('trade').flow).toBe('自东向西')
    expect(driftOf('west').flow).toBe('自西向东')
  })
  it('第 1 课：地中海一侧海水盐度高、密度大，约 1029.1 kg/m³，大西洋一侧约 1026.9 kg/m³；表层流入、底层流出', () => {
    const f = straitFlow()
    expect(f.med).toBeCloseTo(1029.1, 1)
    expect(f.atl).toBeCloseTo(1026.9, 1)
    expect(f.surface).toBe('大西洋 → 地中海')
    expect(seaDensity(10, 35)).toBe(1027)
  })
  it('第 2 课：中低纬大洋环流北半球顺时针、南半球逆时针；大洋西岸暖流、东岸寒流', () => {
    expect(gyreSense('np')).toBe('cw')
    expect(gyreSense('na')).toBe('cw')
    expect(gyreSense('sp')).toBe('ccw')
    expect(gyreSense('sa')).toBe('ccw')
    expect(gyreSense('si')).toBe('ccw')
    expect(westSide('np')!.west.warm).toBe(true)
    expect(westSide('np')!.east.warm).toBe(false)
    expect(westSide('sp')!.east.name).toBe('秘鲁寒流')
  })
  it('第 3 课：北半球中高纬逆时针；北印度洋冬季逆时针、夏季顺时针', () => {
    expect(gyreSense('npN')).toBe('ccw')
    expect(gyreSense('monW')).toBe('ccw')
    expect(gyreSense('monS')).toBe('cw')
  })
  it('第 4 课：西欧沿岸比同纬度暖、秘鲁沿岸比同纬度冷（示意）', () => {
    expect(coastDT('europe')).toBeGreaterThan(2)
    expect(coastDT('peru')).toBeLessThan(-2)
    expect(climateEffect(true)).toBe('增温增湿')
    expect(COASTS.peru.effect).toBe(climateEffect(false))
    expect(zonalSST(0)).toBe(28)
  })
  it('第 5 课：北海道、纽芬兰、北海渔场是寒暖流交汇，秘鲁渔场是上升流', () => {
    for (const k of Object.keys(FISHERIES) as FishKey[]) expect(fishCause(k)).toBe(FISHERIES[k].cause)
    expect(fishCause('peru')).toBe('上升流')
  })
  it('第 6 课：1000 km 航程，顺流约 29.8 h、逆流约 37.9 h；浮标一天漂约 86 km', () => {
    expect(voyageHours(true)).toBeCloseTo(29.76, 2)
    expect(voyageHours(false)).toBeCloseTo(37.88, 2)
    expect(driftKmPerDay(1)).toBeCloseTo(86.4, 6)
  })
  it('第 7 课：信风减弱，温跃层西浅东深变平，东太平洋海温距平 +2.8 °C（示意），上升流和渔获减少', () => {
    expect(thermoWest(1)).toBe(160)
    expect(thermoEast(1)).toBe(50)
    expect(thermoEast(0.3)).toBe(113)
    expect(ninoIndex(1)).toBe(0)
    expect(ninoIndex(0.3)).toBe(2.8)
    expect(ninoIndex(1.5)).toBe(-2)
    expect(ensoUpwelling(0.3)).toBeLessThan(ensoUpwelling(1))
    expect(catchIndex(0.3)).toBe(30)
    expect(rainfall('nino').peru).toBe('多雨，易洪涝')
    expect(equatorProfile(275, 0.3).sst).toBeGreaterThan(equatorProfile(275, 1).sst)
  })
  it('拓展：漂浮垃圾越来越靠近环流中心', () => {
    expect(debrisDistance(20, 1500)).toBeCloseTo(20 / Math.E, 6)
    let p: [number, number][] = [[240, 20], [180, 45], [150, 25]]
    const d0 = meanDistance(p)
    for (let i = 0; i < 100; i++) p = p.map(q => debrisStep(q, 10))
    expect(meanDistance(p)).toBeLessThan(d0)
  })
  it('拓展：冰山到 43°N 附近融化', () => {
    expect(icebergSize(50)).toBe(1)
    expect(icebergSize(43)).toBe(0)
  })
})
