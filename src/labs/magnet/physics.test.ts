// 电与磁实验室的计算核对：这里的数字要和规格卡 docs/specs/magnet.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { acFreq, attracts, bearing, commutations, field, fieldLines, filings, flips, forceX, genRpm, induced, interact, l3Current, needleAngle, period, pins, poles, solenoidN, wireDeflect, TURBINE } from './physics'

describe('电与磁', () => {
  it('第 1 课：铁钉被吸引，铜片、铝片不被吸引；同名相斥、异名相吸', () => {
    expect(attracts('iron')).toBe(true); expect(attracts('copper')).toBe(false); expect(attracts('alu')).toBe(false)
    expect(interact('N', 'N')).toBe(-1); expect(interact('S', 'N')).toBe(1)
  })
  it('第 1 课：远离磁体的小磁针指北（0°）', () => { expect(bearing(needleAngle(null, [0, 0]))).toBe(0) })
  it('第 2 课：条形磁体东头是 N 极，磁感线从 N 极出发回到 S 极附近', () => {
    const b = field(poles('bar'), [14, 0]); expect(b[0]).toBeGreaterThan(0)          // N 极外面，磁场背离 N 极
    const lines = fieldLines('bar'); expect(lines.length).toBeGreaterThan(8)
    expect(lines.filter(l => l[l.length - 1][0] < -5).length).toBeGreaterThanOrEqual(6)   // 大多数走到了西头的 S 极
  })
  it('第 2 课：磁体中部旁边的小磁针 N 极指向 S 极一侧（西）', () => { const d = bearing(needleAngle('bar', [0, 6])); expect(d).toBeGreaterThan(250); expect(d).toBeLessThan(300) })
  it('第 2 课：铁屑撒得出来，两极附近比中部旁边密', () => {
    const f = filings('bar', 1500, 40, 24)
    const near = f.filter(x => Math.hypot(x.u - 10, x.v) < 3).length, side = f.filter(x => Math.hypot(x.u, x.v - 6) < 3).length
    expect(f.length).toBe(1500); expect(near).toBeGreaterThan(side)
  })
  it('第 2 课：地理北极附近是地磁 S 极，地面上的磁场指北', () => {
    const b = field(poles('earth'), [10.5, 0]); expect(b[1]).toBeGreaterThan(0)       // 赤道上：v 朝地理北极
  })
  it('第 3 课：电流 1.5 A；电流从南向北，导线下的小磁针 N 极偏向西；电流反向偏向东', () => {
    expect(l3Current()).toBeCloseTo(1.5, 6)
    expect(wireDeflect(1)).toBeLessThan(0); expect(wireDeflect(-1)).toBeGreaterThan(0)
  })
  it('第 3 课：安培定则：电流方向一反，螺线管的 N 极换到另一头', () => { expect(solenoidN(1)).toBe('east'); expect(solenoidN(-1)).toBe('west') })
  it('第 4 课：大头针 5、10、20 枚，抽出铁芯 2 枚', () => {
    expect(pins(50, 0.5, true)).toBe(5); expect(pins(50, 1, true)).toBe(10); expect(pins(100, 1, true)).toBe(20); expect(pins(100, 1, false)).toBe(2)
  })
  it('第 5 课：改变电流方向或磁场方向，受力反向；两个都改，受力方向不变', () => {
    expect(forceX(1, 1)).toBe(1); expect(forceX(-1, 1)).toBe(-1); expect(forceX(1, -1)).toBe(-1); expect(forceX(-1, -1)).toBe(1)
    expect(commutations(3)).toBe(6)
  })
  it('第 6 课：上下运动没有感应电流；向左、向右电流反向；对调磁极也反向', () => {
    expect(induced('up', 1)).toBe(0); expect(induced('down', 1)).toBe(0)
    expect(induced('left', 1)).toBe(-induced('right', 1)); expect(induced('left', -1)).toBe(-induced('left', 1))
  })
  it('第 7 课：叶轮 15 r/min × 100 = 1500 r/min；4 极发电机 50 Hz、0.02 s、每秒改变 100 次方向', () => {
    const n = genRpm(TURBINE.rotor, TURBINE.ratio); expect(n).toBe(1500)
    const f = acFreq(n, TURBINE.pairs); expect(f).toBeCloseTo(50, 6); expect(period(f)).toBeCloseTo(0.02, 6); expect(flips(f)).toBe(100)
    expect(flips(acFreq(60, 1))).toBe(2)       // 模型每秒 1 圈：方向每秒改变 2 次
  })
})
