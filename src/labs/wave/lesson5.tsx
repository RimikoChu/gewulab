// 机械振动和机械波 · 第 5 课 波的干涉：浮码头横梁上挂着两只起波锤 S₁、S₂，频率相同、步调一致。
// 只开一只，水面各处都在动；两只都开，水面上出现一条条不动的线。把小浮标挪到 P、Q、R 三处，比路程差和振幅。
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { Metal, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { DECK, MarkerBuoy, Motor, Plunger, Pontoon } from './boats'
import { Dim, num, useRun } from './gear'
import { AT, COL, PATCH, type V3 } from './layout'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { SPOTS, TWIN, WATER, lambda, pathDiff, ring, spotAmp, spotAt, type SpotKey } from './physics'
import { WavePatch, makeGrid } from './sea'
import { VOICE } from './voice'
import { Place } from './world'

const LAM = lambda(TWIN.f)
const TASKS: Task[] = [
  { id: 'P1', text: '只开 S₁，记下 P 点浮标的振幅', note: `一列波传到 P 点，浮标的振幅是 ${num(spotAmp('P', 1))} m` },
  { id: 'P2', text: '再打开 S₂，记 P 点的振幅', note: `P 点到两个波源一样远，两列波峰对峰：振幅 ${num(spotAmp('P', 2))} m` },
  { id: 'Q2', text: '把浮标挪到 Q 点，再记一次', note: 'Q 点的路程差是半个波长，峰对谷，浮标几乎不动' },
  { id: 'R2', text: '把浮标挪到 R 点，再记一次', note: `R 点的路程差正好是一个波长，又是峰对峰：${num(spotAmp('R', 2))} m` },
]
const [CX, Z0] = AT.twin
const S: [V3, V3] = [[CX - TWIN.d / 2, 0, Z0], [CX + TWIN.d / 2, 0, Z0]]
const at = (k: SpotKey): V3 => { const [x, z] = spotAt(k); return [CX + x, 0, Z0 - z] }
const KEYS: SpotKey[] = ['P', 'Q', 'R']
const T0 = 1 / TWIN.f
type Row = `${SpotKey}${1 | 2}`

function Rig({ on, spot, onSteady, tag }: { on: [boolean, boolean]; spot: SpotKey; onSteady: (ok: boolean) => void; tag: V3 }) {
  const grid = useMemo(() => makeGrid(PATCH.twin), [])
  const r = useMemo(() => S.map(s => Float32Array.from(grid.xs, (x, k) => Math.hypot(x - s[0], grid.zs[k] - s[2]))), [grid])
  const t = useRef(0), since = useRef<[number, number]>([-1, -1]), amp = useRef<[number, number]>([0, 0])
  const buoy = useRef<THREE.Group>(null), pos = useRef(new THREE.Vector3(...at(spot))), ham = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)]
  const ok = useRef(false), moved = useRef(0)
  /** 第 i 个波源此刻在距离 d 处引起的位移 */
  const one = (i: 0 | 1, d: number) => amp.current[i] <= 0 ? 0 : amp.current[i] * ring(TWIN.A, TWIN.f, d, t.current - since.current[i])
  useRun(1, (tt, dt) => {
    t.current = tt
    for (const i of [0, 1] as const) {
      // 打开：等到下一个整周期再起振，两只锤的步调就一致；关掉：很快停下来
      if (on[i]) { if (since.current[i] < 0) since.current[i] = Math.ceil(tt / T0) * T0; amp.current[i] = 1 }
      else { amp.current[i] = Math.max(0, amp.current[i] - dt * 1.6); if (amp.current[i] === 0) since.current[i] = -1 }
      const h = ham[i].current; if (h) h.position.y = 0.05 + (on[i] && tt > since.current[i] ? -0.14 * Math.sin(2 * Math.PI * TWIN.f * (tt - since.current[i])) : 0)
    }
    // 浮标匀速挪到选中的点
    const goal = at(spot), p = pos.current, dx = goal[0] - p.x, dz = goal[2] - p.z, dist = Math.hypot(dx, dz), step = 3.2 * dt
    if (dist > 1e-3) { moved.current = tt; if (dist <= step) p.set(goal[0], 0, goal[2]); else { p.x += dx / dist * step; p.z += dz / dist * step } }
    const y = one(0, Math.hypot(p.x - S[0][0], p.z - S[0][2])) + one(1, Math.hypot(p.x - S[1][0], p.z - S[1][2]))
    buoy.current?.position.set(p.x, y, p.z)
    tag[0] = p.x; tag[1] = 4.1; tag[2] = p.z
    // 稳定：浮标到位了，开着的波源发出的波都传到了，再多等一个周期
    const { r1, r2 } = SPOTS[spot]
    const steady = dist <= 1e-3 && tt - moved.current > 1 && (on[0] || on[1]) && [r1, r2].every((d, i) => !on[i] || (since.current[i] >= 0 && tt - since.current[i] > d / WATER.v + T0 * 1.2)) && [0, 1].every(i => on[i] || amp.current[i] === 0)
    if (steady !== ok.current) { ok.current = steady; onSteady(steady) }
  })
  return <>
    <WavePatch grid={grid} chop={0.012} high={TWIN.A * 1.25} fill={out => { const n = grid.n, a = r[0], b = r[1]; for (let k = 0; k < n; k++) out[k] = one(0, a[k]) + one(1, b[k]) }} />
    <MarkerBuoy ref={buoy} color={COL.red} size={2.6} />
    {/* 三个观察点各有一只小白浮子做记号 */}
    {KEYS.map(k => <mesh key={k} position={[at(k)[0] + 0.9, 0.04, at(k)[2] + 0.6]}><sphereGeometry args={[0.32, 16, 12]} /><meshStandardMaterial color="#f2efe6" roughness={0.5} /></mesh>)}
    {/* 到两个波源的连线 */}
    <Dim a={[S[0][0], 0.5, S[0][2]]} b={[at(spot)[0], 0.5, at(spot)[2]]} color="#ffb199" thick={0.07} tick={0.07} />
    <Dim a={[S[1][0], 0.5, S[1][2]]} b={[at(spot)[0], 0.5, at(spot)[2]]} color="#9fd0ff" thick={0.07} tick={0.07} />
    {/* 浮码头：一根横梁伸到水面上，两头各挂一只起波锤 */}
    <group position={[CX, 0, Z0 + 2.1]}>
      <Pontoon w={10.6} d={2.2}>
        {[-1, 1].map(s => <group key={s} position={[s * TWIN.d / 2, DECK, 0]}>
          <mesh position={[0, 1.3, -0.6]} castShadow><boxGeometry args={[0.14, 2.6, 0.14]} /><Metal kind="steel" grain="brushed" /></mesh>
          <mesh position={[0, 2.56, -1.3]} castShadow><boxGeometry args={[0.12, 0.12, 1.6]} /><Metal kind="steel" grain="brushed" /></mesh>
          <mesh position={[0, 2.0, -1.1]} rotation-x={-0.82} castShadow><boxGeometry args={[0.06, 0.06, 1.4]} /><Metal kind="steel" grain="brushed" /></mesh>
          <group position={[0, 2.6, -2.1]} scale={1.5}><Motor /></group>
        </group>)}
        <mesh position={[0, DECK + 2.5, -0.6]} castShadow><boxGeometry args={[TWIN.d + 0.4, 0.1, 0.1]} /><Metal kind="steel" grain="brushed" /></mesh>
      </Pontoon>
    </group>
    <group ref={ham[0]} position={S[0]}><Plunger color={COL.orange} size={2} /></group>
    <group ref={ham[1]} position={S[1]}><Plunger color="#3f8fd6" size={2} /></group>
  </>
}

