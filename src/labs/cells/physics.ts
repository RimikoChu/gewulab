// 细胞实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。取值约定见 docs/specs/cells.md。

// ---------- 第 1 课：显微镜的结构 ----------
export const SCOPE = {
  lens: { name: '目镜和物镜', what: '目镜在镜筒上端，靠近眼睛；物镜装在转换器上，靠近玻片。放大靠的就是这两组镜头', does: '放大物像' },
  focus: { name: '准焦螺旋', what: '粗准焦螺旋转一圈，镜筒升降的幅度大，用来找到物像；细准焦螺旋升降的幅度很小，用来把物像调清楚', does: '升降镜筒' },
  stage: { name: '载物台', what: '放玻片标本的平台，中央有通光孔，两旁有压片夹', does: '放玻片' },
  light: { name: '反光镜和遮光器', what: '反光镜把光反射进通光孔；遮光器上有大小不同的光圈，调节进光的多少', does: '调节光线' },
} as const
export type ScopeKey = keyof typeof SCOPE

// ---------- 第 2 课：放大倍数 ----------
export const EYEPIECE = 10
export const OBJECTIVES = [4, 10, 40] as const
/** 显微镜的放大倍数 = 目镜的倍数 × 物镜的倍数 */
export const magnify = (objective: number, eyepiece = EYEPIECE) => objective * eyepiece
/** 视野直径上能看到一行几个细胞：和放大倍数成反比，100 倍时取 8 个 */
export const cellsInRow = (mag: number) => 800 / mag
/** 视野的亮度：倍数越大，视野越暗 */
export const brightness = (mag: number) => mag <= 40 ? 1 : mag <= 100 ? 0.78 : 0.5

// ---------- 第 3 课：对光、调焦、移动玻片 ----------
export const FOCUS = [
  { key: 'low', name: '转到低倍物镜', does: '转动转换器，让低倍物镜对准通光孔', why: '低倍镜视野大，容易找到要看的东西', view: 'dark' },
  { key: 'light', name: '对光', does: '一边看目镜，一边转动反光镜', why: '直到看见一个白亮的圆形视野', view: 'bright' },
  { key: 'down', name: '放片，降镜筒', does: '放好玻片；眼睛从侧面看着物镜，转粗准焦螺旋让镜筒慢慢下降', why: '眼睛看着物镜，是为了不让物镜压碎玻片', view: 'bright' },
  { key: 'up', name: '升镜筒找物像', does: '眼睛看目镜，反方向转粗准焦螺旋，让镜筒慢慢上升', why: '直到看见物像', view: 'blur' },
  { key: 'fine', name: '调清楚', does: '稍稍转动细准焦螺旋', why: '物像变清晰', view: 'sharp' },
] as const
export type Dir = 'ld' | 'ru'
export const DIRS: Record<Dir, string> = { ld: '左下方', ru: '右上方' }
const OPP: Record<Dir, Dir> = { ld: 'ru', ru: 'ld' }
/** 显微镜下看到的是倒像：玻片往一个方向移，物像往相反的方向移 */
export const imageMoves = (slide: Dir): Dir => OPP[slide]
/** 物像偏在哪边，就把玻片往哪边移，物像才会回到中央 */
export const slideToCenter = (imageAt: Dir): Dir => imageAt
/** 玻片上的字母在显微镜下看到的样子：上下、左右都颠倒 */
export const seenAs = (letter: 'p' | 'b' | 'd' | 'q') => ({ p: 'd', b: 'q', d: 'p', q: 'b' } as const)[letter]

