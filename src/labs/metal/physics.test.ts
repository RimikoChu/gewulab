// 金属和炼铁实验室的计算核对：这里的数字要和规格卡 docs/specs/metal.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { CARBON, MG_RIBBON, ORDER, ORE, OXIDE_G, PASSES, SALT, SAMPLES, SLAB, ZN_GRAMS, canAcid, canDisplace, displace, feFromOxide, h2Mass, harder, judge, JUDGE, oxideMass, pigIron, rolled, rusts, sorted } from './physics'

describe('金属和炼铁', () => {
  it('第 1 课：黄铜和铜互相刻画，黄铜更硬', () => { expect(harder('brass', 'copper')).toBe('brass'); expect(harder('copper', 'brass')).toBe('brass') })
  it('第 2 课：0.24 g 镁条燃烧生成 0.40 g 氧化镁；金不反应', () => { expect(oxideMass('Mg', MG_RIBBON)).toBeCloseTo(0.4, 6); expect(oxideMass('Au', 1)).toBe(0); expect(oxideMass('Cu', 6.4)).toBeCloseTo(8, 6) })
  it('第 3 课：6.5 g 锌生成 0.2 g 氢气；等质量 1 g 镁、锌、铁约 0.08、0.03、0.04 g；铜不反应', () => {
    expect(h2Mass('Zn', ZN_GRAMS)).toBeCloseTo(0.2, 6)
    expect(h2Mass('Mg', 1)).toBeCloseTo(0.083, 3); expect(h2Mass('Zn', 1)).toBeCloseTo(0.031, 3); expect(h2Mass('Fe', 1)).toBeCloseTo(0.036, 3)
    expect(h2Mass('Cu', 1)).toBe(0)
    // 生成氢气多的不一定更活泼：等质量时铁比锌多，可锌比铁活泼
    expect(h2Mass('Fe', 1)).toBeGreaterThan(h2Mass('Zn', 1))
  })
  it('第 4 课：铁置换铜 56 → 64 g，铜置换银 64 → 216 g，铜不能置换铝', () => {
    expect(displace('feCu')).toBe(true); expect(displace('cuAg')).toBe(true); expect(displace('cuAl')).toBe(false)
    expect([SALT.feCu.inG, SALT.feCu.outG]).toEqual([56, 64]); expect([SALT.cuAg.inG, SALT.cuAg.outG]).toEqual([64, 216])
  })
  it('第 5 课：排好的顺序是镁、锌、铁、铜、银；三个判断依次是能、不能、能', () => {
    expect(sorted(SAMPLES)).toEqual(['Mg', 'Zn', 'Fe', 'Cu', 'Ag'])
    expect(ORDER.length).toBe(15)
    expect(JUDGE.map(judge)).toEqual([true, false, true])
    expect(canAcid('Fe')).toBe(true); expect(canAcid('Cu')).toBe(false); expect(canDisplace('Na', 'Cu')).toBe(false)
  })
  it('第 6 课：1.60 g 氧化铁还原得 1.12 g 铁；1000 t 赤铁矿炼出 583.3 t 生铁', () => {
    expect(feFromOxide(OXIDE_G)).toBeCloseTo(1.12, 6)
    expect(pigIron(ORE.t, ORE.pct, ORE.fe)).toBeCloseTo(583.33, 1)
  })
  it('第 7 课：只有同时接触水和空气的铁钉生锈；做了防护不生锈', () => {
    expect(rusts(true, true)).toBe(true); expect(rusts(true, false)).toBe(false); expect(rusts(false, true)).toBe(false)
    expect(rusts(true, true, true)).toBe(false)
  })
  it('拓展：230 mm、10 m 的钢坯轧到 25 mm，长 92 m；生铁含碳比钢多', () => {
    expect(rolled(SLAB.len, SLAB.thick, PASSES[PASSES.length - 1])).toBeCloseTo(92, 6)
    expect(CARBON.pig.lo).toBe(CARBON.steel.hi)
  })
})
