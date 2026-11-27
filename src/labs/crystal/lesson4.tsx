// 分子的形状和晶体 · 第 4 课 分子的极性：北墙前第四个展台。先在每根键上画出键的极性（箭头指向电负性大的原子），
// 再把这些箭头合成：尾巴并到中心原子上，看它们是互相抵消，还是合成一支大箭头。五个分子都做一遍。
import { useState } from 'react'
import { voiced } from '@/lab-kit/narration'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { Fin, Row } from './fin'
import { LESSONS, goLesson } from './lessons'
import { MoleculeModel } from './mol'
import { NARRATION } from './narration'
import { seg, useRun } from './parts'
import { MOLS, bondPolar, dipoleSum, type MolKey } from './physics'
import { VOICE } from './voice'
import { Place, center } from './world'

const ORDER: MolKey[] = ['CO2', 'H2O', 'BF3', 'CH4', 'NH3']
const REST: MolKey[] = ['BF3', 'CH4', 'NH3']
const TASKS: Task[] = [
  { id: 'CO2', text: 'CO₂：画出两根键的极性，合成', note: '两支箭头大小相等、方向相反，抵消了：非极性分子' },
  { id: 'H2O', text: 'H₂O：同样做一遍', note: `两支箭头夹着 105°，抵消不了，向量和 ${dipoleSum('H2O').size.toFixed(2)}：极性分子` },
  { id: 'rest', text: '把 BF₃、CH₄、NH₃ 也都做一遍', note: 'BF₃、CH₄ 抵消了；NH₃ 抵消不了，是极性分子' },
]
const C = center('l4')
const sumText = (m: MolKey) => dipoleSum(m).polar ? dipoleSum(m).size.toFixed(2) : '0'
const verdict = (m: MolKey) => dipoleSum(m).polar ? '极性分子' : '非极性分子'

