// 细胞 · 第 5 课 植物细胞里有什么（细胞壁、细胞膜、细胞质、细胞核、液泡、叶绿体、线粒体）
import { useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { LabStage, useTasks } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { Cell } from './models'
import { PARTS, PART_KEYS } from './physics'
import { SPAN, SPOT, ST, TOP } from './world'

const TASKS: Task[] = [
  { id: 'four', text: '从外往里：细胞壁、细胞膜、细胞质、细胞核', note: '壁保护和支持，膜控制物质进出，质是活动的场所，核是控制中心' },
  { id: 'rest', text: '再看细胞质里的液泡、叶绿体、线粒体', note: '液泡装着细胞液；叶绿体和线粒体是细胞里的两种能量转换器' },
]

export default function Lesson5() {
  const [n, setN] = useState(0)   // 看过了前几个结构
  const T = useTasks('gewu:cells:5', TASKS)
  const go = () => { if (n >= PART_KEYS.length) return; const k = n + 1; setN(k); T.check(id => id === 'four' ? k >= 4 : k >= PART_KEYS.length) }
  const resetAll = () => { setN(0); T.reset() }
  const now = n ? PART_KEYS[n - 1] : null, todo = PART_KEYS[n]
  const hint = todo ? `${now ? `${PARTS[now].name}：${PARTS[now].does}。` : ''}按“看下一个结构”` : '七种结构都看过了。'

  return (
    <LabShell title="细胞" lessons={LESSONS} current="5" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="植物细胞模型"
      stage={<LabStage labels={now ? [{ id: 'p', at: [ST.model, TOP + 1.85, 0], ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>第 {n} 个</small>{PARTS[now].name}</> }] : [{ id: 'n', at: [ST.model, TOP + 1.85, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '植物细胞（放大的模型）' }]} target={SPOT.model} span={SPAN.model}><Cell position={[ST.model, TOP + 0.95, 0]} kind="plant" glow={now ? [now] : []} /></LabStage>}
      lesson={<LessonBlock no="5" title="植物细胞里有什么" concept="每个结构各管一件事" tasks={TASKS} done={T.done} current={T.current?.id}
        theory={<ul className="flex flex-col gap-1.5 text-[14px] text-white/80">{PART_KEYS.map(k => <li key={k}><b className="text-[#7fe3d4]">{PARTS[k].name}：</b>{PARTS[k].does}</li>)}</ul>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">七种结构都看过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">细胞是一个分工明确的整体</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">细胞膜管进出，细胞核管指挥，叶绿体和线粒体管能量。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">现在亮着的是</div>
            <div className="mt-1 text-[34px] leading-none font-bold tracking-tight text-[#7fe3d4]">{now ? PARTS[now].name : '整个细胞'}</div>
          </div>
          {now && <p className="row-in mt-4 rounded-xl bg-white/6 px-3 py-3 text-[14px] leading-relaxed text-white/80">{PARTS[now].does}</p>}
          <h2 className="mt-5 text-[12.5px] text-white/55">看过的结构</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">{PART_KEYS.map((k, i) => <span key={k} className={`rounded-full px-2.5 py-1 text-[13px] ${i < n ? 'bg-[#35c7b3]/25 text-white' : 'bg-white/8 text-white/40'}`}>{PARTS[k].name}</span>)}</div>
        </Glass>
      }
      actions={<><LabButton primary pulse={!!todo} onClick={go} disabled={!todo}>{todo ? '看下一个结构' : '都看过了'}</LabButton></>}
      extras={null}
    />
  )
}
