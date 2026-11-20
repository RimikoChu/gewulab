// 水循环实验室的计算核对：这里的数字要和规格卡 docs/specs/watercycle.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { BODIES, LOOPS, RENEW, TRIP, floodAt, floodPeak, flowAt, flowRange, landGain, meanFlow, runoff, seaLoss, seep } from './physics'

describe('水循环', () => {
  it('第 1 课：海洋水约 96.5%；淡水里冰川最多，三种淡水加起来是 100%', () => {
    expect(BODIES.ocean.ofAll).toBe(96.5)
    expect(BODIES.ice.ofFresh + BODIES.ground.ofFresh + BODIES.river.ofFresh).toBeCloseTo(100, 6)
    expect(BODIES.ice.ofFresh).toBeGreaterThan(BODIES.ground.ofFresh)
  })
  it('第 2 课：一滴水走六个环节，从蒸发开始、到地下径流结束', () => { expect(TRIP.length).toBe(6); expect(TRIP[0]).toBe('evap'); expect(TRIP[5]).toBe('under') })
  it('第 3 课：只有海陆间循环能让陆地水得到更新', () => { expect(LOOPS.seaLand.renews).toBe(true); expect(LOOPS.land.renews).toBe(false); expect(LOOPS.sea.renews).toBe(false) })
  it('第 4 课：下 50 mm 的雨，四种地面的径流是 10、15、25、45 mm，下渗是 40、35、25、5 mm', () => {
    expect((['forest', 'grass', 'bare', 'paved'] as const).map(g => runoff(g))).toEqual([10, 15, 25, 45])
    expect((['forest', 'grass', 'bare', 'paved'] as const).map(g => seep(g))).toEqual([40, 35, 25, 5])
  })
  it('第 5 课：年平均流量 80；修水库后最大月从 200 降到 128，最小月从 20 升到 56', () => {
    expect(meanFlow()).toBe(80); expect(flowRange(false)).toEqual({ max: 200, min: 20 })
    expect(flowRange(true).max).toBeCloseTo(128, 6); expect(flowRange(true).min).toBeCloseTo(56, 6); expect(flowAt(6, true)).toBeCloseTo(128, 6)
  })
  it('第 6 课：洪峰 30、90、50，出现在雨后 6、2、4 小时', () => {
    expect((['before', 'hard', 'sponge'] as const).map(c => floodPeak(c))).toEqual([{ q: 30, t: 6 }, { q: 90, t: 2 }, { q: 50, t: 4 }])
    expect(floodAt('hard', 2)).toBeCloseTo(90, 6); expect(floodAt('hard', 1)).toBeLessThan(90); expect(floodAt('hard', 5)).toBeLessThan(90)
  })
  it('第 7 课：海洋多蒸发的 47 和陆地多降下的 47 相等', () => { expect(seaLoss()).toBe(47); expect(landGain()).toBe(47) })
  it('拓展：更新周期从短到长排好了，河水比深层地下水快得多', () => {
    for (let i = 1; i < RENEW.length; i++) expect(RENEW[i].days).toBeGreaterThan(RENEW[i - 1].days)
  })
})
