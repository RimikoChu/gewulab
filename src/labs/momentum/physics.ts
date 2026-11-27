// 动量和碰撞实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 物理量一律用国际单位；场景单位 1 = 1 m。直线上的运动取向右（+x）为正。取值约定写在规格卡 docs/specs/momentum.md 里。
export const G = 9.8 // N/kg

/** 动量 p = mv（kg·m/s） */
export const momentum = (m: number, v: number) => m * v
/** 动能 Ek = ½mv²（J） */
export const kinetic = (m: number, v: number) => 0.5 * m * v * v

// ---------- 一条直线上的分段运动：各课的滑行、碰撞都拆成几段匀变速运动 ----------
/** 从 t0 时刻起的一段匀变速运动；减速到零就停住，不会倒回去 */
export interface Seg { t0: number; x0: number; v0: number; a: number }
export function segAt(s: Seg, t: number) {
  let dt = Math.max(0, t - s.t0)
  if (s.a !== 0 && s.v0 !== 0 && Math.sign(s.a) !== Math.sign(s.v0)) dt = Math.min(dt, Math.abs(s.v0 / s.a))
  return { x: s.x0 + s.v0 * dt + 0.5 * s.a * dt * dt, v: s.v0 + s.a * dt }
}
/** t 时刻在哪一段上，位置和速度是多少 */
export function pathAt(segs: Seg[], t: number) {
  let s = segs[0]
  for (const q of segs) if (t >= q.t0) s = q
  return segAt(s, t)
}
/** 这一段运动什么时候到达 x（到不了返回 Infinity） */
export function hitTime(s: Seg, x: number) {
  const d = x - s.x0
  if (Math.abs(d) < 1e-12) return s.t0
  if (s.a === 0) return s.v0 !== 0 && d / s.v0 > 0 ? s.t0 + d / s.v0 : Infinity
  const disc = s.v0 * s.v0 + 2 * s.a * d
  if (disc < 0) return Infinity
  const r = Math.sqrt(disc), ts = [(-s.v0 + r) / s.a, (-s.v0 - r) / s.a].filter(q => q > 1e-9).sort((p, q) => p - q)
  if (!ts.length) return Infinity
  // 减速的一段：停下以后就不再动了
  const stop = s.v0 !== 0 && Math.sign(s.a) !== Math.sign(s.v0) ? Math.abs(s.v0 / s.a) : Infinity
  return ts[0] <= stop + 1e-9 ? s.t0 + ts[0] : Infinity
}
/** 从静止匀加速 T 秒，到 x 处速度正好是 v（出手之前被推着走的那一段） */
const shove = (x: number, v: number, T: number): Seg => ({ t0: 0, x0: x - v * T / 2, v0: 0, a: v / T })
const rest = (t0: number, x0: number): Seg => ({ t0, x0, v0: 0, a: 0 })
/** 在 t0 时刻以速度 v 撞上软垫，d 米之内匀减速停住 */
const brake = (t0: number, x0: number, v: number, d: number): Seg => ({ t0, x0, v0: v, a: -Math.sign(v) * v * v / (2 * d) })

/** 一维碰撞：恢复系数 e（1 弹性，0 完全非弹性），返回碰后两个速度 */
export function collide(m1: number, v1: number, m2: number, v2: number, e: number) {
  const vc = (m1 * v1 + m2 * v2) / (m1 + m2), rel = v1 - v2
  return { v1: vc - e * m2 * rel / (m1 + m2), v2: vc + e * m1 * rel / (m1 + m2) }
}
/** 恢复系数：分离速度 ÷ 接近速度 */
export const restitution = (v1: number, v2: number, u1: number, u2: number) => (u2 - u1) / (v1 - v2)

