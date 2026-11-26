// 消化和吸收实验室的计算核心：营养物质、消化道各段、消化腺、试管实验、消化的程度、吸收、膳食宝塔。
// 画面、读数、任务判定、随堂检测都从这里取，界面文件里不做计算。来历见规格卡 docs/specs/digest.md。

// ---------- 第 1 课：食物中的营养物质 ----------
export const NUTRIENTS = [
  { key: 'sugar', name: '糖类', energy: true },
  { key: 'fat', name: '脂肪', energy: true },
  { key: 'protein', name: '蛋白质', energy: true },
  { key: 'water', name: '水', energy: false },
  { key: 'mineral', name: '无机盐', energy: false },
  { key: 'vitamin', name: '维生素', energy: false },
] as const
export type TestKey = 'iodine' | 'peanut' | 'dough'
/** 三个鉴定实验：用什么、看到什么、说明有什么 */
export const TESTS: Record<TestKey, { food: string; how: string; act: string; see: string; mark: string; has: string }> = {
  iodine: { food: '馒头', how: '滴碘液', act: '滴碘液', see: '变成蓝色', mark: '变蓝', has: '淀粉' },
  peanut: { food: '花生', how: '在白纸上挤压', act: '挤压', see: '白纸上留下透亮的油斑', mark: '油斑', has: '脂肪' },
  dough: { food: '面团', how: '包在纱布里，在清水中揉洗', act: '揉洗', see: '纱布里剩下黄白色、有黏性的面筋', mark: '面筋', has: '蛋白质' },
}
export const L1_ORDER: TestKey[] = ['iodine', 'peanut', 'dough']
/** 六类里能供能的有几类 */
export const energyKinds = () => NUTRIENTS.filter(n => n.energy).length

// ---------- 第 2 课：消化系统的组成 ----------
export type TractKey = 'mouth' | 'pharynx' | 'esophagus' | 'stomach' | 'small' | 'large' | 'anus'
export const TRACT: { key: TractKey; name: string; note: string }[] = [
  { key: 'mouth', name: '口腔', note: '牙齿咀嚼，舌搅拌，唾液开始消化淀粉' },
  { key: 'pharynx', name: '咽', note: '食物和空气共同的通道' },
  { key: 'esophagus', name: '食道', note: '靠蠕动把食物送进胃' },
  { key: 'stomach', name: '胃', note: '囊状，暂时储存食物，初步消化蛋白质' },
  { key: 'small', name: '小肠', note: '消化道里最长的一段，消化和吸收的主要场所' },
  { key: 'large', name: '大肠', note: '吸收少量水、无机盐和部分维生素，形成粪便' },
  { key: 'anus', name: '肛门', note: '粪便由这里排出' },
]
export type GlandKey = 'saliva' | 'liver' | 'pancreas' | 'gastric' | 'intestinal'
/** 五种消化腺：在哪里、分泌什么、送到哪里。inWall：长在消化道壁内的小腺体 */
export const GLANDS: { key: GlandKey; name: string; juice: string; to: string; inWall: boolean }[] = [
  { key: 'saliva', name: '唾液腺', juice: '唾液', to: '口腔', inWall: false },
  { key: 'liver', name: '肝', juice: '胆汁', to: '小肠', inWall: false },
  { key: 'pancreas', name: '胰', juice: '胰液', to: '小肠', inWall: false },
  { key: 'gastric', name: '胃腺', juice: '胃液', to: '胃', inWall: true },
  { key: 'intestinal', name: '肠腺', juice: '肠液', to: '小肠', inWall: true },
]
/** 小肠的长度（m） */
export const SMALL_LEN: [number, number] = [5, 6]
export const outsideGlands = () => GLANDS.filter(g => !g.inWall).length

