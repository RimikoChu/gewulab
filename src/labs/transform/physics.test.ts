// 图形的变换实验室的计算核对：这里的数字要和规格卡 docs/specs/transform.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { FLAG, TRI6, angles, blades4, cm, cut2, deg, dist, half5, move6, print7, reflectU, rotate, selfTurn5, shift1, sides, tess, translate, tuan, turnDir, win3 } from './physics'

describe('图形的变换', () => {
  it('三种变换都保持两点间的距离', () => {
    const a: [number, number] = [1, 2], b: [number, number] = [4, -3], d = dist(a, b)
    expect(dist(translate(a, [3, 7]), translate(b, [3, 7]))).toBeCloseTo(d, 9)
    expect(dist(reflectU(a, 2), reflectU(b, 2))).toBeCloseTo(d, 9)
    expect(dist(rotate(a, [0, 0], 37), rotate(b, [0, 0], 37))).toBeCloseTo(d, 9)
  })
  it('第 1 课：右 5 格 150.0 cm，上 3 格 90.0 cm，右 4 上 3 是 150.0 cm；三条连线平行且相等', () => {
    expect(cm(shift1('r5').len)).toBe('150.0 cm')
    expect(cm(shift1('u3').len)).toBe('90.0 cm')
    const d = shift1('d43'); expect(cm(d.len)).toBe('150.0 cm'); expect(d.equal).toBe(true); expect(d.parallel).toBe(true)
  })
  it('第 2 课：蝴蝶的 A、B、C 到折痕 10.0、7.0、5.6 cm，对应点一样远，连线和折痕成 90°', () => {
    const r = cut2('fly')
    expect(r.pairs.map(x => cm(x.dp))).toEqual(['10.0 cm', '7.0 cm', '5.6 cm'])
    r.pairs.forEach(x => { expect(x.dq).toBeCloseTo(x.dp, 9); expect(x.angle).toBeCloseTo(90, 9); expect(x.mid[0]).toBeCloseTo(0, 9) })
    expect(cut2('vase').pairs.map(x => cm(x.dp))).toEqual(['3.0 cm', '6.0 cm', '5.0 cm'])
  })
  it('第 3 课：A、B、C、D 到对称轴 20.0、30.0、10.0、30.0 cm，对称点在另一侧一样远', () => {
    const w = win3()
    expect(w.map(x => cm(x.dp))).toEqual(['20.0 cm', '30.0 cm', '10.0 cm', '30.0 cm'])
    w.forEach(x => { expect(x.q[0]).toBeCloseTo(-x.p[0], 9); expect(x.q[1]).toBe(x.p[1]) })
  })
  it('第 4 课：OA = OA′ = 30.0 cm，OB = OB′ = 25.0 cm；转 90° 放 4 片，转 120° 放 3 片', () => {
    const r = blades4('a90')
    expect(cm(r.OA)).toBe('30.0 cm'); expect(r.OA1).toBeCloseTo(r.OA, 9)
    expect(cm(r.OB)).toBe('25.0 cm'); expect(r.OB1).toBeCloseTo(r.OB, 9)
    expect(deg(r.angA)).toBe('90°'); expect(deg(r.angB)).toBe('90°'); expect(r.count).toBe(4)
    const s = blades4('a120'); expect(deg(s.angA)).toBe('120°'); expect(s.count).toBe(3)
  })
  it('第 5 课：对应点连线都经过 O，OA = OA′ = 21.2 cm；平行四边形转半圈重合，正三角形不重合', () => {
    const h = half5()
    expect(h.pairs.map(x => cm(x.op))).toEqual(['21.2 cm', '10.0 cm', '11.2 cm'])
    h.pairs.forEach(x => { expect(x.through).toBe(true); expect(x.oq).toBeCloseTo(x.op, 9) })
    expect(selfTurn5('para').same).toBe(true)
    expect(selfTurn5('tri').same).toBe(false)
  })
  it('第 6 课：三边 16.0、17.0、12.6 cm，三角 72°、45°、63°；三种变换都不变，只有轴对称把绕向反过来', () => {
    expect(sides(TRI6).map(cm)).toEqual(['16.0 cm', '17.0 cm', '12.6 cm'])
    expect(angles(TRI6).map(deg)).toEqual(['72°', '45°', '63°'])
    expect(turnDir(TRI6)).toBe('逆时针')
    expect(move6('shift').same && move6('flip').same && move6('turn').same).toBe(true)
    expect(move6('shift').dir).toBe('逆时针'); expect(move6('turn').dir).toBe('逆时针'); expect(move6('flip').dir).toBe('顺时针')
  })
  it('第 7 课：团花四片花瓣各转 90°，团花之间平移 28 cm，两行三列共 24 片', () => {
    const r = print7()
    expect(r.angles).toEqual([0, 90, 180, 270]); expect(r.shift).toBe(28); expect(r.petals).toBe(24)
  })
  it('拓展：折成 8 层的团花 4 条对称轴；正六边形 3 块正好 360°，正五边形 3 块 324°、留 36°', () => {
    expect(tuan(8).axes).toBe(4); expect(tuan(4).axes).toBe(2); expect(tuan(8).turn).toBe(90)
    expect(tess(6)).toMatchObject({ angle: 120, count: 3, fit: true })
    const p = tess(5); expect(p.angle).toBeCloseTo(108, 9); expect(p.count).toBe(3); expect(p.sum).toBeCloseTo(324, 9); expect(p.gap).toBeCloseTo(36, 9)
    expect(FLAG.length).toBe(6)
  })
})
