// 神经调节实验室的计算核心。画面、读数、任务判定、随堂检测都从这里取数，界面文件里不做计算。
// 生物课的“计算”多半是判断：信号能走到哪一步、哪种反射、像落在哪里。少数几处有数：反应时间、像距、反应距离。
// 取值约定写在规格卡 docs/specs/nerve.md 里。长度一律用米，时间用秒。
export const G = 9.8 // m/s²，尺子下落用

// ---------- 第 1 课：神经系统的组成 ----------
export const PARTS = {
  brain: { name: '脑', group: 'central', where: '颅腔里', job: '由大脑、小脑、脑干组成' },
  cord: { name: '脊髓', group: 'central', where: '椎管里', job: '能对一些刺激发生反射，还能把信号传到脑、从脑传下来' },
  nerves: { name: '神经', group: 'peripheral', where: '遍布全身', job: '脑神经和脊神经，把信号在中枢和全身各处之间传递' },
} as const
export type PartKey = keyof typeof PARTS
export const GROUPS = { central: '中枢神经系统', peripheral: '周围神经系统' } as const
export const groupOf = (k: PartKey) => GROUPS[PARTS[k].group]
/** 脑神经和脊神经各有几对（教材） */
export const NERVE_PAIRS = { cranial: 12, spinal: 31 } as const
export const PART_ORDER: PartKey[] = ['brain', 'cord', 'nerves']

// ---------- 第 2 课：神经元 ----------
export const NEURON = {
  dendrite: { name: '树突', short: '短而多，分枝多', job: '接受信号，传向细胞体' },
  body: { name: '细胞体', short: '有细胞核', job: '神经元的代谢中心' },
  axon: { name: '轴突', short: '一条，长', job: '把信号从细胞体传出去' },
  terminal: { name: '神经末梢', short: '轴突末端的细小分枝', job: '把信号传给下一个细胞' },
} as const
export type NeuronKey = keyof typeof NEURON
/** 神经冲动在一个神经元里走的顺序 */
export const IMPULSE_PATH: NeuronKey[] = ['dendrite', 'body', 'axon', 'terminal']
/** 刺激加在某处，冲动能走到哪几处：只能朝前走（树突 → 细胞体 → 轴突 → 神经末梢） */
export const reachFrom = (k: NeuronKey) => IMPULSE_PATH.slice(IMPULSE_PATH.indexOf(k))

// ---------- 第 3 课：反射弧 ----------
export const ARC = {
  receptor: { name: '感受器', at: '指尖皮肤里的神经末梢', job: '感受刺激，产生神经冲动' },
  afferent: { name: '传入神经', at: '从指尖到脊髓', job: '把冲动传到神经中枢' },
  center: { name: '神经中枢', at: '脊髓灰质', job: '接受冲动，发出指令' },
  efferent: { name: '传出神经', at: '从脊髓到上臂', job: '把指令传给效应器' },
  effector: { name: '效应器', at: '传出神经末梢和它支配的肌肉', job: '肌肉收缩，手缩回来' },
} as const
export type ArcKey = keyof typeof ARC
export const ARC_ORDER: ArcKey[] = ['receptor', 'afferent', 'center', 'efferent', 'effector']
/** 剪断哪一段（null 表示完好） */
export type Cut = 'afferent' | 'efferent' | null
/**
 * 手碰到烫的东西之后：冲动走到哪一站、手缩不缩、觉不觉得烫。
 * 觉得烫靠的是冲动从脊髓沿上行的神经纤维传到大脑皮层，所以只要冲动到了脊髓，就会觉得烫。
 */
export function arcResult(cut: Cut) {
  const stop = cut ? ARC_ORDER.indexOf(cut) : ARC_ORDER.length
  const reached = ARC_ORDER.slice(0, stop)
  const toCord = reached.includes('center')
  return { reached, move: !cut, feel: toCord }
}

// ---------- 第 4 课：简单反射和复杂反射 ----------
export const STIMULI = {
  knee: { name: '叩击膝盖下方的韧带', reply: '小腿突然跳起', kind: 'simple', center: '脊髓', cortex: false },
  eat: { name: '吃到梅子', reply: '分泌唾液', kind: 'simple', center: '大脑皮层以下的神经中枢', cortex: false },
  see: { name: '看到梅子', reply: '分泌唾液', kind: 'complex', center: '大脑皮层', cortex: true },
  talk: { name: '听人说起梅子', reply: '分泌唾液', kind: 'complex', center: '大脑皮层（有语言中枢参与）', cortex: true },
} as const
export type StimKey = keyof typeof STIMULI
export const KINDS = { simple: '简单反射', complex: '复杂反射' } as const
export const kindOf = (k: StimKey) => KINDS[STIMULI[k].kind]
/** 哪种反射是生来就有的 */
export const inborn = (k: StimKey) => STIMULI[k].kind === 'simple'

