// 浮力实验室的计算核对：数字和规格卡（docs/specs/float.md）里写的一致。
import { describe, expect, it } from 'vitest'
import { BLOCKS, START_GAP, advance, dropForTop, dropForTop3, kN, maxDrop1, solve, solve1, solve2, solve3, solve6 } from './physics'

describe('浮力', () => {
  it('第 1 课：船锚在空气中 29.40 kN，浸没后浮力 3.75 kN', () => {
    const r = solve1(maxDrop1('anchor'), 'anchor')
    expect(kN(r.g)).toBe('29.40'); expect(kN(r.fBuoy)).toBe('3.75'); expect(kN(r.fPull)).toBe('25.65')
  })
  it('第 2 课：1 m 高的钢箱，顶面在水下 1 m，上下压力差 9.80 kN；放深了不变', () => {
    const a = solve2(dropForTop('b1', 1), 'b1'), b = solve2(dropForTop('b1', 5), 'b1')
    expect(kN(a.fUp)).toBe('19.60'); expect(kN(a.fDown)).toBe('9.80'); expect(kN(b.fUp - b.fDown)).toBe('9.80')
  })
  it('第 3 课：1 m³ 的钢块浸没，淡水 9.80 kN、柴油 8.33 kN；换材料不变', () => {
    const d = dropForTop3(0.4)
    expect(kN(solve3(d, 'steel', 'fresh').fBuoy)).toBe('9.80'); expect(kN(solve3(d, 'steel', 'diesel').fBuoy)).toBe('8.33'); expect(kN(solve3(d, 'alu', 'fresh').fBuoy)).toBe('9.80')
  })
  it('第 4 课：浸没后，浮力等于流进计量槽的水重', () => {
    const st = advance({ drop: START_GAP + BLOCKS.steel1.h, block: 'steel1', liquid: 'fresh', spilled: 0 }), r = solve(st)
    expect(kN(r.fBuoy)).toBe('9.80'); expect(kN(r.gOut)).toBe('9.80'); expect(r.equal).toBe(true)
  })
  it('第 6 课：驳船装 9 箱吃水 2.00 m；开到海里变浅', () => {
    expect(solve6(9, 'river').draft).toBeCloseTo(2, 6); expect(solve6(9, 'sea').draft).toBeCloseTo(1.9417, 3)
  })
})
