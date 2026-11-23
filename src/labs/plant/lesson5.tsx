// 植物的一生 · 第 5 课 芽发育成枝条：桃树枝上的一个叶芽。纵向切开，认出幼叶、芽轴、芽原基；再让它长一个春天，看各部分长成了什么。
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass as Card, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { Flesh, blob, ease, leafGeo, lerp, mixHex, ring, seg, tube, useGeo, useRun, veinTex, wedge, type V3 } from './parts'
import { BUD, budBecomes, type BudKey } from './physics'
import { Finale, H, Row } from './ui'
import { BUD_AT, Room } from './world'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

const TASKS: Task[] = [
  { id: 'cut', text: '把枝条上的叶芽纵向切开', note: '芽里面已经有了很小的叶和茎' },
  { id: 'parts', text: '逐个认出幼叶、芽轴、芽原基', note: '叶芽里有幼叶、芽轴和芽原基' },
  { id: 'grow', text: '让这个芽长一个春天', note: '一个芽长成了一根带叶的枝条' },
  { id: 'match', text: '逐个看：它们各长成了什么', note: BUD.map(b => `${b.name}发育成${b.becomes}`).join('，') },
]
const YAW = 1.45, N = 7, GLOW = '#ffc640'
const M = new THREE.Matrix4().compose(new THREE.Vector3(...BUD_AT), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, YAW, 0)), new THREE.Vector3(1, 1, 1))
const world = (p: V3): V3 => new THREE.Vector3(...p).applyMatrix4(M).toArray() as V3
const axisLen = (G: number) => lerp(1.02, 7.6, ease(G))
const nodeY = (i: number, G: number) => axisLen(G) * (0.26 + 0.7 * i / (N - 1))
const side = (i: number) => (i % 2 ? 1 : -1)
// 芽的外形：下面圆、上面尖。t 从 −90°（基部）到 90°（尖端）
const SH = { rx: 0.46, ry: 0.92, y0: 0.86, bulge: 0.62 }
const shellAt = (t: number): [number, number] => [SH.rx * Math.cos(t) * (1 - SH.bulge * Math.max(0, Math.sin(t))), SH.y0 + SH.ry * Math.sin(t)]
/** 芽鳞：贴在芽外面的一片片，下面一圈压着上面一圈。a 是朝向，t0–t1 是从哪到哪，w 是半宽（弧度） */
const SCALES = [0, 1, 2, 3, 4].map(i => ({ a: i * 1.2566 + 0.2, t0: -1.45, t1: 0.25, w: 0.78 }))
  .concat([0, 1, 2, 3, 4].map(i => ({ a: i * 1.2566 + 0.83, t0: -0.75, t1: 0.85, w: 0.8 })))
  .concat([0, 1, 2, 3].map(i => ({ a: i * 1.571 + 0.4, t0: 0.1, t1: 1.5, w: 1.0 })))
function scalePatch(a0: number, t0: number, t1: number, w: number) {
  const NU = 10, NV = 6, pos: number[] = [], col: number[] = [], idx: number[] = [], c = new THREE.Color(), dark = new THREE.Color('#452c20'), mid = new THREE.Color('#76503a'), light = new THREE.Color('#a8805a')
  for (let i = 0; i <= NU; i++) for (let j = 0; j <= NV; j++) {
    const u = i / NU, v = j / NV * 2 - 1, [r, y] = shellAt(lerp(t0, t1, u)), half = w * Math.pow(Math.max(0, 1 - Math.pow(u, 2.4)), 0.55), a = a0 + v * half, lift = 0.02 + 0.07 * (1 - u) * (1 - u) + 0.02 * v * v
    pos.push((r + lift) * Math.cos(a), y + (u === 1 ? 0.03 : 0), -(r + lift) * Math.sin(a))
    c.copy(dark).lerp(mid, u * 0.8).lerp(light, Math.pow(Math.abs(v), 6) * 0.16 + Math.pow(u, 5) * 0.35); col.push(c.r, c.g, c.b)
  }
  for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const p = i * (NV + 1) + j, q = p + NV + 1; idx.push(p, q, p + 1, p + 1, q, q + 1) }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals()
  return g
}

