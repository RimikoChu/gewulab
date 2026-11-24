// 欧姆定律 · 第 7 课 欧姆定律和安全用电：车间东墙的安全角，墙上挂着一块安全用电示教板：左上一只双极空气开关，中间一只墙壁开关，
// 右上一盏 220 V 100 W 的白炽灯，右下一只“人体电流”的示意表。电压一定，电阻越小，电流越大：干手、湿手各算一次通过人体的电流；
// 再闭合开关让灯亮，最后用一根导线把灯的两端直接连起来（短路），电流极大，空气开关跳闸。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useMemo, useState } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { Metal, lathe, shell, useSlide, useTasks, type Label, type RY } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { BODY, BULB, MAINS, SHORT_R, bodyMA, bulbI, bulbR, shortI, type Skin } from './physics'
import { Glove, Meter, type V3 } from './gear'
import { makeSign, makeText } from './mats'
import { useRun } from './parts'
import { BOARD7, Place } from './world'

const TASKS: Task[] = [
  { id: 'dry', text: '干手：算一算通过人体的电流', note: `皮肤干燥，约 ${bodyMA('dry').toFixed(0)} mA（示意）` },
  { id: 'wet', text: '湿手：再算一次', note: `湿手电阻小得多，电流约 ${bodyMA('wet').toFixed(0)} mA，大了十倍` },
  { id: 'lamp', text: '闭合开关，让灯正常发光', note: `灯的电阻 ${bulbR()} Ω，电流约 ${bulbI().toFixed(2)} A` },
  { id: 'short', text: '用一根导线把灯的两端直接连起来', note: '' },
]
const SKIN_NAME: Record<Skin, string> = { dry: '干手', wet: '湿手' }

