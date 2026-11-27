// 坐标系：立在水柱、球的轨迹、桥拱所在竖直面里的半透明坐标平面。网格、刻度、数字、箭头、原点、单位画进一张贴图；
// 抛物线、描的点、对称轴、读数的虚线是贴图前面的三维小件，参数一变就连续地动。
// 局部坐标：平面在 z = 0、朝 +z；数据点 (x, y) 落在 (x·sx, y·sy)，即原点就在这一组的原点上。
import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { Metal } from '@/lab-kit'
import { canvas, tex, FONT, NUM, SERIF } from './mats'

export interface Axes {
  xr: [number, number]; yr: [number, number]       // 画到哪里（数据单位）
  xStep: number; yStep: number                     // 每隔多少标一个数
  sx: number; sy: number                           // 一个数据单位多少米
  xName: string; yName: string                     // 轴名（带单位），写在箭头旁边
  minor?: [number, number]                         // 细网格的间隔
  font?: number                                    // 刻度数字的字高（m）
  pad?: number                                     // 平面比数据范围四周多出多少米
  padL?: number                                    // 左边单独多出多少米（纵轴的数字长时用）
  tint?: string                                    // 玻璃的底色
}
export const at = (A: Axes, x: number, y: number, z = 0.04): [number, number, number] => [x * A.sx, y * A.sy, z]
/** 平面的四边（m，局部坐标） */
export const bounds = (A: Axes) => { const p = A.pad ?? 0.8; return { x0: A.xr[0] * A.sx - (A.padL ?? p), x1: A.xr[1] * A.sx + p * 1.6, y0: A.yr[0] * A.sy - p, y1: A.yr[1] * A.sy + p * 1.6 } }

const num = (v: number) => (Math.abs(v) < 1e-9 ? '0' : String(Math.round(v * 100) / 100).replace('-', '−'))
function drawAxes(A: Axes) {
  const B = bounds(A), w = B.x1 - B.x0, h = B.y1 - B.y0
  const ppm = Math.min(2048 / h, 2048 / w), W = Math.round(w * ppm), H = Math.round(h * ppm)
  const { c, g } = canvas(W, H)
  const px = (x: number) => (x * A.sx - B.x0) * ppm, py = (y: number) => H - (y * A.sy - B.y0) * ppm
  g.fillStyle = A.tint ?? 'rgba(12,26,36,0.5)'; g.fillRect(0, 0, W, H)
  const [x0, x1] = A.xr, [y0, y1] = A.yr
  const grid = (step: number, col: string, lw: number) => {
    g.strokeStyle = col; g.lineWidth = lw
    for (let x = Math.ceil(x0 / step - 1e-9) * step; x <= x1 + 1e-9; x += step) { g.beginPath(); g.moveTo(px(x), py(y0)); g.lineTo(px(x), py(y1)); g.stroke() }
  }
  const gridY = (step: number, col: string, lw: number) => {
    g.strokeStyle = col; g.lineWidth = lw
    for (let y = Math.ceil(y0 / step - 1e-9) * step; y <= y1 + 1e-9; y += step) { g.beginPath(); g.moveTo(px(x0), py(y)); g.lineTo(px(x1), py(y)); g.stroke() }
  }
  // 网格线的粗细跟着字号走：大平面远看也看得见
  const fs = (A.font ?? 0.36) * ppm, lw = Math.max(3, fs * 0.12), ah = fs * 0.7
  if (A.minor) { grid(A.minor[0], 'rgba(180,225,240,0.16)', Math.max(1, fs * 0.03)); gridY(A.minor[1], 'rgba(180,225,240,0.16)', Math.max(1, fs * 0.03)) }
  grid(A.xStep, 'rgba(190,230,245,0.36)', Math.max(1.5, fs * 0.06)); gridY(A.yStep, 'rgba(190,230,245,0.36)', Math.max(1.5, fs * 0.06))
  // 两根坐标轴，正方向一头带箭头
  g.strokeStyle = g.fillStyle = '#f4f8f9'; g.lineWidth = lw; g.lineCap = 'round'
  const ax = Math.max(x0, Math.min(x1, 0)), ay = Math.max(y0, Math.min(y1, 0))
  const ex = px(x1) + fs * 1.3, ey = py(y1) - fs * 1.3
  g.beginPath(); g.moveTo(px(x0) - fs * 0.4, py(ay)); g.lineTo(ex, py(ay)); g.stroke()
  g.beginPath(); g.moveTo(px(ax), py(y0) + fs * 0.4); g.lineTo(px(ax), ey); g.stroke()
  g.beginPath(); g.moveTo(ex + ah, py(ay)); g.lineTo(ex - ah * 0.25, py(ay) - ah * 0.55); g.lineTo(ex - ah * 0.25, py(ay) + ah * 0.55); g.closePath(); g.fill()
  g.beginPath(); g.moveTo(px(ax), ey - ah); g.lineTo(px(ax) - ah * 0.55, ey + ah * 0.25); g.lineTo(px(ax) + ah * 0.55, ey + ah * 0.25); g.closePath(); g.fill()
  // 刻度和数字：数字带一圈深色描边，叠在亮的水柱、天空上也看得清
  g.font = `600 ${Math.round(fs)}px ${NUM}`; g.lineJoin = 'round'
  const label = (s: string, x: number, y: number) => { g.strokeStyle = 'rgba(8,18,24,0.75)'; g.lineWidth = fs * 0.22; g.strokeText(s, x, y); g.fillStyle = '#f4f8f9'; g.fillText(s, x, y) }
  g.textBaseline = 'top'; g.textAlign = 'center'
  for (let x = Math.ceil(x0 / A.xStep - 1e-9) * A.xStep; x <= x1 + 1e-9; x += A.xStep) {
    if (Math.abs(x) < 1e-9) continue
    g.fillStyle = '#f4f8f9'; g.fillRect(px(x) - lw / 2, py(ay) - fs * 0.3, lw, fs * 0.6); label(num(x), px(x), py(ay) + fs * 0.4)
  }
  g.textAlign = 'right'; g.textBaseline = 'middle'
  for (let y = Math.ceil(y0 / A.yStep - 1e-9) * A.yStep; y <= y1 + 1e-9; y += A.yStep) {
    if (Math.abs(y) < 1e-9) continue
    g.fillStyle = '#f4f8f9'; g.fillRect(px(ax) - fs * 0.3, py(y) - lw / 2, fs * 0.6, lw); label(num(y), px(ax) - fs * 0.45, py(y))
  }
  g.font = `italic 600 ${Math.round(fs * 1.1)}px ${SERIF}`; g.textAlign = 'right'; g.textBaseline = 'top'
  label('O', px(ax) - fs * 0.3, py(ay) + fs * 0.25)
  g.font = `600 ${Math.round(fs * 0.95)}px ${FONT}`
  g.textAlign = 'right'; g.textBaseline = 'bottom'; label(A.xName, ex + ah, py(ay) - fs * 0.5)
  g.textAlign = 'left'; g.textBaseline = 'middle'; label(A.yName, px(ax) + fs * 0.75, ey - ah * 0.1)
  return tex(c)
}

