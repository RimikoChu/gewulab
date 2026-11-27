// 基因的表达 · 第 6 课 翻译：核糖体沿 mRNA 移动，tRNA 的反密码子和密码子配对、运来氨基酸，肽链一个个接长，读到终止密码子停下。
import { useEffect, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { AA_NAME, MRNA, anticodon, aaName } from './physics'
import { useTween, type V3 } from './kit'
import { AAS, CS6, O6, Scene6, U_END, codonX, poseAt } from './scene6'
import { aaColor } from './mol'
import { Finale, H, Seq } from './ui'
import { VOICE } from './voice'
import { Room } from './world'

const TASKS: Task[] = [
  { id: 'first', text: '让第一个 tRNA 带着氨基酸到位', note: '反密码子 UAC 和起始密码子 AUG 配对，运来甲硫氨酸' },
  { id: 'second', text: '接上第二个氨基酸', note: '两个氨基酸连起来，核糖体往前移动一个密码子' },
  { id: 'end', text: '一直翻译到终止密码子', note: `${MRNA.length} 个碱基，翻译出 ${AAS.length} 个氨基酸的肽链` },
]

export default function Lesson6() {
  const [goal, setGoal] = useState(0)
  const [jump, setJump] = useState(false)
  const u = useTween(goal, 0.42, jump)
  const T = useTasks('gewu:expression:6', TASKS)
  const at = u.done ? goal : -1
  useEffect(() => { T.check(id => id === 'first' ? at >= 1 : id === 'second' ? at >= 2 : at >= U_END) }, [at])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setJump(true); setGoal(0); T.reset(); setTimeout(() => setJump(false), 50) }
  const task = T.current
  const { hint, next }: { hint: string; next: 'step' | 'all' | null } = (() => {
    if (!task) return { hint: '核糖体沿 mRNA 移动，读到终止密码子，肽链就合成好了。', next: null }
    if (!u.done) return { hint: '核糖体沿 mRNA 往前移…', next: null }
    if (goal === 0) return { hint: '核糖体结合在 mRNA 上，起始密码子 AUG 在它里面。按“前进一个密码子”', next: 'step' }
    if (goal === 1) return { hint: 'tRNA 的反密码子 UAC 对上了 AUG，带来甲硫氨酸。再按“前进一个密码子”', next: 'step' }
    return { hint: '第二个氨基酸接上了，核糖体往前挪了三个碱基。按“翻译到底”', next: 'all' }
  })()
  const P = poseAt(u.at), settled = u.done
  const labels: Label[] = [
    { id: 'm', at: [O6[0] - 0.6, O6[1] + 0.3, O6[2]] as V3, ax: 1, className: 'scene-tag key -translate-x-2 -translate-y-1/2', children: <><small>5′</small>mRNA</> },
    ...(settled && goal < U_END ? (['E', 'P', 'A'] as const).map((n, j) => ({ id: `s${n}`, at: [codonX(Math.round(P.pSite) + j - 1), O6[1] + 2.75, O6[2] + 1.2] as V3, ax: 0.5, className: 'scene-name -translate-y-1/2', children: `${n} 位` })) : []),
    ...(goal === 0 && settled ? [
      { id: 'rb', at: [codonX(0) + 3.6, O6[1] + 6.2, O6[2]] as V3, ax: 0, name: true, className: 'scene-tag translate-x-1 -translate-y-1/2', children: '核糖体 · 大亚基' }, { id: 'rs', at: [codonX(0) + 3.6, O6[1] - 1.6, O6[2]] as V3, ax: 0, name: true, className: 'scene-tag translate-x-1 -translate-y-1/2', children: '小亚基' },
    ] : []),
    ...(settled && goal >= 1 && goal < U_END ? [{ id: 'tr', at: [P.trna[goal - 1].p[0] + 2.3, P.trna[goal - 1].p[1] + 2.0, P.trna[goal - 1].p[2]] as V3, ax: 0, className: 'scene-name translate-x-1 -translate-y-1/2', children: `tRNA · 反密码子 ${anticodon(CS6[goal - 1])}` }] : []),
    ...(settled && goal >= 1 ? P.beads.map((b, i) => goal >= U_END ? { id: `a${i}`, at: [b.p[0], b.p[1] + (i % 2 ? -0.55 : 0.55), b.p[2]] as V3, ax: 0.5, className: `scene-tag ${i % 2 ? 'translate-y-1' : '-translate-y-full'}`, children: AA_NAME[b.aa] } : { id: `a${i}`, at: [b.p[0] - 0.6, b.p[1], b.p[2]] as V3, ax: 1, className: 'scene-tag -translate-x-1 -translate-y-1/2', children: AA_NAME[b.aa] }) : []),
    ...(settled && goal >= U_END ? [{ id: 'st', at: [codonX(U_END - 1), O6[1] - 0.4, O6[2]] as V3, ax: 0.5, className: 'scene-tag key translate-y-2', children: 'UGA · 终止' }] : []),
  ]
  const made = Math.max(0, Math.min(goal, AAS.length)), aSite = Math.min(U_END - 1, goal)
  return (
    <LabShell title="基因的表达" lessons={LESSONS} current="6" narration={voiced(NARRATION['6'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="翻译"
      stage={<Room at="six" aim={[codonX(P.pSite) + 0.6, O6[1] + 3.6, O6[2]]} labels={labels}><Scene6 u={u.ref} /></Room>}
      lesson={<LessonBlock no="6" title="翻译" concept="核糖体沿 mRNA 移动，tRNA 运来氨基酸" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>游离在细胞质中的各种氨基酸，以 mRNA 为模板合成具有一定氨基酸顺序的蛋白质，这一过程叫<b className="text-white">翻译</b>，场所是<b className="text-white">核糖体</b>。</p>
          <p className="mt-2"><b className="text-white">tRNA</b> 像三叶草，一端携带氨基酸，另一端有 3 个碱基，能和 mRNA 上的密码子互补配对，叫<b className="text-white">反密码子</b>。</p>
          <p className="mt-2">核糖体沿 mRNA 移动，读取下一个密码子；新运来的氨基酸和肽链通过脱水缩合连接，用过的 tRNA 离开，再去转运氨基酸。读到终止密码子，合成停止，肽链从核糖体上脱离。</p>
        </>} />}
      finale={T.finale && <Finale kicker="肽链合成好了" title="核糖体读到终止密码子，肽链脱下" text={`${MRNA.length} 个碱基，${CS6.length} 个密码子（最后一个是终止密码子），连成 ${AAS.length} 个氨基酸：${AAS.map(a => AA_NAME[a]).join('—')}。3 个碱基决定 1 个氨基酸。`} notes="tRNA、核糖体都放大画成了好认的形状，大小比例是示意。" />}
      panel={
        <Glass className="px-4 py-4">
          <div className="grid grid-cols-2 gap-2">
            <ParamTile symbol="密码子" value={CS6[aSite]} unit={goal >= U_END ? '终止' : aaName(CS6[aSite])} />
            <ParamTile symbol="反密码子" value={goal >= U_END ? '—' : anticodon(CS6[aSite])} unit="tRNA 上" />
            <ParamTile symbol="氨基酸" value={String(made)} unit="个 · 肽链" />
            <ParamTile symbol="读过" value={String(Math.min(goal, U_END) * 3)} unit={`个碱基 · 共 ${MRNA.length} 个`} />
          </div>
          <H>mRNA</H>
          <Seq s={MRNA} group={3} />
          <H>肽链</H>
          <div className="flex flex-wrap gap-1.5">{AAS.slice(0, made).map((a, i) => <span key={i} className="rounded-full px-2.5 py-1 text-[13px] font-semibold text-[#10151a]" style={{ background: aaColor(a) }}>{AA_NAME[a]}</span>)}{!made && <span className="text-[13px] text-white/45">还没有</span>}</div>
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'step'} onClick={() => setGoal(g => Math.min(U_END, g + 1))} disabled={!u.done || goal >= U_END}>前进一个密码子</LabButton>
        <LabButton pulse={next === 'all'} onClick={() => setGoal(U_END)} disabled={!u.done || goal >= U_END || goal < 1}>翻译到底</LabButton>
      </>}
      extras={null}
    />
  )
}