function Bud({ cut, G, sel }: { cut: number; G: number; sel: BudKey | null }) {
  const g = useMemo(() => {
    const shell = ring(SH.rx, SH.ry, 0.07, SH.y0, 18, SH.bulge)
    return {
      back: wedge(shell, 0, Math.PI, '#5a3c2c', '#e2dba8', 24, '#7a5a3c'), front: wedge(shell, Math.PI, Math.PI * 2, '#5a3c2c', '#e2dba8', 24, '#7a5a3c'),
      scales: SCALES.map(s => scalePatch(s.a, s.t0, s.t1, s.w)),
      leaf: leafGeo({ len: 3.5, wid: 1.25, basePow: 0.85, tipPow: 1.25, curl: 0.12, fold: 0.22, wave: 0.06, base: '#cfe6a0', tip: '#e2f2bc', back: '#d6e8b0', nu: 16, nv: 3 }),
      prim: blob(0.11, 0.17, 0.11, '#ffffff', '#ffffff', 12, 10),
    }
  }, [])
  const open = ease(cut), k = ease(G)
  const axis = useGeo(() => tube([[0, 0.02, 0], [0.12 * k, axisLen(G) * 0.35, 0], [-0.1 * k, axisLen(G) * 0.7, 0], [0, axisLen(G), 0]], lerp(0.16, 0.2, k), lerp(0.07, 0.06, k), mixHex('#e6eab0', '#7a6a42', k * 0.9), mixHex('#eef2c0', '#6fa646', k), 10, 24, 0.8), [Math.round(G * 120)])
  const on = (b: BudKey) => (sel === b ? 0.6 : 0)
  const spread = k * 1.15, shrink = 1 - k * 0.45
  return (
    <group position={BUD_AT} rotation-y={YAW}>
      {/* 芽的外壳和鳞片：朝镜头的一半切掉；芽长开以后剩下的向外翻开，留在枝条基部 */}
      <group rotation-x={-spread * 0.9} scale={shrink}><mesh geometry={g.back} castShadow><Flesh rough={0.8} double /></mesh></group>
      {open < 0.99 && <mesh geometry={g.front} position={[0, -open * 0.25, open * 1.5]} castShadow><Flesh rough={0.8} double opacity={1 - open} /></mesh>}
      {SCALES.map((s, i) => { const front = Math.sin(s.a) < -0.2, o = front ? 1 - open : 1; return o > 0.01 && <group key={i} position={front ? [0, -open * 0.25, open * 1.5] : [0, 0, 0]} rotation-x={front ? 0 : -spread * 0.9} scale={front ? 1 : shrink}><mesh geometry={g.scales[i]} castShadow><meshStandardMaterial vertexColors roughness={0.75} side={THREE.DoubleSide} transparent={o < 1} opacity={o} /></mesh></group> })}
      {/* 芽轴 → 茎 */}
      <mesh geometry={axis} castShadow><Flesh rough={0.6} emissive={GLOW} glow={on('axis')} /></mesh>
      <mesh position={[0, axisLen(G) + 0.02, 0]} scale={[1, 1.5, 1]} castShadow><sphereGeometry args={[lerp(0.075, 0.1, k), 12, 10]} /><meshStandardMaterial color={mixHex('#eef0b6', '#7a5a3c', k)} roughness={0.7} /></mesh>
      {Array.from({ length: N }, (_, i) => {
        const gi = seg(G, 0.08 + i * 0.07, 0.62 + i * 0.055), y = nodeY(i, G), s = side(i)
        return <group key={i}>
          {/* 幼叶 → 叶 */}
          <mesh geometry={g.leaf} position={[s * 0.09, y, 0]} rotation={[lerp(-1.42 + i * 0.03, -0.5 + (i % 3) * 0.12, gi), s * Math.PI / 2 + (i % 2 ? 0.25 : -0.2) * gi, -s * 0.95 * gi, 'YXZ']} scale={lerp(0.27 - i * 0.022, 1 - i * 0.03, gi)} castShadow>
            <meshStandardMaterial vertexColors map={veinTex()} roughness={0.6} color={mixHex('#fbffd8', '#3f8a30', gi)} emissive={sel === 'leaf' ? GLOW : '#dfe8a0'} emissiveIntensity={sel === 'leaf' ? 0.22 : 0.22 * (1 - gi)} />
          </mesh>
          {/* 芽原基 → 芽：长在叶和茎之间 */}
          <mesh geometry={g.prim} position={[s * lerp(0.15, 0.2, k), y + lerp(0.07, 0.16, k), 0.02]} rotation-z={-s * 0.5} scale={lerp(0.55, 1.15, k)} castShadow><Flesh rough={0.7} color={mixHex('#eee9a8', '#7a5638', k)} emissive={GLOW} glow={on('primordium')} /></mesh>
        </group>
      })}
    </group>
  )
}

