// 光的折射和凸透镜成像实验室的计算核对：这里的数字要和规格卡 docs/specs/lens.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { ZOOM, focusAt, imageDistance, magnify, nature, refract, where } from './physics'

describe('光的折射和凸透镜成像', () => {
  it('第 1 课：入射角 0°、30°、60° 时，水里的折射角是 0°、约 22.1°、约 40.6°', () => { expect(refract(0)).toBe(0); expect(refract(30)).toBeCloseTo(22.08, 1); expect(refract(60)).toBeCloseTo(40.63, 1) })
  it('第 3 课：焦距 10 cm，物距 30、20、15 cm 时像距是 15、20、30 cm', () => { expect([30, 20, 15].map(u => imageDistance(u))).toEqual([15, 20, 30]) })
  it('第 3 课：物距 5 cm 时像距 −10 cm，是和物体同侧的虚像，放大 2 倍', () => { expect(imageDistance(5)).toBe(-10); expect(magnify(5)).toBe(2); expect(nature(5)?.real).toBe(false); expect(nature(5)?.upright).toBe(true) })
  it('第 3 课：二倍焦距分大小，一倍焦距分虚实', () => {
    expect(nature(30)?.text).toBe('倒立、缩小的实像'); expect(nature(20)?.text).toBe('倒立、等大的实像'); expect(nature(15)?.text).toBe('倒立、放大的实像'); expect(nature(10)).toBe(null)
    expect(magnify(30)).toBe(0.5); expect(magnify(20)).toBe(1); expect(magnify(15)).toBe(2)
  })
  it('第 5 课：照相机、投影仪、放大镜各对应一种成像情况', () => { expect(nature(30)?.use).toBe('照相机'); expect(nature(15)?.use).toBe('投影仪'); expect(nature(5)?.use).toBe('放大镜') })
  it('第 6 课：近视眼的像在视网膜前面，远视眼的在后面；戴上眼镜都回到视网膜上', () => {
    expect(where('normal', false)).toBe('视网膜上'); expect(where('near', false)).toBe('视网膜前面'); expect(where('far', false)).toBe('视网膜后面')
    expect(where('near', true)).toBe('视网膜上'); expect(where('far', true)).toBe('视网膜上'); expect(focusAt('near', false)).toBeLessThan(focusAt('far', false))
  })
  it('拓展：物距 60 cm，焦距从 10 cm 拉到 20 cm，像从物体的 0.2 倍变成 0.5 倍', () => { expect(magnify(ZOOM.u, ZOOM.f[0])).toBeCloseTo(0.2, 6); expect(magnify(ZOOM.u, ZOOM.f[1])).toBeCloseTo(0.5, 6) })
})
