// 地球仪大厅里那只落地大地球仪：木三脚架、车出来的木立柱、黄铜托架、带刻度的黄铜子午圈，球面是 NASA 实拍影像上印经纬网和度数。
// 地轴斜着装，和地面成 66.5°。各课要加亮的纬线、经线、半球、图钉、航线都画在这里，由这一课交上来的 want 决定。
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, disc, lathe } from '@/lab-kit'
import { AXIS_TO_GROUND, GLOBE_D } from './physics'

const RAD = Math.PI / 180
/** 球的半径（m） */
export const GR = GLOBE_D / 2
/** 地轴离竖直方向偏了多少（弧度）：北极往画面右边（+x）斜 */
export const TILT = (90 - AXIS_TO_GROUND) * RAD
/** 球心离地面的高度（m） */
export const GH = 1.42
/** 子午圈的内外半径（m） */
const RM0 = GR + 0.016, RM1 = GR + 0.05, RMT = 0.016

export interface GlobeWant {
  /** 地球仪转过的角度（°） */
  spin?: number
  /** 加亮的纬线 */
  lats?: { lat: number; color: string }[]
  /** 加亮的经线（半圆）；full 时连对面那一半一起画成经线圈 */
  lons?: { lon: number; color: string; full?: boolean }[]
  /** 半球：n 是这一半正中的方向（'n' 北极，数字是东半球正中的经度），k 是显出来的程度 0–1 */
  hemi?: { n: 'n' | number; k: number }
  /** 图钉 */
  pins?: { lat: number; lon: number; color: string }[]
  /** 一段航线：from 到 to，t 是小船走到哪了 0–1；along 是沿经线还是沿纬线 */
  route?: { from: { lat: number; lon: number }; to: { lat: number; lon: number }; t: number }
  /** 画出地轴的延长线和它跟地面的夹角 */
  axis?: boolean
  /** 量直径的大卡尺：0 收起，1 卡到球上 */
  caliper?: number
  /** 拖着转地球仪：转了多少度 */
  onSpin?: (deg: number) => void
}

/** 球面上一点在“地球仪自己的”坐标里的位置：y 朝北极，经度 0° 在 +x，东经 90° 在 −z */
export const onSphere = (lat: number, lon: number, r = GR): [number, number, number] => {
  const k = Math.cos(lat * RAD)
  return [r * k * Math.cos(lon * RAD), r * Math.sin(lat * RAD), -r * k * Math.sin(lon * RAD)]
}
/** 让某个经度转到正对 +z（镜头常在的方向）时，地球仪要转多少度 */
export const faceLon = (lon: number) => -90 - lon
/** 地球仪坐标里的一点，换成场景里的位置 */
export function globeToWorld(at: THREE.Vector3, p: [number, number, number], spin: number): [number, number, number] {
  const v = new THREE.Vector3(...p).applyAxisAngle(new THREE.Vector3(0, 1, 0), spin * RAD).applyAxisAngle(new THREE.Vector3(0, 0, 1), -TILT)
  return [at.x + v.x, at.y + GH + v.y, at.z + v.z]
}

