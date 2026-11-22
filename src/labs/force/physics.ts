// 力和运动实验室的计算核心。画面、读数、任务判定、随堂检测都从这里取数，界面文件里不做计算。
// 物理量一律用国际单位（m、kg、s、N）。取值约定和每个自定的数的来历写在规格卡 docs/specs/force.md 里。
export const G = 9.8 // N/kg

/** 抹掉浮点尾数：保留 n 位小数 */
export const round = (x: number, n = 2) => Math.round(x * 10 ** n) / 10 ** n

// ---------- 通用：先用恒力推一段时间，松手后靠摩擦慢慢停下 ----------
/** a1：推的时候的加速度；v：松手时的速度；d1：推的这段走了多远；a2：松手后减速的快慢；d2：松手后又滑了多远 */
export interface Shove { F: number; a1: number; v: number; d1: number; t1: number; a2: number; d2: number; t2: number; total: number; tEnd: number }
/** 质量 m 的物体放在摩擦因数 mu 的水平面上，用水平力 F 推 t1 秒后松手 */
export function shove(F: number, m: number, mu: number, t1: number): Shove {
  const f = mu * m * G, a1 = Math.max(0, (F - f) / m), v = a1 * t1, d1 = 0.5 * a1 * t1 * t1
  const a2 = mu * G, t2 = v / a2, d2 = v * v / (2 * a2)
  return { F, a1, v, d1, t1, a2, d2, t2, total: d1 + d2, tEnd: t1 + t2 }
}
/** 开始推以后 t 秒：走了多远、多快、是不是还在推 */
export function shoveAt(s: Shove, t: number) {
  if (t <= 0) return { x: 0, v: 0, pushing: false }
  if (t < s.t1) return { x: 0.5 * s.a1 * t * t, v: s.a1 * t, pushing: true }
  const u = Math.min(t - s.t1, s.t2)
  return { x: s.d1 + s.v * u - 0.5 * s.a2 * u * u, v: s.v - s.a2 * u, pushing: false }
}
/** 以初速度 v0 在摩擦因数 mu 的水平面上滑行：能滑多远、多久 */
export const glideDist = (v0: number, mu: number) => v0 * v0 / (2 * mu * G)
export const glideTime = (v0: number, mu: number) => v0 / (mu * G)
/** 滑行 t 秒时走了多远 */
export function glideAt(v0: number, mu: number, t: number) { const u = Math.min(Math.max(0, t), glideTime(v0, mu)); return v0 * u - 0.5 * mu * G * u * u }

// ---------- 第 1 课：力的作用效果和三要素（推冰壶） ----------
/** 冰壶：质量、半径；mu 是壶和冰面之间的摩擦因数（自定的示意值） */
export const STONE = { m: 20, r: 0.145, mu: 0.02 }
/** 每次推多久（s）；推杆的海绵头每受 1 N 压扁多少米（示意） */
export const PUSH_T = 0.5, TIP_K = 1000
export type PushKey = 'light' | 'heavy' | 'back' | 'side'
/** 四种推法：F 大小（N），dir 方向（1 向前，−1 向后），off 作用点偏离中心线多远（m） */
export const PUSHES: Record<PushKey, { name: string; F: number; dir: 1 | -1; off: number }> = {
  light: { name: '轻推', F: 20, dir: 1, off: 0 },
  heavy: { name: '重推', F: 40, dir: 1, off: 0 },
  back: { name: '反向推', F: 20, dir: -1, off: 0 },
  side: { name: '推边上', F: 20, dir: 1, off: 0.1 },
}
export const stoneShove = (k: PushKey) => shove(PUSHES[k].F, STONE.m, STONE.mu, PUSH_T)
/** 冰壶停下时离出发点多远（m，向前为正） */
export const stoneEnd = (k: PushKey) => PUSHES[k].dir * stoneShove(k).total
/** 海绵头被压扁多少（m）：力的作用是相互的，壶也在推海绵 */
export const tipSquash = (F: number) => F / TIP_K
/**
 * 推在边上时冰壶转过的角度（弧度）：推的时候按力矩和转动惯量（½mr²）算角加速度；
 * 松手后的转速画成和滑行一起均匀减到零（示意）。
 */
