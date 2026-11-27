// 码头上的两套振动器材：试验棚工作台上的竖直弹簧振子（铁架台、弹簧、砝码、电磁释放器、光电计数器、走纸记录器），
// 和棚外的单摆（落地支架、线夹、摆球、挡片、光电门、计时器）。尺寸按实物：砝码直径 5 cm 和 8 cm，摆球直径 6 cm。
// 会动的部分（弹簧长度、砝码位置、释放器、摆角）都由外面每帧通过 ref 改，这里只管造型。
import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Led, Metal, disc, lathe } from '@/lab-kit'
import { gridPaper, plankTex } from './mats'

/** 工作台：钢架、实木台面。台面高 0.8 m，原点在地面 */
export const TOP = 0.8
export function Bench({ w = 1.5, d = 0.72 }: { w?: number; d?: number }) {
  const map = useMemo(() => plankTex([2, 1.2]), [])
  return <group>
    <RoundedBox args={[w, 0.045, d]} radius={0.012} smoothness={3} position-y={TOP - 0.0225} castShadow receiveShadow><meshPhysicalMaterial map={map} color="#d8c2a0" roughness={0.6} clearcoat={0.25} clearcoatRoughness={0.5} /></RoundedBox>
    {[-1, 1].flatMap(a => [-1, 1].map(b => <group key={`${a}${b}`} position={[a * (w / 2 - 0.07), 0, b * (d / 2 - 0.07)]}>
      <mesh position-y={(TOP - 0.045) / 2} castShadow><boxGeometry args={[0.05, TOP - 0.045, 0.05]} /><meshStandardMaterial color="#3f4a54" metalness={0.6} roughness={0.45} /></mesh>
      <mesh position-y={0.012}><cylinderGeometry args={[0.035, 0.04, 0.024, 16]} /><meshStandardMaterial color="#1d1f22" roughness={0.9} /></mesh>
    </group>))}
    {[-1, 1].map(b => <mesh key={b} position={[0, TOP - 0.11, b * (d / 2 - 0.07)]}><boxGeometry args={[w - 0.14, 0.06, 0.03]} /><meshStandardMaterial color="#3f4a54" metalness={0.6} roughness={0.45} /></mesh>)}
    {[-1, 1].map(a => <mesh key={a} position={[a * (w / 2 - 0.07), 0.18, 0]}><boxGeometry args={[0.03, 0.04, d - 0.14]} /><meshStandardMaterial color="#3f4a54" metalness={0.6} roughness={0.45} /></mesh>)}
  </group>
}

/** 螺旋弹簧：顶端在原点，往下长 1（用 scale.y 拉到实际长度）。turns 圈数，R 圈的半径，wire 钢丝半径 */
function springGeo(turns: number, R: number, wire: number) {
  const pts: THREE.Vector3[] = [new THREE.Vector3(0, 0.02, 0), new THREE.Vector3(0, 0, 0)]
  const N = turns * 16
  for (let i = 0; i <= N; i++) { const a = (i / N) * turns * Math.PI * 2, y = -0.04 - (i / N) * 0.92; pts.push(new THREE.Vector3(R * Math.cos(a), y, R * Math.sin(a))) }
  pts.push(new THREE.Vector3(0, -0.98, 0), new THREE.Vector3(0, -1, 0))
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), N * 2, wire, 8)
}
/** 槽码：带倒角的钢圆柱，顶上一根挂杆和挂环。r、h 是圆柱的半径和高，原点在顶上的挂点 */
function Weight({ r, h, label, reach }: { r: number; h: number; label: string; reach: number }) {
  const c = r * 0.12
  const body = useMemo(() => lathe([[0, -h], [r - c, -h], [r, -h + c], [r, -c], [r - c, 0], [0, 0]], { segs: 40 }), [r, h, c])
  return <group>
    <mesh position-y={-0.012}><torusGeometry args={[0.01, 0.0035, 8, 20]} /><Metal kind="steel" /></mesh>
    <mesh position-y={-0.028}><cylinderGeometry args={[0.005, 0.005, 0.02, 10]} /><Metal kind="steel" /></mesh>
    <group position-y={-0.036}>
      <mesh geometry={body} castShadow><Metal kind="steel" grain="turned" /></mesh>
      <mesh position-y={-h * 0.5}><cylinderGeometry args={[r + 0.0006, r + 0.0006, h * 0.36, 40, 1, true]} /><meshStandardMaterial color="#c6362b" roughness={0.5} /></mesh>
      {/* 指示笔：一直伸到后面的记录纸 */}
      <mesh position={[0, -h / 2, -(r + reach / 2)]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.003, 0.003, reach, 8]} /><meshStandardMaterial color="#1d1f22" roughness={0.5} /></mesh>
      <mesh position={[0, -h / 2, -(r + reach + 0.005)]} rotation-x={-Math.PI / 2}><coneGeometry args={[0.004, 0.012, 8]} /><meshStandardMaterial color="#b3261e" roughness={0.4} /></mesh>
    </group>
    <group position={[0, -0.036 - h / 2, r + 0.0012]}><Led text={label} w={r * 1.5} h={r * 0.55} /></group>
  </group>
}