// ---------- 第 1 课 动量：冰面上击出冰球、推出冰壶 ----------
export const PUCK = { m: 0.16, r: 0.038, h: 0.025 }     // 冰球：约 160 g，直径 7.6 cm，厚 2.5 cm
export const STONE = { m: 20, r: 0.145, h: 0.115 }      // 冰壶：约 20 kg，直径 29 cm
export const SHOTS = {
  slow:  { name: '冰球 · 5 m/s',  body: 'puck',  v: 5,   back: 0 },
  fast:  { name: '冰球 · 10 m/s', body: 'puck',  v: 10,  back: 0 },
  stone: { name: '冰壶 · 0.5 m/s', body: 'stone', v: 0.5, back: 0 },
  wall:  { name: '冰球撞板墙',     body: 'puck',  v: 10,  back: 8 },
} as const
export type ShotKey = keyof typeof SHOTS
/** 出手用多长时间、球门线、板墙、挡块各离出手点多远（m） */
export const SHOT = { T: 0.2, goal: 2.3, wall: 3.52, pad: 1.3 }
export const shotM = (k: ShotKey) => SHOTS[k].body === 'puck' ? PUCK.m : STONE.m
export const shotP = (k: ShotKey) => momentum(shotM(k), SHOTS[k].v)
/** 撞板墙前后动量的变化 Δp = p′ − p（反弹回来，p′ 是负的） */
export const wallDp = () => momentum(PUCK.m, -SHOTS.wall.back) - momentum(PUCK.m, SHOTS.wall.v)
/** 一次击球的全过程：出手点是 x = 0。tHit 是撞板墙的时刻（不撞板墙的没有），tRec 是可以记录的时刻 */
export function shotPlan(k: ShotKey) {
  const s = SHOTS[k], segs: Seg[] = [shove(0, s.v, SHOT.T), { t0: SHOT.T, x0: 0, v0: s.v, a: 0 }]
  if (k === 'wall') {
    const tHit = SHOT.T + SHOT.wall / s.v, tBack = tHit + (SHOT.wall - 0.2) / s.back
    segs.push({ t0: tHit, x0: SHOT.wall, v0: -s.back, a: 0 }, rest(tBack, 0.2))
    return { segs, tHit, tRec: tBack + 0.3 }
  }
  const stop = k === 'stone' ? SHOT.pad : SHOT.goal, t = SHOT.T + stop / s.v
  segs.push(brake(t, stop, s.v, k === 'stone' ? 0.04 : 0.35))
  return { segs, tHit: null, tRec: t + 0.5 }
}

// ---------- 第 2 课 冲量和动量定理：鸡蛋落在钢板和海绵上 ----------
export const EGG = { m: 0.05 }
/** h 下落的高度（m）；dt 从碰到到停住的时间（s，示意值）；thick 垫子的厚度（m） */
export const DROPS = {
  steel: { name: '钢板',          h: 0.4, dt: 0.002, thick: 0,    broken: true },
  thin:  { name: '薄海绵',        h: 0.4, dt: 0.01,  thick: 0.03, broken: false },
  thick: { name: '厚海绵',        h: 0.4, dt: 0.05,  thick: 0.12, broken: false },
  high:  { name: '厚海绵 · 0.9 m', h: 0.9, dt: 0.04,  thick: 0.12, broken: false },
} as const
export type DropKey = keyof typeof DROPS
/** 自由下落 h 以后的速度、用的时间 */
export const fallSpeed = (h: number) => Math.sqrt(2 * G * h)
export const fallTime = (h: number) => Math.sqrt(2 * h / G)
/** 自由下落 t 秒：落下了多少、速度多大 */
export const fallAt = (t: number) => ({ y: 0.5 * G * t * t, v: G * t })
/** 冲量 I = Ft */
export const impulse = (F: number, t: number) => F * t
/** 动量定理：(F − mg)Δt = mv，求垫子对鸡蛋的平均作用力 F */
export const avgForce = (m: number, v: number, dt: number) => m * v / dt + m * G
/** 一次下落的全部读数 */
export function drop(k: DropKey) {
  const d = DROPS[k], v = fallSpeed(d.h), p = momentum(EGG.m, v), F = avgForce(EGG.m, v, d.dt)
  return { v, p, F, dt: d.dt, t: fallTime(d.h), sink: Math.min(v * d.dt / 2, d.thick * 0.85), I: impulse(F - EGG.m * G, d.dt) }
}

