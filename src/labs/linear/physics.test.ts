// 一次函数实验室的计算核对：这里的数字要和规格卡 docs/specs/linear.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { formula, changed, cheaper, clip, cost, drive, fuelLeft, lin, meet, planA, planB, prop, quadrants, parallel, solve2, taxi, toF, trend, truckFuel, xCross, yCross } from './physics'

describe('一次函数', () => {
  it('第 1 课：开 1 小时 100 km 剩 42 L，3 小时 300 km 剩 26 L；只有速度没变', () => {
    expect(drive(1)).toEqual({ t: 1, s: 100, fuel: 42, v: 100 }); expect(drive(3)).toEqual({ t: 3, s: 300, fuel: 26, v: 100 })
    expect(changed('v', 1, 3)).toBe(false); expect(changed('s', 1, 3)).toBe(true); expect(changed('fuel', 1, 3)).toBe(true); expect(changed('t', 1, 3)).toBe(true)
  })
  it('第 2 课：单价 7.50 元，10、20、30 升是 75、150、225 元', () => { expect([10, 20, 30].map(cost)).toEqual([75, 150, 225]) })
  it('第 3 课：0 到 500 km 油量 50、42、34、26、18、10 L；250 km 剩 30 L', () => {
    expect([0, 100, 200, 300, 400, 500].map(fuelLeft)).toEqual([50, 42, 34, 26, 18, 10]); expect(fuelLeft(250)).toBe(30)
  })
  it('第 4 课：y = kx 过原点和 (1, k)；k = −1 在二、四象限，k = 2 在一、三象限', () => {
    expect(prop(2, 0)).toBe(0); expect(prop(2, 1)).toBe(2); expect(prop(-1, 1)).toBe(-1)
    expect(quadrants(2, 0)).toEqual([1, 3]); expect(quadrants(-1, 0)).toEqual([2, 4]); expect(trend(-1)).toBe('下降')
  })
  it('第 5 课：b 是与 y 轴交点的纵坐标；k 相同的直线平行；y = 2x − 3 与 x 轴交于 (1.5, 0)', () => {
    expect(yCross(2, 2)).toEqual([0, 2]); expect(yCross(-1, -3)).toEqual([0, -3]); expect(parallel(2, 0, 2, -3)).toBe(true); expect(parallel(2, -3, -1, -3)).toBe(false)
    expect(xCross(2, -3)).toEqual([1.5, 0]); expect(quadrants(-2, 1)).toEqual([1, 2, 4]); expect(lin(2, 2, 1)).toBe(4)
  })
  it('第 6 课：(100, 270)、(300, 210) 求出 y = −0.3x + 300，800 km 剩 60 L', () => {
    expect(truckFuel(100)).toBe(270); expect(truckFuel(300)).toBe(210)
    const { k, b } = solve2([100, 270], [300, 210]); expect(k).toBe(-0.3); expect(b).toBe(300); expect(lin(k, b, 800)).toBe(60)
    expect(solve2([1, 3], [2, 5])).toEqual({ k: 2, b: 1 })
  })
  it('第 7 课：60 km 甲 500 乙 420；200 km 甲 1200 乙 1400；交点 (100, 700)', () => {
    expect([planA(60), planB(60)]).toEqual([500, 420]); expect([planA(200), planB(200)]).toEqual([1200, 1400])
    expect(meet(5, 200, 7, 0)).toEqual([100, 700]); expect(cheaper(60)).toBe('b'); expect(cheaper(200)).toBe('a'); expect(cheaper(100)).toBe('same'); expect(cheaper(150)).toBe('a')
  })
  it('拓展：出租车 3 km 10 元、5 km 14 元、8 km 20 元；0、20、−10 °C 是 32、68、14 °F', () => {
    expect([1, 3, 5, 8].map(taxi)).toEqual([10, 10, 14, 20]); expect([0, 20, -10].map(toF)).toEqual([32, 68, 14])
  })
  it('解析式的写法', () => { expect(formula(2, 2)).toBe('y = 2x + 2'); expect(formula(-1, -3)).toBe('y = −x − 3'); expect(formula(1, 0)).toBe('y = x'); expect(formula(-0.3, 300)).toBe('y = −0.3x + 300') })
  it('画图：y = 2x 在 −5 到 5 的框里截成 (−2.5, −5) 到 (2.5, 5)', () => {
    expect(clip(2, 0, [-5, 5], [-5, 5])).toEqual([[-2.5, -5], [2.5, 5]]); expect(clip(0, 9, [-5, 5], [-5, 5])).toBeNull()
  })
})