export default function Lesson5() {
  const [cutOn, setCutOn] = useState(false), [grown, setGrown] = useState(false)
  const [idx, setIdx] = useState(-1), [seen, setSeen] = useState({ bud: 0, shoot: 0 })
  const T = useTasks('gewu:plant:5', TASKS)
  const cut = useRun(cutOn ? 1 : 0, 1.8), G = useRun(grown ? 1 : 0, 9)
  useEffect(() => { T.check(id => id === 'cut' ? cut >= 1 : id === 'parts' ? seen.bud >= BUD.length : id === 'grow' ? G >= 1 : seen.shoot >= BUD.length) }, [cut >= 1, G >= 1, seen])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setCutOn(false); setGrown(false); setIdx(-1); setSeen({ bud: 0, shoot: 0 }); T.reset() }
  const task = T.current, busy = (cutOn && cut < 1) || (grown && G < 1)
  const part = idx >= 0 ? BUD[idx % BUD.length] : null, done = G >= 1
  const nextPart = () => { const n = idx + 1; setIdx(n); setSeen(s => done ? { ...s, shoot: Math.max(s.shoot, Math.min(BUD.length, s.shoot + 1)) } : { ...s, bud: Math.max(s.bud, Math.min(BUD.length, s.bud + 1)) }) }
  const { hint, next }: { hint: string; next: 'cut' | 'part' | 'grow' | null } = (() => {
    if (!task) return { hint: '枝条是由芽发育成的。新枝条上又有芽，还能再长出枝条。', next: null }
    if (busy) return { hint: grown ? '芽轴一节一节伸长，幼叶展开…' : '刀片从芽的正中间切下去…', next: null }
    if (task.id === 'cut') return { hint: '枝条上鼓起来的是一个叶芽。按“纵切叶芽”', next: 'cut' }
    if (task.id === 'grow') return { hint: '三个部分都认过了。按“让它生长”', next: 'grow' }
    return { hint: part ? (done ? `${part.name}发育成了${part.becomes}。按“看下一部分”` : `这是${part.name}。按“看下一部分”`) : '按“看下一部分”，一个一个认', next: 'part' }
  })()
  const anchor = (b: BudKey): V3 => done
    ? (b === 'leaf' ? [-2.4, nodeY(2, 1) + 1.1, 0.1] : b === 'axis' ? [0.2, nodeY(3, 1) + 0.5, 0.15] : [0.32, nodeY(3, 1) + 0.18, 0.1])
    : (b === 'leaf' ? [-0.3, 1.02, 0.12] : b === 'axis' ? [0.05, 0.42, 0.18] : [0.2, nodeY(3, 0) + 0.09, 0.14])
  const labels: Label[] = [
    ...(part && !busy ? [{ id: 'sel', at: world(anchor(part.key)), ax: part.key === 'leaf' ? 1 : 0, className: `scene-tag key ${part.key === 'leaf' ? '-translate-x-3' : 'translate-x-3'} -translate-y-1/2`, children: done ? <><small>{part.name}发育成</small>{part.becomes}</> : part.name }] : []),
    ...(!cutOn ? [{ id: 'bud', at: world([0, 1.9, 0]), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '叶芽' }] : []),
    { id: 'twig', at: world([1.9, -0.5, 0.6]), name: true, className: 'scene-name', children: '桃树的枝条' },
  ]
  return (
    <LabShell title="植物的一生" lessons={LESSONS} current="5" narration={voiced(NARRATION['5'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="叶芽"
      stage={<Room at={grown ? 's5b' : 's5'} labels={labels}><Bud cut={cut} G={G} sel={part && !busy ? part.key : null} /></Room>}
      lesson={<LessonBlock no="5" title="芽发育成枝条" concept="枝条是由芽发育成的" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>万千枝条及其绿叶，都是由<b className="text-white">芽</b>发育成的。芽里有分生组织，细胞不断分裂和分化。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            {BUD.map(b => <li key={b.key}>{b.name}发育成{b.becomes}。</li>)}
            <li>新长出的枝条上又有芽，这些芽还能再发育成新的枝条。</li>
          </ul>
        </>} />}
      finale={T.finale && <Finale kicker="一个芽长成了一根枝条" title="枝条是由芽发育成的" text={`${BUD.map(b => `${b.name}发育成${b.becomes}`).join('，')}。新枝条上的芽，以后还能再长成枝条。`} notes="叶芽是放大了画的，里面幼叶的片数、枝条上叶的大小都只是示意。" onClose={() => T.setFinale(false)} />}
      panel={
        <Card className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{done ? '长成的枝条' : '叶芽的纵切面'}</div>
            <div className="mt-1 text-[30px] leading-tight font-bold">{part && !busy ? (done ? budBecomes(part.key) : part.name) : cut >= 1 ? '认一认' : '还没切开'}</div>
            <div className="mt-1 min-h-[1.4em] text-[13.5px] leading-snug text-white/70">{part && !busy ? (done ? `由${part.name}发育来` : `将来发育成${part.becomes}`) : done ? '按“看下一部分”' : cut >= 1 ? '按“看下一部分”' : '先纵切叶芽'}</div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="枝条上的叶" value={done ? `${N} 片` : '—'} unit="画面上数得出的（示意）" />
            <ParamTile symbol="叶腋里的新芽" value={done ? `${N} 个` : '—'} unit="每片叶的基部一个（示意）" />
          </div>
          <H>叶芽的三部分</H>
          <div className="flex flex-col gap-1.5">{BUD.map((b, i) => <Row key={b.key} name={b.name} text={`发育成${b.becomes}`} on={!busy && part?.key === b.key} seen={seen.bud > i} tag={seen.shoot > i ? `已长成${b.becomes}` : undefined} />)}</div>
        </Card>
      }
      actions={<>
        <LabButton pulse={next === 'cut'} onClick={() => setCutOn(true)} disabled={cutOn}>纵切叶芽</LabButton>
        <LabButton primary pulse={next === 'part'} onClick={nextPart} disabled={busy || cut < 1}>看下一部分</LabButton>
        <LabButton pulse={next === 'grow'} onClick={() => { setIdx(-1); setGrown(true) }} disabled={busy || cut < 1 || grown || seen.bud < BUD.length}>让它生长</LabButton>
      </>}
      extras={<Control label="时间"><div className="flex h-11 items-center rounded-xl bg-white/8 px-3 text-[14px] text-white/80">{done ? '春天过去了' : grown ? '春天…' : '早春，芽还没有萌动'}</div></Control>}
    />
  )
}