export function stoneSpin(k: PushKey, t: number) {
  const p = PUSHES[k], s = stoneShove(k); if (!p.off || t <= 0) return 0
  const alpha = p.F * p.off / (0.5 * STONE.m * STONE.r * STONE.r), w = alpha * s.t1
  if (t < s.t1) return 0.5 * alpha * t * t
  const u = Math.min(t - s.t1, s.t2)
  return 0.5 * alpha * s.t1 * s.t1 + w * u - 0.5 * (w / s.t2) * u * u
}

// ---------- 第 2 课：弹力和弹簧测力计 ----------
/** 测力计：量程（N）、分度值（N）、每受 1 N 拉力弹簧伸长多少厘米（这只测力计自定的规格） */
export const SCALE = { max: 5, step: 0.1, cmPerN: 3 }
/** 没调零时指针停在哪（N） */
export const ZERO_ERR = 0.2
/** 拉力 F 时弹簧的伸长（cm） */
export const stretchCm = (F: number) => round(F * SCALE.cmPerN, 1)
/** 弹簧的劲度系数（N/m） */
export const SPRING_K = 100 / SCALE.cmPerN
/** 指针指的示数：没调零时每次都多出一个零点误差 */
export const scaleReads = (F: number, zeroErr = 0) => round(F + zeroErr, 2)
export const overRange = (F: number) => F > SCALE.max + 1e-9
/** 第 2 课依次拉到的几个力（N） */
export const PULLS = [1, 2, 3, 4]

// ---------- 第 3 课：重力 ----------
/** 一只钩码的质量（kg） */
export const HOOK_M = 0.05
/** 质量 m（kg）的物体受到的重力（N） */
export const weight = (m: number) => round(m * G, 3)
/** 挂 n 只钩码：总质量（kg）和重力（N） */
export const hooks = (n: number) => { const m = round(n * HOOK_M, 3); return { n, m, G: weight(m) } }
/** 重力和质量的比值（N/kg） */
export const ratio = (Gn: number, m: number) => round(Gn / m, 1)
/** 把铁架台垫斜的角度（度） */
export const TILT = 8

// ---------- 第 4 课：阻力对物体运动的影响 ----------
/** 斜面：小车从多高的地方放开（m）、沿斜面要走多长（m）。斜面本身的阻力忽略不计 */
export const RAMP = { h: 0.05, L: 0.3 }
/** 水平木板的长度（m） */
export const TRACK = 1
export type Surf = 'towel' | 'cotton' | 'wood' | 'none'
/** 三种表面对小车的阻力，折算成和压力的比值（自定的示意值）；none 是推理出来的“没有阻力” */
export const SURF: Record<Surf, { name: string; mu: number }> = {
  towel: { name: '毛巾', mu: 0.25 }, cotton: { name: '棉布', mu: 0.125 }, wood: { name: '木板', mu: 0.0625 }, none: { name: '没有阻力', mu: 0 },
}
/** 斜面的倾角（弧度） */
export const rampAngle = () => Math.asin(RAMP.h / RAMP.L)
/** 小车到斜面底端时的速度（m/s）：v² = 2gh，和水平面铺什么无关 */
export const rampSpeed = (h = RAMP.h) => Math.sqrt(2 * G * h)
/** 在斜面上走了多久（s） */
export const rampTime = () => Math.sqrt(2 * RAMP.L / (G * RAMP.h / RAMP.L))
/** 在水平面上滑行的距离（m）；没有阻力时不会停 */
export const cartDist = (k: Surf) => SURF[k].mu ? glideDist(rampSpeed(), SURF[k].mu) : Infinity
/** 整个过程多久（s）：没有阻力时算到驶出木板为止 */
export const cartEnd = (k: Surf) => rampTime() + (SURF[k].mu ? glideTime(rampSpeed(), SURF[k].mu) : TRACK / rampSpeed())
/** 放开后 t 秒：ramp 是沿斜面走了多远，flat 是在水平面上走了多远，v 是速度 */
export function cartAt(k: Surf, t: number) {
  const tr = rampTime(), a = G * RAMP.h / RAMP.L, v0 = rampSpeed(), mu = SURF[k].mu
  if (t <= 0) return { ramp: 0, flat: 0, v: 0 }
  if (t < tr) return { ramp: 0.5 * a * t * t, flat: 0, v: a * t }
  const u = t - tr
  if (!mu) return { ramp: RAMP.L, flat: Math.min(TRACK, v0 * u), v: v0 }
  const w = Math.min(u, glideTime(v0, mu))
  return { ramp: RAMP.L, flat: v0 * w - 0.5 * mu * G * w * w, v: v0 - mu * G * w }
}