// ---------- 球面的贴图：实拍影像上印经纬网和度数 ----------
function useGlobeMap() {
  const day = useTexture('/assets/tex/earth_day.jpg')
  const [tex, setTex] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    // 晚一帧再画，免得进页面那一下卡住
    const id = setTimeout(() => {
      const W = 4096, H = 2048, c = document.createElement('canvas'); c.width = W; c.height = H
      const g = c.getContext('2d')!
      g.drawImage(day.image as CanvasImageSource, 0, 0, W, H)
      // 印刷的地球仪颜色更亮一点：海提亮、整体加一层很淡的暖白
      g.globalCompositeOperation = 'screen'; g.fillStyle = 'rgba(66,120,176,0.78)'; g.fillRect(0, 0, W, H)
      g.globalCompositeOperation = 'source-over'
      const X = (lon: number) => (lon + 180) / 360 * W, Y = (lat: number) => (90 - lat) / 180 * H
      // 每 10° 一条细线
      g.strokeStyle = 'rgba(236,242,248,0.62)'; g.lineWidth = 2.6
      for (let lon = -180; lon <= 180; lon += 10) { g.beginPath(); g.moveTo(X(lon), Y(80)); g.lineTo(X(lon), Y(-80)); g.stroke() }
      for (let lat = -80; lat <= 80; lat += 10) { g.beginPath(); g.moveTo(0, Y(lat)); g.lineTo(W, Y(lat)); g.stroke() }
      // 赤道和本初子午线粗一些
      g.strokeStyle = 'rgba(255,255,255,0.92)'; g.lineWidth = 6
      g.beginPath(); g.moveTo(0, Y(0)); g.lineTo(W, Y(0)); g.stroke()
      g.beginPath(); g.moveTo(X(0), Y(84)); g.lineTo(X(0), Y(-84)); g.stroke()
      // 回归线和极圈：虚线
      g.setLineDash([22, 16]); g.strokeStyle = 'rgba(255,214,140,0.85)'; g.lineWidth = 3.2
      for (const lat of [23.5, -23.5, 66.5, -66.5]) { g.beginPath(); g.moveTo(0, Y(lat)); g.lineTo(W, Y(lat)); g.stroke() }
      g.setLineDash([])
      // 度数：赤道上每 30° 一个经度，四条经线上每 10°–30° 一个纬度。高纬度的字按 cos 压窄，贴到球上才是正的
      const text = (s: string, lon: number, lat: number, size: number, align: CanvasTextAlign = 'left') => {
        g.save(); g.translate(X(lon), Y(lat)); g.scale(1 / Math.max(0.25, Math.cos(lat * RAD)), 1)
        g.font = `600 ${size}px "Geist", "Helvetica Neue", Arial, sans-serif`; g.textAlign = align; g.textBaseline = 'bottom'
        g.lineWidth = 6; g.strokeStyle = 'rgba(10,25,45,0.75)'; g.strokeText(s, 0, 0); g.fillStyle = '#ffffff'; g.fillText(s, 0, 0); g.restore()
      }
      for (let lon = -150; lon <= 180; lon += 30) text(lon === 0 || lon === 180 ? `${lon}°` : `${Math.abs(lon)}°${lon > 0 ? 'E' : 'W'}`, lon + 0.7, 0.8, 40)
      for (const mer of [0, 90, 180, -90]) for (const lat of [10, 20, 30, 40, 50, 60, 70, -10, -20, -30, -40, -50, -60, -70]) text(`${Math.abs(lat)}°${lat > 0 ? 'N' : 'S'}`, mer + 0.6, lat + 0.7, 34)
      // 两极附近画一圈白，像印刷地球仪的极帽
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16; t.wrapS = THREE.RepeatWrapping
      setTex(t)
    }, 60)
    return () => clearTimeout(id)
  }, [day])
  return tex
}

/** 子午圈正面刻的度数：从赤道往两极 0–90，每 2° 一道短刻、10° 一道长刻和数字 */
function useRingDecal() {
  return useMemo(() => {
    const N = 2048, c = document.createElement('canvas'); c.width = N; c.height = N
    const g = c.getContext('2d')!, C = N / 2, s = C / RM1
    g.strokeStyle = '#2a1d08'; g.fillStyle = '#2a1d08'
    for (let a = 0; a < 360; a += 1) {
      // a 从地轴的北端量起；离赤道的度数 = 90 − 离北极的角度
      const ang = a * RAD + TILT, lat = 90 - (a <= 180 ? a : 360 - a)
      const long = Math.abs(lat) % 10 === 0, mid = Math.abs(lat) % 5 === 0
      const r0 = RM1 * s - 4, r1 = r0 - (long ? 26 : mid ? 17 : 10)
      const dx = Math.sin(ang), dy = -Math.cos(ang)
      g.lineWidth = long ? 3.2 : 2; g.beginPath(); g.moveTo(C + dx * r0, C + dy * r0); g.lineTo(C + dx * r1, C + dy * r1); g.stroke()
      if (long && a % 360 !== 0 && a !== 180) {
        const rr = RM0 * s + 13
        g.save(); g.translate(C + dx * rr, C + dy * rr); g.rotate(ang); g.font = '600 19px "Geist", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(Math.abs(lat)), 0, 0); g.restore()
      }
    }
    g.lineWidth = 2; g.beginPath(); g.arc(C, C, RM0 * s + 3, 0, Math.PI * 2); g.stroke()
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
    return t
  }, [])
}

