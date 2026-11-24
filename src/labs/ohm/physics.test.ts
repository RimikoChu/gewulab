// 欧姆定律实验室的计算核对：这里的数字要和规格卡 docs/specs/ohm.md 里写的一致。
import { describe, expect, it } from 'vitest'
import {
  L1, L2, L4, L5, L6, Q3, RX, bands, bodyI, bulbI, comboI, comboR, fitK, fuelI, lampI, lampLoop, lampP, lampR, loop, mean, measure, measureLamp,
  nominal, passes, pForU, readA, rheoR, rpForU, sampleR, shortI,
} from './physics'

describe('欧姆定律', () => {
  it('第 1 课：滑片在阻值最大处，10 Ω 两端 1.0 V、电流 0.10 A', () => {
    const c = loop(L1.R, rheoR(1)); expect(c.U).toBeCloseTo(1.0, 6); expect(c.I).toBeCloseTo(0.1, 6)
  })
  it('第 1 课：四个电压下的电流 0.10、0.16、0.22、0.28 A，U/I 都是 10 Ω', () => {
    const is = L1.targets.map(u => loop(L1.R, rheoR(pForU(L1.R, u))).I)
    is.forEach((i, k) => expect(readA(i)).toBeCloseTo([0.1, 0.16, 0.22, 0.28][k], 6))
    expect(fitK(L1.targets.map((u, k) => ({ u, i: is[k] })))).toBeCloseTo(0.1, 6)
  })
  it('第 2 课：保持 2.0 V，5、10、20 Ω 的电流 0.40、0.20、0.10 A；5 Ω 换 10 Ω 不调变阻器时电压变成 2.4 V', () => {
    L2.Rs.forEach((r, k) => expect(loop(r, rpForU(r, L2.U)).I).toBeCloseTo([0.4, 0.2, 0.1][k], 6))
    expect(rpForU(5, 2)).toBeCloseTo(2.5, 6)
    expect(loop(10, rpForU(5, 2)).U).toBeCloseTo(2.4, 6)
  })
  it('第 3 课：10 Ω 接 3 V 是 0.3 A；20 Ω 要 0.1 A 需 2 V；2.4 V、0.3 A 是 8 Ω；1.6 V 时 0.2 A', () => {
    expect(Q3[0].U / Q3[0].R).toBeCloseTo(0.3, 6)
    expect(0.1 * Q3[1].R).toBeCloseTo(2, 6)
    expect(Q3[2].U / (Q3[2].U / Q3[2].R)).toBeCloseTo(8, 6)
    expect(Q3[3].U / Q3[3].R).toBeCloseTo(0.2, 6)
  })
  it('第 4 课：三次测得 8.1、8.3、8.1 Ω，平均 8.2 Ω', () => {
    const m = L4.targets.map(u => measure(RX, u))
    expect(m.map(x => x.I)).toEqual([0.16, 0.24, 0.32])
    expect(m[0].R).toBeCloseTo(8.125, 6); expect(m[1].R).toBeCloseTo(8.333, 3)
    expect(mean(m.map(x => x.R))).toBeCloseTo(8.19, 2)
  })
  it('第 5 课：小灯泡 2.5 V 时约 0.30 A、8.3 Ω；电压越高电阻越大', () => {
    expect(lampI(2.5)).toBeCloseTo(0.3, 2); expect(lampR(2.5)).toBeCloseTo(8.32, 2)
    const rs = L5.targets.map(u => measureLamp(u).R)
    expect(rs.map(r => Math.round(r * 10) / 10)).toEqual([6.3, 6.8, 7.7, 8.3])
    // 滑片放到 lampP 的位置，灯两端正好是那个电压
    for (const u of L5.targets) expect(lampLoop(rheoR(lampP(u))).U).toBeCloseTo(u, 4)
  })
  it('第 6 课：R₁ 0.30 A，R₂ 0.20 A，串联 25 Ω、0.12 A，并联 6 Ω、0.50 A', () => {
    expect(comboI('r1')).toBeCloseTo(0.3, 6); expect(comboI('r2')).toBeCloseTo(0.2, 6)
    expect(comboR('series')).toBe(L6.R1 + L6.R2); expect(comboI('series')).toBeCloseTo(0.12, 6)
    expect(comboR('parallel')).toBeCloseTo(6, 6); expect(comboI('parallel')).toBeCloseTo(0.5, 6)
  })
  it('第 7 课：干手 22 mA、湿手 220 mA；100 W 灯约 0.45 A；短路约 4400 A', () => {
    expect(bodyI('dry') * 1000).toBeCloseTo(22, 6); expect(bodyI('wet') * 1000).toBeCloseTo(220, 6)
    expect(bulbI()).toBeCloseTo(0.4545, 3); expect(shortI()).toBeCloseTo(4400, 6)
  })
  it('拓展：棕黑黑金是 10 Ω；三只样品 10.1、9.8、11.2 Ω，第 3 只不合格；油量表满箱 0.60 A、剩两成 0.12 A', () => {
    expect(bands(1, 0, 0)).toBe(10); expect(nominal()).toBe(10)
    expect([0, 1, 2].map(k => Math.round(sampleR(k) * 10) / 10)).toEqual([10.1, 9.8, 11.2])
    expect([0, 1, 2].map(k => passes(sampleR(k)))).toEqual([true, true, false])
    expect(fuelI(1)).toBeCloseTo(0.6, 6); expect(fuelI(0.2)).toBeCloseTo(0.12, 6)
  })
})
