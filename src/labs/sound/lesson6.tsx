// 声现象 · 第 6 课 音色（不同的发声体，音调、响度相同时，波形不同）：音叉、吉他、长笛奏同一个音，用话筒和示波器看波形
import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { Metal, Rod, disc, lathe, useSlide, useTasks, type Label } from '@/lab-kit'
import { ENV, FORK, Fork, Hall, Mallet, Mic, P, Rings, SWING, Scope, micHead, ringing, useWood, type Hit, type Pose } from './gear'
import { LESSONS, goLesson } from './lessons'
import { FORK_HZ, TONES, wave, type ToneKey } from './physics'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

const ORDER: ToneKey[] = ['fork', 'guitar', 'flute']
const TASKS: Task[] = ORDER.map((k, i) => ({ id: k, text: `${i ? '把话筒挪到' : '话筒对着'}${TONES[k].name}：奏出这个音，记下波形`, note: k === 'fork' ? '音叉的波形最简单：一条光滑的正弦曲线' : `和音叉一样密、一样高，可形状不一样：这就是${TONES[k].name}的音色` }))
const FX = -4.05, GX = -1.75, LX = 0.75, FY = 1.16                 // 音叉、吉他、长笛的位置；长笛架多高
/** 三种乐器各自：话筒立在哪、声音从哪发出来、余音多长 */
const AT: Record<ToneKey, { mic: number; src: [number, number, number]; tau: number }> = {
  fork: { mic: FX + 1.15, src: [FX, FORK.top - 0.4, 0], tau: 2.6 }, guitar: { mic: GX + 1.25, src: [GX, 1.02, 0.3], tau: 1.5 }, flute: { mic: LX + 1.75, src: [LX - 0.95, FY + 0.05, 0], tau: 9 },
}
const REST: Pose = { p: [FX - 0.9, 0.11, 1.08], a: Math.PI - 0.06 }, STRIKE: Pose = { p: [FX + FORK.dx + FORK.half + 0.11, FORK.top - 0.3, 0], a: Math.PI - 0.75 }