/** 坐标平面：半透明的茶色玻璃，四边细铝框。frame 为假时不画框（浮在空中的平面） */
/** front：平面画在水滴、水雾之后（盖在它们上面），刻度数字不会被水柱挡住 */
export function AxesPlane({ A, frame = true, opacity = 1, front = false, children }: { A: Axes; frame?: boolean; opacity?: number; front?: boolean; children?: ReactNode }) {
  const map = useMemo(() => drawAxes(A), [A])
  const B = bounds(A), w = B.x1 - B.x0, h = B.y1 - B.y0, t = 0.07
  return (
    <group>
      <mesh position={[(B.x0 + B.x1) / 2, (B.y0 + B.y1) / 2, 0]} renderOrder={front ? 5.5 : 2}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={map} transparent opacity={opacity} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} color="#e6ebee" />
      </mesh>
      {frame && <group>
        {[[B.y0], [B.y1]].map(([y], i) => <mesh key={`h${i}`} position={[(B.x0 + B.x1) / 2, y, 0]} castShadow><boxGeometry args={[w + t, t, 0.08]} /><Metal kind="aluminum" grain="brushed" /></mesh>)}
        {[B.x0, B.x1].map(x => <mesh key={`v${x}`} position={[x, (B.y0 + B.y1) / 2, 0]} castShadow><boxGeometry args={[t, h, 0.08]} /><Metal kind="aluminum" grain="brushed" /></mesh>)}
      </group>}
      {children}
    </group>
  )
}