// ---------- 第 3 课：馒头在口腔中的变化 ----------
export type TubeNo = 1 | 2 | 3
export const TUBES: Record<TubeNo, { food: string; liquid: string; stir: boolean }> = {
  1: { food: '馒头碎屑', liquid: '2 mL 唾液', stir: true },
  2: { food: '馒头碎屑', liquid: '2 mL 清水', stir: true },
  3: { food: '馒头块', liquid: '2 mL 唾液', stir: false },
}
export type Temp = 37 | 0
export const WARM_MIN = 10        // 保温时间（分钟）
export const IODINE_DROPS = 2
/** 唾液淀粉酶在这个温度下的相对活性：37 ℃ 最适，0 ℃ 几乎不起作用（示意） */
export const activity = (t: Temp) => (t === 37 ? 1 : 0.02)
/**
 * 保温 min 分钟后剩下的淀粉（0–1，示意）：一级反应 exp(−k·t)。
 * 没有唾液 k = 0；碎屑加搅拌接触面大，k 大；整块不搅拌只有表面那一层被分解，k 小。
 */
export function starchLeft(tube: TubeNo, temp: Temp, min: number) {
  const base = tube === 2 ? 0 : tube === 1 ? 0.55 : 0.06
  return Math.exp(-base * activity(temp) * min)
}
export type Blue = 'none' | 'part' | 'blue'
/** 滴碘液后的颜色：剩下的淀粉多就变蓝，少就不变蓝，中间是部分变蓝 */
export const iodineColor = (left: number): Blue => (left > 0.6 ? 'blue' : left > 0.15 ? 'part' : 'none')
export const BLUE_NAME: Record<Blue, string> = { none: '不变蓝', part: '部分变蓝', blue: '变蓝' }

// ---------- 消化的程度（第 4、5 课和拓展共用） ----------
export type Macro = 'starch' | 'protein' | 'fat'
export const MACRO: Record<Macro, { name: string; start: string; product: string; color: string }> = {
  starch: { name: '淀粉', start: '口腔', product: '葡萄糖', color: '#f1e6c8' },
  protein: { name: '蛋白质', start: '胃', product: '氨基酸', color: '#ef8f7a' },
  fat: { name: '脂肪', start: '小肠', product: '甘油和脂肪酸', color: '#f2c84b' },
}
/** 教材曲线上的五个部位：A 口腔，B 咽和食道，C 胃，D 小肠，E 大肠 */
export type Site = 'A' | 'B' | 'C' | 'D' | 'E'
export const SITES: { key: Site; name: string }[] = [
  { key: 'A', name: '口腔' }, { key: 'B', name: '咽和食道' }, { key: 'C', name: '胃' }, { key: 'D', name: '小肠' }, { key: 'E', name: '大肠' },
]
/** 走到这个部位末尾时，这种物质还剩多少没被消化（0–1，示意，形状照教材的曲线） */
const LEFT: Record<Macro, Record<Site, number>> = {
  starch: { A: 0.78, B: 0.78, C: 0.78, D: 0, E: 0 },
  protein: { A: 1, B: 1, C: 0.7, D: 0, E: 0 },
  fat: { A: 1, B: 1, C: 1, D: 0, E: 0 },
}
export const leftAfter = (m: Macro, s: Site) => LEFT[m][s]
/** 从哪个部位开始被消化 */
export function startSite(m: Macro): Site { const keys: Site[] = ['A', 'B', 'C', 'D', 'E']; let prev = 1; for (const k of keys) { if (LEFT[m][k] < prev) return k; prev = LEFT[m][k] } return 'E' }
/** 第 4 课：胃蠕动的进度 k（0–1）时，蛋白质剩下的（从 1 降到胃末尾的值） */
export const proteinInStomach = (k: number) => 1 - (1 - LEFT.protein.C) * Math.min(1, Math.max(0, k))

// ---------- 第 5 课：小肠里的消化 ----------
export const PRODUCTS: Record<Macro, string> = { starch: '葡萄糖', protein: '氨基酸', fat: '甘油和脂肪酸' }
export const L5_ORDER: Macro[] = ['starch', 'protein', 'fat']
/** 胆汁把一个大脂肪滴乳化成 n 个小微粒，总体积不变时每个的半径（示意：说明“变小了、没变成别的东西”） */
export const dropletR = (R: number, n: number) => R / Math.cbrt(n)
/** 乳化后的总表面积是原来的几倍（体积不变） */
export const areaGain = (n: number) => Math.cbrt(n)

