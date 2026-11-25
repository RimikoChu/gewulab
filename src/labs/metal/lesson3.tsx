// 金属和炼铁 · 第 3 课 金属和酸：化验台第 3 格，试管架上四支试管各盛约 3 mL 稀盐酸。依次放进镁条、锌粒、铁片、铜片，比较冒泡的快慢：
// 镁那支气泡翻滚、镁条很快变小；锌那支持续冒泡；铁那支冒得慢，溶液渐渐变浅绿；铜那支没有气泡。
// 再把一支小试管倒扣在锌那支的管口收集氢气，移到酒精灯火焰上点燃：轻微的爆鸣，一闪淡蓝色的火焰。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { Metal, useTasks, type Label } from '@/lab-kit'
import { AlcoholLamp, Glove, LAMP_TOP, ReagentBottle, SOL, TUBE, TestTube, TubeRack, mixSol, tubeIn } from './gear'
import { Bubbles, Flame, Glow } from './fx'
import { LESSONS, goLesson } from './lessons'
import { ease, lerp, liftPath, seg, useRun, type P3 } from './parts'
import { ACID, ACID_METALS, ZN_GRAMS, fmtG, h2Mass, type AcidMetal } from './physics'
import { BZ, M, ST, TOP, Place, spot, type V3 } from './world'

const X0 = ST.l3, Y = TOP, Z = BZ + 0.15
const at = (x: number, y = 0, z = 0): V3 => [X0 + x * M, Y + y * M, Z + z * M]
const GAP = 0.04, RACK_Y = 0.07 - 0.004, FILL = 0.035
const tubeX = (i: number) => (i - 1.5) * GAP
const VIEW = spot(X0 + 0.02 * M, Y + 0.12 * M, Z, 2.05, 1.25, [-0.14, 0.17], true)
/** 时间轴（s）：四种金属依次落进管里；落完以后再看一会儿 */
const DROP = (i: number) => 0.4 + i * 0.9
const ADD_SEC = 4.6, WATCH_SEC = 6
const COLLECT = { take: [0, 1.6], hold: [1.4, 3.6], go: [3.6, 5.2], pop: 5.6, end: 7.2 } as const
const LAMP: P3 = at(0.16, 0, 0.02)
const TASKS: Task[] = [
  { id: 'add', text: '把四种金属分别放进稀盐酸', note: '镁、锌、铁的表面冒出气泡，铜的表面没有' },
  { id: 'compare', text: '比较冒泡的快慢', note: '镁最剧烈，锌次之，铁较慢，铜不反应' },
  { id: 'fire', text: '收集锌那支的气体，点燃', note: '发出轻微的爆鸣声，产生淡蓝色火焰：生成的是氢气' },
]