// ---------- 示教板（按厘米写，原点在板面中心，正面朝 +z） ----------
// 像墙上真的电工示教板：铝合金框里一块镀锌钢安装板；左上一只配电箱，里面导轨上一只双极空气开关；
// 白色 PVC 穿线管把配电箱、墙壁开关（带底盒）、斜装的螺口灯座连起来；右下一块搁板上放着一只指针式的毫安表（人体电流的示意）。
const BW = 100, BH = 70
const LAMP_AT: V3 = [27, 20, 0], SW_AT: V3 = [-4, -10, 0], BOX_AT: V3 = [-33, 12, 0], METER_AT: V3 = [27, -27, 0]
const BULB_G = shell([[1.4, 0], [1.6, 1.2], [3.2, 4.5], [3.4, 7.0], [2.6, 9.6], [0, 10.4]] as RY[], 0.08, { segs: 40 })
const HOLDER = lathe([[0, 0], [2.6, 0], [2.7, 0.2], [2.7, 2.2], [1.9, 2.8], [1.7, 4.6], [0, 4.6]], { segs: 40 })
const BASE = lathe([[0, 0], [5.2, 0], [5.4, 0.3], [5.4, 2.0], [4.8, 2.6], [0, 2.6]], { segs: 48 })
/** 一根贴在板上的穿线管：几段直管，拐弯处一个弯头（小球），管卡每隔一段一只 */
function Pipe({ pts }: { pts: [number, number][] }) {
  const { geo, clips } = useMemo(() => {
    const v = pts.map(([x, y]) => new THREE.Vector3(x, y, 1.1))
    const path = new THREE.CurvePath<THREE.Vector3>()
    for (let i = 0; i < v.length - 1; i++) path.add(new THREE.LineCurve3(v[i], v[i + 1]))
    const clips: V3[] = []
    for (let i = 0; i < v.length - 1; i++) { const len = v[i].distanceTo(v[i + 1]); for (let t = 6; t < len - 3; t += 12) { const p = v[i].clone().lerp(v[i + 1], t / len); clips.push([p.x, p.y, 1.1]) } }
    return { geo: new THREE.TubeGeometry(path, pts.length * 30, 0.9, 12, false), clips }
  }, [pts])
  const pvc = <meshPhysicalMaterial color="#eeeee8" roughness={0.35} clearcoat={0.4} />
  return <group>
    <mesh geometry={geo} castShadow>{pvc}</mesh>
    {pts.slice(1, -1).map(([x, y], i) => <mesh key={i} position={[x, y, 1.1]}><sphereGeometry args={[1.05, 16, 12]} />{pvc}</mesh>)}
    {clips.map((c, i) => <mesh key={`c${i}`} position={c}><boxGeometry args={[1.6, 1.6, 2.1]} /><meshStandardMaterial color="#d9d8d2" roughness={0.5} /></mesh>)}
  </group>
}
function SafetyBoard({ lit, tripped, sw, touch, skin, short, mA }: { lit: number; tripped: number; sw: number; touch: number; skin: Skin; short: number; mA: number }) {
  const tx = useMemo(() => ({
    head: makeSign(['安全用电示教板'], '#2f8a4a', '#ffffff', 1024, 96, 56),
    mcb: makeText(['C16'], { w: 128, h: 64, bg: '#f2f2ee', fg: '#1f5c8a', size: 40 }),
    box: makeText(['配电箱'], { w: 256, h: 64, bg: '#d4d6d3', fg: '#2a2d30', size: 40 }),
    warn: makeText(['⚡ 有电危险'], { w: 256, h: 64, bg: '#f4c51c', fg: '#141414', size: 38 }),
    l: makeText(['L 220 V'], { w: 256, h: 64, bg: '#b9bec2', fg: '#b3302a', size: 38 }), n: makeText(['N'], { w: 64, h: 64, bg: '#b9bec2', fg: '#2a55b8', size: 40 }),
  }), [])
  const g = Math.max(0, lit)
  // 手：从右下伸过来，指尖碰到开关的翘板；湿手上挂着水珠
  const hand: V3 = [SW_AT[0] + 1 + (1 - touch) * 12, SW_AT[1] + 2.5 - (1 - touch) * 20, 2.4 + (1 - touch) * 16]
  const drops = useMemo(() => Array.from({ length: 14 }, (_, i) => { const a = i * 2.39996, r = 1 + (i % 5) * 0.9; return [Math.cos(a) * r, 2 + Math.sin(a) * r * 1.4 + (i % 3), 3.4 + (i % 2) * 0.4] as V3 }), [])
  const steel = <meshStandardMaterial color="#d2d5d3" roughness={0.45} metalness={0.3} />
  return <group>
    {/* 镀锌钢安装板、铝合金边框、四角螺栓、标题 */}
    <RoundedBox args={[BW, BH, 1.2]} radius={0.3} smoothness={2} position={[0, 0, -0.6]} castShadow receiveShadow><meshStandardMaterial color="#b9bec2" roughness={0.55} metalness={0.45} /></RoundedBox>
    {[[0, BH / 2, BW + 4, 4], [0, -BH / 2, BW + 4, 4]].map(([x, y, w, h], i) => <mesh key={i} position={[x, y, 0.5]}><boxGeometry args={[w, h, 3]} /><Metal kind="aluminum" grain="brushed" /></mesh>)}
    {[-1, 1].map(s => <mesh key={s} position={[s * (BW / 2 + 0.5), 0, 0.5]}><boxGeometry args={[4, BH + 4, 3]} /><Metal kind="aluminum" grain="brushed" /></mesh>)}
    {[-1, 1].flatMap(sx => [-1, 1].map(sy => <mesh key={`${sx}${sy}`} position={[sx * (BW / 2 + 0.5), sy * (BH / 2), 2.1]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.8, 0.8, 0.5, 6]} /><Metal kind="stainless" /></mesh>))}
    <mesh position={[0, BH / 2 - 5, 0.02]}><planeGeometry args={[52, 4.9]} /><meshStandardMaterial map={tx.head} roughness={0.6} /></mesh>
    {/* 进线端子 */}
    <mesh position={[-44, 27, 0.02]}><planeGeometry args={[6, 1.5]} /><meshStandardMaterial map={tx.l} roughness={0.6} /></mesh>
    <mesh position={[-46.5, 0, 0.02]}><planeGeometry args={[1.5, 1.5]} /><meshStandardMaterial map={tx.n} roughness={0.6} /></mesh>
    {/* 穿线管：进线到配电箱；配电箱到开关、开关到灯；配电箱到灯（零线） */}
    <Pipe pts={[[-46, 24], [-46, 22], [-46, 20]]} />
    <Pipe pts={[[-42, 22], [-46, 22]]} />
    <Pipe pts={[[-38, -4], [-38, -10], [-8.6, -10]]} />
    <Pipe pts={[[-4, -5.6], [-4, 6], [21, 6], [21, 20]]} />
    <Pipe pts={[[-28, -4], [-28, 2], [33, 2], [33, 20]]} />
    {/* 配电箱：灰色钢板箱，透明观察窗，里面导轨上一只双极空气开关，手柄朝上是合闸，跳闸时打下来 */}
    <group position={BOX_AT}>
      <RoundedBox args={[22, 32, 1]} radius={0.3} position={[0, 0, 0.5]}>{steel}</RoundedBox>
      {[[0, 16, 22, 1], [0, -16, 22, 1]].map(([x, y, w, h], i) => <mesh key={i} position={[x, y, 4.5]} castShadow><boxGeometry args={[w, h, 9]} />{steel}</mesh>)}
      {[-11, 11].map(x => <mesh key={x} position={[x, 0, 4.5]} castShadow><boxGeometry args={[1, 33, 9]} />{steel}</mesh>)}
      <mesh position={[0, 4, 1.4]}><boxGeometry args={[18, 3.5, 0.8]} /><Metal kind="steel" grain="brushed" /></mesh>
      <RoundedBox args={[7.2, 9, 6.4]} radius={0.3} smoothness={2} position={[0, 4, 4.4]} castShadow><meshPhysicalMaterial color="#f2f2ee" roughness={0.35} clearcoat={0.4} /></RoundedBox>
      <mesh position={[0, 4, 7.62]}><boxGeometry args={[0.05, 9, 0.05]} /><meshStandardMaterial color="#9a9a94" /></mesh>
      <mesh position={[0, 1.2, 7.62]}><planeGeometry args={[2.6, 1.3]} /><meshStandardMaterial map={tx.mcb} roughness={0.5} /></mesh>
      <group position={[0, 4.8, 7.6]} rotation-x={-0.55 + tripped * 1.1}>
        <RoundedBox args={[4.6, 1, 3.2]} radius={0.25} smoothness={2} position={[0, 0, 1.4]}><meshPhysicalMaterial color="#1f5c8a" roughness={0.35} clearcoat={0.5} /></RoundedBox>
      </group>
      {/* 箱门：只留一圈门框和一块透明观察窗，底下一块“有电危险”的牌子 */}
      {[[0, 15.2, 21, 1.6], [0, -15.2, 21, 1.6], [0, -6, 21, 1.4]].map(([x, y, w, h], i) => <mesh key={`d${i}`} position={[x, y, 9.2]}><boxGeometry args={[w, h, 0.4]} />{steel}</mesh>)}
      {[-10.2, 10.2].map(x => <mesh key={`e${x}`} position={[x, 0, 9.2]}><boxGeometry args={[1.6, 32, 0.4]} />{steel}</mesh>)}
      <mesh position={[0, 4.6, 9.3]} renderOrder={6}><planeGeometry args={[19, 19.5]} /><meshPhysicalMaterial color="#ffffff" transparent opacity={0.1} roughness={0.04} clearcoat={1} depthWrite={false} envMapIntensity={1.5} /></mesh>
      <mesh position={[0, -10.5, 9.42]}><planeGeometry args={[8, 2]} /><meshStandardMaterial map={tx.warn} roughness={0.6} /></mesh>
      <mesh position={[0, -13.4, 9.42]}><planeGeometry args={[6, 1.5]} /><meshStandardMaterial map={tx.box} roughness={0.6} /></mesh>
      <mesh position={[10.6, -2, 9.6]}><boxGeometry args={[0.8, 3, 0.8]} /><meshStandardMaterial color="#2a2d30" /></mesh>
    </group>
    {/* 墙壁开关：86 型面板装在底盒上，翘板按下去是开 */}
    <group position={SW_AT}>
      <mesh position={[0, 0, 1.2]}><boxGeometry args={[7.6, 7.6, 2.4]} /><meshStandardMaterial color="#e3e2dc" roughness={0.5} /></mesh>
      <RoundedBox args={[8.6, 8.6, 1.2]} radius={0.5} smoothness={3} position={[0, 0, 3.0]} castShadow><meshPhysicalMaterial color="#f7f6f2" roughness={0.3} clearcoat={0.6} /></RoundedBox>
      <RoundedBox args={[6.2, 6.2, 0.9]} radius={0.4} smoothness={3} position={[0, 0, 3.9]} rotation-x={sw ? -0.08 : 0.08}><meshPhysicalMaterial color="#fbfaf6" roughness={0.25} clearcoat={0.7} /></RoundedBox>
      <mesh position={[2.2, -2.4, 4.4]}><circleGeometry args={[0.25, 12]} /><meshBasicMaterial color={sw ? '#ff7a3a' : '#7a3a2a'} toneMapped={false} /></mesh>
      {skin === 'wet' && touch > 0.5 && <mesh position={[0, -1, 4.45]}><circleGeometry args={[2.2, 24]} /><meshPhysicalMaterial color="#cfe6f2" transparent opacity={0.45} roughness={0.02} clearcoat={1} depthWrite={false} /></mesh>}
    </group>
    {/* 螺口灯座：圆底座贴在板上，灯头斜向下伸出，100 W 的白炽灯泡 */}
    <group position={LAMP_AT}>
      <mesh geometry={BASE} rotation-x={Math.PI / 2} castShadow><meshPhysicalMaterial color="#f1efe8" roughness={0.35} clearcoat={0.4} /></mesh>
      {[-1, 1].map(s => <mesh key={s} position={[s * 3.2, 0, 2.7]}><cylinderGeometry args={[0.45, 0.45, 0.3, 12]} /><Metal kind="brass" /></mesh>)}
      <group position={[0, 0, 2.4]} rotation-x={2.3}>
        <mesh geometry={HOLDER} castShadow><meshPhysicalMaterial color="#f1efe8" roughness={0.35} clearcoat={0.4} /></mesh>
        <group position={[0, 4.4, 0]}>
          <mesh position={[0, 0.8, 0]}><cylinderGeometry args={[1.35, 1.35, 1.8, 24]} /><Metal kind="aluminum" grain="turned" /></mesh>
          <group position={[0, 1.7, 0]}>
            <mesh position={[0, 5.4, 0]}><torusGeometry args={[0.7, 0.05, 6, 24]} /><meshStandardMaterial color="#5a4a3a" emissive="#ffd9a0" emissiveIntensity={g * 8} toneMapped={g < 0.01} /></mesh>
            {g > 0.02 && <mesh position={[0, 5.6, 0]}><sphereGeometry args={[3.0, 24, 18]} /><meshBasicMaterial color="#ffd9a0" transparent opacity={0.22 * g} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></mesh>}
            <mesh geometry={BULB_G} renderOrder={5}><meshPhysicalMaterial color="#f4f6f7" transparent opacity={0.22} roughness={0.05} depthWrite={false} side={THREE.DoubleSide} emissive="#ffdca0" emissiveIntensity={g * 0.6} /></mesh>
            {g > 0.02 && <pointLight position={[0, 6, 0]} intensity={g * 30} distance={60} decay={1.5} color="#ffdca0" />}
          </group>
        </group>
      </group>
      {/* 短路导线：两只鳄鱼夹夹在灯座两个接线螺钉上；接上的一瞬间打出火花 */}
      {short > 0 && <group>
        <mesh position={[0, -4.2, 3.4]}><torusGeometry args={[3.2, 0.3, 8, 24, Math.PI]} /><meshPhysicalMaterial color="#e0b020" roughness={0.4} /></mesh>
        {[-1, 1].map(s => <mesh key={s} position={[s * 3.2, -0.6, 3.2]}><boxGeometry args={[1.2, 2.4, 1]} /><meshPhysicalMaterial color="#c4302a" roughness={0.5} /></mesh>)}
        {short < 0.6 && <mesh position={[0, 0, 4.5]}><sphereGeometry args={[2.2 * (1 - short / 0.6) + 0.4, 16, 12]} /><meshBasicMaterial color="#fff2c0" transparent opacity={1 - short / 0.6} toneMapped={false} /></mesh>}
      </group>}
    </group>
    {/* 毫安表：放在一块钢搁板上，指针式表头（人体电流的示意） */}
    <group position={METER_AT}>
      <mesh position={[0, 0, 7]} castShadow receiveShadow><boxGeometry args={[22, 1, 14]} />{steel}</mesh>
      {[-1, 1].map(s => <mesh key={s} position={[s * 9, -3, 3]} rotation-x={-0.7}><boxGeometry args={[1, 1, 9]} />{steel}</mesh>)}
      <group position={[0, 0.5, 7]} scale={1.3}><Meter kind="mA" k={mA / 300} /></group>
    </group>
    {/* 手 */}
    {touch > 0.01 && <group position={hand} rotation={[0.35, 0, -2.62]}>
      <Glove scale={0.85} />
      {skin === 'wet' && drops.map((d, i) => <mesh key={i} position={d}><sphereGeometry args={[0.45 + (i % 3) * 0.15, 10, 8]} /><meshPhysicalMaterial color="#d6ecf6" transparent opacity={0.6} roughness={0.02} clearcoat={1} depthWrite={false} /></mesh>)}
    </group>}
  </group>
}