// ---------- 第 4 课：临时装片 ----------
export const SAMPLES = {
  onion: { name: '洋葱鳞片叶表皮', liquid: '清水', why: '植物细胞有细胞壁撑着，在清水里不会涨破' },
  cheek: { name: '人的口腔上皮细胞', liquid: '生理盐水', why: '动物细胞没有细胞壁，放在清水里会吸水涨破；生理盐水能让它保持原来的形状' },
} as const
export type SampleKey = keyof typeof SAMPLES
export const SLIDE = [
  { key: 'wipe', name: '擦', does: '把载玻片和盖玻片擦干净', why: '免得污物挡住视线' },
  { key: 'drop', name: '滴', does: '在载玻片中央滴一滴液体', why: '让细胞保持原来的形状' },
  { key: 'take', name: '取', does: '取下一小块要看的材料', why: '材料要薄而透明，光才能透过去' },
  { key: 'spread', name: '展', does: '把材料放进液滴里展平（或涂抹均匀）', why: '细胞叠在一起就看不清了' },
  { key: 'cover', name: '盖', does: '盖玻片一边先接触液滴，再慢慢放平', why: '这样不容易产生气泡' },
  { key: 'stain', name: '染', does: '在盖玻片一侧滴碘液，另一侧用吸水纸吸引', why: '碘液把细胞核染成深色，看得更清楚' },
] as const

// ---------- 第 5、6 课：细胞的结构 ----------
export const PARTS = {
  wall: { name: '细胞壁', plant: true, animal: false, does: '在最外层，保护和支持细胞' },
  membrane: { name: '细胞膜', plant: true, animal: true, does: '紧贴在细胞壁里面，控制物质进出细胞' },
  cytoplasm: { name: '细胞质', plant: true, animal: true, does: '细胞膜以内、细胞核以外的部分，不停地流动，许多生命活动在这里进行' },
  nucleus: { name: '细胞核', plant: true, animal: true, does: '里面有遗传物质，是细胞的控制中心' },
  vacuole: { name: '液泡', plant: true, animal: false, does: '里面是细胞液，溶解着糖分、色素等物质' },
  chloroplast: { name: '叶绿体', plant: true, animal: false, does: '把光能变成化学能，储存在它制造的有机物里。只有植物绿色部分的细胞才有' },
  mito: { name: '线粒体', plant: true, animal: true, does: '把有机物里的化学能释放出来，供细胞利用' },
} as const
export type PartKey = keyof typeof PARTS
export const PART_KEYS = Object.keys(PARTS) as PartKey[]
export type CellKind = 'plant' | 'animal'
export const has = (kind: CellKind, part: PartKey) => PARTS[part][kind]
/** 植物细胞有、动物细胞没有的结构 */
export const onlyPlant = () => PART_KEYS.filter(k => has('plant', k) && !has('animal', k))

// ---------- 第 7 课：细胞分裂 ----------
export const DIVIDE = [
  { key: 'copy', name: '染色体复制', say: '分裂之前，细胞核里的染色体先复制，数量加倍' },
  { key: 'nucleus', name: '细胞核一分为二', say: '染色体平均分成两份，各进入一个新的细胞核' },
  { key: 'cytoplasm', name: '细胞质分成两份', say: '每一份里含有一个细胞核' },
  { key: 'wall', name: '分成两个细胞', say: '' },
] as const
export const LAST_STEP: Record<CellKind, string> = { plant: '在中央形成新的细胞膜和新的细胞壁', animal: '细胞膜从中部向内凹陷，把细胞缢裂成两个' }
/** 做到第几步时，每个细胞核里有几条染色体（原来是 n 条）。返回各个核的条数 */
export const chromosomes = (step: number, n = 4): number[] => step <= 0 ? [n] : step === 1 ? [2 * n] : [n, n]

// ---------- 拓展 ----------
/** 边长为 a 的立方体：表面积和体积的比 */
export const surfaceToVolume = (a: number) => (6 * a * a) / (a * a * a)
export const CUBES = [1, 2, 4] as const
/** 克隆羊多莉：细胞核来自哪只羊，小羊就像哪只羊 */
export const DOLLY = { nucleus: '白面母羊（提供乳腺细胞的细胞核）', egg: '黑面母羊（提供去掉细胞核的卵细胞）', womb: '另一只黑面母羊（代孕）' }
export const dollyLooksLike = () => 'nucleus' as const