/** 弹簧振子的几何常数：挂点高度（从台面算）、记录纸在砝码后面多远、纸宽 */
export const SR = { hang: 1.12, colX: 0.17, paperZ: -0.115, paperW: 0.36, paperH: 0.4, restY: 0.12 }
/** 砝码的半径和高（m）：为了看得清，比实物画大了 */
export const WT = { light: [0.06, 0.08], heavy: [0.08, 0.11] } as const
export interface SpringHandle {
  /** len：弹簧现在多长；hookY 以下是砝码。puck：释放器顶面的高度（从台面算） */
  set: (len: number, puck: number) => void
  /** 记录纸上的曲线：ys[i] 是 i 个步长以前笔尖的高度（从台面算），n 是有效的点数 */
  trace: (ys: Float32Array, n: number, dx: number) => void
}
/**
 * 竖直弹簧振子。heavy：2 kg 的大砝码；hard：粗钢丝的硬弹簧；gateY：光电计数器装在多高（平衡位置）；timer：计时器上显示的字。
 * 原点在台面上、弹簧的正下方
 */
export const SpringRig = forwardRef<SpringHandle, { heavy: boolean; hard: boolean; gateY: number; timer: string }>(function SpringRig({ heavy, hard, gateY, timer }, ref) {
  const soft = useMemo(() => springGeo(14, 0.03, 0.0035), []), stiff = useMemo(() => springGeo(11, 0.03, 0.0052), [])
  const base = useMemo(() => disc(0.02, 0.012), []), puckGeo = useMemo(() => disc(0.026, 0.022), [])
  const paper = useMemo(() => gridPaper(), [])
  const sp = useRef<THREE.Mesh>(null), wt = useRef<THREE.Group>(null), puck = useRef<THREE.Group>(null), rod = useRef<THREE.Mesh>(null)
  const N = 320
  const line = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 6), 3)); const idx: number[] = []; for (let i = 0; i < N - 1; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2); g.setIndex(idx); g.setDrawRange(0, 0); return g }, [])
  const [R, H] = heavy ? WT.heavy : WT.light
  useImperativeHandle(ref, () => ({
    set(len, p) {
      if (sp.current) sp.current.scale.y = len
      wt.current?.position.setY(SR.hang - len)
      puck.current?.position.setY(p)
      if (rod.current) { rod.current.scale.y = Math.max(0.02, p - 0.03); rod.current.position.y = 0.03 + (p - 0.03) / 2 }
    },
    trace(ys, n, dx) {
      const a = line.attributes.position.array as Float32Array, m = Math.min(n, N), w = 0.0045
      for (let i = 0; i < m; i++) { const x = -i * dx; a[i * 6] = x; a[i * 6 + 1] = ys[i] - w; a[i * 6 + 2] = 0; a[i * 6 + 3] = x; a[i * 6 + 4] = ys[i] + w; a[i * 6 + 5] = 0 }
      line.attributes.position.needsUpdate = true; line.setDrawRange(0, Math.max(0, (m - 1) * 6))
    },
  }), [line])
  const dark = <meshStandardMaterial color="#1d1f22" roughness={0.55} metalness={0.3} />
  return <group>
    {/* 铁架台：铸铁底座、调平脚、不锈钢立杆、十字夹和横杆 */}
    <RoundedBox args={[0.5, 0.03, 0.26]} radius={0.008} smoothness={3} position={[0.04, 0.015, 0]} castShadow receiveShadow><Metal kind="iron" grain="cast" /></RoundedBox>
    {[[-0.18, 0.1], [0.26, 0.1], [0.26, -0.1], [-0.18, -0.1]].map(([x, z]) => <mesh key={`${x}${z}`} geometry={base} position={[x, 0.03, z]}><Metal kind="brass" grain="turned" /></mesh>)}
    <mesh position={[SR.colX, 0.03 + 0.6, 0]} castShadow><cylinderGeometry args={[0.009, 0.009, 1.2, 20]} /><Metal kind="stainless" grain="brushed" /></mesh>
    <mesh position={[SR.colX, 0.035, 0]}><cylinderGeometry args={[0.016, 0.02, 0.022, 20]} /><Metal kind="steel" grain="turned" /></mesh>
    <RoundedBox args={[0.034, 0.034, 0.034]} radius={0.005} position={[SR.colX, SR.hang + 0.012, 0]} castShadow><Metal kind="aluminum" grain="cast" /></RoundedBox>
    <mesh position={[SR.colX + 0.026, SR.hang + 0.012, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.008, 0.008, 0.02, 12]} />{dark}</mesh>
    <mesh position={[SR.colX / 2 - 0.015, SR.hang + 0.012, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.005, 0.005, SR.colX + 0.05, 14]} /><Metal kind="stainless" grain="brushed" /></mesh>
    <mesh position={[0, SR.hang + 0.004, 0]}><torusGeometry args={[0.006, 0.0018, 8, 16]} /><Metal kind="steel" /></mesh>
    {/* 弹簧和砝码 */}
    <mesh ref={sp} geometry={hard ? stiff : soft} position-y={SR.hang} castShadow><Metal kind={hard ? 'steel' : 'stainless'} /></mesh>
    <group ref={wt}><Weight key={heavy ? 'b' : 's'} r={R} h={H} label={heavy ? '2kg' : '.5kg'} reach={-SR.paperZ - R - 0.012} /></group>
    {/* 电磁释放器：底座上的导套、能伸缩的顶杆、顶端的电磁铁 */}
    <mesh position={[0, 0.03 + 0.03, 0]}><cylinderGeometry args={[0.012, 0.014, 0.06, 18]} /><Metal kind="aluminum" grain="turned" /></mesh>
    <mesh ref={rod}><cylinderGeometry args={[0.005, 0.005, 1, 12]} /><Metal kind="stainless" /></mesh>
    <group ref={puck}>
      <mesh geometry={puckGeo} position-y={-0.022} castShadow><Metal kind="steel" grain="turned" /></mesh>
      <mesh position-y={-0.011}><cylinderGeometry args={[0.0268, 0.0268, 0.012, 28, 1, true]} /><Metal kind="copper" grain="turned" /></mesh>
    </group>
    {/* 光电计数器：夹在立杆上，探头对着砝码经过平衡位置的地方 */}
    <group position={[SR.colX, gateY, 0]}>
      <RoundedBox args={[0.03, 0.03, 0.034]} radius={0.004}>{dark}</RoundedBox>
      <mesh position={[-(SR.colX - R - 0.04) / 2, 0, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.004, 0.004, SR.colX - R - 0.04, 10]} /><Metal kind="stainless" /></mesh>
      <RoundedBox args={[0.024, 0.03, 0.034]} radius={0.004} position={[-(SR.colX - R - 0.03), 0, 0]}>{dark}</RoundedBox>
      <mesh position={[-(SR.colX - R - 0.017), 0, 0]}><sphereGeometry args={[0.0035, 8, 6]} /><meshBasicMaterial color="#ff4a3a" toneMapped={false} /></mesh>
    </group>
    {/* 数字计时器 */}
    <group position={[0.48, 0, 0.16]} rotation-y={-0.5}>
      <RoundedBox args={[0.2, 0.085, 0.13]} radius={0.01} smoothness={3} position-y={0.0425} castShadow><meshStandardMaterial color="#2a3138" roughness={0.5} metalness={0.3} /></RoundedBox>
      <group position={[0, 0.05, 0.0655]}><Led text={timer} w={0.15} h={0.05} /></group>
      {[-0.06, 0.06].map(x => <mesh key={x} position={[x, 0.088, 0.02]}><cylinderGeometry args={[0.009, 0.009, 0.008, 14]} /><meshStandardMaterial color={x < 0 ? '#c6362b' : '#3a8f5a'} roughness={0.5} /></mesh>)}
    </group>
    {/* 走纸记录器：在砝码的侧后方，一块小背板夹在两根立柱上、对着平衡位置，纸从右往左匀速走，砝码上的笔在上面画线 */}
    <group position={[0, 0, SR.paperZ]}>
      {[0.06, -SR.paperW + 0.02].map(x => <mesh key={x} position={[x, 0.03 + 0.5, -0.012]} castShadow><cylinderGeometry args={[0.008, 0.008, 1.0, 16]} /><Metal kind="stainless" grain="brushed" /></mesh>)}
      <RoundedBox args={[SR.paperW + 0.14, 0.03, 0.09]} radius={0.006} position={[-SR.paperW / 2 + 0.04, 0.015, -0.012]} castShadow><Metal kind="iron" grain="cast" /></RoundedBox>
      <group position-y={gateY}>
        <RoundedBox args={[SR.paperW + 0.06, SR.paperH + 0.04, 0.012]} radius={0.004} position={[-SR.paperW / 2 + 0.04, 0, -0.008]} castShadow receiveShadow><meshStandardMaterial color="#39434c" roughness={0.6} metalness={0.3} /></RoundedBox>
        <mesh position={[-SR.paperW / 2 + 0.04, 0, -0.0015]}><planeGeometry args={[SR.paperW, SR.paperH]} /><meshStandardMaterial map={paper} roughness={0.9} /></mesh>
        <RoundedBox args={[0.05, 0.06, 0.05]} radius={0.006} position={[-SR.paperW + 0.02, -SR.paperH / 2 - 0.02, 0.012]}><meshStandardMaterial color="#2a3138" roughness={0.5} metalness={0.3} /></RoundedBox>
      </group>
      <mesh geometry={line} position-z={0.0005} frustumCulled={false}><meshBasicMaterial color="#b3261e" side={THREE.DoubleSide} /></mesh>
    </group>
  </group>
})