// ---------- 第 5 课：惯性（雪橇和木箱） ----------
/** 雪橇：质量、板面长；mu 是滑板和冰面之间的摩擦因数（自定） */
export const SLED = { m: 10, deck: 1.2, mu: 0.05 }
/** 木箱：质量、边长；mu 是没绑住的木箱和雪橇板面之间的摩擦因数（自定） */
export const CRATE = { m: 10, size: 0.3, mu: 0.1 }
/** 猛拉：雪橇先以 a 加速 t 秒，再以同样的快慢减速 t 秒停住 */
export const JERK = { a: 8, t: 0.25 }
/** 猛拉的全过程：每一小步算一次，木箱只受板面的滑动摩擦力。返回各时刻雪橇和木箱走了多远 */
export const jerkTable = (() => {
  let memo: { dt: number; sled: number[]; box: number[] } | null = null
  return () => {
    if (memo) return memo
    const dt = 1 / 2000, sled: number[] = [0], box: number[] = [0], ab = CRATE.mu * G
    let xs = 0, vs = 0, xb = 0, vb = 0
    for (let i = 1; i < 4000; i++) {
      const t = i * dt
      vs = t <= JERK.t ? JERK.a * t : Math.max(0, JERK.a * (2 * JERK.t - t)); xs += vs * dt
      const rel = vs - vb
      if (Math.abs(rel) <= ab * dt) vb = vs; else vb += Math.sign(rel) * ab * dt   // 相对滑动时摩擦力带着它追雪橇；追上了就一起走
      xb += vb * dt; sled.push(xs); box.push(xb)
      if (vs === 0 && vb === 0 && t > 2 * JERK.t) break
    }
    return (memo = { dt, sled, box })
  }
})()
export function jerkAt(t: number) { const T = jerkTable(), i = Math.min(T.sled.length - 1, Math.max(0, Math.round(t / T.dt))); return { sled: T.sled[i], box: T.box[i] } }
/** 猛拉结束：雪橇走了多远、木箱走了多远、木箱在板面上向后落下多少、总共多久 */
export function jerkEnd() { const T = jerkTable(), n = T.sled.length - 1; return { sled: round(T.sled[n], 3), box: round(T.box[n], 3), lag: round(T.sled[n] - T.box[n], 3), t: n * T.dt } }
/** 撞挡板：雪橇从静止被慢慢推着加速（a 小于木箱能跟上的最大加速度），走 d 米后撞上挡板，立刻停住 */
export const CRASH = { a: 0.25, d: 2 }
export const crashSpeed = () => Math.sqrt(2 * CRASH.a * CRASH.d)
export const crashHit = () => crashSpeed() / CRASH.a
/** 雪橇停住以后木箱在板面上继续向前滑多远（m）、滑多久（s） */
export const crashSlide = () => glideDist(crashSpeed(), CRATE.mu)
export const crashEnd = () => crashHit() + glideTime(crashSpeed(), CRATE.mu)
export function crashAt(t: number) {
  const th = crashHit(), u = Math.max(0, t)
  if (u < th) return { sled: 0.5 * CRASH.a * u * u, slide: 0 }
  return { sled: CRASH.d, slide: glideAt(crashSpeed(), CRATE.mu, u - th) }
}
/** 同样的力推两只雪橇：力的大小、推多久；light 是雪橇加一只木箱，heavy 是雪橇加五只木箱 */
export const SAME = { F: 60, t: 0.5, light: SLED.m + CRATE.m, heavy: SLED.m + 5 * CRATE.m }
export const sameShove = (which: 'light' | 'heavy') => shove(SAME.F, SAME[which], SLED.mu, SAME.t)

