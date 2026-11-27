// 分子的形状和晶体 · 第 2 课 孤电子对：北墙前第二个展台。CH₄、NH₃、H₂O 的中心原子周围都是 4 对价层电子对，
// NH₃ 有 1 对、H₂O 有 2 对是孤电子对：把它们显示出来（半透明的瓣），再量键角：109°28′、107°、105°。
import { useState } from 'react'
import { voiced } from '@/lab-kit/narration'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { Fin, Row } from './fin'
import { LESSONS, goLesson } from './lessons'
import { MoleculeModel, frontPair } from './mol'
import { NARRATION } from './narration'
import { useRun } from './parts'
import { MOLS, angleText, bondAngle, dirs, lonePairs, pairs, sigmaPairs, type MolKey } from './physics'
import { VOICE } from './voice'
import { Place, SPOT, center } from './world'

const ORDER: MolKey[] = ['CH4', 'NH3', 'H2O']
const TASKS: Task[] = [
  { id: 'CH4', text: 'CH₄：量出键角', note: '没有孤电子对，键角 109°28′，正四面体形' },
  { id: 'NH3', text: 'NH₃：显示孤电子对，再量键角', note: '1 对孤电子对，键角 107°，三角锥形' },
  { id: 'H2O', text: 'H₂O：显示孤电子对，再量键角', note: '2 对孤电子对，键角 105°，V 形' },
]
const C = center('l2'), L = 1.9, S = 1.15

export default function Lesson2() {
  const T = useTasks('gewu:crystal:2', TASKS)
  const [mol, setMol] = useState<MolKey>('CH4')
  const [shown, setShown] = useState(false), [measured, setMeasured] = useState(false)
  const show = useRun(1.3)
  const pick = (m: MolKey) => { setMol(m); setShown(false); setMeasured(false); show.snap(0) }
  const resetAll = () => { pick('CH4'); T.reset() }
  const reveal = () => { setShown(true); show.run() }
  const measure = () => { setMeasured(true); T.check(id => id === mol) }
  const M = MOLS[mol], n = lonePairs(mol), task = T.current
  const lone = shown ? (show.busy ? show.k : 1) : 0, ready = n === 0 || (shown && !show.busy)

  const { hint, next }: { hint: string; next: 'mol' | 'lone' | 'angle' | null } = !task ? { hint: '三个分子都量完了。拖动画面，可以转着看模型。', next: null }
    : show.busy ? { hint: '孤电子对显示出来了…', next: null }
    : mol !== task.id ? { hint: `把分子换成 ${MOLS[task.id as MolKey].text}`, next: 'mol' }
    : n > 0 && !shown ? { hint: `${M.text} 的中心原子上还有不成键的电子对。把孤电子对显示出来`, next: 'lone' }
    : n === 0 ? { hint: 'CH₄ 的 4 对电子对都用来成键。量一量键角', next: 'angle' }
    : { hint: `${n} 对孤电子对占着位置。量一量键角`, next: 'angle' }

  const { pair, mid } = frontPair(dirs(mol).bonds, SPOT.l2.view), ml = 1
  const lp = dirs(mol).lone, top = lp.reduce((s, d) => [s[0] + d[0] / lp.length, s[1] + d[1] / lp.length, s[2] + d[2] / lp.length], [0, 0, 0])
  const labels: Label[] = [
    { id: 'n', at: [C[0] - 2.4, C[1] - 0.2, C[2]], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: `${M.name} ${M.text}` },
    { id: 'l', at: [C[0] + top[0] * 2.2 * S, C[1] + top[1] * 2.2 * S + 0.35, C[2] + top[2] * 2.2 * S], ax: 0.5, className: 'scene-tag -translate-y-full transition-opacity', style: { opacity: lone > 0.9 ? 1 : 0 }, children: lp.length > 1 ? `${lp.length} 对孤电子对` : '孤电子对' },
    { id: 'a', at: [C[0] + mid[0] / ml * (L * 0.5 + 0.4) * S, C[1] + mid[1] / ml * (L * 0.5 + 0.4) * S - 0.2, C[2] + mid[2] / ml * (L * 0.5 + 0.4) * S], ax: 0.5, className: 'scene-tag key transition-opacity', style: { opacity: measured ? 1 : 0 }, children: <><small>键角</small>{angleText(bondAngle(mol))}</> },
  ]
  return (
    <LabShell title="分子的形状和晶体" lessons={LESSONS} current="2" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['2'], VOICE)} actionsLabel="操作"
      stage={<Place at="l2" labels={labels}><group position={C} scale={S}><MoleculeModel m={mol} L={L} lone={lone} arc={measured} arcPair={pair} /></group></Place>}
      lesson={<LessonBlock no="2" title="孤电子对" concept="孤电子对也占地方，还把键角挤小" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>CH₄、NH₃、H₂O 的中心原子周围都有 4 对价层电子对，它们的 VSEPR 模型都是四面体形。但 NH₃ 有 1 对、H₂O 有 2 对是孤电子对。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>看分子的空间结构时，略去孤电子对，只看原子：NH₃ 是三角锥形，H₂O 是 V 形</li>
            <li>孤电子对离中心原子更近，对成键电子对的排斥更强，所以键角依次变小：109°28′、107°、105°</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">孤电子对画成半透明的瓣，里面两个亮点代表两个电子，是示意。</p>
        </>} />}
      finale={T.finale && <Fin tag="三个分子都量完了" big="都是 4 对电子对，孤电子对越多，键角越小">CH₄ 109°28′，NH₃ 107°，H₂O 105°。VSEPR 模型都是四面体形；略去孤电子对，分子的空间结构分别是正四面体形、三角锥形、V 形。</Fin>}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[12.5px] text-white/55">{M.text} 的键角</div>
            <div className="mt-1 text-[44px] leading-none font-bold tracking-tight tabular-nums">{measured ? angleText(bondAngle(mol)) : '—'}</div>
          </div>
          <div className="mt-3">
            <Row name="价层电子对">{pairs(mol)} 对</Row>
            <Row name="其中 σ 键电子对">{sigmaPairs(mol)} 对</Row>
            <Row name="其中孤电子对" on={ready}>{n} 对</Row>
            <Row name="VSEPR 模型" on={ready}>{M.vsepr}</Row>
            <Row name="分子的空间结构" on={measured}>{M.shape}</Row>
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">量过的键角</h2>
          <div className="mt-1">{ORDER.map(m => <Row key={m} name={`${MOLS[m].text} · 孤电子对 ${lonePairs(m)} 对`} on={!!T.done[m]}>{angleText(bondAngle(m))}</Row>)}</div>
        </Panel>
      }
      actions={<>
        <LabButton pulse={next === 'lone'} onClick={reveal} disabled={n === 0 || shown}>显示孤电子对</LabButton>
        <LabButton primary pulse={next === 'angle'} onClick={measure} disabled={!ready || measured || show.busy}>量键角</LabButton>
      </>}
      extras={
        <Control label="分子">
          <Segmented label="分子" pulse={next === 'mol'} want={next === 'mol' ? (task?.id as MolKey) : null} value={mol} onChange={k => pick(k as MolKey)} disabled={show.busy} options={ORDER.map(m => ({ value: m, label: MOLS[m].text }))} />
        </Control>
      }
    />
  )
}
