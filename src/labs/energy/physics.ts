// 功和机械能实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 物理量一律用国际单位；场景单位 1 = 1 m。取值约定写在规格卡 docs/specs/energy.md 里。
export const G = 9.8 // N/kg

/** 功 W = F s（J）：s 是物体在力的方向上移动的距离 */
export const work = (F: number, s: number) => F * s
/** 功率 P = W ÷ t（W） */
export const power = (W: number, t: number) => W / t
/** 重力（N） */
export const weight = (m: number) => m * G
/** 显示用：保留 d 位小数 */
export const fmt = (x: number, d = 0) => x.toFixed(d)

// ---------- 第 1 课：叉车做没做功 ----------
/** 货箱 200 kg。F：这一种情形里要看的那个力；moved：货箱实际移动的距离；along：在这个力的方向上移动的距离 */
export const CRATE = { mass: 200 }
export const CASES = {
  lift: { name: '举高', force: '举力', F: weight(CRATE.mass), moved: 2, along: 2, why: '举力向上，货箱向上移动了 2 m' },
  wall: { name: '顶墙', force: '推力', F: 3000, moved: 0, along: 0, why: '有推力，墙没有动：移动的距离是 0' },
  carry: { name: '端着平移', force: '举力', F: weight(CRATE.mass), moved: 3, along: 0, why: '举力向上，货箱是水平移动的：在力的方向上没有移动' },
  coast: { name: '松油门滑行', force: '牵引力', F: 0, moved: 2, along: 2, why: '叉车靠惯性滑了 2 m，这一段没有牵引力' },
} as const
export type CaseKey = keyof typeof CASES
export const caseWork = (k: CaseKey) => work(CASES[k].F, CASES[k].along)

// ---------- 第 2 课：推售货车，算功 ----------
export const PUSH = { forces: { small: 100, big: 200 }, dists: [2, 4] } as const
export type ForceKey = keyof typeof PUSH.forces
export const pushWork = (f: ForceKey, s: number) => work(PUSH.forces[f], s)

// ---------- 第 3 课：两台升降机，比功率 ----------
/** 两台升降机都把货物匀速升 6 m：快的每秒 1.5 m，慢的每秒 0.5 m */
export const HOIST = { h: 6, speed: { fast: 1.5, slow: 0.5 }, loads: { heavy: 200, light: 100 } } as const
export type HoistKey = keyof typeof HOIST.speed
export type LoadKey = keyof typeof HOIST.loads
export function hoist(which: HoistKey, load: LoadKey) {
  const W = work(weight(HOIST.loads[load]), HOIST.h), t = HOIST.h / HOIST.speed[which]
  return { W, t, P: power(W, t) }
}

// ---------- 第 4 课：斜面小球撞木块 ----------
/**
 * 钢球从斜面上高 h 处由静止滚下，撞上水平面上的木块，木块滑行一段距离停下。
 * 简化：球到底端时的动能（等于它在高处的重力势能 m g h）有一半交给木块，木块受的滑动摩擦力是 0.49 N，
 * 滑行距离 s = 0.5 m g h ÷ f。真实实验里的数不会这么整齐，只用来比较“谁撞得远”。
 */
export const RAMP = { balls: { small: 0.1, big: 0.2 }, heights: { low: 0.1, high: 0.2 }, share: 0.5, friction: 0.49 } as const
export type BallKey = keyof typeof RAMP.balls
export type HeightKey = keyof typeof RAMP.heights
/** 木块滑行的距离（m） */
export const slide = (ball: BallKey, h: HeightKey) => RAMP.share * RAMP.balls[ball] * G * RAMP.heights[h] / RAMP.friction

// ---------- 第 5 课：落锤和弹射器 ----------
/** 落锤砸木桩：桩在沙里受的阻力按 1960 N 算，砸进去的深度 d = m g h ÷ 阻力（m） */
export const HAMMER = { masses: { light: 20, heavy: 40 }, heights: { low: 0.5, high: 1 }, resist: 1960 } as const
export type MassKey = keyof typeof HAMMER.masses
export type DropKey = keyof typeof HAMMER.heights
export const sink = (m: MassKey, h: DropKey) => weight(HAMMER.masses[m]) * HAMMER.heights[h] / HAMMER.resist
/** 弹射器：弹簧劲度系数 392 N/m，小球 0.1 kg。压缩 x 后松手，小球升高 H = ½ k x² ÷ (m g)（不计摩擦） */
export const SPRING = { k: 392, ball: 0.1, press: { low: 0.05, high: 0.1 } } as const
export const springRise = (p: DropKey) => 0.5 * SPRING.k * SPRING.press[p] ** 2 / weight(SPRING.ball)

