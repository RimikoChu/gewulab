// 分子的形状和晶体 · 拓展 石墨和金刚石：西窗下的展台。同样是碳，石墨是一层一层的六边形网，金刚石是连成一片的立体网。
// 用推杆推一推最上面一层：石墨一推就滑，金刚石推不动。再加电压：石墨的灯亮，金刚石的不亮。
import { useState } from 'react'
import { voiced } from '@/lab-kit/narration'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { Metal, useTasks, type Label } from '@/lab-kit'
import { A, CellModel } from './cell'
import { Fin, Row } from './fin'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { ease, lerp, seg, useRun, useTime } from './parts'
import { CARBON, spareElectrons, type CarbonKey } from './physics'
import { Circuit, Electrons, G_GAP, Graphite } from './rig'
import { VOICE } from './voice'
import { Place, center } from './world'

const TASKS: Task[] = [
  { id: 'gp', text: '石墨：推一推最上面一层', note: '一推就滑开：层和层之间只有范德华力' },
  { id: 'gv', text: '石墨：加电压', note: '灯亮了：每个碳原子剩 1 个电子，能在层里移动' },
  { id: 'd', text: '换成金刚石，推一推、加电压', note: '推不动，灯也不亮：4 个价电子全用来形成共价键' },
]
const DROP = 3.3, C = center('x', DROP), ROT = 1.45, SLIDE = 1.5, PUSH = 2.8
/** 推杆的立柱相对推杆的位置（x、z）：在右后侧 */
const POST: [number, number] = [2.6, 2.9]