// ---------- 单摆 ----------
/** 单摆的几何常数：悬点高度（从地面算）、立杆在悬点左边多远、摆球半径、电磁推杆的线圈在哪、推杆缩回去时顶端在哪 */
/** show：画出来的摆角是真实摆角的几倍（5° 太小看不清，示意放大；计算仍按 5°） */
export const PR = { pivot: 1.4, colX: -0.44, ball: 0.055, sol: 0.4, park: 0.34, back: -0.12, show: 3 }
export interface PendHandle {
  /** th：摆角（弧度，向 +x 为正）；tip：推杆的顶端伸到哪（x，m） */
  set: (th: number, tip: number) => void
}
/** 单摆。L：摆长（悬点到球心）；wood：木球；timer：计时器上的字。原点在地面、悬点的正下方；摆球在 x 方向摆 */
export const PendRig = forwardRef<PendHandle, { L: number; wood: boolean; timer: string }>(function PendRig({ L, wood, timer }, ref) {
  const arm = useRef<THREE.Group>(null), rod = useRef<THREE.Mesh>(null), pad = useRef<THREE.Mesh>(null)
  const foot = useMemo(() => lathe([[0, 0], [0.19, 0], [0.19, 0.012], [0.17, 0.03], [0.05, 0.05], [0.03, 0.09], [0, 0.09]], { segs: 40 }), [])
  const grain = useMemo(() => plankTex([1, 2]), [])
  const lowY = PR.pivot - L, CX = PR.colX
  useImperativeHandle(ref, () => ({
    set(th, tip) {
      if (arm.current) arm.current.rotation.z = th
      const len = Math.max(0.01, PR.sol - tip)
      if (rod.current) { rod.current.scale.y = len; rod.current.position.x = tip + len / 2 }
      pad.current?.position.setX(tip + 0.004)
    },
  }), [])
  const dark = <meshStandardMaterial color="#1d1f22" roughness={0.55} metalness={0.3} />
  const bar = (from: [number, number, number], to: [number, number, number], r = 0.005) => {
    const d = [to[0] - from[0], to[1] - from[1], to[2] - from[2]], len = Math.hypot(d[0], d[1], d[2])
    return <mesh key={`${from}${to}`} position={[(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2]} rotation={d[0] ? [0, 0, Math.PI / 2] : d[2] ? [Math.PI / 2, 0, 0] : [0, 0, 0]} castShadow><cylinderGeometry args={[r, r, len, 12]} /><Metal kind="stainless" grain="brushed" /></mesh>
  }
  return <group>
    {/* 落地支架：铸铁圆底座、不锈钢立杆在左边，顶上一根横臂伸到悬点，线夹夹住摆线 */}
    <mesh geometry={foot} position={[CX, 0, 0]} castShadow receiveShadow><Metal kind="iron" grain="cast" /></mesh>
    <mesh position={[CX, 0.09 + 0.71, 0]} castShadow><cylinderGeometry args={[0.011, 0.011, 1.42, 20]} /><Metal kind="stainless" grain="brushed" /></mesh>
    <RoundedBox args={[0.04, 0.04, 0.04]} radius={0.006} position={[CX, PR.pivot + 0.03, 0]} castShadow><Metal kind="aluminum" grain="cast" /></RoundedBox>
    <mesh position={[CX, PR.pivot + 0.03, 0.028]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.008, 0.008, 0.016, 12]} />{dark}</mesh>
    {bar([CX - 0.03, PR.pivot + 0.03, 0], [0.012, PR.pivot + 0.03, 0], 0.006)}
    {[-1, 1].map(s => <RoundedBox key={s} args={[0.03, 0.04, 0.008]} radius={0.002} position={[0, PR.pivot + 0.016, s * 0.0056]}><Metal kind="steel" grain="brushed" /></RoundedBox>)}
    <mesh position={[0, PR.pivot + 0.02, 0.014]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.007, 0.007, 0.012, 12]} />{dark}</mesh>
    {/* 量角器：悬点后面的半圆板，中间一道红线是竖直方向，两边各两道 5° 一格 */}
    <mesh position={[0, PR.pivot, -0.012]} rotation-z={Math.PI}><circleGeometry args={[0.12, 48, 0, Math.PI]} /><meshStandardMaterial color="#f1eee4" roughness={0.6} side={THREE.DoubleSide} /></mesh>
    {[-15, -10, -5, 0, 5, 10, 15].map(d => <mesh key={d} position={[Math.sin(d * Math.PI / 180) * 0.1, PR.pivot - Math.cos(d * Math.PI / 180) * 0.1, -0.011]} rotation-z={d * Math.PI / 180}><boxGeometry args={[d === 0 ? 0.003 : 0.002, d === 0 ? 0.034 : 0.02, 0.001]} /><meshBasicMaterial color={d === 0 ? '#b3261e' : '#30363b'} /></mesh>)}
    {/* 摆线和摆球 */}
    <group ref={arm} position-y={PR.pivot}>
      <mesh position-y={-(L - PR.ball) / 2}><cylinderGeometry args={[0.0045, 0.0045, L - PR.ball, 8]} /><meshStandardMaterial color="#f4f0e2" roughness={0.9} /></mesh>
      <mesh position-y={-L} castShadow><sphereGeometry args={[PR.ball, 36, 24]} />{wood ? <meshPhysicalMaterial map={grain} color="#d9a868" roughness={0.5} clearcoat={0.4} /> : <Metal kind="chrome" rough={0.14} />}</mesh>
      <mesh position-y={-L + PR.ball + 0.004}><cylinderGeometry args={[0.004, 0.006, 0.01, 10]} /><Metal kind="brass" /></mesh>
    </group>
    {/* 立杆上的滑座：一根支臂从摆球后面绕到右边，上面装着光电门和电磁推杆 */}
    <group position-y={lowY}>
      <RoundedBox args={[0.04, 0.04, 0.04]} radius={0.006} position={[CX, 0, 0]} castShadow>{dark}</RoundedBox>
      {bar([CX, 0, 0], [CX, 0, PR.back])}
      {bar([CX, 0, PR.back], [PR.sol + 0.045, 0, PR.back])}
      {bar([PR.sol + 0.045, 0, PR.back], [PR.sol + 0.045, 0, 0])}
      {/* 光电门：U 形的两只探头一前一后夹着摆球经过的最低点 */}
      <mesh position={[0, -0.045, PR.back]}><boxGeometry args={[0.014, 0.09, 0.012]} />{dark}</mesh>
      <mesh position={[0, -0.09, (PR.back + 0.084) / 2]}><boxGeometry args={[0.02, 0.012, 0.084 - PR.back]} />{dark}</mesh>
      {[-0.078, 0.078].map(z => <mesh key={z} position={[0, -0.055, z]}><boxGeometry args={[0.02, 0.07, 0.012]} />{dark}</mesh>)}
      <mesh position={[0, -0.03, 0.085]}><sphereGeometry args={[0.005, 8, 6]} /><meshBasicMaterial color="#ff4a3a" toneMapped={false} /></mesh>
      {/* 电磁推杆：把摆球推到左边 5° 的地方，一缩回去就松手了 */}
      <mesh position={[PR.sol + 0.045, 0, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.02, 0.02, 0.09, 24]} /><Metal kind="aluminum" grain="turned" /></mesh>
      <mesh position={[PR.sol + 0.045, 0, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.0205, 0.0205, 0.05, 24, 1, true]} /><Metal kind="copper" grain="turned" /></mesh>
      <mesh ref={rod} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.004, 0.004, 1, 10]} /><Metal kind="stainless" /></mesh>
      <mesh ref={pad} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.009, 0.009, 0.008, 14]} />{dark}</mesh>
    </group>
    {/* 脚下的橡胶垫：深绿色，四周一圈黄边 */}
    <RoundedBox args={[1.9, 0.012, 1.1]} radius={0.004} position={[0.1, 0.006, 0.02]} receiveShadow><meshStandardMaterial color="#2f4a3c" roughness={0.92} /></RoundedBox>
    {[[0.1, 0.545, 1.9, 0.03], [0.1, -0.505, 1.9, 0.03], [-0.835, 0.02, 0.03, 1.08], [1.035, 0.02, 0.03, 1.08]].map(([x, z, w, d]) => <mesh key={`${x}${z}`} position={[x, 0.0125, z]}><boxGeometry args={[w, 0.002, d]} /><meshStandardMaterial color="#c9a227" roughness={0.8} /></mesh>)}
    {/* 数字计时器：放在一只木箱上 */}
    <group position={[0.74, 0, 0.12]} rotation-y={-0.35}>
      <RoundedBox args={[0.34, 0.3, 0.28]} radius={0.012} smoothness={3} position-y={0.15} castShadow receiveShadow><meshStandardMaterial map={grain} color="#b99668" roughness={0.8} /></RoundedBox>
      <RoundedBox args={[0.22, 0.09, 0.14]} radius={0.01} smoothness={3} position-y={0.345} castShadow><meshStandardMaterial color="#2a3138" roughness={0.5} metalness={0.3} /></RoundedBox>
      <group position={[0, 0.35, 0.0705]}><Led text={timer} w={0.17} h={0.055} /></group>
    </group>
  </group>
})
