// 植物的一生实验室的计算核心：种子各部分是什么、萌发条件的判定、各部分发育成什么、根尖各区的功能、传粉的判定、发芽率。
// 画面、读数、任务判定、随堂检测都从这里取，界面文件里不做判定和计算。约定写在规格卡 docs/specs/plant.md 里。

// ---------- 第 1 课：种子的结构 ----------
export type SeedKey = 'bean' | 'corn'
export type PartKey = 'coat' | 'plumule' | 'hypocotyl' | 'radicle' | 'cotyledon' | 'endosperm'
export interface SeedPart { key: PartKey; name: string; job: string; embryo: boolean }
/** 两种种子各有哪些部分。embryo：这一部分属不属于胚 */
export const SEEDS: Record<SeedKey, { name: string; kind: string; cotyledons: number; store: PartKey; parts: SeedPart[] }> = {
  bean: {
    name: '菜豆种子', kind: '双子叶植物', cotyledons: 2, store: 'cotyledon', parts: [
      { key: 'coat', name: '种皮', job: '保护里面的胚', embryo: false },
      { key: 'cotyledon', name: '子叶', job: '两片，肥厚，贮存着营养物质', embryo: true },
      { key: 'plumule', name: '胚芽', job: '将来发育成茎和叶', embryo: true },
      { key: 'hypocotyl', name: '胚轴', job: '将来发育成连接根和茎的部位', embryo: true },
      { key: 'radicle', name: '胚根', job: '将来发育成根', embryo: true },
    ],
  },
  corn: {
    name: '玉米种子', kind: '单子叶植物', cotyledons: 1, store: 'endosperm', parts: [
      { key: 'coat', name: '果皮和种皮', job: '紧贴在一起，保护里面的部分', embryo: false },
      { key: 'endosperm', name: '胚乳', job: '贮存着营养物质', embryo: false },
      { key: 'cotyledon', name: '子叶', job: '一片，把胚乳里的营养物质转运给胚芽、胚轴、胚根', embryo: true },
      { key: 'plumule', name: '胚芽', job: '将来发育成茎和叶', embryo: true },
      { key: 'hypocotyl', name: '胚轴', job: '将来发育成连接根和茎的部位', embryo: true },
      { key: 'radicle', name: '胚根', job: '将来发育成根', embryo: true },
    ],
  },
}
/** 胚由哪几部分组成 */
export const embryoOf = (seed: SeedKey) => SEEDS[seed].parts.filter(p => p.embryo).map(p => p.name)
/** 营养物质贮存在哪里 */
export const storeOf = (seed: SeedKey) => SEEDS[seed].parts.find(p => p.key === SEEDS[seed].store)!.name
/** 在玉米种子的剖面上滴碘液，这一部分变不变蓝（胚乳里有淀粉） */
export const turnsBlue = (part: PartKey) => part === 'endosperm'

// ---------- 第 2 课：种子萌发的环境条件 ----------
export type Water = 'none' | 'moist' | 'flood'
export type Temp = 'room' | 'cold'
export interface Jar { no: number; water: Water; temp: Temp; waterText: string; tempText: string }
/** 四个瓶子的条件。2 号是对照组，其余三个各只改一样 */
export const JARS: Jar[] = [
  { no: 1, water: 'none', temp: 'room', waterText: '不洒水', tempText: '室温' },
  { no: 2, water: 'moist', temp: 'room', waterText: '洒适量的水', tempText: '室温' },
  { no: 3, water: 'moist', temp: 'cold', waterText: '洒适量的水', tempText: '低温' },
  { no: 4, water: 'flood', temp: 'room', waterText: '水没过种子', tempText: '室温' },
]
export const CONTROL = 2
/** 每个瓶里放几粒种子；条件都满足时有几粒萌发（示意：个别种子自身不满足条件） */
export const PER_JAR = 10, SPROUT_OK = 9
/** 三个环境条件各满足不满足 */
export function envOf(j: Pick<Jar, 'water' | 'temp'>) {
  const water = j.water !== 'none', air = j.water !== 'flood', temp = j.temp === 'room'
  return { water, air, temp, ok: water && air && temp }
}
/** 这个瓶缺的是哪个条件；都满足返回 null */
export function lacking(j: Pick<Jar, 'water' | 'temp'>) {
  const e = envOf(j)
  return !e.water ? '一定的水分' : !e.air ? '充足的空气' : !e.temp ? '适宜的温度' : null
}
/** 这个瓶里有几粒种子萌发 */
export const sprouted = (j: Pick<Jar, 'water' | 'temp'>) => (envOf(j).ok ? SPROUT_OK : 0)
/** 两个瓶放在一起比，变量是什么；不止一样不同就不能比（返回 null） */
export function variable(a: Jar, b: Jar) {
  const dw = a.water !== b.water, dt = a.temp !== b.temp
  if (dw === dt) return null
  if (dt) return '温度'
  return [a.water, b.water].includes('none') ? '水分' : '空气'
}

