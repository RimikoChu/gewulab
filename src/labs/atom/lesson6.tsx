// 分子和原子 · 第 6 课 原子的结构：铁架台上夹着一支滴管，滴管尖上挂着一滴水。从这滴水一路放大：
// 水分子 → 氧原子（中间一个很小的原子核，外面一团电子）→ 原子核（8 个质子、8 个中子）。再缩回原子，换成氢原子看它的原子核（1 个质子，没有中子）。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { Beaker, Clamp, Dropper, IronStand, beakerFill } from './gear'
import { LESSONS, goLesson } from './lessons'
import { useRun } from './parts'
import { ATOMS, STOPS, magnify, electrons, fmtWidth, netCharge, nucleusCharge, relMass, sci, viewWidth } from './physics'
import { P_COLOR, N_COLOR } from './nucleus'
import { Micro, sm, useLevels, type Focus } from './zoom'
import { BZ, Place, SPOT, ST, TOP, Zoomed, u, type V3 } from './world'

const X0 = ST.l6, Z0 = BZ + u(0.02)
const TIP = TOP + u(0.16)                                   // 滴管尖离台面 16 cm
export const P6: V3 = [X0, TIP - u(0.0021), Z0]
const STOPS_6 = [STOPS.bench6, STOPS.mol, STOPS.atom, STOPS.nuc]
const NAME: Record<Focus, string> = { O: '氧原子', H: '氢原子' }
const TASKS: Task[] = [
  { id: 'atom', text: '放大到水分子，再放大到其中的氧原子', note: '原子由原子核和核外电子构成' },
  { id: 'oNuc', text: '放大到氧原子的原子核，数一数质子和中子', note: '氧原子核：8 个质子、8 个中子' },
  { id: 'hNuc', text: '换成氢原子，数一数它的原子核', note: '氢原子核只有 1 个质子，没有中子' },
]
const KEY: Record<Focus, 'O' | 'H'> = { O: 'O', H: 'H' }

/** 挂在滴管尖上的一滴水：上面细、下面圆 */
function HangingDrop() {
  const g = useMemo(() => { const pts: THREE.Vector2[] = []; for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI; const r = Math.sin(a) * (0.0021 + 0.0002 * Math.cos(a)); pts.push(new THREE.Vector2(u(Math.max(0.0007 * (1 - i / 24), r)), u(Math.cos(a) * 0.0023 - 0.0002))) } return new THREE.LatheGeometry(pts.reverse(), 48) }, [])
  return <mesh geometry={g} castShadow><meshPhysicalMaterial color="#eef8fb" transmission={1} thickness={u(0.002)} roughness={0.02} ior={1.33} clearcoat={1} envMapIntensity={2.2} attenuationColor="#cfeaf2" attenuationDistance={u(0.02)} /></mesh>
}