export default function Lesson3() {
  const T = useTasks('gewu:metal:3', TASKS)
  const watch = useRun(WATCH_SEC, () => T.check(id => id === 'compare'))
  const add = useRun(ADD_SEC, () => { T.check(id => id === 'add'); watch.run() })
  const fire = useRun(COLLECT.end, () => T.check(id => id === 'fire'))
  const resetAll = () => { add.snap(0); watch.snap(0); fire.snap(0); T.reset() }
  const added = !!T.done.add || add.busy || watch.busy
  // 反应进行了多久（放进去以后）：画面上的变化都由它推
  const since = (i: number) => T.done.add ? 99 : add.busy ? Math.max(0, add.t - DROP(i) - 0.5) : watch.busy ? ADD_SEC - DROP(i) - 0.5 + watch.t : 0
  const inTube = (i: number) => T.done.add || (add.busy && add.t > DROP(i) + 0.45) || watch.busy
  const showTags = !!T.done.add || (watch.busy && watch.t > 2)
  const task = T.current?.id

  // 收集氢气：一支小试管从左边拿过来，倒扣在锌那支的管口上方，再移到酒精灯火焰上
  const ft = fire.t, zx = tubeX(1)
  // 小试管的原点在管底：倒扣时管底朝上，所以原点要比管口再高一根管长
  const mouth: P3 = at(zx, RACK_Y + TUBE.h * 2 + 0.006, 0)
  const rest: P3 = at(-0.17, 0, -0.03), overLamp: P3 = at(0.16, LAMP_TOP + 0.045 + TUBE.h, 0.02)
  const popAt: V3 = [overLamp[0], overLamp[1] - TUBE.h * M - 0.004 * M, overLamp[2]]
  const top = at(0, 0.42)[1]
  const small: P3 = !fire.busy ? rest : ft < COLLECT.take[1] ? liftPath(rest, mouth, top, seg(ft, ...COLLECT.take)) : ft < COLLECT.go[0] ? mouth : ft < COLLECT.go[1] ? liftPath(mouth, overLamp, top, seg(ft, ...COLLECT.go)) : overLamp
  const flip = fire.busy ? ease(seg(ft, 0.5, 1.3)) : 0
  const pop = fire.busy ? Math.max(0, 1 - Math.abs(ft - COLLECT.pop) / 0.35) : 0
  const lampOn = fire.busy && ft > COLLECT.hold[0]

  const step = add.busy || watch.busy || fire.busy ? null : !T.done.add ? 'add' : !T.done.fire ? 'fire' : null
  const hint = !task ? '镁、锌、铁能和稀盐酸反应放出氢气，镁最快，铜不反应。'
    : add.busy ? '依次放进镁条、锌粒、铁片、铜片…'
    : watch.busy ? '看四支试管，哪支冒泡最快？…'
    : fire.busy ? (ft < COLLECT.go[0] ? '用小试管倒扣在锌那支的管口，收集气体…' : '把小试管移到火焰上，点燃…')
    : step === 'add' ? '四支试管里都是稀盐酸。分别放进镁、锌、铁、铜'
    : '收集锌那支试管里冒出的气体，靠近火焰点燃'

  const labels: Label[] = [
    ...ACID_METALS.map((k, i) => ({ id: `t${k}`, at: at(tubeX(i), RACK_Y + TUBE.h + 0.012, 0) as V3, ax: 0.5, className: `scene-tag ${showTags && k === 'Mg' ? 'key' : ''} -translate-y-full`, children: <><small>{ACID[k].name}</small>{showTags ? ACID[k].word : added ? '…' : '稀盐酸'}</> })),
    { id: 'n1', at: at(-0.11, 0.1, 0.0), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '稀盐酸' },
    { id: 'n2', at: at(0.16, 0.02, 0.06), ax: 0.5, name: true, className: 'scene-name', children: '酒精灯' },
    ...(pop > 0.2 || T.done.fire ? [{ id: 'k1', at: [popAt[0] + 0.25, popAt[1] + 0.2, popAt[2]] as V3, ax: 0, className: 'scene-tag key -translate-y-1/2', children: <><small>点燃</small>轻微爆鸣，淡蓝色火焰</> }] : []),
  ]
  // 每支管里：金属块的大小（镁会被溶掉一部分）、溶液的颜色、冒泡的速度
  const piece = (k: AcidMetal, i: number) => {
    const s = since(i), shrink = k === 'Mg' ? 1 - 0.55 * Math.min(1, s / 8) : k === 'Zn' ? 1 - 0.12 * Math.min(1, s / 10) : 1
    if (!inTube(i)) {
      // 还没放进去：在管口上方（落下的过程）或者在一旁的表面皿里
      const k0 = add.busy ? seg(add.t, DROP(i), DROP(i) + 0.45) : 0
      const y = k0 > 0 ? lerp(RACK_Y + TUBE.h + 0.03, RACK_Y + 0.006, k0 * k0) : -1
      if (y < 0) return null
      return <group position={at(tubeX(i), y, 0)}>{metalPiece(k, 1)}</group>
    }
    return <group position={at(tubeX(i), RACK_Y + 0.004, 0)}>{metalPiece(k, shrink)}</group>
  }
  return (
    <LabShell title="金属和炼铁" lessons={LESSONS} current="3" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['3'], VOICE)} actionsLabel="金属和酸"
      stage={<Place at={VIEW} labels={labels}>
        <group position={at(0, 0, 0)}><TubeRack n={4} gap={GAP} /></group>
        {ACID_METALS.map((k, i) => {
          const s = since(i), green = k === 'Fe' ? Math.min(1, s / 9) : 0
          const sol = k === 'Fe' ? mixSol(SOL.acid, SOL.fecl2, green) : SOL.acid
          return <group key={k}>
            <group position={at(tubeX(i), RACK_Y, 0)}><TestTube fill={FILL} sol={sol} /></group>
            {piece(k, i)}
            {inTube(i) && ACID[k].rate > 0 && <Bubbles at={at(tubeX(i), RACK_Y + 0.006, 0)} rate={ACID[k].rate * (k === 'Mg' ? 70 : 40) * (k === 'Mg' ? Math.max(0.35, 1 - s / 14) : 1)} r={0.0007 * M * (k === 'Mg' ? 1.2 : 1)} R={tubeIn() * 0.9} top={(FILL - 0.006) * M} src={0.5} seed={i + 1} rise={k === 'Mg' ? 1.6 : 1} />}
          </group>
        })}
        {/* 一旁的试剂瓶 */}
        <group position={at(-0.11, 0, -0.03)}><ReagentBottle label="稀盐酸" sol={SOL.acid} /></group>
        {/* 收集氢气的小试管：倒扣着，手拿住 */}
        <group position={small}>
          {/* 拿起来以后翻过来，管口朝下 */}
          <group rotation-z={Math.PI * flip}><TestTube /></group>
          {fire.busy && <group position={[0.012 * M, -0.07 * M * flip + 0.05 * M * (1 - flip), 0]} rotation={[0, 0, -Math.PI / 2]}><Glove s={0.0055 * M} /></group>}
        </group>
        <group position={LAMP}><AlcoholLamp cap={!lampOn} /></group>
        <Flame at={[LAMP[0], LAMP[1] + LAMP_TOP * M, LAMP[2]]} w={0.03 * M} h={0.065 * M} kind="alcohol" level={lampOn ? 1 : 0} seed={3} />
        <Glow at={popAt} size={0.16 * M} color="#8fb4ff" level={pop} flicker={0.4} />
        <Flame at={[popAt[0], popAt[1] - 0.01 * M, popAt[2]]} w={0.025 * M} h={0.05 * M} kind="h2" level={pop} seed={6} />
      </Place>}
      lesson={<LessonBlock no="3" title="金属和酸" concept="能和酸反应放出氢气的金属更活泼" tasks={TASKS} done={T.done} current={task}
        theory={<>
          <p>镁、锌、铁都能和稀盐酸（或稀硫酸）反应放出<b className="text-white">氢气</b>，但剧烈程度不同：镁最剧烈，锌次之，铁较慢。铜不和稀盐酸反应。</p>
          <p className="mt-3">由此可以判断：<b className="text-white">镁、锌、铁的活动性比铜强</b>；冒泡越快，金属越活泼。</p>
          <p className="mt-3 text-[13.5px] text-white/65">铁和盐酸反应生成的是氯化亚铁（FeCl₂），溶液是浅绿色的。比较活泼程度要看反应的快慢；等质量的金属生成氢气的多少，和活泼程度不是一回事。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[18px] leading-snug font-bold">镁、锌、铁能和稀盐酸反应放出氢气，铜不能</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">冒泡由快到慢：镁 &gt; 锌 &gt; 铁，铜没有气泡。{ZN_GRAMS} g 锌和足量稀盐酸反应生成 {fmtG(h2Mass('Zn', ZN_GRAMS))} g 氢气。</p>
      </>}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">锌和稀盐酸</div>
            <div className="mt-1 font-formula text-[17px]">{ACID.Zn.eq}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="m(Zn)" value={String(ZN_GRAMS)} unit="g · 锌" />
            <ParamTile symbol="m(H₂)" value={T.done.fire ? fmtG(h2Mass('Zn', ZN_GRAMS)) : '—'} unit="g · 生成的氢气" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">四支试管</h2>
          <table className="mt-2 w-full text-[13.5px]">
            <thead><tr className="text-white/55"><th className="pb-1 text-left font-medium" /><th className="pb-1 text-left font-medium">冒泡</th><th className="pb-1 text-right font-medium">1 g 生成氢气</th></tr></thead>
            <tbody>{ACID_METALS.map(k => <tr key={k} className="bg-white/[0.04]"><td className="rounded-l-lg px-2 py-1.5">{ACID[k].name}</td><td className={`py-1.5 ${showTags && k === 'Mg' ? 'font-semibold text-[#7fe3d4]' : ''}`}>{showTags ? ACID[k].word : '—'}</td><td className="rounded-r-lg py-1.5 pr-2 text-right tabular-nums">{T.done.compare ? (k === 'Cu' ? '不反应' : `${fmtG(h2Mass(k, 1))} g`) : '—'}</td></tr>)}</tbody>
          </table>
          {T.done.compare && <p className="mt-2 text-[12.5px] leading-relaxed text-white/55">等质量时铁生成的氢气比锌多，可锌比铁活泼：比活泼看快慢，不看多少。</p>}
        </Panel>
      }
      actions={<>
        <LabButton primary={step === 'add'} pulse={step === 'add'} disabled={step !== 'add'} onClick={() => add.run()}>放入金属</LabButton>
        <LabButton primary={step === 'fire'} pulse={step === 'fire'} disabled={step !== 'fire'} onClick={() => fire.run()}>收集氢气点燃</LabButton>
      </>}
      extras={null}
    />
  )
}