// ---------- 第 3 课 动量守恒定律：气垫导轨上两只滑块，光电门测速 ----------
/** 滑块 0.2 kg，配重片 0.1 kg；gap 是两只滑块碰上时中心相距多远；flag 是遮光条的宽度 */
export const GLIDER = { m: 0.2, add: 0.1, len: 0.12, gap: 0.15, flag: 0.01 }
/** 导轨上的位置（m，导轨中点是 0）：两个光电门、两只滑块的起点、导轨两端的挡板 */
export const TRACK = { len: 1.5, gateA: -0.32, gateB: 0.32, startA: -0.56, restB: 0.06, startB: 0.56, end: 0.66, T: 0.4 }
/** drag：气量不足时滑块受阻力而产生的减速度（m/s²，示意值） */
export const BUMPS = {
  same:  { name: '质量相等',   m1: 0.2, m2: 0.2, v1: 0.5, v2: 0,    drag: 0 },
  heavy: { name: '左边加配重', m1: 0.3, m2: 0.2, v1: 0.5, v2: 0,    drag: 0 },
  head:  { name: '相向运动',   m1: 0.2, m2: 0.2, v1: 0.4, v2: -0.4, drag: 0 },
  drag:  { name: '气量不足',   m1: 0.2, m2: 0.2, v1: 0.5, v2: 0,    drag: 0.1 },
} as const
export type BumpKey = keyof typeof BUMPS
/** 光电门的一次读数：哪个门、哪只滑块、碰前还是碰后、遮光时间（ms）和算出来的速度（带方向） */
export interface Gate { t: number; gate: 'A' | 'B'; who: 1 | 2; after: boolean; ms: number; v: number }
const free = (t0: number, x0: number, v0: number, drag: number): Seg => ({ t0, x0, v0, a: v0 === 0 ? 0 : -Math.sign(v0) * drag })
/** 一次碰撞的全过程：两只滑块各自的分段运动、相碰的时刻、光电门的各次读数、按读数算出来的碰前碰后动量 */
export function bumpPlan(k: BumpKey) {
  const c = BUMPS[k], T = TRACK.T
  const a: Seg[] = [shove(TRACK.startA, c.v1, T), free(T, TRACK.startA, c.v1, c.drag)]
  const b: Seg[] = c.v2 !== 0 ? [shove(TRACK.startB, c.v2, T), free(T, TRACK.startB, c.v2, c.drag)] : [rest(0, TRACK.restB)]
  const tHit = c.v2 === 0 ? hitTime(a[1], TRACK.restB - GLIDER.gap) : T + (TRACK.startB - TRACK.startA - GLIDER.gap) / (c.v1 - c.v2)
  const A = pathAt(a, tHit), B = pathAt(b, tHit), out = collide(c.m1, A.v, c.m2, B.v, 1)
  const u1 = Math.abs(out.v1) < 1e-9 ? 0 : out.v1, u2 = Math.abs(out.v2) < 1e-9 ? 0 : out.v2
  const a2 = free(tHit, A.x, u1, c.drag), b2 = free(tHit, B.x, u2, c.drag)
  a.push(a2); b.push(b2)
  // 滑到导轨两头，被挡板上的泡棉接住
  const stopA = u1 > 0 ? TRACK.end - GLIDER.gap : -TRACK.end, stopB = u2 > 0 ? TRACK.end : -TRACK.end + GLIDER.gap
  const tA = u1 !== 0 ? hitTime(a2, stopA) : Infinity, tB = u2 !== 0 ? hitTime(b2, stopB) : Infinity
  if (isFinite(tA)) a.push(rest(tA, stopA)); if (isFinite(tB)) b.push(rest(tB, stopB))
  const gates: Gate[] = []
  const read = (seg: Seg, x: number, gate: 'A' | 'B', who: 1 | 2, after: boolean, until = Infinity) => {
    const t = hitTime(seg, x); if (!isFinite(t) || t > until) return
    const v = segAt(seg, t).v; if (Math.abs(v) < 1e-6) return
    gates.push({ t, gate, who, after, ms: GLIDER.flag / Math.abs(v) * 1000, v })
  }
  read(a[1], TRACK.gateA, 'A', 1, false, tHit)
  if (c.v2 !== 0) read(b[1], TRACK.gateB, 'B', 2, false, tHit)
  if (u1 !== 0) read(a2, u1 > 0 ? TRACK.gateB : TRACK.gateA, u1 > 0 ? 'B' : 'A', 1, true, tA)
  if (u2 !== 0) read(b2, u2 > 0 ? TRACK.gateB : TRACK.gateA, u2 > 0 ? 'B' : 'A', 2, true, tB)
  gates.sort((p, q) => p.t - q.t)
  const got = (who: 1 | 2, after: boolean) => gates.find(g => g.who === who && g.after === after)?.v ?? 0
  const v1 = got(1, false), v2 = got(2, false), w1 = got(1, true), w2 = got(2, true)
  return {
    a, b, tHit, gates, tRec: Math.max(tHit, ...gates.map(g => g.t)) + 0.6, v1, v2, w1, w2,
    p0: momentum(c.m1, v1) + momentum(c.m2, v2), p1: momentum(c.m1, w1) + momentum(c.m2, w2),
  }
}

