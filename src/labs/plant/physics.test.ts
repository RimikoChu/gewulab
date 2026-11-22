// 植物的一生实验室的计算核对：这里的内容要和规格卡 docs/specs/plant.md 里写的一致。
import { describe, expect, it } from 'vitest'
import { BECOMES, BUD, CONTROL, DEVELOP, FALLS, FIRST_OUT, FLOWER, GROUPS, JARS, MAIN_PARTS, MARK_GAP, PER_JAR, SEEDS, STAGES, ZONES, absorber, budBecomes, developsInto, embryoOf, envOf, fastest, feedsFrom, gapAfter, germRate, growsWell, lacking, meanRate, pollinationOf, seedsIn, setsFruit, sprouted, storeOf, turnsBlue, variable } from './physics'

const jar = (no: number) => JARS.find(j => j.no === no)!
describe('植物的一生', () => {
  it('第 1 课：胚由胚芽、胚轴、胚根、子叶四部分组成，种皮和胚乳不算', () => {
    expect(embryoOf('bean').sort()).toEqual(['子叶', '胚根', '胚芽', '胚轴'].sort())
    expect(embryoOf('corn').sort()).toEqual(['子叶', '胚根', '胚芽', '胚轴'].sort())
  })
  it('第 1 课：菜豆两片子叶、营养在子叶；玉米一片子叶、营养在胚乳', () => {
    expect(SEEDS.bean.cotyledons).toBe(2); expect(storeOf('bean')).toBe('子叶')
    expect(SEEDS.corn.cotyledons).toBe(1); expect(storeOf('corn')).toBe('胚乳')
  })
  it('第 1 课：滴碘液只有胚乳变蓝', () => { expect(turnsBlue('endosperm')).toBe(true); expect(turnsBlue('cotyledon')).toBe(false); expect(turnsBlue('plumule')).toBe(false) })
  it('第 2 课：只有 2 号瓶三个条件都满足', () => { expect(JARS.filter(j => envOf(j).ok).map(j => j.no)).toEqual([CONTROL]) })
  it('第 2 课：1 号缺水分，3 号缺适宜的温度，4 号缺空气', () => {
    expect(lacking(jar(1))).toBe('一定的水分'); expect(lacking(jar(3))).toBe('适宜的温度'); expect(lacking(jar(4))).toBe('充足的空气'); expect(lacking(jar(2))).toBeNull()
  })
  it('第 2 课：2 号瓶 10 粒里萌发 9 粒，其余三瓶都是 0', () => { expect(PER_JAR).toBe(10); expect(JARS.map(sprouted)).toEqual([0, 9, 0, 0]) })
  it('第 2 课：每个实验组和 2 号只差一个变量；1 号和 3 号不能放在一起比', () => {
    expect(variable(jar(1), jar(2))).toBe('水分'); expect(variable(jar(3), jar(2))).toBe('温度'); expect(variable(jar(4), jar(2))).toBe('空气'); expect(variable(jar(1), jar(3))).toBeNull()
  })
  it('第 3 课：胚根最先突破种皮；胚根成根，胚芽成茎和叶', () => {
    expect(FIRST_OUT).toBe('radicle'); expect(BECOMES.radicle).toBe('根'); expect(BECOMES.plumule).toBe('茎和叶'); expect(BECOMES.hypocotyl).toBe('连接根和茎的部位')
    expect(STAGES.map(s => s.key)).toEqual(['swell', 'root', 'rise', 'leaf']); expect(feedsFrom('bean')).toBe('子叶'); expect(feedsFrom('corn')).toBe('胚乳')
  })
  it('第 4 课：根尖从尖端往上是根冠、分生区、伸长区、成熟区', () => { expect(ZONES.map(z => z.name)).toEqual(['根冠', '分生区', '伸长区', '成熟区']) })
  it('第 4 课：伸长区长得最快，线的间距从 2 mm 变成 8 mm；成熟区是吸收的主要部位', () => {
    expect(fastest().name).toBe('伸长区'); expect(MARK_GAP).toBe(2); expect(gapAfter('elong')).toBe(8); expect(gapAfter('mature')).toBe(2); expect(gapAfter('cap')).toBe(2); expect(gapAfter('meristem')).toBe(2.5)
    expect(absorber().name).toBe('成熟区')
  })
  it('第 5 课：幼叶成叶，芽轴成茎，芽原基成芽', () => { expect(BUD.map(b => b.name)).toEqual(['幼叶', '芽轴', '芽原基']); expect(budBecomes('leaf')).toBe('叶'); expect(budBecomes('axis')).toBe('茎'); expect(budBecomes('primordium')).toBe('芽') })
  it('第 6 课：雄蕊由花药和花丝组成，雌蕊由柱头、花柱、子房组成，它们是花的主要结构', () => {
    expect(FLOWER.find(f => f.key === 'stamen')!.sub).toEqual(['花药', '花丝']); expect(FLOWER.find(f => f.key === 'pistil')!.sub).toEqual(['柱头', '花柱', '子房']); expect(MAIN_PARTS).toEqual(['雄蕊', '雌蕊'])
  })
  it('第 6 课：花粉来自同一朵花是自花传粉，来自另一朵是异花传粉', () => { expect(pollinationOf(true)).toBe('self'); expect(pollinationOf(false)).toBe('cross') })
  it('第 7 课：子房成果实，子房壁成果皮，胚珠成种子，受精卵成胚', () => {
    expect(developsInto('子房')).toBe('果实'); expect(developsInto('子房壁')).toBe('果皮'); expect(developsInto('胚珠')).toBe('种子'); expect(developsInto('珠被')).toBe('种皮'); expect(developsInto('受精卵')).toBe('胚')
    expect(developsInto('花瓣')).toBeNull(); expect(DEVELOP).toHaveLength(5); expect(FALLS).toEqual(['花瓣', '雄蕊', '柱头', '花柱']); expect(seedsIn(1)).toBe(1)
  })
  it('拓展：100 粒里发芽 94 粒，发芽率 94%；三组 94、97、94 的平均是 95%', () => { expect(germRate(94, 100)).toBe(94); expect(GROUPS).toEqual([94, 97, 94]); expect(meanRate(GROUPS)).toBeCloseTo(95, 9) })
  it('拓展：有无机盐的培养液里长得好，清水里长不好；没有传粉就结不了果', () => { expect(growsWell('nutrient')).toBe(true); expect(growsWell('water')).toBe(false); expect(setsFruit(false)).toBe(false); expect(setsFruit(true)).toBe(true) })
})
