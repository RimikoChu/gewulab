import { describe, expect, it } from 'vitest'
import { bolts, disc, lathe, shell, volume } from './solids'

const near = (a: number, b: number, tol = 0.01) => expect(Math.abs(a - b) / b).toBeLessThan(tol)

describe('lab-kit 实心零件', () => {
  it('车削出的圆柱是闭合的，面朝外，体积对得上', () => {
    const g = lathe([[0, 0], [0.5, 0], [0.5, 2], [0, 2]], { segs: 96 })
    near(volume(g), Math.PI * 0.25 * 2)
  })
  it('直角保持硬边，缓弯才共用顶点', () => {
    const cols = 9
    expect(lathe([[0, 0], [1, 0], [1, 1]], { segs: 8 }).attributes.position.count).toBe(4 * cols)        // 直角处拆成两个顶点
    expect(lathe([[1, 0], [1.02, 1], [1, 2]], { segs: 8 }).attributes.position.count).toBe(3 * cols)     // 拐得很缓，共用一个
  })
  it('烧杯有壁厚：体积等于外面的圆柱减去里面的空腔', () => {
    const R = 0.04, H = 0.1, t = 0.002
    near(volume(shell([[0, 0], [R, 0], [R, H]], t, { segs: 96 })), Math.PI * (R * R * H - (R - t) ** 2 * (H - t)))
  })
  it('两头通的管也是闭合实体', () => {
    const R = 0.03, H = 0.2, t = 0.003
    near(volume(shell([[R, 0], [R, H]], t, { segs: 96 })), Math.PI * (R * R - (R - t) ** 2) * H)
  })
  it('带孔的圆盘：不倒角时体积是圆环柱', () => {
    near(volume(disc(0.1, 0.02, { hole: 0.03, chamfer: 0, segs: 96 })), Math.PI * (0.01 - 0.0009) * 0.02)
    expect(volume(disc(0.1, 0.02))).toBeLessThan(Math.PI * 0.01 * 0.02)                                   // 倒了角就小一点
  })
  it('一圈螺栓：颗数对，都坐在 y = 0 上', () => {
    const g = bolts(6, 0.1, 0.012); g.computeBoundingBox()
    expect(g.attributes.position.count % 6).toBe(0)
    expect(g.boundingBox!.min.y).toBeCloseTo(0, 6)
  })
})