// ---------- 第 3 课：种子萌发的过程 ----------
export interface Stage { key: string; name: string; what: string }
/** 菜豆种子萌发依次经过的几步 */
export const STAGES: Stage[] = [
  { key: 'swell', name: '吸水膨胀', what: '种子吸水，体积变大，种皮变软' },
  { key: 'root', name: '胚根突破种皮', what: '胚根最先突破种皮，向下长，发育成根' },
  { key: 'rise', name: '胚轴伸长', what: '胚轴伸长，把子叶和胚芽带出土面' },
  { key: 'leaf', name: '胚芽发育成茎和叶', what: '胚芽发育成茎和叶，子叶里的营养用完，慢慢萎缩' },
]
/** 胚的各部分将来发育成什么 */
export const BECOMES: Partial<Record<PartKey, string>> = { radicle: '根', plumule: '茎和叶', hypocotyl: '连接根和茎的部位' }
/** 最先突破种皮的是哪一部分 */
export const FIRST_OUT: PartKey = 'radicle'
/** 萌发时营养物质从哪里来 */
export const feedsFrom = (seed: SeedKey) => storeOf(seed)

// ---------- 第 4 课：根的生长 ----------
export type ZoneKey = 'cap' | 'meristem' | 'elong' | 'mature'
export interface Zone { key: ZoneKey; name: string; cells: string; job: string; /** 一天后这一段是原来的几倍长（示意） */ grow: number }
/** 根尖的四个区，从尖端往上排 */
export const ZONES: Zone[] = [
  { key: 'cap', name: '根冠', cells: '细胞比较大，排列不整齐，像一顶帽子套在外面', job: '保护根尖', grow: 1 },
  { key: 'meristem', name: '分生区', cells: '细胞很小，排列紧密', job: '细胞不断分裂，增加细胞的数量', grow: 1.25 },
  { key: 'elong', name: '伸长区', cells: '细胞迅速伸长', job: '是根生长最快的部位', grow: 4 },
  { key: 'mature', name: '成熟区', cells: '表皮细胞向外突出，形成根毛', job: '是吸收水和无机盐的主要部位', grow: 1 },
]
export const zone = (k: ZoneKey) => ZONES.find(z => z.key === k)!
/** 画线时相邻两条线的间距（mm，示意） */
export const MARK_GAP = 2
/** 一天后这个区里相邻两条线的间距（mm，示意） */
export const gapAfter = (k: ZoneKey) => MARK_GAP * zone(k).grow
/** 生长最快的区 */
export const fastest = () => ZONES.reduce((a, b) => (b.grow > a.grow ? b : a))
/** 吸收水和无机盐的主要部位 */
export const absorber = () => zone('mature')

// ---------- 第 5 课：芽发育成枝条 ----------
export type BudKey = 'leaf' | 'axis' | 'primordium'
/** 叶芽的三部分，各发育成什么 */
export const BUD: { key: BudKey; name: string; becomes: string }[] = [
  { key: 'leaf', name: '幼叶', becomes: '叶' },
  { key: 'axis', name: '芽轴', becomes: '茎' },
  { key: 'primordium', name: '芽原基', becomes: '芽' },
]
export const budBecomes = (k: BudKey) => BUD.find(b => b.key === k)!.becomes

