// 等高线地形图实验室的计算核对：这里的数字要和规格卡 docs/specs/contour.md 里写的一致。
import { describe, expect, it } from 'vitest'
import * as P from './physics'

describe('等高线地形图', () => {
  it('第 1 课：A 峰海拔 1564 m，村庄 120 m，相对高度 1444 m', () => {
    expect(P.altitude(P.TOP_A)).toBe(1564)
    expect(P.altitude(P.VILLAGE)).toBe(120)
    expect(P.relHeight(P.TOP_A, P.VILLAGE)).toBe(1444)
  })
  it('第 2 课：等高距 200 m 时 A 峰上 7 条线，100 m 时 15 条；切的顺序从 1400 m 到 200 m', () => {
    expect(P.linesOnPeak(200)).toBe(7)
    expect(P.linesOnPeak(100)).toBe(15)
    expect(P.sliceLevels(200)).toEqual([1400, 1200, 1000, 800, 600, 400, 200])
  })
  it('第 2 课：切出来的等高线上，各点的海拔都等于这一层', () => {
    const g = P.makeGrid(240, 160), s = P.contourSegments(g, 800)
    expect(s.length).toBeGreaterThan(100)
    for (let i = 0; i < s.length; i += 40) expect(Math.abs(P.height(s[i], s[i + 1]) - 800)).toBeLessThan(30)
  })
  it('第 3 课：同样升高 964 m，西坡走 2.2 km，东坡只走 0.9 km，东坡的线更密', () => {
    const w = P.climb('west'), e = P.climb('east')
    expect(w.rise).toBe(964); expect(e.rise).toBe(964)
    expect(w.km).toBe(2.2); expect(e.km).toBe(0.9)
    expect(w.lines).toBe(9); expect(e.lines).toBe(9)
    expect(e.gap).toBeLessThan(w.gap)
  })
  it('第 4 课：山顶里圈 1500 m、外圈 1400 m；盆地里圈 400 m、外圈 500 m；示坡线在盆地指向中心', () => {
    expect(P.innerRing(P.TOP_A, 'peak')).toBe(1500); expect(P.outerRing(P.TOP_A, 'peak')).toBe(1400)
    expect(P.innerRing(P.BASIN_C, 'basin')).toBe(400); expect(P.outerRing(P.BASIN_C, 'basin')).toBe(500)
    for (const [x, z, dx, dz] of P.slopeTicks(P.BASIN_C, 400, 8)) expect(dx * (P.BASIN_C[0] - x) + dz * (P.BASIN_C[1] - z)).toBeGreaterThan(0)
  })
  it('第 5 课：山脊上 16 滴雨东西各 8 滴；山谷里 8 滴都汇进河里', () => {
    expect(P.rainSummary('ridge')).toMatchObject({ total: 16, east: 8, west: 8 })
    expect(P.rainSummary('valley')).toMatchObject({ total: 8, river: 8 })
  })
  it('第 6 课：鞍部在 900 和 1000 m 之间；陡崖 3 条线重合，200 m ≤ H < 400 m，实际落差在范围里', () => {
    expect(P.SADDLE.h).toBeGreaterThan(900); expect(P.SADDLE.h).toBeLessThan(1000)
    const n = P.overlapCount(P.CLIFF.top, P.CLIFF.foot)
    expect(n).toBe(3)
    expect(P.cliffRange(n, 100)).toEqual([200, 400])
    const d = P.CLIFF.top - P.CLIFF.foot
    expect(d).toBeGreaterThanOrEqual(200); expect(d).toBeLessThan(400)
  })
  it('第 7 课：平原低于 200 m，丘陵低于 500 m，高原在 500 m 以上且起伏小，山地起伏大', () => {
    expect(P.landRange('plain').hi).toBeLessThan(200)
    expect(P.landRange('hill').hi).toBeLessThan(500)
    expect(P.landRange('plateau').lo).toBeGreaterThan(500); expect(P.landRange('plateau').relief).toBeLessThan(100)
    expect(P.landRange('mount').relief).toBeGreaterThan(1000)
    expect(P.altitude(P.BASIN_C)).toBeLessThan(P.landRange('basin').hi - 200)
  })
  it('拓展：峡谷口的坝短、水库大；A 峰山顶看得见日出，鞍部被挡；经鞍部翻山最高只到 920 m', () => {
    expect(P.damLength('gorge')).toBeLessThan(P.damLength('open'))
    expect(P.reservoir('gorge').km2).toBeGreaterThan(P.reservoir('open').km2)
    expect(P.eastView('peakA').blocked).toBe(false); expect(P.eastView('saddle').blocked).toBe(true)
    expect(P.trail('saddle').top).toBe(920); expect(P.trail('peak').top).toBe(1564)
  })
})
