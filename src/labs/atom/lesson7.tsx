// 分子和原子 · 第 7 课 元素：东头墙上挂着元素周期表，下面实验台上三只展示座，各托着一个放大的原子核模型：碳-12、碳-14、氮-14。
// 选一个，数它的质子：碳-12 和碳-14 都是 6 个质子，是同一种元素（碳）；氮-14 和碳-14 的质子数、中子数加起来一样，却是 7 个质子，是另一种元素（氮）。
// 数完，周期表上对应的格子亮起来。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { Plinth } from './gear'
import { LESSONS, goLesson } from './lessons'
import { useRun } from './parts'
import { ATOMS, relMass, sameElement, type AtomKey } from './physics'
import { cellUV } from './mats'
import { Nucleus } from './nucleus'
import { BZ, POSTER, Place, ROOM, ST, TOP, u, type V3 } from './world'

type K = 'C12' | 'C14' | 'N14'
const KS: K[] = ['C12', 'C14', 'N14']
const LABEL: Record<K, string> = { C12: '碳-12', C14: '碳-14', N14: '氮-14' }
const X0 = ST.l7, Z0 = BZ + u(0.06)
const SEAT: Record<K, V3> = { C12: [X0 - u(0.38), TOP, Z0 + u(0.1)], C14: [X0, TOP, Z0 + u(0.1)], N14: [X0 + u(0.38), TOP, Z0 + u(0.1)] }
const H = u(0.2)                                      // 原子核模型的中心离台面多高
const R = u(0.1)
const TASKS: Task[] = [
  { id: 'C12', text: '数一数碳-12 原子核里的质子', note: '6 个质子：碳元素，第 6 号' },
  { id: 'C14', text: '换成碳-14，再数质子', note: '也是 6 个质子，还是碳元素；只是多了 2 个中子' },
  { id: 'N14', text: '换成氮-14，再数质子', note: '7 个质子：是氮元素，不是碳' },
]
/** 周期表上第 Z 号元素的格子在世界里的位置 */
const cellAt = (Z: number): V3 => { const [x, y] = cellUV(Z); return [u(POSTER.x - POSTER.w / 2 + x * POSTER.w), u(POSTER.y + POSTER.h - y * POSTER.h), u(ROOM.z0) + 0.06 + 0.05] }