/** 木头：车削立柱和三条腿用的细纹 */
function useWood() {
  return useMemo(() => {
    const W = 256, H = 1024, c = document.createElement('canvas'); c.width = W; c.height = H
    const g = c.getContext('2d')!
    g.fillStyle = '#a8703f'; g.fillRect(0, 0, W, H)
    let s = 3; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
    for (let i = 0; i < 260; i++) {
      const x = rnd() * W, w = 0.6 + rnd() * 2.6, a = 0.08 + rnd() * 0.22
      g.strokeStyle = rnd() > 0.5 ? `rgba(40,18,6,${a})` : `rgba(160,100,55,${a * 0.7})`; g.lineWidth = w
      g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= H; y += 32) g.lineTo(x + Math.sin(y * 0.01 + i) * 5, y); g.stroke()
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8
    return t
  }, [])
}

/** 一条纬线：一圈细环 */
function Parallel({ lat, color }: { lat: number; color: string }) {
  const R = GR * Math.cos(lat * RAD) * 1.004
  if (R < 0.01) return <mesh position={[0, GR * 1.004 * Math.sign(lat), 0]}><sphereGeometry args={[0.018, 16, 12]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>
  return <mesh position={[0, GR * Math.sin(lat * RAD) * 1.004, 0]} rotation-x={Math.PI / 2} raycast={() => null}><torusGeometry args={[R, 0.0055, 8, 160]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>
}
/** 一条经线：从北极到南极的半圆 */
const HALF = (() => { const g = new THREE.TorusGeometry(GR * 1.004, 0.0055, 8, 120, Math.PI); g.rotateZ(-Math.PI / 2); return g })()
function Meridian({ lon, color, full }: { lon: number; color: string; full?: boolean }) {
  return <>
    <mesh geometry={HALF} rotation-y={lon * RAD} raycast={() => null}><meshBasicMaterial color={color} toneMapped={false} /></mesh>
    {full && <mesh geometry={HALF} rotation-y={(lon + 180) * RAD} raycast={() => null}><meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.75} /></mesh>}
  </>
}

const HEMI_VERT = /* glsl */`varying vec3 vL; void main() { vL = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`
const HEMI_FRAG = /* glsl */`uniform vec3 uN; uniform vec3 uA; uniform vec3 uB; uniform float uK; varying vec3 vL;
void main() { float s = dot(normalize(vL), uN); float a = smoothstep(-0.006, 0.006, s); vec3 c = mix(uB, uA, a); gl_FragColor = vec4(c, uK * 0.42); }`
/** 半球：一半染青、一半染橙，中间一张分界面 */
function Hemi({ n, k }: { n: 'n' | number; k: number }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: HEMI_VERT, fragmentShader: HEMI_FRAG, transparent: true, depthWrite: false, uniforms: { uN: { value: new THREE.Vector3(0, 1, 0) }, uA: { value: new THREE.Color('#35e0c8') }, uB: { value: new THREE.Color('#ffa64d') }, uK: { value: 0 } } }), [])
  const N = n === 'n' ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(...onSphere(0, n, 1))
  mat.uniforms.uN.value.copy(N); mat.uniforms.uK.value = k
  const q = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), N), [N.x, N.y, N.z])   // eslint-disable-line react-hooks/exhaustive-deps
  return <>
    <mesh raycast={() => null} renderOrder={3}><sphereGeometry args={[GR * 1.003, 96, 64]} /><primitive object={mat} attach="material" /></mesh>
    <group quaternion={q} scale={0.6 + 0.4 * k}>
      <mesh raycast={() => null} renderOrder={4}><circleGeometry args={[GR * 1.16, 96]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.16 * k} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} /></mesh>
      <mesh raycast={() => null}><torusGeometry args={[GR * 1.16, 0.004, 6, 160]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.85 * k} toneMapped={false} /></mesh>
    </group>
  </>
}

