// 光的折射和凸透镜成像 · 第 4 课 三条光线画出像（三条特殊光线；用作图法确定像）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import Bench, { benchAt } from './bench'
import { LESSONS, goLesson } from './lessons'
import { RAYS, imageDistance, nature } from './physics'

type U = '30' | '15'
const TASKS: Task[] = [
  { id: '30', text: '物距 30 cm：画出三条特殊光线，找到像', note: `三条光线交在透镜另一侧：${nature(30)!.text}，像距 ${imageDistance(30)} cm` },
  { id: '15', text: '把蜡烛移到 15 cm，再画一次', note: `交点更远了：${nature(15)!.text}，像距 ${imageDistance(15)} cm` },
]

export default function Lesson4() {
  const [us, setUs] = useState<U>('30')
  const [n, setN] = useState(0)
  const [did, setDid] = useState<U[]>([])
  const T = useTasks('gewu:lens:4', TASKS)
  const u = Number(us), full = n >= RAYS.length
  const draw = () => { if (full) return; const k = n + 1; setN(k); if (k >= RAYS.length) { const next = did.includes(us) ? did : [...did, us]; setDid(next); T.check(id => next.includes(id as U)) } }
  const pick = (k: U) => { setUs(k); setN(0) }
  const resetAll = () => { setUs('30'); setN(0); setDid([]); T.reset() }
  const task = T.current, last = n ? RAYS[n - 1] : null
  const { hint, next }: { hint: string; next: 'u' | 'draw' | null } = !task ? { hint: '两次都画完了。其实画两条就够定出像的位置。', next: null }
    : us !== task.id ? { hint: `把物距换成 ${task.id} cm`, next: 'u' } : full ? { hint: '三条光线交在同一点：那里就是烛焰尖的像', next: null } : { hint: `${last ? `${last.name}，${last.say}。` : ''}按“画下一条光线”`, next: 'draw' }
  const labels: Label[] = [
    { id: 'u', at: benchAt(-u / 2, -16.6), ax: 0.5, className: 'scene-tag', children: <><small>物距</small>{u} cm</> },
    { id: 'v', at: benchAt(imageDistance(u), -6 * imageDistance(u) / u - 2.2), ax: 0.5, className: 'scene-tag key transition-opacity', style: { opacity: n >= 2 ? 1 : 0 }, children: <><small>交点就是像</small>像距 {imageDistance(u)} cm</> },
  ]

  return (
    <LabShell title="折射和凸透镜" lessons={LESSONS} current="4" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="光路图"
      stage={<Bench u={u} rays={n} image={n >= 2} beam={false} dims labels={labels} />}
      lesson={<LessonBlock no="4" title="三条光线画出像" concept="从同一点发出的光，穿过透镜后又交于一点" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>从烛焰尖上发出的光有无数条，其中三条的去向一眼就知道：</p>
          <ol className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">{RAYS.map((r, i) => <li key={r.key}><b className="text-[#7fe3d4]">{i + 1}. {r.name}：</b>{r.say}</li>)}</ol>
          <p className="mt-3">它们穿过透镜后交于一点，这一点就是烛焰尖的像。画图时任选两条就能定出像的位置。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两张光路图都画完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">光线交在哪，像就在哪</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">上一课用光屏找到的像距 {imageDistance(30)} cm 和 {imageDistance(15)} cm，用作图也能得到。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">物距 {u} cm · 已经画了</div>
            <div className="mt-1 text-[40px] leading-none font-bold tracking-tight tabular-nums">{n}<span className="ml-1 text-[15px] font-medium text-white/55">条 / {RAYS.length}</span></div>
          </div>
          {n === 0
            ? <p className="mt-4 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">每按一次画出一条，这里会写下它为什么这样走。</p>
            : <ol className="mt-4 flex flex-col gap-1.5 text-[13.5px]">{RAYS.slice(0, n).map((r, i) => <li key={r.key} className="row-in rounded-xl bg-white/6 px-3 py-2"><b style={{ color: ['#ffd24a', '#7fe3d4', '#ff8fb3'][i] }}>{i + 1}. {r.name}</b><span className="ml-2 text-white/65">{r.say}</span></li>)}</ol>}
        </Glass>
      }
      actions={<><LabButton primary pulse={next === 'draw'} onClick={draw} disabled={full}>{full ? '三条都画了' : '画下一条光线'}</LabButton></>}
      extras={<Control label="物距"><Segmented label="物距" pulse={next === 'u'} want={next === 'u' ? task!.id as U : null} value={us} onChange={pick} options={[{ value: '30', label: '30 cm' }, { value: '15', label: '15 cm' }]} /></Control>}
    />
  )
}
