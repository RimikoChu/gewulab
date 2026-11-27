// 光反应和暗反应 · 第 4 课 光反应：在类囊体的薄膜上，光能把水分解成氧和 H⁺，生成 NADPH 和 ATP。
import { useEffect, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LightFlows, mac, useMacro } from './flows'
import { useAfter, useCount } from './kit'
import { LESSONS, TITLE, goLesson } from './lessons'
import { X_ATP, X_PS1, X_PS2 } from './macro'
import { NARRATION } from './narration'
import { LIGHT_SITE, photolysis } from './physics'
import { Finale, H, Legend, Row } from './ui'
import { VOICE } from './voice'
import { Place } from './world'

const TASKS: Task[] = [
  { id: 'split', text: '照光，看水在哪里被分解', note: '水分解成氧和 H⁺，氧以 O₂ 的形式放出去' },
  { id: 'carry', text: '跟着电子走到膜的另一侧', note: 'NADP⁺ 得到电子和 H⁺，变成 NADPH' },
  { id: 'make', text: '跟着 H⁺ 穿过 ATP 合酶', note: 'ADP 和 Pi 合成了 ATP：光能变成了 ATP、NADPH 里的化学能' },
]

export default function Lesson4() {
  const [stage, setStage] = useState(0)
  const T = useTasks('gewu:chloroplast:4', TASKS)
  const water = useCount(stage >= 1, 1300, 24), P = photolysis(water)
  const carried = useAfter(stage >= 2, 5000), made = useAfter(stage >= 3, 5000)
  useMacro(stage >= 1 ? 1 : 0, stage >= 3 ? 3.2 : 0)
  useEffect(() => { T.check(id => id === 'split' ? P.o2 >= 2 : id === 'carry' ? carried : made) }, [P.o2, carried, made])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setStage(0); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: number | null } = (() => {
    if (!task) return { hint: `光反应在${LIGHT_SITE}进行：水的光解，生成 NADPH 和 ATP。`, next: null }
    if (stage === 0) return { hint: '这是一个类囊体剖开的一角，膜上嵌着光系统和 ATP 合酶。按“照光”', next: 1 }
    if (stage === 1) return P.o2 >= 2 ? { hint: '水在类囊体腔这一侧被分解，放出 O₂。按“跟着电子走”', next: 2 } : { hint: '色素吸收了光能，水分子正在被分解…', next: null }
    if (stage === 2) return carried ? { hint: 'NADPH 生成了。腔里的 H⁺ 越积越多，按“跟着 H⁺ 走”', next: 3 } : { hint: '电子沿着膜传到光系统Ⅰ…', next: null }
    return { hint: 'H⁺ 穿过 ATP 合酶，推着它转…', next: null }
  })()
  const labels: Label[] = [
    { id: 'st', at: mac(-25, 9.6), className: 'scene-name', children: '叶绿体基质' },
    { id: 'lu', at: mac(-33, -4.6), className: 'scene-name', children: '类囊体腔' },
    { id: 'me', at: mac(-33, 0), ax: 0.5, className: 'scene-name -translate-y-1/2', children: '类囊体薄膜' },
    { id: 'p2', at: mac(X_PS2, 2.5), ax: 0.5, name: stage > 0, className: 'scene-tag -translate-y-full', children: '光系统Ⅱ' },
    { id: 'p1', at: mac(X_PS1 + 0.2, -2.6), ax: 0.5, name: stage > 0, className: 'scene-tag', children: '光系统Ⅰ' },
    { id: 'as', at: mac(X_ATP + 2.6, 3.4), name: stage > 0, className: 'scene-tag translate-x-1 -translate-y-1/2', children: 'ATP 合酶' },
    ...(stage >= 1 ? [
      { id: 'w', at: mac(-31.5, -1.6), ax: 0.5, className: 'scene-tag key -translate-y-full', children: 'H₂O' },
      { id: 'o', at: mac(-30.4, 7.0, 5.5), ax: 0.5, className: 'scene-tag key -translate-y-full', children: 'O₂' },
      { id: 'h', at: mac(-21, -4.1), ax: 0.5, className: 'scene-tag key', children: 'H⁺' },
    ] as Label[] : []),
    ...(stage >= 2 ? [
      { id: 'e', at: mac(-22.4, 1.1), ax: 0.5, className: 'scene-tag key -translate-y-full', children: 'e⁻' },
      { id: 'n', at: mac(-21.6, 8.6, 2), ax: 0.5, className: 'scene-tag key -translate-y-full', children: 'NADPH' },
      { id: 'n0', at: mac(-12.2, 8.0), className: 'scene-tag translate-x-1 -translate-y-full', children: 'NADP⁺' },
    ] as Label[] : []),
    ...(stage >= 3 ? [
      { id: 'a', at: mac(-11.4, 10.4, 2.4), ax: 1, className: 'scene-tag key -translate-x-2 -translate-y-1/2', children: 'ATP' },
      { id: 'a0', at: mac(-2.4, 8.4), className: 'scene-tag translate-x-1 -translate-y-1/2', children: 'ADP + Pi' },
    ] as Label[] : []),
  ]
  return (
    <LabShell title={TITLE} lessons={LESSONS} current="4" narration={voiced(NARRATION['4'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="光反应"
      stage={<Place at="light" labels={labels} bloom={0.75}><LightFlows split={stage >= 1} carry={stage >= 2} make={stage >= 3} /></Place>}
      lesson={<LessonBlock no="4" title="光反应" concept="光能变成 ATP 和 NADPH 中的化学能" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>光反应必须有光才能进行，在<b className="text-white">类囊体的薄膜上</b>进行。</p>
          <p className="mt-2">叶绿体中光合色素吸收的光能有两方面用途：一是将<b className="text-white">水分解为氧和 H⁺</b>，氧直接以 O₂ 的形式释放出去，H⁺ 与 NADP⁺ 结合形成 <b className="text-white">NADPH</b>；二是在有关酶的催化作用下，促使 ADP 与 Pi 反应形成 <b className="text-white">ATP</b>。</p>
          <p className="mt-2">NADPH 是活泼的还原剂，同时也储存部分能量。这样，光能就转化为储存在 ATP 和 NADPH 中的化学能。</p>
          <p className="mt-2 text-white/55">了解：膜上吸收光能的色素和蛋白质结合成两个光系统；H⁺ 从类囊体腔穿过 ATP 合酶回到基质时，推动 ATP 的合成。</p>
        </>} />}
      finale={T.finale && <Finale kicker="三件事都看到了" title="光反应：水的光解，生成 NADPH 和 ATP" text={`场所是${LIGHT_SITE}。水分解为氧和 H⁺，O₂ 放出去；NADP⁺ 变成 NADPH，ADP 和 Pi 合成 ATP。光能转化为 ATP 和 NADPH 中的化学能，供暗反应用。`} notes="膜和蛋白质放大了很多倍，形状是示意；两个光系统之间传递电子的几种物质没有画。" />}
      panel={
        <Glass className="px-4 py-4">
          <H>水的光解（类囊体腔一侧）</H>
          <div className="rounded-xl bg-white/6 px-3 py-2.5 text-center font-formula text-[17px]">2 H₂O → O₂ + 4 H⁺ + 4 e⁻</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="H₂O" value={stage >= 1 ? String(P.water) : '—'} unit="个 · 已分解" />
            <ParamTile symbol="O₂" value={stage >= 1 ? String(P.o2) : '—'} unit="个 · 已放出" />
            <ParamTile symbol="H⁺" value={stage >= 1 ? String(P.h) : '—'} unit="个 · 留在腔里" />
            <ParamTile symbol="NADPH" value={stage >= 2 ? `≤ ${P.nadph}` : '—'} unit="个 · 这些电子够生成" />
          </div>
          <H>光反应的三件事</H>
          <div className="flex flex-col gap-1.5">
            <Row wide name="水的光解" text="H₂O → O₂ + H⁺" on={stage === 1} seen={stage >= 1} />
            <Row wide name="生成 NADPH" text="NADP⁺ + H⁺ + e⁻ → NADPH" on={stage === 2} seen={stage >= 2} />
            <Row wide name="生成 ATP" text="ADP + Pi → ATP" on={stage === 3} seen={stage >= 3} />
          </div>
          <Legend kinds={['h2o', 'o2', 'h', 'e', 'nadph', 'atp']} />
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 1} onClick={() => setStage(1)} disabled={stage !== 0}>照光</LabButton>
        <LabButton pulse={next === 2} onClick={() => setStage(2)} disabled={stage !== 1 || P.o2 < 2}>跟着电子走</LabButton>
        <LabButton pulse={next === 3} onClick={() => setStage(3)} disabled={stage !== 2 || !carried}>跟着 H⁺ 走</LabButton>
      </>}
      extras={null}
    />
  )
}
