// 总装线线头那台剖开的直列四缸机（拓展课）：顺着曲轴的方向竖着剖开，看得见四个缸、四个活塞、连杆和一根四拐的曲轴，
// 曲轴箱里每两拐之间一道主轴承座。四个缸按 1-3-4-2 的顺序轮流做功；可以换成柴油机：火花塞换成喷油器，吸进的是空气，
// 压缩冲程末喷油，靠压缩后的高温着火。单位 1 = 1 dm；原点在曲轴中心，曲轴沿 x，剖面是 z = 0。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, lathe } from '@/lab-kit'
import { APEX, BORE, CAM, COVER_TOP, CR, DECK, GAS_PLANE, HEAD0, LINER, PISTON, PLUG, PORCELAIN_FROM, RING, ROD, WEB, makeGas, makeHone, setGas, softDot, useCut } from './cutaway'
import { PHASE, pistonY, rodAngle } from './physics'

type V3 = [number, number, number]
const S = 10, R = BORE, P = 1.0
export const CYL_X = [1, 2, 3, 4].map(n => (n - 2.5) * P)
const BX0 = -2.45, BX1 = 2.45, BY0 = -1.52, BY1 = 3.98, PX = 240
const frac = (x: number) => x - Math.floor(x)
const INJ = lathe([[0, -0.02], [0.014, -0.02], [0.03, 0.04], [0.055, 0.06], [0.055, 0.35], [0.085, 0.37], [0.085, 0.6], [0.06, 0.62], [0.06, 0.78], [0, 0.8]], { segs: 24, crease: 40 })

function makeCut4() {
  const W = Math.round((BX1 - BX0) * PX), H = Math.round((BY1 - BY0) * PX), c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!
  const X = (x: number) => (x - BX0) * PX, Y = (y: number) => (BY1 - y) * PX
  const rect = (x0: number, y0: number, x1: number, y1: number) => g.rect(X(x0), Y(y1), (x1 - x0) * PX, (y1 - y0) * PX)
  const rrect = (x0: number, y0: number, x1: number, y1: number, r: number) => g.roundRect(X(x0), Y(y1), (x1 - x0) * PX, (y1 - y0) * PX, r * PX)
  g.fillStyle = '#b5352b'
  g.beginPath(); rrect(-2.3, 0.5, 2.3, DECK, 0.03); rrect(-2.4, -0.72, 2.4, 0.6, 0.06); rrect(-2.4, HEAD0, 2.4, 3.02, 0.04); rrect(-2.36, 3.0, 2.36, COVER_TOP, 0.12); g.fill()
  g.beginPath(); rrect(-2.3, -1.48, 2.3, -0.7, 0.1); g.fill()
  g.globalCompositeOperation = 'destination-out'
  for (const cx of CYL_X) {
    g.beginPath(); rect(cx - R, LINER, cx + R, HEAD0); g.fill()
    g.beginPath(); rrect(cx - R, HEAD0 - 0.02, cx + R, APEX, 0.08); g.fill()
    g.beginPath(); rect(cx - 0.085, APEX - 0.02, cx + 0.085, 3.1); g.fill()
    g.beginPath(); rect(cx - 0.36, 0.0, cx + 0.36, LINER + 0.02); rect(cx - 0.36, -0.82, cx + 0.36, 0.82); g.fill()
  }
  // 两端和每两缸之间的主轴承座上，曲轴主轴颈穿过的孔
  for (const bx of [-2.0, -1.0, 0, 1.0, 2.0]) { g.beginPath(); g.arc(X(bx), Y(0), 0.25 * PX, 0, Math.PI * 2); g.fill() }
  g.beginPath(); rrect(-2.28, 3.06, 2.28, COVER_TOP - 0.06, 0.08); g.fill()
  g.beginPath(); rrect(-2.26, -1.44, 2.26, -0.72, 0.07); g.fill()
  g.globalCompositeOperation = 'source-over'
  // 轴瓦：主轴承孔一圈铜色
  g.strokeStyle = '#c99a4a'; g.lineWidth = 0.035 * PX
  for (const bx of [-2.0, -1.0, 0, 1.0, 2.0]) { g.beginPath(); g.arc(X(bx), Y(0), 0.265 * PX, 0, Math.PI * 2); g.stroke() }
  // 水套：两头和缸盖里
  g.fillStyle = '#2f78c4'
  g.beginPath(); rrect(-2.2, 1.0, -2.04, 1.98, 0.04); rrect(2.04, 1.0, 2.2, 1.98, 0.04)
  for (const cx of CYL_X) { rrect(cx - 0.4, 2.45, cx - 0.14, 2.8, 0.04); rrect(cx + 0.14, 2.45, cx + 0.4, 2.8, 0.04) }
  g.fill()
  g.fillStyle = '#b8862a'; g.beginPath(); rect(-2.26, -1.44, 2.26, -1.2); g.fill()
  g.fillStyle = '#2a2b2d'; g.beginPath(); rect(-2.3, DECK, 2.3, HEAD0); g.fill()
  g.globalCompositeOperation = 'destination-out'
  for (const cx of CYL_X) { g.beginPath(); rect(cx - R, DECK - 0.01, cx + R, HEAD0 + 0.01); g.fill() }
  g.globalCompositeOperation = 'source-atop'
  g.strokeStyle = 'rgba(60,10,8,0.16)'; g.lineWidth = 1.2
  for (let k = -H; k < W + H; k += 11) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k - H, H); g.stroke() }
  g.globalCompositeOperation = 'source-over'
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8
  return tex
}

