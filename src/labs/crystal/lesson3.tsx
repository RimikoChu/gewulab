// 分子的形状和晶体 · 第 3 课 杂化轨道：北墙前第三个展台。转台上是中心原子的轨道：一个球形的 s 轨道、三个哑铃形的 p 轨道。
// 按“杂化”：s 轨道和几个 p 轨道混成几个一样的杂化轨道（一大一小的瓣），指向电子对的方向；再按“成键”：配位原子靠过来，轨道头碰头重叠成 σ 键。
import { useState } from 'react'
import { voiced } from '@/lab-kit/narration'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { Fin, Row } from './fin'
import { LESSONS, goLesson } from './lessons'
import { Orbitals } from './mol'
import { NARRATION } from './narration'
import { useRun } from './parts'
import { MOLS, angleText, dirs, hybrid, pairs, type MolKey } from './physics'
import { VOICE } from './voice'
import { Place, center } from './world'

const ORDER: MolKey[] = ['CH4', 'BF3', 'CO2']
const TASKS: Task[] = ORDER.map(m => { const h = hybrid(m); return { id: m, text: `${MOLS[m].text}：让中心原子杂化，再成键`, note: `${h.type} 杂化：${h.n} 个杂化轨道，夹角 ${angleText(h.angle)}${h.rest ? `，剩 ${h.rest} 个 p 轨道` : ''}` } })
const C = center('l3', 3.6), NEAR: [number, number] = [6.2, 5.8]

