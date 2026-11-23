// 质量与密度 · 第 6 课 测石块和盐水的密度（先测质量再测体积；测液体时倒出一部分，减小误差）
import { useEffect, useRef, useState, type RefObject } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { Balance, WeightSet, panAt, useWeigh } from './balance'
import { BEAKER_H, BEAKER_R, BRINE as BRINE_TINT, Beaker, CYL_IN, Cylinder, RIM, WATER, levelY } from './glass'
import { LESSONS, goLesson } from './lessons'
import { Carry, Room, STONE_H, Stone, newLive, useLag, usePhase, useSettled, type Live, type V3 } from './parts'
import { BRINE, STONE, brineAll, brinePart, displaced, stoneRho, stoneV2 } from './physics'
import { ST, TOP } from './world'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

type Mode = 'stone' | 'all' | 'part'
const MODES: Mode[] = ['stone', 'all', 'part'], A = brineAll(), P2 = brinePart()
const SEG: Record<Mode, string> = { stone: '石块', all: '盐水：全倒', part: '盐水：倒一部分' }
const STEPS: Record<Mode, string[]> = {
  stone: ['称石块的质量', '往量筒里倒水', '把石块浸没', '算密度'],
  all: ['称烧杯和盐水', '全部倒进量筒', '算密度'],
  part: ['称烧杯和盐水', '倒一部分进量筒', '称烧杯和剩下的', '算密度'],
}
/** 每一步做完要等多久才稳住（毫秒）：称量、倾倒、浸没各不一样 */
const WAIT: Record<Mode, number[]> = { stone: [300, 4500, 6100, 3500, 500], all: [300, 5200, 6300, 500], part: [300, 5200, 6300, 5400, 500] }
const TASKS: Task[] = [
  { id: 'stone', text: '测石块的密度：先称质量，再用排水法测体积', note: `ρ = ${STONE.m} g ÷ ${STONE.v} cm³ = ${stoneRho().toFixed(1)} g/cm³。要先称质量：石块沾了水再称，质量就偏大` },
  { id: 'all', text: '测盐水：称完把盐水全部倒进量筒', note: `算出约 ${A.rho.toFixed(2)} g/cm³，偏大：烧杯壁上还沾着盐水，量筒里的体积偏小` },
  { id: 'part', text: '换个做法：只倒一部分，再称剩下的', note: `算出 ${P2.rho.toFixed(2)} g/cm³：倒出去多少就量多少，沾在杯壁上的不影响` },
]
const X = ST.s6, BASE: V3 = [X - 0.75, TOP, 0.15], BOX: V3 = [X + 0.95, TOP, 1.02], CYL_AT: V3 = [X + 1.85, TOP, 0.25], CUP_AT: V3 = [X + 2.6, TOP, 0.62], ROCK_AT: V3 = [X - 1.7, TOP, 1.02]
const TIP: V3 = [CYL_AT[0] + BEAKER_R + 0.03, TOP + RIM + 0.07 - BEAKER_H, CYL_AT[2]]
const WATER_ML = 150

/** 这一种做法的器材：做到第 k 步时，石块、烧杯、量筒里的液面各在哪。换做法时整套重新摆好 */
function Bench({ mode, k, live }: { mode: Mode; k: number; live: RefObject<Live> }) {
  const P = usePhase([1700, 2300, 1700]), prev = useRef(k)
  useEffect(() => { if (k === 2 && prev.current === 1) P.run(); prev.current = k })
  const pouring = P.ph === 1 || P.ph === 2
  const stoneIn = useLag(mode === 'stone' && k >= 3, 1500)
  const goal = mode === 'stone' ? STONE.v1 : mode === 'all' ? A.V : P2.V
  const V = useSlide((k >= 2 && P.ph !== 1 ? goal : 0) + (stoneIn ? STONE.v : 0), 28)
  const m = mode === 'stone' ? (k === 1 || k === 2 ? STONE.m : null) : mode === 'all' ? (k === 1 ? A.m1 : null) : k === 1 ? P2.m1 : k >= 3 ? P2.m2 : null
  const Wg = useWeigh(m, 1500)
  const cupOnPan = !pouring && mode !== 'stone' && (k === 1 || (mode === 'part' && k >= 3))
  const rock = mode !== 'stone' || k === 0 ? 0 : k < 3 ? 1 : 2
  return <>
    <Balance at={BASE} left={Wg.left} right={Wg.right} rider={Wg.rider} live={live} />
    <WeightSet box={BOX} base={BASE} on={Wg.on} live={live} />
    <Cylinder at={CYL_AT} V={V} color={mode === 'stone' ? WATER : BRINE_TINT} />
    <Carry at={rock === 2 ? [CYL_AT[0], TOP + CYL_IN + STONE_H + 0.004, CYL_AT[2]] : rock === 1 ? panAt(BASE, -1) : ROCK_AT} ride={rock === 1 ? 'L' : null} live={live} lift={0.52} speed={2.4} grip={rock === 2 ? [0.012, RIM - CYL_IN - STONE_H + 0.004, 0.11] : [0.17, 0.07]}>
      <Stone thread={rock === 2 ? 'hook' : rock === 1 ? 'wrap' : 'coil'} up={RIM - CYL_IN - STONE_H} />
    </Carry>
    <Carry at={pouring ? TIP : cupOnPan ? panAt(BASE, -1) : CUP_AT} ride={cupOnPan ? 'L' : null} live={live} lift={0.78} speed={2.6} grip={[BEAKER_R * 2 + 0.02, BEAKER_H * 0.62]} held={pouring}>
      <Beaker V={(mode === 'stone' ? WATER_ML : BRINE.v) - Math.min(V, goal)} color={mode === 'stone' ? WATER : BRINE_TINT} pour={P.ph === 2} drop={RIM + 0.03 - levelY(V)} />
    </Carry>
  </>
}

