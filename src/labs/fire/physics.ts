// 燃烧和灭火实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 温度用 °C；体积用 mL；时间用 s。取值约定和每个数的来历写在规格卡 docs/specs/fire.md 里。

export const ROOM = 20            // 室温（°C）
export const AIR_O2 = 0.21        // 空气里氧气的体积分数
/** 着火点（°C），取教材上的数；木材是一个范围，判定时取下限 */
export const IGNITE = { whiteP: 40, redP: 240, wood: 250 } as const
export const WOOD_RANGE: [number, number] = [250, 330]

/** 一个数保留几位小数 */
export const round = (x: number, d = 0) => { const k = 10 ** d; return Math.round(x * k) / k }
export const pct = (x: number, d = 0) => `${round(x * 100, d)}%`

// ---------- 燃烧的三个条件 ----------
export type Lack = 'fuel' | 'oxygen' | 'heat'
export const LACK_NAME: Record<Lack, string> = { fuel: '可燃物', oxygen: '氧气', heat: '温度达到着火点' }
/** 会不会燃烧：三个条件缺一不可。返回缺的那个条件（都不缺返回 null） */
export function burns({ fuel, oxygen, temp, ignite }: { fuel: boolean; oxygen: boolean; temp: number; ignite: number }): { burn: boolean; lack: Lack | null } {
  const lack: Lack | null = !fuel ? 'fuel' : !oxygen ? 'oxygen' : temp < ignite ? 'heat' : null
  return { burn: lack === null, lack }
}

// ---------- 第 1 课：加热四样东西 ----------
export const ITEMS = {
  wood:  { name: '小木条', short: '木条', fuel: true, burn: true, why: '木条是可燃物，在火焰上一烧就着' },
  stone: { name: '小石块', short: '石块', fuel: false, burn: false, why: '石块不是可燃物，怎么烧也烧不着' },
  alc:   { name: '蘸酒精的棉球', short: '酒精棉球', fuel: true, burn: true, why: '酒精是可燃物，棉球一碰到火就着了' },
  water: { name: '蘸水的棉球', short: '水棉球', fuel: false, burn: false, why: '棉球上的水不是可燃物，加热一会儿也不燃烧' },
} as const
export type Item = keyof typeof ITEMS
export const HEAT_SEC = 3        // 每样东西在火焰上加热多久（s）
export const heatItem = (k: Item) => ITEMS[k]

// ---------- 第 2 课：烧杯罩蜡烛 ----------
/** 蜡烛每秒消耗的氧气（mL）：按每小时烧掉约 6 g 石蜡估算，见规格卡 */
export const CANDLE_O2 = 4.4
/** 罩里氧气降到这个体积分数，蜡烛熄灭（约） */
export const O2_OUT = 0.16
export const BEAKERS = { small: { name: '500 mL', vol: 500 }, big: { name: '1000 mL', vol: 1000 } } as const
export type BeakerKey = keyof typeof BEAKERS
/** 罩上烧杯 t 秒后罩里氧气的体积分数 */
export const o2At = (vol: number, t: number) => Math.max(O2_OUT, AIR_O2 - CANDLE_O2 * Math.max(0, t) / vol)
/** 罩上以后多久熄灭（s） */
export const outTime = (vol: number) => (AIR_O2 - O2_OUT) * vol / CANDLE_O2
/** 火焰大小随氧气减少而变小：0 熄灭，1 正常 */
export const flameAt = (o2: number) => Math.max(0, Math.min(1, (o2 - O2_OUT) / (AIR_O2 - O2_OUT))) ** 0.6

// ---------- 第 3 课：铜片实验 ----------
export const WATER = { cold: { name: '冷水 20 °C', temp: 20 }, hot: { name: '热水 80 °C', temp: 80 } } as const
export type WaterKey = keyof typeof WATER
/** 倒水以后铜片多快跟上水温：时间常数（s） */
export const PLATE_TAU = 2.5
/** 倒水 t 秒后铜片的温度 */
export const plateTemp = (water: number, t: number) => ROOM + (water - ROOM) * (1 - Math.exp(-Math.max(0, t) / PLATE_TAU))
/** 铜片上的白磷、红磷，水下的白磷，各着不着 */
export function plate(temp: number, waterTemp: number, o2: boolean) {
  return {
    white: burns({ fuel: true, oxygen: true, temp, ignite: IGNITE.whiteP }),
    red: burns({ fuel: true, oxygen: true, temp, ignite: IGNITE.redP }),
    under: burns({ fuel: true, oxygen: o2, temp: waterTemp, ignite: IGNITE.whiteP }),
  }
}

// ---------- 第 4 课：燃烧箱 ----------
export const SETUPS = {
  all:   { name: '三个都有', fuel: true, oxygen: true, lit: true },
  fuel:  { name: '拿走木柴', fuel: false, oxygen: true, lit: true },
  air:   { name: '关上风门', fuel: true, oxygen: false, lit: true },
  heat:  { name: '不点火', fuel: true, oxygen: true, lit: false },
} as const
export type Setup = keyof typeof SETUPS
/** 点火枪的火焰让木柴温度超过着火点；不点火就是室温。这里只关心“是否达到”，不细算温度 */
export function triangle(s: Setup) {
  const c = SETUPS[s], temp = c.lit ? WOOD_RANGE[1] + 1 : ROOM
  return { ...burns({ fuel: c.fuel, oxygen: c.oxygen, temp, ignite: IGNITE.wood }), temp: c.lit ? null : ROOM }
}

