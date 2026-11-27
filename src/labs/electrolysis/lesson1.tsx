// 电解和金属防护 · 第 1 课 电解氯化铜溶液：化验台最西头的一格。
// 铁架台上夹着一只 U 形管，盛蓝绿色的 CuCl₂ 溶液，两臂各插一根石墨棒，用导线接到直流电源上。
// 接通电源：接负极的石墨棒上覆上一层红色的铜，接正极的冒出黄绿色的气泡；用镊子夹一条湿润的淀粉碘化钾试纸放到阳极管口，试纸变蓝。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useState } from 'react'
import { Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { ButterflyClamp, Glove, IronStand, WatchGlass, u } from './gear'
import { CLIP_TAIL, DCSupply, GraphiteRod, POST, PaperInTweezers, TWEEZER_GRIP, UT, UTube, Wire } from './rig'
import { Bubbles, Puffs } from './fx'
import { LESSONS, goLesson } from './lessons'
import { ease, lerp, mixHex, useClock, useRun } from './parts'
import { paperColor } from './mats'
import { Fin } from './fin'
import { cucl2Yield, electrolyze, paperBlue } from './physics'
import { BZ, ST, TOP, Place, type V3 } from './world'

const X0 = ST.l1, Y = TOP, Z = BZ + 0.5
const p = (x: number, y: number, z: number): V3 => [X0 + u(x), Y + u(y), Z + u(z)]
const UY = 0.04                                   // U 形管底离台面多高
const LEVEL = 0.155, ROD_Y = UY + UT.yc + 0.014, ROD_LEN = 0.2, WET = UY + LEVEL - ROD_Y
const SUPPLY: V3 = [0.23, 0, -0.02], SYAW = -0.3
/** 电源接线柱在台面上的位置（m） */
const post = (k: 'pos' | 'neg'): V3 => { const [x, y, z] = POST[k], c = Math.cos(SYAW), s = Math.sin(SYAW); return [SUPPLY[0] + x * c + z * s, y, SUPPLY[2] - x * s + z * c] }
const REST: V3 = [-0.2, 0.016, 0.09], MOUTH: V3 = [UT.g / 2, UY + UT.H + 0.012, 0.004]
const R = electrolyze('cucl2'), YIELD = cucl2Yield(0.2)
const TASKS: Task[] = [
  { id: 'on', text: '接通直流电源', note: '电流通过 CuCl₂ 溶液，两根石墨棒上都有了变化' },
  { id: 'cu', text: '看接电源负极的石墨棒（阴极）', note: '阴极上覆了一层红色的固体：析出了铜' },
  { id: 'paper', text: '用湿润的淀粉碘化钾试纸检验阳极的气体', note: '试纸变蓝：阳极放出的是氯气' },
]

export default function Lesson1() {
  const [on, setOn] = useState(false)
  const [tested, setTested] = useState(false)
  const T = useTasks('gewu:electrolysis:1', TASKS)
  const clock = useClock()
  const move = useRun(4.2, () => T.check(id => id === 'paper'))
  useEffect(() => { if (on && clock.t > 5) T.check(id => id === 'cu') }, [on, clock.t > 5])   // eslint-disable-line react-hooks/exhaustive-deps
  const start = () => { setOn(true); clock.start(); setTimeout(() => T.check(id => id === 'on'), 900) }
  const test = () => { setTested(true); move.run() }
  const resetAll = () => { setOn(false); setTested(false); clock.stop(); move.snap(0); T.reset() }
  const t = on ? clock.t : 0, coat = Math.min(1, t / 7), fade = Math.min(1, t / 26)
  const task = T.current
  const { hint, next }: { hint: string; next: 'on' | 'paper' | null } = !task ? { hint: 'CuCl₂ 溶液通电后分解成了铜和氯气。', next: null }
    : task.id === 'on' ? (on ? { hint: '电流通过溶液…', next: null } : { hint: '接通直流电源，让电流通过 CuCl₂ 溶液', next: 'on' })
    : task.id === 'cu' ? { hint: '盯住接电源负极的那根石墨棒…', next: null }
    : move.busy ? { hint: '试纸靠近阳极管口…', next: null }
    : { hint: '阳极在冒黄绿色的气泡。把湿润的淀粉碘化钾试纸放到阳极管口', next: 'paper' }

  // 试纸：从表面皿上提起，移到阳极管口上方，慢慢变蓝
  const mk = tested ? ease(Math.min(1, move.t / 2.2)) : 0, blue = tested && paperBlue(R.anode) ? Math.min(1, Math.max(0, (move.t - 2.2) / 1.6)) : 0
  const up = Math.sin(mk * Math.PI) * 0.07
  const paper: V3 = [lerp(REST[0], MOUTH[0], mk), lerp(REST[1], MOUTH[1], mk) + up, lerp(REST[2], MOUTH[2], mk)]
  const look = { color: mixHex('#12a59a', '#7fd0c6', fade), opacity: 0.5 - 0.14 * fade, vivid: true }
  const cat: V3 = [-UT.g / 2, ROD_Y, 0], an: V3 = [UT.g / 2, ROD_Y, 0]
  const tail = (e: V3): V3 => [e[0] + CLIP_TAIL[0], e[1] + ROD_LEN + CLIP_TAIL[1], e[2] + CLIP_TAIL[2]]
  const W = (a: V3) => p(...a)
  const labels: Label[] = [
    { id: 'cat', at: p(-UT.g / 2 - 0.02, ROD_Y + ROD_LEN - 0.01, 0), ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>接负极</small>阴极</> },
    { id: 'an', at: p(UT.g / 2 + 0.02, ROD_Y + ROD_LEN - 0.01, 0), className: 'scene-tag -translate-y-1/2', children: <><small>接正极</small>阳极</> },
    ...(coat > 0.5 ? [{ id: 'cu', at: p(-UT.g / 2 - 0.02, ROD_Y + 0.05, 0), ax: 1, className: 'scene-tag key -translate-y-1/2', children: '析出红色的铜' }] : []),
    ...(on && t > 1.5 ? [{ id: 'cl', at: p(UT.g / 2 + 0.02, ROD_Y + 0.05, 0), className: 'scene-tag key -translate-y-1/2', children: blue > 0.6 ? '氯气：试纸变蓝' : '黄绿色气泡' }] : []),
    { id: 'sol', at: p(0, UY - 0.006, 0.02), ax: 0.5, name: true, className: 'scene-name', children: 'CuCl₂ 溶液' },
    { id: 'ps', at: p(SUPPLY[0], 0.135, SUPPLY[2]), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '直流电源' },
    { id: 'rod', at: p(0, ROD_Y + ROD_LEN + 0.03, 0), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '石墨棒' },
    ...(!tested ? [{ id: 'pp', at: p(REST[0], 0.0, REST[2] + 0.05), ax: 0.5, name: true, className: 'scene-name', children: '湿润的淀粉碘化钾试纸' }] : []),
  ]
  return (
    <LabShell title="电解和金属防护" lessons={LESSONS} current="1" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['1'], VOICE)} actionsLabel="U 形管电解装置"
      stage={<Place at="l1" labels={labels}>
        <group position={p(0, 0, 0)}>
          <IronStand rodH={0.4} rodZ={-0.07} w={0.17} d={0.22}>
            <group position={[0, u(0.2), -u(0.07)]}><ButterflyClamp gap={UT.g / 2} reach={0.07} hold={[true, true]} /></group>
          </IronStand>
          <group position-y={u(UY)}><UTube level={LEVEL} look={look} /></group>
          <group position={[u(cat[0]), u(cat[1]), 0]}><GraphiteRod len={ROD_LEN} coat={coat} wet={WET} clip="#16181b" /></group>
          <group position={[u(an[0]), u(an[1]), 0]}><GraphiteRod len={ROD_LEN} wet={WET} clip="#c8262c" /></group>
        </group>
        <Bubbles at={W([an[0], an[1] + 0.004, 0])} top={u(WET - 0.006)} on={on} rate={30} r={u(0.0019)} spread={u(0.004)} speed={u(0.035)} color="#dff08a" opacity={0.8} seed={3} />
        <Puffs at={W([an[0], UY + UT.H + 0.004, 0])} on={on && t > 1.5} opt={{ rate: 5, life: 1.8, size: [u(0.02), u(0.07)], speed: u(0.03), color: '#c9dc5a', opacity: 0.2, spread: 0.3 }} seed={5} />
        <group position={W(SUPPLY)} rotation-y={SYAW}><DCSupply on={on} volts="6.0" /></group>
        <Wire color="#c8262c" flow={on ? -1 : 0} pts={[W(post('pos')), W([post('pos')[0] - 0.01, 0.012, post('pos')[2] + 0.045]), W([0.13, 0.008, 0.13]), W([0.085, 0.03, 0.06]), W([0.08, 0.2, 0.0]), W([an[0] + 0.02, an[1] + ROD_LEN + 0.045, -0.035]), W(tail(an))]} />
        <Wire color="#1b1d20" flow={on ? 1 : 0} pts={[W(post('neg')), W([post('neg')[0], 0.014, post('neg')[2] + 0.06]), W([0.1, 0.008, 0.17]), W([-0.09, 0.008, 0.15]), W([-0.15, 0.14, 0.03]), W([cat[0] - 0.035, cat[1] + ROD_LEN + 0.04, -0.04]), W(tail(cat))]} />
        {/* 表面皿上搁着试纸；镊子夹着它，一只戴手套的手捏着镊子 */}
        <group position={W([REST[0], 0, REST[2] + 0.005])}><WatchGlass r={0.035} /></group>
        <group position={W(paper)} rotation={[0, 0.5, -(1 - mk) * 1.0]}>
          <PaperInTweezers color={paperColor(blue)} />
          {tested && <group position={[u(TWEEZER_GRIP[0]), u(TWEEZER_GRIP[1]), u(TWEEZER_GRIP[2])]} rotation={[0.9, 0.2, -0.5]}><Glove s={u(0.0052)} /></group>}
        </group>
      </Place>}
      lesson={<LessonBlock no="1" title="电解氯化铜溶液" concept="通电后阴极析出铜，阳极放出氯气" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>使电流通过电解质溶液（或熔融的电解质），在阴、阳两极引起氧化还原反应的过程叫做电解。和直流电源负极相连的电极是阴极，和正极相连的是阳极。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>阴极：{R.cathodeEq}（还原反应）</li>
            <li>阳极：{R.anodeEq}（氧化反应）</li>
            <li>总反应：{R.total}（条件：电解）</li>
            <li>氯气能把 I⁻ 氧化成 I₂，I₂ 遇淀粉变蓝，所以用湿润的淀粉碘化钾试纸检验氯气</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">为了看得清，铜的析出和溶液颜色的变化都加快了。氯气有毒，实际操作要在通风的地方进行。</p>
        </>} />}
      finale={T.finale && <Fin tag="三件事都做完了" big="CuCl₂ 溶液通电后分解成铜和氯气">阴极析出铜，阳极放出氯气。每转移 0.2 mol 电子，得到 {YIELD.cu} g 铜和标准状况下 {YIELD.cl2} L 氯气。</Fin>}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[17px] text-white/65">{R.total}</div>
            <div className="mt-1 text-[13px] text-white/50">条件：电解</div>
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">两极的现象</h2>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[14.5px]">
            <div className="rounded-xl bg-white/8 px-3 py-2.5"><div className="text-[12px] text-white/55">阴极（接负极）</div>{coat > 0.5 ? '覆上红色的铜' : on ? '颜色在变…' : '—'}</div>
            <div className="rounded-xl bg-white/8 px-3 py-2.5"><div className="text-[12px] text-white/55">阳极（接正极）</div>{on ? (blue > 0.6 ? '氯气，试纸变蓝' : '黄绿色气泡') : '—'}</div>
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="U" value={on ? '6.0' : '0.0'} unit="V · 直流电源" />
            <ParamTile symbol={<>n(e⁻)</>} value="0.2" unit="mol · 按它算产量" />
            <ParamTile symbol="m(Cu)" value={YIELD.cu.toFixed(1)} unit="g · 阴极" />
            <ParamTile symbol={<>V(Cl₂)</>} value={YIELD.cl2.toFixed(2)} unit="L · 阳极，标准状况" />
          </div>
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'on'} pulse={next === 'on'} onClick={start} disabled={on}>接通电源</LabButton>
        <LabButton primary={next === 'paper'} pulse={next === 'paper'} onClick={test} disabled={!on || tested || !T.done.cu}>检验阳极气体</LabButton>
      </>}
      extras={null}
    />
  )
}
