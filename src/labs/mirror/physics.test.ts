// 光的反射和平面镜实验室的计算核对：这里的数字要和规格卡 docs/specs/mirror.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { DOLL, DOLL_US, RAY_HS, angleTo, bounce, curveRay, hitHeight, imageCount, imageDistance, mirrorNeed, mirrorPoint, paperProfile, pinholeHeight, pinholeSize, reflect, retro, scatter, turnAngle, wedgeImages, type V2 } from './physics'

describe('光的反射和平面镜', () => {
  it('第 1 课：蜡烛高 6 cm、屏离小孔 15 cm，物距 30、15、10 cm 时像高 3、6、9 cm', () => {
    expect([30, 15, 10].map(u => pinholeHeight(u))).toEqual([3, 6, 9])
    expect([30, 15, 10].map(pinholeSize)).toEqual(['缩小', '等大', '放大'])
  })
  it('第 2 课：入射角 30°、45°、60°，反射角也是 30°、45°、60°', () => {
    for (const i of [30, 45, 60]) expect(bounce(i).r).toBeCloseTo(i, 9)
    expect(bounce(0).out[0]).toBeCloseTo(0, 12); expect(bounce(0).out[1]).toBeCloseTo(1, 12)       // 垂直射入，原路返回
  })
  it('第 2 课：光路可逆：逆着反射光线射入，就逆着原来的入射光线射出', () => {
    const { d, out } = bounce(30), back = reflect([-out[0], -out[1]], [0, 1])
    expect(back[0]).toBeCloseTo(-d[0], 12); expect(back[1]).toBeCloseTo(-d[1], 12)
  })
  it('第 3 课：镜面上五条反射光都偏 40°，仍然平行', () => { for (const b of scatter('mirror')) expect(b.dir).toBeCloseTo(40, 9) })
  it('第 3 课：白纸上五条反射光偏 72°、16°、50°、0°、60°，方向各不相同，但每一条的反射角都等于入射角', () => {
    const bs = scatter('paper')
    expect(bs.map(b => Math.round(b.dir) + 0)).toEqual([72, 16, 50, 0, 60])
    for (const b of bs) { expect(b.r).toBeCloseTo(b.i, 9); expect(b.out[1]).toBeGreaterThan(0) }
    expect(bs.map(b => Math.round(b.i))).toEqual([56, 28, 45, 20, 50])
  })
  it('第 3 课：白纸表面的折线从左到右排列，五个落点都在折线上', () => {
    const p = paperProfile()
    for (let k = 1; k < p.length; k++) expect(p[k][0]).toBeGreaterThan(p[k - 1][0])
    for (const b of scatter('paper')) { const j = p.findIndex(q => q[0] > b.x), a = p[j - 1], c = p[j]; expect(a[1] + (c[1] - a[1]) * (b.x - a[0]) / (c[0] - a[0])).toBeCloseTo(0, 9) }
  })
  it('第 4 课：物距 6、9、12 cm，像距也是 6、9、12 cm；像和物体的连线与镜面垂直', () => {
    expect([6, 9, 12].map(imageDistance)).toEqual([6, 9, 12])
    const p: V2 = [-9, 4], q = mirrorPoint(p); expect(q).toEqual([9, 4])       // 高度不变：连线垂直于镜面
  })
  it('第 5 课：两条反射光线的反向延长线交在像点；每一条都遵守反射定律', () => {
    const S: V2 = [-8, 5], I = mirrorPoint(S)
    for (const E of [[-20, 14], [-20, 18]] as V2[]) {
      const y = hitHeight(S, E), din: V2 = [0 - S[0], y - S[1]], dout: V2 = [E[0], E[1] - y]
      expect(angleTo(din, [1, 0])).toBeCloseTo(angleTo(dout, [1, 0]), 9)
      expect((y - I[1]) * (E[0] - I[0])).toBeCloseTo((E[1] - I[1]) * (0 - I[0]), 9)      // 像点、落点、眼睛三点共线
    }
  })
  it('第 6 课：身高 16 cm、眼睛高 15 cm 的人偶，镜子只用到 7.5 cm 到 15.5 cm 这一段，长 8 cm，和站多远无关', () => {
    expect(mirrorNeed()).toEqual({ bottom: 7.5, top: 15.5, length: 8 })
    for (const u of DOLL_US) { expect(hitHeight([-u, DOLL.height], [-u, DOLL.eye])).toBeCloseTo(15.5, 9); expect(hitHeight([-u, 0], [-u, DOLL.eye])).toBeCloseTo(7.5, 9) }
  })
  it('第 6 课：潜望镜里入射角 45°，光每次拐 90°', () => { expect(turnAngle(45)).toBe(90) })
  it('第 7 课：半径 20 cm 的凹面镜把靠近主轴的平行光会聚到镜前约 10 cm 处；凸面镜的反向延长线交在镜后约 10 cm 处', () => {
    expect(curveRay('concave', 1).cross).toBeCloseTo(-10, 1); expect(curveRay('convex', 1).cross).toBeCloseTo(10, 1)
    for (const h of RAY_HS) if (h) { const a = curveRay('concave', h), b = curveRay('convex', h); expect(a.cross!).toBeLessThan(-9.5); expect(a.cross!).toBeGreaterThan(-10); expect(b.cross!).toBeGreaterThan(9.5); expect(Math.sign(b.out[1])).toBe(Math.sign(h)); expect(Math.sign(a.out[1])).toBe(-Math.sign(h)) }
  })
  it('拓展：两面镜子夹 90° 看到 3 个像，夹 60° 看到 5 个像', () => {
    expect(imageCount(90)).toBe(3); expect(imageCount(60)).toBe(5)
    expect(wedgeImages(45, 90).map(x => x.a)).toEqual([135, 225, 315]); expect(wedgeImages(30, 60).map(x => x.a).sort((a, b) => a - b)).toEqual([90, 150, 210, 270, 330])
  })
  it('拓展：角反射器把光沿原来的方向送回去', () => { for (const d of [[0.5, -0.8], [0.9, -0.3]] as V2[]) { const r = retro(d); expect(r[0]).toBeCloseTo(-d[0], 12); expect(r[1]).toBeCloseTo(-d[1], 12) } })
})
