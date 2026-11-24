// 呼吸 · 第 2 课 肺和肺泡：让肺变透明，看支气管从气管开始一级级分下去，末端是一串串肺泡；推近到放大的肺泡，剖开看壁有多薄、外面缠着的毛细血管。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { LOOK, Place, useRun } from './parts'
import { TREE_LEVELS, WALLS, layersToCross } from './physics'
import { ALV_AT, at } from './world'
import type { V3 } from './sdf'

const TASKS: Task[] = [
  { id: 'tree', text: '让肺变透明，看支气管一级级分下去', note: `支气管越分越细，模型里画了 ${TREE_LEVELS} 级，末端连着肺泡` },
  { id: 'zoom', text: '推近到肺泡', note: '肺泡像一串葡萄挂在细支气管的末端，外面缠着毛细血管' },
  { id: 'cut', text: '剖开肺泡，看壁有多薄', note: '肺泡是空的，壁只有一层细胞' },
  { id: 'count', text: '数一数：肺泡里的气到血液里要穿过几层细胞', note: `肺泡壁一层、毛细血管壁一层，一共 ${layersToCross()} 层` },
]

export default function Lesson2() {
  const [zoom, setZoom] = useState(false)
  const [counting, setCounting] = useState(false)
  const T = useTasks('gewu:breath:2', TASKS)
  const tree = useRun(4.5, () => T.check(id => id === 'tree'))
  const cut = useRun(2.4, () => { T.check(id => id === 'cut'); setCounting(true) })
  useEffect(() => { if (!zoom) return; const t = setTimeout(() => T.check(id => id === 'zoom'), 2600); return () => clearTimeout(t) }, [zoom])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!counting) return; const t = setTimeout(() => { setCounting(false); T.check(id => id === 'count') }, 3600); return () => clearTimeout(t) }, [counting])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { tree.snap(0); cut.snap(0); setZoom(false); setCounting(false); T.reset() }
  const task = T.current
  const lv = Math.min(TREE_LEVELS, Math.floor(tree.k * TREE_LEVELS + 1e-6))
  const { hint, next }: { hint: string; next: 'tree' | 'zoom' | 'cut' | null } = !task ? { hint: '肺泡数目多、壁很薄，外面缠着毛细血管，适于和血液进行气体交换。', next: null }
    : tree.busy ? { hint: `支气管分到了第 ${Math.max(1, lv)} 级…`, next: null }
    : task.id === 'tree' ? { hint: '两肺挡着看不见里面。按“看支气管树”', next: 'tree' }
    : task.id === 'zoom' ? (zoom ? { hint: '镜头推近到肺泡…', next: null } : { hint: '末端那些小泡就是肺泡。按“推近到肺泡”', next: 'zoom' })
    : cut.busy ? { hint: '剖开肺泡…', next: null }
    : task.id === 'cut' ? { hint: '外面缠着的是毛细血管，蓝的一头流进来，红的一头流出去。按“剖开肺泡”', next: 'cut' }
    : { hint: '数一数：氧要穿过哪几层', next: null }
  const labels: Label[] = !zoom ? [
    { id: 'tr', at: [0.12, 15.0, -0.1], ax: 0, className: 'scene-name -translate-y-1/2', name: true, children: '气管' },
    ...(tree.k > 0.12 ? [{ id: 'b1', at: [0.75, 13.75, -0.2] as V3, ax: 0, className: 'scene-tag -translate-y-1/2', children: '支气管' }] : []),
    ...(tree.k > 0.95 || T.done.tree ? [{ id: 'al', at: [-1.35, 12.2, 0.4] as V3, ax: 1, className: 'scene-tag key -translate-y-1/2', children: '末端：肺泡' }] : []),
    { id: 'rl', at: [-1.2, 14.4, 0.2], ax: 1, className: 'scene-name -translate-y-1/2', name: true, children: '右肺' },
    { id: 'll', at: [1.2, 14.4, 0.2], ax: 0, className: 'scene-name -translate-y-1/2', name: true, children: '左肺' },
  ] : [
    { id: 'br', at: at(ALV_AT, [-1.9, 1.7, -0.3]), ax: 0.5, className: 'scene-name -translate-y-full', children: '细支气管' },
    { id: 'alv', at: at(ALV_AT, [0.5, 1.6, 0]), ax: 0.5, className: 'scene-tag -translate-y-full', children: '肺泡' },
    { id: 'in', at: at(ALV_AT, [-1.5, -1.7, 0.4]), ax: 0.5, className: 'scene-tag', children: <><small>流进来</small><span className="text-[#2f55b5]">静脉血</span></> },
    { id: 'out', at: at(ALV_AT, [2.0, 1.75, 0.2]), ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>流出去</small><span className="text-[#c0392b]">动脉血</span></> },
    ...(cut.k > 0.9 ? [{ id: 'w', at: at(ALV_AT, [-0.2, -0.95, 0.05]), ax: 1, className: 'scene-tag key -translate-y-1/2', children: <><small>肺泡壁</small>一层细胞</> }] : []),
    ...(counting || T.done.count ? [{ id: 'c', at: at(ALV_AT, [1.45, -0.45, 0.3]), ax: 0, className: 'scene-tag key -translate-y-1/2', children: <><small>毛细血管壁</small>一层细胞</> }] : []),
    { id: 'mag', at: at(ALV_AT, [0, -2.35, 0]), ax: 0.5, name: true, className: 'scene-name', children: '放大的示意' },
  ]
  return (
    <LabShell title="呼吸" lessons={LESSONS} current="2" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['2'], VOICE)} actionsLabel="肺"
      stage={<Place at={zoom ? 'alv' : 'tree'} labels={labels} want={{ look: { ...LOOK, skin: 0.5, bones: 0.18, inter: 0.08, dia: 0.35, lungs: 0.92 - 0.8 * Math.min(1, tree.k * 4), tree: T.done.tree ? 1 : tree.k }, alv: { cut: cut.k, flow: true } }} />}
      lesson={<LessonBlock no="2" title="肺和肺泡" concept="肺泡多、壁薄，外面缠着毛细血管" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p><b className="text-white">肺</b>位于胸腔内，左右各一，是气体交换的器官。支气管进入肺后反复分支，越分越细，最细的分支末端形成许多<b className="text-white">肺泡</b>。</p>
          <p className="mt-3">肺泡数目很多，外面缠绕着丰富的毛细血管和弹性纤维。<b className="text-white">肺泡壁和毛细血管壁都很薄，只由一层上皮细胞构成</b>，有利于肺泡和血液之间进行气体交换。</p>
          <p className="mt-3 text-[13.5px] text-white/65">真实的支气管分支级数比模型多得多；肺泡模型放大了很多倍，是示意。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">从气管一路看到了肺泡</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">肺泡数目多，壁只有一层细胞，外面缠着毛细血管</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">肺泡里的氧到血液里，只要穿过肺泡壁和毛细血管壁两层细胞。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">支气管分了</div>
            <div className="mt-1 text-[44px] leading-none font-bold tabular-nums">{T.done.tree ? TREE_LEVELS : tree.k > 0 ? Math.max(1, lv) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">级（模型）</span></div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">氧从肺泡到血液要穿过</h2>
          <div className="mt-2 flex flex-col gap-2">
            {WALLS.map((w, i) => <div key={w.name} className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-[14px] ${(i === 0 ? cut.k > 0.9 : counting || T.done.count) ? 'bg-[#35c7b3]/20' : 'bg-white/[0.05] text-white/45'}`}><span>{w.name}</span><b className="tabular-nums">{(i === 0 ? cut.k > 0.9 : counting || T.done.count) ? `${w.cells} 层细胞` : '?'}</b></div>)}
            <div className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2.5 text-[14px]"><span>一共</span><b className="text-[20px] tabular-nums">{counting || T.done.count ? `${layersToCross()} 层` : '?'}</b></div>
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'tree'} pulse={next === 'tree'} onClick={() => tree.run(1, 0)} disabled={tree.busy || T.done.tree}>看支气管树</LabButton>
        <LabButton primary={next === 'zoom'} pulse={next === 'zoom'} onClick={() => setZoom(z => !z)} disabled={!T.done.tree || cut.busy}>{zoom ? '回到两肺' : '推近到肺泡'}</LabButton>
        <LabButton primary={next === 'cut'} pulse={next === 'cut'} onClick={() => { setZoom(true); cut.run(1, 0) }} disabled={!T.done.zoom || cut.busy || cut.k > 0.99}>剖开肺泡</LabButton>
      </>}
      extras={null}
    />
  )
}
