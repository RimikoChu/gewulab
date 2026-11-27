// 抛体运动 · 第 2 课 冲锋舟过河（运动的合成与分解：最短时间和最短位移）
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Scene2 from './scene2'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { boatAt, cross, fmt, HEADS, RIVER, type HeadKey } from './physics'
import { useRun } from './run'

const TASKS: Task[] = [
  { id: 'straight', text: '船头正对对岸，开过去，记下数据', note: '6 s 就到了，可是被水往下游带了 18 m' },
  { id: 'up', text: '船头偏向上游 37°，再开一次，记下数据', note: '用了 7.5 s，但正好在正对岸靠岸，只走了 30 m' },
  { id: 'cmp', text: '把两次比一比', note: '过河时间只看垂直河岸的分速度' },
]
const ORDER: HeadKey[] = ['straight', 'up']

export default function Lesson2() {
  const [head, setHead] = useState<HeadKey>('straight')
  const [rows, setRows] = useState<HeadKey[]>([])
  const [cmp, setCmp] = useState(false)
  const T = useTasks('gewu:projectile:2', TASKS)
  const c = cross(HEADS[head].angle)
  const run = useRun(c.time)
  useEffect(() => { run.reset() }, [head])   // eslint-disable-line react-hooks/exhaustive-deps
  const dup = rows.includes(head)
  const record = () => { if (!run.done || dup) return; const n = [...rows, head]; setRows(n); T.check(id => n.includes(id as HeadKey)) }
  const compare = () => { if (rows.length < 2) return; setCmp(true); T.check(id => id === 'cmp') }
  const resetAll = () => { setHead('straight'); setRows([]); setCmp(false); run.reset(); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'head' | 'go' | 'rec' | 'cmp' | null } = !task ? { hint: '想最快过河，船头正对对岸；想走最短的路，船头偏向上游。', next: null }
    : task.id === 'cmp' ? { hint: '按“比一比”：两次哪次快、哪次路短', next: 'cmp' }
    : head !== task.id ? { hint: `把船头换成“${HEADS[task.id as HeadKey].name}”`, next: 'head' }
    : run.running ? { hint: '冲锋舟正在过河…', next: null }
    : run.done ? { hint: '按“记录”：记下过河时间和下漂的距离', next: 'rec' }
    : { hint: '按“开船”：看冲锋舟实际往哪走', next: 'go' }
  const [bx, by] = boatAt(HEADS[head].angle, run.t ?? 0)

  return (
    <LabShell title="抛体运动" lessons={LESSONS} current="2" narration={voiced(NARRATION['2'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="冲锋舟"
      stage={<Scene2 head={head} t={run.t} done={run.done} kept={rows} />}
      lesson={<LessonBlock no="2" title="冲锋舟过河" concept="合运动由两个分运动合成" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>船过河时同时参与两个运动：相对水的运动（船速，沿船头方向）和随水往下游的运动（水速）。船实际的运动是这两个分运动的合运动，速度按平行四边形定则合成。</p>
          <p className="mt-3">两个分运动互不影响、同时进行。过河时间 = 河宽 ÷ 垂直河岸的分速度：船头正对对岸时这个分速度最大，时间最短，<span className="font-formula italic">t = d ÷ v</span><sub>船</sub> = 30 ÷ 5 = 6 s。</p>
          <p className="mt-3">要走最短的路（正对岸靠岸），合速度要垂直河岸：船头偏向上游，<span className="font-formula italic">sin θ = v</span><sub>水</sub> ÷ <span className="font-formula italic">v</span><sub>船</sub> = 0.6，θ ≈ 37°；合速度 4 m/s，用时 7.5 s。这要求船速大于水速。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两种开法都试过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">船头正对对岸时间最短（6 s）；合速度垂直河岸位移最短（30 m）</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">开船后</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{run.t === null ? '—' : run.t.toFixed(1)}<span className="ml-1 text-[15px] font-medium text-white/55">s</span></div>
            <div className="mt-1 text-[13px] text-white/60 tabular-nums">离南岸 {fmt(by, 1)} m · 下漂 {fmt(bx, 1)} m</div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <ParamTile symbol={<span style={{ color: '#ff7a59' }}>v<sub>船</sub></span>} value={String(RIVER.vBoat)} unit="m/s" />
            <ParamTile symbol={<span style={{ color: '#5ad1ff' }}>v<sub>水</sub></span>} value={String(RIVER.vWater)} unit="m/s" />
            <ParamTile symbol={<span style={{ color: '#ffd25a' }}>v<sub>合</sub></span>} value={fmt(c.v)} unit="m/s" />
          </div>
          <table className="mt-4 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">船头</th><th className="text-right font-normal">时间</th><th className="text-right font-normal">下漂</th><th className="text-right font-normal">航程</th></tr></thead>
            <tbody>{ORDER.map(k => { const r = cross(HEADS[k].angle), ok = rows.includes(k); return <tr key={k} className="border-t border-white/12"><td className="py-1.5">{HEADS[k].name}</td>
              <td className={`text-right tabular-nums ${cmp && k === 'straight' ? 'font-semibold text-[#7fe3d4]' : ''}`}>{ok ? `${fmt(r.time, 1)} s` : '—'}</td><td className="text-right tabular-nums">{ok ? `${fmt(r.drift, 0)} m` : '—'}</td>
              <td className={`text-right tabular-nums ${cmp && k === 'up' ? 'font-semibold text-[#7fe3d4]' : ''}`}>{ok ? `${fmt(r.path, 1)} m` : '—'}</td></tr> })}</tbody>
          </table>
          {cmp && <p className="row-in mt-3 rounded-xl bg-white/6 px-3 py-2.5 text-[13.5px] leading-relaxed text-white/80">正对对岸：垂直河岸的分速度是 5 m/s，时间最短。偏向上游：这个分速度只剩 4 m/s，慢了 1.5 s，但航程最短。</p>}
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'go'} pulse={next === 'go'} onClick={run.start} disabled={run.running}>{run.done ? '再开一次' : '开船'}</LabButton>
        <LabButton primary={next === 'rec'} pulse={next === 'rec'} onClick={record} disabled={!run.done || dup}>记录</LabButton>
        <LabButton primary={next === 'cmp'} pulse={next === 'cmp'} onClick={compare} disabled={rows.length < 2 || cmp}>比一比</LabButton>
      </>}
      extras={
        <Control label="船头方向">
          <Segmented label="船头方向" pulse={next === 'head'} want={next === 'head' ? task!.id as HeadKey : null} value={head} onChange={k => { if (!run.running) setHead(k) }} options={ORDER.map(k => ({ value: k, label: HEADS[k].name }))} />
        </Control>
      }
    />
  )
}
