// 原电池 · 第 2 课 电子往哪走（负极失电子、正极得电子；电子走导线，离子走溶液）
import { useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { MICRO, perElectrons } from './physics'
import Rig, { X } from './rig'
import { TOP } from './world'

const TASKS: Task[] = [
  { id: 'neg', text: '看负极：锌片上发生了什么', note: 'Zn − 2e⁻ = Zn²⁺：锌失去电子，是氧化反应' },
  { id: 'pos', text: '跟着电子走到正极：铜片上发生了什么', note: '2H⁺ + 2e⁻ = H₂↑：氢离子得到电子，是还原反应' },
  { id: 'ions', text: '再看溶液里：离子往哪边移', note: '阳离子移向正极，阴离子移向负极' },
]

export default function Lesson2() {
  const [n, setN] = useState(0)
  const T = useTasks('gewu:battery:2', TASKS)
  const go = () => { if (n >= MICRO.length) return; const k = n + 1; setN(k); T.check(id => id === 'neg' ? k >= 1 : id === 'pos' ? k >= 3 : k >= 4) }
  const resetAll = () => { setN(0); T.reset() }
  const now = n ? MICRO[n - 1] : null, todo = MICRO[n], amt = perElectrons(2)
  const hint = todo ? `${now ? `${now.say}。` : ''}按“下一步”` : '四件事连起来，就是一个完整的回路。'
  const labels: Label[] = [
    { id: 'zn', at: [X - 0.3, TOP + 0.62, 0], ax: 1, className: `scene-tag -translate-y-1/2${n === 1 ? ' key' : ''}`, children: n >= 1 ? <><small>负极 · 氧化</small>Zn − 2e⁻ = Zn²⁺</> : '锌片' },
    { id: 'cu', at: [X + 0.3, TOP + 0.62, 0], className: `scene-tag -translate-y-1/2${n === 3 ? ' key' : ''}`, children: n >= 3 ? <><small>正极 · 还原</small>2H⁺ + 2e⁻ = H₂↑</> : '铜片' },
    { id: 'e', at: [X, TOP + 0.84, -0.3], ax: 0.5, className: `scene-tag -translate-y-full transition-opacity${n === 2 ? ' key' : ''}`, style: { opacity: n >= 2 ? 1 : 0 }, children: <><small>导线里</small>电子：锌 → 铜</> },
    { id: 'ion', at: [X, TOP + 0.02, 0.36], ax: 0.5, className: `scene-tag transition-opacity${n === 4 ? ' key' : ''}`, style: { opacity: n >= 4 ? 1 : 0 }, children: <><small>溶液里</small>H⁺ → 铜片 · SO₄²⁻ → 锌片</> },
  ]

  return (
    <LabShell title="原电池" lessons={LESSONS} current="2" narration={voiced(NARRATION['2'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="放大了看"
      stage={<Rig left="Zn" right="Cu" joined flow={n >= 2 ? 1 : 0} gasR={n >= 3 ? 0.9 : 0} labels={labels} />}
      lesson={<LessonBlock no="2" title="电子往哪走" concept="负极失电子，正极得电子；电子走导线，离子走溶液" tasks={TASKS} done={T.done} current={T.current?.id}
        theory={<>
          <ol className="flex flex-col gap-1.5 text-[14px] text-white/80">{MICRO.map((s, i) => <li key={s.key}><b className="text-[#7fe3d4]">{i + 1}. {s.where}：</b>{s.say}（{s.eq}）</li>)}</ol>
          <p className="mt-3">失去电子的一极是<b className="text-white">负极</b>，发生氧化反应；得到电子的一极是<b className="text-white">正极</b>，发生还原反应。氧化和还原被分在了两个地方进行，电子只好从导线上走，这就有了电流。</p>
          <p className="mt-3">每转移 2 mol 电子，溶解 {amt.zn} g 锌，生成 {amt.h2} g 氢气（标准状况下 {amt.liters} L）。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">回路接通了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">电子从锌片出发，经导线到铜片，交给了氢离子</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">所以气泡在铜片上冒出来。铜自己没有反应，它只是让电子有地方交出去。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{now ? now.where : '锌片、铜片、稀硫酸，导线已经连上'}</div>
            <div className="mt-1 text-[24px] leading-snug font-bold tracking-tight text-[#7fe3d4]">{now ? now.eq : '从锌片看起'}</div>
            {now && <div className="mt-1 text-[13px] text-white/55">{now.kind}</div>}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="负极" value={n >= 1 ? '锌片' : '—'} unit="失电子 · 氧化反应" />
            <ParamTile symbol="正极" value={n >= 3 ? '铜片' : '—'} unit="得电子 · 还原反应" />
          </div>
          {n > 0 && <ol className="mt-4 flex flex-col gap-1.5 text-[13.5px]">{MICRO.slice(0, n).map((s, i) => <li key={s.key} className="row-in rounded-xl bg-white/6 px-3 py-2"><b className="text-white">{i + 1}. {s.name}</b><span className="ml-2 text-white/65">{s.eq}</span></li>)}</ol>}
        </Glass>
      }
      actions={<><LabButton primary pulse={!!todo} onClick={go} disabled={!todo}>{todo ? '下一步' : '四步看完了'}</LabButton></>}
      extras={null}
    />
  )
}