/** 周期表上亮起来的一格：一圈发光的框，轻轻闪 */
function CellGlow({ Z }: { Z: number }) {
  const g = useRef<THREE.Group>(null), t = useRef(0)
  useFrame((_, d) => { t.current += d; g.current?.children.forEach(c => { ((c as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.7 + 0.3 * Math.sin(t.current * 4) }) })
  const w = u(POSTER.w) * 106 / 2048, h = u(POSTER.h) * 98 / 1240, b = 0.12
  const bars: [number, number, number, number][] = [[0, h / 2, w + b, b], [0, -h / 2, w + b, b], [-w / 2, 0, b, h + b], [w / 2, 0, b, h + b]]
  return <group ref={g} position={cellAt(Z)}>{bars.map(([x, y, bw, bh], i) => <mesh key={i} position={[x, y, 0]}><planeGeometry args={[bw, bh]} /><meshBasicMaterial color="#35c7b3" transparent toneMapped={false} /></mesh>)}</group>
}
/** 展示座上的原子核：慢慢转着，选中的那个转得快一点 */
function Spinner({ k, lit, active }: { k: K; lit: number; active: boolean }) {
  const g = useRef<THREE.Group>(null)
  useFrame((_, d) => { if (g.current) g.current.rotation.y += Math.min(d, 1 / 30) * (active ? 0.5 : 0.2) })
  const A = ATOMS[k]
  return <group position={[SEAT[k][0], TOP + H, SEAT[k][2]]}>
    <group ref={g}><Nucleus p={A.p} n={A.n} radius={R * Math.cbrt((A.p + A.n) / 14)} lit={lit} only={lit > 0 ? 'p' : undefined} /></group>
  </group>
}

export default function Lesson7() {
  const T = useTasks('gewu:atom:7', TASKS)
  const [k, setK] = useState<K>('C12')
  const [seen, setSeen] = useState<Record<K, boolean>>({ C12: false, C14: false, N14: false })
  const A = ATOMS[k]
  const count = useRun(A.p * 0.5 + 0.8, () => { setSeen(s => ({ ...s, [k]: true })); T.check(id => id === k) })
  const lit = count.busy ? Math.floor(count.t / 0.5) : seen[k] ? A.p : 0
  const resetAll = () => { setK('C12'); count.snap(0); setSeen({ C12: false, C14: false, N14: false }); T.reset() }

  const task = T.current
  const want: K = (task?.id as K) ?? k
  const { hint, next }: { hint: string; next: 'count' | 'pick' | null } = !task ? { hint: '质子数相同的一类原子叫一种元素：质子数决定是哪种元素。', next: null }
    : count.busy ? { hint: '一个一个地数红色的质子…', next: null }
    : k !== want ? { hint: `选“${LABEL[want]}”`, next: 'pick' }
    : { hint: `数一数${LABEL[k]}原子核里的质子`, next: 'count' }

  const labels: Label[] = [
    ...KS.map(q => ({ id: q, at: [SEAT[q][0], TOP + H + R * 1.25, SEAT[q][2]] as V3, ax: 0.5, className: `scene-tag ${q === k ? 'key' : ''} -translate-y-full`, children: <><small>{LABEL[q]}</small>{seen[q] ? `${ATOMS[q].p} 个质子 · ${ATOMS[q].n} 个中子` : '质子？'}</> })),
    ...KS.filter(q => seen[q] && q === k).map(q => ({ id: `c${q}`, at: [cellAt(ATOMS[q].Z)[0] + u(0.06), cellAt(ATOMS[q].Z)[1] + u(0.03), cellAt(ATOMS[q].Z)[2]] as V3, ax: 0, className: 'scene-name -translate-y-full', children: `${ATOMS[q].name} ${ATOMS[q].sym} · 第 ${ATOMS[q].Z} 号` })).filter((x, i, a) => a.findIndex(y => y.children === x.children) === i),
  ]
  const shown = KS.filter(q => seen[q]).map(q => ATOMS[q].Z)
  return (
    <LabShell title="分子和原子" lessons={LESSONS} current="7" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['7'], VOICE)} actionsLabel="原子核"
      stage={<Place at="l7" labels={labels}>
        {KS.map(q => <group key={q}>
          <group position={SEAT[q]}><Plinth r={0.09} h={0.03} color="#24292d" /></group>
          {/* 托着原子核的透明亚克力细柱 */}
          <mesh position={[SEAT[q][0], TOP + u(0.025) + (H - R - u(0.025)) / 2, SEAT[q][2]]}><cylinderGeometry args={[u(0.004), u(0.004), H - R - u(0.025), 12]} /><meshPhysicalMaterial color="#e8f0f2" transparent opacity={0.45} roughness={0.05} clearcoat={1} depthWrite={false} /></mesh>
          <Spinner k={q} lit={q === k ? lit : seen[q] ? ATOMS[q].p : 0} active={q === k} />
        </group>)}
        {[...new Set(shown)].map(Z => <CellGlow key={Z} Z={Z} />)}
      </Place>}
      lesson={<LessonBlock no="7" title="元素" concept="质子数决定是哪种元素" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>元素是质子数（即核电荷数）相同的一类原子的总称。碳-12 和碳-14 的原子核里都有 6 个质子，中子数不同，它们都属于碳元素。</p>
          <p className="mt-2">元素用元素符号表示，例如碳 C、氮 N、氧 O、氢 H。元素周期表按原子序数排列，原子序数和质子数相同。</p>
          <p className="mt-2">地壳中含量最多的四种元素依次是氧、硅、铝、铁。</p>
          <p className="mt-2 text-[13.5px] text-white/65">展示座上的原子核是放大的模型：红色的是质子，灰色的是中子。</p>
        </>} />}
      finale={T.finale && (
        <Panel className="w-[min(92vw,460px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">碳-12、碳-14 是碳；氮-14 是氮</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">质子数相同的一类原子叫一种元素</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">决定元素种类的是质子数，不是中子数，也不是相对原子质量：碳-14 和氮-14 的相对原子质量都约为 14，却是两种元素。</p>
        </Panel>
      )}
      panel={
        <Panel className="px-4 py-4">
          <div className="flex items-center gap-4">
            <div className="grid size-[92px] flex-none place-items-center rounded-xl border border-white/25 bg-white/8">
              <div className="text-center leading-none"><div className="text-[13px] text-white/55">{seen[k] ? A.Z : '?'}</div><div className="mt-1 text-[40px] font-bold">{seen[k] ? A.sym : '?'}</div><div className="mt-1 text-[14px] text-white/75">{seen[k] ? A.name : ''}</div></div>
            </div>
            <div className="min-w-0 text-[14px] leading-relaxed text-white/75">{LABEL[k]}<br />{seen[k] ? <>质子数 {A.p} → 第 {A.Z} 号元素</> : '数过质子才知道是哪种元素'}</div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <ParamTile symbol="质子" value={seen[k] ? String(A.p) : '—'} unit="个" />
            <ParamTile symbol="中子" value={seen[k] ? String(A.n) : '—'} unit="个" />
            <ParamTile symbol="Ar" value={seen[k] ? `≈ ${relMass(k as AtomKey)}` : '—'} unit="相对原子质量" />
          </div>
          {seen.C12 && seen.C14 && <p className="mt-3 text-[13px] leading-relaxed text-white/65">碳-12 和碳-14：质子数{sameElement('C12', 'C14') ? '相同，同一种元素' : '不同'}。{seen.N14 && <>碳-14 和氮-14：质子数{sameElement('C14', 'N14') ? '相同' : '不同，不是同一种元素'}。</>}</p>}
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'count'} pulse={next === 'count'} onClick={() => count.run()} disabled={count.busy || seen[k]}>数质子</LabButton>
      </>}
      extras={
        <Control label="原子核模型">
          <Segmented label="原子核模型" pulse={next === 'pick'} want={want} value={k} disabled={count.busy} onChange={q => setK(q as K)} options={KS.map(q => ({ value: q, label: LABEL[q] }))} />
        </Control>
      }
    />
  )
}