// ---------- 第 4 课 弹性碰撞和非弹性碰撞：冰面上两只冰壶 ----------
export const CLASH = { v: 1, startA: -0.8, startB: 0.8, gap: 0.33, T: 0.4, pad: 1.15 }
export const CLASHES = {
  elastic: { name: '弹性碰撞',   e: 1,   v2: 0 },
  partial: { name: '非弹性碰撞', e: 0.5, v2: 0 },
  stick:   { name: '粘在一起',   e: 0,   v2: 0 },
  head:    { name: '对撞后粘住', e: 0,   v2: -1 },
} as const
export type ClashKey = keyof typeof CLASHES
export function clashPlan(k: ClashKey) {
  const c = CLASHES[k], m = STONE.m, T = CLASH.T
  const a: Seg[] = [shove(CLASH.startA, CLASH.v, T), { t0: T, x0: CLASH.startA, v0: CLASH.v, a: 0 }]
  const b: Seg[] = c.v2 !== 0 ? [shove(CLASH.startB, c.v2, T), { t0: T, x0: CLASH.startB, v0: c.v2, a: 0 }] : [rest(0, 0)]
  const tHit = c.v2 === 0 ? hitTime(a[1], -CLASH.gap) : T + (CLASH.startB - CLASH.startA - CLASH.gap) / (CLASH.v - c.v2)
  const A = pathAt(a, tHit), B = pathAt(b, tHit), out = collide(m, A.v, m, B.v, c.e)
  const u1 = Math.abs(out.v1) < 1e-9 ? 0 : out.v1, u2 = Math.abs(out.v2) < 1e-9 ? 0 : out.v2
  const a2: Seg = { t0: tHit, x0: A.x, v0: u1, a: 0 }, b2: Seg = { t0: tHit, x0: B.x, v0: u2, a: 0 }
  a.push(a2); b.push(b2)
  // 滑到前面的泡棉垫就停住；后面的一只最多跟到前一只身后
  const tB = u2 > 0 ? hitTime(b2, CLASH.pad) : Infinity; if (isFinite(tB)) b.push(rest(tB, CLASH.pad))
  const tA = u1 > 0 ? hitTime(a2, CLASH.pad - CLASH.gap) : Infinity; if (isFinite(tA)) a.push(rest(tA, CLASH.pad - CLASH.gap))
  const ek0 = kinetic(m, A.v) + kinetic(m, B.v), ek1 = kinetic(m, u1) + kinetic(m, u2)
  return { a, b, tHit, tRec: tHit + 1.6, v1: A.v, v2: B.v, w1: u1, w2: u2, p0: momentum(m, A.v) + momentum(m, B.v), p1: momentum(m, u1) + momentum(m, u2), ek0, ek1, loss: ek0 - ek1 }
}

// ---------- 第 5 课 弹性碰撞的规律：牛顿摆 ----------
/** 五颗钢球，每颗 44 g、直径 22 mm；摆线从悬点到球心 12 cm；拉起 30° */
export const CRADLE = { n: 5, m: 0.044, d: 0.022, L: 0.12, deg: 30 }
/** 摆球从 deg 角摆到最低点的速度（机械能守恒） */
export const swingSpeed = (L = CRADLE.L, deg = CRADLE.deg) => Math.sqrt(2 * G * L * (1 - Math.cos(deg * Math.PI / 180)))
/** 摆动的周期（按小角度算，画面用） */
export const swingPeriod = (L = CRADLE.L) => 2 * Math.PI * Math.sqrt(L / G)
/** 质量相等的两物体发生弹性正碰：碰后的两个速度（质量相等时交换速度） */
export const elastic = (m1: number, v1: number, m2: number, v2 = 0) => collide(m1, v1, m2, v2, 1)
/**
 * nIn 颗球以速度 v 撞进来，假如另一头弹出 nOut 颗：动量守恒要求它们的速度是 nIn·v / nOut，
 * 这时动能是原来的 nIn / nOut 倍。只有 nOut = nIn 才两样都守恒。
 */
