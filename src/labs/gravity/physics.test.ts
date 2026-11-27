// 万有引力与航天实验室的计算核对：这里的数字要和规格卡 docs/specs/gravity.md 里写的一致。
import { describe, expect, it } from 'vitest'
import * as P from './physics'

describe('万有引力与航天', () => {
  it('第 1 课：相同时间扫过的面积相等（近日点附近和远日点附近各扫 1/12 周期）', () => {
    const near = P.sweptArea(1, 0.5, -1 / 24, 1 / 24), far = P.sweptArea(1, 0.5, 0.5 - 1 / 24, 0.5 + 1 / 24)
    expect(near / far).toBeCloseTo(1, 4)
    expect(near).toBeCloseTo(P.ellipseArea(1, 0.5) / 12, 4)
  })
  it('第 1 课：示意行星近日点 51.6 km/s、远日点 17.2 km/s，比是 (1+e)/(1−e) = 3', () => {
    const vp = P.sunSpeed(P.SHOW.a, P.perihelion(P.SHOW.a, P.SHOW.e)), va = P.sunSpeed(P.SHOW.a, P.aphelion(P.SHOW.a, P.SHOW.e))
    expect(vp / 1000).toBeCloseTo(51.6, 1)
    expect(va / 1000).toBeCloseTo(17.2, 1)
    expect(vp / va).toBeCloseTo(3, 6)
  })
  it('第 2 课：五颗行星的 a³/T² 都约 3.36 × 10¹⁸ m³/s²，和 GM太阳/4π² 相差不到 1%', () => {
    for (const k of Object.keys(P.PLANETS) as P.PlanetKey[]) expect(Math.abs(P.keplerK(k) / 3.36e18 - 1)).toBeLessThan(0.01)
    expect(P.sunK() / 1e18).toBeCloseTo(3.36, 2)
  })
  it('第 3 课：扭秤上一个大球吸小球约 1.52 × 10⁻⁷ N，光点移 4.56 cm，反算回 G = 6.67 × 10⁻¹¹', () => {
    expect(P.ballForce() * 1e7).toBeCloseTo(1.52, 2)
    expect(P.spotShift() * 100).toBeCloseTo(4.56, 2)
    expect(P.measureG(2 * P.spotShift()) * 1e11).toBeCloseTo(6.67, 6)
  })
  it('第 4 课：用 g 和 R 称出地球 5.96 × 10²⁴ kg；用月球 6.02 × 10²⁴ kg；密度约 5.5 × 10³ kg/m³', () => {
    expect(P.massFromG() / 1e24).toBeCloseTo(5.96, 2)
    expect(P.massFromOrbit(P.MOON.r, P.MOON.T) / 1e24).toBeCloseTo(6.02, 2)
    expect(P.densityFromNear(P.nearPeriod()) / 1e3).toBeCloseTo(5.51, 2)
    expect(P.nearPeriod() / 60).toBeCloseTo(84.4, 1)
  })
  it('第 5 课：第一宇宙速度 7.9 km/s，第二 11.2 km/s，第三 16.6 km/s（教材写 16.7）', () => {
    expect(P.v1() / 1000).toBeCloseTo(7.9, 1)
    expect(P.v1FromG() / 1000).toBeCloseTo(7.9, 1)
    expect(P.v2() / 1000).toBeCloseTo(11.2, 1)
    expect(Math.abs(P.v3() / 1000 - 16.7)).toBeLessThan(0.1)
  })
  it('第 5 课：牛顿的大炮，越快落得越远；7.9 km/s 绕地球转，11.2 km/s 一去不回', () => {
    const r = [2000, 4000, 6000].map(v => P.cannonRange(v)!)
    expect(r[0] / 1000).toBeCloseTo(629, -1)
    expect(r[1]).toBeGreaterThan(r[0]); expect(r[2]).toBeGreaterThan(r[1])
    expect(P.shotFate(7900)).toBe('orbit')
    expect(P.shotFate(11200)).toBe('escape')
  })
  it('第 6 课：高轨低速长周期：近地 7.71 km/s、1.52 h；中圆 3.78 km/s、12.9 h；同步 3.07 km/s、24 h', () => {
    expect(P.circV(P.ORBITS.leo.r) / 1000).toBeCloseTo(7.71, 2)
    expect(P.circT(P.ORBITS.leo.r) / 3600).toBeCloseTo(1.52, 2)
    expect(P.circV(P.ORBITS.meo.r) / 1000).toBeCloseTo(3.78, 2)
    expect(P.circT(P.ORBITS.meo.r) / 3600).toBeCloseTo(12.9, 1)
    expect(P.circV(P.GEO_R) / 1000).toBeCloseTo(3.07, 2)
    expect(P.circW(P.ORBITS.leo.r)).toBeGreaterThan(P.circW(P.GEO_R))
  })
  it('第 6 课：同步卫星离地面约 3.6 × 10⁴ km（轨道半径 4.22 × 10⁴ km）', () => {
    expect(P.GEO_R / 1e7).toBeCloseTo(4.22, 2)
    expect(P.height(P.GEO_R) / 1e7).toBeCloseTo(3.59, 2)
  })
  it('第 7 课：变轨两次加速：近地点 7.71→10.13 km/s，远地点 1.61→3.07 km/s，转移半圈 5.3 h', () => {
    const t = P.transfer()
    expect(t.vp / 1000).toBeCloseTo(10.13, 2)
    expect(t.va / 1000).toBeCloseTo(1.61, 2)
    expect(t.dv1 / 1000).toBeCloseTo(2.42, 2)
    expect(t.dv2 / 1000).toBeCloseTo(1.46, 2)
    expect(t.half / 3600).toBeCloseTo(5.29, 2)
  })
  it('拓展：空间站（约 400 km）一圈约 92 分钟，一天约 15.6 圈；月球上的第一宇宙速度 1.68 km/s、火星 3.55 km/s', () => {
    expect(P.stationT() / 60).toBeCloseTo(92.5, 0)
    expect(P.laps(P.stationT())).toBeCloseTo(15.6, 1)
    expect(P.bodyV1('moon') / 1000).toBeCloseTo(1.68, 2)
    expect(P.bodyV1('mars') / 1000).toBeCloseTo(3.55, 2)
  })
})
