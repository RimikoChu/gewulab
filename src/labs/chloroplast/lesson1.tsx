// 光反应和暗反应 · 第 1 课 叶绿体的结构：从一片菠菜叶放大到叶肉细胞，再到一个叶绿体，剖开看双层膜、基粒、类囊体和基质。
import { useEffect, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { useAfter, type V3 } from './kit'
import { LESSONS, TITLE, goLesson } from './lessons'
import { NARRATION } from './narration'
import { GRANA, PARTS, granaCount, thylakoidCount } from './physics'
import Scene1 from './scene1'
import { Finale, H, Row } from './ui'
import { VOICE } from './voice'
import { BZ, DISC, PICK, PL, PLAST, Place, ST, TOP, type SpotKey } from './world'

const TASKS: Task[] = [
  { id: 'cell', text: '把叶片放大，找到叶肉细胞里的叶绿体', note: '叶肉细胞里一个个绿色的小体就是叶绿体' },
  { id: 'plast', text: '再放大，凑近一个叶绿体', note: '叶绿体的外表是一层光滑的膜' },
  { id: 'cut', text: '把它剖开，找到基粒和基质', note: '里面是一摞摞的基粒，基粒之间充满基质' },
]
const AT: SpotKey[] = ['leaf', 'cell', 'plast', 'plastCut']
const pl = (x: number, y: number, z: number): V3 => [PLAST[0] + x, PLAST[1] + y, PLAST[2] + z]

export default function Lesson1() {
  const [stage, setStage] = useState(0)
  const T = useTasks('gewu:chloroplast:1', TASKS)
  const there = useAfter(stage > 0, stage === 3 ? 3200 : 3600, stage)
  const [seen, setSeen] = useState(0)
  useEffect(() => { if (there) setSeen(stage) }, [there, stage])
  useEffect(() => { T.check(id => id === 'cell' ? seen >= 1 : id === 'plast' ? seen >= 2 : seen >= 3) }, [seen])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setStage(0); setSeen(0); T.reset() }
  const task = T.current, busy = stage > 0 && seen < stage
  const { hint, next }: { hint: string; next: number | null } = (() => {
    if (!task) return { hint: '双层膜、基粒、类囊体、基质：叶绿体的结构都找到了。', next: null }
    if (busy) return { hint: stage === 3 ? '正在剖开…' : '镜头正在往里飞…', next: null }
    if (stage === 0) return { hint: '这是一盆菠菜。按“放大到叶肉细胞”，钻进叶片里看', next: 1 }
    if (stage === 1) return { hint: '细胞里贴着边的绿色小体是叶绿体。按“放大到叶绿体”', next: 2 }
    return { hint: '这就是一个叶绿体。按“剖开叶绿体”，看看里面', next: 3 }
  })()
  const s = Math.sqrt(1 - (PL.cut / PL.c) ** 2), g7 = GRANA[7], g2 = GRANA[2]
  const labels: Label[] = stage === 0 ? [{ id: 'leaf', at: [ST.l1 + 0.75, TOP + 1.2, BZ + 0.7], className: 'scene-tag translate-x-2 -translate-y-1/2', children: '菠菜的叶片' }]
    : stage === 1 ? [
      { id: 'c', at: [PICK[0] + 2.6, PICK[1], PICK[2] + 1], className: 'scene-tag key translate-x-1 -translate-y-1/2', children: '叶绿体' },
      { id: 'm', at: [PICK[0] - 6.4, PICK[1] - 11.6, PICK[2]], ax: 0.5, className: 'scene-name translate-y-1', children: '叶肉细胞' },
      { id: 'v', at: [PICK[0] - 1.2, PICK[1] + 6, PICK[2]], ax: 0.5, className: 'scene-name', children: '液泡' },
    ] : stage === 2 ? [{ id: 'o', at: pl(0, PL.b + 1.5, 0), ax: 0.5, className: 'scene-tag -translate-y-full', children: '叶绿体' }]
      : seen < 3 ? [] : [
        { id: 'om', at: pl(-22, PL.b * s * 0.985 * Math.sqrt(1 - (22 / (PL.a * s)) ** 2), PL.cut), ax: 1, className: 'scene-tag -translate-x-2 -translate-y-full', children: '外膜' },
        { id: 'im', at: pl(-6, PL.b * s * 0.9, PL.cut), ax: 0, className: 'scene-tag translate-x-1 translate-y-2', children: '内膜' },
        { id: 'g', at: pl(g7.x, g7.y + g7.n * DISC.pitch / 2 + 0.6, g7.z + 2), ax: 0.5, className: 'scene-tag key -translate-y-full', children: '基粒' },
        { id: 't', at: pl(g2.x - DISC.r, g2.y - 1, g2.z + 3), ax: 1, className: 'scene-tag -translate-x-2 -translate-y-1/2', children: '类囊体' },
        { id: 's', at: pl(32, 9.5, 2), ax: 0.5, className: 'scene-tag', children: '基质' },
        { id: 'l', at: pl(15.5, -1.5, 3), ax: 0.5, className: 'scene-name translate-y-2', children: '基质片层' },
      ]
  return (
    <LabShell title={TITLE} lessons={LESSONS} current="1" narration={voiced(NARRATION['1'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="放大"
      stage={<Place at={AT[stage]} labels={labels} cut={stage === 3}><Scene1 /></Place>}
      lesson={<LessonBlock no="1" title="叶绿体的结构" concept="叶绿体是进行光合作用的场所" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>叶绿体一般呈扁平的椭球形或球形，外表有<b className="text-white">双层膜</b>（外膜和内膜）。</p>
          <p className="mt-2">内部有许多<b className="text-white">基粒</b>，每个基粒都由一个个圆饼状的囊状结构堆叠而成，这些囊状结构叫<b className="text-white">类囊体</b>。吸收光能的四种色素就分布在类囊体的薄膜上。</p>
          <p className="mt-2">基粒与基粒之间充满了<b className="text-white">基质</b>，基质中含有与光合作用有关的多种酶，还有少量 DNA。众多的基粒和类囊体极大地扩展了受光面积。</p>
        </>} />}
      finale={T.finale && <Finale kicker="从叶片一直看到了类囊体" title="叶绿体：双层膜、基粒（类囊体）、基质" text={`这个模型里有 ${granaCount()} 个基粒、${thylakoidCount()} 个类囊体。色素在类囊体的薄膜上，与光合作用有关的酶在类囊体薄膜上和基质里。`} notes="模型放大了很多倍，基粒和类囊体的数目比真实的叶绿体少；颜色是示意。" />}
      panel={
        <Glass className="px-4 py-4">
          <H>现在看到的</H>
          <Row name="叶片" text="一盆菠菜的一片叶子" on={stage === 0} />
          <div className="mt-1.5" /><Row name="叶肉细胞" text="细胞里有许多叶绿体" on={stage === 1} seen={stage >= 1} />
          <div className="mt-1.5" /><Row name="叶绿体" text="扁平的椭球形" on={stage >= 2} seen={stage >= 2} />
          <H>叶绿体里面</H>
          <div className="flex flex-col gap-1.5">{PARTS.map(p => <Row key={p.key} wide name={p.name} text={p.what} seen={seen >= 3} />)}</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="基粒" value={seen >= 3 ? String(granaCount()) : '—'} unit="个 · 这个模型里" />
            <ParamTile symbol="类囊体" value={seen >= 3 ? String(thylakoidCount()) : '—'} unit="个 · 这个模型里" />
          </div>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 1} onClick={() => setStage(1)} disabled={stage !== 0}>放大到叶肉细胞</LabButton>
        <LabButton pulse={next === 2} onClick={() => setStage(2)} disabled={stage !== 1 || busy}>放大到叶绿体</LabButton>
        <LabButton primary pulse={next === 3} onClick={() => setStage(3)} disabled={stage !== 2 || busy}>剖开叶绿体</LabButton>
      </>}
      extras={null}
    />
  )
}
