// 勾股定理实验室的计算核对：这里的数字要和规格卡 docs/specs/pyth.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { boardPass, corners, cutCount, diag, fmtLen, holes, ladder, numberLine, puzzle, radical, reed, bamboo, flag, ropeStakes, ropeTri, row1, zhao } from './physics'

describe('勾股定理', () => {
  it('根式：8 = 2√2，13 不能化简，25 = 5', () => {
    expect(radical(8)).toEqual({ k: 2, m: 2 }); expect(radical(13)).toEqual({ k: 1, m: 13 })
    expect(fmtLen(25)).toBe('5'); expect(fmtLen(13)).toBe('√13 ≈ 3.61'); expect(fmtLen(8)).toBe('2√2 ≈ 2.83')
  })
  it('第 1 课：2 和 2 是 4、4、8；3 和 4 是 9、16、25（49 − 24）；2 和 3 是 4、9、13', () => {
    expect(row1('iso')).toMatchObject({ A: 4, B: 4, C: 8 })
    expect(cutCount(3, 4)).toMatchObject({ outer: 49, corners: 24, c2: 25 })
    expect(row1('t23')).toMatchObject({ A: 4, B: 9, C: 13 })
  })
  it('第 2 课：两种摆法空出的面积一样，3×4 是 25，2×5 是 29', () => {
    expect(holes(3, 4)).toMatchObject({ frame: 49, tris: 24, left: 25 })
    expect(holes(2, 5).left).toBe(29)
    // 第二种摆法：四块板都还在木框里，转角不变（只平移）
    const p1 = puzzle(3, 4, 1), p2 = puzzle(3, 4, 2)
    p2.forEach((p, i) => { expect(p.th).toBeCloseTo(p1[i].th, 9); corners(3, 4, p).forEach(([x, y]) => { expect(x).toBeGreaterThanOrEqual(-1e-9); expect(x).toBeLessThanOrEqual(7 + 1e-9); expect(y).toBeGreaterThanOrEqual(-1e-9); expect(y).toBeLessThanOrEqual(7 + 1e-9) }) })
  })
  it('第 3 课：弦图 4 × 6 + 1 = 25；转过去的两块绕着顶点转，顶点不动', () => {
    const z = zhao(3, 4)
    expect(z.big).toBe(25); expect(z.inner).toBe(1); expect(z.a2 + z.b2).toBe(25)
    const before = corners(3, 4, z.xian[0]), after = corners(3, 4, z.moved[0])
    expect(before[2][0]).toBeCloseTo(after[2][0], 9); expect(before[2][1]).toBeCloseTo(after[2][1], 9)
  })
  it('第 4 课：门框对角线 √5 ≈ 2.24 m，只有斜着能过 2.2 m 宽的木板', () => {
    expect(diag()).toBeCloseTo(2.236, 3)
    expect(boardPass('across').fits).toBe(false); expect(boardPass('upright').fits).toBe(false); expect(boardPass('slant').fits).toBe(true)
  })
  it('第 5 课：梯脚从 1.66 m 移到 2.24 m，外移约 0.58 m', () => {
    const l = ladder()
    expect(l.x0).toBeCloseTo(1.658, 3); expect(l.x1).toBeCloseTo(2.236, 3); expect(l.move).toBeCloseTo(0.578, 3)
  })
  it('第 6 课：2 和 3 画出 √13 ≈ 3.61', () => {
    expect(numberLine('r13')).toMatchObject({ n2: 13, name: '√13' }); expect(numberLine('r13').x).toBeCloseTo(3.606, 3)
    expect(numberLine('r2').name).toBe('√2')
  })
  it('第 7 课：3、4、5 是直角；4、4、4 是 60°；2、5、5 比直角小', () => {
    expect(ropeTri('t345').right).toBe(true); expect(ropeTri('t345').deg).toBeCloseTo(90, 6)
    expect(ropeTri('t444').deg).toBeCloseTo(60, 6); expect(ropeTri('t255').right).toBe(false); expect(ropeTri('t255').deg).toBeLessThan(90)
    const [, B, C] = ropeStakes('t345'); expect(Math.hypot(B[0] - C[0], B[1] - C[1])).toBeCloseTo(1.5, 9)
  })
  it('拓展：竹子折在 4.55 尺；水深 12 尺、芦苇 13 尺；旗杆 12 m', () => {
    expect(bamboo().x).toBeCloseTo(4.55, 9); expect(reed()).toMatchObject({ depth: 12, len: 13 }); expect(flag().h).toBe(12)
  })
})