// ---------- 吉他 ----------
const GUITAR = (() => {
  const half: [number, number][] = [[0, 0], [0.42, 0.03], [0.67, 0.26], [0.7, 0.55], [0.52, 0.9], [0.45, 1.06], [0.5, 1.28], [0.5, 1.48], [0.33, 1.68], [0, 1.74]]
  const s = new THREE.Shape(); s.moveTo(0, 0)
  s.splineThru(half.slice(1).map(([x, y]) => new THREE.Vector2(x, y))); s.splineThru(half.slice(0, -1).reverse().map(([x, y]) => new THREE.Vector2(-x, y)))
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 3, curveSegments: 20 }); g.translate(0, 0, -0.15)
  return g
})()
const PEG = lathe([[0, 0], [0.018, 0], [0.018, 0.05], [0.035, 0.06], [0.035, 0.09], [0, 0.09]], { segs: 12 })
/** 一把古典吉他，立在小琴架上，稍稍往后靠。level：第一根弦振动得多厉害 */
function Guitar({ x, level }: { x: number; level: () => number }) {
  const top = useWood('spruce'), dark = useWood('dark'), f = useRef(level); f.current = level
  const blur = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => { if (!blur.current) return; const a = Math.min(1, f.current()); blur.current.visible = a > 0.02; blur.current.scale.x = 0.3 + a * (2.2 + Math.sin(clock.elapsedTime * 40) * 0.8) })
  const Z = 0.172
  return <group position={[x, 0, 0]}>
    {/* 琴架：一块底板，前面两只托钩托住琴身，后面一根立杆顶着琴颈 */}
    <RoundedBox args={[1.2, 0.07, 0.9]} radius={0.02} position={[0, 0.035, -0.2]} castShadow><meshStandardMaterial color="#17181a" roughness={0.6} /></RoundedBox>
    {[-0.3, 0.3].map(s => <group key={s}><Rod from={[s, 0.07, -0.25]} to={[s, 0.2, 0.3]} r={0.03}><Metal kind="chrome" rough={0.15} env={ENV} /></Rod><Rod from={[s, 0.2, 0.3]} to={[s, 0.36, 0.3]} r={0.03}><meshStandardMaterial color="#101113" roughness={0.9} /></Rod></group>)}
    <Rod from={[0, 0.07, -0.5]} to={[0, 2.25, -0.52]} r={0.03}><Metal kind="chrome" rough={0.15} env={ENV} /></Rod>
    <mesh position={[0, 2.25, -0.46]}><boxGeometry args={[0.3, 0.08, 0.14]} /><meshStandardMaterial color="#101113" roughness={0.9} /></mesh>
    <group position={[0, 0.2, 0.06]} rotation-x={-0.2}>
      <mesh geometry={GUITAR} castShadow>
        <meshPhysicalMaterial attach="material-0" map={top} roughness={0.35} clearcoat={0.8} clearcoatRoughness={0.15} />
        <meshPhysicalMaterial attach="material-1" map={dark} roughness={0.35} clearcoat={0.8} clearcoatRoughness={0.15} />
      </mesh>
      {/* 音孔和一圈镶边、琴桥 */}
      <mesh position={[0, 1.2, Z]}><circleGeometry args={[0.2, 36]} /><meshBasicMaterial color="#0c0806" /></mesh>
      <mesh position={[0, 1.2, Z - 0.001]}><ringGeometry args={[0.2, 0.26, 40]} /><meshStandardMaterial color="#3a2518" roughness={0.5} /></mesh>
      <RoundedBox args={[0.5, 0.08, 0.04]} radius={0.012} position={[0, 0.5, Z + 0.015]}><meshStandardMaterial color="#1e120b" roughness={0.5} /></RoundedBox>
      <mesh position={[0, 0.51, Z + 0.04]}><boxGeometry args={[0.3, 0.014, 0.012]} /><meshStandardMaterial color="#e9e3d2" /></mesh>
      {/* 琴颈、指板和品丝、琴头和弦钮 */}
      <RoundedBox args={[0.22, 1.5, 0.12]} radius={0.04} position={[0, 2.42, 0.06]} castShadow><meshPhysicalMaterial map={dark} roughness={0.4} clearcoat={0.6} /></RoundedBox>
      <mesh position={[0, 2.25, Z - 0.02]}><boxGeometry args={[0.23, 1.85, 0.03]} /><meshStandardMaterial color="#17100b" roughness={0.5} /></mesh>
      {Array.from({ length: 13 }, (_, i) => <mesh key={i} position={[0, 3.17 - 1.34 * (1 - 0.5 ** ((i + 1) / 12)) * 2, Z]}><boxGeometry args={[0.23, 0.012, 0.012]} /><Metal kind="stainless" env={ENV} /></mesh>)}
      <mesh position={[0, 3.18, Z]}><boxGeometry args={[0.24, 0.025, 0.03]} /><meshStandardMaterial color="#e9e3d2" /></mesh>
      <RoundedBox args={[0.3, 0.55, 0.09]} radius={0.03} position={[0, 3.46, 0.07]} castShadow><meshPhysicalMaterial map={dark} roughness={0.4} clearcoat={0.6} /></RoundedBox>
      {[0, 1, 2].flatMap(i => [-1, 1].map(s => <mesh key={`${i}${s}`} geometry={PEG} position={[s * 0.15, 3.3 + i * 0.15, 0.07]} rotation-z={-s * Math.PI / 2}><Metal kind="brass" rough={0.3} env={ENV} /></mesh>))}
      {/* 六根弦；正在响的那一根画成一片模糊 */}
      {Array.from({ length: 6 }, (_, i) => <mesh key={i} position={[(i - 2.5) * 0.034, 1.85, Z + 0.045]}><cylinderGeometry args={[0.004 + (5 - i) * 0.0012, 0.004 + (5 - i) * 0.0012, 2.68, 6]} /><Metal kind={i < 3 ? 'stainless' : 'brass'} rough={0.4} env={0.8} /></mesh>)}
      <mesh ref={blur} position={[2.5 * 0.034, 1.85, Z + 0.05]} visible={false}><planeGeometry args={[0.02, 2.6]} /><meshBasicMaterial color="#fff6d8" transparent opacity={0.4} depthWrite={false} toneMapped={false} /></mesh>
    </group>
  </group>
}

