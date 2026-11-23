// 简单机械 · 第 1 课 杠杆和它的五要素：材料场上，一根撬棍斜搭在垫块上，铲尖伸在一块大石头底下。
// 压一下撬棍，看它绕着哪一点转（支点）；再画出动力、阻力，从支点向两个力的作用线作垂线，得到动力臂、阻力臂。
// 最后换几种压的方向：作用点没变，方向一变，力臂就变——力臂是支点到力的作用线的距离，不是到作用点的距离。
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { ActionLine, Arm, C1, C2, CO, Force, Pivot } from './marks'
import { Glove, Place, useRun } from './parts'
import { BAR, PUSH, crowbar, crowbarAt, pushAngle, round, type P2, type Push } from './physics'
import { BAR_R, Chock, Crowbar, Rock } from './tools'
import { M, YARD, type V3 } from './world'

const CX = YARD.crow.x, CZ = YARD.crow.z, OY = 0.1 + BAR_R, FZ = CZ + 0.32
const cm = (x: number) => round(x * 100, 1)
const TASKS: Task[] = [
  { id: 'press', text: '压一下撬棍，看它绕着哪一点转', note: '撬棍绕着垫块顶着的这一点转动：这一点叫支点 O' },
  { id: 'forces', text: '画出动力和阻力', note: '手压撬棍的力是动力 F₁，石头压在撬棍上的力是阻力 F₂；两个力都作用在撬棍上' },
  { id: 'arms', text: '从支点向两个力的作用线作垂线，画出力臂', note: `动力臂 l₁ = ${cm(crowbar('down').l1)} cm，阻力臂 l₂ = ${cm(crowbar('down').l2)} cm` },
  { id: 'slant', text: '把动力换成“斜着向下”，看动力臂怎样变', note: `作用点没变，方向一斜，动力臂只剩 ${cm(crowbar('slant').l1)} cm，要用 ${crowbar('slant').F1.toFixed(1)} N` },
  { id: 'normal', text: '再换成“垂直于撬棍”', note: `垂直于撬棍时动力臂最长（${cm(crowbar('normal').l1)} cm），最省力：${crowbar('normal').F1.toFixed(1)} N` },
]
const ORDER: Push[] = ['down', 'slant', 'normal']
/** 力的箭头每 1 N 多长（画面单位） */
const PER = 0.005
const P = (p: P2): V3 => [CX + p[0] * M, OY * M + p[1] * M, FZ]