export default function Lesson4() {
  const T = useTasks('gewu:crystal:4', TASKS)
  const [mol, setMol] = useState<MolKey>('CO2')
  const [stage, setStage] = useState(0)                 // 0 什么都没画，1 画了键的极性，2 合成了
  const [seen, setSeen] = useState<MolKey[]>([])
  const draw = useRun(0.9), add = useRun(2.4, () => { const n = seen.includes(mol) ? seen : [...seen, mol]; setSeen(n); T.check(id => id === 'rest' ? REST.every(m => n.includes(m)) : n.includes(id as MolKey)) })
  const pick = (m: MolKey) => { setMol(m); setStage(0); draw.snap(0); add.snap(0) }
  const resetAll = () => { pick('CO2'); setSeen([]); T.reset() }
  const busy = draw.busy || add.busy
  const polar = stage >= 1 ? (draw.busy ? draw.k : 1) : 0
  const merge = stage >= 2 ? (add.busy ? seg(add.k, 0, 0.5) : 1) : 0, sum = stage >= 2 ? (add.busy ? seg(add.k, 0.5, 1) : 1) : 0
  const M = MOLS[mol], tot = dipoleSum(mol), task = T.current, done = stage >= 2 && !add.busy
  const want = ORDER.find(m => !seen.includes(m)) ?? null

  const { hint, next }: { hint: string; next: 'mol' | 'draw' | 'add' | null } = !task || !want ? { hint: '五个分子都看过了。拖动画面，可以转着看箭头。', next: null }
    : draw.busy ? { hint: '箭头指向电负性大的原子…', next: null }
    : add.busy ? { hint: '把箭头的尾巴并到一起…', next: null }
    : mol !== want && (stage === 0 || done) ? { hint: `把分子换成 ${MOLS[want].text}`, next: 'mol' }
    : stage === 0 ? { hint: `${M.center}—${M.ligand} 键两头的原子不同，是极性键。画出键的极性`, next: 'draw' }
    : stage === 1 ? { hint: `${M.x} 根键各有一支箭头。把它们合成`, next: 'add' }
    : { hint: `把分子换成 ${MOLS[want].text}`, next: 'mol' }

  const hi = bondPolar(mol) > 0 ? M.ligand : M.center
  const labels: Label[] = [
    { id: 'n', at: [C[0], C[1] + 2.9, C[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: `${M.name} ${M.text}` },
    { id: 'e', at: [C[0] - 2.5, C[1] - 1.5, C[2]], ax: 1, className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: stage === 1 && !draw.busy ? 1 : 0 }, children: <><small>箭头指向</small>{hi} 原子</> },
    { id: 's', at: [C[0] + 2.3, C[1] + (tot.polar ? 1.6 : -1.6), C[2]], ax: 0, className: `scene-tag ${tot.polar ? 'key' : ''} -translate-y-1/2 transition-opacity`, style: { opacity: done ? 1 : 0 }, children: <><small>向量和</small>{sumText(mol)}{tot.polar ? '' : '（抵消）'}</> },
  ]
  return (
    <LabShell title="分子的形状和晶体" lessons={LESSONS} current="4" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['4'], VOICE)} actionsLabel="操作"
      stage={<Place at="l4" labels={labels}><group position={C} scale={1.18}><MoleculeModel m={mol} lone={1} polar={polar} merge={merge} sum={sum} /></group></Place>}
      lesson={<LessonBlock no="4" title="分子的极性" concept="键的极性的向量和为零，分子就没有极性" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>不同的原子吸引电子的能力不同（电负性不同），它们之间的共用电子对会偏向电负性大的原子，这样的共价键叫极性键。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>分子有没有极性，看各根键的极性的向量和是不是等于零，也就是正电中心和负电中心是不是重合</li>
            <li>CO₂、BF₃、CH₄ 的键都是极性键，但分子的形状对称，向量和为零：非极性分子</li>
            <li>H₂O 是 V 形、NH₃ 是三角锥形，向量和不为零：极性分子</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">读数把一根键的极性记作 1，只看方向怎样合成；不同的键极性其实有大有小。</p>
        </>} />}
      finale={T.finale && <Fin tag="五个分子都看过了" big="有极性键的分子，不一定是极性分子">CO₂、BF₃、CH₄ 形状对称，键的极性互相抵消；H₂O、NH₃ 抵消不了，是极性分子。</Fin>}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[12.5px] text-white/55">{M.text} 各根键的极性的向量和</div>
            <div className="mt-1 text-[44px] leading-none font-bold tracking-tight tabular-nums">{done ? sumText(mol) : '—'}</div>
            <div className="mt-1.5 text-[14px] text-[#7fe3d4]">{done ? verdict(mol) : ' '}</div>
          </div>
          <div className="mt-3">
            <Row name="键" on={stage >= 1}>{M.x} 根 {M.center}—{M.ligand} 极性键</Row>
            <Row name="分子的空间结构">{M.shape}</Row>
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">看过的分子（一根键的极性记作 1）</h2>
          <div className="mt-1">{ORDER.map(m => <Row key={m} name={`${MOLS[m].text} · ${MOLS[m].shape}`} on={seen.includes(m)}>{sumText(m)} · {verdict(m)}</Row>)}</div>
        </Panel>
      }
      actions={<>
        <LabButton pulse={next === 'draw'} onClick={() => { setStage(1); draw.run() }} disabled={stage !== 0 || busy}>画出键的极性</LabButton>
        <LabButton primary pulse={next === 'add'} onClick={() => { setStage(2); add.run() }} disabled={stage !== 1 || busy}>合成</LabButton>
      </>}
      extras={
        <Control label="分子">
          <Segmented label="分子" pulse={next === 'mol'} want={next === 'mol' ? want : null} value={mol} onChange={k => pick(k as MolKey)} disabled={busy} options={ORDER.map(m => ({ value: m, label: MOLS[m].text }))} />
        </Control>
      }
    />
  )
}
