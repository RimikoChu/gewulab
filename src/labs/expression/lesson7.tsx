// 基因的表达 · 第 7 课 基因突变：血红蛋白 β 链基因的一段，换成碱基替换、增添、缺失，各翻译一遍，和正常的肽链比；替换（GAG→GTG）就是镰状细胞贫血。
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { AA_NAME, HBB, MUTS, mutantProtein, mutate, tToU, type Mut } from './physics'
import { useTween, type V3 } from './kit'
import { RBC, RBC2, Scene7, VIS, X7, Y_AA, Y_DNA, Y_RNA, codon7 } from './scene7'
import { aaColor } from './mol'
import { Finale, H, Seq } from './ui'
import { VOICE } from './voice'
import { AT, Room } from './world'

const ORDER: Mut[] = ['none', 'sub', 'ins', 'del']
const TASKS: Task[] = [
  { id: 'none', text: '翻译正常的基因', note: '第 7 个密码子 GAG 决定谷氨酸' },
  { id: 'sub', text: '换成碱基替换，再翻译', note: 'GAG 变成 GUG：谷氨酸换成缬氨酸，只变了一个氨基酸' },
  { id: 'ins', text: '换成增添一个碱基，再翻译', note: '从增添的地方往后，三个一组全错开了' },
  { id: 'del', text: '换成缺失一个碱基，再翻译', note: '缺失也让后面的密码子全部错开' },
]
const NORMAL = mutantProtein('none').aa