/** 剖开的四缸机。angle：曲轴转角（度，以 1 缸为准）；diesel：换成柴油机 */
export function Cut4({ at, angle, diesel }: { at: V3; angle: number; diesel: boolean }) {
  const clip = useCut(at[2])
  const tex = useMemo(() => ({ cut: makeCut4(), hone: makeHone() }), [])
  const gas = useMemo(() => [0, 1, 2, 3].map(i => makeGas(i * 1.7, false, APEX, 0)), [])
  useMemo(() => gas.forEach(m => { m.uniforms.uDiesel.value = diesel ? 1 : 0 }), [gas, diesel])
  const live = useRef(angle); live.current = angle
  const parts = useRef<{ p: (THREE.Group | null)[]; r: (THREE.Group | null)[]; t: (THREE.Group | null)[]; spark: (THREE.Sprite | null)[]; spray: (THREE.Group | null)[]; light: (THREE.PointLight | null)[]; cam: THREE.Group | null }>({ p: [], r: [], t: [], spark: [], spray: [], light: [], cam: null })
  const dz = useRef(diesel); dz.current = diesel
  useFrame(({ clock }) => {
    const a = live.current, q = parts.current, t = clock.elapsedTime
    ;[1, 2, 3, 4].forEach((n, i) => {
      const ca = a - PHASE[n], rad = ca * Math.PI / 180, x = ((ca % 720) + 720) % 720
      q.p[i]?.position.set(CYL_X[i], pistonY(ca) * S, 0)
      if (q.r[i]) { q.r[i]!.position.set(CYL_X[i], CR * Math.cos(rad), CR * Math.sin(rad)); q.r[i]!.rotation.x = -rodAngle(ca) }
      if (q.t[i]) q.t[i]!.rotation.x = rad
      setGas(gas[i], ca, t)
      const sp = !dz.current && x > 352 && x < 372 ? Math.sin((x - 352) / 20 * Math.PI) : 0
      if (q.spark[i]) { q.spark[i]!.visible = sp > 0.02; q.spark[i]!.scale.setScalar(0.1 + sp * 0.2); (q.spark[i]!.material as THREE.SpriteMaterial).opacity = sp }
      // 柴油机：压缩冲程末喷油器喷出一束细雾
      const inj = dz.current && x > 345 && x < 378 ? Math.sin((x - 345) / 33 * Math.PI) : 0
      q.spray[i]?.children.forEach((s, k) => {
        const f = frac(t * 3 + k / 10), ang = (k % 5 - 2) * 0.22
        s.position.set(Math.sin(ang) * f * 0.35, -0.03 - Math.cos(ang) * f * 0.2, 0.02); s.scale.setScalar(0.04 + f * 0.1)
        ;((s as THREE.Sprite).material as THREE.SpriteMaterial).opacity = inj * (1 - f) * 0.9
      })
      if (q.light[i]) q.light[i]!.intensity = x >= 360 && x < 540 ? 3.5 * Math.max(0, 1 - (x - 360) / 180) ** 2 : 0
    })
    if (q.cam) q.cam.rotation.x = -a * Math.PI / 360
  })
  const cast = <meshStandardMaterial color="#9ea3a6" roughness={0.6} metalness={0.55} clippingPlanes={clip} clipShadows side={THREE.DoubleSide} />
  const webGeo = useMemo(() => WEB.clone().rotateY(Math.PI / 2), [])
  const camGeo = useMemo(() => CAM.clone().rotateY(Math.PI / 2), [])
  return <group position={at}>
    <mesh position={[(BX0 + BX1) / 2, (BY0 + BY1) / 2, 0]} receiveShadow><planeGeometry args={[BX1 - BX0, BY1 - BY0]} /><meshStandardMaterial map={tex.cut} alphaTest={0.5} roughness={0.5} metalness={0.1} /></mesh>
    <RoundedBox args={[4.6, 1.6, 1.6]} radius={0.05} smoothness={2} position={[0, 1.27, 0]} castShadow receiveShadow>{cast}</RoundedBox>
    <RoundedBox args={[4.8, 1.32, 1.76]} radius={0.08} smoothness={2} position={[0, -0.06, 0]} castShadow receiveShadow>{cast}</RoundedBox>
    <RoundedBox args={[4.8, 0.95, 1.56]} radius={0.05} smoothness={2} position={[0, 2.545, 0]} castShadow receiveShadow><meshStandardMaterial color="#b9bdbf" roughness={0.5} metalness={0.6} clippingPlanes={clip} clipShadows side={THREE.DoubleSide} /></RoundedBox>
    <RoundedBox args={[4.72, COVER_TOP - 3.0, 1.46]} radius={0.12} smoothness={3} position={[0, (3.0 + COVER_TOP) / 2, 0]} castShadow><meshPhysicalMaterial color="#17191c" roughness={0.6} metalness={0.2} clearcoat={0.3} clippingPlanes={clip} clipShadows side={THREE.DoubleSide} /></RoundedBox>
    <RoundedBox args={[4.6, 0.78, 1.66]} radius={0.1} smoothness={2} position={[0, -1.09, 0]} castShadow><meshStandardMaterial color="#2a2d31" roughness={0.45} metalness={0.5} clippingPlanes={clip} clipShadows side={THREE.DoubleSide} /></RoundedBox>
    {/* 曲轴箱里面、油面 */}
    <mesh position={[0, 0, -0.6]}><planeGeometry args={[4.6, 1.7]} /><meshStandardMaterial color="#3d4246" roughness={0.7} metalness={0.4} /></mesh>
    <mesh position={[0, -1.2, -0.4]} rotation-x={-Math.PI / 2}><planeGeometry args={[4.5, 0.8]} /><meshPhysicalMaterial color="#7a5214" roughness={0.12} clearcoat={1} /></mesh>
    {/* 凸轮轴（在剖面后面的那一根），每缸一个凸轮 */}
    <group position={[0, 3.45, -0.3]}>
      <group ref={e => { parts.current.cam = e }}>
        <mesh rotation-z={Math.PI / 2}><cylinderGeometry args={[0.1, 0.1, 4.5, 20]} /><Metal kind="steel" grain="turned" rough={0.25} /></mesh>
        {CYL_X.map((x, i) => <mesh key={x} geometry={camGeo} position-x={x} rotation-x={PHASE[i + 1] * Math.PI / 360}><Metal kind="iron" grain="turned" rough={0.3} env={1.4} /></mesh>)}
      </group>
    </group>
    {CYL_X.map((cx, i) => <group key={cx}>
      {/* 缸壁、气体 */}
      <mesh position={[cx, (LINER + APEX) / 2, 0]}><cylinderGeometry args={[R, R, APEX - LINER, 40, 1, true]} /><meshStandardMaterial map={tex.hone} roughness={0.35} metalness={0.7} side={THREE.BackSide} clippingPlanes={clip} /></mesh>
      <group position={[cx, 0, 0.004]}><mesh material={gas[i]} geometry={GAS_PLANE} renderOrder={6} /></group>
      <pointLight ref={e => { parts.current.light[i] = e }} position={[cx, 2.0, 0.5]} color="#ff8a3a" distance={3} decay={1.6} intensity={0} />
      {/* 活塞 */}
      <group ref={e => { parts.current.p[i] = e }}>
        <mesh geometry={PISTON} castShadow><Metal kind="aluminum" grain="turned" rough={0.32} /></mesh>
        {[0.18, 0.23, 0.28].map(y => <mesh key={y} geometry={RING} position-y={y}><Metal kind="steel" rough={0.25} /></mesh>)}
      </group>
      {/* 连杆：在 yz 平面里摆 */}
      <group ref={e => { parts.current.r[i] = e }}><group rotation-y={Math.PI / 2}><mesh geometry={ROD} castShadow><Metal kind="steel" grain="cast" rough={0.36} /></mesh></group></group>
      {/* 曲轴的这一拐：两块曲柄臂、曲柄销 */}
      <group position-x={cx}><group ref={e => { parts.current.t[i] = e }}>
        {[-1, 1].map(s => <mesh key={s} geometry={webGeo} position-x={s * 0.25} castShadow><Metal kind="steel" grain="turned" rough={0.3} /></mesh>)}
        <mesh position={[0, CR, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.2, 0.2, 0.44, 28]} /><Metal kind="steel" grain="turned" rough={0.32} /></mesh>
      </group></group>
      {/* 火花塞或喷油器 */}
      <group position={[cx, APEX - 0.01, 0]}>
        {diesel
          ? <mesh geometry={INJ} castShadow><Metal kind="steel" grain="turned" rough={0.25} /></mesh>
          : <><mesh geometry={PLUG} castShadow><Metal kind="steel" grain="turned" rough={0.3} /></mesh>
            <mesh position-y={PORCELAIN_FROM + 0.16}><cylinderGeometry args={[0.062, 0.067, 0.3, 24]} /><meshPhysicalMaterial color="#f1efe8" roughness={0.25} clearcoat={0.8} /></mesh></>}
        <mesh position-y={0.7 + (COVER_TOP + 0.3 - APEX - 0.7) / 2}><cylinderGeometry args={[0.085, 0.09, COVER_TOP + 0.3 - APEX - 0.7, 24]} /><meshPhysicalMaterial color={diesel ? '#3a3d41' : '#141517'} roughness={0.4} clearcoat={0.5} /></mesh>
        <sprite ref={e => { parts.current.spark[i] = e }} position={[0, -0.03, 0.05]} renderOrder={9}><spriteMaterial map={softDot()} color="#bfe4ff" transparent depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} opacity={0} /></sprite>
        <group ref={e => { parts.current.spray[i] = e }}>{Array.from({ length: 10 }, (_, k) => <sprite key={k} renderOrder={8}><spriteMaterial map={softDot()} color="#f3e6b0" transparent depthWrite={false} opacity={0} /></sprite>)}</group>
      </group>
    </group>)}
    {/* 柴油机：缸盖上一根共轨，给四个喷油器供油 */}
    {diesel && <mesh position={[0, COVER_TOP + 0.45, 0.25]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.09, 0.09, 4.2, 20]} /><Metal kind="steel" grain="brushed" /></mesh>}
    {/* 主轴颈：两头和每两拐之间；后头一个飞轮 */}
    {[-2.0, -1.0, 0, 1.0, 2.0].map(x => <mesh key={x} position-x={x} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.24, 0.24, x === -2 || x === 2 ? 0.4 : 0.32, 28]} /><Metal kind="steel" grain="turned" rough={0.32} /></mesh>)}
    <FlyWheel angle={angle} />
    <mesh position-x={2.38} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.2, 0.2, 0.36, 24]} /><Metal kind="steel" grain="turned" /></mesh>
  </group>
}
function FlyWheel({ angle }: { angle: number }) {
  return <group position-x={2.55} rotation-x={angle * Math.PI / 180}>
    <mesh rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[1.08, 1.08, 0.18, 64]} /><Metal kind="iron" grain="turned" /></mesh>
    <mesh rotation-y={Math.PI / 2}><torusGeometry args={[1.08, 0.045, 6, 90]} /><Metal kind="steel" /></mesh>
    <mesh position={[0.1, 0.7, 0]}><boxGeometry args={[0.02, 0.1, 0.1]} /><meshStandardMaterial color="#d8d2c0" /></mesh>
  </group>
}
