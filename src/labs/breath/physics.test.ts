// 呼吸实验室的计算核对：这里的数字要和规格卡 docs/specs/breath.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { AIR, LUNG, P0, balloonsGain, bloodAlong, breathStep, capVolume, chestDepth, chestWidth, cloud, co2In, co2Times, diffPa, diffuse, dustTally, girthAvg, girthDiff, jarExtra, jarPressure, layersToCross, lungVolume, thrust } from './physics'

describe('呼吸', () => {
  it('第 1 课：一口气里鼻毛拦下 6 颗、黏液粘住 8 颗、2 颗进到肺里', () => { expect(dustTally()).toEqual({ hair: 6, mucus: 8, lung: 2 }) })
  it('第 2 课：氧要穿过 2 层细胞', () => { expect(layersToCross()).toBe(2) })
  it('第 3 课：静止时前后径 18 cm、左右径 28 cm', () => { expect(chestDepth(0)).toBe(18); expect(chestWidth(0)).toBe(28) })
  it('第 3 课：收缩时前后径约 19.7 cm、左右径约 30.1 cm', () => { expect(chestDepth(1)).toBeCloseTo(19.72, 1); expect(chestWidth(1)).toBeCloseTo(30.06, 1) })
  it('第 4 课：半径 7 cm 的橡皮膜拉下 3 cm，多出 245 mL', () => { expect(capVolume(7, 3)).toBeCloseTo(245.0, 0); expect(jarExtra(1)).toBeCloseTo(245.0, 0); expect(balloonsGain(1)).toBeCloseTo(245.0, 0) })
  it('第 4 课：气球没鼓的一下，罩里气压约 87.1 kPa', () => { expect(jarPressure(jarExtra(1))).toBeCloseTo(87.1, 1) })
  it('第 5 课：吸气中途肺内气压低于外界、呼气中途高于外界', () => {
    // 容积每秒增大 0.375 L 时，气压低约 94 Pa
    let n = 2.5, V = 2.5, p = P0
    for (let i = 0; i < 100; i++) { const v = V + 0.375 * 0.01; ({ n, p } = breathStep(n, V, v, 0.01)); V = v }
    expect(diffPa(p)).toBeCloseTo(-94, -1)
    for (let i = 0; i < 100; i++) { const v = V - 0.25 * 0.01; ({ n, p } = breathStep(n, V, v, 0.01)); V = v }
    expect(diffPa(p)).toBeGreaterThan(50)
    for (let i = 0; i < 100; i++) ({ n, p } = breathStep(n, V, V, 0.01))
    expect(diffPa(p)).toBe(0)
  })
  it('第 5 课：肺的容积 2.5 L → 3.0 L', () => { expect(lungVolume(0)).toBe(LUNG.rest); expect(lungVolume(1)).toBe(3.0) })
  it('第 6 课：扩散从多到少，总量不变', () => {
    const [a, b] = diffuse(1, 0.4, 2, 0.1); expect(a).toBeLessThan(1); expect(b).toBeGreaterThan(0.4); expect(a + b).toBeCloseTo(1.4, 9)
    expect(bloodAlong('o2', 1)).toBeGreaterThan(bloodAlong('o2', 0)); expect(bloodAlong('co2', 1)).toBeLessThan(bloodAlong('co2', 0))
    expect(bloodAlong('o2', 1, 1)).toBeLessThan(bloodAlong('o2', 1))
  })
  it('第 7 课：各通入 300 mL，呼出气体带进 12 mL 二氧化碳，空气只有 0.09 mL', () => {
    expect(co2In('breath', 300)).toBe(12); expect(co2In('air', 300)).toBe(0.09); expect(cloud(12)).toBeGreaterThan(0.9); expect(cloud(0.09)).toBeLessThan(0.02)
    expect(co2Times()).toBe(133); expect(AIR.reduce((s, a) => s + a.in, 0)).toBeCloseTo(100, 0)
  })
  it('拓展：三次胸围差 6.5、7.5、6.0 cm，平均 6.7 cm', () => { expect([0, 1, 2].map(girthDiff)).toEqual([6.5, 7.5, 6.0]); expect(girthAvg()).toBe(6.7) })
  it('拓展：肺里 2.5 L 被压小 0.1 L，气压升高约 4.2 kPa', () => { expect(thrust(0.1)).toBe(4.2) })
})
