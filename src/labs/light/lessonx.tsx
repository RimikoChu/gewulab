// 光的波动性和光电效应 · 拓展课：三个小专题。镜头为什么发紫（增透膜）、影子中心的亮斑（泊松亮斑）、一个一个光子攒出条纹（波粒二象性）。
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { Metal, lathe, useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Bench, { onScreen } from './bench'
import { FilmLamp, LAMP, RING } from './film'
import { Anod, Beam, Dark, ENV, Glow, Laser, Pattern, Rail, SCREEN, Screen, SlitHolder } from './gear'
import { LESSONS, TITLE, goLesson } from './lessons'
import { NARRATION } from './narration'
import { AR, L1, LIGHTS, arThickness, photonHits, reflectance } from './physics'
import { VOICE } from './voice'
import { AX, ST, TOP } from './world'

type Sub = 'ar' | 'spot' | 'photon'
const TOTAL = 3000
const R0 = reflectance(false) * 100, R1 = reflectance(true) * 100
const SUBS: Record<Sub, { name: string; title: string; button: string; say: string }> = {
  ar: { name: '镜头为什么发紫', title: '镀一层薄膜，让反射光互相抵消', button: '镀上增透膜',
    say: `光每穿过一个玻璃表面，约有 ${R0.toFixed(0)}% 被反射掉；相机镜头里有很多片镜片，损失不小。在玻璃上镀一层氟化镁薄膜，厚度是光在膜里波长的四分之一（对绿光约 ${arThickness().toFixed(0)} nm），膜的前后两个表面反射的光正好互相削弱，绿光的反射降到约 ${R1.toFixed(1)}%。红光和紫光抵消得不那么干净，所以镀膜镜头看上去发紫。` },
  spot: { name: '影子中心的亮斑', title: '光绕过小圆板，在影子正中会聚成亮斑', button: '放上小圆板',
    say: '激光照在一块不透光的小圆板上，屏上的影子边缘有一圈圈明暗条纹，影子的正中心反而有一个亮斑。这是光绕过圆板边缘发生衍射、在中心互相加强的结果，叫泊松亮斑。泊松本想用这个“荒谬”的推论否定光的波动说，实验却真的找到了亮斑。' },
  photon: { name: '一个一个光子', title: '单个光子落点随机，攒多了就是干涉条纹', button: '让光子一个一个通过',
    say: '把光减弱到每次只有一个光子通过双缝。每个光子在屏上只打出一个点，像粒子；落在哪里事先说不准。可是点攒得多了，亮纹的地方点多，暗纹的地方点少，干涉条纹又出现了。光既有粒子性，又有波动性：波粒二象性。' },
}
const ORDER: Sub[] = ['ar', 'spot', 'photon']
const TASKS: Task[] = ORDER.map(k => ({ id: k, text: `${SUBS[k].name}：按“${SUBS[k].button}”`, note: SUBS[k].title }))

// ---------- 增透膜：一只相机镜头 ----------
const BARREL = lathe([[0.4, 0], [0.5, 0], [0.52, 0.02], [0.52, 0.16], [0.5, 0.18], [0.5, 0.2], [0.535, 0.22], [0.535, 0.42], [0.5, 0.44], [0.5, 0.5], [0.545, 0.52], [0.545, 0.6], [0.53, 0.62], [0.47, 0.62], [0.445, 0.57], [0.445, 0.5], [0.4, 0.5]], { segs: 72, closed: true })
const GRIP = lathe([[0.536, 0.24], [0.542, 0.24], [0.542, 0.4], [0.536, 0.4]], { segs: 72, closed: true })
const LX = ST.film + 0.35, LY = TOP + 1.22, LS = 1.32
let win: THREE.CanvasTexture | null = null
/** 灯窗映在镜片上的影子：一块边缘发虚的方形亮斑 */
function getWindow() {
  if (win) return win
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!, img = g.createImageData(S, S)
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = Math.abs(x / (S - 1) * 2 - 1), v = Math.abs(y / (S - 1) * 2 - 1), d = Math.max(u, v), a = Math.min(1, Math.max(0, (0.78 - d) / 0.2)) * (0.75 + 0.25 * (1 - v)), i = (y * S + x) * 4
    img.data[i] = img.data[i + 1] = img.data[i + 2] = 255 * a; img.data[i + 3] = 255
  }
  g.putImageData(img, 0, 0)
  win = new THREE.CanvasTexture(c); win.colorSpace = THREE.SRGBColorSpace
  return win
}
let ribs: THREE.CanvasTexture | null = null
function getRibs() {
  if (ribs) return ribs
  const c = document.createElement('canvas'); c.width = 256; c.height = 8
  const g = c.getContext('2d')!; for (let i = 0; i < 64; i++) { g.fillStyle = i % 2 ? '#0c0d0f' : '#2a2c30'; g.fillRect(i * 4, 0, 4, 8) }
  ribs = new THREE.CanvasTexture(c); ribs.wrapS = THREE.RepeatWrapping; ribs.repeat.set(3, 1); ribs.colorSpace = THREE.SRGBColorSpace
  return ribs
}
/** 相机镜头：镜筒、对焦环、最前面一片鼓起来的镜片。coat：镀膜的程度（0–1）。镜片上映着灯的影子：没镀膜时又白又亮，镀了膜变暗、发紫 */
function CameraLens({ coat }: { coat: number }) {
  const k = 1 - coat * (1 - R1 / R0), tint = useMemo(() => new THREE.Color(), [])
  tint.set('#ffffff').lerp(new THREE.Color('#a05cff'), coat)
  const hex = `#${tint.getHexString()}`
  return <group>
    <group position={[LX, LY, 0]} rotation-y={-0.62} rotation-x={-0.06} scale={LS}>
      <group rotation-x={Math.PI / 2} position-z={-0.3}>
        <mesh geometry={BARREL} castShadow><Anod rough={0.36} /></mesh>
        <mesh geometry={GRIP}><meshStandardMaterial map={getRibs()} roughness={0.8} /></mesh>
        <mesh position-y={0.19}><cylinderGeometry args={[0.502, 0.502, 0.012, 72]} /><meshBasicMaterial color="#c0261d" /></mesh>
      </group>
      {/* 前镜片：一片鼓起来的玻璃，后面是黑的镜筒内壁 */}
      <mesh position-z={0.2}><circleGeometry args={[0.446, 64]} /><meshBasicMaterial color="#030405" /></mesh>
      <mesh position-z={-0.72} renderOrder={3}><sphereGeometry args={[1.05, 64, 24, 0, Math.PI * 2, 0, 0.438]} /><meshPhysicalMaterial color="#10141a" roughness={0.02} metalness={0} clearcoat={1} clearcoatRoughness={0.02} envMapIntensity={1.2 + 2.4 * k} transparent opacity={0.9} /></mesh>
      {/* 灯映在镜片上的亮斑，和里面几片镜片上更小更暗的几个 */}
      {([[-0.17, 0.12, 0.332, 0.3, 0.95], [0.06, -0.045, 0.335, 0.13, 0.55], [0.15, -0.105, 0.33, 0.075, 0.4], [0.22, -0.15, 0.322, 0.05, 0.3]] as const).map(([px, py, pz, s, o]) => (
        <mesh key={s} position={[px, py, pz]} rotation-z={0.22} renderOrder={5}><planeGeometry args={[s, s]} /><meshBasicMaterial map={getWindow()} color={hex} transparent opacity={o * k} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>))}
      {[0.4, 0.31, 0.2].map((r, i) => <mesh key={r} position-z={0.21 + i * 0.002}><ringGeometry args={[r - 0.012, r, 64]} /><meshBasicMaterial color="#1b2633" /></mesh>)}
      <mesh position-z={0.325} renderOrder={4}><circleGeometry args={[0.44, 64]} /><Glow color="#7a3cff" opacity={0.06 * coat} /></mesh>
      <mesh position={[0, -0.6, -0.05]}><boxGeometry args={[0.22, 0.14, 0.3]} /><Anod /></mesh>
    </group>
    <mesh position={[LX, (TOP + 0.08 + LY - 0.66 * LS) / 2, -0.05]} castShadow><cylinderGeometry args={[0.035, 0.035, Math.max(0.02, LY - 0.66 * LS - TOP - 0.08), 16]} /><Metal kind="chrome" rough={0.14} env={ENV} /></mesh>
    <mesh position={[LX, TOP + 0.04, -0.05]} castShadow receiveShadow><cylinderGeometry args={[0.36, 0.38, 0.08, 48]} /><Metal kind="iron" grain="cast" env={3} /></mesh>
  </group>
}