export function cradleTry(nIn: number, nOut: number, v = swingSpeed()) {
  const u = nIn * v / nOut, ek0 = nIn * kinetic(CRADLE.m, v), ek1 = nOut * kinetic(CRADLE.m, u)
  return { u, p: nIn * momentum(CRADLE.m, v), ek0, ek1, ok: Math.abs(ek1 - ek0) < 1e-12 }
}
/** t 时刻各颗球的摆角（弧度，向左为负）：松手时左边 n 颗在 −30°；到最低点时右边 n 颗接着摆出去 */
export function cradleAngles(n: number, t: number) {
  const th = CRADLE.deg * Math.PI / 180, c = Math.cos(2 * Math.PI * t / swingPeriod())
  const left = -th * Math.max(c, 0), right = th * Math.max(-c, 0)
  return Array.from({ length: CRADLE.n }, (_, i) => (i < n ? left : 0) + (i >= CRADLE.n - n ? right : 0))
}

// ---------- 第 6 课 反冲：冰面上的喷水滑车 ----------
/** 滑车连空瓶 2 kg；水相对冰面向后喷出的平均速度 8 m/s（简化：把喷水当成一次喷完）；T 喷水用的时间；光电门和泡棉垫离起点多远 */
export const JET = { sled: 2, u: 8, T: 0.6, gate: 0.75, pad: 1.5, flag: 0.05 }
export const JETS = {
  half:   { name: '水 0.25 kg',           water: 0.25, load: 0 },
  full:   { name: '水 0.5 kg',            water: 0.5,  load: 0 },
  loaded: { name: '水 0.5 kg · 加配重 2 kg', water: 0.5,  load: 2 },
} as const
export type JetKey = keyof typeof JETS
/** 反冲：原来静止，喷出质量 mOut、速度 u 的物质以后，剩下质量 M 的部分得到的速度 */
export const recoil = (mOut: number, u: number, M: number) => mOut * u / M
export function jetPlan(k: JetKey) {
  const j = JETS[k], M = JET.sled + j.load, v = recoil(j.water, JET.u, M)
  const go: Seg = { t0: JET.T, x0: v * JET.T / 2, v0: v, a: 0 }, tGate = hitTime(go, JET.gate), tPad = hitTime(go, JET.pad)
  return { M, v, segs: [{ t0: 0, x0: 0, v0: 0, a: v / JET.T }, go, brake(tPad, JET.pad, v, 0.2)] as Seg[], tGate, ms: JET.flag / v * 1000, tRec: tGate + 0.5, pWater: -momentum(j.water, JET.u), pSled: momentum(M, v) }
}

// ---------- 第 7 课 火箭的推力：发动机试车台 ----------
/** rate 每秒喷出燃气的质量（kg/s）；u 燃气喷出的速度（m/s） */
export const BURNS = {
  a: { name: '100 kg/s · 2500 m/s', rate: 100, u: 2500 },
  b: { name: '200 kg/s · 2500 m/s', rate: 200, u: 2500 },
  c: { name: '200 kg/s · 3000 m/s', rate: 200, u: 3000 },
} as const
export type BurnKey = keyof typeof BURNS
/** 一次试车点火多久（s）；拿来比较的箭体质量（kg） */
export const BURN = { t: 10, rocket: 10000 }
/** 推力：对喷出的燃气用动量定理，F·Δt = Δm·u，所以 F = (Δm/Δt)·u */
export const thrust = (rate: number, u: number) => rate * u
/** 这么大的冲量能让质量 M 的箭体增加多少速度（不计重力和质量的减少） */
export const boost = (I: number, M: number) => I / M
export function burn(k: BurnKey) {
  const b = BURNS[k], F = thrust(b.rate, b.u), I = impulse(F, BURN.t)
  return { F, I, gas: b.rate * BURN.t, dv: boost(I, BURN.rocket) }
}

