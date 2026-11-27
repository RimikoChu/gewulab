// 电磁感应和电网实验室的计算核对：这里的数字要和规格卡 docs/specs/induction.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { CUT, DEPTH, LOADS, SPEEDS, coilLines, cutEmf, fallTime, flux, galvo, genFreq, genPeak, genPeriod, helmholtzB, lenz, lineLoss, linesThrough, peakGalvo, stepRatio, STEPS, transformer } from './physics'

describe('电磁感应和电网', () => {
  it('第 1 课：亥姆霍兹线圈中间 B ≈ 1.80 mT', () => { expect(helmholtzB() * 1e3).toBeCloseTo(1.80, 2) })
  it('第 1 课：Φ 在 0°、60°、90°、180° 是 1.80、0.90、0、−1.80（×10⁻⁵ Wb）', () => {
    expect(flux(0) * 1e5).toBeCloseTo(1.80, 2); expect(flux(60) * 1e5).toBeCloseTo(0.90, 2)
    expect(flux(90) * 1e5).toBeCloseTo(0, 6); expect(flux(180) * 1e5).toBeCloseTo(-1.80, 2)
  })
  it('第 1 课：穿过线圈的磁感线 64、32、0、64 根', () => { expect([0, 60, 90, 180].map(linesThrough)).toEqual([64, 32, 0, 64]) })
  it('第 2 课：磁铁在外 0 根，插到底 24 根；停住不偏，拔出反偏，快插偏得更大', () => {
    expect(coilLines(0)).toBe(0); expect(coilLines(DEPTH)).toBe(24)
    expect(galvo(DEPTH / 2, 0)).toBeCloseTo(0, 9)
    expect(Math.sign(galvo(DEPTH / 2, SPEEDS.slow))).toBe(-Math.sign(galvo(DEPTH / 2, -SPEEDS.slow)))
    expect(Math.abs(peakGalvo(SPEEDS.fast))).toBeGreaterThan(Math.abs(peakGalvo(SPEEDS.slow)) * 2)
  })
  it('第 3 课：N 极插入，线圈上端是 N（来拒）；N 极拔出，上端是 S（去留）', () => {
    expect(lenz('N', 'in')).toMatchObject({ top: 'N', repel: true, inducedDown: false })
    expect(lenz('N', 'out')).toMatchObject({ top: 'S', repel: false, inducedDown: true })
    expect(lenz('S', 'in')).toMatchObject({ top: 'S', repel: true })
    expect(lenz('S', 'out').top).toBe('N')
  })
  it('第 4 课：B = 0.5 T，L = 0.1 m，v = 0.1、0.2 m/s 时 E = 5、10 mV', () => {
    expect(CUT.B * CUT.L).toBeCloseTo(0.05, 6)
    expect(cutEmf(0.1) * 1e3).toBeCloseTo(5, 6); expect(cutEmf(0.2) * 1e3).toBeCloseTo(10, 6)
  })
  it('第 5 课：8 对磁极、375 r/min：f = 50 Hz，T = 0.02 s，Em ≈ 14.1 kV', () => {
    expect(genFreq()).toBeCloseTo(50, 6); expect(genPeriod()).toBeCloseTo(0.02, 6); expect(genPeak() / 1e3).toBeCloseTo(14.14, 2)
  })
  it('第 6 课：10 kV、1:11：U₂ = 110 kV；11 MW 时 I₁ = 1100 A、I₂ = 100 A', () => {
    const t = transformer(LOADS.full)
    expect(t.U2).toBeCloseTo(110e3, 3); expect(t.I1).toBeCloseTo(1100, 6); expect(t.I2).toBeCloseTo(100, 6)
    expect(transformer(LOADS.half).I1).toBeCloseTo(550, 6)
  })
  it('第 7 课：10 kV 损耗 6.05 MW（55%），110 kV 50 kW，220 kV 12.5 kW', () => {
    expect(lineLoss(10e3).loss).toBeCloseTo(6.05e6, 0); expect(lineLoss(10e3).ratio).toBeCloseTo(0.55, 6)
    expect(lineLoss(110e3).loss).toBeCloseTo(50e3, 3); expect(lineLoss(110e3).I).toBeCloseTo(100, 6)
    expect(lineLoss(220e3).loss).toBeCloseTo(12.5e3, 3)
    expect(stepRatio(STEPS.sub)).toBe(11); expect(stepRatio(STEPS.dist)).toBe(25)
  })
  it('拓展：0.6 m 塑料管约 0.35 s，铝管约 4.0 s', () => { expect(fallTime('plastic')).toBeCloseTo(0.350, 3); expect(fallTime('alu')).toBeCloseTo(4.0, 6) })
})
