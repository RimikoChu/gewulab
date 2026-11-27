// 兴奋的传导和传递实验室的计算核对：这里的数字要和规格卡 docs/specs/neuron.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { postCurve, needle, AP_T, ION, NA_OUT, apPhase, apV, arrive, deflect, delayDistance, drug, meterV, nernst, peakV, postV, restV, synapse, FIBER, SITES } from './physics'

describe('兴奋的传导和传递', () => {
  it('第 2 课：静息电位约 −70 mV，K⁺ 的平衡电位约 −89 mV', () => { expect(Math.round(restV())).toBe(-70); expect(Math.round(nernst(ION.kOut, ION.kIn))).toBe(-89) })
  it('第 2 课：两个电极都在膜外读 0；膜外 K⁺ 提高到 10 mmol/L，静息电位约 −60 mV', () => { expect(meterV(false, 'normal')).toBe(0); expect(Math.round(meterV(true, 'normal'))).toBe(-70); expect(Math.round(meterV(true, 'high'))).toBe(-60) })
  it('第 3 课：峰值约 +30 mV；膜外 Na⁺ 减半，峰值约 +12 mV', () => { expect(Math.round(peakV())).toBe(30); expect(Math.round(peakV({ ...ION, naOut: NA_OUT.half }))).toBe(12) })
  it('第 3 课：曲线从静息升到峰值再回到静息', () => {
    const r = restV(), p = peakV()
    expect(apV(0.5, r, p)).toBeCloseTo(r, 6); expect(apV(AP_T.peak, r, p)).toBeCloseTo(p, 6); expect(apV(AP_T.low, r, p)).toBeCloseTo(r - 8, 6); expect(apV(6, r, p)).toBeCloseTo(r, 6)
    expect(apPhase(1.3)).toBe('rise'); expect(apPhase(2)).toBe('fall'); expect(apPhase(0)).toBe('rest')
  })
  it('第 4 课：从中间到两端各 6 cm，都是 2.0 ms；从左端到右端 4.0 ms', () => { expect(arrive(FIBER / 2, 0)).toBeCloseTo(2, 6); expect(arrive(FIBER / 2, FIBER)).toBeCloseTo(2, 6); expect(arrive(0, FIBER)).toBeCloseTo(4, 6) })
  it('第 5 课：刺激点在两电极外侧偏转两次，在正中间不偏', () => {
    const l = deflect(SITES.left), m = deflect(SITES.mid), r = deflect(SITES.right)
    expect(l.times).toBe(2); expect(l.order).toEqual(['a', 'b']); expect(l.ta).toBeCloseTo(1, 6); expect(l.tb).toBeCloseTo(3, 6)
    expect(m.times).toBe(0); expect(m.ta).toBeCloseTo(1, 6)
    expect(r.times).toBe(2); expect(r.order).toEqual(['b', 'a'])
    expect(needle(SITES.left, 1)).toBeCloseTo(-1, 3); expect(needle(SITES.left, 3)).toBeCloseTo(1, 3); expect(needle(SITES.mid, 1)).toBeCloseTo(0, 6)
  })
  it('第 6 课：只能从突触前传到突触后；延搁 0.5 ms 相当于在纤维上走 1.5 cm', () => { expect(synapse('pre').crosses).toBe(true); expect(synapse('post').crosses).toBe(false); expect(delayDistance()).toBeCloseTo(1.5, 6) })
  it('第 7 课：兴奋性到 −50 mV 产生动作电位；抑制性到 −78 mV；两个同时 −58 mV 不产生', () => {
    expect(postV('exc')).toEqual({ v: -50, fires: true }); expect(postV('inh')).toEqual({ v: -78, fires: false }); expect(postV('both')).toEqual({ v: -58, fires: false })
    expect(postCurve('exc', 0.67)).toBeCloseTo(30, 0); expect(postCurve('inh', 0.67)).toBeCloseTo(-78, 6); expect(postCurve('both', 0)).toBe(-70)
  })
  it('拓展：四种药物各卡在不同的一步', () => {
    expect(drug('ttx').ap).toBe(false); expect(drug('botox').release).toBe(false); expect(drug('bgtx').bind).toBe(false); expect(drug('op').post).toBe('lasting')
    expect(['ttx', 'botox', 'bgtx'].every(k => drug(k as 'ttx').post === 'none')).toBe(true)
  })
})