// ---------- 一个一个光子：屏上攒起来的点 ----------
function Dots({ n, hex }: { n: number; hex: string }) {
  const hits = useMemo(() => photonHits(TOTAL, L1.L, LIGHTS[L1.light].nm, L1.d, SCREEN.mm), [])
  const { tex, ctx } = useMemo(() => { const c = document.createElement('canvas'); c.width = 1024; c.height = 564; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return { tex: t, ctx: c.getContext('2d')! } }, [])
  const drawn = useRef(0)
  useEffect(() => {
    if (n < drawn.current) { ctx.clearRect(0, 0, 1024, 564); drawn.current = 0 }
    ctx.fillStyle = hex
    for (let i = drawn.current; i < n; i++) { const [x, y] = hits[i]; ctx.beginPath(); ctx.arc((x / SCREEN.mm + 1) * 512, 282 - y / SCREEN.mm * 512, i < 40 ? 6 : 3.2, 0, 7); ctx.fill() }
    drawn.current = n; tex.needsUpdate = true
  }, [n, hex, hits, ctx, tex])
  return <mesh position={[-0.002, 0, 0]} rotation-y={-Math.PI / 2} renderOrder={5}><planeGeometry args={[SCREEN.w, SCREEN.h]} /><meshBasicMaterial map={tex} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>
}

