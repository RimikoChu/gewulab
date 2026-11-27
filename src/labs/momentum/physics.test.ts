// 动量和碰撞实验室的计算核对：这里的数字要和规格卡 docs/specs/momentum.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { BOAT, BURST, CRADLE, GLANCE, GLIDER, PUCK, STONE, boat, boatAt, bumpPlan, burstPlan, glancePlan, burn, burst, clashPlan, collide, cradleAngles, cradleTry, drop, elastic, glance, hitTime, jetPlan, kinetic, momentum, pathAt, restitution, shotP, shotPlan, swingSpeed, thrust, wallDp } from './physics'

describe('动量和碰撞', () => {
  it('第 1 课：0.16 kg 的冰球，5 m/s 时动量 0.8，10 m/s 时 1.6 kg·m/s', () => { expect(shotP('slow')).toBeCloseTo(0.8, 9); expect(shotP('fast')).toBeCloseTo(1.6, 9) })
  it('第 1 课：20 kg 的冰壶只有 0.5 m/s，动量却是 10 kg·m/s', () => { expect(shotP('stone')).toBeCloseTo(10, 9); expect(shotP('stone')).toBeGreaterThan(shotP('fast')) })
  it('第 1 课：冰球 10 m/s 撞板墙、8 m/s 弹回，动量变化 −2.88 kg·m/s', () => { expect(wallDp()).toBeCloseTo(-2.88, 9) })
  it('第 1 课：撞板墙的冰球最后回到出手点附近停住', () => { const p = shotPlan('wall'); expect(pathAt(p.segs, p.tRec).x).toBeCloseTo(0.2, 6); expect(pathAt(p.segs, p.tRec).v).toBe(0) })

  it('第 2 课：从 0.4 m 落下，速度 2.8 m/s，动量 0.14 kg·m/s', () => { const d = drop('steel'); expect(d.v).toBeCloseTo(2.8, 9); expect(d.p).toBeCloseTo(0.14, 9) })
  it('第 2 课：钢板 0.002 s 停住，平均作用力 70.49 N；厚海绵 0.05 s，只有 3.29 N', () => { expect(drop('steel').F).toBeCloseTo(70.49, 6); expect(drop('thin').F).toBeCloseTo(14.49, 6); expect(drop('thick').F).toBeCloseTo(3.29, 6) })
  it('第 2 课：从 0.9 m 落到厚海绵上，速度 4.2 m/s，力 5.74 N', () => { expect(drop('high').v).toBeCloseTo(4.2, 9); expect(drop('high').F).toBeCloseTo(5.74, 6) })
  it('第 2 课：合力的冲量等于动量的变化', () => { for (const k of ['steel', 'thin', 'thick', 'high'] as const) expect(drop(k).I).toBeCloseTo(drop(k).p, 9) })

  it('第 3 课：质量相等，碰后交换速度，遮光时间都是 20 ms，总动量 0.1 kg·m/s 不变', () => {
    const p = bumpPlan('same'); expect(p.gates.map(g => +g.ms.toFixed(2))).toEqual([20, 20]); expect(p.w1).toBe(0); expect(p.w2).toBeCloseTo(0.5, 9); expect(p.p0).toBeCloseTo(0.1, 9); expect(p.p1).toBeCloseTo(0.1, 9)
  })
  it('第 3 课：0.3 kg 撞 0.2 kg，碰后 0.1 和 0.6 m/s，总动量 0.15 kg·m/s 不变', () => { const p = bumpPlan('heavy'); expect(p.w1).toBeCloseTo(0.1, 9); expect(p.w2).toBeCloseTo(0.6, 9); expect(p.p0).toBeCloseTo(0.15, 9); expect(p.p1).toBeCloseTo(0.15, 9) })
  it('第 3 课：相向运动，总动量碰前碰后都是 0', () => { const p = bumpPlan('head'); expect(p.p0).toBeCloseTo(0, 9); expect(p.p1).toBeCloseTo(0, 9); expect(p.w1).toBeCloseTo(-0.4, 9); expect(p.gates.length).toBe(4) })
  it('第 3 课：气量不足时有阻力，测到的总动量变小', () => { const p = bumpPlan('drag'); expect(p.p0).toBeCloseTo(0.0899, 3); expect(p.p1).toBeCloseTo(0.0645, 3); expect(p.p1).toBeLessThan(p.p0 * 0.75) })
  it('第 3 课：两只滑块不会穿过对方', () => { for (const k of ['same', 'heavy', 'head', 'drag'] as const) { const p = bumpPlan(k); for (let t = 0; t < 12; t += 0.05) expect(pathAt(p.b, t).x - pathAt(p.a, t).x).toBeGreaterThan(GLIDER.gap - 1e-6) } })

  it('第 4 课：弹性碰撞动能不变；非弹性碰撞损失 3.75 J；粘在一起损失 5 J', () => {
    expect(clashPlan('elastic').loss).toBeCloseTo(0, 9); expect(clashPlan('partial').loss).toBeCloseTo(3.75, 9); expect(clashPlan('stick').loss).toBeCloseTo(5, 9)
    expect(clashPlan('partial').w1).toBeCloseTo(0.25, 9); expect(clashPlan('partial').w2).toBeCloseTo(0.75, 9); expect(clashPlan('stick').w2).toBeCloseTo(0.5, 9)
  })
  it('第 4 课：三种碰撞总动量都是 20 kg·m/s；对撞后粘住，总动量是 0，20 J 动能全部损失', () => {
    for (const k of ['elastic', 'partial', 'stick'] as const) { expect(clashPlan(k).p0).toBeCloseTo(20, 9); expect(clashPlan(k).p1).toBeCloseTo(20, 9) }
    const h = clashPlan('head'); expect(h.p0).toBeCloseTo(0, 9); expect(h.w1).toBe(0); expect(h.loss).toBeCloseTo(20, 9)
  })
  it('第 4 课：恢复系数', () => { const p = clashPlan('partial'); expect(restitution(p.v1, p.v2, p.w1, p.w2)).toBeCloseTo(0.5, 9) })

  it('第 5 课：摆球从 30° 摆下，速度约 0.56 m/s', () => { expect(swingSpeed()).toBeCloseTo(0.5613, 3) })
  it('第 5 课：质量相等的弹性碰撞交换速度', () => { const r = elastic(CRADLE.m, 0.5, CRADLE.m); expect(r.v1).toBeCloseTo(0, 9); expect(r.v2).toBeCloseTo(0.5, 9) })
  it('第 5 课：撞进 2 颗，只有弹出 2 颗才动量、动能都守恒', () => { expect(cradleTry(2, 2).ok).toBe(true); expect(cradleTry(2, 1).ok).toBe(false); expect(cradleTry(2, 1).ek1 / cradleTry(2, 1).ek0).toBeCloseTo(2, 9); expect(cradleTry(2, 4).ek1 / cradleTry(2, 4).ek0).toBeCloseTo(0.5, 9) })
  it('第 5 课：拉起 2 颗，半个周期后是另一头的 2 颗摆到最高', () => { const a = cradleAngles(2, 0), b = cradleAngles(2, 0.5 * 2 * Math.PI * Math.sqrt(CRADLE.L / 9.8)); expect(a[0]).toBeLessThan(-0.5); expect(a[4]).toBe(0); expect(b[4]).toBeGreaterThan(0.5); expect(b[3]).toBeGreaterThan(0.5); expect(Math.abs(b[0])).toBe(0) })

  it('第 6 课：喷出 0.25 kg 水，滑车 1 m/s；0.5 kg，2 m/s；加配重后又是 1 m/s', () => { expect(jetPlan('half').v).toBeCloseTo(1, 9); expect(jetPlan('full').v).toBeCloseTo(2, 9); expect(jetPlan('loaded').v).toBeCloseTo(1, 9) })
  it('第 6 课：水的动量和滑车的动量大小相等、方向相反', () => { for (const k of ['half', 'full', 'loaded'] as const) { const j = jetPlan(k); expect(j.pWater + j.pSled).toBeCloseTo(0, 9) } expect(jetPlan('full').pSled).toBeCloseTo(4, 9); expect(jetPlan('full').ms).toBeCloseTo(25, 6) })

  it('第 7 课：每秒喷 100 kg、喷速 2500 m/s，推力 250 kN', () => { expect(thrust(100, 2500)).toBe(250000); expect(burn('b').F).toBe(500000); expect(burn('c').F).toBe(600000) })
  it('第 7 课：250 kN 点火 10 s，冲量 2.5×10⁶ N·s，能让 10 t 的箭体增加 250 m/s', () => { expect(burn('a').I).toBe(2.5e6); expect(burn('a').dv).toBe(250); expect(burn('a').gas).toBe(1000) })

  it('拓展：20 kg 和 10 kg 被弹开，速度 0.4 和 0.8 m/s，动量大小相等', () => { const r = burst(STONE.m, BURST.light, BURST.E); expect(r.v1).toBeCloseTo(0.4, 9); expect(r.v2).toBeCloseTo(0.8, 9); expect(kinetic(STONE.m, r.v1) + kinetic(BURST.light, r.v2)).toBeCloseTo(4.8, 9); expect(burst(20, 20, BURST.E).v1).toBeCloseTo(0.4899, 3) })
  it('拓展：1 kg 的小车在 4 kg 的板上走 1.7 m，板后退 0.34 m；2 kg 的小车让板后退约 0.57 m', () => { expect(boat(BOAT.light, BOAT.M, BOAT.d).back).toBeCloseTo(0.34, 9); expect(boat(BOAT.light, BOAT.M, BOAT.d).fwd).toBeCloseTo(1.36, 9); expect(boat(BOAT.heavy, BOAT.M, BOAT.d).back).toBeCloseTo(0.5667, 3) })
  it('拓展：斜碰后两只冰球互相垂直，动量的矢量和不变', () => {
    const g = glance(GLANCE.v, GLANCE.deg), r = Math.PI / 180
    expect(g.v2).toBeCloseTo(1.732, 3); expect(g.v1).toBeCloseTo(1, 9); expect(g.a1 - g.a2).toBe(90)
    expect(PUCK.m * (g.v1 * Math.cos(g.a1 * r) + g.v2 * Math.cos(g.a2 * r))).toBeCloseTo(momentum(PUCK.m, GLANCE.v), 9)
    expect(g.v1 * Math.sin(g.a1 * r) + g.v2 * Math.sin(g.a2 * r)).toBeCloseTo(0, 9)
  })
  it('拓展：弹开、长板、斜碰的过程和结论对得上', () => {
    const b = burstPlan(true); expect(pathAt(b.a, 1).v).toBeCloseTo(-0.4, 9); expect(pathAt(b.b, 1).v).toBeCloseTo(0.8, 9); expect(pathAt(b.b, 30).x).toBeCloseTo(BURST.pad, 9)
    const e = boatAt(BOAT.light, 99); expect(e.board).toBeCloseTo(-0.34, 9); expect(e.car - (-BOAT.d / 2)).toBeCloseTo(1.36, 9)
    const g = glancePlan(true), q = g.at(g.tHit + 0.2); expect(Math.hypot(q.a.vx, q.a.vz)).toBeCloseTo(1, 9); expect(q.a.vx * q.b.vx + q.a.vz * q.b.vz).toBeCloseTo(0, 9); expect(q.a.vx + q.b.vx).toBeCloseTo(GLANCE.v, 9); expect(q.a.vz + q.b.vz).toBeCloseTo(0, 9)
    const h = glancePlan(false).at(9); expect(h.a.x).toBeCloseTo(-2 * PUCK.r, 9); expect(h.b.x).toBeCloseTo(GLANCE.run, 9)
  })
  it('通用：一维碰撞的公式和到达时刻', () => { expect(collide(2, 3, 1, 0, 1).v2).toBeCloseTo(4, 9); expect(hitTime({ t0: 1, x0: 0, v0: 2, a: -1 }, 1.5)).toBeCloseTo(2, 9); expect(hitTime({ t0: 0, x0: 0, v0: 2, a: -1 }, 3)).toBe(Infinity) })
})