/** 一块金属：镁条（细长的银白条，卷一下）、锌粒（灰色的不规则小块）、铁片（深灰的小片）、铜片（紫红的小片）。原点在底部 */
function metalPiece(k: AcidMetal, s: number) {
  if (k === 'Mg') return <mesh position-y={0.012 * M * s} rotation-z={0.25}><boxGeometry args={[0.003 * M, 0.024 * M * s, 0.0005 * M]} /><Metal kind="aluminum" grain="brushed" rough={0.45} /></mesh>
  if (k === 'Zn') return <group scale={s}>{[[0, 0.003, 0], [0.0025, 0.0075, 0.001], [-0.002, 0.011, -0.001]].map((p, i) => <mesh key={i} position={[p[0] * M, p[1] * M, p[2] * M]} rotation={[i, i * 2, i * 0.5]}><dodecahedronGeometry args={[0.0028 * M, 0]} /><Metal kind="zinc" grain="cast" /></mesh>)}</group>
  return <mesh position-y={0.01 * M} rotation-z={0.15}><boxGeometry args={[0.009 * M, 0.02 * M, 0.0008 * M]} />{k === 'Fe' ? <Metal kind="steel" grain="brushed" rough={0.5} /> : <Metal kind="copper" grain="brushed" />}</mesh>
}