const XW = ST.wave, XL = XW - 2.2, XD = XW - 1.2, XE = XW + 1.57
export default function LessonX() {
  const [sub, setSub] = useState<Sub>('ar')
  const [did, setDid] = useState<Sub[]>([])
  const [count, setCount] = useState(0)
  const T = useTasks('gewu:light:x', TASKS)
  const on = did.includes(sub), coat = useSlide(did.includes('ar') ? 1 : 0, 0.8), put = useSlide(did.includes('spot') ? 1 : 0, 1.2)
  // 光子一个一个来：开始很慢，看得清一个一个的点，后面越来越快
  useEffect(() => {
    if (!did.includes('photon') || count >= TOTAL) return
    const t = setTimeout(() => setCount(c => Math.min(TOTAL, c + (c < 12 ? 1 : c < 60 ? 4 : c < 400 ? 20 : 60))), c2ms(count))
    return () => clearTimeout(t)
  }, [did, count])
  useEffect(() => { if (count >= TOTAL) T.check(id => id === 'photon') }, [count])   // eslint-disable-line react-hooks/exhaustive-deps
  const act = () => { if (on) return; const next = [...did, sub]; setDid(next); if (sub !== 'photon') T.check(id => id !== 'photon' && next.includes(id as Sub)) }
  const resetAll = () => { setSub('ar'); setDid([]); setCount(0); T.reset() }
  const task = T.current, running = did.includes('photon') && count < TOTAL
  const { hint, next }: { hint: string; next: 'sub' | 'act' | null } = !task ? { hint: '三个专题都看完了。', next: null }
    : sub !== task.id ? { hint: `接着看：${SUBS[task.id as Sub].name}`, next: 'sub' }
    : running ? { hint: `光子一个一个打在屏上：已经 ${count} 个`, next: null } : { hint: `按“${SUBS[sub].button}”`, next: 'act' }
  const red = LIGHTS.red
  const panel = (
    <Glass className="px-4 py-4">
      <div className="text-center">
        <div className="text-[13px] text-white/60">{SUBS[sub].name}</div>
        <div className="mt-1 text-[22px] leading-snug font-bold tracking-tight text-[#7fe3d4]">{SUBS[sub].title}</div>
      </div>
      {sub === 'ar' && <div className="mt-4 grid grid-cols-2 gap-2">
        <ParamTile symbol="反射掉的光" value={`约 ${(R0 + (R1 - R0) * coat).toFixed(1)}%`} unit={`每个玻璃表面 · ${AR.nm} nm 的绿光`} />
        <ParamTile symbol="膜厚" value={coat > 0 ? `约 ${(arThickness() * coat).toFixed(0)} nm` : '没有膜'} unit="膜里波长的四分之一" />
      </div>}
      {sub === 'photon' && <div className="mt-4 grid grid-cols-2 gap-2">
        <ParamTile symbol="打到屏上的光子" value={`${count} 个`} unit="每次只有一个通过双缝" />
        <ParamTile symbol="屏上" value={count === 0 ? '还没有点' : count < 60 ? '零散的点' : count < 600 ? '隐约有疏密' : '明暗条纹'} unit="点多的地方就是亮纹" />
      </div>}
      {on && !running && <p className="row-in mt-4 rounded-xl bg-white/6 px-3 py-3 text-[14px] leading-relaxed text-white/80">{SUBS[sub].say}</p>}
    </Glass>
  )
  const stage = sub === 'ar' ? (
    <Dark at="film" dx={-0.35} dy={0.3} span={[2.75, 1.62]} view={[-0.28, 0.1]} lamp={45} labels={[
      { id: 'lens', at: [LX - 0.2, LY - 0.95, 0.4], ax: 1, name: true, className: 'scene-name', children: '相机镜头' },
      { id: 'lamp', at: [LAMP.x, LAMP.y + 0.42, LAMP.z], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '白光灯' },
      { id: 'r', at: [LX + 0.1, LY - 0.9, 0.5], ax: 0.5, className: 'scene-tag key', children: <><small>镜片反射</small>约 {(R0 + (R1 - R0) * coat).toFixed(1)}%</> },
    ]}>
      <CameraLens coat={coat} />
      <FilmLamp color="#fff4e2" />
      <mesh position={[RING.x, 0, 0]} visible={false}><boxGeometry args={[0.01, 0.01, 0.01]} /></mesh>
    </Dark>
  ) : sub === 'spot' ? (
    <Dark at="wave" dx={-0.45} dy={0.12} span={[4.6, 2.35]} view={[-0.86, 0.26]} lamp={55} labels={[
      { id: 'laser', at: [XL - 0.4, AX + 0.3, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '激光器' },
      { id: 'disc', at: [XD, AX + 0.42, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: put > 0.5 ? '玻璃片上贴着一块不透光的小圆板' : '一块透明的玻璃片' },
      ...(put === 1 ? [{ id: 'p', at: [XE - 0.02, AX + 0.3, 0] as [number, number, number], ax: 0.5, className: 'scene-tag key -translate-y-full', children: '影子正中有一个亮斑' }] : []),
    ]}>
      <Rail x0={XW - 3.4} x1={XW + 2.2} perM={2.6} />
      <Laser x={XL} color={red.hex} />
      <Beam a={[XL, AX, 0]} b={[XD, AX, 0]} color={red.hex} r={0.012} />
      <Beam a={[XD, AX, 0]} b={[XE, AX, 0]} color={red.hex} r={0.012} k={0.5 * (1 - put) + 0.12} />
      <SlitHolder x={XD} slits={0}>
        <mesh rotation-z={Math.PI / 2} scale={[1, 1, 1]} position-x={-0.008}><cylinderGeometry args={[0.035 * put + 0.0001, 0.035 * put + 0.0001, 0.004, 24]} /><meshStandardMaterial color="#050505" roughness={0.5} /></mesh>
      </SlitHolder>
      <Screen x={XE}>
        <Pattern mode="spot" color={red.hex} env={6.5} gain={1.3 * (1 - put)} />
        <Pattern mode="disc" color={red.hex} env={5.2} gain={1.25 * put} />
      </Screen>
      <pointLight position={[XE - 0.5, AX, 0]} intensity={0.8} distance={3.2} decay={1.6} color={red.hex} />
    </Dark>
  ) : (
    <Bench light={L1.light} d={L1.d} L={L1.L} gain={running || count >= TOTAL ? 0.22 : 0.1} pattern={false} view={[-0.82, 0.27]} span={[4.4, 2.3]} dx={-0.42}
      onBoard={<Dots n={count} hex="#ff6a55" />}
      labels={[{ id: 'n', at: onScreen(L1.L, 0, 0.5), ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>打到屏上的光子</small>{count} 个</> }]} />
  )
  return (
    <LabShell narration={voiced(NARRATION['x'], VOICE)} title={TITLE} lessons={LESSONS} current="x" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={SUBS[sub].name}
      stage={stage}
      lesson={<LessonBlock no="拓展" title={SUBS[sub].name} concept={SUBS[sub].title} tasks={TASKS} done={T.done} current={task?.id} theory={<p>{SUBS[sub].say}</p>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三个专题都看完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">镀膜镜头、泊松亮斑、单光子条纹：光既是波，又是一份一份的</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={panel}
      actions={<><LabButton primary pulse={next === 'act'} onClick={act} disabled={on}>{SUBS[sub].button}</LabButton></>}
      extras={<Control label="专题"><Segmented label="专题" pulse={next === 'sub'} want={next === 'sub' ? task!.id as Sub : null} value={sub} onChange={setSub} options={ORDER.map(k => ({ value: k, label: SUBS[k].name }))} /></Control>}
    />
  )
}
/** 下一批光子隔多久来（毫秒）：开头慢，后面快 */
function c2ms(c: number) { return c < 12 ? 320 : c < 60 ? 160 : 90 }
