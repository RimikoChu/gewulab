// 光反应和暗反应 · 第 5 课 暗反应：在叶绿体基质里，CO₂ 被 C₅ 固定成 C₃，C₃ 被还原成糖类和 C₅（卡尔文循环）。
import { useEffect, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { DarkFlows, mac, useMacro } from './flows'
import { useAfter, useCount } from './kit'
import { LESSONS, TITLE, goLesson } from './lessons'
import { RING, TRAY, ringAt } from './macro'
import { NARRATION } from './narration'
import { DARK_SITE, calvin, fixCO2, reduceC3 } from './physics'
import { Finale, H, Legend, Row } from './ui'
import { VOICE } from './voice'
import { Place } from './world'

const TASKS: Task[] = [
  { id: 'fix', text: '让一个 CO₂ 和 C₅ 结合', note: '1 个 CO₂ 和 1 个 C₅ 结合，生成 2 个 C₃：这叫 CO₂ 的固定' },
  { id: 'reduce', text: '送来 ATP 和 NADPH，把 C₃ 还原', note: 'C₃ 接受 ATP 和 NADPH 释放的能量，被 NADPH 还原' },
  { id: 'loop', text: '让循环转 6 圈，攒出一个葡萄糖', note: '一部分 C₃ 变成糖类，另一部分又形成 C₅，循环不断' },
]
const F = fixCO2(1), R = reduceC3(F.c3)

export default function Lesson5() {
  const [stage, setStage] = useState(0)
  const T = useTasks('gewu:chloroplast:5', TASKS)
  const fixed = useAfter(stage >= 1, 4500), reduced = useAfter(stage >= 2, 5000)
  const turns = useCount(stage >= 3, 1500, 6), C = calvin(turns)
  useEffect(() => { T.check(id => id === 'fix' ? fixed : id === 'reduce' ? reduced : C.glucose >= 1) }, [fixed, reduced, C.glucose])   // eslint-disable-line react-hooks/exhaustive-deps
  useMacro(0, 0, true)     // 这一课只看基质：旁边类囊体上的 ATP 合酶只露出半个，先收起来
  const resetAll = () => { setStage(0); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: number | null } = (() => {
    if (!task) return { hint: `暗反应在${DARK_SITE}进行：CO₂ 的固定，C₃ 的还原。`, next: null }
    if (stage === 0) return { hint: '基质里有一圈循环的反应，右边等着的是 C₅。按“固定 CO₂”', next: 1 }
    if (stage === 1) return fixed ? { hint: '1 个 CO₂ 加 1 个 C₅，变成了 2 个 C₃。按“还原 C₃”', next: 2 } : { hint: 'CO₂ 进来，在酶的作用下和 C₅ 结合…', next: null }
    if (stage === 2) return reduced ? { hint: 'C₃ 被还原了，有的碳去合成糖类。按“转 6 圈”，看 C₅ 怎么回来', next: 3 } : { hint: 'ATP 和 NADPH 从类囊体那边过来…', next: null }
    return { hint: `循环在转：已经固定了 ${turns} 个 CO₂…`, next: null }
  })()
  const p = (deg: number, k: number) => { const q = ringAt(deg, k); return mac(q[0], q[1], q[2]) }
  const labels: Label[] = [
    { id: 'en', at: p(90, 1.02), ax: 0.5, name: stage > 0, className: 'scene-name translate-y-4', children: '酶' },
    { id: 'c5', at: p(8, 1.2), className: 'scene-tag translate-x-1 -translate-y-1/2', children: 'C₅' },
    ...(stage >= 1 ? [
      { id: 'co2', at: mac(RING.c[0] + 4.4, 10.9, 3), className: 'scene-tag key translate-x-2 -translate-y-1/2', children: 'CO₂' },
      { id: 'c3', at: p(140, 1.22), ax: 1, className: 'scene-tag -translate-x-1 -translate-y-1/2', children: '2 C₃' },
    ] as Label[] : []),
    ...(stage >= 2 ? [
      { id: 'in', at: mac(1.8, 5.6, 3), ax: 0.5, className: 'scene-tag key -translate-y-full', children: 'ATP · NADPH' },
      { id: 'out', at: mac(1.6, 0.2, 3), ax: 0.5, className: 'scene-tag translate-y-1', children: 'ADP · Pi · NADP⁺' },
      { id: 'su', at: mac(TRAY[0], TRAY[1] - 1.5, TRAY[2]), ax: 0.5, className: 'scene-tag key translate-y-1', children: C.glucose ? '葡萄糖' : '糖类 (CH₂O)' },
    ] as Label[] : []),
  ]
  return (
    <LabShell title={TITLE} lessons={LESSONS} current="5" narration={voiced(NARRATION['5'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="暗反应"
      stage={<Place at="dark" labels={labels}><DarkFlows fix={stage >= 1} reduce={stage >= 2} regen={stage >= 3} supply={stage >= 2 ? 1 : 0} sugar={stage >= 3 ? turns % 6 : stage >= 2 && reduced ? 1 : 0} glucose={C.glucose} /></Place>}
      lesson={<LessonBlock no="5" title="暗反应" concept="CO₂ 经 C₃ 变成糖类，C₅ 循环使用" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>暗反应有没有光都能进行，在<b className="text-white">叶绿体的基质中</b>进行。</p>
          <p className="mt-2">绿叶通过气孔从外界吸收的 CO₂，在特定酶的作用下与 C₅（一种五碳化合物）结合，这个过程称作 <b className="text-white">CO₂ 的固定</b>。一分子的 CO₂ 被固定后，很快形成两个 C₃ 分子。</p>
          <p className="mt-2">在有关酶的催化作用下，C₃ 接受 ATP 和 NADPH 释放的能量，并且被 NADPH <b className="text-white">还原</b>。随后，一些接受能量并被还原的 C₃ 经过一系列反应转化为糖类；另一些经过一系列变化，又形成 C₅。这些 C₅ 又可以参与 CO₂ 的固定。</p>
          <p className="mt-2">这样，暗反应阶段就形成从 C₅ 到 C₃ 再到 C₅ 的循环，可以源源不断地进行下去，因此暗反应过程也称作卡尔文循环。</p>
        </>} />}
      finale={T.finale && <Finale kicker={`固定了 ${C.co2} 个 CO₂`} title="暗反应：CO₂ 的固定，C₃ 的还原" text={`场所是${DARK_SITE}。每固定 1 个 CO₂ 就多出 1 个碳，转 6 圈攒够 1 个葡萄糖；C₅ 一个没少，循环使用。ATP 和 NADPH 中的化学能，转化为糖类中稳定的化学能。`} notes="C₃ 变成糖类和再生成 C₅ 都要经过一系列反应，这里合成了一步；分子的形状是示意，一个小球代表一个碳原子。" />}
      panel={
        <Glass className="px-4 py-4">
          <H>数一数碳原子</H>
          <div className="flex flex-col gap-1.5">
            <Row wide name="CO₂ 的固定" text={`CO₂ + C₅ → ${F.c3} C₃（1 + 5 = ${F.carbonOut}）`} on={stage === 1} seen={stage >= 1} />
            <Row wide name="C₃ 的还原" text={`${F.c3} C₃ → (CH₂O) + C₅（${R.carbon} = ${R.sugarCarbon} + 5）`} on={stage === 2} seen={stage >= 2} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="CO₂" value={stage >= 3 ? String(C.co2) : stage >= 1 ? '1' : '—'} unit="个 · 已固定" />
            <ParamTile symbol="糖里的碳" value={stage >= 3 ? String(C.sugarCarbon) : '—'} unit="个 · 6 个攒成葡萄糖" />
            <ParamTile symbol="葡萄糖" value={stage >= 3 ? String(C.glucose) : '—'} unit="个 · C₆H₁₂O₆" />
            <ParamTile symbol="C₅" value={stage >= 3 ? '不变' : '—'} unit="用掉又再生" />
          </div>
          <Legend kinds={['co2', 'c5', 'c3', 'c1', 'atp', 'nadph']} />
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 1} onClick={() => setStage(1)} disabled={stage !== 0}>固定 CO₂</LabButton>
        <LabButton pulse={next === 2} onClick={() => setStage(2)} disabled={stage !== 1 || !fixed}>还原 C₃</LabButton>
        <LabButton pulse={next === 3} onClick={() => setStage(3)} disabled={stage !== 2 || !reduced}>转 6 圈</LabButton>
      </>}
      extras={null}
    />
  )
}
