// 带电粒子在磁场中 · 第 1 课 安培力：大厅最西头的实验台。闭合开关，吊在蹄形磁体两极之间的铜棒摆出去；
// 让电流反向、对调磁极各看一次；最后把电流调到 3 A，读出 F = BIL。旁边一只左手比着左手定则。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { AMP, ampForce, ampereSide, swingAngle } from './physics'
import { R1, Rig1 } from './scene1'
import { Place } from './world'
import { ST } from './layout'
import { useSettled } from './anim'

const TASKS: Task[] = [
  { id: 'on', text: '闭合开关，看导体棒往哪边摆', note: '导体棒向外摆：通电导线在磁场中受到安培力' },
  { id: 'rev', text: '让电流反向，再看', note: '导体棒往里摆：安培力的方向跟电流方向有关' },
  { id: 'flip', text: '对调磁极，再看', note: '又往外摆了：安培力的方向也跟磁场方向有关' },
  { id: 'big', text: '把电流调到 3 A，读出安培力', note: `F = BIL = ${AMP.B} T × 3 A × ${AMP.L} m = ${ampForce(3).toFixed(3)} N` },
]
type Amp = '1' | '2' | '3'
const X = ST.l1

export default function Lesson1() {
  const [on, setOn] = useState(false)
  const [amp, setAmp] = useState<Amp>('1')
  const [cur, setCur] = useState<1 | -1>(-1)
  const [flips, setFlips] = useState(0)
  const T = useTasks('gewu:bfield:1', TASKS)
  const flip = useSlide(flips, 0.45), flipping = Math.abs(flip - flips) > 1e-3
  const field: 1 | -1 = flips % 2 ? -1 : 1
  const I = Number(amp), F = ampForce(I), side = ampereSide(cur, field), theta = swingAngle(F)
  const settled = useSettled(`${on}${amp}${cur}${flips}`, 2800) && on && !flipping
  const resetAll = () => { setOn(false); setAmp('1'); setCur(-1); setFlips(0); T.reset() }
  useEffect(() => {
    if (!settled) return
    T.check(id => id === 'on'
      || (id === 'rev' && cur === 1 && !!T.done.on)
      || (id === 'flip' && field === -1 && !!T.done.rev)
      || (id === 'big' && I === 3 && !!T.done.flip))
  }, [settled])   // eslint-disable-line react-hooks/exhaustive-deps

  const task = T.current
  type Next = 'switch' | 'rev' | 'flip' | 'amp' | null
  const { hint, next }: { hint: string; next: Next } = (() => {
    if (!task) return { hint: '安培力 F = BIL，方向用左手定则判断。', next: null }
    if (flipping) return { hint: '正在对调磁极…', next: null }
    if (task.id === 'on') return on ? { hint: '导体棒摆出去了，等它停稳…', next: null } : { hint: '闭合开关，看导体棒往哪边摆', next: 'switch' }
    if (!on) return { hint: '闭合开关', next: 'switch' }
    if (task.id === 'rev') return cur === -1 ? { hint: '让电流反向', next: 'rev' } : { hint: '电流反了，等导体棒停稳…', next: null }
    if (task.id === 'flip') return field === 1 ? { hint: '对调磁极', next: 'flip' } : { hint: '磁场反了，等导体棒停稳…', next: null }
    return I !== 3 ? { hint: '把电流调到 3 A', next: 'amp' } : { hint: '电流加大到 3 A，等导体棒停稳…', next: null }
  })()

  const labels: Label[] = [
    { id: 'n1', at: [X, R1.gapY + 0.1, -0.1], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '蹄形磁体' },
    { id: 'n2', at: [X + 0.19, R1.hangY + 0.06, -0.02], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '铁架台和铜棒' },
    { id: 'n3', at: [X + R1.supply[0], R1.supply[1] + 0.17, R1.supply[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '学生电源' },
    { id: 'hand', at: [X + R1.hand[0], R1.hand[1] + 0.1, R1.hand[2]], ax: 0.5, className: 'scene-name -translate-y-full transition-opacity', style: { opacity: T.done.on ? 1 : 0 }, children: '左手定则' },
    { id: 'f', at: [X + 0.13, R1.gapY + 0.02, 0.1], ax: 0, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: on && !flipping ? 1 : 0 }, children: <><small>F</small>{F.toFixed(3)} N</> },
  ]
  return (
    <LabShell title="带电粒子在磁场中" lessons={LESSONS} current="1" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['1'], VOICE)} actionsLabel="电路和磁体"
      stage={<Place at="l1" cur="l1" labels={labels}>
        <Rig1 on={on} I={I} cur={cur} side={side} theta={theta} flip={flip} field={field} hand={T.done.on ? 1 : 0} />
      </Place>}
      lesson={<LessonBlock no="1" title="安培力" concept="磁场对电流有力的作用，F = BIL" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>通电导线在磁场中受到的力叫<b className="text-white">安培力</b>。</p>
          <p className="mt-3"><b className="text-white">左手定则</b>：伸开左手，使拇指与其余四个手指垂直，并且都与手掌在同一个平面内；让磁感线从掌心垂直进入，并使四指指向电流的方向，这时拇指所指的方向就是通电导线在磁场中所受安培力的方向。</p>
          <p className="mt-3">导线与磁场垂直时，安培力 <span className="font-formula italic">F = BIL</span>；导线与磁场平行时不受安培力；夹角为 θ 时 <span className="font-formula italic">F = BIL sinθ</span>。</p>
          <p className="mt-3">导体棒吊在两根软导线上，受到水平的安培力后偏开，偏角满足 tanθ = F / mg。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四件事都做完了</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">安培力 F = BIL，方向用左手定则判断</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">电流反向或磁场反向，安培力都反向；电流从 1 A 加到 3 A，安培力从 {ampForce(1).toFixed(3)} N 加到 {ampForce(3).toFixed(3)} N。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">F = B I L</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{on ? F.toFixed(3) : '0'}<span className="ml-1 text-[15px] font-medium text-white/55">N</span></div>
            <div className="mt-1.5 text-[13px] text-white/55">{on ? `安培力朝${side > 0 ? '外' : '里'}` : '开关断开，没有电流'}</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="B" value={AMP.B.toFixed(2)} unit={`T · ${field > 0 ? 'N 极在上，向下' : 'N 极在下，向上'}`} />
            <ParamTile symbol="I" value={on ? I.toFixed(1) : '0'} unit={`A · ${cur > 0 ? '向右' : '向左'}`} />
            <ParamTile symbol="L" value={AMP.L.toFixed(2)} unit="m · 在磁场里的长度" />
            <ParamTile symbol="θ" value={settled ? `${(theta * 180 / Math.PI).toFixed(1)}°` : '—'} unit="导体棒偏开的角度" />
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'switch'} pulse={next === 'switch'} onClick={() => setOn(o => !o)} disabled={flipping}>{on ? '断开开关' : '闭合开关'}</LabButton>
        <LabButton pulse={next === 'rev'} onClick={() => setCur(c => (c > 0 ? -1 : 1))} disabled={flipping || !T.done.on}>电流反向</LabButton>
        <LabButton pulse={next === 'flip'} onClick={() => setFlips(n => n + 1)} disabled={flipping || !T.done.rev}>对调磁极</LabButton>
      </>}
      extras={<Control label="电流"><Segmented label="电流" pulse={next === 'amp'} want={next === 'amp' ? '3' : null} value={amp} onChange={k => setAmp(k as Amp)} disabled={flipping} options={(['1', '2', '3'] as Amp[]).map(k => ({ value: k, label: `${k} A` }))} /></Control>}
    />
  )
}