/** 一条曲线 y = f(x)，画成平面上的一条宽带。f 和范围可以每帧都变（参数在过渡中） */
export function Curve({ A, f, xr, color, width = 0.09, opacity = 1, z = 0.05, n = 120 }: { A: Axes; f: (x: number) => number; xr: [number, number]; color: string; width?: number; opacity?: number; z?: number; n?: number }) {
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((n + 1) * 2 * 3), 3)); const idx: number[] = []; for (let i = 0; i < n; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2); g.setIndex(idx); return g }, [n])
  useLayoutEffect(() => {
    const p = geo.attributes.position as THREE.BufferAttribute, pts: [number, number][] = []
    // 只画落在坐标平面里的那一段（抛物线落在框里的部分是连续的一段）
    let lo = Math.max(xr[0], A.xr[0]), hi = Math.min(xr[1], A.xr[1])
    const ok = (x: number) => { const y = f(x); return y >= A.yr[0] - 0.25 / A.sy && y <= A.yr[1] + 0.25 / A.sy }
    const M = 600; let a0 = -1, a1 = -1
    for (let i = 0; i <= M; i++) { const x = lo + (hi - lo) * i / M; if (ok(x)) { if (a0 < 0) a0 = i; a1 = i } }
    if (a0 < 0) { a0 = 0; a1 = 0 }
    ;[lo, hi] = [lo + (hi - lo) * a0 / M, lo + (hi - lo) * a1 / M]
    for (let i = 0; i <= n; i++) { const x = lo + (hi - lo) * i / n; pts.push([x * A.sx, f(x) * A.sy]) }
    for (let i = 0; i <= n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l * width / 2, ny = dx / l * width / 2
      p.setXYZ(i * 2, pts[i][0] + nx, pts[i][1] + ny, z); p.setXYZ(i * 2 + 1, pts[i][0] - nx, pts[i][1] - ny, z)
    }
    p.needsUpdate = true; geo.computeBoundingSphere()
  })
  return <mesh geometry={geo} renderOrder={6} frustumCulled={false}><meshBasicMaterial color={color} toneMapped={false} transparent opacity={opacity} depthTest={false} side={THREE.DoubleSide} /></mesh>
}

/** 描的点：实心圆加一圈白边 */
export function Dot({ A, x, y, color = '#ffd25a', r = 0.14, opacity = 1 }: { A: Axes; x: number; y: number; color?: string; r?: number; opacity?: number }) {
  return (
    <group position={at(A, x, y, 0.07)}>
      <mesh renderOrder={7}><circleGeometry args={[r * 1.4, 32]} /><meshBasicMaterial color="#ffffff" toneMapped={false} depthTest={false} transparent opacity={opacity} /></mesh>
      <mesh position={[0, 0, 0.005]} renderOrder={8}><circleGeometry args={[r, 32]} /><meshBasicMaterial color={color} toneMapped={false} depthTest={false} transparent opacity={opacity} /></mesh>
    </group>
  )
}

/** 一条虚线：从数据点 p 到 q */
export function Dash({ A, p, q, color = '#ffe9a8', width = 0.05, gap = 0.28, opacity = 1 }: { A: Axes; p: [number, number]; q: [number, number]; color?: string; width?: number; gap?: number; opacity?: number }) {
  const P = new THREE.Vector3(...at(A, ...p, 0.06)), Q = new THREE.Vector3(...at(A, ...q, 0.06)), l = P.distanceTo(Q)
  if (l < 1e-3) return null
  const n = Math.max(1, Math.round(l / gap)), rot = Math.atan2(Q.y - P.y, Q.x - P.x), out: ReactNode[] = []
  for (let i = 0; i < n; i++) { const a = P.clone().lerp(Q, i / n), b = P.clone().lerp(Q, (i + 0.55) / n); out.push(<mesh key={i} position={a.clone().add(b).multiplyScalar(0.5)} rotation-z={rot} renderOrder={6}><planeGeometry args={[a.distanceTo(b), width]} /><meshBasicMaterial color={color} toneMapped={false} depthTest={false} transparent opacity={opacity} /></mesh>) }
  return <group>{out}</group>
}

/** 实线段（水面线、高度线） */
export function Bar({ A, p, q, color, width = 0.06, opacity = 1 }: { A: Axes; p: [number, number]; q: [number, number]; color: string; width?: number; opacity?: number }) {
  const ref = useRef<THREE.Mesh>(null)
  const P = new THREE.Vector3(...at(A, ...p, 0.055)), Q = new THREE.Vector3(...at(A, ...q, 0.055))
  return <mesh ref={ref} position={P.clone().add(Q).multiplyScalar(0.5)} rotation-z={Math.atan2(Q.y - P.y, Q.x - P.x)} renderOrder={6}><planeGeometry args={[Math.max(1e-3, P.distanceTo(Q)), width]} /><meshBasicMaterial color={color} toneMapped={false} depthTest={false} transparent opacity={opacity} /></mesh>
}
