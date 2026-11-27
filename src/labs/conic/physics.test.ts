// 圆锥曲线实验室的计算核对：这里的数字要和规格卡 docs/specs/conic.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { A3, C3, CHECK3, DISH, HYPER, MEASURE5, MIRROR_U, ORBITS, RAYS6, STRING, TOWER, WALL, WALL_T, aphelion, asymSlope, dishPath, dishRay, dist, ecc, ellipseB, ellipseBounce, ellipsePoint, ellipseValue, flatness, focalRadii, hyperBounce, hyperC, hyperPoint, orbitAt, paraDirDist, paraFocalDist, paraFocus, paraY, perihelion, sectionCurve, sectionEcc, sectionType, towerLine, towerR, type P2 } from './physics'

describe('圆锥曲线', () => {
  it('第 1 课：平面和轴的夹角 90°、60°、30°、0° 依次切出圆、椭圆、抛物线、双曲线', () => {
    expect([90, 60, 30, 0].map(b => sectionType(b))).toEqual(['circle', 'ellipse', 'parabola', 'hyperbola'])
    expect(sectionEcc(90)).toBeCloseTo(0, 9); expect(sectionEcc(60)).toBeCloseTo(0.5774, 4); expect(sectionEcc(30)).toBeCloseTo(1, 9); expect(sectionEcc(0)).toBeCloseTo(1.1547, 4)
  })
  it('第 1 课：水平切在顶点上方 0.66 m 处，截口是半径 0.381 m 的圆；竖直切得到两支', () => {
    const [c] = sectionCurve(90, 0.66, 0)
    expect(c.closed).toBe(true)
    for (const [s, t] of c.pts) expect(Math.hypot(s, t)).toBeCloseTo(0.66 * Math.tan(Math.PI / 6), 6)
    expect(sectionCurve(60, 0.6, 0)).toHaveLength(1); expect(sectionCurve(60, 0.6, 0)[0].closed).toBe(true)
    expect(sectionCurve(30, 0.42, 0)).toHaveLength(1); expect(sectionCurve(30, 0.42, 0)[0].closed).toBe(false)
    expect(sectionCurve(0, 0, 0.2)).toHaveLength(2)
  })
  it('第 2 课：绳长 10，钉距 6：椭圆上每一点到两钉的距离之和都是 10，b = 4', () => {
    const c = 3, a = STRING / 2, b = ellipseB(a, c)
    expect(b).toBeCloseTo(4, 9)
    for (const t of [0, 0.7, 1.5708, 2.4, 4]) { const [r1, r2] = focalRadii(ellipsePoint(a, b, t), c); expect(r1 + r2).toBeCloseTo(10, 9) }
    expect(ellipseB(5, 4)).toBeCloseTo(3, 9); expect(ellipseB(5, 0)).toBeCloseTo(5, 9)
  })
  it('第 3 课：a = 5，c 取 3、4、1.4 时 b = 4、3、4.8，e = 0.6、0.8、0.28；点 (3, 3.2) 在 x²/25 + y²/16 = 1 上', () => {
    expect(C3.map(c => ellipseB(A3, c))).toEqual([4, 3, 4.8].map(v => expect.closeTo(v, 9)))
    expect(C3.map(c => ecc(A3, c))).toEqual([0.6, 0.8, 0.28].map(v => expect.closeTo(v, 9)))
    expect(ellipseValue(5, 4, CHECK3)).toBeCloseTo(1, 9)
    expect(ellipseValue(5, 4, [3, 4])).toBeGreaterThan(1)
  })
  it('第 4 课：a = 3、b = 4 的双曲线 c = 5，e = 5/3，渐近线斜率 ±4/3；两支上的点到两焦点距离之差都是 ±6', () => {
    const { a, b } = HYPER.wide, c = hyperC(a, b)
    expect(c).toBeCloseTo(5, 9); expect(c / a).toBeCloseTo(1.6667, 4); expect(asymSlope(a, b)).toBeCloseTo(4 / 3, 9)
    for (const u of [-1.2, 0, 0.8]) {
      const [r1, r2] = focalRadii(hyperPoint(a, b, u, 1), c); expect(r1 - r2).toBeCloseTo(6, 9)
      const [l1, l2] = focalRadii(hyperPoint(a, b, u, -1), c); expect(l1 - l2).toBeCloseTo(-6, 9)
    }
    expect(hyperC(4, 3) / 4).toBeCloseTo(1.25, 9); expect(asymSlope(4, 3)).toBeCloseTo(0.75, 9)
  })
  it('第 5 课：x² = 16y 的焦点 (0, 4)、准线 y = −4；x = 0、4、6 处到焦点和到准线的距离都是 4、5、6.25', () => {
    expect(paraFocus(DISH.p)).toEqual([0, 4])
    expect(MEASURE5.map(x => paraFocalDist(DISH.p, x))).toEqual([4, 5, 6.25].map(v => expect.closeTo(v, 9)))
    expect(MEASURE5.map(x => paraDirDist(DISH.p, x))).toEqual([4, 5, 6.25].map(v => expect.closeTo(v, 9)))
    expect(paraY(DISH.p, DISH.R)).toBeCloseTo(2.25, 9)
    expect(paraFocus(4)).toEqual([0, 2])
  })
  it('第 6 课：平行于轴的电波反射后都过焦点 (0, 4)，路程都相等；偏 8° 进来的不过同一点', () => {
    for (const x of RAYS6) expect(dishRay(DISH.p, x).axisY).toBeCloseTo(4, 9)
    for (const x of RAYS6) expect(dishPath(DISH.p, x, 9)).toBeCloseTo(13, 9)
    const ys = RAYS6.map(x => dishRay(DISH.p, x, 8).axisY as number)
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(0.5)
  })
  it('第 7 课：近日点 a(1 − e)、远日点 a(1 + e)；走半圈正好到远日点', () => {
    expect(perihelion(1, 0.017)).toBeCloseTo(0.983, 9); expect(aphelion(1, 0.017)).toBeCloseTo(1.017, 9)
    expect(perihelion(ORBITS.mars.a, ORBITS.mars.e)).toBeCloseTo(1.382, 3); expect(aphelion(ORBITS.mars.a, ORBITS.mars.e)).toBeCloseTo(1.666, 3)
    expect(perihelion(ORBITS.halley.a, ORBITS.halley.e)).toBeCloseTo(0.587, 3); expect(aphelion(ORBITS.halley.a, ORBITS.halley.e)).toBeCloseTo(35.01, 2)
    expect(flatness(0.967)).toBeCloseTo(0.2548, 4)
    const h = orbitAt(1, 0.967, 0.5); expect(h.r).toBeCloseTo(1.967, 6); expect(h.p[0]).toBeCloseTo(-1, 6)
    const q = orbitAt(1, 0.967, 0.25); expect(dist(q.p, [0.967, 0])).toBeCloseTo(q.r, 9)
  })
  it('拓展：回音壁里从一个焦点出发的声音，反射后都过另一个焦点，路程都是 10 m', () => {
    for (const t of WALL_T) {
      const r = ellipseBounce(WALL.a, WALL.b, t), toF2: P2 = [WALL.c - r.hit[0], -r.hit[1]], l = Math.hypot(...toF2)
      expect(r.out[0]).toBeCloseTo(toF2[0] / l, 9); expect(r.out[1]).toBeCloseTo(toF2[1] / l, 9); expect(r.path).toBeCloseTo(10, 9)
    }
  })
  it('拓展：双曲线镜反射光的反向延长线过另一个焦点；冷却塔面上的直线处处落在双曲面上', () => {
    for (const u of MIRROR_U) {
      const r = hyperBounce(3, 4, u), fromF1: P2 = [r.hit[0] + 5, r.hit[1]], l = Math.hypot(...fromF1)
      expect(r.out[0]).toBeCloseTo(fromF1[0] / l, 9); expect(r.out[1]).toBeCloseTo(fromF1[1] / l, 9)
    }
    expect(towerR(TOWER.throat)).toBe(24); expect(towerR(0)).toBeCloseTo(40.9, 1); expect(towerR(TOWER.top)).toBeCloseTo(27.0, 1)
    for (const y of [7, 40, 80, 110]) { const [x, , z] = towerLine(1.1, 1, y); expect(Math.hypot(x, z)).toBeCloseTo(towerR(y), 9) }
  })
})