export default function Lesson6() {
  const T = useTasks('gewu:atom:6', TASKS)
  const zoom = useLevels(STOPS_6)
  const [focus, setFocus] = useState<Focus>('O')
  const fk = useSlide(focus === 'H' ? 1 : 0, 1.4)
  const [counted, setCounted] = useState<Record<Focus, boolean>>({ O: false, H: false })
  const A = ATOMS[KEY[focus]], nucleons = A.p + A.n
  const count = useRun(nucleons * 0.42 + 0.8, () => { setCounted(c => ({ ...c, [focus]: true })); T.check(id => id === (focus === 'O' ? 'oNuc' : 'hNuc')) })
  const z = zoom.z.z, level = zoom.level, settled = zoom.z.moving || Math.abs(fk - (focus === 'H' ? 1 : 0)) > 1e-3 ? -1 : level
  useEffect(() => { if (settled === 2 && focus === 'O') T.check(id => id === 'atom') }, [settled])   // eslint-disable-line react-hooks/exhaustive-deps
  const lit = count.busy ? Math.floor(count.t / 0.42) : counted[focus] && level === 3 ? nucleons : 0
  const resetAll = () => { zoom.set(0); zoom.z.snap(STOPS.bench6); setFocus('O'); count.snap(0); setCounted({ O: false, H: false }); T.reset() }
  const s = Math.pow(10, Math.min(z, 3.2))

  const task = T.current
  const { hint, next }: { hint: string; next: 'in' | 'out' | 'count' | 'H' | null } = !task ? { hint: '原子由原子核和核外电子构成；原子核由质子和中子构成。质子数等于核外电子数，原子不显电性。', next: null }
    : count.busy ? { hint: '一个一个地数：红色的是质子，灰色的是中子…', next: null }
    : zoom.z.moving ? { hint: zoom.goal > z ? '放大…' : '缩小…', next: null }
    : settled < 0 ? { hint: '镜头移到氢原子上…', next: null }
    : task.id === 'atom' ? (level === 0 ? { hint: '放大，推进到这滴水里的水分子', next: 'in' } : { hint: '这是一个水分子。继续放大，看其中的氧原子', next: 'in' })
    : task.id === 'oNuc' ? (level === 2 ? { hint: '氧原子：中间一个很小的原子核，外面是电子。继续放大到原子核', next: 'in' } : { hint: '数一数原子核里的质子和中子', next: 'count' })
    : level === 3 ? (focus === 'O' ? { hint: '缩小回原子那一级，再换成氢原子', next: 'out' } : { hint: '数一数氢原子核里的质子和中子', next: 'count' })
    : level === 2 ? (focus === 'O' ? { hint: '换成水分子里的氢原子', next: 'H' } : { hint: '放大到氢原子的原子核', next: 'in' })
    : { hint: '放大到原子那一级', next: 'in' }

  // 标签挂在镜头的右边、上边：按这一课的机位方向算
  const [az, el] = SPOT.l6.view
  const R = new THREE.Vector3(Math.cos(az), 0, -Math.sin(az)), U = new THREE.Vector3(-Math.sin(el) * Math.sin(az), Math.cos(el), -Math.sin(el) * Math.cos(az))
  const at = (x: number, y: number): V3 => [P6[0] + R.x * x + U.x * y, P6[1] + R.y * x + U.y * y, P6[2] + R.z * x + U.z * y]
  const atomView = sm(8.45, 8.6, z) * (1 - sm(8.75, 8.95, z)), nucView = sm(13.0, 13.25, z)
  /** 台上东西跟着放大以后在哪：标签挂在放大后的位置上 */
  const zp = (q: V3): V3 => [P6[0] + (q[0] - P6[0]) * s, P6[1] + (q[1] - P6[1]) * s, P6[2] + (q[2] - P6[2]) * s]
  const labels: Label[] = [
    { id: 'nuc', at: at(0.12, 0.1), ax: 0, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: atomView }, children: <><small>原子核</small>画大了，实际小得多</> },
    { id: 'e', at: at(-0.75, 0.55), ax: 1, className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: atomView }, children: <><small>核外</small>电子在很快地运动</> },
    { id: 'p', at: at(0.75, 0.3), ax: 0, className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: nucView }, children: <><small style={{ color: P_COLOR }}>●</small><small>质子</small>{A.p} 个</> },
    { id: 'n', at: at(0.75, -0.2), ax: 0, className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: nucView }, children: <><small style={{ color: N_COLOR }}>●</small><small>中子</small>{A.n} 个</> },
    ...(z - STOPS.bench6 < 0.02 ? [{ id: 'n1', at: zp([X0 + u(0.004), TIP - u(0.0022), Z0]), ax: 0, name: true, className: 'scene-name -translate-y-1/2', children: '← 滴管尖上的一滴水' }] : []),
  ]
  const tiles = counted[focus] && level >= 2
  return (
    <LabShell title="分子和原子" lessons={LESSONS} current="6" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['6'], VOICE)} actionsLabel="放大和缩小"
      stage={<Place at="l6" labels={labels} s={s} P={P6}>
        <Zoomed s={s} P={P6}>
          <group position={[X0 - u(0.02), TOP, Z0]}>
            <IronStand rodH={0.4} rodZ={-0.17}>
              <group position={[u(0.02), TIP - TOP + u(0.06), 0]}><Clamp len={0.17} open={0.0034} /></group>
            </IronStand>
          </group>
          <group position={[X0, TIP, Z0]}><Dropper fill={0.5} /></group>
          <group position={[X0, TIP, Z0]}><HangingDrop /></group>
          <group position={[X0, TOP, Z0]}><Beaker vol={100} fill={beakerFill(100, 30)} /></group>
        </Zoomed>
        <Micro P={P6} z={z} focus={fk} lit={lit} />
      </Place>}
      lesson={<LessonBlock no="6" title="原子的结构" concept="原子核很小，电子在核外运动" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>原子由居于原子中心的原子核和核外电子构成；原子核由质子和中子构成。每个质子带一个单位的正电荷，电子带一个单位的负电荷，中子不带电。</p>
          <p className="mt-2 text-center">核电荷数 = 质子数 = 核外电子数</p>
          <p className="mt-2">原子核所带的正电荷和核外电子所带的负电荷电量相等、电性相反，所以整个原子不显电性。</p>
          <p className="mt-2">原子核比原子小得多，原子的质量主要集中在原子核上；质子和中子的相对质量都约为 1，所以相对原子质量 ≈ 质子数 + 中子数。</p>
          <p className="mt-2 text-[13.5px] text-white/65">不是所有原子核里都有中子：氢原子核只有一个质子。画面里原子那一级的原子核是画大了的，电子画成一团点，表示它出现的地方。</p>
        </>} />}
      finale={T.finale && (
        <Panel className="w-[min(92vw,460px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">氧原子和氢原子都看过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">原子由原子核和核外电子构成</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">原子核由质子和中子构成。氧：8 个质子、8 个中子、8 个电子；氢：1 个质子、没有中子、1 个电子。质子数等于电子数，原子不显电性。</p>
        </Panel>
      )}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">视野宽度</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{fmtWidth(viewWidth(z))}</div>
            <div className="mt-2 text-[13px] text-white/55 tabular-nums">放大约 {z - STOPS.bench6 < 0.05 ? 1 : sci(magnify(z, STOPS.bench6), 1)} 倍</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">{NAME[focus]}{tiles ? '' : '（数过原子核以后显示）'}</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ParamTile symbol="质子" value={tiles ? String(A.p) : '—'} unit="个 · 带正电" />
            <ParamTile symbol="中子" value={tiles ? String(A.n) : '—'} unit="个 · 不带电" />
            <ParamTile symbol="电子" value={tiles ? String(electrons(KEY[focus])) : '—'} unit="个 · 带负电" />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="核电荷数" value={tiles ? `+${nucleusCharge(KEY[focus])}` : '—'} unit={tiles ? `原子整体 ${netCharge(KEY[focus])}，不显电性` : '原子整体'} />
            <ParamTile symbol="相对原子质量" value={tiles ? `≈ ${relMass(KEY[focus])}` : '—'} unit="质子数 + 中子数" />
          </div>
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'in'} pulse={next === 'in'} onClick={() => zoom.set(Math.min(STOPS_6.length - 1, level + 1))} disabled={zoom.z.moving || count.busy || level >= STOPS_6.length - 1 || settled < 0}>放大</LabButton>
        <LabButton pulse={next === 'out'} onClick={() => zoom.set(Math.max(0, level - 1))} disabled={zoom.z.moving || count.busy || level === 0}>缩小</LabButton>
        <LabButton primary={next === 'count'} pulse={next === 'count'} onClick={() => count.run()} disabled={level !== 3 || zoom.z.moving || count.busy || counted[focus]}>数一数</LabButton>
      </>}
      extras={
        <Control label="看哪个原子（在原子那一级换）">
          <Segmented label="原子" pulse={next === 'H'} want={next === 'H' ? 'H' : null} value={focus} disabled={level !== 2 || zoom.z.moving || count.busy} onChange={k => setFocus(k as Focus)} options={(['O', 'H'] as Focus[]).map(k => ({ value: k, label: NAME[k] }))} />
        </Control>
      }
    />
  )
}