export default function Lesson7() {
  const [skin, setSkin] = useState<Skin>('dry')
  const [hit, setHit] = useState<Skin | null>(null)        // 正在算、已经算过的是哪一种
  const [on, setOn] = useState(false)
  const [shorted, setShorted] = useState(false)
  const T = useTasks('gewu:ohm:7', TASKS)
  const touch = useRun(1.6, () => { if (hit) T.check(id => id === hit) })
  const sw = useSlide(on ? 1 : 0, 3), lampOn = sw > 0.99 && !shorted
  const zap = useRun(1.6, () => T.check(id => id === 'short'))
  const lit = useSlide(lampOn ? 1 : 0, 3)
  const tripped = shorted ? Math.min(1, zap.k * 4) : 0
  const calc = () => { if (touch.busy) return; setHit(skin); setOn(false); touch.run() }
  const resetAll = () => { setSkin('dry'); setHit(null); setOn(false); setShorted(false); touch.snap(0); zap.snap(0); T.reset() }
  const mA = hit && (touch.k > 0.6 || T.done[hit]) ? bodyMA(hit) : 0

  const task = T.current
  const { hint, next }: { hint: string; next: 'skin' | 'calc' | 'switch' | 'short' | null } = !task ? { hint: '电压一定，电阻越小，电流越大。不要用湿手碰开关；短路时电流极大，空气开关会跳闸。', next: null }
    : touch.busy ? { hint: '用欧姆定律算一算：I = U ÷ R…', next: null }
    : zap.busy ? { hint: '短路了！', next: null }
    : (task.id === 'dry' || task.id === 'wet') && skin !== task.id ? { hint: `把手换成“${SKIN_NAME[task.id as Skin]}”`, next: 'skin' }
    : task.id === 'dry' ? { hint: '假如人手碰到 220 V 的带电体，皮肤干燥时，通过人体的电流有多大？', next: 'calc' }
    : task.id === 'wet' ? { hint: '湿手的电阻小得多。再算一次', next: 'calc' }
    : task.id === 'lamp' ? { hint: '湿手不碰开关。用干手闭合开关，让灯亮起来', next: 'switch' }
    : { hint: '现在用一根导线把灯的两端直接连起来', next: 'short' }

  const B = BOARD7
  // 板上的厘米坐标换成场景坐标：板面朝 −x
  const at = (p: V3): V3 => [B.x - p[2] * 0.1, B.y + p[1] * 0.1, B.z + p[0] * 0.1]
  const labels: Label[] = [
    { id: 'mcb', at: at([-33, 30, 10]), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '配电箱 · 空气开关' },
    { id: 'ma', at: at([27, -12, 10]), ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: mA > 0 ? 1 : 0 }, children: <><small>人体电流（示意）</small>约 {mA.toFixed(0)} mA</> },
    { id: 'sw', at: at([-4, -16, 4]), ax: 0.5, name: true, className: 'scene-name', children: '墙壁开关' },
    { id: 'lamp', at: at([34, 26, 4]), ax: 0, name: true, className: 'scene-name -translate-y-1/2', children: `白炽灯 ${BULB.U} V ${BULB.P} W` },
    { id: 'trip', at: at([-33, -2, 12]), ax: 0.5, className: 'scene-tag key transition-opacity', style: { opacity: shorted && zap.k > 0.4 ? 1 : 0 }, children: '跳闸' },
  ]
  return (
    <LabShell title="欧姆定律" lessons={LESSONS} current="7" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['7'], VOICE)} actionsLabel="示教板"
      stage={<Place at="l7" labels={labels}>
        <group position={[B.x, B.y, B.z]} rotation-y={-Math.PI / 2}><group scale={0.1}>
          <SafetyBoard lit={lit} tripped={tripped} sw={on ? 1 : 0} touch={touch.busy ? Math.sin(Math.PI * Math.min(1, touch.k * 1.4)) ** 0.5 : 0} skin={hit ?? skin} short={shorted ? zap.k : 0} mA={mA} />
        </group></group>
      </Place>}
      lesson={<LessonBlock no="7" title="欧姆定律和安全用电" concept="电压一定，电阻越小，电流越大" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>由 I = U ÷ R：电压越高，通过人体的电流越大，越危险。家庭电路的电压是 {MAINS} V，远远超过对人体安全的电压。</p>
          <p className="mt-3">人体的电阻不是固定的：皮肤潮湿时电阻会小得多，同样的电压下电流就大得多。所以<b className="text-white">不能用湿手碰开关、插头</b>。</p>
          <p className="mt-3">导线的电阻很小。电源两端被导线直接连起来（<b className="text-white">短路</b>），电流会非常大，导线发热，可能引起火灾；空气开关会自动断开电路。</p>
          <p className="mt-3 text-[13.5px] text-white/65">人体电阻、短路导线的电阻用的是示意的数（干燥 {BODY.dry / 1000} kΩ、潮湿 {BODY.wet / 1000} kΩ、导线 {SHORT_R} Ω），只用来比较大小。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">空气开关跳闸了</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">电压一定，电阻越小，电流越大</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">湿手的电流约是干手的十倍；短路时电阻极小，电流约 {Math.round(shortI())} A（示意），空气开关自动断开电路。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">I = U ÷ R</div>
            <div className="mt-1 text-[13px] text-white/55">U = {MAINS} V</div>
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">算一算（示意）</h2>
          <table className="mt-2 w-full text-center text-[13.5px] tabular-nums">
            <thead><tr className="text-white/55"><th className="pb-1 text-left font-medium">情形</th><th className="pb-1 font-medium">电阻</th><th className="pb-1 font-medium">电流</th></tr></thead>
            <tbody>
              {([
                ['dry', '干手碰到带电体', `${BODY.dry / 1000} kΩ`, `${bodyMA('dry').toFixed(0)} mA`],
                ['wet', '湿手碰到带电体', `${BODY.wet / 1000} kΩ`, `${bodyMA('wet').toFixed(0)} mA`],
                ['lamp', '灯正常发光', `${bulbR()} Ω`, `${bulbI().toFixed(2)} A`],
                ['short', '短路', `${SHORT_R} Ω`, `约 ${Math.round(shortI())} A`],
              ] as const).map(([id, a, b, c]) => <tr key={id} className={T.done[id] ? 'bg-[#35c7b3]/15' : 'bg-white/[0.04]'}><td className="rounded-l-lg px-2 py-1.5 text-left">{a}</td><td>{T.done[id] ? b : '—'}</td><td className="rounded-r-lg font-semibold">{T.done[id] ? c : '—'}</td></tr>)}
            </tbody>
          </table>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="U" value={String(MAINS)} unit="V · 家庭电路" />
            <ParamTile symbol="R手" value={`${BODY[skin] / 1000}`} unit={`kΩ · ${SKIN_NAME[skin]}（示意）`} />
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'calc'} pulse={next === 'calc'} onClick={calc} disabled={touch.busy || !(task?.id === 'dry' || task?.id === 'wet') || skin !== task?.id}>算一算通过人体的电流</LabButton>
        <LabButton primary={next === 'switch'} pulse={next === 'switch'} onClick={() => { setOn(true); setHit(null); T.check(id => id === 'lamp' && !!T.done.wet) }} disabled={on || shorted || !T.done.wet}>闭合开关</LabButton>
        <LabButton primary={next === 'short'} pulse={next === 'short'} onClick={() => { setShorted(true); zap.run() }} disabled={shorted || !T.done.lamp}>接上短路导线</LabButton>
      </>}
      extras={
        <Control label="手">
          <Segmented label="干手还是湿手" pulse={next === 'skin'} want={next === 'skin' ? task!.id as Skin : null} disabled={touch.busy || T.done.wet} value={skin} onChange={v => setSkin(v as Skin)} options={[{ value: 'dry', label: '干手' }, { value: 'wet', label: '湿手' }]} />
        </Control>
      }
    />
  )
}