// ---------- 第 6 课：二力平衡 ----------
export type Cond = 'unequal' | 'equal' | 'twist' | 'cut'
/** 四种情况：左右各挂几只钩码、卡片扭转多少度、是不是剪成两半 */
export const CONDS: Record<Cond, { name: string; left: number; right: number; twist: number; cut: boolean }> = {
  unequal: { name: '左 2 右 1', left: 2, right: 1, twist: 0, cut: false },
  equal: { name: '左 2 右 2', left: 2, right: 2, twist: 0, cut: false },
  twist: { name: '扭转一个角度', left: 2, right: 2, twist: 40, cut: false },
  cut: { name: '剪成两半', left: 2, right: 2, twist: 0, cut: true },
}
/** 一边的拉力（N）：等于那一边钩码受到的重力 */
export const pull = (n: number) => weight(n * HOOK_M)
/** 二力平衡的判定：四个条件各看一遍，返回缺的是哪一条 */
export function balanced(c: { left: number; right: number; twist: number; cut: boolean }) {
  const lack = c.cut ? '同一物体' : c.twist ? '同一直线' : c.left !== c.right ? '大小相等' : null
  return { ok: !lack, lack }
}
/** 卡片松手后能滑多远（m）：重的一边钩码落到垫块上为止 */
export const CARD_RUN = 0.1
/** 两边钩码质量不等时卡片的加速度（m/s²，向左为正）；卡片和细线的质量、滑轮的摩擦忽略不计 */
export const cardAccel = (left: number, right: number) => (left - right) * G / (left + right)
/** 以加速度 a 走完 d 要多久（s） */
export const runTime = (d: number, a: number) => Math.sqrt(2 * d / Math.abs(a))
/** 扭转后松手，卡片转回去的过程（度）：画成有阻尼的来回摆动，快慢是示意 */
export const TWIST = { w: 9, z: 0.3, t: 2.2 }
export const twistAt = (deg: number, t: number) => t <= 0 ? deg : t >= TWIST.t ? 0 : deg * Math.exp(-TWIST.z * TWIST.w * t) * Math.cos(TWIST.w * Math.sqrt(1 - TWIST.z ** 2) * t)

// ---------- 第 7 课：滑动摩擦力 ----------
/** 木块和加在上面的砝码的质量（kg） */
export const BLOCK = { m: 0.2 }, LOAD = { m: 0.2 }
/** 木块在木板上、在毛巾上的动摩擦因数；垫上圆铅笔滚动时折算的比值（都是自定的示意值） */
export const MU = { wood: 0.3, towel: 0.5, roll: 0.03 }
export type Case7 = 'base' | 'load' | 'towel' | 'side'
export const CASES: Record<Case7, { name: string; face: 'wood' | 'towel'; load: boolean; side: boolean }> = {
  base: { name: '木板 · 平放', face: 'wood', load: false, side: false },
  load: { name: '加一只砝码', face: 'wood', load: true, side: false },
  towel: { name: '铺上毛巾', face: 'towel', load: false, side: false },
  side: { name: '木块侧放', face: 'wood', load: false, side: true },
}
/** 木块对接触面的压力（N）：水平面上等于总重力 */
export const pressure = (k: Case7) => weight(BLOCK.m + (CASES[k].load ? LOAD.m : 0))
/** 滑动摩擦力（N）：f = μN，和接触面积无关 */
export const friction = (k: Case7) => round(MU[CASES[k].face] * pressure(k), 3)
/** 滚动时的阻力（N） */
export const rolling = () => round(MU.roll * weight(BLOCK.m), 3)
/** 匀速拉动：拉绳的速度（m/s）、一共拉多远（m） */
export const DRAG = { v: 0.06, d: 0.24 }
export const dragEnd = () => DRAG.d / DRAG.v
/** 开始收绳后 t 秒：绳头走了多远、木块走了多远、测力计的示数。弹簧先被拉长，拉力够大了木块才动，之后匀速 */
export function dragAt(f: number, t: number) {
  const ring = DRAG.v * Math.min(Math.max(0, t), dragEnd()), slack = f / SPRING_K
  return { ring, block: Math.max(0, ring - slack), F: Math.min(f, ring * SPRING_K) }
}

// ---------- 拓展课 ----------
/** 同一直线上两个力的合力（N）：同向相加，反向相减，方向跟较大的那个力 */
export const resultant = (F1: number, F2: number, same: boolean) => same ? F1 + F2 : Math.abs(F1 - F2)
/** 两根推杆的力（N）和推多久（s） */
export const COMBO = { F1: 30, F2: 20, t: 0.3 }
export const comboShove = (same: boolean) => shove(resultant(COMBO.F1, COMBO.F2, same), STONE.m, STONE.mu, COMBO.t)
/** 擦冰：出手速度（m/s）、不擦和擦冰时的摩擦因数（自定的示意值） */
export const SWEEP = { v: 0.9, mu: STONE.mu, swept: 0.012 }
export const sweepDist = (swept: boolean) => glideDist(SWEEP.v, swept ? SWEEP.swept : SWEEP.mu)
export const sweepTime = (swept: boolean) => glideTime(SWEEP.v, swept ? SWEEP.swept : SWEEP.mu)
