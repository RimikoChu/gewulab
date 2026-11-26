// 电与磁 · 拓展课 电磁继电器 · 扬声器：实训室东头的控制柜。合上控制开关，电磁铁吸下衔铁，触点接通，柜顶的航空障碍灯样灯亮；
// 断开，弹簧把衔铁拉回去，灯灭。再给柜旁剖开的扬声器通入方向不断变化的电流，看音圈和纸盆来回振动。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useRef, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { RELAY } from './physics'
import { LX, SceneX } from './scenex'
import { Bench, Place, toWorld } from './world'
import { useSettled } from './anim'

const TASKS: Task[] = [
  { id: 'on', text: '合上控制开关，看障碍灯', note: '电磁铁吸下衔铁，触点接通，工作电路里的灯亮了' },
  { id: 'off', text: '断开控制开关', note: '电磁铁没有磁性，弹簧把衔铁拉回去，灯灭了' },
  { id: 'spk', text: '给扬声器通入方向变化的电流', note: '线圈在磁场里受力，方向跟着电流来回变，带动纸盆振动发声' },
]

export default function LessonX() {
  const [mode, setMode] = useState<'relay' | 'speaker'>('relay')
  const [on, setOn] = useState(false)
  const [play, setPlay] = useState(false)
  const T = useTasks('gewu:magnet:x', TASKS)
  const knife = useSlide(on ? 1 : 0, 2.4)
  const arm = useSlide(on && knife > 0.99 ? 1 : 0, 3)
  const [phase, setPhase] = useState(0), ph = useRef(0)
  useEffect(() => {
    if (!play) return
    let raf = 0, last = performance.now()
    const frame = (now: number) => { const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now; ph.current += dt * Math.PI * 2 * 1.5; setPhase(ph.current); raf = requestAnimationFrame(frame) }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [play])
  const lit = arm > 0.95
  const litOk = useSettled(`${lit}`, 1600)
  const heard = useSettled(`${play}`, 3600) && play
  const resetAll = () => { setMode('relay'); setOn(false); setPlay(false); T.reset() }
  useEffect(() => { if (lit && litOk) T.check(id => id === 'on'); if (!lit && litOk && arm < 0.01 && T.done.on && !on) T.check(id => id === 'off') }, [lit, litOk, arm < 0.01])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (heard) T.check(id => id === 'spk') }, [heard])   // eslint-disable-line react-hooks/exhaustive-deps

  const task = T.current
  type Next = 'switch' | 'mode' | 'play' | null
  const { hint, next }: { hint: string; next: Next } = (() => {
    if (!task) return { hint: '电磁继电器用低压电路控制高压电路；扬声器把电信号变成声音。', next: null }
    if (knife > 0.01 && knife < 0.99) return { hint: on ? '合上控制开关…' : '断开控制开关…', next: null }
    if (task.id === 'on') return mode !== 'relay' ? { hint: '换到电磁继电器', next: 'mode' } : on ? { hint: '看衔铁和障碍灯…', next: null } : { hint: '合上控制开关，看障碍灯', next: 'switch' }
    if (task.id === 'off') return on ? { hint: '断开控制开关', next: 'switch' } : { hint: '看衔铁…', next: null }
    if (mode !== 'speaker') return { hint: '换到扬声器', next: 'mode' }
    return play ? { hint: '看音圈和纸盆…', next: null } : { hint: '给扬声器通入方向变化的电流', next: 'play' }
  })()

  const W = (p: [number, number, number]) => toWorld('x', p)
  const B = LX.board
  const labels: Label[] = mode === 'relay' ? [
    { id: 'r1', at: W([B[0] - 6, B[1] + 7, B[2] + 4]), ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '电磁铁' },
    { id: 'r2', at: W([B[0] - 2, B[1] + 9, B[2] + 3]), ax: 0, name: true, className: 'scene-name -translate-y-full', children: '衔铁和弹簧' },
    { id: 'r3', at: W([B[0] + 3, B[1] + 2, B[2] + 3]), ax: 0, name: true, className: 'scene-name', children: '触点' },
    { id: 'lamp', at: W([B[0] + 30, B[1] + 2, B[2] + 2]), ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: lit ? 1 : 0 }, children: <><small>障碍灯</small>亮</> },
    { id: 'lampN', at: W([B[0] + 30, B[1] - 10, B[2] + 4]), ax: 0.5, name: true, className: 'scene-name', children: '航空障碍灯样灯' },
  ] : [
    { id: 's1', at: W([LX.spk[0] + 7, LX.spk[1] + 26, LX.spk[2]]), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '纸盆' },
    { id: 's2', at: W([LX.spk[0] - 4, LX.spk[1] + 5, LX.spk[2] + 2]), ax: 1, name: true, className: 'scene-name', children: '永磁体和音圈' },
  ]
  return (
    <LabShell title="电与磁" lessons={LESSONS} current="x" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['x'], VOICE)} actionsLabel={mode === 'relay' ? '控制电路' : '扬声器'}
      stage={<Place at={mode === 'relay' ? 'x' : 'xs'} labels={labels}><Bench at="x"><SceneX on={on} swing={knife} arm={arm} mode={mode} phase={phase} /></Bench></Place>}
      lesson={<LessonBlock no="拓展" title="电磁继电器 · 扬声器" concept="电磁铁能控制电路，线圈能带动纸盆" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p><b className="text-white">电磁继电器</b>是用电磁铁控制工作电路通断的开关。控制电路电压低、电流小；合上开关，电磁铁吸下衔铁，动触点和静触点接通，工作电路就通了。这样人只碰低压电路，就能控制高压、强电流的工作电路，也能实现远距离控制和自动控制。</p>
          <p className="mt-3">风机塔顶的航空障碍灯晚上亮、白天灭，可以由光控电路通过继电器控制（这里用开关代替光控）。</p>
          <p className="mt-3"><b className="text-white">扬声器</b>：线圈套在永磁体上，线圈里通入方向不断变化的电流，它在磁场中受力的方向也不断变化，就来回振动，带动纸盆振动发出声音。它利用的是磁场对电流的作用。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">拓展做完了</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">继电器用电磁铁控制电路；扬声器靠磁场对电流的作用发声</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">低压的控制电路能控制高压的工作电路；线圈里电流方向来回变，纸盆就来回振动。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          {mode === 'relay' ? <>
            <div className="grid grid-cols-2 gap-2">
              <ParamTile symbol="控制电路" value={`${RELAY.control} V`} unit={on ? '接通' : '断开'} />
              <ParamTile symbol="工作电路" value={`${RELAY.work} V`} unit={lit ? '接通' : '断开'} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <ParamTile symbol="衔铁" value={arm > 0.5 ? '吸下' : '弹起'} unit="" />
              <ParamTile symbol="障碍灯" value={lit ? '亮' : '灭'} unit="" />
            </div>
          </> : <>
            <div className="text-center">
              <div className="text-[12.5px] text-white/55">音圈里的电流</div>
              <div className="mt-1 text-[32px] leading-none font-bold">{play ? (Math.cos(phase) > 0 ? '正向' : '反向') : '—'}</div>
              <div className="mt-2 text-[14px] text-white/70">{play ? (Math.cos(phase) > 0 ? '线圈和纸盆向外' : '线圈和纸盆向里') : '没有电流'}</div>
            </div>
            <p className="mt-3 text-[12.5px] text-white/50">画面里振动放慢了，实际每秒振动几十到几千次。</p>
          </>}
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'switch'} pulse={next === 'switch'} onClick={() => setOn(o => !o)} disabled={mode !== 'relay' || (knife > 0.01 && knife < 0.99)}>{on ? '断开控制开关' : '合上控制开关'}</LabButton>
        <LabButton pulse={next === 'play'} onClick={() => setPlay(p => !p)} disabled={mode !== 'speaker'}>{play ? '停止' : '通入变化的电流'}</LabButton>
      </>}
      extras={<Control label="看哪一个"><Segmented label="看哪一个" pulse={next === 'mode'} want={next === 'mode' ? (task?.id === 'spk' ? 'speaker' : 'relay') : null} value={mode} onChange={v => { setOn(false); setPlay(false); setMode(v as 'relay' | 'speaker') }} options={[{ value: 'relay', label: '电磁继电器' }, { value: 'speaker', label: '扬声器' }]} /></Control>}
    />
  )
}
