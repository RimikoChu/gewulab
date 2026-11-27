// 基因的表达 · 第 4 课 转录：RNA 聚合酶以 DNA 的一条链为模板，按碱基互补配对合成 mRNA（U 代替 T）；mRNA 从核孔出去。
import { useEffect, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { GENE, MRNA, TEMPLATE } from './physics'
import { useTween, type V3 } from './kit'
import { CMP_Y, G4, O4, Q4_END, Scene4 } from './scene4'
import { RISE } from './mol'
import { Finale, H, Legend, Seq } from './ui'
import { VOICE } from './voice'
import { PORE, Room } from './world'

const TASKS: Task[] = [
  { id: 'run', text: '让 RNA 聚合酶从头走到尾', note: 'mRNA 和模板链互补：模板上是 A，mRNA 上就是 U' },
  { id: 'cmp', text: '把 mRNA 和非模板链比一比', note: '除了 U 代替 T，mRNA 和非模板链的碱基序列一样' },
  { id: 'out', text: '把 mRNA 送出细胞核', note: 'mRNA 通过核孔进入细胞质' },
]
const Q0 = -1.5
const tPos = [...GENE].flatMap((b, i) => b === 'T' ? [i] : [])

export default function Lesson4() {
  const [run, setRun] = useState(false)
  const [cmp, setCmp] = useState(false)
  const [out, setOut] = useState(false)
  const [jump, setJump] = useState(false)
  const q = useTween(run ? Q4_END : Q0, 1.5, jump)
  const c = useTween(cmp ? 1 : 0, 0.6, jump)
  const o = useTween(out ? 1 : 0, 0.13, jump)
  const T = useTasks('gewu:expression:4', TASKS)
  const made = run && q.done
  const [shown, setShown] = useState(0)
  // 面板上的 mRNA 跟着长：每隔一会儿读一次进度
  useEffect(() => { if (!run || q.done) { setShown(run ? G4 : 0); return } const t = setInterval(() => setShown(Math.max(0, Math.min(G4, Math.floor(q.ref.current)))), 120); return () => clearInterval(t) }, [run, q.done, q.ref])
  useEffect(() => { T.check(id => id === 'run' ? made : id === 'cmp' ? cmp && c.done : out && o.done) }, [made, cmp, c.done, out, o.done])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setJump(true); setRun(false); setCmp(false); setOut(false); T.reset(); setTimeout(() => setJump(false), 50) }
  const task = T.current
  const { hint, next }: { hint: string; next: 'run' | 'cmp' | 'out' | null } = (() => {
    if (!task) return { hint: '以 DNA 的一条链为模板合成 RNA，这个过程叫转录。', next: null }
    if (run && !q.done) return { hint: 'RNA 聚合酶往右走，mRNA 一个个接上去…', next: null }
    if (cmp && !c.done) return { hint: '摆过去…', next: null }
    if (out && !o.done) return { hint: 'mRNA 往核孔去…', next: null }
    if (!run) return { hint: '这是一个基因，下面那条是模板链。按“开始转录”', next: 'run' }
    if (!cmp) return { hint: 'mRNA 合成好了。按“和非模板链比一比”', next: 'cmp' }
    return { hint: '亮起来的是 T 和 U：只有这里不一样。按“送出细胞核”', next: 'out' }
  })()
  const xs = (i: number) => O4[0] + i * RISE
  const labels: Label[] = [
    ...(!out ? [
      { id: 'tm', at: [xs(26) + 0.6, O4[1] - 1.05, O4[2]] as V3, ax: 0, className: 'scene-tag translate-x-2 -translate-y-1/2', children: '模板链' },
      { id: 'cd', at: [xs(26) + 0.6, O4[1] + 1.05, O4[2]] as V3, ax: 0, className: 'scene-name translate-x-2 -translate-y-1/2', children: '非模板链' },
    ] : []),
    ...(run && !q.done ? [{ id: 'rp', at: [O4[0] + 13 * RISE, O4[1] - 2.6, O4[2]] as V3, ax: 0.5, className: 'scene-name translate-y-1', children: 'RNA 聚合酶' }] : []),
    ...(made && !out ? [{ id: 'm', at: [cmp ? xs(24) + 0.4 : xs(3), O4[1] + (cmp ? CMP_Y - 0.4 : 4.6), O4[2]] as V3, ax: cmp ? 0 : 1, className: cmp ? 'scene-tag key translate-x-2 -translate-y-1/2' : 'scene-tag key -translate-x-2 -translate-y-1/2', children: 'mRNA' }] : []),
    ...(out ? [{ id: 'p', at: [PORE[0], PORE[1] + 3.4, PORE[2]] as V3, ax: 0.5, className: 'scene-tag -translate-y-full', children: '核孔' }] : []),
  ]
  return (
    <LabShell title="基因的表达" lessons={LESSONS} current="4" narration={voiced(NARRATION['4'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="转录"
      stage={<Room at={out ? 'fourOut' : 'four'} labels={labels}><Scene4 q={q.ref} cmp={c.ref} out={o.ref} show={cmp} /></Room>}
      lesson={<LessonBlock no="4" title="转录" concept="以 DNA 的一条链为模板合成 RNA" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>RNA 也是由核苷酸连接而成的，一般是单链。它的五碳糖是核糖，碱基是 A、<b className="text-white">U</b>、G、C，U（尿嘧啶）代替了 DNA 中的 T。</p>
          <p className="mt-2"><b className="text-white">转录</b>主要在细胞核中进行：RNA 聚合酶结合到 DNA 上，DNA 双链解开，以其中<b className="text-white">一条链为模板</b>，以游离的核糖核苷酸为原料，按碱基互补配对原则（A—U、T—A、G—C、C—G）合成 RNA。</p>
          <p className="mt-2">合成的 mRNA 从 DNA 链上释放，DNA 双链恢复。mRNA 通过<b className="text-white">核孔</b>进入细胞质。</p>
        </>} />}
      finale={T.finale && <Finale kicker="mRNA 已经出了细胞核" title="转录：以 DNA 的一条链为模板合成 mRNA" text={`这个基因有 ${G4} 对碱基，转录出 ${MRNA.length} 个碱基的 mRNA。mRNA 和模板链互补，和非模板链只差在 U 代替了 T。`} notes="这一段基因是为了讲清楚而设计的短序列；模型放大了很多倍，RNA 聚合酶的形状是示意。" />}
      panel={
        <Glass className="px-4 py-4">
          <H>碱基序列（从左往右）</H>
          <Seq label="非模板链" s={GENE} group={3} mark={cmp ? tPos : []} />
          <Seq label="模板链" s={TEMPLATE} group={3} />
          <Seq label="mRNA" s={MRNA} group={3} upto={shown} mark={cmp ? tPos : []} className="mt-1" />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="mRNA" value={String(shown)} unit={`个碱基 · 共 ${G4} 个`} />
            <ParamTile symbol="T → U" value={cmp ? String(tPos.length) : '—'} unit="处不同" />
          </div>
          <Legend rna />
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'run'} onClick={() => setRun(true)} disabled={run}>开始转录</LabButton>
        <LabButton pulse={next === 'cmp'} onClick={() => setCmp(true)} disabled={!made || cmp}>和非模板链比一比</LabButton>
        <LabButton pulse={next === 'out'} onClick={() => setOut(true)} disabled={!(cmp && c.done) || out}>送出细胞核</LabButton>
      </>}
      extras={null}
    />
  )
}
