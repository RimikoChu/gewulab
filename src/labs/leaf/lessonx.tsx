// 光合作用和呼吸作用 · 拓展课：三个小实验。钟罩里的蜡烛（普利斯特利、英格豪斯）、柳树吃的是土吗（海尔蒙特）、银边天竺葵。
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks } from '@/lab-kit'
import SceneX, { type Sub } from './scenex'
import { LESSONS, goLesson } from './lessons'
import { WILLOW, willowAt, willowGain } from './physics'

const SUBS: Record<Sub, { name: string; title: string; say: string }> = {
  jars: { name: '钟罩里的蜡烛', title: '植物能让空气“变好”，但要有光', say: '只有蜡烛的那一罩，氧气烧完就灭了。有植物又有光的那一罩，植物不断放出氧气，蜡烛一直烧着。把植物罩在暗处，它不进行光合作用，蜡烛照样熄灭。' },
  willow: { name: '柳树吃的是土吗', title: '树长了七十多千克，土几乎没少', say: `五年里只浇雨水，柳树从 ${WILLOW.tree0} kg 长到 ${WILLOW.tree1} kg，土只少了大约 ${WILLOW.soilLost} g。可见树长出来的东西主要不是从土里来的。海尔蒙特当时以为全来自水；后来人们才知道，还有空气里的二氧化碳。` },
  rim: { name: '银边天竺葵', title: '没有叶绿体的地方，造不出淀粉', say: '这种天竺葵的叶子边缘是白色的，那里的细胞没有叶绿体。同一片叶子照同样的光，只有绿色的部分变蓝：叶绿体是光合作用的场所。' },
}
const ORDER: Sub[] = ['jars', 'willow', 'rim']
const TASKS: Task[] = [
  { id: 'jars', text: '钟罩：点燃三支蜡烛，看哪一支能一直烧', note: '只有“有植物、又有光”的那一罩' },
  { id: 'willow', text: '柳树：过五年，比较树和土的重量变化', note: `树重了约 ${willowGain().toFixed(1)} kg，土只少了约 ${WILLOW.soilLost} g` },
  { id: 'rim', text: '银边天竺葵：照光后滴碘液，看哪里变蓝', note: '绿色的部分变蓝，银边不变' },
]

export default function LessonX() {
  const [sub, setSub] = useState<Sub>('jars')
  const [lit, setLit] = useState(false)
  const [yGoal, setYGoal] = useState(0)
  const [rim, setRim] = useState(0)
  const [rimReady, setRimReady] = useState(false)
  const T = useTasks('gewu:leaf:x', TASKS)
  const burn = useSlide(lit ? 1 : 0, 0.28), years = useSlide(yGoal, 1.4)
  useEffect(() => { if (burn >= 1) T.check(id => id === 'jars') }, [burn >= 1])        // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (years >= WILLOW.years) T.check(id => id === 'willow') }, [years >= WILLOW.years])   // eslint-disable-line react-hooks/exhaustive-deps
  const shine = () => { if (rim) return; setRim(1); setTimeout(() => setRimReady(true), 1600) }
  const drop = () => { if (!rimReady || rim >= 2) return; setRim(2); T.check(id => id === 'rim') }
  const resetAll = () => { setSub('jars'); setLit(false); setYGoal(0); setRim(0); setRimReady(false); T.reset() }

  const task = T.current, w = willowAt(years)
  const { hint, next }: { hint: string; next: 'sub' | 'fire' | 'years' | 'shine' | 'drop' | null } = (() => {
    if (!task) return { hint: '三个小实验都做完了。', next: null }
    if (sub !== task.id) return { hint: `接着做：${SUBS[task.id as Sub].name}`, next: 'sub' }
    if (sub === 'jars') return lit ? { hint: '盯住三支蜡烛…', next: null } : { hint: '按“点燃蜡烛”，三只钟罩一起罩上', next: 'fire' }
    if (sub === 'willow') return yGoal ? { hint: '一年年过去，只浇雨水…', next: null } : { hint: '按“过五年”', next: 'years' }
    if (!rim) return { hint: '按“照光”（这盆已经暗处理过）', next: 'shine' }
    return rimReady ? { hint: '按“滴碘液”：摘一片叶，脱色后滴上碘液', next: 'drop' } : { hint: '照着光…', next: null }
  })()

  return (
    <LabShell title="光合作用和呼吸作用" lessons={LESSONS} current="x" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={SUBS[sub].name}
      stage={<SceneX sub={sub} burn={burn} years={years} rim={rim} />}
      lesson={<LessonBlock no="拓展" title={SUBS[sub].name} concept={SUBS[sub].title} tasks={TASKS} done={T.done} current={task?.id}
        theory={<p>{SUBS[sub].say}</p>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三个小实验都做完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">光合作用的每一条结论，都是这样一点点试出来的</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">原料是二氧化碳和水，条件是光，场所是叶绿体，产物是有机物和氧气。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{SUBS[sub].name}</div>
            <div className="mt-1 text-[24px] leading-snug font-bold tracking-tight text-[#7fe3d4]">{sub === 'jars' ? (burn >= 1 ? '只有一支还烧着' : lit ? '都烧着' : '还没点') : sub === 'willow' ? `树重 ${w.tree.toFixed(1)} kg` : rim >= 2 ? '只有绿色部分变蓝' : rim ? '照过光了' : '还没照光'}</div>
          </div>
          {sub === 'willow' && <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="柳树" value={`+${(w.tree - WILLOW.tree0).toFixed(1)}`} unit="kg · 比刚种时重了" />
            <ParamTile symbol="土" value={`−${w.soilLost.toFixed(0)}`} unit="g · 比刚种时轻了" />
          </div>}
          {T.done[sub] && <p className="row-in mt-4 rounded-xl bg-white/6 px-3 py-3 text-[14px] leading-relaxed text-white/80">{SUBS[sub].say}</p>}
        </Glass>
      }
      actions={{
        jars: <><LabButton primary pulse={next === 'fire'} onClick={() => setLit(true)} disabled={lit}>点燃蜡烛</LabButton></>,
        willow: <><LabButton primary pulse={next === 'years'} onClick={() => setYGoal(WILLOW.years)} disabled={yGoal > 0}>过五年</LabButton></>,
        rim: <><LabButton pulse={next === 'shine'} onClick={shine} disabled={rim > 0}>照光</LabButton><LabButton primary pulse={next === 'drop'} onClick={drop} disabled={!rimReady || rim >= 2}>滴碘液</LabButton></>,
      }[sub]}
      extras={
        <Control label="小实验">
          <Segmented label="小实验" pulse={next === 'sub'} want={next === 'sub' ? task!.id as Sub : null} value={sub} onChange={setSub} options={ORDER.map(k => ({ value: k, label: SUBS[k].name }))} />
        </Control>
      }
    />
  )
}
