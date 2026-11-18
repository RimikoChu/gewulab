// 压强 · 第 1 课 压出来的坑（压力的作用效果和压力大小、受力面积有关）
import { useEffect, useRef, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import Scene1 from './scene1'
import { LESSONS, goLesson } from './lessons'
import { POSES, kN, solve1, type PoseKey } from './physics'
import { useTasks } from './world'

interface Row { id: number; pose: PoseKey; n: number; F: number; S: number; sink: number }
const TASKS: Task[] = [
  { id: 'flat', text: '平放一块，放到沙地上，记下坑深', note: '先有一个比较的基准' },
  { id: 'area', text: '换成侧放或立放，再记一次', note: '压力没变，着地的面积小了，坑更深' },
  { id: 'force', text: '平放，再叠上一块，记一次', note: '面积没变，压力大了，坑也更深' },
]
const ORDER: PoseKey[] = ['flat', 'side', 'end']

export default function Lesson1() {
  const [pose, setPose] = useState<PoseKey>('flat')
  const [n, setN] = useState(1)
  const [down, setDown] = useState(false)
  const [pit, setPit] = useState<{ w: number; depth: number } | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [settled, setSettled] = useState(false)
  const [tapped, setTapped] = useState(false)
  const T = useTasks('gewu:pressure:1', TASKS)
  const r = solve1(pose, n)

  // 放下去以后过一会儿才算压实，坑留在沙地上
  useEffect(() => {
    setSettled(false); if (!down) return
    const t = setTimeout(() => { setSettled(true); setPit({ w: POSES[pose].w, depth: r.sink }) }, 1300)
    return () => clearTimeout(t)
  }, [down, pose, n])   // eslint-disable-line react-hooks/exhaustive-deps
  const change = (k: PoseKey) => { if (k === pose) return; setDown(false); setPose(k); setTapped(true) }
  const stack = () => { setDown(false); setN(x => (x === 1 ? 2 : 1)) }
  const dup = rows.some(x => x.pose === pose && x.n === n)
  const record = () => {
    if (!settled || dup) return
    const next = [...rows, { id: Date.now(), pose, n, ...r }]
    setRows(next)
    const has = (f: (x: Row) => boolean) => next.some(f)
    T.check(id => id === 'flat' ? has(x => x.pose === 'flat' && x.n === 1) : id === 'area' ? has(x => x.pose !== 'flat' && x.n === 1) && has(x => x.n === 1 && x.pose === 'flat') : has(x => x.pose === 'flat' && x.n === 2) && has(x => x.pose === 'flat' && x.n === 1))
  }
  const resetAll = () => { setPose('flat'); setN(1); setDown(false); setPit(null); setRows([]); setTapped(false); T.reset() }

  const task = T.current
  const want = task?.id === 'flat' ? { flat: true, n: 1 } : task?.id === 'area' ? { flat: false, n: 1 } : { flat: true, n: 2 }
  const { hint, next }: { hint: string; next: 'down' | 'record' | 'pose' | 'stack' | null } = (() => {
    if (!task) return { hint: '都做完了。换别的放法再试试，看坑有多深。', next: null }
    if ((pose === 'flat') !== want.flat) return { hint: want.flat ? '把混凝土块换回平放' : '换成侧放或立放（也可以直接点一下混凝土块）', next: 'pose' }
    if (n !== want.n) return { hint: want.n === 2 ? '再叠上一块' : '拿走上面那一块', next: 'stack' }
    if (!down) return { hint: '把它放到沙地上', next: 'down' }
    if (!settled) return { hint: '压实了…', next: null }
    return dup ? { hint: '这一组记过了', next: null } : { hint: '按“记录数据”，记下坑有多深', next: 'record' }
  })()

  const keys = useRef({ record, toggle: () => setDown(d => !d) }); keys.current = { record, toggle: () => setDown(d => !d) }
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.tagName === 'BUTTON' && e.key === ' ') return
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); keys.current.toggle() }
      else if (e.key === ' ') { e.preventDefault(); keys.current.record() }
    }
    window.addEventListener('keydown', on); return () => window.removeEventListener('keydown', on)
  }, [])

  return (
    <LabShell title="压强" lessons={LESSONS} current="1" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="混凝土块（点一下它可以换放法）"
      stage={<Scene1 pose={pose} n={n} down={down} sink={r.sink} pit={pit} F={r.F} S={r.S} onTap={() => change(ORDER[(ORDER.indexOf(pose) + 1) % 3])} tapHint={next === 'pose' && !tapped} />}
      lesson={
        <LessonBlock no="1" title="压出来的坑" concept="压得多重、压在多大一块地方，都算数" tasks={TASKS} done={T.done} current={task?.id}
          theory={<>
            <p>垂直压在物体表面上的力叫<b className="text-white">压力</b>。压力的作用效果，要看两件事：</p>
            <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
              <li><b className="text-[#7fe3d4]">压力：</b>受力面积相同时，压力越大，效果越明显</li>
              <li><b className="text-[#7fe3d4]">受力面积：</b>压力相同时，受力面积越小，效果越明显</li>
            </ul>
            <p className="mt-3 text-[13.5px] text-white/65">每次只改一个条件，另一个保持不变，才比得出来。</p>
          </>} />
      }
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三组数据都记完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">压力的效果，看压力，也看受力面积</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-left text-[14px] text-white/80">
            <li className="rounded-lg bg-white/8 px-3 py-2">压力一样，受力面积越小，坑越深</li>
            <li className="rounded-lg bg-white/8 px-3 py-2">受力面积一样，压力越大，坑越深</li>
          </ul>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再试一试</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">沙地上的坑</div>
            <div key={String(settled)} className={settled ? 'pop mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums text-[#7fe3d4]' : 'mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums'}>{settled ? Math.round(r.sink * 100) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">cm 深</span></div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ParamTile symbol="F" value={kN(r.F)} unit="kN · 压力" />
            <ParamTile symbol="S" value={r.S.toFixed(1)} unit="m² · 着地面积" />
            <ParamTile symbol="放法" value={POSES[pose].name} unit={n === 2 ? '叠了两块' : '一块'} />
          </div>
          <p className="mt-3 text-[13.5px] leading-snug text-white/65">{!down ? '混凝土块吊在半空。它对沙地的压力，就等于它的重力。' : '同一块混凝土，放法不同，着地的面积不同。'}</p>
          <div className="mt-5 flex items-baseline justify-between">
            <h2 className="text-[12.5px] text-white/55">数据表</h2>
            {rows.length > 0 && <button onClick={() => setRows([])} className="h-7 rounded-md px-2 text-[12.5px] text-white/55 hover:bg-white/10">清空</button>}
          </div>
          {rows.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">放到沙地上以后按“记录数据”。</p>
            : <table className="mt-1 w-full text-[13.5px] tabular-nums">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">放法</th><th className="text-right font-normal">压力/kN</th><th className="text-right font-normal">面积/m²</th><th className="text-right font-normal">坑深/cm</th></tr></thead>
                <tbody>{rows.map(x => (
                  <tr key={x.id} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{POSES[x.pose].name}{x.n === 2 ? ' ×2' : ''}</td><td className="text-right">{kN(x.F)}</td><td className="text-right">{x.S.toFixed(1)}</td><td className="text-right font-semibold text-[#7fe3d4]">{Math.round(x.sink * 100)}</td></tr>
                ))}</tbody>
              </table>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'down'} onClick={() => setDown(d => !d)}>{down ? '吊起来' : '放到沙地上'}</LabButton>
        <LabButton pulse={next === 'stack'} onClick={stack}>{n === 1 ? '再叠一块' : '拿走一块'}</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={!settled || dup}>记录数据</LabButton>
      </>}
      extras={
        <Control label="怎么放">
          <Segmented label="怎么放" pulse={next === 'pose'} value={pose} onChange={k => change(k as PoseKey)} options={ORDER.map(k => ({ value: k, label: POSES[k].name }))} />
        </Control>
      }
    />
  )
}
