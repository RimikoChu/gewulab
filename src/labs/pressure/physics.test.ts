// 压强实验室的计算核对：数字和规格卡（docs/specs/pressure.md）里写的一致。
import { describe, expect, it } from 'vitest'
import { ballHold, dropFor, kPa, lockBlock, lockNext, lockStart, pWater, solve1, solve2, solve3, solve6, solve7 } from './physics'

describe('压强', () => {
  it('第 1 课：平放 11.76 kPa 陷 10 cm；立放 47.04 kPa 陷 40 cm', () => {
    expect(solve1('flat', 1).p).toBeCloseTo(11760, 6); expect(solve1('flat', 1).sink).toBeCloseTo(0.1, 6); expect(solve1('end', 1).sink).toBeCloseTo(0.4, 6)
  })
  it('第 2 课：卡车 653.3 kPa，挖掘机 46.7 kPa，垫钢板 16.3 kPa', () => {
    expect(kPa(solve2('truck', false).p)).toBe('653.3'); expect(kPa(solve2('digger', false).p)).toBe('46.7'); expect(kPa(solve2('truck', true).p)).toBe('16.3')
  })
  it('第 3 课：水下 2.5 m 是 24.5 kPa，5 m 是 49.0 kPa；泥浆 5 m 是 58.8 kPa', () => {
    expect(kPa(solve3(dropFor(2.5), 'water').p)).toBe('24.5'); expect(kPa(solve3(dropFor(5), 'water').p)).toBe('49.0'); expect(kPa(solve3(dropFor(5), 'mud').p)).toBe('58.8')
  })
  it('第 4 课：100 m 深 980 kPa', () => { expect(kPa(pWater(100))).toBe('980.0') })
  it('第 5 课：先开下游阀门；水面不平时闸门打不开', () => {
    expect(lockNext(lockStart)?.key).toBe('vLow'); expect(lockBlock(lockStart, 'gLow')).toContain('不一样高')
  })
  it('第 6 课：坝顶 760 mm；倾斜 30° 管里长 878 mm、高度不变；雪山顶 526 mm', () => {
    expect(Math.round(solve6('crest', 0).h * 1000)).toBe(760); expect(Math.round(solve6('crest', 30).len * 1000)).toBe(878); expect(Math.round(solve6('crest', 30).h * 1000)).toBe(760); expect(Math.round(solve6('peak', 0).h * 1000)).toBe(526)
  })
  it('第 7 课：大风时压强差 356 Pa，机翼被托起', () => { expect(solve7(30).dp).toBeCloseTo(356.4, 1); expect(solve7(30).up).toBe(true); expect(solve7(10).up).toBe(false) })
  it('拓展：半径 0.2 m 的半球抽成真空，要 12.73 kN 才拉开', () => { expect(ballHold(1) / 1000).toBeCloseTo(12.73, 2) })
})
