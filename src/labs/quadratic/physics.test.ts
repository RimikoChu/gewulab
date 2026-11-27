// 二次函数实验室的计算核对：这里的数字要和规格卡 docs/specs/quadratic.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { ARCH, archA, canPass, circleArea, clearance, complete, depthOf, discAt, fenceArea, fit3, fmt, HOOP, JET_TOP, landX, profit, quad, SHOT, THREE_PTS, timesAt, vertexOf, vformText, waterWidth } from './physics'

describe('二次函数', () => {
  it('第 1 课：r = 1、2、3 m 的圆面积', () => {
    expect(circleArea(1)).toBeCloseTo(3.14, 2); expect(circleArea(2)).toBeCloseTo(12.57, 2); expect(circleArea(3)).toBeCloseTo(28.27, 2)
    expect(circleArea(2) / circleArea(1)).toBeCloseTo(4, 9)
  })
  it('第 2 课：水柱在水面上的落点', () => {
    expect(landX(-0.5, 0, 0, -JET_TOP)![1]).toBeCloseTo(2.45, 2)
    expect(landX(-1, 0, 0, -JET_TOP)![1]).toBeCloseTo(1.73, 2)
    expect(landX(-2, 0, 0, -JET_TOP)![1]).toBeCloseTo(1.22, 2)
  })
  it('第 3 课：平移后的式子和落点', () => {
    expect(vformText(-1, 2, 1)).toBe('y = −(x − 2)² + 1')
    expect(vformText(-1, 0, 1)).toBe('y = −x² + 1')
    const l = landX(-1, 2, 1, -3)!; expect((l[0] + l[1]) / 2).toBeCloseTo(2, 9)
  })
  it('第 4 课：配方得顶点 (2.5, 3.5)，x = 4 时正好 3.05 m', () => {
    expect(vertexOf(SHOT.a, SHOT.b, SHOT.c)[0]).toBeCloseTo(2.5, 9); expect(vertexOf(SHOT.a, SHOT.b, SHOT.c)[1]).toBeCloseTo(3.5, 9)
    expect(quad(SHOT.a, SHOT.b, SHOT.c, HOOP.x)).toBeCloseTo(3.05, 9)
    expect(complete(SHOT.a, SHOT.b, SHOT.c)[3]).toBe('y = −0.2(x − 2.5)² + 3.5')
    expect(complete(SHOT.a, SHOT.b, SHOT.c)[2]).toBe('y = −0.2(x² − 5x + 6.25 − 6.25) + 2.25')
  })
  it('第 5 课：15 m 两个时刻、20 m 一个、25 m 没有', () => {
    expect(timesAt(15)).toEqual([1, 3]); expect(timesAt(20)).toEqual([2]); expect(timesAt(25)).toEqual([])
    expect(discAt(25)).toBeCloseTo(-100, 9); expect(timesAt(0)).toEqual([0, 4])
  })
  it('第 6 课：拱桥 a = −1/9，水面宽和净空', () => {
    expect(archA(ARCH.width, ARCH.rise)).toBeCloseTo(-1 / 9, 12)
    expect(waterWidth(-1 / 9, depthOf('low'))).toBeCloseTo(13.42, 2)
    expect(waterWidth(-1 / 9, depthOf('flood'))).toBeCloseTo(10.39, 2)
    expect(clearance('normal')).toBeCloseTo(3, 9); expect(clearance('flood')).toBeCloseTo(2, 9)
    expect(canPass('normal')).toBe(true); expect(canPass('flood')).toBe(false)
  })
  it('第 7 课：x = 3、5、7 时面积 42、50、42', () => {
    expect([3, 5, 7].map(x => fenceArea(x))).toEqual([42, 50, 42])
  })
  it('拓展：45 元时利润最大 1250 元；三点定出 y = −0.5x² + 2x', () => {
    expect([40, 45, 50].map(profit)).toEqual([1200, 1250, 1200])
    const [a, b, c] = fit3(THREE_PTS); expect(a).toBeCloseTo(-0.5, 9); expect(b).toBeCloseTo(2, 9); expect(c).toBeCloseTo(0, 9)
  })
  it('写法：负号和小数', () => { expect(fmt(-0.5)).toBe('−0.5'); expect(fmt(Math.PI)).toBe('3.14') })
})
