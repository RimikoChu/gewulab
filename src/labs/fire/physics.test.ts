// 燃烧和灭火实验室的计算核对：这里的数字要和规格卡 docs/specs/fire.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { AIR_O2, IGNITE, dustArea, heatItem, o2At, outTime, plate, quench, suits, triangle } from './physics'

describe('燃烧和灭火', () => {
  it('第 1 课：木条、酒精棉球燃烧，石块、水棉球不燃烧', () => {
    expect([heatItem('wood').burn, heatItem('stone').burn, heatItem('alc').burn, heatItem('water').burn]).toEqual([true, false, true, false])
  })
  it('第 2 课：500 mL 烧杯约 6 s、1000 mL 约 11 s 熄灭，熄灭时氧气约 16%', () => {
    expect(Math.round(outTime(500))).toBe(6)
    expect(Math.round(outTime(1000))).toBe(11)
    expect(o2At(500, 0)).toBeCloseTo(AIR_O2, 6)
    expect(o2At(500, 60)).toBeCloseTo(0.16, 6)
  })
  it('第 3 课：着火点 40 °C、240 °C；80 °C 时白磷燃烧、红磷不燃烧、水下白磷不燃烧，通氧后燃烧', () => {
    expect([IGNITE.whiteP, IGNITE.redP]).toEqual([40, 240])
    const hot = plate(80, 80, false)
    expect([hot.white.burn, hot.red.burn, hot.under.burn]).toEqual([true, false, false])
    expect(hot.red.lack).toBe('heat'); expect(hot.under.lack).toBe('oxygen')
    expect(plate(80, 80, true).under.burn).toBe(true)
    expect(plate(20, 20, false).white.burn).toBe(false)
  })
  it('第 4 课：三个都有才燃烧，缺哪个就是哪个', () => {
    expect(triangle('all').burn).toBe(true)
    expect([triangle('fuel').lack, triangle('air').lack, triangle('heat').lack]).toEqual(['fuel', 'oxygen', 'heat'])
    expect(triangle('heat').temp).toBe(20)
  })
  it('第 5 课：燃气关阀门、油锅盖锅盖、木柴浇水；油锅浇水不行', () => {
    expect([quench('gas', 'cut').ok, quench('oil', 'cover').ok, quench('wood', 'cool').ok]).toEqual([true, true, true])
    expect(quench('oil', 'cool').ok).toBe(false)
  })
  it('第 6 课：木柴用水基型、油盘用干粉、档案柜用二氧化碳', () => {
    expect([suits('wood', 'water').ok, suits('oil', 'powder').ok, suits('file', 'co2').ok]).toEqual([true, true, true])
    expect(suits('file', 'water').ok).toBe(false)
  })
  it('第 7 课：1 cm³ 面粉和空气接触的面积 6 cm² → 1200 cm²', () => {
    expect(dustArea(false)).toBe(6); expect(dustArea(true)).toBe(1200)
  })
})
