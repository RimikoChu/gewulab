// 分子和原子实验室的计算核对：这里的数字要和规格卡 docs/specs/atom.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { STOPS, airVolume, ballGrow, diffuseRate, dropVolume, electrolysis, electrons, fmtWidth, meanSpeed, mixVolume, moleculesInDrop, netCharge, nucleusCharge, relMass, sameElement, viewWidth, waterMoleculeMass, waterVolume } from './physics'

describe('分子和原子', () => {
  it('第 1 课：一滴水 0.05 mL，约 1.67×10²¹ 个水分子', () => { expect(dropVolume()).toBeCloseTo(0.05, 6); expect(moleculesInDrop() / 1e21).toBeCloseTo(1.67, 2) })
  it('第 1 课：一个水分子约 3×10⁻²⁶ kg', () => { expect(waterMoleculeMass() / 1e-26).toBeCloseTo(2.99, 2) })
  it('第 1 课：视野从 20 cm 推到 4 nm', () => { expect(viewWidth(0)).toBe(0.3); expect(viewWidth(STOPS.mol)).toBeCloseTo(4e-9, 12); expect(fmtWidth(viewWidth(STOPS.drop))).toBe('1.2 cm'); expect(fmtWidth(4e-9)).toBe('4.0 nm'); expect(fmtWidth(viewWidth(STOPS.bench1))).toBe('20 cm'); expect(fmtWidth(viewWidth(STOPS.bench6))).toBe('5.0 cm') })
  it('第 2 课：20 °C 氨分子平均速率约 604 m/s', () => { expect(meanSpeed(17, 20)).toBeCloseTo(604, -1) })
  it('第 3 课：水分子 20 °C 约 587 m/s，80 °C 约 644 m/s；热水里扩散快约 3.4 倍', () => { expect(meanSpeed(18, 20)).toBeCloseTo(587, -1); expect(meanSpeed(18, 80)).toBeCloseTo(644, -1); expect(diffuseRate(80)).toBeCloseTo(3.4, 1) })
  it('第 4 课：50 mL 酒精 + 50 mL 水约 96 mL', () => { const v = mixVolume(50, 50); expect(v).toBeGreaterThan(96); expect(v).toBeLessThan(97); expect(Math.round(v)).toBe(96) })
  it('第 5 课：氢气和氧气的体积比 2 : 1', () => { const g = electrolysis(1); expect(g.h2 / g.o2).toBe(2); expect(g.h2).toBe(20) })
  it('第 6 课：氧原子 8 个质子、8 个电子，不显电性，相对原子质量 16', () => { expect(nucleusCharge('O')).toBe(8); expect(electrons('O')).toBe(8); expect(netCharge('O')).toBe(0); expect(relMass('O')).toBe(16); expect(relMass('H')).toBe(1) })
  it('第 7 课：碳-12 和碳-14 是同一种元素，碳-14 和氮-14 不是', () => { expect(sameElement('C12', 'C14')).toBe(true); expect(sameElement('C14', 'N14')).toBe(false); expect(relMass('C14')).toBe(relMass('N14')) })
  it('拓展：空气压到一半体积，水几乎不变；空气 80 °C 体积约 1.2 倍', () => { expect(airVolume(2)).toBe(10); expect(waterVolume(1)).toBeGreaterThan(19.99); expect(ballGrow(80)).toBeCloseTo(1.205, 3) })
})
