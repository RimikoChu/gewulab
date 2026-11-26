// 地震实验室的计算核对：这里的数字要和规格卡 docs/specs/quake.md 里写的一致。
import { describe, expect, it } from 'vitest'
import * as P from './physics'

describe('地震', () => {
  it('第 1 课：汶川地震震源 14 km，是浅源地震；成都的震中距约 70 km', () => {
    expect(P.WENCHUAN.h).toBe(14)
    expect(P.depthType(P.WENCHUAN.h)).toBe('浅源地震')
    expect(P.depthType(150)).toBe('中源地震')
    expect(P.depthType(400)).toBe('深源地震')
    expect(Math.round(P.epiDist('chengdu'))).toBe(70)
  })
  it('第 2 课：8.0 级时映秀 11 度、成都 7 度、北川 11 度；7.0 级时映秀 10 度、成都 6 度', () => {
    expect(P.cityIntensity('yingxiu', 8)).toBe(11)
    expect(P.cityIntensity('chengdu', 8)).toBe(7)
    expect(P.cityIntensity('beichuan', 8)).toBe(11)
    expect(P.cityIntensity('yingxiu', 7)).toBe(10)
    expect(P.cityIntensity('chengdu', 7)).toBe(6)
  })
  it('第 2 课：震级大 1 级，能量约 32 倍；8.0 级约 6.3×10¹⁶ J', () => {
    expect(Math.round(P.energyRatio(1))).toBe(32)
    expect(P.sci(P.energy(8))).toBe('6.3×10¹⁶')
  })
  it('第 3 课：离震中 60 km，纵波约 10.3 s、横波约 17.6 s 到，晚 7.3 s；30 km 晚 3.9 s，100 km 晚 12.0 s', () => {
    expect(P.tP(60, 14)).toBeCloseTo(10.27, 2)
    expect(P.tS(60, 14)).toBeCloseTo(17.60, 2)
    expect(P.lagSP(60, 14).toFixed(1)).toBe('7.3')
    expect(P.lagSP(30, 14).toFixed(1)).toBe('3.9')
    expect(P.lagSP(100, 14).toFixed(1)).toBe('12.0')
  })
  it('第 4 课：警报约 10.5 s 发出；都江堰在盲区，成都提前约 10.0 s，绵阳约 24.5 s，盲区半径约 34 km', () => {
    expect(P.alertTime().toFixed(1)).toBe('10.5')
    expect(P.leadTime('dujiangyan')).toBeLessThan(0)
    expect(P.leadTime('wenchuan').toFixed(1)).toBe('3.8')
    expect(P.leadTime('chengdu').toFixed(1)).toBe('10.0')
    expect(P.leadTime('mianyang').toFixed(1)).toBe('24.5')
    expect(Math.round(P.blindRadius())).toBe(34)
  })
  it('第 5 课：A、B、C 三台的时间差 3.2、5.3、6.5 s，三圆交于震中', () => {
    expect(P.stationLag('A').toFixed(1)).toBe('3.2')
    expect(P.stationLag('B').toFixed(1)).toBe('5.3')
    expect(P.stationLag('C').toFixed(1)).toBe('6.5')
    expect(Math.round(P.radiusFromLag(P.stationLag('A')))).toBe(25)
    const cs = (['A', 'B', 'C'] as const).map(k => ({ c: P.ABC[k].at, r: P.radiusFromLag(P.stationLag(k)) }))
    const { at } = P.locate(cs)
    expect(Math.hypot(at[0] - P.QUIZ_QUAKE.epi[0], at[1] - P.QUIZ_QUAKE.epi[1])).toBeLessThan(0.5)
    expect(P.circleCross(cs[0], cs[1])).toHaveLength(2)
  })
  it('第 6 课：古登堡面约 2900 km，横波在外核为 0；莫霍面以下纵波加快到约 8 km/s', () => {
    expect(Math.round(P.D_CMB / 100) * 100).toBe(2900)
    expect(P.D_ICB).toBe(5150)
    expect(P.velAtDepth(2880).vs).toBeGreaterThan(7)
    expect(P.velAtDepth(2900).vs).toBe(0)
    expect(P.velAtDepth(2900).vp).toBeCloseTo(8.0, 1)
    expect(P.velAtDepth(40).vp).toBeCloseTo(8.0, 1)
  })
  it('第 6 课：画出来的射线都不落进 104°–143° 的影区；横波射线没有一条穿过外核', () => {
    for (const w of ['P', 'S'] as const) for (const r of P.rayFan(w)) { const d = P.landDeg(r); if (d !== null) expect(d < 104 || d >= 143).toBe(true) }
    const s = P.rayFan('S').map(P.landDeg).filter((d): d is number => d !== null)
    expect(Math.max(...s)).toBeLessThan(104)
    expect(P.receives(120)).toEqual({ p: false, s: false })
    expect(P.receives(160)).toEqual({ p: true, s: false })
  })
  it('第 7 课：1 s 的波 10 层楼约 10 倍、晃得最凶；2 s 的波 20 层楼最凶，装阻尼器后约 2.7 倍', () => {
    expect(P.natPeriod(10)).toBe(1)
    expect(Math.round(P.buildingTR(10, 1))).toBe(10)
    expect(P.worst(1)).toBe('mid')
    expect(P.worst(2)).toBe('high')
    expect(P.worst(0.3)).toBe('low')
    expect(P.buildingTR(20, 2, true).toFixed(1)).toBe('2.7')
  })
})
