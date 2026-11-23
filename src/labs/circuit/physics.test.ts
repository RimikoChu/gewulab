// 电路实验室的计算核对：这里的数字要和规格卡 docs/specs/circuit.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { U0, ammeterAt, batteryU, boardI, loopState, meterRead, parallelCircuit, rheoI, seriesCircuit, singleLamp, twoWay, voltmeterAt, wireOf, lessonThreeI, sockets } from './physics'

describe('电路', () => {
  it('第 1 课：电池盒两节 3.0 V；开关断开是断路，闭合是通路，两极被导线直接连起来是短路，灯不亮', () => {
    expect(U0).toBe(3)
    expect(loopState(false, false)).toBe('open'); expect(loopState(true, false)).toBe('closed'); expect(loopState(true, true)).toBe('short')
    expect(singleLamp('closed').lit).toBeGreaterThan(0); expect(singleLamp('short').lit).toBe(0); expect(singleLamp('open').i).toBe(0)
  })
  it('第 2 课：串联拧下 L₁，L₂ 也灭；并联拧下 L₁，L₂ 照常亮；并联比串联亮', () => {
    expect(seriesCircuit(true, 'L1').b2).toBe(0)
    expect(parallelCircuit(true, 'L1').b2).toBeGreaterThan(0)
    expect(parallelCircuit(true).b1).toBeGreaterThan(seriesCircuit(true).b1)
  })
  it('第 3 课：只接 L₁ 时 0.30 A；0–3 A 量程指针只偏十分之一，0–0.6 A 偏一半；接反往左偏', () => {
    expect(lessonThreeI()).toBeCloseTo(0.3, 9)
    expect(meterRead('A', 'hi', 0.3).k).toBeCloseTo(0.1, 9)
    expect(meterRead('A', 'lo', 0.3).k).toBeCloseTo(0.5, 9); expect(meterRead('A', 'lo', 0.3).value).toBe(0.3)
    expect(meterRead('A', 'lo', 0.3, true).k).toBeLessThan(0); expect(meterRead('A', 'lo', 0.3, true).value).toBeNull()
  })
  it('第 4 课：串联 A、B、C 都是 0.12 A；并联 0.30 A + 0.20 A = 0.50 A', () => {
    for (const p of ['A', 'B', 'C'] as const) expect(ammeterAt('series', p)).toBeCloseTo(0.12, 9)
    expect(ammeterAt('parallel', 'A')).toBeCloseTo(0.3, 9); expect(ammeterAt('parallel', 'B')).toBeCloseTo(0.2, 9); expect(ammeterAt('parallel', 'C')).toBeCloseTo(0.5, 9)
  })
  it('第 5 课：一节 1.5 V、两节 3.0 V、三节 4.5 V；三节用 0–3 V 超量程，换 0–15 V 读 4.5 V', () => {
    expect([1, 2, 3].map(batteryU)).toEqual([1.5, 3, 4.5])
    expect(meterRead('V', 'lo', 3).over).toBe(false); expect(meterRead('V', 'lo', 4.5).over).toBe(true)
    expect(meterRead('V', 'hi', 4.5).value).toBe(4.5); expect(meterRead('V', 'hi', 4.5).k).toBeCloseTo(0.3, 9)
  })
  it('第 6 课：串联 1.2 V + 1.8 V = 3.0 V；并联三处都是 3.0 V', () => {
    expect(voltmeterAt('series', 'L1')).toBeCloseTo(1.2, 9); expect(voltmeterAt('series', 'L2')).toBeCloseTo(1.8, 9); expect(voltmeterAt('series', 'src')).toBeCloseTo(3, 9)
    for (const a of ['L1', 'L2', 'src'] as const) expect(voltmeterAt('parallel', a)).toBeCloseTo(3, 9)
  })
  it('第 7 课：金属丝 a 10 Ω、b 5 Ω、c 5 Ω、d 4 Ω，电流 0.15、0.20、0.20、0.21 A；变阻器 0.10 A 到 0.30 A', () => {
    expect(wireOf('a')).toBeCloseTo(10, 9); expect(wireOf('b')).toBeCloseTo(5, 9); expect(wireOf('c')).toBeCloseTo(5, 9); expect(wireOf('d')).toBeCloseTo(4, 9)
    expect(boardI('a')).toBeCloseTo(0.15, 9); expect(boardI('b')).toBeCloseTo(0.2, 9); expect(boardI('d')).toBeCloseTo(0.2143, 4)
    expect(rheoI(1)).toBeCloseTo(0.1, 9); expect(rheoI(0)).toBeCloseTo(0.3, 9)
  })
  it('拓展：双控开关扳任意一个都改变灯的亮灭；插座并联，拔掉一个别的照常 220 V', () => {
    expect(twoWay(0, 1)).toBe(false); expect(twoWay(1, 1)).toBe(true); expect(twoWay(1, 0)).toBe(false)
    const s = sockets({ lamp: false, kettle: true }); expect(s.kettle.u).toBe(220); expect(s.lamp.on).toBe(false)
  })
})