export default function LessonX() {
  const T = useTasks('gewu:crystal:x', TASKS)
  const [carbon, setCarbon] = useState<CarbonKey>('graphite')
  const [pushed, setPushed] = useState(false), [volted, setVolted] = useState(false)
  const t = useTime()
  const done = (p: boolean, v: boolean) => T.check(id => carbon === 'graphite' ? (id === 'gp' && p) || (id === 'gv' && v) : id === 'd' && p && v)
  const push = useRun(PUSH, () => { setPushed(true); done(true, volted) }), volt = useRun(3.4, () => { setVolted(true); done(pushed, true) })
  const pick = (c: CarbonKey) => { setCarbon(c); setPushed(false); setVolted(false); push.snap(0); volt.snap(0) }
  const resetAll = () => { pick('graphite'); T.reset() }
  const busy = push.busy || volt.busy, K = CARBON[carbon], task = T.current, g = carbon === 'graphite'
  const want: CarbonKey = T.done.gp && T.done.gv ? 'diamond' : 'graphite'
  // 推杆：伸过去顶住最上面一层，往前推，再收回来
  const slide = !g ? 0 : push.busy ? SLIDE * ease(seg(push.t, 0.7, 1.9)) : pushed ? SLIDE : 0
  const edge = g ? 2.2 + 0.28 : A / 2 + 0.45, topY = g ? G_GAP : A / 2 - 0.1
  const tip = push.busy ? (push.t < 0.7 ? lerp(5.2, edge, ease(push.t / 0.7)) : push.t < 1.9 ? edge - (g ? SLIDE * ease(seg(push.t, 0.7, 1.9)) : 0) : lerp(edge - (g ? SLIDE : 0), 5.2, ease(seg(push.t, 1.9, PUSH)))) : 5.2
  const shake = !g && push.busy && push.t > 0.7 && push.t < 1.9 ? Math.sin(push.t * 60) * 0.012 : 0
  const lit = volt.busy && volt.t > 0.6 && K.conducts

  const { hint, next }: { hint: string; next: 'c' | 'push' | 'volt' | null } = !task ? { hint: '石墨和金刚石都试过了。拖动画面，可以转着看。', next: null }
    : push.busy ? { hint: '推杆顶住最上面一层，往前推…', next: null }
    : volt.busy ? { hint: '加上电压，看小灯亮不亮…', next: null }
    : carbon !== want ? { hint: `把模型换成${CARBON[want].name}`, next: 'c' }
    : !pushed ? { hint: g ? '石墨是一层一层的，层和层之间没有键。推一推最上面一层' : '金刚石里每个碳原子都和 4 个碳原子连着。也推一推', next: 'push' }
    : { hint: g ? '滑开了。再给石墨加上电压' : '推不动。再给金刚石加上电压', next: 'volt' }

  const labels: Label[] = [
    { id: 'n', at: [C[0], C[1] + 3.4, C[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: g ? '石墨：三层六边形的网' : '金刚石晶胞' },
    { id: 'g', at: [C[0] + 2.4, C[1] + G_GAP / 2, C[2] + 2.6], ax: 0, className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: g && !busy ? 1 : 0 }, children: <><small>层间距</small>{K.gap} pm</> },
    { id: 'r', at: [C[0] + 0.4, C[1] + topY + 0.9, C[2]], ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: pushed && !busy ? 1 : 0 }, children: K.slides ? '滑开了' : '推不动' },
    { id: 'l', at: [C[0] - 2.1 * Math.cos(ROT) + 2.5 * Math.sin(ROT), C[1] - DROP + 1.9, C[2] + 2.1 * Math.sin(ROT) + 2.5 * Math.cos(ROT)], ax: 0.5, className: `scene-tag ${lit ? 'key' : ''} -translate-y-full transition-opacity`, style: { opacity: volt.busy && volt.t > 0.8 ? 1 : 0 }, children: lit ? '灯亮了' : '灯不亮' },
  ]
  return (
    <LabShell title="分子的形状和晶体" lessons={LESSONS} current="x" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION.x, VOICE)} actionsLabel="操作"
      stage={<Place at="x" labels={labels}><group position={C} rotation-y={ROT}>
        {g ? <Graphite slide={slide} /> : <group position={[0, -0.1, shake]}><CellModel c="diamond" /></group>}
        {g && <Electrons n={21} box={[6.2, 0, 3.8]} ys={[-G_GAP + 0.34, 0.34, G_GAP + 0.34]} t={t} drift={volt.busy ? 5 : 0} />}
        <Circuit w={g ? 3.55 : A / 2 + 0.75} drop={DROP} on={volt.busy} lit={lit} size={g ? [G_GAP * 2 + 1.3, 4.6] : [A + 0.5, A + 0.3]} at={[-2.1, 2.5]} />
        {/* 推杆：一根镀铬的杆穿在立柱顶上的套筒里，前头一块橡胶垫 */}
        <group position={[0.6, 0, 0]}>
          <mesh position={[0, topY, tip + 1.9]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.085, 0.085, 3.8, 16]} /><Metal kind="chrome" /></mesh>
          <mesh position={[0, topY, tip + 0.06]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.3, 0.3, 0.12, 24]} /><meshStandardMaterial color="#1b1d20" roughness={0.8} /></mesh>
          <mesh position={[0, topY, tip + 3.9]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.2, 0.2, 0.8, 24]} /><meshStandardMaterial color="#b3261e" roughness={0.45} /></mesh>
          {/* 立柱立在转台右后侧的石台面上，一条横臂伸过来托住套筒：不挡在模型前面 */}
          <mesh position={[POST[0], (topY - DROP - 0.55) / 2, POST[1]]} castShadow><cylinderGeometry args={[0.11, 0.11, topY + DROP + 0.55, 16]} /><Metal kind="steel" grain="turned" /></mesh>
          <mesh position={[POST[0], -DROP - 0.5, POST[1]]} castShadow><cylinderGeometry args={[0.42, 0.48, 0.12, 28]} /><Metal kind="iron" grain="cast" /></mesh>
          <mesh position={[POST[0], topY, (POST[1] + 4.9) / 2]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.07, 0.07, 4.9 - POST[1] + 0.2, 12]} /><Metal kind="steel" grain="turned" /></mesh>
          <mesh position={[POST[0] / 2, topY, 4.9]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.07, 0.07, POST[0], 12]} /><Metal kind="steel" grain="turned" /></mesh>
          <mesh position={[0, topY, 4.9]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.2, 0.2, 0.7, 20]} /><Metal kind="aluminum" grain="turned" /></mesh>
        </group>
      </group></Place>}
      lesson={<LessonBlock no="拓展" title="石墨和金刚石" concept="同样是碳，连法不同，性质差得很远" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>石墨是混合型晶体：层内每个碳原子用共价键和 3 个碳原子相连（sp² 杂化），排成平面六边形的网；层和层之间靠范德华力。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>层间作用弱，容易滑动，所以石墨质软，可以做润滑剂和铅笔芯</li>
            <li>每个碳原子还剩 1 个价电子，这些电子能在整层里移动，所以石墨能导电</li>
            <li>金刚石里每个碳原子用共价键和 4 个碳原子相连（sp³ 杂化），是共价晶体：硬度很大，不导电</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">石墨模型里层间距和键长的比是按 335 pm : 142 pm 画的。</p>
        </>} />}
      finale={T.finale && <Fin tag="石墨和金刚石都试过了" big="石墨层间容易滑动、能导电；金刚石又硬又不导电">石墨每个碳原子连 3 个碳原子，剩 1 个电子在层里移动，层间只有范德华力；金刚石每个碳原子连 4 个，全是共价键。</Fin>}
      panel={
        <Panel className="px-4 py-4">
          <div className="grid grid-cols-2 gap-2">
            <ParamTile symbol="C—C" value={String(K.bond)} unit="pm · 相邻碳原子" />
            <ParamTile symbol="层间距" value={K.gap ? String(K.gap) : '—'} unit={K.gap ? 'pm' : '没有分层'} />
          </div>
          <div className="mt-3">
            <Row name="每个碳原子连着">{K.neighbors} 个碳原子（{K.hybrid}）</Row>
            <Row name="没用来成 σ 键的价电子">{spareElectrons(carbon)} 个</Row>
            <Row name="推一推" on={pushed}>{K.slides ? '层和层滑开了' : '推不动'}</Row>
            <Row name="加电压" on={volted}>{K.conducts ? '灯亮，导电' : '灯不亮，不导电'}</Row>
          </div>
        </Panel>
      }
      actions={<>
        <LabButton pulse={next === 'push'} onClick={() => push.run()} disabled={busy || pushed}>推一推</LabButton>
        <LabButton primary pulse={next === 'volt'} onClick={() => volt.run()} disabled={busy || !pushed || volted}>加电压</LabButton>
      </>}
      extras={
        <Control label="模型">
          <Segmented label="模型" pulse={next === 'c'} want={next === 'c' ? want : null} value={carbon} onChange={c => pick(c as CarbonKey)} disabled={busy} options={[{ value: 'graphite', label: '石墨' }, { value: 'diamond', label: '金刚石' }]} />
        </Control>
      }
    />
  )
}
