// 生态系统 · 第 1 课 生物和环境：在实验盒里探究光对鼠妇分布的影响。放入 10 只鼠妇，左边盖遮光板、右边盖玻璃板，
// 每分钟统计一次两侧的只数，共 10 次，再算阴暗一侧的平均值。
import { useEffect, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { ABIOTIC, DARK, WOODLICE, average } from './physics'
import { useRun } from './parts'
import Scene1, { BOX, JAR } from './scene1'
import { Finale, H } from './ui'
import { VOICE } from './voice'
import { Room } from './world'

const TASKS: Task[] = [
  { id: 'put', text: `往实验盒里放入 ${WOODLICE} 只鼠妇`, note: '刚放进去时，鼠妇在两边到处爬' },
  { id: 'cover', text: '盖上遮光板：左边阴暗，右边明亮', note: '两边只有光不同，其他条件都一样' },
  { id: 'count', text: '每分钟统计一次两侧的只数，统计 10 次', note: '鼠妇越来越多地爬到了阴暗的一侧' },
  { id: 'avg', text: '算出阴暗一侧的平均只数', note: `平均 ${average(DARK).toFixed(1)} 只在阴暗处` },
]
const avg = average(DARK)

export default function Lesson1() {
  const [put, setPut] = useState(false), [cover, setCover] = useState(false), [n, setN] = useState(0), [running, setRunning] = useState(false), [showAvg, setShowAvg] = useState(false)
  const T = useTasks('gewu:eco:1', TASKS)
  const placed = useRun(put ? 1 : 0, 1.6), lid = useRun(cover ? 1 : 0, 1.2)
  // 统计：每 1.5 秒算“一分钟”，数一次
  useEffect(() => { if (!running) return; if (n >= DARK.length) { setRunning(false); return } const t = setTimeout(() => setN(k => k + 1), n === 0 ? 900 : 1500); return () => clearTimeout(t) }, [running, n])
  useEffect(() => { T.check(id => id === 'put' ? placed >= 1 : id === 'cover' ? lid >= 1 : id === 'count' ? n >= DARK.length : id === 'avg' ? showAvg : false) }, [placed >= 1, lid >= 1, n, showAvg])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setPut(false); setCover(false); setN(0); setRunning(false); setShowAvg(false); T.reset() }
  // 盒里实际该有几只在暗处：没盖之前一半一半；盖上以后按统计的数
  const dark = !cover ? 5 : n === 0 ? 6 : DARK[Math.min(n, DARK.length) - 1]
  const cur = n > 0 ? DARK[n - 1] : null
  const busy = (put && placed < 1) || (cover && lid < 1) || running
  const task = T.current
  const { hint, next }: { hint: string; next: 'act' | 'avg' | null } = (() => {
    if (!task) return { hint: '做完了。光会影响鼠妇的分布：它们喜欢阴暗的环境。实验完把鼠妇放回大自然。', next: null }
    if (busy) return { hint: running ? `统计中：第 ${n} 次…` : '…', next: null }
    if (task.id === 'put') return { hint: '先把 10 只鼠妇放进实验盒', next: 'act' }
    if (task.id === 'cover') return { hint: '鼠妇在盒里到处爬。盖上遮光板，让左边阴暗、右边明亮', next: 'act' }
    if (task.id === 'count') return { hint: '两边的土一样湿，只有光不同。开始统计：每分钟数一次两边的只数', next: 'act' }
    return { hint: '统计完了。算出阴暗一侧 10 次的平均只数', next: 'avg' }
  })()
  const act = () => { if (!put) setPut(true); else if (!cover) setCover(true); else if (n === 0) { setRunning(true) } }
  const label = !put ? '放入鼠妇' : !cover ? '盖上遮光板' : '开始统计'
  const y = BOX.y + BOX.h + 0.01
  const labels: Label[] = [
    ...(cover ? [
      { id: 'dk', at: [BOX.x - BOX.w / 4, y + 0.02, BOX.z - BOX.d / 2] as [number, number, number], ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>阴暗</small>{cur ?? '—'} 只</> },
      { id: 'lt', at: [BOX.x + BOX.w / 4, y + 0.02, BOX.z - BOX.d / 2] as [number, number, number], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>明亮</small>{cur === null ? '—' : WOODLICE - cur} 只</> },
    ] : []),
    { id: 'nb', at: [BOX.x + BOX.w / 2, BOX.y + 0.02, BOX.z + BOX.d / 2], name: true, className: 'scene-name', children: '实验盒（底上铺湿土）' },
    { id: 'nj', at: [JAR[0], JAR[1] + 0.13, JAR[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '鼠妇' },
    ...(cover ? [{ id: 'nc', at: [BOX.x - BOX.w / 2, y, BOX.z + BOX.d / 2] as [number, number, number], name: true, className: 'scene-name', children: '遮光板' }, { id: 'ng', at: [BOX.x + BOX.w / 2 - 0.06, y, BOX.z + BOX.d / 2] as [number, number, number], name: true, className: 'scene-name', children: '玻璃板' }] : []),
  ]
  return (
    <LabShell title="生态系统" lessons={LESSONS} current="1" narration={voiced(NARRATION['1'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="鼠妇实验"
      stage={<Room at="s1" labels={labels} shift={[put ? 0.02 : -0.08, 0, 0]} span={put ? [0.44, 0.26] : [0.66, 0.34]}><Scene1 placed={placed} cover={lid} dark={dark} /></Room>}
      lesson={<LessonBlock no="1" title="生物和环境" concept="光会影响鼠妇的分布" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>环境中影响生物生活和分布的因素叫做<b className="text-white">生态因素</b>，分为非生物因素和生物因素。非生物因素有{ABIOTIC.join('、')}等。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>这个实验只让“光”不同，别的条件（湿度、温度、土）都一样：这叫<b className="text-white">控制单一变量</b>。</li>
            <li>明亮的一侧是对照组。只用一只鼠妇、只数一次，结果可能是偶然的，所以用 10 只、数 10 次、取平均值。</li>
          </ul>
        </>} />}
      finale={T.finale && <Finale kicker="10 次都数完了" title="光会影响鼠妇的分布" text={`10 次统计里，阴暗一侧平均有 ${avg.toFixed(1)} 只，明亮一侧平均只有 ${(WOODLICE - avg).toFixed(1)} 只。鼠妇适于生活在阴暗的环境中。实验完要把鼠妇放回大自然。`} notes="遮光板画成半透明，好看到下面的鼠妇；鼠妇画得比真的大一倍。10 次的只数是一组典型结果。" onClose={() => T.setFinale(false)} />}
      panel={
        <Glass className="px-4 py-4">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl bg-white/8 py-3"><div className="text-[13px] text-white/60">阴暗</div><div className="text-[40px] leading-none font-bold tabular-nums">{cur ?? '—'}</div><div className="text-[12px] text-white/50">只</div></div>
            <div className="rounded-xl bg-white/8 py-3"><div className="text-[13px] text-white/60">明亮</div><div className="text-[40px] leading-none font-bold tabular-nums">{cur === null ? '—' : WOODLICE - cur}</div><div className="text-[12px] text-white/50">只</div></div>
          </div>
          <H>每分钟统计一次（阴暗一侧）</H>
          <div className="flex h-[92px] items-end gap-1.5 rounded-xl bg-white/6 px-2.5 pt-2 pb-1">
            {DARK.map((d, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <span className={cn('text-[12px] tabular-nums', i < n ? 'text-white/85' : 'text-white/0')}>{d}</span>
                <div className={cn('w-full rounded-t-[3px] transition-all duration-500', i < n ? 'bg-[#35c7b3]' : 'bg-white/10')} style={{ height: i < n ? `${d * 5.4}px` : '4px' }} />
                <span className="text-[10.5px] text-white/45 tabular-nums">{i + 1}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="平均" value={showAvg ? `${avg.toFixed(1)} 只` : '—'} unit="阴暗一侧" />
            <ParamTile symbol="变量" value={cover ? '光' : '—'} unit="两侧唯一的不同" />
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary={!cover} pulse={next === 'act'} onClick={act} disabled={busy || (cover && n > 0)}>{label}</LabButton>
        <LabButton primary pulse={next === 'avg'} onClick={() => setShowAvg(true)} disabled={busy || n < DARK.length || showAvg}>算平均值</LabButton>
      </>}
      extras={null}
    />
  )
}
