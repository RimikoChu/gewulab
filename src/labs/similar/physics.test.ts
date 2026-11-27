// 相似和测量实验室的计算核对：这里的数字要和规格卡 docs/specs/similar.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { compare1, mirror5, phoneX, pole4, ratio2, rod5, slope6, tiles3, tower7, tri2, tri3, trig6, twice } from './physics'

describe('相似和测量', () => {
  it('第 1 课：放大 2 倍，边都是 2 倍、角不变；只拉长横向就不相似', () => {
    const k2 = compare1('k2'); expect(k2.similar).toBe(true); expect(k2.k).toBeCloseTo(2, 9)
    expect(compare1('k15').k).toBeCloseTo(1.5, 9)
    const w = compare1('wide'); expect(w.similar).toBe(false); expect(w.sameAngles).toBe(false)
  })
  it('第 2 课：∠A 50°、∠B 60°，底边 1 m 时 BC ≈ 0.82 m、AC ≈ 0.92 m，第三个角 70°', () => {
    const t = tri2(1); expect(t.a).toBeCloseTo(0.82, 2); expect(t.b).toBeCloseTo(0.92, 2); expect(t.C).toBe(70)
    const r = ratio2(2); expect(r.a).toBeCloseTo(2, 9); expect(r.b).toBeCloseTo(2, 9)
  })
  it('第 3 课：k = 2 周长 4.50 m、面积 0.96 m²、4 块；k = 3 周长 6.76 m、面积 2.16 m²、9 块', () => {
    const a = tri3(2); expect(a.p).toBeCloseTo(4.50, 2); expect(a.s).toBeCloseTo(0.96, 6); expect(a.tiles).toBe(4); expect(a.pRatio).toBeCloseTo(2, 9)
    const b = tri3(3); expect(b.p).toBeCloseTo(6.76, 2); expect(b.s).toBeCloseTo(2.16, 6); expect(b.tiles).toBe(9); expect(tiles3(3).length).toBe(9)
  })
  it('第 4 课：太阳低时人影 2.00 m、旗杆影 15.00 m；高时 1.28 m、9.60 m；两次都算出 12.0 m', () => {
    expect(pole4('low')).toEqual({ s1: 2, s2: 15, h: 12 })
    expect(pole4('high')).toEqual({ s1: 1.28, s2: 9.6, h: 12 })
  })
  it('第 5 课：镜子离楼 18 m 时人到镜子 1.80 m，12 m 时 1.20 m；标杆法人到标杆 1.20 m；楼高都是 15.0 m', () => {
    expect(mirror5(18)).toEqual({ d1: 1.8, d2: 18, h: 15 }); expect(mirror5(12)).toEqual({ d1: 1.2, d2: 12, h: 15 })
    expect(rod5()).toEqual({ d: 1.2, total: 16.2, h: 15 })
  })
  it('第 6 课：30° 坡 2 m 处高 1.00、平 1.73；sin30° 0.50、cos30° 0.87、tan30° 0.58；45° 坡 tan 1.00', () => {
    expect(slope6('s30', 2)).toEqual({ s: 2, h: 1, l: 1.73 }); expect(slope6('s45', 4)).toEqual({ s: 4, h: 2.83, l: 2.83 })
    expect(trig6('s30')).toEqual({ sin: 0.5, cos: 0.87, tan: 0.58, m: 1.73 }); expect(trig6('s45')).toEqual({ sin: 0.71, cos: 0.71, tan: 1, m: 1 })
  })
  it('第 7 课：30 m 处仰角 45°、50 m 处读 31°，塔高都是 31.5 m', () => {
    const a = tower7(30); expect(a.read).toBe(45); expect(a.tape).toBe(26); expect(a.h).toBe(31.5)
    const b = tower7(50); expect(b.read).toBe(31); expect(b.tan).toBe(0.6); expect(b.h).toBe(31.5)
  })
  it('拓展：两次测角算出 31.5 m；手机读 36.9°、楼高 15.0 m', () => {
    expect(twice().h).toBe(31.5)
    const p = phoneX(); expect(p.read).toBe(36.9); expect(p.tan).toBe(0.75); expect(p.h).toBe(15)
  })
})