export default function Lesson5() {
  const [on, setOn] = useState<[boolean, boolean]>([false, false])
  const [spot, setSpot] = useState<SpotKey>('P')
  const [steady, setSteady] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const T = useTasks('gewu:wave:5', TASKS)
  const tag = useRef<V3>([...at('P')] as V3).current
  const count = (on[0] ? 1 : 0) + (on[1] ? 1 : 0)
  const key = `${spot}${count}` as Row, dup = rows.includes(key)
  const record = () => { if (!steady || dup || count === 0) return; const next = [...rows, key]; setRows(next); T.check(id => next.includes(id as Row)) }
  const flip = (i: 0 | 1) => { setSteady(false); setOn(o => i === 0 ? [!o[0], o[1]] : [o[0], !o[1]]) }
  const resetAll = () => { setOn([false, false]); setSpot('P'); setSteady(false); setRows([]); T.reset() }

  const task = T.current
  const wantSpot = (task ? task.id[0] : 'P') as SpotKey, wantTwo = !!task && task.id !== 'P1'
  const { hint, next }: { hint: string; next: 'spot' | 's1' | 's2' | 'rec' | null } = (() => {
    if (!task) return { hint: '路程差是波长的整数倍，振动加强；是半波长的奇数倍，振动减弱。', next: null }
    if (spot !== wantSpot) return { hint: `把浮标挪到 ${wantSpot} 点`, next: 'spot' }
    if (!on[0]) return { hint: '打开 S₁，让它一下一下拍水', next: 's1' }
    if (on[1] !== wantTwo) return wantTwo ? { hint: '再打开 S₂：两只锤的频率相同、步调一致', next: 's2' } : { hint: '先关掉 S₂，只留 S₁', next: 's2' }
    if (!steady) return { hint: '等波传到浮标那里，稳定下来…', next: null }
    return { hint: `按“记录振幅”，记下 ${spot} 点浮标的振幅`, next: 'rec' }
  })()
  const { r1, r2 } = SPOTS[spot], amp = steady ? spotAmp(spot, count) : null
  const mid = (a: V3, b: V3): V3 => [(a[0] + b[0]) / 2, 0.75, (a[2] + b[2]) / 2]
  const labels: Label[] = [
    { id: 'buoy', at: tag, ax: 0.5, className: `scene-tag ${steady ? 'key' : ''} -translate-y-full`, children: <><small>{spot} 点</small>{steady ? `振幅 ${num(amp)} m` : '浮标'}</> },
    { id: 'r1', at: mid(S[0], at(spot)), ax: 1, className: 'scene-tag -translate-y-1/2', children: <>r₁ = {r1} m</> },
    { id: 'r2', at: mid(S[1], at(spot)), ax: 0, className: 'scene-tag -translate-y-1/2', children: <>r₂ = {r2} m</> },
    { id: 's1', at: [S[0][0], 4.2, S[0][2]], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>波源</small>S₁{on[0] ? '' : ' · 关'}</> },
    { id: 's2', at: [S[1][0], 4.2, S[1][2]], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>波源</small>S₂{on[1] ? '' : ' · 关'}</> },
    ...KEYS.filter(k => k !== spot).map(k => ({ id: `n${k}`, at: [at(k)[0] + 0.9, 0.6, at(k)[2] + 0.6] as V3, ax: 0.5, className: 'scene-name -translate-y-full', children: `${k} 点` })),
  ]
  return (
    <LabShell title="机械振动和机械波" lessons={LESSONS} current="5" narration={voiced(NARRATION['5'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="两个波源"
      stage={<Place at="l5" labels={labels}><Rig on={on} spot={spot} onSteady={setSteady} tag={tag} /></Place>}
      lesson={<LessonBlock no="5" title="波的干涉" concept="路程差是波长整数倍处振动加强" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p><b className="text-white">波的叠加</b>：几列波相遇时，各自保持原来的样子继续传播；在重叠的地方，质点的位移等于各列波单独引起的位移的矢量和。</p>
          <p className="mt-3"><b className="text-white">波的干涉</b>：频率相同、相位差恒定、振动方向相同的两列波叠加，有些地方振动始终加强，有些地方始终减弱，加强区和减弱区互相隔开。</p>
          <p className="mt-3">两个波源步调一致时：到两个波源的路程差 Δr = nλ（n = 0, 1, 2…）的点振动加强，振幅是 A₁ + A₂；Δr = (2n + 1)λ/2 的点振动减弱，振幅是 |A₁ − A₂|。</p>
          <p className="mt-3 text-[13.5px] text-white/65">加强点不是一直停在波峰：它也在上下振动，只是振幅最大。这里把每列波的振幅都按 {num(TWIN.A)} m 算，没有计入波越传越弱。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三个点都测过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">路程差决定加强还是减弱</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">波长 {num(LAM, 0)} m。P 点 Δr = 0、R 点 Δr = {pathDiff('R')} m = λ，振幅都是 {num(spotAmp('P', 2))} m，是一列波时的 2 倍；Q 点 Δr = {pathDiff('Q')} m = λ/2，振幅是 {num(spotAmp('Q', 2))}。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">Δr = | r₁ − r₂ |</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{num(amp)}<span className="ml-1 text-[15px] font-medium text-white/55">m · {spot} 点的振幅</span></div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="r₁" value={String(r1)} unit="m · 到 S₁" />
            <ParamTile symbol="r₂" value={String(r2)} unit="m · 到 S₂" />
            <ParamTile symbol="Δr" value={String(pathDiff(spot))} unit="m · 路程差" />
            <ParamTile symbol="λ" value={num(LAM, 0)} unit="m · 波长" />
          </div>
          {rows.length > 0 && <>
            <h2 className="mt-4 text-[12.5px] text-white/55">记录</h2>
            <table className="mt-1 w-full text-[13px]">
              <thead><tr className="text-[11.5px] text-white/50"><th className="py-1 text-left font-normal">点</th><th className="text-left font-normal">波源</th><th className="text-right font-normal">Δr / m</th><th className="text-right font-normal">振幅 / m</th></tr></thead>
              <tbody>{rows.map(k => { const s = k[0] as SpotKey, c = Number(k[1]), a = spotAmp(s, c); return <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5">{s}</td><td className="text-white/75">{c === 1 ? '只开一个' : '两个都开'}</td><td className="text-right tabular-nums">{pathDiff(s)}</td><td className="text-right font-semibold tabular-nums" style={{ color: c === 2 && a < TWIN.A ? COL.warn : COL.ok }}>{num(a)}</td></tr> })}</tbody>
            </table>
          </>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 's1'} onClick={() => flip(0)}>{on[0] ? '关掉 S₁' : '打开 S₁'}</LabButton>
        <LabButton pulse={next === 's2'} onClick={() => flip(1)}>{on[1] ? '关掉 S₂' : '打开 S₂'}</LabButton>
        <LabButton primary pulse={next === 'rec'} onClick={record} disabled={!steady || dup}>记录振幅</LabButton>
      </>}
      extras={<Control label="浮标放在"><Segmented label="浮标放在" pulse={next === 'spot'} want={next === 'spot' ? wantSpot : null} value={spot} onChange={k => { setSteady(false); setSpot(k) }} options={KEYS.map(k => ({ value: k, label: `${k} 点` }))} /></Control>}
    />
  )
}