// ---------- 第 6 课：吸收 ----------
export type Organ = 'small' | 'stomach' | 'large'
export const ABSORB: Record<Organ, { name: string; what: string }> = {
  small: { name: '小肠', what: '葡萄糖、氨基酸、甘油、脂肪酸、水、无机盐、维生素' },
  stomach: { name: '胃', what: '少量的水和酒精' },
  large: { name: '大肠', what: '少量的水、无机盐和部分维生素' },
}
/** 绒毛里的去向：葡萄糖、氨基酸进毛细血管；大部分脂肪成分进毛细淋巴管 */
export type Absorbed = 'glucose' | 'amino' | 'fatty'
export const ROUTE: Record<Absorbed, 'blood' | 'lymph'> = { glucose: 'blood', amino: 'blood', fatty: 'lymph' }

// ---------- 第 7 课：合理营养 ----------
export type FoodGroup = 'grain' | 'veg' | 'fruit' | 'meat' | 'milk'
export const FOODS: Record<FoodGroup, { name: string; dish: string; layer: number }> = {
  grain: { name: '主食', dish: '米饭', layer: 1 },
  veg: { name: '蔬菜', dish: '炒青菜', layer: 2 },
  fruit: { name: '水果', dish: '橙子', layer: 2 },
  meat: { name: '鱼肉蛋', dish: '清蒸鱼和鸡蛋', layer: 3 },
  milk: { name: '奶', dish: '一盒牛奶', layer: 4 },
}
export const FOOD_ORDER: FoodGroup[] = ['grain', 'veg', 'fruit', 'meat', 'milk']
/** 中国居民平衡膳食宝塔（2022），自下而上五层，成人每天的推荐量 */
export const PAGODA: { layer: number; name: string; amount: string }[] = [
  { layer: 1, name: '谷薯类', amount: '谷类 200–300 g，薯类 50–100 g' },
  { layer: 2, name: '蔬菜、水果', amount: '蔬菜 300–500 g，水果 200–350 g' },
  { layer: 3, name: '动物性食物', amount: '120–200 g' },
  { layer: 4, name: '奶、大豆和坚果', amount: '奶 300–500 g，大豆和坚果 25–35 g' },
  { layer: 5, name: '盐、油', amount: '盐 < 5 g，油 25–30 g' },
]
/** 餐盘上的食物凑齐了几类 */
export const mealGroups = (items: FoodGroup[]) => new Set(items).size
export const balanced = (items: FoodGroup[]) => mealGroups(items) === FOOD_ORDER.length

// ---------- 拓展：一顿饭的旅程 ----------
export type Leg = 'mouth' | 'esophagus' | 'stomach' | 'small' | 'large' | 'out'
export const LEGS: { key: Leg; name: string; site: Site | null; what: string; stay?: string }[] = [
  { key: 'mouth', name: '口腔', site: 'A', what: '牙齿把馒头嚼碎，舌把它和唾液拌匀，一部分淀粉变成麦芽糖' },
  { key: 'esophagus', name: '咽和食道', site: 'B', what: '咽下去，食道一段段蠕动，把食团往下送，这里不消化' },
  { key: 'stomach', name: '胃', site: 'C', what: '胃蠕动，和胃液搅成食糜；蛋白质被初步分解', stay: '约 4–6 小时' },
  { key: 'small', name: '小肠', site: 'D', what: '胆汁、胰液、肠液把三类物质彻底分解，营养被吸收进血液和淋巴', stay: '约 3–8 小时' },
  { key: 'large', name: '大肠', site: 'E', what: '吸收少量水、无机盐和部分维生素，剩下的形成粪便' },
  { key: 'out', name: '肛门', site: null, what: '粪便由肛门排出' },
]
