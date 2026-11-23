// 简单机械实验室的计算核对：这里的数字要和规格卡 docs/specs/machine.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { BAR, CRANE, crowbarAt, pushAngle, GROUPS, SLANT, TOOLS, WINCH, armOf, balanceAt, classify, craneMoments, craneReach, crowbar, hooksN, incline, leverTilt, lift, pct, rig5, rig6, row, sci, sideMoment, slantArm, slantForce, toolUse, winchForce, winchTurn } from './physics'

describe('简单机械', () => {
  it('力臂是支点到作用线的距离，不是到作用点的距离', () => {
    const a = armOf([0, 0], [1, 1], [0, -1])
    expect(a.arm).toBeCloseTo(1, 9); expect(a.foot).toEqual([1, 0])
  })
  it('第 1 课：撬棍 15°，阻力 500 N；竖直压 100 N，垂直于撬棍压 96.6 N，斜着压 136.6 N', () => {
    expect(BAR.F2).toBe(500)
    const d = crowbar('down'), n = crowbar('normal'), s = crowbar('slant')
    expect(d.l2 * 100).toBeCloseTo(19.32, 2); expect(d.l1 * 100).toBeCloseTo(96.59, 2); expect(d.F1).toBeCloseTo(100, 6)
    expect(n.l1).toBeCloseTo(1, 9); expect(n.F1).toBeCloseTo(96.59, 2)
    expect(s.l1 * 100).toBeCloseTo(70.71, 2); expect(s.F1).toBeCloseTo(136.6, 1)
    expect(n.l1).toBeGreaterThan(d.l1); expect(d.l1).toBeGreaterThan(s.l1)
  })
  it('第 2 课：每只钩码 0.5 N；三组分别在右边第 2、6、4 格平衡，F₁l₁ = F₂l₂ 为 15、30、20 N·cm', () => {
    expect(hooksN(1)).toBe(0.5)
    expect(GROUPS.map(balanceAt)).toEqual([2, 6, 4])
    const r = GROUPS.map(g => row(g.left, { n: g.right, at: balanceAt(g)! }))
    expect(r.map(x => x.m1)).toEqual([15, 30, 20]); expect(r.map(x => x.m2)).toEqual([15, 30, 20])
    expect(leverTilt(0)).toBe(0); expect(leverTilt(0.1)).toBeGreaterThan(9.9)
  })
  it('第 3 课：竖直拉 1.00 N，斜 30° 拉 1.15 N（力臂 26.0 cm），斜 60° 拉 2.00 N（力臂 15.0 cm）', () => {
    expect(sideMoment(SLANT.hang)).toBeCloseTo(0.3, 9)
    expect(slantForce(0)).toBeCloseTo(1, 9); expect(slantForce(30)).toBeCloseTo(1.1547, 4); expect(slantForce(60)).toBeCloseTo(2, 9)
    expect(slantArm(30) * 100).toBeCloseTo(25.98, 2); expect(slantArm(60) * 100).toBeCloseTo(15, 9)
  })
  it('第 4 课：手推车省力（300 N），铁锹费力（90 N），天平等臂', () => {
    expect(toolUse('barrow').F1).toBeCloseTo(300, 9); expect(toolUse('barrow').kind).toBe('省力杠杆'); expect(toolUse('barrow').load).toBeCloseTo(0.1, 9)
    expect(toolUse('shovel').F1).toBeCloseTo(90, 9); expect(toolUse('shovel').kind).toBe('费力杠杆'); expect(toolUse('shovel').load).toBeCloseTo(0.3, 9)
    expect(toolUse('balance').kind).toBe('等臂杠杆'); expect(classify(TOOLS.balance.l1, TOOLS.balance.l2)).toBe('等臂杠杆')
  })
  it('第 5 课：2 N 的钩码，定滑轮拉力 2 N、绳端走 10 cm；动滑轮拉力 1 N、绳端走 20 cm', () => {
    expect(rig5('fixed')).toMatchObject({ G: 2, F: 2, s: 0.1 }); expect(rig5('slant').F).toBe(2)
    expect(rig5('movable').F).toBe(1); expect(rig5('movable').s).toBeCloseTo(0.2, 9)
  })
  it('第 6 课：3 N 的钩码，n = 2、3、4 时拉力 1.5、1、0.75 N，绳端走 20、30、40 cm', () => {
    expect((['n2', 'n3', 'n4'] as const).map(w => rig6(w).F)).toEqual([1.5, 1, 0.75])
    expect((['n2', 'n3', 'n4'] as const).map(w => Math.round(rig6(w).s * 100))).toEqual([20, 30, 40])
  })
  it('第 7 课：提 1、2、3 N，拉力 0.60、0.93、1.27 N，机械效率 55.6%、71.4%、78.9%，额外功都是 0.08 J', () => {
    const r = [2, 4, 6].map(lift)
    expect(r.map(x => x.F.toFixed(2))).toEqual(['0.60', '0.93', '1.27'])
    expect(r.map(x => pct(x.eta))).toEqual(['55.6%', '71.4%', '78.9%'])
    r.forEach(x => expect(x.Wx).toBeCloseTo(0.08, 9))
  })
  it('拓展：塔吊吊 2 t 最远到 20 m；绞车拉力 60 N、摇一圈桶升 0.50 m；斜面拉力 2 N、机械效率 80%', () => {
    expect(craneReach()).toBeCloseTo(20, 9); expect(sci(craneMoments(CRANE.start).counter)).toBe('4×10⁵')
    expect(winchForce()).toBeCloseTo(60, 9); expect(winchTurn().rise).toBeCloseTo(0.503, 3); expect(winchTurn().hand / winchTurn().rise).toBeCloseTo(WINCH.R / WINCH.r, 9)
    expect(incline().F).toBeCloseTo(2, 9); expect(incline().ideal).toBeCloseTo(1.6, 9); expect(pct(incline().eta)).toBe('80.0%')
  })
})
describe('第 1 课：按角度算和按名字算一样', () => {
  it('三个方向', () => { for (const p of ['down', 'normal', 'slant'] as const) expect(crowbarAt(pushAngle(p)).F1).toBeCloseTo(crowbar(p).F1, 9) })
})
