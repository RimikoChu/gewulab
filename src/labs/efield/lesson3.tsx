// 静电场 · 第 3 课 电场线：油盘里依次换上四种电极，接通高压，看头发屑排成的电场线，读两电极连线中点的场强。
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { LESSONS, goLesson } from './lessons'
import { ST, TOP } from './layout'
import { DISH, LAYOUTS, midField, sci, type Layout } from './physics'
import { R3, Rig3, inDish } from './scene3'
import { Big, Final, Sub } from './ui'
import { Place } from './world'

const mf = (l: Layout) => l === 'same' ? '0' : sci(midField(l))
const TASKS: Task[] = [
  { id: 'single', text: '一个正电荷：接通高压，看电场线', note: '电场线从正电荷出发，向四周散开；离得越远越稀，电场越弱' },
  { id: 'dipole', text: '换成等量异种电荷，接通高压', note: `电场线从正电荷到负电荷；中点的场强 ${mf('dipole')} N/C` },
  { id: 'same', text: '换成等量同种电荷，接通高压', note: '电场线互相排开，中点一条也没有：场强为 0' },
  { id: 'plates', text: '换成平行板，接通高压', note: `板间的电场线平行、等距：匀强电场，${mf('plates')} V/m` },
]
const X = ST.l3

export default function Lesson3() {
  const [layout, setLayout] = useState<Layout>('single')
  const [on, setOn] = useState(false)
  const T = useTasks('gewu:efield:3', TASKS)
  const level = useSlide(on ? 1 : 0, 0.8)
  useEffect(() => { if (on && level >= 1) T.check(id => id === layout) }, [on, level, layout])   // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (l: Layout) => { setOn(false); setLayout(l) }
  const resetAll = () => { setLayout('single'); setOn(false); T.reset() }

  const task = T.current
  type Next = 'layout' | 'on' | null
  const { hint, next }: { hint: string; next: Next } = (() => {
    if (!task) return { hint: '电场线越密的地方，电场越强。', next: null }
    if (layout !== task.id) return { hint: `把电极换成${LAYOUTS[task.id as Layout].name}`, next: 'layout' }
    return on ? { hint: '头发屑沿电场线排开了…', next: null } : { hint: '接通高压，看头发屑怎样排', next: 'on' }
  })()

  const mark: [number, number] = layout === 'single' ? [DISH.a, 0] : [0, 0], m = inDish(mark)
  const shown = on && level >= 1
  const labels: Label[] = [
    { id: 'n1', at: [X + 0.17, TOP + 0.05, 0.02], ax: 0, name: true, className: 'scene-name', children: '油盘：蓖麻油和头发屑' },
    { id: 'n2', at: [X - 0.1, TOP + 0.02 + R3.bar + 0.03, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '电极横梁' },
    { id: 'e', at: [X + m[0], TOP + 0.02 + m[1] + 0.012, m[2]], ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: shown ? 1 : 0 }, children: <><small>{layout === 'single' ? '距电荷 0.06 m' : '中点'}</small>{mf(layout)} {layout === 'plates' ? 'V/m' : 'N/C'}</> },
  ]
  return (
    <LabShell title="静电场" lessons={LESSONS} current="3" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['3'], VOICE)} actionsLabel="高压电源"
      stage={<Place at="l3" cur="l3" labels={labels}><Rig3 layout={layout} level={level} mark={mark} /></Place>}
      lesson={<LessonBlock no="3" title="电场线" concept="电场线的疏密表示强弱，切线表示方向" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>电场线是为了形象地描述电场画出来的线，电场里并没有这些线。</p>
          <p className="mt-3">电场线从<b className="text-white">正电荷或无限远出发，终止于无限远或负电荷</b>；线上每一点的切线方向就是那一点的电场强度方向；电场线密的地方电场强，疏的地方电场弱；两条电场线不相交。</p>
          <p className="mt-3">几个电荷同时存在时，某一点的电场强度是各个电荷单独在那一点产生的电场强度的矢量和。等量同种电荷连线的中点，两个电场大小相等、方向相反，合起来是 0。</p>
          <p className="mt-3">各处电场强度大小相等、方向相同的电场叫匀强电场，它的电场线是间隔相等的平行线。</p>
          <p className="mt-3 text-white/60">油盘里的头发屑在电场里被极化，首尾相接排成一串。画面上把它们连成了线。</p>
        </>} />}
      finale={T.finale && <Final kicker="四种电极都看过了" title="电场线从正电荷出发、到负电荷终止；越密电场越强"
        body={<>连线中点：等量异种 {mf('dipole')} N/C，等量同种 0；平行板之间是匀强电场。</>} />}
      panel={
        <Glass className="px-4 py-4">
          <Big formula={layout === 'plates' ? 'E = U / d' : 'E = k Q / r²（叠加）'} value={shown ? mf(layout) : '—'} unit={layout === 'plates' ? 'V/m' : 'N/C'} note={!shown ? '接通高压以后读数' : layout === 'single' ? '距电荷 0.06 m 处的场强' : layout === 'plates' ? '两板之间的场强' : '两电极连线中点的场强'} />
          <Sub>关键参数</Sub>
          {layout === 'plates' ? <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="U" value={String(DISH.U)} unit="V · 两板电压" />
            <ParamTile symbol="d" value={DISH.d.toFixed(2)} unit="m · 两板距离" />
          </div> : <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="Q" value={sci(DISH.Q)} unit="C · 每个电极" />
            <ParamTile symbol={layout === 'single' ? 'r' : '2a'} value={(layout === 'single' ? DISH.a : DISH.a * 2).toFixed(2)} unit={layout === 'single' ? 'm · 到电荷' : 'm · 两电极相距'} />
          </div>}
          <p className="mt-3 text-[12.5px] text-white/55">{shown ? '几个电荷各自的电场叠加起来，就是画面上的样子。箭头是电场的方向。' : '白色小圈是读场强的位置。'}</p>
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'on'} onClick={() => setOn(o => !o)}>{on ? '断开高压' : '接通高压'}</LabButton>
      </>}
      extras={<Control label="电极"><Segmented label="电极" pulse={next === 'layout'} want={next === 'layout' ? task!.id as Layout : null} value={layout} onChange={pick} options={(Object.keys(LAYOUTS) as Layout[]).map(k => ({ value: k, label: LAYOUTS[k].name }))} /></Control>}
    />
  )
}