export default function Lesson3() {
  const T = useTasks('gewu:crystal:3', TASKS)
  const [mol, setMol] = useState<MolKey>('CH4')
  const [stage, setStage] = useState(0)                 // 0 还没杂化，1 杂化了，2 成键了
  const mix = useRun(2.4), join = useRun(2.6, () => T.check(id => id === mol))
  const pick = (m: MolKey) => { setMol(m); setStage(0); mix.snap(0); join.snap(0) }
  const resetAll = () => { pick('CH4'); T.reset() }
  const busy = mix.busy || join.busy
  const k = stage >= 1 ? (mix.busy ? mix.k : 1) : 0, bond = stage >= 2 ? (join.busy ? join.k : 1) : 0
  const M = MOLS[mol], h = hybrid(mol), task = T.current, mixed = stage >= 1 && !mix.busy, done = stage >= 2 && !join.busy

  const { hint, next }: { hint: string; next: 'mol' | 'mix' | 'join' | null } = !task ? { hint: '三种杂化都看过了。拖动画面，可以转着看轨道。', next: null }
    : mix.busy ? { hint: 's 轨道和 p 轨道混在一起…', next: null }
    : join.busy ? { hint: `${M.x} 个${M.ligand === 'H' ? '氢' : M.ligand === 'F' ? '氟' : '氧'}原子靠过来…`, next: null }
    : mol !== task.id ? { hint: `把分子换成 ${MOLS[task.id as MolKey].text}`, next: 'mol' }
    : stage === 0 ? { hint: `${M.text} 的中心原子有 ${pairs(mol)} 对价层电子对。让它的轨道杂化`, next: 'mix' }
    : { hint: `得到 ${h.n} 个 ${h.type} 杂化轨道。让${M.ligand === 'H' ? '氢' : M.ligand === 'F' ? '氟' : '氧'}原子靠过来成键`, next: 'join' }

  const d0 = dirs(mol).bonds[0]
  const labels: Label[] = [
    { id: 's', at: [C[0] - 0.7, C[1] - 0.75, C[2] + 0.6], ax: 1, className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: stage === 0 ? 1 : 0 }, children: 's 轨道' },
    { id: 'p', at: [C[0] + 1.75, C[1] + 0.3, C[2]], ax: 0, className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: stage === 0 ? 1 : 0 }, children: 'p 轨道' },
    { id: 'h', at: [C[0] + d0[0] * 1.5 + 0.6, C[1] + d0[1] * 1.5, C[2] + d0[2] * 1.5], ax: 0, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: mixed && stage === 1 ? 1 : 0 }, children: `${h.type} 杂化轨道` },
    { id: 'r', at: [C[0], C[1] + (h.rest === 2 ? 1.75 : 0), C[2] + (h.rest === 1 ? 1.75 : 0)], ax: 0.5, className: 'scene-tag -translate-y-full transition-opacity', style: { opacity: mixed && h.rest > 0 ? 1 : 0 }, children: done && h.rest === 2 ? 'p 轨道肩并肩重叠：π 键' : '没参加杂化的 p 轨道' },
    { id: 'b', at: [C[0] + d0[0] * 1.4 - 0.5, C[1] + d0[1] * 1.4 + (mol === 'CH4' ? 0 : -0.5), C[2] + d0[2] * 1.4], ax: 1, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: done ? 1 : 0 }, children: '头碰头重叠：σ 键' },
  ]
  return (
    <LabShell title="分子的形状和晶体" lessons={LESSONS} current="3" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['3'], VOICE)} actionsLabel="操作"
      stage={<Place at="l3" labels={labels} span={stage < 2 ? NEAR : undefined}><group position={C}><Orbitals m={mol} k={k} bond={bond} /></group></Place>}
      lesson={<LessonBlock no="3" title="杂化轨道" concept="几对价层电子对，就要几个杂化轨道" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>形成分子时，中心原子能量相近的 s 轨道和 p 轨道会混合起来，得到几个能量相同、方向不同的杂化轨道。杂化轨道用来形成 σ 键或者容纳孤电子对。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>sp³：1 个 s 和 3 个 p，得 4 个杂化轨道，夹角 109°28′（CH₄；NH₃、H₂O 的中心原子也是 sp³）</li>
            <li>sp²：1 个 s 和 2 个 p，得 3 个杂化轨道，夹角 120°，剩 1 个 p 轨道（BF₃）</li>
            <li>sp：1 个 s 和 1 个 p，得 2 个杂化轨道，夹角 180°，剩 2 个 p 轨道（CO₂ 里它们和氧原子的 p 轨道形成 π 键）</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">轨道画成半透明的瓣，大小和形状是示意。</p>
        </>} />}
      finale={T.finale && <Fin tag="三种杂化都看过了" big="杂化轨道数等于价层电子对数">4 对用 sp³，3 对用 sp²，2 对用 sp。杂化轨道的夹角就是前两课量出来的 109°28′、120°、180°。</Fin>}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[12.5px] text-white/55">{M.text} 的中心原子</div>
            <div className="mt-1 text-[44px] leading-none font-bold tracking-tight">{mixed ? h.type : '—'}</div>
            <div className="mt-1.5 text-[14px] text-[#7fe3d4]">{mixed ? `1 个 s 轨道 + ${h.n - 1} 个 p 轨道` : ' '}</div>
          </div>
          <div className="mt-3">
            <Row name="杂化轨道" on={mixed}>{h.n} 个</Row>
            <Row name="杂化轨道之间的夹角" on={mixed}>{angleText(h.angle)}</Row>
            <Row name="没参加杂化的 p 轨道" on={mixed}>{h.rest} 个</Row>
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">做过的分子</h2>
          <div className="mt-1">{ORDER.map(m => <Row key={m} name={`${MOLS[m].text} · ${pairs(m)} 对价层电子对`} on={!!T.done[m]}>{hybrid(m).type}</Row>)}</div>
        </Panel>
      }
      actions={<>
        <LabButton pulse={next === 'mix'} onClick={() => { setStage(1); mix.run() }} disabled={stage !== 0 || busy}>杂化</LabButton>
        <LabButton primary pulse={next === 'join'} onClick={() => { setStage(2); join.run() }} disabled={stage !== 1 || busy}>成键</LabButton>
      </>}
      extras={
        <Control label="分子">
          <Segmented label="分子" pulse={next === 'mol'} want={next === 'mol' ? (task?.id as MolKey) : null} value={mol} onChange={k2 => pick(k2 as MolKey)} disabled={busy} options={ORDER.map(m => ({ value: m, label: MOLS[m].text }))} />
        </Control>
      }
    />
  )
}