// ---------- 第 6 课：过山车 ----------
/** 列车 500 kg；高度从谷底算起：第一个坡顶 20 m，谷底 0，第二个坡顶 12 m。不计摩擦和空气阻力 */
export const COASTER = { mass: 500, top: 20, valley: 0, hill: 12 } as const
/** 列车在高 h 处的重力势能、动能、机械能（J）和速度（m/s）：从坡顶由静止放下，机械能不变 */
export function coasterAt(h: number) {
  const E = weight(COASTER.mass) * COASTER.top, Ep = weight(COASTER.mass) * Math.min(COASTER.top, Math.max(0, h)), Ek = E - Ep
  return { E, Ep, Ek, v: Math.sqrt(2 * Ek / COASTER.mass) }
}
/** 链条拉着列车慢慢上坡时（速度很小，动能按 0 算）：高 h 处的重力势能就是这时的机械能 */
export function liftAt(h: number) { const Ep = weight(COASTER.mass) * Math.max(0, h); return { E: Ep, Ep, Ek: 0, v: 0 } }
/** 链条把列车从站台（高 2 m）拉到坡顶做的功（J） */
export const COASTER_STATION = 2
export const liftWork = () => work(weight(COASTER.mass), COASTER.top - COASTER_STATION)

// ---------- 第 7 课：海盗船 ----------
/** 船 2000 kg，从比最低点高 4 m 处松手。有阻力时，每摆到另一头，能到的高度是上一次的 0.9（示意） */
export const SHIP = { mass: 2000, h0: 4, keep: 0.9, arm: 11, half: 3 } as const
export type DragKey = 'none' | 'drag'
/** 第 n 次摆到头时的高度（m），n = 0 是松手的地方 */
export const swingHeight = (mode: DragKey, n: number) => SHIP.h0 * (mode === 'drag' ? SHIP.keep ** n : 1)
/** 这时的机械能（J）：在最高点速度是 0，机械能就是重力势能 */
export const swingEnergy = (mode: DragKey, n: number) => weight(SHIP.mass) * swingHeight(mode, n)
/** 高度 h 对应的摆角（弧度）：h = L (1 − cos θ) */
export const swingAngle = (h: number) => Math.acos(1 - h / SHIP.arm)
/** 摆角是 a 时，船比最低点高多少（m） */
export const shipHeight = (a: number) => SHIP.arm * (1 - Math.cos(a))
/** 松手后 t 秒时船的摆角：每半个来回用 SHIP.half 秒，这半程的幅度从上一头的高度过渡到下一头的高度 */
export function shipAt(mode: DragKey, t: number) {
  const n = Math.floor(t / SHIP.half), u = t / SHIP.half - n
  const a0 = swingAngle(swingHeight(mode, n)), a1 = swingAngle(swingHeight(mode, n + 1))
  const amp = a0 + (a1 - a0) * u, sign = n % 2 === 0 ? 1 : -1
  return { angle: sign * amp * Math.cos(Math.PI * u), n }
}

// ---------- 拓展：蹦极 ----------
/** 假人 60 kg，从 30 m 高的跳台落下；绳原长 10 m；最低点比跳台低 25 m。不计空气阻力和绳的质量 */
export const BUNGEE = { mass: 60, top: 30, rope: 10, fall: 25 } as const
/** 绳的劲度系数：最低点动能为 0，减少的重力势能全部变成弹性势能 */
export const bungeeK = () => 2 * weight(BUNGEE.mass) * BUNGEE.fall / (BUNGEE.fall - BUNGEE.rope) ** 2
/** 落下 d 米时：减少的重力势能、动能、弹性势能（J）、速度（m/s） */
export function bungeeAt(d: number) {
  const x = Math.max(0, d - BUNGEE.rope), lost = weight(BUNGEE.mass) * d, Es = 0.5 * bungeeK() * x * x, Ek = Math.max(0, lost - Es)
  return { lost, Es, Ek, v: Math.sqrt(2 * Ek / BUNGEE.mass), total: weight(BUNGEE.mass) * BUNGEE.fall }
}
/** 速度最大的位置：绳的拉力等于重力，落下了多少米 */
export const bungeeFastest = () => BUNGEE.rope + weight(BUNGEE.mass) / bungeeK()

// ---------- 拓展：滚摆 ----------
/** 滚摆从 0.4 m 高处松手，一边转一边往下落；下落和上升都按 0.2 m/s² 的匀变速算（示意），一趟 2 s */
export const WHEEL = { h: 0.4, a: 0.2 } as const
export const wheelTrip = () => Math.sqrt(2 * WHEEL.h / WHEEL.a)
/** 松手后 t 秒时滚摆的高度（m）和动能占机械能的比例 */
export function wheelAt(t: number) {
  const T = wheelTrip(), u = t % (2 * T), d = u < T ? 0.5 * WHEEL.a * u * u : 0.5 * WHEEL.a * (2 * T - u) ** 2
  return { h: WHEEL.h - d, kinetic: d / WHEEL.h }
}