export default function Lesson6() {
  const [mode, setMode] = useState<Mode>('stone')
  const [ks, setKs] = useState<Record<Mode, number>>({ stone: 0, all: 0, part: 0 })
  const [fresh, setFresh] = useState(true)
  const T = useTasks('gewu:density:6', TASKS)
  const live = useRef(newLive())
  const k = ks[mode], steps = STEPS[mode], full = k >= steps.length
  const settled = useSettled(`${mode}:${k}`, fresh ? 300 : WAIT[mode][k])
  const go = () => { if (!settled || full) return; const n = { ...ks, [mode]: k + 1 }; setKs(n); setFresh(false); if (k + 1 >= steps.length) T.check(id => n[id as Mode] >= STEPS[id as Mode].length) }
  const pick = (m: Mode) => { if (!settled) return; setMode(m); setFresh(true) }
  const resetAll = () => { setMode('stone'); setKs({ stone: 0, all: 0, part: 0 }); setFresh(true); T.reset() }
  const task = T.current
  const said: Record<Mode, string[]> = {
    stone: ['石块是干的，先称质量', `m = ${STONE.m} g。再测体积：往量筒里倒水`, `V₁ = ${STONE.v1} mL。把石块用细线拴着，浸没在水里`, `V₂ = ${stoneV2()} mL，石块的体积是 ${displaced(STONE.v1, stoneV2())} cm³`, `ρ = ${stoneRho().toFixed(1)} g/cm³`],
    all: [`空烧杯已经称过，m₀ = ${A.m0} g。现在称烧杯和盐水`, `m₁ = ${A.m1} g。把盐水全部倒进量筒`, `量筒里只有 ${A.V} mL：杯壁上还沾着一些没倒出来`, `ρ ≈ ${A.rho.toFixed(2)} g/cm³，偏大了`],
    part: ['换个做法。先称烧杯和盐水', `m₁ = ${P2.m1} g。只倒一部分进量筒`, `V = ${P2.V} mL。再称烧杯和剩下的盐水`, `m₂ = ${P2.m2} g，倒出去的盐水是 ${P2.m} g`, `ρ = ${P2.rho.toFixed(2)} g/cm³`],
  }
  const { hint, next }: { hint: string; next: 'mode' | 'go' | null } = !task ? { hint: '测固体：先质量后体积。测液体：倒出一部分，量倒出去的那些。', next: null }
    : !settled ? { hint: '正在做这一步…', next: null }
    : mode !== task.id ? { hint: `换成“${SEG[task.id as Mode]}”`, next: 'mode' }
    : full ? { hint: said[mode][k], next: null } : { hint: `${said[mode][k]}：按“${steps[k]}”`, next: 'go' }
  const at = (ok: boolean) => ({ opacity: ok && settled ? 1 : 0 })
  const mNow = mode === 'stone' ? STONE.m : mode === 'part' && k >= 3 ? P2.m2 : A.m1, onPan = mode === 'stone' ? k === 1 || k === 2 : k === 1 || (mode === 'part' && k >= 3)
  const vNow = mode === 'stone' ? (k >= 3 ? stoneV2() : STONE.v1) : mode === 'all' ? A.V : P2.V
  const rhoNow = mode === 'stone' ? stoneRho().toFixed(1) : mode === 'all' ? A.rho.toFixed(2) : P2.rho.toFixed(2)
  const labels: Label[] = [
    { id: 'm', at: [BASE[0], TOP + 1.66, BASE[2]], ax: 0.5, className: 'scene-tag -translate-y-full transition-opacity', style: at(onPan), children: <><small>天平读数</small>{mNow.toFixed(1)} g</> },
    { id: 'v', at: [CYL_AT[0] + 0.2, TOP + levelY(vNow), CYL_AT[2]], className: 'scene-tag -translate-y-1/2 transition-opacity', style: at(k >= 2), children: <><small>量筒读数</small>{vNow} mL</> },
    { id: 'r', at: [CYL_AT[0], TOP + RIM + 0.12, CYL_AT[2]], ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: at(full), children: <><small>{mode === 'stone' ? '石块的密度' : '盐水的密度'}</small>{mode === 'all' ? '约 ' : ''}{rhoNow} g/cm³</> },
    { id: 'c', at: [CUP_AT[0], TOP + BEAKER_H + 0.06, CUP_AT[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', style: mode === 'stone' || k === 0 ? undefined : { display: 'none' }, children: mode === 'stone' ? '烧杯里的水' : '烧杯里的盐水' },
  ]
  const row = (name: string, v: string | null, key = false) => <tr className="border-t border-white/12"><td className="py-1.5 text-white/80">{name}</td><td className={`text-right tabular-nums${key ? ' font-semibold text-[#7fe3d4]' : ''}`}>{v ?? '—'}</td></tr>
  const got = (n: number, v: string) => k > n || (k === n && settled) ? v : null
  return (
    <LabShell narration={voiced(NARRATION['6'], VOICE)} title="质量与密度" lessons={LESSONS} current="6" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={mode === 'stone' ? '测石块的密度' : '测盐水的密度'}
      stage={<Room at="s6" labels={labels}><Bench key={mode} mode={mode} k={k} live={live} /></Room>}
      lesson={<LessonBlock no="6" title="测石块和盐水" concept="测出质量和体积，用 ρ = m/V 算密度" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>测密度的原理是 <span className="font-formula italic">ρ = m / V</span>：用天平测质量，用量筒测体积。步骤的先后会影响结果。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li><b className="text-white">固体</b>：先用天平称质量，再用排水法测体积。反过来做，石块上沾了水，称出的质量偏大，密度偏大</li>
            <li><b className="text-white">液体</b>：称烧杯和液体的总质量 m₁，倒一部分进量筒读出体积 V，再称烧杯和剩余液体的质量 m₂，ρ = (m₁ − m₂) ÷ V</li>
            <li>如果把液体全部倒进量筒，烧杯壁上总会沾着一些：量筒里的体积偏小，算出的密度偏大</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">这里设烧杯壁上沾住 {BRINE.stick} mL 盐水，只为了看出偏大多少。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三种做法都做过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">步骤的先后，决定误差的大小</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">石块 {stoneRho().toFixed(1)} g/cm³。同一杯盐水，全倒算出约 {A.rho.toFixed(2)} g/cm³，倒一部分算出 {P2.rho.toFixed(2)} g/cm³：后一种做法更准。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">{mode === 'part' ? 'ρ = (m₁ − m₂) / V' : mode === 'all' ? 'ρ = (m₁ − m₀) / V' : 'ρ = m / (V₂ − V₁)'}</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{full && settled ? `${mode === 'all' ? '≈' : ''}${rhoNow}` : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">g/cm³</span></div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">数据表 · {SEG[mode]}</h2>
          <table className="mt-1 w-full text-[13.5px]"><tbody>
            {mode === 'stone' && <>{row('石块的质量 m', got(1, `${STONE.m} g`))}{row('水的体积 V₁', got(2, `${STONE.v1} mL`))}{row('水和石块的总体积 V₂', got(3, `${stoneV2()} mL`))}{row('石块的体积 V₂ − V₁', got(3, `${displaced(STONE.v1, stoneV2())} cm³`))}{row('石块的密度 ρ', got(4, `${stoneRho().toFixed(1)} g/cm³`), true)}</>}
            {mode === 'all' && <>{row('空烧杯的质量 m₀', `${A.m0} g`)}{row('烧杯和盐水的质量 m₁', got(1, `${A.m1} g`))}{row('盐水的质量 m₁ − m₀', got(1, `${A.m} g`))}{row('量筒里盐水的体积 V', got(2, `${A.V} mL`))}{row('盐水的密度 ρ', got(3, `约 ${A.rho.toFixed(2)} g/cm³`), true)}</>}
            {mode === 'part' && <>{row('烧杯和盐水的质量 m₁', got(1, `${P2.m1} g`))}{row('量筒里盐水的体积 V', got(2, `${P2.V} mL`))}{row('烧杯和剩余盐水的质量 m₂', got(3, `${P2.m2} g`))}{row('倒出的盐水的质量 m₁ − m₂', got(3, `${P2.m} g`))}{row('盐水的密度 ρ', got(4, `${P2.rho.toFixed(2)} g/cm³`), true)}</>}
          </tbody></table>
          {mode === 'all' && k >= 2 && settled && <p className="row-in mt-3 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] leading-relaxed text-white/75">烧杯里原来有 {BRINE.v} mL 盐水，量筒里只量到 {A.V} mL：有 {BRINE.stick} mL 沾在杯壁上。</p>}
        </Glass>
      }
      actions={<><LabButton primary pulse={next === 'go'} onClick={go} disabled={!settled || full}>{full ? '做完了' : steps[k]}</LabButton></>}
      extras={<Control label="测什么"><Segmented label="测什么" pulse={next === 'mode'} want={next === 'mode' ? task!.id as Mode : null} value={mode} disabled={!settled} onChange={pick} options={MODES.map(m => ({ value: m, label: SEG[m] }))} /></Control>}
    />
  )
}
