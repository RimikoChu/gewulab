// 血液循环实验室的计算核对：这里的数字要和规格卡 docs/specs/blood.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { AIR, BP_READ, CHAMBERS, EXCHANGE, HR_X, LAYERS, PHASES, VESSELS, beats, bloodAfter, bloodMass, bpOk, canFlow, cellsPct, diffuses, kPa, layers, period, phaseAt, plasmaPct, singleFile, speedOf, thickest, valves, CAP_UM } from './physics'

describe('血液循环', () => {
  it('第 1 课：血浆约 55%，血细胞约 45%', () => { expect(plasmaPct()).toBe(55); expect(cellsPct()).toBe(45) })
  it('第 1 课：三层加起来是 1，静置完分好层', () => {
    expect(LAYERS.reduce((s, l) => s + l.share, 0)).toBeCloseTo(1, 9)
    expect(layers(0).plasma).toBe(0); expect(layers(1).plasma).toBeCloseTo(0.55, 9)
  })
  it('第 2 课：毛细血管里红细胞单行通过；血流 动脉 > 静脉 > 毛细血管', () => {
    expect(CAP_UM).toEqual([8, 10]); expect(singleFile(CAP_UM[0])).toBe(1); expect(singleFile(CAP_UM[1])).toBe(1)
    expect(speedOf('artery')).toBeGreaterThan(speedOf('vein')); expect(speedOf('vein')).toBeGreaterThan(speedOf('capillary'))
    expect(VESSELS.vein.valve).toContain('静脉瓣')
  })
  it('第 3 课：左心室壁最厚；心房连静脉，心室连动脉', () => {
    expect(thickest()).toBe('lv')
    expect(CHAMBERS.ra.kind).toBe('静脉'); expect(CHAMBERS.la.kind).toBe('静脉'); expect(CHAMBERS.lv.vessel).toBe('主动脉'); expect(CHAMBERS.rv.vessel).toBe('肺动脉')
  })
  it('第 4 课：75 次/分一次心跳 0.8 s，三个时期 0.1、0.3、0.4 s', () => {
    expect(period()).toBeCloseTo(0.8, 9); expect(PHASES.map(p => p.sec)).toEqual([0.1, 0.3, 0.4])
    expect(phaseAt(0.05).key).toBe('atria'); expect(phaseAt(0.2).key).toBe('ventricles'); expect(phaseAt(0.6).key).toBe('rest'); expect(phaseAt(0.85).key).toBe('atria')
  })
  it('第 4 课：心室收缩时房室瓣关、动脉瓣开；血不能倒流', () => {
    expect(valves('ventricles')).toEqual({ av: false, sl: true }); expect(valves('atria')).toEqual({ av: true, sl: false })
    expect(canFlow('ventricle', 'atrium', 'ventricles')).toBe(false); expect(canFlow('atrium', 'ventricle', 'ventricles')).toBe(false)
    expect(canFlow('atrium', 'ventricle', 'atria')).toBe(true); expect(canFlow('ventricle', 'artery', 'ventricles')).toBe(true)
  })
  it('第 5 课：60 kg 的人血量 4.2–4.8 kg；流过组织成静脉血', () => { expect(bloodMass(60)).toEqual([4.2, 4.8]); expect(bloodAfter('tissue')).toBe('vein') })
  it('第 6 课：流过肺部毛细血管成动脉血；肺动脉连着右心室', () => { expect(bloodAfter('lung')).toBe('artery'); expect(CHAMBERS.rv.blood).toBe('vein') })
  it('第 7 课：吸入氧 21%、呼出 16%；肺泡处氧从肺泡到血液', () => {
    expect(AIR.in.o2).toBe(21); expect(AIR.out.o2).toBe(16); expect(AIR.out.co2).toBe(4)
    expect(EXCHANGE.lung.o2.to).toBe('血液'); expect(EXCHANGE.tissue.co2.to).toBe('血液'); expect(diffuses(1, 0)).toBe('a→b')
  })
  it('拓展：120/80 mmHg = 16.0/10.7 kPa，在正常范围；72 次/分数 15 秒是 18 次', () => {
    expect(kPa(BP_READ.sys)).toBe(16); expect(kPa(BP_READ.dia)).toBe(10.7); expect(bpOk(120, 80)).toBe(true); expect(bpOk(160, 100)).toBe(false)
    expect(beats(HR_X, 15)).toBe(18); expect(beats(HR_X, 15) * 4).toBe(72)
  })
})