// ---------- 第 6 课：开花和传粉 ----------
export type FlowerKey = 'pedicel' | 'receptacle' | 'sepal' | 'petal' | 'stamen' | 'pistil'
/** 一朵桃花的各部分。sub：这一部分又由什么组成 */
export const FLOWER: { key: FlowerKey; name: string; sub?: string[]; job: string }[] = [
  { key: 'pedicel', name: '花柄', job: '连接花和枝条' },
  { key: 'receptacle', name: '花托', job: '花的各部分着生的地方' },
  { key: 'sepal', name: '萼片', job: '花开放以前保护里面的部分' },
  { key: 'petal', name: '花瓣', job: '颜色鲜艳，能吸引昆虫' },
  { key: 'stamen', name: '雄蕊', sub: ['花药', '花丝'], job: '花药里有花粉' },
  { key: 'pistil', name: '雌蕊', sub: ['柱头', '花柱', '子房'], job: '子房里有胚珠' },
]
/** 花的主要结构（和结出果实、种子直接有关） */
export const MAIN_PARTS = ['雄蕊', '雌蕊']
export type Pollination = 'self' | 'cross'
/** 花粉来自同一朵花就是自花传粉，来自另一朵花就是异花传粉 */
export const pollinationOf = (sameFlower: boolean): Pollination => (sameFlower ? 'self' : 'cross')
export const POLLINATION: Record<Pollination, { name: string; what: string }> = {
  self: { name: '自花传粉', what: '花粉落到同一朵花的柱头上' },
  cross: { name: '异花传粉', what: '花粉依靠昆虫、风等，传到另一朵花的柱头上' },
}

// ---------- 第 7 课：受精和结果 ----------
/** 受精以后，花的各部分发育成什么 */
export const DEVELOP: { from: string; to: string }[] = [
  { from: '子房', to: '果实' },
  { from: '子房壁', to: '果皮' },
  { from: '胚珠', to: '种子' },
  { from: '珠被', to: '种皮' },
  { from: '受精卵', to: '胚' },
]
export const developsInto = (from: string) => DEVELOP.find(d => d.from === from)?.to ?? null
/** 受精以后凋落的部分 */
export const FALLS = ['花瓣', '雄蕊', '柱头', '花柱']
/** 从传粉到受精依次发生的事 */
export const FERTILIZE = ['花粉落到柱头上', '花粉萌发，长出花粉管', '花粉管穿过花柱，进入子房，到达胚珠', '花粉管里的精子和胚珠里的卵细胞结合，形成受精卵']
/** 一个果实里最多有几粒种子：有几个胚珠完成了受精，就结几粒 */
export const seedsIn = (fertilized: number) => Math.max(0, Math.floor(fertilized))

// ---------- 拓展 ----------
/** 发芽率（%）= 发芽的种子数 ÷ 供检测的种子数 × 100 */
export const germRate = (sprout: number, total: number) => (total > 0 ? (sprout / total) * 100 : 0)
/** 抽样检测三组，每组 100 粒，各发芽多少粒（示意） */
export const SAMPLE = 100, GROUPS = [94, 97, 94]
/** 几组的平均发芽率（%） */
export const meanRate = (groups: number[], total = SAMPLE) => groups.reduce((s, n) => s + germRate(n, total), 0) / Math.max(1, groups.length)
/** 植株生长需要量最多的三种无机盐 */
export const SALTS = ['含氮的', '含磷的', '含钾的']
export type Liquid = 'water' | 'nutrient'
/** 无土栽培：培养液里有没有植物需要的无机盐，决定幼苗长得好不好 */
export const growsWell = (l: Liquid) => l === 'nutrient'
/** 雌蕊的柱头上没有落上花粉，就不能受精，子房不会发育成果实 */
export const setsFruit = (pollinated: boolean) => pollinated