// ---------- 第 5 课：三种灭火的办法 ----------
export const FIRES5 = {
  gas:  { name: '燃气灶', fix: 'cut' },
  oil:  { name: '油锅', fix: 'cover' },
  wood: { name: '木柴', fix: 'cool' },
} as const
export type Fire5 = keyof typeof FIRES5
export const WAYS = {
  cut:   { name: '关阀门', principle: '隔离可燃物', lack: 'fuel' as Lack },
  cover: { name: '盖锅盖', principle: '隔绝空气', lack: 'oxygen' as Lack },
  cool:  { name: '浇水', principle: '降低温度到着火点以下', lack: 'heat' as Lack },
} as const
export type Way = keyof typeof WAYS
/** 用某种办法灭某处火：行不行、为什么 */
export function quench(f: Fire5, w: Way): { ok: boolean; why: string } {
  if (FIRES5[f].fix === w) return { ok: true, why: { gas: '关掉阀门，燃气不再出来：隔离了可燃物，火就灭了', oil: '盖上锅盖，锅里的油接触不到空气：隔绝了氧气，火就灭了', wood: '水把木柴的温度降到着火点以下，火就灭了' }[f] }
  if (f === 'oil' && w === 'cool') return { ok: false, why: '油锅着火不能浇水：水一下子变成水蒸气，把着火的油溅出来，火会更大。盖上锅盖' }
  if (f === 'gas' && w === 'cool') return { ok: false, why: '燃气还在往外冒，浇水浇不灭。先关掉燃气阀门' }
  if (f === 'gas' && w === 'cover') return { ok: false, why: '燃气灶上没有锅可盖，燃气还在往外冒。先关掉燃气阀门' }
  if (f === 'wood' && w === 'cut') return { ok: false, why: '木柴火没有阀门可关。木柴烧得正旺，用水浇灭它' }
  if (f === 'wood' && w === 'cover') return { ok: false, why: '木柴堆太大，没有锅盖盖得住。用水浇灭它' }
  return { ok: false, why: '锅里的油已经烧起来了，关掉燃气阀门火也不会马上灭。盖上锅盖' }   // 油锅 + 关阀门
}

// ---------- 第 6 课：选灭火器 ----------
export const EXTS = {
  water: { name: '水基型', full: '水基型灭火器', use: '扑灭木材、棉布等燃烧引起的失火' },
  powder: { name: '干粉', full: '干粉灭火器', use: '扑灭一般失火，还可以扑灭油、气等燃烧引起的失火' },
  co2: { name: '二氧化碳', full: '二氧化碳灭火器', use: '扑灭图书、档案、贵重设备、精密仪器等处的失火' },
} as const
export type Ext = keyof typeof EXTS
export const FIRES6 = {
  wood: { name: '木柴堆', best: 'water' },
  oil: { name: '油盘', best: 'powder' },
  file: { name: '档案柜', best: 'co2' },
} as const
export type Fire6 = keyof typeof FIRES6
export function suits(f: Fire6, e: Ext): { ok: boolean; why: string } {
  if (FIRES6[f].best === e) return { ok: true, why: { wood: '水基型灭火器喷出的水和泡沫让木柴降温、和空气隔开，火灭了', oil: '干粉盖住油面，隔绝空气，油火灭了', file: '二氧化碳喷完就散了，不留下痕迹，图书档案不会被弄坏' }[f] }
  const why: Record<Fire6, Partial<Record<Ext, string>>> = {
    wood: { powder: '干粉也能扑灭，但会撒一地粉末；木材、棉布着火，最合适的是水基型灭火器', co2: '二氧化碳喷完很快散开，木柴里的余火还会复燃；用水基型灭火器' },
    oil: { water: '油比水轻，浮在水面上接着烧，还会溅开；油火用干粉灭火器', co2: '油盘火面大，二氧化碳一散开火又上来了；油火用干粉灭火器' },
    file: { water: '水会把图书档案泡坏；用二氧化碳灭火器', powder: '粉末会留在档案和仪器上，把它们弄坏；用二氧化碳灭火器' },
  }
  return { ok: false, why: why[f][e]! }
}

// ---------- 第 7 课：粉尘爆炸 ----------
/** 面粉颗粒的边长（cm），示意 */
export const GRAIN = 0.005
/** 1 cm³ 面粉和空气接触的面积（cm²）：堆成一个 1 cm 的小方块，或者散成一个个 GRAIN 大小的小方块 */
export const dustArea = (spread: boolean) => spread ? round((1 / GRAIN) ** 3 * 6 * GRAIN ** 2) : 6
export const SIGNS = {
  fire: { name: '禁止烟火' },
  smoke: { name: '禁止吸烟' },
  boom: { name: '当心爆炸' },
  cracker: { name: '禁止燃放鞭炮' },
} as const
export type Sign = keyof typeof SIGNS
