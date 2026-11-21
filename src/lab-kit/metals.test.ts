import { describe, expect, it } from 'vitest'
import { grainData, METALS } from './metals'

describe('lab-kit 金属', () => {
  it('底色都在 0–1 之间，粗糙度不为 0', () => {
    for (const m of Object.values(METALS)) { for (const c of m.color) { expect(c).toBeGreaterThan(0); expect(c).toBeLessThanOrEqual(1) } expect(m.rough).toBeGreaterThan(0) }
  })
  it('三种细纹每次算出来都一样，数值在 0.3–1 之间，而且真的有起伏', () => {
    for (const k of ['turned', 'brushed', 'cast'] as const) {
      const a = grainData(k, 64), b = grainData(k, 64)
      expect(Array.from(a)).toEqual(Array.from(b))
      let lo = 1, hi = 0; for (const v of a) { lo = Math.min(lo, v); hi = Math.max(hi, v) }
      expect(lo).toBeGreaterThanOrEqual(0.3); expect(hi).toBeLessThanOrEqual(1); expect(hi - lo).toBeGreaterThan(0.1)
    }
  })
  it('车削纹沿一圈方向不变，只在另一个方向变', () => {
    const N = 64, d = grainData('turned', N)
    for (let y = 0; y < N; y += 7) expect(d[y * N]).toBe(d[y * N + N - 1])
  })
})