// ---------- 长笛 ----------
const FLUTE = lathe([[0, 0], [0.036, 0], [0.042, 0.01], [0.042, 0.06], [0.038, 0.07], [0.038, 0.78], [0.044, 0.79], [0.044, 0.84], [0.04, 0.85], [0.04, 2.3], [0.045, 2.31], [0.045, 2.36], [0.04, 2.37], [0.04, 2.68], [0.034, 2.7], [0, 2.7]], { segs: 24 })
const KEY = disc(0.05, 0.02, { segs: 20 }), REST_BASE = disc(0.2, 0.05), LIP = lathe([[0, 0], [0.09, 0], [0.1, 0.012], [0.07, 0.03], [0.03, 0.035], [0.03, 0.02], [0, 0.02]], { segs: 24 })
/** 一支长笛，横放在两只托架上 */
function Flute({ x }: { x: number }) {
  const silver = <Metal kind="chrome" rough={0.14} env={ENV} />
  return <group position={[x, 0, 0]}>
    {[-0.55, 0.85].map(sx => <group key={sx} position-x={sx}>
      <mesh geometry={REST_BASE} castShadow><Metal kind="iron" grain="cast" env={ENV} /></mesh>
      <mesh position-y={0.05 + (FY - 0.16) / 2}><cylinderGeometry args={[0.022, 0.022, FY - 0.16, 12]} /><Metal kind="chrome" rough={0.14} env={ENV} /></mesh>
      <mesh position-y={FY - 0.02}><torusGeometry args={[0.07, 0.022, 8, 20, Math.PI]} /><meshStandardMaterial color="#101113" roughness={0.9} /></mesh>
      <mesh position-y={FY - 0.02} rotation-z={Math.PI}><torusGeometry args={[0.07, 0.022, 8, 20, Math.PI]} /><meshStandardMaterial color="#101113" roughness={0.9} /></mesh>
    </group>)}
    <group position={[-1.35, FY, 0]} rotation-z={-Math.PI / 2}>
      <mesh geometry={FLUTE} castShadow>{silver}</mesh>
      <mesh geometry={LIP} position={[0.036, 0.4, 0]} rotation-z={-Math.PI / 2} scale={[1, 1, 0.72]}>{silver}</mesh>
      <mesh position={[0.07, 0.4, 0]} rotation-z={-Math.PI / 2}><cylinderGeometry args={[0.022, 0.022, 0.012, 14]} /><meshBasicMaterial color="#0a0a0a" /></mesh>
      {Array.from({ length: 12 }, (_, i) => <mesh key={i} geometry={KEY} position={[0.042, 0.98 + i * 0.125 + (i > 5 ? 0.06 : 0), 0]} rotation-z={-Math.PI / 2}>{silver}</mesh>)}
      <mesh position={[0.03, 1.7, 0.05]}><cylinderGeometry args={[0.008, 0.008, 1.6, 6]} />{silver}</mesh>
    </group>
  </group>
}

/** 面板里的小图：一条波形 */
function Wave({ k }: { k: ToneKey }) {
  const d = Array.from({ length: 121 }, (_, i) => `${i ? 'L' : 'M'}${(i / 120 * 200).toFixed(1)} ${(22 - wave(k, i / 120 * Math.PI * 5) * 17).toFixed(1)}`).join(' ')
  return <svg viewBox="0 0 200 44" className="h-9 w-full" role="img" aria-label={`${TONES[k].name}的波形`}><path d={d} fill="none" stroke="#7fe3d4" strokeWidth={1.8} strokeLinejoin="round" /></svg>
}

