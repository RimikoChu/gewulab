// 光的折射和凸透镜成像 · 第 3 课 像在哪里（凸透镜成像的规律）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import Bench, { ScreenView, benchAt } from './bench'
import { LESSONS, goLesson } from './lessons'
import { F, US, imageDistance, nature } from './physics'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

type U = '30' | '20' | '15' | '5'
const TASKS: Task[] = US.map(u => ({ id: String(u), text: `物距 ${u} cm：${nature(u)!.real ? '移动光屏找到清晰的像' : '看光屏上还接不接得到像'}`, note: `${nature(u)!.text}${nature(u)!.real ? `，像距 ${imageDistance(u)} cm` : '：光屏接不到，要透过透镜去看'}` }))
const PARK = 34

export default function Lesson3() {
  const [us, setUs] = useState<U>('30')
  const [goal, setGoal] = useState(PARK)
  const [rows, setRows] = useState<U[]>([])
  const T = useTasks('gewu:lens:3', TASKS)
  const u = Number(us), n = nature(u)!, v = imageDistance(u), want = n.real ? v : 22
  const uNow = useSlide(u, 26), shifting = Math.abs(uNow - u) > 0.05
  const sx = useSlide(goal, 14), moving = Math.abs(sx - goal) > 0.05, found = goal === want && !moving, dup = rows.includes(us)
  const pick = (k: U) => { if (moving) return; setUs(k); setGoal(PARK) }
  const record = () => { if (!found || dup) return; const next = [...rows, us]; setRows(next); T.check(id => next.includes(id as U)) }
  const resetAll = () => { setUs('30'); setGoal(PARK); setRows([]); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'u' | 'find' | 'record' | null } = !task ? { hint: '四个物距都记完了。二倍焦距分大小，一倍焦距分虚实。', next: null }
    : shifting ? { hint: '蜡烛在移…', next: null }
    : moving ? { hint: '光屏在移：盯住右边的小图，像从模糊变清楚的那一处就是像的位置', next: null }
    : us !== task.id ? { hint: `把蜡烛移到离透镜 ${task.id} cm 的地方`, next: 'u' }
    : found && !dup ? { hint: n.real ? `像清楚了：${n.text}，按“记录”` : '光屏上始终没有像：这是虚像，按“记录”', next: 'record' } : { hint: '按“移动光屏找像”', next: 'find' }
  const labels: Label[] = [
    { id: 'u', at: benchAt(-uNow / 2, -16.6), ax: 0.5, className: 'scene-tag', children: <><small>物距 u</small>{uNow.toFixed(0)} cm</> },
    { id: 'v', at: benchAt(n.real ? v / 2 : -v, n.real ? -16.6 : 15), ax: 0.5, className: 'scene-tag key transition-opacity', style: { opacity: found ? 1 : 0 }, children: n.real ? <><small>像距 v</small>{v} cm</> : <><small>虚像</small>和蜡烛在同一侧，光屏接不到</> },
    ...(!n.real && found ? [{ id: 'eye', at: benchAt(31, 5), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '眼睛从这边透过透镜看' } as Label] : []),
    { id: 'f1', at: benchAt(-F, -1.5), ax: 0.5, name: true, className: 'scene-name', children: 'F' }, { id: 'f2', at: benchAt(-2 * F, -1.5), ax: 0.5, name: true, className: 'scene-name', children: '2F' },
    { id: 'f3', at: benchAt(F, -1.5), ax: 0.5, name: true, className: 'scene-name', children: 'F' }, { id: 'f4', at: benchAt(2 * F, -1.5), ax: 0.5, name: true, className: 'scene-name', children: '2F' },
  ]

  return (
    <LabShell narration={voiced(NARRATION['3'], VOICE)} title="折射和凸透镜" lessons={LESSONS} current="3" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="光屏"
      stage={<Bench u={uNow} screen={sx} image={found && !shifting} dims labels={labels}>
        {!n.real && found && <><mesh position={benchAt(31, 0)}><sphereGeometry args={[0.1, 20, 14]} /><meshStandardMaterial color="#f3e6da" roughness={0.6} /></mesh><mesh position={[benchAt(31, 0)[0] - 0.085, benchAt(31, 0)[1], benchAt(31, 0)[2]]}><sphereGeometry args={[0.04, 14, 10]} /><meshStandardMaterial color="#30343a" /></mesh></>}
      </Bench>}
      lesson={<LessonBlock no="3" title="像在哪里" concept="二倍焦距分大小，一倍焦距分虚实" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <table className="w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">物距 u</th><th className="font-normal">像的性质</th><th className="font-normal">像距 v</th></tr></thead>
            <tbody className="text-white/80">
              <tr className="border-t border-white/12"><td className="py-1.5">u &gt; 2f</td><td>倒立、缩小、实像</td><td>f &lt; v &lt; 2f</td></tr>
              <tr className="border-t border-white/12"><td className="py-1.5">u = 2f</td><td>倒立、等大、实像</td><td>v = 2f</td></tr>
              <tr className="border-t border-white/12"><td className="py-1.5">f &lt; u &lt; 2f</td><td>倒立、放大、实像</td><td>v &gt; 2f</td></tr>
              <tr className="border-t border-white/12"><td className="py-1.5">u &lt; f</td><td>正立、放大、虚像</td><td>和物体同侧</td></tr>
            </tbody>
          </table>
          <p className="mt-3">实像是实际的光会聚成的，能用光屏接住；虚像不是光真正会聚的地方，光屏接不到，只能用眼睛透过透镜看。物体正好在焦点上（u = f）时不成像。</p>
          <p className="mt-3 text-[13.5px] text-white/65">像距是用 1/u + 1/v = 1/f 算出来的，这个公式初中不要求。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四组数据都记下了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">二倍焦距分大小，一倍焦距分虚实</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">蜡烛离透镜越近，实像离得越远、也越大；近到一倍焦距以内，就只剩透镜里的虚像了。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">物距 {u} cm · 成的像</div>
            <div className="mt-1 text-[26px] leading-snug font-bold tracking-tight text-[#7fe3d4]">{found || dup ? n.text : '还没找到'}</div>
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">光屏上看到的{goal !== PARK || found ? '' : '（光屏还在远处）'}</h2>
          <ScreenView u={u} screen={sx} />
          <div className="mt-3 grid grid-cols-3 gap-2">
            <ParamTile symbol="f" value={`${F}`} unit="cm · 焦距" />
            <ParamTile symbol="u" value={`${u}`} unit="cm · 物距" />
            <ParamTile symbol="v" value={found || dup ? (n.real ? `${v}` : '接不到') : '—'} unit={n.real ? 'cm · 像距' : '虚像'} />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">数据表</h2>
          {rows.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">每换一个物距，先找到像，再按“记录”。</p>
            : <table className="mt-1 w-full text-[13.5px]">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">u / cm</th><th className="font-normal">v / cm</th><th className="font-normal">像</th></tr></thead>
                <tbody>{rows.map(k => { const m = nature(Number(k))!; return <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5 tabular-nums text-white/80">{k}</td><td className="tabular-nums">{m.real ? imageDistance(Number(k)) : '—'}</td><td className="font-semibold text-[#7fe3d4]">{m.text}</td></tr> })}</tbody>
              </table>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'find'} onClick={() => setGoal(want)} disabled={moving || shifting || goal === want}>移动光屏找像</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={!found || shifting || dup}>记录</LabButton>
      </>}
      extras={<Control label="物距"><Segmented label="物距" pulse={next === 'u'} want={next === 'u' ? task!.id as U : null} value={us} disabled={moving} onChange={pick} options={US.map(x => ({ value: String(x) as U, label: `${x} cm` }))} /></Control>}
    />
  )
}
