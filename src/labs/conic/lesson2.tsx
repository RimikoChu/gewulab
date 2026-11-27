// 圆锥曲线 · 第 2 课 两钉一绳画椭圆（椭圆的定义：到两个定点的距离之和是常数）
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Scene2 from './scene2'
import { useRun } from './hooks'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { ellipseB, fmt, NAILS, STRING } from './physics'

type Key = '6' | '8' | '0'
const KEYS = NAILS.map(String) as Key[]
const NAME: Record<Key, string> = { '6': '6 dm', '8': '8 dm', '0': '0（重合）' }
const SHAPE: Record<Key, string> = { '6': '椭圆', '8': '更扁的椭圆', '0': '圆' }
const TASKS: Task[] = [
  { id: '6', text: '两钉相距 6 dm，绷紧绳子画一圈', note: '笔尖到两颗钉子的距离之和始终是绳长 10 dm：画出来的是椭圆' },
  { id: '8', text: '把两钉拉开到 8 dm，再画一圈', note: '绳长不变，钉子离得越远，椭圆越扁' },
  { id: '0', text: '把两颗钉子并到一起，再画一圈', note: '两个焦点重合，椭圆变成圆' },
]

export default function Lesson2() {
  const [k, setK] = useState<Key>('6')
  const [seen, setSeen] = useState<Key[]>([])
  const T = useTasks('gewu:conic:2', TASKS)
  const run = useRun(6.5)
  const target = Number(k) / 2, c = useSlide(target, 2.2), settled = c === target
  useEffect(() => { if (!run.done) return; const next = seen.includes(k) ? seen : [...seen, k]; if (next !== seen) setSeen(next); T.check(id => next.includes(id as Key)) }, [run.done])   // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (q: Key) => { run.reset(); setK(q) }
  const resetAll = () => { run.reset(); setK('6'); setSeen([]); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'seg' | 'draw' | null } = !task ? { hint: '三种钉距都画过了。换一个钉距再画一圈看看。', next: null }
    : k !== task.id ? { hint: task.id === '0' ? '把两颗钉子并到一起' : `把两钉的距离换成 ${task.id} dm`, next: 'seg' }
    : run.running || !settled ? { hint: run.running ? '笔在走…看两段绳长的和变不变' : '钉子在挪…', next: null } : { hint: '按“画一圈”：绷紧绳子，笔尖贴着绳子走一圈', next: 'draw' }
  const b = ellipseB(STRING / 2, target)

  return (
    <LabShell title="圆锥曲线" lessons={LESSONS} current="2" narration={voiced(NARRATION['2'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="粉笔铅笔"
      stage={<Scene2 c={c} t={run.t} ghosts={seen.filter(q => q !== k).map(q => Number(q) / 2)} />}
      lesson={<LessonBlock no="2" title="两钉一绳画椭圆" concept="到两定点的距离之和是常数" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>平面内到两个定点 <span className="font-formula italic">F₁</span>、<span className="font-formula italic">F₂</span> 的距离的和等于常数（大于 |<span className="font-formula italic">F₁F₂</span>|）的点的轨迹叫做<b className="text-white">椭圆</b>。两个定点叫椭圆的<b className="text-white">焦点</b>，两焦点间的距离叫<b className="text-white">焦距</b>。</p>
          <p className="mt-3">这里绳长就是那个常数，记作 2<span className="font-formula italic">a</span> = 10 dm；两钉的距离是焦距 2<span className="font-formula italic">c</span>。绳长必须大于钉距，不然绳子绷直了也画不出一圈。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三种钉距都画过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">椭圆上每一点到两个焦点的距离之和都相等；焦点离得越远，椭圆越扁</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再画一画</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">|PF₁| + |PF₂| = 2a</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{STRING}<span className="ml-1 text-[15px] font-medium text-white/55">dm</span></div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ParamTile symbol="2a" value={String(STRING)} unit="dm · 绳长" />
            <ParamTile symbol="2c" value={fmt(target * 2)} unit="dm · 钉距" />
            <ParamTile symbol="b" value={fmt(b)} unit="dm · 短半轴" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">画过的</h2>
          <table className="mt-1 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">钉距 2c</th><th className="font-normal">短半轴 b</th><th className="text-right font-normal">画出来的</th></tr></thead>
            <tbody>{KEYS.filter(q => seen.includes(q)).map(q => <tr key={q} className="row-in border-t border-white/12"><td className="py-1.5 tabular-nums">{q} dm</td><td className="tabular-nums">{fmt(ellipseB(STRING / 2, Number(q) / 2))} dm</td><td className="text-right font-semibold">{SHAPE[q]}</td></tr>)}</tbody>
          </table>
        </Glass>
      }
      actions={<><LabButton primary pulse={next === 'draw'} onClick={run.start} disabled={run.running || !settled}>画一圈</LabButton></>}
      extras={<Control label="两钉的距离"><Segmented label="两钉的距离" pulse={next === 'seg'} want={next === 'seg' ? task!.id as Key : null} value={k} onChange={pick} options={KEYS.map(q => ({ value: q, label: NAME[q] }))} /></Control>}
    />
  )
}