// ---------- 第 5 课：眼和视觉 ----------
// 示意的“简化眼”：把角膜、晶状体合起来看成一个凸透镜，视网膜是光屏。按透镜公式算像落在哪里。
export const EYE = {
  /** 正常眼：透镜到视网膜 2.4 cm（示意） */
  len: { normal: 0.024, myopic: 0.025 },
  /** 看远处时透镜的屈光度（D = 1/m），正好把远处的像落在正常眼的视网膜上 */
  relaxed: 1 / 0.024,
} as const
export type EyeKey = keyof typeof EYE.len
/** 透镜公式：物距 u（m，远处取 Infinity），屈光度 P（D），像距 v（m） */
export const imageDist = (u: number, P: number) => 1 / (P - (Number.isFinite(u) ? 1 / u : 0))
/** 眼镜的屈光度：把近视眼的远点变成无穷远，取负数（凹透镜）。贴在眼前，忽略镜片到眼的距离 */
export const glassesFor = (k: EyeKey) => 1 / EYE.len[k] - EYE.relaxed
/** 看远处物体时，像比视网膜靠前多少（m，正数表示落在视网膜前面）；glasses 是戴的眼镜的屈光度 */
export function focusGap(k: EyeKey, glasses = 0) {
  const v = imageDist(Infinity, EYE.relaxed + glasses)
  return EYE.len[k] - v
}
/** 近视眼能看清的最远处（m） */
export const farPoint = (k: EyeKey) => { const extra = EYE.relaxed - 1 / EYE.len[k]; return extra <= 1e-9 ? Infinity : 1 / extra }
/** 中国习惯说的“度数” = 屈光度 × 100 */
export const degree = (P: number) => Math.round(Math.abs(P) * 100 / 25) * 25
/** 像落得准不准：差不到 0.05 mm 就算落在视网膜上 */
export const sharp = (gap: number) => Math.abs(gap) < 5e-5
/** 画面上把眼球拉长、像的前后移动放大几倍（示意：真实只差 1 mm，画出来看不出） */
export const EYE_EX = 3
/** 画面上视网膜、像到晶状体的距离，是正常眼视网膜那个距离的几倍 */
export const eyeDraw = (k: EyeKey, glasses = 0) => ({ retina: 1 + EYE_EX * (EYE.len[k] / EYE.len.normal - 1), image: 1 + EYE_EX * (imageDist(Infinity, EYE.relaxed + glasses) / EYE.len.normal - 1) })
/** 瞳孔：暗处大、强光下小（相对大小，示意） */
export const pupil = (bright: boolean) => (bright ? 0.4 : 1)

// ---------- 第 6 课：耳和听觉 ----------
export const EAR = {
  canal: { name: '外耳道', job: '把声波传到鼓膜' },
  drum: { name: '鼓膜', job: '声波使鼓膜振动' },
  bones: { name: '听小骨', job: '三块听小骨把振动传到内耳' },
  cochlea: { name: '耳蜗', job: '耳蜗里有对声波敏感的感觉细胞，受到振动刺激产生神经冲动' },
  nerve: { name: '听觉神经', job: '把神经冲动传到大脑' },
  cortex: { name: '大脑皮层的听觉中枢', job: '形成听觉' },
} as const
export type EarKey = keyof typeof EAR
export const SOUND_PATH: EarKey[] = ['canal', 'drum', 'bones', 'cochlea', 'nerve', 'cortex']
export const BONES = ['锤骨', '砧骨', '镫骨'] as const
/**
 * 巨响时鼓膜被压进去多少（相对值，示意）：外面的压力突然升高，鼓膜里面（鼓室）的压力只能靠咽鼓管补上。
 * 张开口时咽鼓管打开，空气进入鼓室，两侧压力差变小。
 */
export const drumPush = (bang: boolean, mouthOpen: boolean) => (bang ? (mouthOpen ? 0.15 : 1) : 0)

// ---------- 第 7 课：脑 ----------
export const BRAIN = {
  cortex: { name: '大脑', job: '大脑皮层是调节人体生命活动的最高级中枢，有运动、感觉、语言、视觉、听觉等功能区' },
  cerebellum: { name: '小脑', job: '使运动协调、准确，维持身体平衡' },
  stem: { name: '脑干', job: '有调节心跳、呼吸、血压等的中枢' },
} as const
export type BrainKey = keyof typeof BRAIN
export const AREAS = {
  motor: '躯体运动中枢', sense: '躯体感觉中枢', speech: '语言中枢', vision: '视觉中枢', hearing: '听觉中枢',
} as const
export type AreaKey = keyof typeof AREAS
/** 尺子长 50 cm：接住时手指在多少厘米处 */
export const RULER = 0.5
/** 尺子从手指间落下 h（m）用的时间：h = g t²/2 */
export const fallTime = (h: number) => Math.sqrt(2 * h / G)
/** t 秒里尺子落下多少米 */
export const fallDist = (t: number) => G * t * t / 2
/** 反应时间 t（s）时接住的位置（m）；超过尺长就是没接住，返回 null */
export const catchAt = (t: number) => { const h = fallDist(t); return h > RULER ? null : h }
export const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length
/** 自动演示时替学生“接”的三次反应时间（s） */
export const DEMO_RT = [0.21, 0.19, 0.2] as const

// ---------- 拓展 ----------
/** 接球的四步，每步由哪些部分参与 */
export const CATCH_STEPS = [
  { key: 'see', name: '看见', who: '眼的视网膜产生冲动，经视神经传到大脑皮层的视觉中枢' },
  { key: 'judge', name: '判断', who: '大脑皮层判断球从哪里来、多快' },
  { key: 'reach', name: '伸手', who: '躯体运动中枢发出指令，经脊髓和传出神经到手臂的肌肉；小脑让动作协调、准确' },
  { key: 'grab', name: '接住', who: '手接触到球，皮肤里的感受器又把信号传回大脑' },
] as const
/** 反应距离：反应时间 t（s）里车以 v（m/s）匀速走过的路（m） */
export const reactDist = (v: number, t: number) => v * t
/** 拓展里的车速：54 km/h */
export const CAR_V = 54 / 3.6
/** 两种假设的反应时间（s）：用来比较，不是测出来的 */
export const CAR_RT = { a: 0.5, b: 1.0 } as const
