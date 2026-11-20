// 水循环 · 第 2 课 一滴水的旅行（水循环的环节）
import { useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import Basin from './basin'
import { LESSONS, goLesson } from './lessons'
import { LINKS, TRIP } from './physics'
import { pathMid } from './world'

const TASKS: Task[] = [
  { id: 'up', text: '从海面出发：蒸发、水汽输送、降水', note: '海水变成水汽，被风送到陆地上空，再变成雨雪落下来' },
  { id: 'river', text: '落到地上：一部分顺着河流回海洋', note: '这是地表径流' },
  { id: 'under', text: '另一部分渗进地下，从地下流回去', note: '下渗、地下径流：走得慢，但最后也回到海洋' },
]

export default function Lesson2() {
  const [n, setN] = useState(0)   // 已经打开了几个环节
  const T = useTasks('gewu:watercycle:2', TASKS)
  const step = () => { if (n >= TRIP.length) return; const k = n + 1; setN(k); T.check(id => id === 'up' ? k >= 3 : id === 'river' ? k >= 4 : k >= 6) }
  const resetAll = () => { setN(0); T.reset() }
  const open = TRIP.slice(0, n), last = n ? LINKS[TRIP[n - 1]] : null, todo = TRIP[n]
  const hint = todo ? (last ? `${last.name}：${last.say}。按“下一个环节”` : '按“下一个环节”，从海面出发') : '一圈走完了：水又回到了海洋。'
  const labels: Label[] = open.map((k, i) => ({ id: k, at: pathMid(k), ax: 0.5, className: `scene-tag -translate-y-full${i === n - 1 ? ' key' : ''}`, children: <><small>{i + 1}</small>{LINKS[k].name}</> }))

  return (
    <LabShell title="水循环" lessons={LESSONS} current="2" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="一滴水"
      stage={<Basin labels={labels} want={{ links: open, rain: n >= 3 ? ['land'] : [] }} />}
      lesson={<LessonBlock no="2" title="一滴水的旅行" concept="水在海洋、大气和陆地之间不停地转" tasks={TASKS} done={T.done} current={T.current?.id}
        theory={<>
          <p>水在太阳辐射和重力的推动下，在海洋、大气、陆地之间连续运动，叫<b className="text-white">水循环</b>。它由几个环节接起来：</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            {TRIP.map(k => <li key={k}><b className="text-[#7fe3d4]">{LINKS[k].name}：</b>{LINKS[k].say}</li>)}
          </ul>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">一圈走完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">蒸发、水汽输送、降水、径流，水又回到海洋</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">陆地上的淡水就是这样一遍遍得到补充的。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一圈</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">这滴水现在</div>
            <div className="mt-1 text-[32px] leading-none font-bold tracking-tight text-[#7fe3d4]">{last ? last.name : '在海里'}</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">走过的环节</h2>
          {n === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">一共六个环节。每打开一个，流域里会多出一条水流的路线。</p>
            : <ol className="mt-2 flex flex-col gap-1.5 text-[13.5px]">{open.map((k, i) => <li key={k} className="row-in rounded-xl bg-white/6 px-3 py-2"><b className="text-white">{i + 1}. {LINKS[k].name}</b><span className="ml-2 text-white/65">{LINKS[k].say}</span></li>)}</ol>}
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={n < TRIP.length} onClick={step} disabled={n >= TRIP.length}>{todo ? `下一个环节` : '六个环节走完了'}</LabButton>
      </>}
      extras={null}
    />
  )
}
