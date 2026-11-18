// 压强 · 第 5 课 船怎样翻过大坝（连通器；船闸）
import { useEffect, useRef, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import Scene5 from './scene5'
import { LESSONS, goLesson } from './lessons'
import { LOCK, lockBlock, lockGoal, lockNext, lockStart, type Lock5 } from './physics'
import { useTasks } from './world'

const TASKS: Task[] = [
  { id: 'in', text: '让闸室和下游相平，把船开进闸室', note: '阀门一开，闸室和下游底下连通了：水面慢慢变得一样高' },
  { id: 'up', text: '让闸室和上游相平，把船送到上游', note: '船跟着水面升了 4 m，翻过去了' },
  { id: 'stuck', text: '试一次：水面不一样高时去开闸门', note: '两边水面不平，水压着闸门，根本打不开' },
]
type Key = 'vLow' | 'vUp' | 'gLow' | 'gUp'

export default function Lesson5() {
  const [s, setS] = useState<Lock5>(lockStart)
  const [why, setWhy] = useState<string | null>(null)
  const T = useTasks('gewu:pressure:5', TASKS)
  const ref = useRef(s); ref.current = s

  // 闸室的水面朝目标高度匀速变化
  useEffect(() => {
    let raf = 0, last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const cur = ref.current, goal = lockGoal(cur), d = goal - cur.c
      if (Math.abs(d) > 1e-4) { const c = Math.abs(d) <= LOCK.rate * dt ? goal : cur.c + Math.sign(d) * LOCK.rate * dt; ref.current = { ...cur, c }; setS(ref.current) }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])
  useEffect(() => { if (!why) return; const t = setTimeout(() => setWhy(null), 3800); return () => clearTimeout(t) }, [why])

  const tap = (k: Key) => {
    const cur = ref.current, block = lockBlock(cur, k)
    if (block) { setWhy(block); if (block.includes('不一样高')) T.check(id => id === 'stuck'); return }
    ref.current = { ...cur, [k]: !cur[k] }; setS(ref.current)
  }
  const go = () => {
    const cur = ref.current
    const boat = cur.boat === 0 && cur.gLow ? 1 : cur.boat === 1 && cur.gUp ? 2 : cur.boat
    if (boat === cur.boat) { setWhy(cur.boat === 2 ? '船已经在上游了' : '前面的闸门还关着，船过不去：先让两边水面相平，再开闸门'); return }
    ref.current = { ...cur, boat: boat as 0 | 1 | 2 }; setS(ref.current)
    setTimeout(() => T.check(id => id === 'in' ? boat >= 1 : id === 'up' && boat === 2), 1800)
  }
  const again = () => { ref.current = { ...lockStart }; setS(ref.current) }
  const resetAll = () => { again(); setWhy(null); T.reset() }

  const next = lockNext(s), task = T.current
  const hint = !task ? '都做完了。可以把船放回下游，自己点阀门和闸门再过一次。'
    : task.id === 'stuck' && s.boat === 2 ? '把船放回下游，然后不开阀门，直接点下游闸门试试'
    : task.id === 'stuck' ? '试试：水面还没相平，就直接点闸门'
    : next ? `下一步：${next.text}` : s.boat === 2 ? '船到上游了' : '等闸室的水面变平…'
  const doNext = () => { if (next) { if (next.key === 'go') go(); else tap(next.key) } }

  return (
    <LabShell title="压强" lessons={LESSONS} current="5" onLesson={goLesson} banner={T.banner ?? why} onReset={resetAll} hint={hint} actionsLabel="船闸（阀门、闸门、船都可以直接点）"
      stage={<Scene5 s={s} onTap={tap} onGo={go} />}
      lesson={
        <LessonBlock no="5" title="船怎样翻过大坝" concept="底下连通了，水面就会一样高" tasks={TASKS} done={T.done} current={task?.id}
          theory={<>
            <p>上端开口、底部互相连通的容器叫<b className="text-white">连通器</b>。里面装同一种液体，液体不流动时，各部分的液面总是相平的。</p>
            <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
              <li><b className="text-[#7fe3d4]">船闸：</b>打开阀门，闸室就和上游（或下游）组成连通器</li>
              <li><b className="text-[#7fe3d4]">顺序：</b>先开阀门等水面相平，再开闸门，船才能过</li>
              <li><b className="text-[#7fe3d4]">身边的连通器：</b>茶壶、锅炉水位计、洗手池下面的弯管</li>
            </ul>
          </>} />
      }
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">船过闸了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">连通器里的水不流动时，水面相平</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">船闸就是一只大连通器：开阀门让水面相平，再开闸门，船就一级一级地翻过大坝。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再过一次</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">闸室的水深</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums text-[#7fe3d4]">{s.c.toFixed(2)}<span className="ml-1 text-[15px] font-medium text-white/55">m</span></div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">三处的水深</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ParamTile symbol="下游" value={LOCK.low.toFixed(2)} unit="m" />
            <ParamTile symbol="闸室" value={s.c.toFixed(2)} unit="m" />
            <ParamTile symbol="上游" value={LOCK.up.toFixed(2)} unit="m" />
          </div>
          <p className="mt-3 text-[13.5px] leading-snug text-white/65">{s.vLow || s.gLow ? '闸室和下游连通：水面会变得和下游一样高。' : s.vUp || s.gUp ? '闸室和上游连通：水面会变得和上游一样高。' : '阀门和闸门都关着：闸室是单独的一池水。'}</p>
          <h2 className="mt-5 text-[12.5px] text-white/55">现在的状态（点一下可以开关）</h2>
          <ul className="mt-2 grid grid-cols-2 gap-2 text-[13.5px]">
            {([['vLow', '下游阀门'], ['vUp', '上游阀门'], ['gLow', '下游闸门'], ['gUp', '上游闸门']] as [Key, string][]).map(([k, name]) => (
              <li key={k}><button onClick={() => tap(k)} aria-label={name} className="flex h-10 w-full items-center justify-between rounded-lg bg-white/6 px-3 hover:bg-white/12"><span className="text-white/70">{name}</span><b style={{ color: s[k] ? '#7fe3d4' : '#ffb394' }}>{s[k] ? '开' : '关'}</b></button></li>
            ))}
          </ul>
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={!!next && task?.id !== 'stuck'} onClick={doNext} disabled={!next}>{next ? next.text : s.boat === 2 ? '已经到上游' : '等水面变平'}</LabButton>
        <LabButton pulse={task?.id === 'stuck' && s.boat === 2} onClick={again}>把船放回下游</LabButton>
      </>}
      extras={null}
    />
  )
}
