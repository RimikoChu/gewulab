// 分子的形状和晶体 · 第 1 课 电子对互相排斥：北墙前第一个展台。转台上一个球棍模型，配位原子一开始挤在一侧。
// 先数中心原子周围有几对价层电子对，再松开：电子对互相推开，停在彼此最远的位置；最后量键角。CO₂、BF₃、CH₄ 各做一遍。
import { useState } from 'react'
import { voiced } from '@/lab-kit/narration'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { Fin, Row } from './fin'
import { LESSONS, goLesson } from './lessons'
import { MoleculeModel, bondDirs, frontPair } from './mol'
import { NARRATION } from './narration'
import { useRun } from './parts'
import { ATOM, MOLS, accept, angleText, bondAngle, lonePairs, pairs, sigmaPairs, type MolKey } from './physics'
import { VOICE } from './voice'
import { Place, SPOT, center } from './world'

const ORDER: MolKey[] = ['CO2', 'BF3', 'CH4']
const TASKS: Task[] = ORDER.map(m => ({ id: m, text: `${MOLS[m].text}：数电子对，松开，量键角`, note: `${pairs(m)} 对电子对，键角 ${angleText(bondAngle(m))}，${MOLS[m].shape}` }))
const C = center('l1'), L = 1.9, S = 1.2

export default function Lesson1() {
  const T = useTasks('gewu:crystal:1', TASKS)
  const [mol, setMol] = useState<MolKey>('CO2')
  const [counted, setCounted] = useState(false), [freed, setFreed] = useState(false), [measured, setMeasured] = useState(false)
  const free = useRun(1.9)
  const pick = (m: MolKey) => { setMol(m); setCounted(false); setFreed(false); setMeasured(false); free.snap(0) }
  const resetAll = () => { pick('CO2'); T.reset() }
  const release = () => { setFreed(true); free.run() }
  const measure = () => { setMeasured(true); T.check(id => id === mol) }
  const spread = freed ? (free.busy ? free.k : 1) : 0, settled = freed && !free.busy
  const M = MOLS[mol], task = T.current

  const { hint, next }: { hint: string; next: 'mol' | 'count' | 'free' | 'angle' | null } = !task ? { hint: '三个分子都量完了。拖动画面，可以转着看模型。', next: null }
    : free.busy ? { hint: '电子对互相推开…', next: null }
    : mol !== task.id && (measured || !counted) ? { hint: `把分子换成 ${MOLS[task.id as MolKey].text}`, next: 'mol' }
    : !counted ? { hint: `数一数 ${M.text} 的中心原子周围有几对价层电子对`, next: 'count' }
    : !freed ? { hint: `${pairs(mol)} 对电子对挤在一起。松开，让它们互相推开`, next: 'free' }
    : !measured ? { hint: '停住了。量一量两根键之间的夹角', next: 'angle' }
    : { hint: `把分子换成 ${MOLS[task.id as MolKey].text}`, next: 'mol' }

  const { pair, mid } = frontPair(bondDirs(mol, spread), SPOT.l1.view), ml = 1
  const labels: Label[] = [
    { id: 'n', at: [C[0], C[1] + 3.3, C[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: `${M.name} ${M.text} 的球棍模型` },
    { id: 'p', at: [C[0] - 2.3, C[1] - 1.6, C[2]], ax: 1, className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: counted ? 1 : 0 }, children: <><small>价层电子对</small>{pairs(mol)} 对</> },
    { id: 'a', at: [C[0] + mid[0] / ml * (L * 0.5 + 0.35) * S, C[1] + mid[1] / ml * (L * 0.5 + 0.35) * S, C[2] + mid[2] / ml * (L * 0.5 + 0.35) * S], ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: measured ? 1 : 0 }, children: <><small>键角</small>{angleText(bondAngle(mol))}</> },
  ]
  return (
    <LabShell title="分子的形状和晶体" lessons={LESSONS} current="1" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['1'], VOICE)} actionsLabel="操作"
      stage={<Place at="l1" labels={labels}><group position={C} scale={S}><MoleculeModel m={mol} L={L} spread={spread} marks={counted && !measured} arc={measured} arcPair={pair} /></group></Place>}
      lesson={<LessonBlock no="1" title="电子对互相排斥" concept="电子对互相排斥，离得越远越稳定" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>价层电子对互斥模型认为：分子的空间结构是中心原子周围的“价层电子对”相互排斥的结果。价层电子对包括 σ 键电子对和中心原子上的孤电子对；多重键只算一对。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>σ 键电子对数 = 和中心原子结合的原子数</li>
            <li>孤电子对数 = ½(a − xb)：a 是中心原子的价电子数，x 是和中心原子结合的原子数，b 是这些原子最多能接受的电子数（氢为 1，其他原子为 8 减去它的价电子数）</li>
            <li>2 对：直线形，180°；3 对：平面三角形，120°；4 对：正四面体形，109°28′</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">模型里球的大小、键的长短是示意；一开始挤在一起的样子是为了看清“推开”而摆的，真实的分子不会停在那里。</p>
        </>} />}
      finale={T.finale && <Fin tag="三个分子都量完了" big="电子对越多，推开以后的夹角越小">2 对电子对排成直线形，180°；3 对排成平面三角形，120°；4 对排成正四面体形，109°28′。</Fin>}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[12.5px] text-white/55">{M.text} 的键角</div>
            <div className="mt-1 text-[44px] leading-none font-bold tracking-tight tabular-nums">{measured ? angleText(bondAngle(mol)) : '—'}</div>
            <div className="mt-1.5 text-[14px] text-[#7fe3d4]">{measured ? M.shape : settled ? '量一量才知道' : ' '}</div>
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">数电子对</h2>
          <div className="mt-1">
            <Row name="σ 键电子对" on={counted}>{sigmaPairs(mol)}（连着 {M.x} 个 {M.ligand}）</Row>
            <Row name="孤电子对 ½(a − xb)" on={counted}>½({ATOM[M.center]!.valence} − {M.x}×{accept(M.ligand)}) = {lonePairs(mol)}</Row>
            <Row name="价层电子对" on={counted}>{pairs(mol)} 对</Row>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {ORDER.map(m => <ParamTile key={m} symbol={MOLS[m].text} value={T.done[m] ? angleText(bondAngle(m)) : '—'} unit={T.done[m] ? `${pairs(m)} 对` : '还没量'} />)}
          </div>
        </Panel>
      }
      actions={<>
        <LabButton pulse={next === 'count'} onClick={() => setCounted(true)} disabled={counted}>数电子对</LabButton>
        <LabButton pulse={next === 'free'} onClick={release} disabled={!counted || freed}>松开</LabButton>
        <LabButton primary pulse={next === 'angle'} onClick={measure} disabled={!settled || measured}>量键角</LabButton>
      </>}
      extras={
        <Control label="分子">
          <Segmented label="分子" pulse={next === 'mol'} want={next === 'mol' ? (task?.id as MolKey) : null} value={mol} onChange={k => pick(k as MolKey)} disabled={free.busy} options={ORDER.map(m => ({ value: m, label: MOLS[m].text }))} />
        </Control>
      }
    />
  )
}