export default function Lesson6() {
  const [k, setK] = useState<ToneKey>('fork')
  const [hit, setHit] = useState<Hit | null>(null)
  const [live, setLive] = useState(false)
  const [rows, setRows] = useState<ToneKey[]>([])
  const T = useTasks('gewu:sound:6', TASKS)
  const mx = useSlide(AT[k].mic, 3.2), moving = Math.abs(mx - AT[k].mic) > 0.01, dup = rows.includes(k)
  useEffect(() => {
    if (!hit) { setLive(false); return }
    const a = setTimeout(() => setLive(true), Math.max(0, hit.t - performance.now()) + 200), b = setTimeout(() => setLive(false), hit.t - performance.now() + 4200)
    return () => { clearTimeout(a); clearTimeout(b) }
  }, [hit])
  const play = () => { if (moving) return; setHit({ t: performance.now() + (k === 'fork' ? SWING : 0), amp: 1 }) }
  const pick = (v: ToneKey) => { setK(v); setHit(null) }
  const record = () => { if (!live || dup) return; const n = [...rows, k]; setRows(n); T.check(id => n.includes(id as ToneKey)) }
  const resetAll = () => { setK('fork'); setHit(null); setRows([]); T.reset() }
  // 长笛是一直吹着的：响 4 秒再停；音叉和吉他是慢慢衰减
  const lv = () => { const a = ringing(hit, AT[k].tau); return !hit ? 0 : k === 'flute' ? (performance.now() - hit.t > 4000 ? 0 : Math.min(1, (performance.now() - hit.t) / 200)) : a }
  const task = T.current
  const { hint, next }: { hint: string; next: 'k' | 'play' | 'record' | null } = !task ? { hint: '三种乐器都看过了。音调、响度都一样，波形却各不相同：这就是音色。', next: null }
    : moving ? { hint: '话筒在挪…', next: null }
    : k !== task.id ? { hint: `把话筒挪到${TONES[task.id as ToneKey].name}跟前`, next: 'k' }
    : live && !dup ? { hint: '看示波器上波形的形状，按“记录”', next: 'record' } : { hint: `按“奏出这个音”：${TONES[k].name}发出 ${FORK_HZ} Hz 的 A 音`, next: 'play' }
  const mh = micHead(mx, 1.25)
  const labels: Label[] = [
    { id: 'f', at: P('tone', FX, FORK.top + 0.2), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '音叉' },
    { id: 'g', at: P('tone', GX, 4.05), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '吉他' },
    { id: 'l', at: P('tone', LX + 0.3, FY + 0.3), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '长笛' },
    { id: 'm', at: P('tone', mh[0] + 0.3, mh[1] + 0.3, 0.6), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '话筒' },
    { id: 's', at: P('tone', 3.95, 1.95), ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: live ? 1 : 0 }, children: <><small>{TONES[k].name}</small>{FORK_HZ} Hz</> },
  ]
  return (
    <LabShell narration={voiced(NARRATION['6'], VOICE)} title="声现象" lessons={LESSONS} current="6" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={TONES[k].name}
      stage={<Hall at="tone" labels={labels}>
        <Fork x={FX} level={k === 'fork' ? lv : () => 0} />
        <Mallet rest={REST} hit={STRIKE} t0={hit && k === 'fork' ? hit.t - SWING : null} />
        <Guitar x={GX} level={k === 'guitar' ? lv : () => 0} />
        <Flute x={LX} />
        <Mic x={mx} z={0.6} h={1.25} />
        <Rings at={AT[k].src} level={lv} r0={0.2} r1={1.7} n={4} />
        <Scope x={3.95} trace={t => { const a = Math.min(1, lv() * 5); return a < 0.02 ? null : u => 0.82 * a * wave(k, Math.PI * 2 * 2.5 * u - t * 4) }} />
      </Hall>}
      lesson={<LessonBlock no="6" title="同一个音，不同的味道" concept="不同的发声体，音色不同" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>音调、响度都相同，我们还是能分清是哪种乐器在响，靠的是<b className="text-white">音色</b>。不同的发声体，材料、结构不同，发出声音的音色也不同。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>波形的疏密反映音调：三种乐器的波形一样密，音调相同</li>
            <li>波形的高低反映响度：三条波形一样高，响度相同</li>
            <li>波形的形状反映音色：音叉最简单，吉他和长笛各有各的样子</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">音调、响度、音色叫声音的三个特性。吉他和长笛的波形是按各自的特点画的示意，真实的波形会随演奏方式变化。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三条波形都记下了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">音调、响度相同，波形不同：音色不同</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">闭着眼也能分清音叉、吉他和长笛，靠的就是音色。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">话筒对着</div>
            <div className="mt-1 text-[30px] leading-snug font-bold tracking-tight text-[#7fe3d4]">{TONES[k].name}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="频率" value={`${FORK_HZ} Hz`} unit="三种乐器都一样" />
            <ParamTile symbol="响度" value="相同" unit="波形一样高" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">记下的波形</h2>
          {rows.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">每种乐器奏一次，把示波器上的波形记下来比一比。</p>
            : <div className="mt-2 flex flex-col gap-2">{rows.map(r => <div key={r} className="row-in rounded-xl bg-white/6 px-3 py-2"><div className="text-[13px] text-white/75">{TONES[r].name}</div><Wave k={r} /></div>)}</div>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'play'} onClick={play} disabled={moving}>奏出这个音</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={!live || dup}>记录</LabButton>
      </>}
      extras={<Control label="话筒对着"><Segmented label="话筒对着" pulse={next === 'k'} want={next === 'k' ? task!.id as ToneKey : null} value={k} onChange={pick} options={ORDER.map(o => ({ value: o, label: TONES[o].name }))} /></Control>}
    />
  )
}