/** 图钉：黄铜针加一颗彩色圆头，扎在球面上 */
function Pin({ lat, lon, color }: { lat: number; lon: number; color: string }) {
  const p = onSphere(lat, lon, GR), q = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...p).normalize()), [lat, lon])   // eslint-disable-line react-hooks/exhaustive-deps
  return <group position={p} quaternion={q}>
    <mesh position={[0, 0.022, 0]}><cylinderGeometry args={[0.0018, 0.0018, 0.044, 8]} /><Metal kind="brass" /></mesh>
    <mesh position={[0, 0.05, 0]} castShadow><sphereGeometry args={[0.012, 18, 14]} /><meshPhysicalMaterial color={color} roughness={0.25} clearcoat={0.8} emissive={color} emissiveIntensity={0.35} /></mesh>
  </group>
}

/** 一段航线：沿大圆或纬线的一条亮线，加一艘小船标记 */
function Route({ from, to, t }: NonNullable<GlobeWant['route']>) {
  const pts = useMemo(() => {
    const P: THREE.Vector3[] = []
    for (let i = 0; i <= 48; i++) { const k = i / 48; P.push(new THREE.Vector3(...onSphere(from.lat + (to.lat - from.lat) * k, from.lon + (to.lon - from.lon) * k, GR * 1.006))) }
    return P
  }, [from.lat, from.lon, to.lat, to.lon])   // eslint-disable-line react-hooks/exhaustive-deps
  const geo = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, 0.0045, 8, false), [pts])
  const at = onSphere(from.lat + (to.lat - from.lat) * t, from.lon + (to.lon - from.lon) * t, GR * 1.012)
  return <>
    <mesh geometry={geo} raycast={() => null}><meshBasicMaterial color="#ffe14d" toneMapped={false} transparent opacity={0.55} /></mesh>
    <mesh position={at}><sphereGeometry args={[0.014, 16, 12]} /><meshBasicMaterial color="#ff5a3c" toneMapped={false} /></mesh>
    <mesh position={onSphere(from.lat, from.lon, GR * 1.008)}><sphereGeometry args={[0.009, 12, 10]} /><meshBasicMaterial color="#ffffff" toneMapped={false} /></mesh>
  </>
}

/** 量直径用的大卡尺：铝尺身横在球下方，两只卡脚从两边合拢，夹住球的最宽处 */
function Caliper({ k }: { k: number }) {
  if (k <= 0.001) return null
  const open = GR + 0.02 + (1 - k) * 0.35, y = 0, z = 0.0
  return <group position={[0, y, z]}>
    <mesh position={[0, -GR - 0.13, 0.0]} castShadow><boxGeometry args={[1.9, 0.045, 0.018]} /><Metal kind="aluminum" grain="brushed" /></mesh>
    {/* 尺身上的刻度：一道道深色细线 */}
    {Array.from({ length: 37 }, (_, i) => <mesh key={i} position={[-0.9 + i * 0.05, -GR - 0.112, 0.0095]}><planeGeometry args={[0.003, i % 2 ? 0.012 : 0.022]} /><meshBasicMaterial color="#1b1d20" /></mesh>)}
    {[-1, 1].map(s => <group key={s} position={[s * open, 0, 0]}>
      <mesh position={[0, -GR / 2 - 0.06, 0]} castShadow><boxGeometry args={[0.03, GR + 0.18, 0.022]} /><Metal kind="aluminum" grain="brushed" /></mesh>
      <mesh position={[-s * 0.03, 0, 0]} castShadow><boxGeometry args={[0.06, 0.03, 0.022]} /><Metal kind="steel" grain="brushed" /></mesh>
      <mesh position={[0, -GR - 0.13, 0]}><boxGeometry args={[0.07, 0.075, 0.03]} /><meshStandardMaterial color="#c8432e" roughness={0.45} /></mesh>
    </group>)}
  </group>
}

