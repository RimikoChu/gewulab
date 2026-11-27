// 静电场实验室的计算核对：这里的数字要和规格卡 docs/specs/efield.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { CAP, DISH, DOME, GUN, JET, LAYOUTS, TORSION, UNI, capCharge, capOf, capVoltage, coulomb, deflect, fieldAt, fieldLines, hairDir, fieldWork, gunSpeed, hangAngle, jetPath, meterAngle, midField, pointField, potDiff, potential, probeForce, rowCharge, rowOffset, sci, torsionForce, traceLine, twist, uniField } from './physics'

describe('静电场', () => {
  it('第 1 课：两球各带 4.0×10⁻⁸ C、相距 0.10 m，力是 1.44×10⁻³ N，旋钮转 36°', () => {
    expect(torsionForce(false, false)).toBeCloseTo(1.44e-3, 9)
    expect(twist(torsionForce(false, false))).toBeCloseTo(36, 6)
    expect(coulomb(TORSION.q0, TORSION.q0, TORSION.r0)).toBeCloseTo(1.44e-3, 9)
  })
  it('第 1 课：距离减半，力变成 4 倍；再把一个球的电荷量减半，力减半', () => {
    expect(torsionForce(true, false) / torsionForce(false, false)).toBeCloseTo(4, 9)
    expect(twist(torsionForce(true, false))).toBeCloseTo(144, 6)
    expect(twist(torsionForce(true, true))).toBeCloseTo(72, 6)
  })
  it('第 2 课：Q = 1.0×10⁻⁷ C，0.10、0.20、0.30 m 处的场强是 9.0×10⁴、2.25×10⁴、1.0×10⁴ N/C', () => {
    expect(DOME.r.map(r => pointField(DOME.Q, r))).toEqual([expect.closeTo(9.0e4, 3), expect.closeTo(2.25e4, 3), expect.closeTo(1.0e4, 3)])
  })
  it('第 2 课：试探电荷减半，力减半，F/q 不变；0.10 m 处悬线偏开约 20°', () => {
    const [q1, q2] = DOME.q
    expect(probeForce(q1, 0.1)).toBeCloseTo(1.8e-4, 10)
    expect(probeForce(q2, 0.1)).toBeCloseTo(0.9e-4, 10)
    expect(probeForce(q1, 0.1) / q1).toBeCloseTo(probeForce(q2, 0.1) / q2, 3)
    expect(hangAngle(probeForce(q1, 0.1)) * 180 / Math.PI).toBeCloseTo(20.2, 1)
  })
  it('第 3 课：两电极连线中点，等量异种是 1.0×10⁵ N/C，等量同种是 0，平行板是 5.0×10⁴ V/m', () => {
    expect(midField('dipole')).toBeCloseTo(1.0e5, 3)
    expect(midField('same')).toBeCloseTo(0, 6)
    expect(midField('single')).toBeCloseTo(5.0e4, 3)
    expect(midField('plates')).toBeCloseTo(5.0e4, 6)
  })
  it('第 3 课：等量异种的电场线从正电荷出发、到负电荷终止；中点的场强指向负电荷', () => {
    const cs = LAYOUTS.dipole.charges, l = traceLine(cs, [-DISH.a + 0.011, 0], 1), end = l[l.length - 1]
    expect(Math.hypot(end[0] - DISH.a, end[1])).toBeLessThan(0.012)
    expect(fieldAt(cs, [0, 0])[0]).toBeGreaterThan(0)
    expect(fieldLines('dipole').length).toBeGreaterThanOrEqual(12)
    expect(fieldLines('same').length).toBe(24)
    expect(hairDir('dipole', [0, 0])![0]).toBeCloseTo(1, 6)
    expect(hairDir('same', [0, 0])).toBeNull()
    expect(hairDir('plates', [0.1, 0])).toBeNull()
  })
  it('第 4 课：600 V、0.30 m 的匀强电场场强 2000 V/m；A、B 两点电势 500 V、100 V', () => {
    expect(uniField()).toBeCloseTo(2000, 6)
    expect(potential(UNI.A[0])).toBeCloseTo(500, 6)
    expect(potential(UNI.B[0])).toBeCloseTo(100, 6)
    expect(potDiff('A', 'B')).toBeCloseTo(400, 6)
  })
  it('第 4 课：2.0×10⁻⁸ C 的电荷从 A 到 B 做功 8.0×10⁻⁶ J；沿等势面 B 到 C 不做功；A 直接到 C 一样多', () => {
    expect(fieldWork('A', 'B')).toBeCloseTo(8.0e-6, 12)
    expect(fieldWork('B', 'C')).toBeCloseTo(0, 12)
    expect(fieldWork('A', 'C')).toBeCloseTo(fieldWork('A', 'B') + fieldWork('B', 'C'), 12)
  })
  it('第 5 课：S = 0.030 m²、d = 0.020 m 的电容约 13.3 pF，充到 1000 V 带电约 1.33×10⁻⁸ C', () => {
    expect(capOf('base') * 1e12).toBeCloseTo(13.275, 3)
    expect(capCharge()).toBeCloseTo(1.3275e-8, 11)
  })
  it('第 5 课：电荷量不变，板距加倍或面积减半电压变 2000 V，插入 ε = 3 的介质板电压降到约 333 V', () => {
    expect(capVoltage('base')).toBeCloseTo(CAP.U0, 6)
    expect(capVoltage('far')).toBeCloseTo(2000, 6)
    expect(capVoltage('half')).toBeCloseTo(2000, 6)
    expect(capVoltage('slab')).toBeCloseTo(333.3, 1)
    expect(meterAngle(2000)).toBeCloseTo(56, 6)
  })
  it('第 6 课：电子经 500 V 加速到约 1.33×10⁷ m/s；电压变 4 倍，速度变 2 倍', () => {
    expect(gunSpeed(GUN.U[0]) / 1e7).toBeCloseTo(1.325, 2)
    expect(gunSpeed(GUN.U[2]) / gunSpeed(GUN.U[0])).toBeCloseTo(2, 9)
    expect(sci(gunSpeed(2000), 2)).toBe('2.65×10⁷')
  })
  it('第 7 课：带 4.0×10⁻¹³ C 的墨滴出板时侧移 1.2 mm，落在纸上侧移 4.8 mm', () => {
    const f = deflect(JET.q[2])
    expect(f.a).toBeCloseTo(2400, 6)
    expect(f.y1 * 1e3).toBeCloseTo(1.2, 9)
    expect(f.tan).toBeCloseTo(0.12, 9)
    expect(f.y * 1e3).toBeCloseTo(4.8, 9)
    expect(jetPath(JET.q[2], JET.U, JET.L + JET.D) * 1e3).toBeCloseTo(4.8, 9)
  })
  it('第 7 课：落点和电荷量、偏转电压都成正比；不带电的墨滴不偏', () => {
    expect(deflect(JET.q[1]).y * 1e3).toBeCloseTo(2.4, 9)
    expect(deflect(JET.q[2], JET.U / 2).y * 1e3).toBeCloseTo(2.4, 9)
    expect(deflect(0).y).toBe(0)
  })
  it('拓展：点阵最上面第 7 行的墨滴带 4.5×10⁻¹³ C，落点侧移 5.4 mm；最下面一行 1.8 mm', () => {
    expect(rowCharge(7)).toBeCloseTo(4.5e-13, 20)
    expect(rowOffset(7) * 1e3).toBeCloseTo(5.4, 9)
    expect(rowOffset(1) * 1e3).toBeCloseTo(1.8, 9)
  })
  it('读数的写法', () => { expect(sci(1.44e-3, 2)).toBe('1.44×10⁻³'); expect(sci(9.0e4)).toBe('9.0×10⁴'); expect(sci(0)).toBe('0') })
})