// ---------- 拓展：弹开、长板和小车、斜碰 ----------
/** 弹开（爆炸）：两物体原来静止，中间的弹簧放出能量 E，各自得到的速度大小 */
export function burst(m1: number, m2: number, E: number) {
  return { v1: Math.sqrt(2 * E * m2 / (m1 * (m1 + m2))), v2: Math.sqrt(2 * E * m1 / (m2 * (m1 + m2))) }
}
export const BURST = { E: 4.8, light: 10, gap: 0.42, pad: 1.0, T: 0.15 }
/** 弹开的全过程：A 向左、B 向右；弹簧在 T 秒里把它们推到各自的速度，滑到泡棉垫停住 */
export function burstPlan(light: boolean) {
  const m1 = STONE.m, m2 = light ? BURST.light : STONE.m, { v1, v2 } = burst(m1, m2, BURST.E), T = BURST.T, g = BURST.gap / 2
  const side = (dir: 1 | -1, v: number): Seg[] => {
    const go: Seg = { t0: T, x0: dir * (g + v * T / 2), v0: dir * v, a: 0 }
    return [{ t0: 0, x0: dir * g, v0: 0, a: dir * v / T }, go, rest(hitTime(go, dir * BURST.pad), dir * BURST.pad)]
  }
  return { m1, m2, v1, v2, a: side(-1, v1), b: side(1, v2), tRec: T + 1.5 }
}
/** 长板和小车（“人船模型”）：小车在板上从一头开到另一头（相对板走了 d），板后退多少、小车相对冰面前进多少 */
export function boat(m: number, M: number, d: number) { const back = m * d / (m + M); return { back, fwd: d - back } }
export const BOAT = { M: 4, L: 2, d: 1.7, light: 1, heavy: 2, vRel: 0.5 }
/** t 时刻长板和小车相对冰面的位置（板的中点一开始在 0）；小车相对板先慢后快再慢地走完 d */
export function boatAt(m: number, t: number) {
  const k = Math.min(1, Math.max(0, t * BOAT.vRel / BOAT.d)), s = BOAT.d * k * k * (3 - 2 * k), board = -boat(m, BOAT.M, s).back
  return { s, board, car: board - BOAT.d / 2 + s, T: BOAT.d / BOAT.vRel }
}
/** 斜碰：质量相等的冰球，一动一静，弹性碰撞。deg 是被撞的球飞出去的方向和原来速度方向的夹角，两球碰后互相垂直 */
export function glance(v: number, deg: number) {
  const a = deg * Math.PI / 180
  return { v2: v * Math.cos(a), a2: -deg, v1: v * Math.sin(a), a1: deg === 0 ? 0 : 90 - deg }
}
export const GLANCE = { v: 2, deg: 30, run: 1.1, T: 0.3, start: -0.85 }
/**
 * 斜碰的全过程，在冰面上看（x 向右，z 朝镜头）：B 静止在原点，A 从左边以速度 v 沿 x 方向过来。
 * side 为真是斜碰：B 朝偏向镜头 30° 的方向飞出，A 朝另一侧 60° 的方向走；两球各滑出 run 米后被围栏挡住。radius：画面上球的半径（放大了画时相碰的位置跟着变）。
 */
export function glancePlan(side: boolean, radius = PUCK.r) {
  const deg = side ? GLANCE.deg : 0, g = glance(GLANCE.v, deg), r = Math.PI / 180, d = 2 * radius
  const lane = -d * Math.sin(deg * r), xHit = -d * Math.cos(deg * r), tHit = GLANCE.T + (xHit - GLANCE.start) / GLANCE.v
  const push = shove(GLANCE.start, GLANCE.v, GLANCE.T)
  const ua: [number, number] = [g.v1 * Math.cos(g.a1 * r), -g.v1 * Math.sin(g.a1 * r)], ub: [number, number] = [g.v2 * Math.cos(deg * r), g.v2 * Math.sin(deg * r)]
  const fly = (x0: number, z0: number, u: [number, number], t: number) => { const sp = Math.hypot(u[0], u[1]), dt = sp > 0 ? Math.min(t - tHit, GLANCE.run / sp) : 0; return { x: x0 + u[0] * dt, z: z0 + u[1] * dt, vx: sp > 0 && t - tHit < GLANCE.run / sp ? u[0] : 0, vz: sp > 0 && t - tHit < GLANCE.run / sp ? u[1] : 0 } }
  const at = (t: number) => {
    if (t < tHit) { const q = t < GLANCE.T ? segAt(push, t) : { x: GLANCE.start + GLANCE.v * (t - GLANCE.T), v: GLANCE.v }; return { a: { x: q.x, z: lane, vx: q.v, vz: 0 }, b: { x: 0, z: 0, vx: 0, vz: 0 } } }
    return { a: fly(xHit, lane, ua, t), b: fly(0, 0, ub, t) }
  }
  return { ...g, ua, ub, tHit, tRec: tHit + 1.1, at }
}
