// 地球和经纬网实验室的计算核对：这里的数字要和规格卡 docs/specs/globe.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { arcLength, direction, equatorLength, globeScale, hemiOf, latText, lonShort, lonText, meridianLength, norm, parallelLength, pointAt, polarisAltitude, STOPS, visiblePct, wan, START, GOALS } from './physics'

describe('地球和经纬网', () => {
  it('第 1 课：货轮在 570 m 露出约 76%，470 m 约 93%，330 m 整条', () => {
    expect(Math.round(visiblePct(570))).toBe(76)
    expect(Math.round(visiblePct(470))).toBe(93)
    expect(Math.round(visiblePct(330))).toBe(100)
    expect(visiblePct(570, true)).toBe(100)
  })
  it('第 2 课：赤道周长约 4 万 km，地球仪比例 1:1000 万', () => {
    expect(wan(equatorLength())).toBe('4.00')
    expect(globeScale()).toBeCloseTo(1e7, -2)
  })
  it('第 3 课：纬线长度 4.00、3.47、2.00 万 km，极点是 0', () => {
    expect(wan(parallelLength(0))).toBe('4.00')
    expect(wan(parallelLength(30))).toBe('3.47')
    expect(wan(parallelLength(60))).toBe('2.00')
    expect(wan(parallelLength(-30))).toBe('3.47')
    expect(parallelLength(90)).toBeCloseTo(0, 6)
    expect(latText(-30)).toBe('南纬 30°')
  })
  it('第 4 课：经线都是 2.00 万 km；180° 不分东西', () => {
    expect(wan(meridianLength())).toBe('2.00')
    expect(lonText(180)).toBe('180°'); expect(lonText(-60)).toBe('西经 60°'); expect(norm(190)).toBe(-170)
  })
  it('第 5 课：三站分别是 A、D、B', () => {
    expect(STOPS.map(s => pointAt(s.lat, s.lon))).toEqual(['A', 'D', 'B'])
    expect(lonShort(170 + 20)).toBe('170°W')
  })
  it('第 6 课：伦敦在东半球，纽约在西半球，悉尼在南半球', () => {
    expect(hemiOf('london', 'std')).toBe('东半球')
    expect(hemiOf('newyork', 'std')).toBe('西半球')
    expect(hemiOf('sydney', 'eq')).toBe('南半球')
    expect(hemiOf('beijing', 'zero')).toBe('东半球')
  })
  it('第 7 课：正北、正东、东北', () => {
    expect(GOALS.map(g => direction(START, g))).toEqual(['正北', '正东', '东北'])
    expect(direction({ lat: 0, lon: 170 }, { lat: 0, lon: -170 })).toBe('正东')
  })
  it('拓展：北极星高度约等于纬度；经度一度的长度随纬度变短', () => {
    expect(polarisAltitude(40)).toBe(40)
    expect(Math.round(arcLength(10))).toBe(1112)
    expect(Math.round(arcLength(10, 0))).toBe(1112)
    expect(Math.round(arcLength(10, 60))).toBe(556)
  })
})
