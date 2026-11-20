// 光合作用和呼吸作用 · 第 3 课 没有二氧化碳行不行（二氧化碳是光合作用的原料）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, type Task, Segmented } from '@/components/lab/lab-shell'
import { useTasks } from '@/lab-kit'
import Scene3 from './scene3'
import { LESSONS, goLesson } from './lessons'
import { JARS, makesStarch, type JarKey } from './physics'

const TASKS: Task[] = [
  { id: 'light', text: '把两只钟罩一起放到光下', note: '两盆都先暗处理过；除了小烧杯里的液体，别的都一样' },
  { id: 'water', text: '取清水那一罩的叶片，脱色后滴碘液', note: '变蓝：罩里有二氧化碳，制造了淀粉' },
  { id: 'naoh', text: '取氢氧化钠那一罩的叶片，再检验一次', note: '不变蓝：二氧化碳被吸收了，没有制造淀粉' },
]
const blue = (k: JarKey) => makesStarch({ light: true, co2: JARS[k].co2, chloroplast: true })

export default function Lesson3() {
  const [lit, setLit] = useState(false)
  const [ready, setReady] = useState(false)   // 照够了几小时
  const [pick, setPick] = useState<JarKey>('water')
  const [tested, setTested] = useState<JarKey[]>([])
  const T = useTasks('gewu:leaf:3', TASKS)
  const shine = () => { if (lit) return; setLit(true); setTimeout(() => { setReady(true); T.check(id => id === 'light') }, 1800) }
  const dup = tested.includes(pick)
  const drop = () => { if (!ready || dup) return; const next = [...tested, pick]; setTested(next); T.check(id => id === 'light' || next.includes(id as JarKey)) }
  const resetAll = () => { setLit(false); setReady(false); setPick('water'); setTested([]); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'shine' | 'pick' | 'drop' | null } = (() => {
    if (!task) return { hint: '都做完了。两罩只差二氧化碳，结果就不一样。', next: null }
    if (!lit) return { hint: '按“照光”，让两罩一起照几小时', next: 'shine' }
    if (!ready) return { hint: '照着光…两盆得到的光一样多', next: null }
    if (pick !== task.id) return { hint: `选“${JARS[task.id as JarKey].name}”那一罩`, next: 'pick' }
    return { hint: '按“滴碘液”：摘一片叶，脱色后滴上碘液', next: 'drop' }
  })()

  return (
    <LabShell title="光合作用和呼吸作用" lessons={LESSONS} current="3" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="两只钟罩"
      stage={<Scene3 lit={lit} pick={pick} tested={tested} />}
      lesson={<LessonBlock no="3" title="没有二氧化碳行不行" concept="二氧化碳是光合作用的原料" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>氢氧化钠溶液能吸收二氧化碳。把它放进钟罩，罩里的空气就没有二氧化碳了；另一罩放清水，做对照。</p>
          <p className="mt-3">两罩得到的光、水、温度都一样，只有二氧化碳不一样。有二氧化碳的那一罩，叶片里有淀粉；没有的那一罩，叶片里没有。</p>
          <p className="mt-3"><b className="text-white">二氧化碳是光合作用必需的原料。</b>另一种原料是水。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">一罩变蓝，一罩不变</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">没有二氧化碳，叶片造不出淀粉</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">两罩只差一样东西：二氧化碳。它是光合作用的原料。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">现在选的是</div>
            <div className="mt-1 text-[30px] leading-none font-bold tracking-tight text-[#7fe3d4]">{JARS[pick].name}</div>
            <div className="mt-2 text-[13px] text-white/55">罩里{JARS[pick].co2 ? '有' : '没有'}二氧化碳</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">数据表</h2>
          {tested.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">照光以后，每一罩各取一片叶检验，结果记在这里。</p>
            : <table className="mt-1 w-full text-[13.5px]">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">小烧杯里</th><th className="font-normal">二氧化碳</th><th className="font-normal">滴碘液</th></tr></thead>
                <tbody>{tested.map(k => <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{JARS[k].name}</td><td>{JARS[k].co2 ? '有' : '没有'}</td><td className="font-semibold text-[#7fe3d4]">{blue(k) ? '变蓝' : '不变蓝'}</td></tr>)}</tbody>
              </table>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'shine'} onClick={shine} disabled={lit}>照光</LabButton>
        <LabButton primary pulse={next === 'drop'} onClick={drop} disabled={!ready || dup}>滴碘液</LabButton>
      </>}
      extras={
        <Control label="取哪一罩的叶片">
          <Segmented label="取哪一罩的叶片" pulse={next === 'pick'} want={next === 'pick' ? task!.id as JarKey : null} value={pick} onChange={setPick} options={(Object.keys(JARS) as JarKey[]).map(k => ({ value: k, label: JARS[k].name }))} />
        </Control>
      }
    />
  )
}