export default function Lesson7() {
  const [kind, setKind] = useState<Mut>('none')
  const [done, setDone] = useState<Mut[]>([])
  const [jump, setJump] = useState(false)
  const shown = done.includes(kind)
  const tr = useTween(shown ? 1 : 0, 0.5, jump || !shown)
  const T = useTasks('gewu:expression:7', TASKS)
  const ready = shown && tr.done
  useEffect(() => { T.check(id => done.includes(id as Mut) && (id !== kind || ready)) }, [done, kind, ready])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setJump(true); setKind('none'); setDone([]); T.reset(); setTimeout(() => setJump(false), 50) }
  const task = T.current, P = mutantProtein(kind)
  const { hint, next, want }: { hint: string; next: 'kind' | 'go' | null; want?: Mut } = (() => {
    if (!task) return { hint: '基因中碱基的替换、增添或缺失，叫基因突变；它可能改变蛋白质。', next: null }
    if (shown && !tr.done) return { hint: '转录、翻译…', next: null }
    if (kind !== task.id) return { hint: `在“基因”里选${MUTS[task.id as Mut]}`, next: 'kind', want: task.id as Mut }
    if (kind === 'none') return { hint: '这是血红蛋白 β 链基因开头的一段。按“翻译这段”', next: 'go' }
    if (kind === 'sub') return { hint: '亮的那一对碱基 A—T 换成了 T—A。按“翻译这段”', next: 'go' }
    if (kind === 'ins') return { hint: '在同一个位置多了一个 G。按“翻译这段”', next: 'go' }
    return { hint: '在同一个位置少了一个 A。按“翻译这段”', next: 'go' }
  })()
  const labels: Label[] = [
    { id: 'dn', at: [X7 + (VIS - 0.8) * 0.62, Y_DNA, AT.seven[2]] as V3, ax: 1, className: 'scene-tag -translate-x-1 -translate-y-1/2', children: <>DNA<small className="ml-2">前 6 对略去</small></> },
    ...(shown ? [{ id: 'rn', at: [X7 + (VIS - 0.8) * 0.62, Y_RNA + 0.5, AT.seven[2]] as V3, ax: 1, className: 'scene-tag key -translate-x-1 -translate-y-1/2', children: 'mRNA' }] : []),
    ...(ready ? P.aa.map((a, k) => ({ hide: k < VIS / 3, id: `a${k}`, at: [codon7(k), Y_AA + (k % 2 ? -0.75 : 0.75), AT.seven[2]] as V3, ax: 0.5, className: `scene-tag ${k % 2 ? 'translate-y-1' : '-translate-y-full'}`, style: P.diff[k] ? { background: '#ff5a4f', color: '#fff' } : undefined, children: AA_NAME[a].replace('氨酸', '') })).filter(x => !x.hide).map(({ hide: _h, ...x }) => x) : []),
    ...(kind !== 'none' ? [{ id: 'mut', at: [X7 + (kind === 'del' ? 19 : 19.5) * 0.62, Y_DNA + 1.4, AT.seven[2]] as V3, ax: 0.5, className: 'scene-tag -translate-y-full', style: { background: '#ff5a4f', color: '#fff' }, children: `突变位点 · ${MUTS[kind]}` }] : []),
    { id: 'rbc', at: [RBC[0] - 2.1, RBC[1], RBC[2]] as V3, ax: 1, className: 'scene-tag -translate-x-1 -translate-y-1/2', children: '正常的红细胞（示意）' },
    ...(kind === 'sub' && ready ? [{ id: 'rbc2', at: [RBC2[0] + 2.4, RBC2[1], RBC2[2]] as V3, ax: 0, className: 'scene-tag translate-x-1 -translate-y-1/2', style: { background: '#ff5a4f', color: '#fff' }, children: '镰刀形红细胞（示意）' }] : []),
  ]
  const dna = mutate(HBB, kind)
  return (
    <LabShell title="基因的表达" lessons={LESSONS} current="7" narration={voiced(NARRATION['7'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="翻译"
      stage={<Room at="seven" labels={labels}><Scene7 kind={kind} shown={shown} tr={tr.ref} /></Room>}
      lesson={<LessonBlock no="7" title="基因突变" concept="碱基一变，蛋白质可能跟着变" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>DNA 分子中发生碱基的<b className="text-white">替换、增添或缺失</b>，而引起的基因碱基序列的改变，叫作<b className="text-white">基因突变</b>。</p>
          <p className="mt-2"><b className="text-white">镰状细胞贫血</b>：血红蛋白基因中一个碱基对被替换，mRNA 上的 GAG 变成 GUG，血红蛋白里的谷氨酸被缬氨酸替代，红细胞变成镰刀形，容易破裂。</p>
          <p className="mt-2">替换往往只改变一个氨基酸（也可能不变）；增添或缺失一个碱基，后面的密码子三个一组全部错开，影响通常更大。</p>
        </>} />}
      finale={T.finale && <Finale kicker="四种情况都翻译过了" title="碱基一变，蛋白质可能跟着变" text={`替换只让 1 个氨基酸变了（谷氨酸→缬氨酸），血红蛋白就出了问题；增添、缺失一个碱基，从第 7 个氨基酸往后全变了。`} notes="DNA 只画了血红蛋白 β 链基因最开头的 27 对碱基；增添、缺失放在同一个位置是为了对比；红细胞是示意模型。" />}
      panel={
        <Glass className="px-4 py-4">
          <H>编码链（{MUTS[kind]}）</H>
          <Seq s={dna} group={3} mark={kind === 'none' ? [] : [kind === 'del' ? 18 : 19]} />
          <H>mRNA</H>
          <Seq s={tToU(dna)} group={3} upto={shown ? undefined : 0} />
          <H>氨基酸 · 红色是和正常不同的</H>
          <div className="flex flex-wrap gap-1">{(shown ? P.aa : NORMAL).map((a, i) => <span key={i} className="rounded-full px-2 py-0.5 text-[12.5px] font-semibold" style={{ background: shown && P.diff[i] ? '#ff5a4f' : shown ? aaColor(a) : 'rgba(255,255,255,0.08)', color: shown ? (P.diff[i] ? '#fff' : '#10151a') : 'rgba(255,255,255,0.35)' }}>{AA_NAME[a].replace('氨酸', '')}</span>)}</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="变了" value={shown ? String(P.changed) : '—'} unit="个氨基酸" />
            <ParamTile symbol="碱基对" value={String(dna.length)} unit={`对 · 正常 ${HBB.length} 对`} />
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'go'} onClick={() => setDone(d => d.includes(kind) ? d : [...d, kind])} disabled={shown}>翻译这段</LabButton>
      </>}
      extras={
        <Control label="基因">
          <Segmented label="基因" pulse={next === 'kind'} want={want ?? null} value={kind} onChange={v => setKind(v as Mut)} disabled={shown && !tr.done} options={ORDER.map(k => ({ value: k, label: MUTS[k] }))} />
        </Control>
      }
    />
  )
}