/** 地轴的延长线、地面方向的一条线和两线之间的夹角 */
function AxisMark() {
  const L = GR + 0.42
  return <>
    <group rotation-z={-TILT}>
      <mesh raycast={() => null}><cylinderGeometry args={[0.004, 0.004, L * 2, 8]} /><meshBasicMaterial color="#ffe14d" toneMapped={false} /></mesh>
      <mesh position={[0, L, 0]}><coneGeometry args={[0.016, 0.05, 12]} /><meshBasicMaterial color="#ffe14d" toneMapped={false} /></mesh>
    </group>
    <mesh position={[L * 0.55, 0, 0]} rotation-z={Math.PI / 2} raycast={() => null}><cylinderGeometry args={[0.003, 0.003, L * 1.1, 8]} /><meshBasicMaterial color="#ffffff" toneMapped={false} transparent opacity={0.8} /></mesh>
    <mesh raycast={() => null}><torusGeometry args={[GR + 0.2, 0.004, 6, 64, Math.PI / 2 - TILT]} /><meshBasicMaterial color="#ffffff" toneMapped={false} /></mesh>
  </>
}

/** 整只地球仪。at：地面上立脚的位置 */
export function Globe({ at, want }: { at: THREE.Vector3; want: GlobeWant }) {
  const map = useGlobeMap(), ring = useRingDecal(), wood = useWood()
  const controls = useThree(s => s.controls) as { enabled: boolean } | null
  const spinRef = useRef<THREE.Group>(null)
  // 转动跟在目标后面慢慢走，不跳
  const cur = useRef(want.spin ?? 0)
  useFrame((_, dt) => { const g = spinRef.current; if (!g) return; const to = want.spin ?? 0; cur.current += (to - cur.current) * Math.min(1, dt * 8); g.rotation.y = cur.current * RAD })
  const drag = useRef<number | null>(null)
  const onSpin = want.onSpin
  const hand = onSpin ? {
    onPointerDown: (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); (e.target as Element).setPointerCapture(e.pointerId); drag.current = e.nativeEvent.clientX; if (controls) controls.enabled = false },
    onPointerMove: (e: ThreeEvent<PointerEvent>) => { if (drag.current == null) return; const dx = e.nativeEvent.clientX - drag.current; if (Math.abs(dx) >= 2) { onSpin(dx * 0.4); drag.current = e.nativeEvent.clientX } },
    onPointerUp: (e: ThreeEvent<PointerEvent>) => { drag.current = null; (e.target as Element).releasePointerCapture?.(e.pointerId); if (controls) controls.enabled = true },
    onPointerOver: () => { document.body.style.cursor = 'ew-resize' }, onPointerOut: () => { document.body.style.cursor = '' },
  } : {}

  const geo = useMemo(() => {
    // 子午圈：长方形截面绕 z 轴转一圈
    const ringG = lathe([[RM0, -RMT / 2], [RM1, -RMT / 2], [RM1, RMT / 2], [RM0, RMT / 2]], { segs: 220, closed: true }); ringG.rotateX(Math.PI / 2)
    // 车出来的木立柱：一节节鼓起又收细
    const col = lathe([[0.001, 0.12], [0.075, 0.12], [0.075, 0.15], [0.052, 0.17], [0.05, 0.24], [0.085, 0.33], [0.088, 0.38], [0.06, 0.45], [0.042, 0.5], [0.042, 0.56], [0.064, 0.58], [0.064, 0.61], [0.001, 0.61]], { segs: 48 })
    // 托架顶上的黄铜杯
    const cup = lathe([[0.001, 0.6], [0.05, 0.6], [0.058, 0.62], [0.046, 0.66], [0.03, 0.69], [0.03, 0.72], [0.001, 0.72]], { segs: 40 })
    // 三条腿：从立柱底部弯出去，落到地上
    const legs = [0, 1, 2].map(i => {
      const a = i * Math.PI * 2 / 3 + Math.PI / 6, d = new THREE.Vector3(Math.cos(a), 0, Math.sin(a))
      const c = new THREE.CatmullRomCurve3([d.clone().multiplyScalar(0.05).setY(0.2), d.clone().multiplyScalar(0.22).setY(0.14), d.clone().multiplyScalar(0.42).setY(0.06), d.clone().multiplyScalar(0.5).setY(0.035)])
      return { tube: new THREE.TubeGeometry(c, 40, 0.034, 14, false), foot: d.clone().multiplyScalar(0.5).setY(0.03) }
    })
    // 托住子午圈下沿的黄铜叉：一段弧形的槽
    const saddle = new THREE.TorusGeometry(RM1 + 0.012, 0.014, 10, 32, 0.5); saddle.rotateZ(-Math.PI / 2 - 0.25)
    return { ringG, col, cup, legs, saddle, knob: disc(0.022, 0.016) }
  }, [])

  const w = want, spin = w.spin ?? 0
  void spin
  return (
    <group position={at}>
      {/* 支架 */}
      <mesh geometry={geo.col} castShadow receiveShadow><meshPhysicalMaterial map={wood} color="#f0cfa6" roughness={0.38} clearcoat={0.6} clearcoatRoughness={0.25} /></mesh>
      {geo.legs.map((l, i) => <group key={i}>
        <mesh geometry={l.tube} castShadow receiveShadow><meshPhysicalMaterial map={wood} color="#f0cfa6" roughness={0.38} clearcoat={0.6} clearcoatRoughness={0.25} /></mesh>
        <mesh position={l.foot} castShadow><sphereGeometry args={[0.032, 20, 14]} /><Metal kind="brass" /></mesh>
      </group>)}
      <mesh position={[0, 0.12, 0]}><cylinderGeometry args={[0.085, 0.09, 0.03, 40]} /><Metal kind="brass" grain="turned" /></mesh>
      <mesh geometry={geo.cup} castShadow><Metal kind="brass" grain="turned" /></mesh>
      {/* 托架：从黄铜杯伸上去，托着子午圈的最低处 */}
      <group position={[0, GH, 0]}>
        <mesh geometry={geo.saddle} castShadow><Metal kind="brass" grain="brushed" /></mesh>
        {/* 子午圈 */}
        <mesh geometry={geo.ringG} castShadow receiveShadow><Metal kind="brass" grain="brushed" rough={0.3} /></mesh>
        <mesh position={[0, 0, RMT / 2 + 0.0008]} raycast={() => null}><ringGeometry args={[RM0, RM1, 220]} /><meshBasicMaterial map={ring} transparent alphaTest={0.08} color="#ffffff" opacity={0.92} /></mesh>
        {/* 地轴两头：穿过子午圈的轴钉和外面的滚花螺母 */}
        <group rotation-z={-TILT}>
          {[1, -1].map(s => <group key={s}>
            <mesh position={[0, s * (GR + 0.03), 0]}><cylinderGeometry args={[0.006, 0.006, 0.06, 12]} /><Metal kind="steel" /></mesh>
            <mesh position={[0, s * (RM1 + 0.008), 0]} rotation-x={0}><primitive object={geo.knob} attach="geometry" /><Metal kind="brass" grain="turned" /></mesh>
          </group>)}
          {/* 球：绕地轴转 */}
          <group ref={spinRef}>
            <mesh castShadow receiveShadow {...hand}>
              <sphereGeometry args={[GR, 160, 96]} />
              {map ? <meshPhysicalMaterial map={map} roughness={0.5} clearcoat={0.5} clearcoatRoughness={0.38} /> : <meshStandardMaterial color="#29507a" roughness={0.5} />}
            </mesh>
            {(w.lats ?? []).map(l => <Parallel key={`a${l.lat}`} {...l} />)}
            {(w.lons ?? []).map(l => <Meridian key={`o${l.lon}`} {...l} />)}
            {w.hemi && w.hemi.k > 0.001 && <Hemi {...w.hemi} />}
            {(w.pins ?? []).map((p, i) => <Pin key={i} {...p} />)}
            {w.route && <Route {...w.route} />}
          </group>
        </group>
        {w.axis && <AxisMark />}
        <Caliper k={w.caliper ?? 0} />
      </group>
    </group>
  )
}