export default function Lesson1() {
  const [pressed, setPressed] = useState(false)
  const [forces, setForces] = useState(false)
  const [arms, setArms] = useState(false)
  const [push, setPush] = useState<Push>('down')
  const T = useTasks('gewu:machine:1', TASKS)
  const press = useRun(2.4, () => { setPressed(true); T.check(id => id === 'press') })
  const ang = useSlide(pushAngle(push), 70)
  const c = crowbarAt(ang), settled = Math.abs(ang - pushAngle(push)) < 1e-6
  const dip = Math.sin(Math.PI * press.k) * 5           // 压下去又松开：撬棍多转过的角度（度）
  const th = (BAR.tilt - dip) * Math.PI / 180
  // 铲尖此刻的位置（m，以支点为原点），石头的右下角就搭在铲尖上
  const tip: P2 = [-Math.cos(th) * BAR.toTip, -Math.sin(th) * BAR.toTip]
  const lift = OY + tip[1] + BAR_R * 0.3, phi = Math.asin(lift / 0.6)
  const pick = (p: Push) => { setPush(p); if (p === 'slant') T.check(id => id === 'slant'); if (p === 'normal' && T.done.slant) T.check(id => id === 'normal') }
  const resetAll = () => { press.snap(0); setPressed(false); setForces(false); setArms(false); setPush('down'); T.reset() }
  const task = T.current
  const want: Push | null = task?.id === 'slant' ? 'slant' : task?.id === 'normal' ? 'normal' : null
  const { hint, next }: { hint: string; next: 'press' | 'forces' | 'arms' | 'dir' | null } = !task ? { hint: '力臂是支点到力的作用线的距离。垂直于撬棍用力，力臂最长，最省力。', next: null }
    : press.busy ? { hint: '撬棍绕着垫块顶着的那一点转…', next: null }
    : !pressed ? { hint: '一根撬棍搭在垫块上，铲尖伸在石头底下。按“压一下撬棍”', next: 'press' }
    : !forces ? { hint: '支点找到了。按“画出动力和阻力”', next: 'forces' }
    : !arms ? { hint: '按“画出力臂”：从支点向两个力的作用线作垂线', next: 'arms' }
    : want ? { hint: `把动力的方向换成“${PUSH[want].name}”，看动力臂怎样变`, next: 'dir' } : { hint: '', next: null }
  const O = P([0, 0])
  const labels: Label[] = [
    ...(pressed ? [{ id: 'O', at: [O[0] - 0.12, O[1] - 0.28, FZ] as V3, ax: 1, className: 'force-tag -translate-y-1/2', style: { color: CO }, children: 'O 支点' }] : []),
    ...(forces ? [
      { id: 'F1', at: P([c.hand[0] + c.dir[0] * c.F1 * PER / M - 0.06, c.hand[1] + c.dir[1] * c.F1 * PER / M - 0.04]), ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>动力 F₁</small>{c.F1.toFixed(1)} N</> },
      { id: 'F2', at: P([c.tip[0] + 0.05, c.tip[1] - c.F2 * PER / M * 0.75]), ax: 0, className: 'scene-tag -translate-y-1/2', children: <><small>阻力 F₂</small>{c.F2} N</> },
    ] : []),
    ...(arms ? [
      { id: 'l1', at: P([c.foot1[0] / 2 + 0.03, c.foot1[1] / 2 + 0.06]), ax: 0.5, className: 'force-tag -translate-y-full', style: { color: C1 }, children: `l₁ = ${cm(c.l1)} cm` },
      { id: 'l2', at: P([c.foot2[0] / 2, 0.07]), ax: 0.5, className: 'force-tag -translate-y-full', style: { color: C2 }, children: `l₂ = ${cm(c.l2)} cm` },
    ] : []),
    { id: 'n1', at: [CX + 4.2, 0.6, CZ], name: true, className: 'scene-name', children: '撬棍 · 长 1.2 m' },
    { id: 'n2', at: [CX - 1.9, 2.0, CZ], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '石头' },
    { id: 'n3', at: [CX + 0.2, 0.15, CZ + 0.5], name: true, className: 'scene-name', children: '垫块' },
  ]
  return (
    <LabShell title="简单机械" lessons={LESSONS} current="1" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="撬棍"
      stage={<Place at="l1" labels={labels}>
        <group position={[CX, 0.1 * M, CZ]}><Chock /></group>
        <group position={[CX + (tip[0] + 0.04 - 0.6 * Math.cos(phi)) * M, 0, CZ]} rotation-z={phi}>
          <group position={[0.6 * M, 0, 0]}><Rock /></group>
        </group>
        <group position={[CX, OY * M, CZ]} rotation-z={th}>
          <Crowbar toTip={BAR.toTip} toHand={BAR.toHand} />
          <group position={[(BAR.toHand - 0.07) * M, 0, 0]}><Glove /></group>
        </group>
        {pressed && <Pivot at={O} s={0.11} />}
        {forces && !press.busy && <>
          <Force from={P(c.hand)} dir={c.dir} len={c.F1 * PER} color={C1} thick={0.42} />
          <Force from={P(c.tip)} dir={[0, -1]} len={c.F2 * PER} color={C2} thick={0.42} />
        </>}
        {arms && !press.busy && <>
          <ActionLine A={P(c.hand)} F={P(c.foot1)} dir={c.dir} color={C1} extra={0.5} r={0.012} seg={0.14} />
          <ActionLine A={P(c.tip)} F={P(c.foot2)} dir={[0, -1]} color={C2} extra={0.4} r={0.012} seg={0.14} />
          <Arm O={O} F={P(c.foot1)} line={c.dir} color={C1} s={0.24} r={0.018} />
          <Arm O={O} F={P(c.foot2)} line={[0, -1]} color={C2} s={0.24} r={0.018} />
        </>}
      </Place>}
      lesson={<LessonBlock no="1" title="杠杆" concept="力臂是支点到力的作用线的距离" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>一根硬棒，在力的作用下能绕着固定点转动，这根硬棒就是<b className="text-white">杠杆</b>。撬棍、剪刀、跷跷板都是杠杆。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li><b className="text-white">支点 O</b>：杠杆绕着转动的点</li>
            <li><b className="text-white">动力 F₁</b>：使杠杆转动的力</li>
            <li><b className="text-white">阻力 F₂</b>：阻碍杠杆转动的力</li>
            <li><b className="text-white">动力臂 l₁</b>：从支点到动力作用线的距离</li>
            <li><b className="text-white">阻力臂 l₂</b>：从支点到阻力作用线的距离</li>
          </ul>
          <p className="mt-3">画力臂：先找支点，再画出力的作用线（不够长就用虚线延长），从支点向作用线作垂线，支点到垂足的线段就是力臂。</p>
          <p className="mt-3 text-[13.5px] text-white/65">动力和阻力都作用在杠杆上。它们使杠杆转动的方向相反。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">五个要素都找到了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">力臂是支点到力的作用线的距离，不是到作用点的距离</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">同一个作用点，竖直压、斜着压、垂直于撬棍压，动力臂分别是 {ORDER.map(p => `${cm(crowbar(p).l1)}`).join('、')} cm。垂直于撬棍时最长，最省力。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">要用的动力</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{arms ? c.F1.toFixed(1) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">N</span></div>
            <div className="mt-1.5 text-[13px] text-white/55">F₁ = F₂ l₂ ÷ l₁</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="l₁" value={arms ? `${cm(c.l1)} cm` : '—'} unit="动力臂" />
            <ParamTile symbol="l₂" value={arms ? `${cm(c.l2)} cm` : '—'} unit="阻力臂" />
            <ParamTile symbol="F₂" value={`${BAR.F2} N`} unit="阻力 · 石头压着铲尖" />
            <ParamTile symbol="OA" value={`${BAR.toHand * 100} cm`} unit="支点到手压的地方" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">杠杆的五要素</h2>
          <ul className="mt-2 grid grid-cols-5 gap-1 text-center text-[12.5px]">
            {([['支点', CO, pressed], ['动力', C1, forces], ['阻力', C2, forces], ['动力臂', C1, arms], ['阻力臂', C2, arms]] as [string, string, boolean][]).map(([n, col, on]) => <li key={n} className="rounded-lg bg-white/6 px-0.5 py-2" style={{ color: on ? col : 'rgb(255 255 255 / 0.3)' }}>{n}</li>)}
          </ul>
          <p className="mt-3 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] leading-relaxed text-white/70">{!arms ? '支点到作用点（手压的地方）是 100 cm。力臂是不是也是 100 cm？画出来看看。' : `${PUSH[settled ? push : 'down'].name}压：支点到作用点还是 100 cm，力臂是 ${cm(c.l1)} cm。`}</p>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'press'} pulse={next === 'press'} onClick={() => press.run()} disabled={press.busy}>压一下撬棍</LabButton>
        <LabButton primary={next === 'forces'} pulse={next === 'forces'} onClick={() => { setForces(true); T.check(id => id === 'forces') }} disabled={!pressed || forces}>画出动力和阻力</LabButton>
        <LabButton primary={next === 'arms'} pulse={next === 'arms'} onClick={() => { setArms(true); T.check(id => id === 'arms') }} disabled={!forces || arms}>画出力臂</LabButton>
      </>}
      extras={
        <Control label="动力的方向">
          <Segmented label="动力的方向" pulse={next === 'dir'} want={next === 'dir' ? want : null} disabled={!arms} value={push} onChange={pick} options={ORDER.map(p => ({ value: p, label: PUSH[p].name }))} />
        </Control>
      }
    />
  )
}
