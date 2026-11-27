// 热力环流和风实验室的大场景：一块切开的海滨城市地块（示意比例）。西边是海和沙滩，海边步道上一只风向袋；
// 中间是城市楼群，城东近郊一座工厂和高烟囱；再往东是农田、塑料大棚、气象观测站；最东边两道山脊夹着一条山谷。
// 靠近镜头的一面（z = ZH）是剖面：地下的土层、海水的深浅都看得见。白天、夜晚连续切换：天色、阳光、窗灯、路灯一起变。
// 整个实验室只有这一个世界，换课时画布不重建，镜头飞过去。各课的机位写在 SPOT 里。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Metal, makeStrata, useRipple } from '@/lab-kit'
import { Smoke, type Wind } from './air'

type V3 = [number, number, number]
export const X0 = -94, X1 = 94, ZH = 26, COAST = -52
const smooth = (t: number) => { const k = Math.min(1, Math.max(0, t)); return k * k * (3 - 2 * k) }
const hash = (i: number) => { const a = Math.sin(i * 12.9898) * 43758.5453; return a - Math.floor(a) }

/** 山的高度（谷底约 3，两道山脊约 22、26） */
export function mountain(x: number, z: number) {
  const r1 = 22 * Math.exp(-(((x - 58) / 8.5) ** 2)) * (0.86 + 0.14 * Math.sin(z * 0.13 + 1))
  const r2 = 26 * Math.exp(-(((x - 86) / 9.5) ** 2)) * (0.9 + 0.1 * Math.cos(z * 0.11))
  return r1 + r2 + 2.6 * smooth((x - 48) / 14)
}
/** 地面的高度：海底、沙滩、城市所在的平原、山谷 */
export function ground(x: number, z: number) {
  if (x < COAST) return 0.25 - 6.2 * smooth((COAST - x) / 26) - 0.5 * smooth((COAST - x) / 3)
  const beach = 0.25 + 0.75 * smooth((x - COAST) / 8)
  const hills = x > 46 ? mountain(x, z) : 0
  const n = (Math.sin(x * 0.31 + z * 0.47) + Math.sin(x * 0.73 - z * 0.29) * 0.5) * (0.05 + 0.6 * smooth((x - 50) / 10))
  return beach + hills * smooth((x - 44) / 6) + n
}

/** 几处器材的位置 */
export const P = {
  sock: [-47.5, 0, 16] as V3,
  chimney: [4, 0, -4] as V3,
  station: [36, 0, 18] as V3,
  house: [24, 0, -6] as V3,
}
export const CHIMNEY_H = 17
P.sock[1] = ground(P.sock[0], P.sock[2]); P.chimney[1] = ground(P.chimney[0], P.chimney[2]); P.station[1] = ground(P.station[0], P.station[2]); P.house[1] = ground(P.house[0], P.house[2])

/** 这一课对整个世界的要求 */
export interface Want {
  /** 白天 1、夜晚 0，中间是黄昏和清晨 */ day?: number
  /** 地表冷暖着色：沿 x 的若干段，v > 0 暖（红），v < 0 冷（蓝） */ heat?: { x0: number; x1: number; v: number }[]
  /** 风向袋：风吹向的方位角（度，从北顺时针）和风力（0–1） */ sock?: { to: number; k: number }
  /** 烟囱的烟：on 0–1，风场 */ smoke?: { on: number; wind: Wind; x?: number }
  /** 云量 0–1 */ cloud?: number
  /** 工厂往东挪多远（拓展课：建在近郊还是远郊） */ plant?: number
}

// ---------- 地块 ----------
function Terrain() {
  const geo = useMemo(() => {
    const NX = 376, NZ = 104, g = new THREE.PlaneGeometry(X1 - X0, ZH * 2, NX, NZ); g.rotateX(-Math.PI / 2)
    const pos = g.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color(), t = new THREE.Color()
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), h = ground(x, z); pos.setY(i, h)
      const k = Math.sin(x * 2.1 + z * 1.7) * 0.5 + 0.5
      if (x < COAST + 1) c.set('#c9b48a').lerp(t.set('#8a7a5c'), smooth(-h / 4))              // 湿沙、海底
      else if (x < -43) c.set('#e3d1a4').lerp(t.set('#d6c293'), k * 0.5)                       // 沙滩
      else if (x < -41) c.set('#b9b2a4')                                                        // 海边步道
      else if (x < -4) {                                                                          // 城区：街道深、街区浅
        const sx = ((x + 40.6) % 5.2 + 5.2) % 5.2, sz = ((z + 25.1) % 6.2 + 6.2) % 6.2
        c.set(sx < 1.1 || sz < 1.3 ? '#4d5154' : '#8f908a').lerp(t.set('#7a7c7c'), k * 0.15)
      }
      else if (x < 10) c.set('#8b9a6a').lerp(t.set('#9aa070'), k * 0.5)                         // 近郊
      else if (x < 44) {                                                                         // 农田：一垄一垄的
        const band = Math.floor((z + 40) / 6.5) + Math.floor((x - 10) / 9) * 3
        c.set(['#9fb05c', '#b7b067', '#7f9a4f', '#a8a35a', '#8c9e58'][((band % 5) + 5) % 5]).lerp(t.set('#6f7f45'), (Math.sin(z * 5) * 0.5 + 0.5) * 0.18)
      } else {
        const e = h + (k - 0.5) * 1.4
        c.set('#7f9450').lerp(t.set('#4d6b3c'), smooth((e - 3) / 3)).lerp(t.set('#7a776e'), smooth((e - 17) / 3)).lerp(t.set('#9a958b'), smooth((e - 22) / 2))
      }
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals()
    return g
  }, [])
  // 剖面：前面一面切开，土层一层层；另外三面也切出一片土，地块是实心的
  const cut = useMemo(() => {
    const front = new THREE.Shape(); front.moveTo(X0, -9)
    for (let x = X0; x <= X1 + 0.01; x += 0.5) front.lineTo(x, ground(x, ZH))
    front.lineTo(X1, -9)
    const end = (x: number) => { const s = new THREE.Shape(); s.moveTo(-ZH, -9); for (let z = -ZH; z <= ZH + 0.01; z += 0.5) s.lineTo(z, ground(x, z)); s.lineTo(ZH, -9); return new THREE.ShapeGeometry(s) }
    const back = new THREE.Shape(); back.moveTo(X0, -9); for (let x = X0; x <= X1 + 0.01; x += 0.5) back.lineTo(x, ground(x, -ZH)); back.lineTo(X1, -9)
    return { front: new THREE.ShapeGeometry(front), left: end(X0), right: end(X1), back: new THREE.ShapeGeometry(back) }
  }, [])
  const strata = useMemo(() => { const t = makeStrata(['#8a6f4e', '#93785a', '#7d6447', '#8a7050', '#76603f', '#5f4e38']); t.repeat.set(0.04, 0.11); t.offset.y = 0.12; t.wrapT = THREE.RepeatWrapping; return t }, [])
  return (
    <group>
      <mesh geometry={geo} receiveShadow castShadow><meshStandardMaterial vertexColors roughness={0.95} /></mesh>
      <mesh geometry={cut.front} position={[0, 0, ZH]}><meshStandardMaterial color="#b89a72" map={strata} roughness={1} /></mesh>
      <mesh geometry={cut.left} position={[X0, 0, 0]} rotation-y={-Math.PI / 2}><meshStandardMaterial color="#6f5a40" roughness={1} side={THREE.DoubleSide} /></mesh>
      <mesh geometry={cut.right} position={[X1, 0, 0]} rotation-y={-Math.PI / 2}><meshStandardMaterial color="#6f5a40" roughness={1} side={THREE.DoubleSide} /></mesh>
      <mesh geometry={cut.back} position={[0, 0, -ZH]}><meshStandardMaterial color="#6f5a40" roughness={1} side={THREE.DoubleSide} /></mesh>
      {/* 底座：深色厚板托着整个地块 */}
      <mesh position={[0, -9.6, 0]} receiveShadow><boxGeometry args={[X1 - X0 + 2, 1.2, ZH * 2 + 2]} /><meshPhysicalMaterial color="#23282c" roughness={0.5} clearcoat={0.4} /></mesh>
      <mesh position={[0, -10.3, 0]}><boxGeometry args={[X1 - X0 + 3, 0.25, ZH * 2 + 3]} /><meshStandardMaterial color="#15181b" roughness={0.7} /></mesh>
    </group>
  )
}

/** 地表冷暖着色：贴在地面上方一点的一层半透明颜色 */
function HeatOverlay({ heat }: { heat: { x0: number; x1: number; v: number }[] }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(X1 - X0, ZH * 2, 188, 26); g.rotateX(-Math.PI / 2)
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) p.setY(i, ground(p.getX(i), p.getZ(i)) + 0.08)
    g.computeVertexNormals(); return g
  }, [])
  const tex = useMemo(() => { const t = new THREE.DataTexture(new Uint8Array(512 * 4), 512, 1); t.magFilter = t.minFilter = THREE.LinearFilter; t.needsUpdate = true; return t }, [])
  const target = useMemo(() => {
    const a = new Float32Array(512)
    for (let i = 0; i < 512; i++) { const x = X0 + (i + 0.5) / 512 * (X1 - X0); let v = 0; for (const s of heat) v += s.v * smooth((x - s.x0) / 2.5) * smooth((s.x1 - x) / 2.5); a[i] = Math.max(-1, Math.min(1, v)) }
    return a
  }, [JSON.stringify(heat)])   // eslint-disable-line react-hooks/exhaustive-deps
  const cur = useRef(new Float32Array(512))
  const mat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, uniforms: { uH: { value: tex } },
    vertexShader: `varying float vX; void main(){ vX = (position.x - (${X0.toFixed(1)})) / ${(X1 - X0).toFixed(1)}; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform sampler2D uH; varying float vX; void main(){ float v = texture2D(uH, vec2(vX, 0.5)).r * 2.0 - 1.0; vec3 c = v > 0.0 ? vec3(1.0, 0.27, 0.16) : vec3(0.2, 0.5, 1.0); float a = abs(v) * 0.62; if (a < 0.01) discard; gl_FragColor = vec4(c, a); }`,
  }), [tex])
  useFrame((_, d) => {
    const c = cur.current, k = Math.min(1, d * 1.4), data = tex.image.data as Uint8Array; let moved = false
    for (let i = 0; i < 512; i++) { const n = c[i] + (target[i] - c[i]) * k; if (Math.abs(n - c[i]) > 1e-4) moved = true; c[i] = n; data[i * 4] = Math.round((n * 0.5 + 0.5) * 255) }
    if (moved) tex.needsUpdate = true
  })
  return <mesh geometry={geo} material={mat} renderOrder={2} />
}

// ---------- 海 ----------
function Sea() {
  const ripple = useRipple([10, 6], 0.01)
  const foam = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(({ clock }) => { if (foam.current) foam.current.opacity = 0.32 + Math.sin(clock.elapsedTime * 1.3) * 0.12 })
  const w = COAST - X0 + 2
  // 剖面上的海水：从海面到海底
  const side = useMemo(() => {
    const s = new THREE.Shape(); s.moveTo(X0, 0)
    for (let x = X0; x <= COAST + 2; x += 0.5) s.lineTo(x, Math.min(0, ground(x, ZH)))
    s.lineTo(COAST + 2, 0); return new THREE.ShapeGeometry(s)
  }, [])
  return <group>
    <mesh position={[X0 + w / 2, 0, 0]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[w, ZH * 2]} /><meshPhysicalMaterial color="#1f6f9f" transparent opacity={0.86} roughness={0.08} metalness={0.1} normalMap={ripple} normalScale={new THREE.Vector2(0.22, 0.22)} clearcoat={0.7} envMapIntensity={1.3} /></mesh>
    <mesh position={[COAST + 0.9, 0.03, 0]} rotation-x={-Math.PI / 2}><planeGeometry args={[2.2, ZH * 2]} /><meshBasicMaterial ref={foam} color="#eef8fb" transparent opacity={0.3} depthWrite={false} /></mesh>
    <mesh geometry={side} position={[0, 0, ZH + 0.02]}><meshStandardMaterial color="#2a6f9e" transparent opacity={0.72} roughness={0.4} /></mesh>
    <mesh position={[X0 - 0.02, -3.2, 0]} rotation-y={-Math.PI / 2}><planeGeometry args={[ZH * 2, 6.4]} /><meshStandardMaterial color="#2a6f9e" transparent opacity={0.8} side={THREE.DoubleSide} /></mesh>
  </group>
}

// ---------- 城市 ----------
/** 外墙贴图：4 开间 × 4 层；白天的窗是深蓝玻璃，夜里有一部分窗亮灯（自发光图） */
function facadeTex(glass = false, res = false) {
  const S = 256, mk = (lit: boolean) => {
    const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d')!
    g.fillStyle = lit ? '#000' : '#d9d6cf'; g.fillRect(0, 0, S, S)
    let s = glass ? 9 : 5; const r = () => (s = (s * 16807) % 2147483647) / 2147483647
    if (glass) {
      // 玻璃幕墙：整片深色玻璃，细竖梃，每层一道窗间墙
      for (let fy = 0; fy < 4; fy++) for (let fx = 0; fx < 8; fx++) {
        const on = r() < 0.5
        if (lit) g.fillStyle = on ? (r() < 0.5 ? '#cfe6ff' : '#ffe2a8') : '#000'
        else { const v = 0.85 + r() * 0.3; g.fillStyle = `rgb(${46 * v},${74 * v},${92 * v})` }
        g.fillRect(fx * 32 + 1, fy * 64 + 9, 30, 55)
      }
      if (!lit) { g.fillStyle = '#b9c2c8'; for (let fy = 0; fy < 4; fy++) g.fillRect(0, fy * 64, S, 9) }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t
    }
    if (res) {
      // 住宅：每层一排窗，窗下挑出阳台（浅色栏板、深色缝）
      for (let fy = 0; fy < 4; fy++) for (let fx = 0; fx < 2; fx++) {
        const on = r() < 0.5, y = fy * 64
        if (lit) { g.fillStyle = on ? '#ffd28a' : '#000'; g.fillRect(fx * 128 + 14, y + 8, 100, 30); continue }
        g.fillStyle = '#4c5a66'; g.fillRect(fx * 128 + 14, y + 8, 100, 30)
        g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(fx * 128 + 14, y + 8, 100, 3)
        g.fillStyle = '#f4f2ec'; g.fillRect(fx * 128 + 6, y + 40, 116, 16)
        g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(fx * 128 + 6, y + 56, 116, 4)
        g.fillStyle = 'rgba(0,0,0,0.18)'; for (let k = 0; k < 6; k++) g.fillRect(fx * 128 + 10 + k * 20, y + 42, 2, 12)
      }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t
    }
    for (let fy = 0; fy < 4; fy++) for (let fx = 0; fx < 4; fx++) {
      const on = r() < 0.42
      if (lit) { g.fillStyle = on ? (r() < 0.3 ? '#bfe2ff' : '#ffd793') : '#000' } else { const v = 60 + r() * 30; g.fillStyle = `rgb(${v * 0.55},${v * 0.72},${v})` }
      g.fillRect(fx * 64 + 7, fy * 64 + 10, 50, 40)
      if (!lit) { g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(fx * 64 + 7, fy * 64 + 10, 50, 4); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(fx * 64 + 31, fy * 64 + 10, 2, 40) }
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t
  }
  return { map: mk(false), glow: mk(true) }
}
/** 一栋楼的四面墙（带按尺寸算的贴图坐标）和楼顶，加进几何体数组 */
function pushBuilding(walls: THREE.BufferGeometry[], roofs: THREE.BufferGeometry[], x: number, z: number, w: number, d: number, h: number, y0: number, tint: THREE.Color, seed: number) {
  const BAY = 1.1, FLOOR = 0.8, pos: number[] = [], uv: number[] = [], nor: number[] = [], col: number[] = []
  const ou = hash(seed) * 4, ov = Math.floor(hash(seed + 3) * 4)
  const face = (ax: number, az: number, bx: number, bz: number, nx: number, nz: number) => {
    const len = Math.hypot(bx - ax, bz - az), u1 = len / (BAY * 4), v1 = h / (FLOOR * 4)
    const q = [[ax, y0, az, 0, 0], [bx, y0, bz, u1, 0], [bx, y0 + h, bz, u1, v1], [ax, y0 + h, az, 0, v1]]
    for (const i of [0, 1, 2, 0, 2, 3]) { const p = q[i]; pos.push(p[0], p[1], p[2]); uv.push(p[3] + ou, p[4] + ov / 4); nor.push(nx, 0, nz); col.push(tint.r, tint.g, tint.b) }
  }
  const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2
  face(x0, z1, x1, z1, 0, 1); face(x1, z1, x1, z0, 1, 0); face(x1, z0, x0, z0, 0, -1); face(x0, z0, x0, z1, -1, 0)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  walls.push(g)
  // 楼顶：女儿墙压顶、楼顶的机房和水箱
  const roof = (bw: number, bh: number, bd: number, bx: number, by: number, bz: number, c: string) => {
    const b = new THREE.BoxGeometry(bw, bh, bd); b.translate(bx, by + bh / 2, bz); const cc = new THREE.Color(c), n = b.attributes.position.count, a = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) { a[i * 3] = cc.r; a[i * 3 + 1] = cc.g; a[i * 3 + 2] = cc.b }
    b.setAttribute('color', new THREE.BufferAttribute(a, 3)); roofs.push(b.toNonIndexed())
  }
  roof(w + 0.16, 0.22, d + 0.16, x, y0 + h, z, '#b8b6b0')
  roof(w - 0.1, 0.05, d - 0.1, x, y0 + h + 0.02, z, '#6c6f72')
  if (h > 5) roof(w * 0.34, 0.8, d * 0.3, x + w * 0.15, y0 + h, z - d * 0.12, '#9ea2a5')
  if (h > 3 && hash(seed + 7) > 0.5) roof(0.5, 0.6, 0.5, x - w * 0.25, y0 + h, z + d * 0.2, '#7c8a96')
}
function City({ night }: { night: number }) {
  const { walls, glass, homes, roofs, lamps } = useMemo(() => {
    const W: THREE.BufferGeometry[] = [], Gl: THREE.BufferGeometry[] = [], Hm: THREE.BufferGeometry[] = [], Rf: THREE.BufferGeometry[] = [], lamps: number[] = []
    const tints = ['#f2efe8', '#c9d3db', '#e8d9c2', '#b8c4cc', '#efe6da', '#d9cbb8', '#a9b3ba', '#e4e7ea'].map(c => new THREE.Color(c))
    const homeTints = ['#efe2cf', '#e7c9a9', '#d9b49a', '#f1ebe0', '#cdbfa8', '#e9d7bd'].map(c => new THREE.Color(c))
    let n = 0
    for (let x = -38; x <= -9; x += 5.2) for (let z = -22; z <= 21; z += 6.2) {
      n++
      const cbd = Math.exp(-(((x + 24) / 8) ** 2) - ((z / 16) ** 2)), k = hash(n)
      if (k < 0.08) continue                                                // 街心小公园
      const h = 2.0 + cbd * (8 + k * 10) + hash(n + 9) ** 2 * 5
      const w = 3.0 + hash(n + 1) * 1.1, d = 3.4 + hash(n + 2) * 1.2
      const bx = x + (hash(n + 4) - 0.5) * 0.6, bz = z + (hash(n + 5) - 0.5) * 0.6, y0 = ground(x, z) - 0.05
      if (h > 8) {
        // 高楼：玻璃幕墙，上部收进一段，脚下一圈裙房
        const g1 = new THREE.Color('#d8e6ee').lerp(new THREE.Color('#9fc4cf'), hash(n + 11))
        pushBuilding(Gl, Rf, bx, bz, w, d, h * 0.68, y0, g1, n)
        pushBuilding(Gl, Rf, bx, bz, w * 0.74, d * 0.74, h * 0.32, y0 + h * 0.68, g1, n + 50)
        pushBuilding(W, Rf, bx, bz, w + 1.2, d + 1.1, 1.6, y0, tints[(n + 2) % tints.length], n + 100)
      } else if (hash(n + 21) < 0.5) {
        // 住宅楼：窄长的板楼，带阳台
        pushBuilding(Hm, Rf, bx, bz, w * 0.82, d, h + 1.2, y0, homeTints[n % homeTints.length], n)
      } else pushBuilding(W, Rf, bx, bz, w, d, h, y0, tints[n % tints.length], n)
    }
    for (let x = -40.6; x <= -6; x += 5.2) for (let z = -24; z <= 24; z += 3.1) lamps.push(x, ground(x, z) + 0.9, z)
    for (let z = -24.8; z <= 24; z += 6.2) for (let x = -40; x <= -6; x += 2.6) lamps.push(x, ground(x, z) + 0.9, z)
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lamps, 3))
    return { walls: mergeGeometries(W), glass: mergeGeometries(Gl), homes: mergeGeometries(Hm), roofs: mergeGeometries(Rf), lamps: lg }
  }, [])
  const tex = useMemo(() => facadeTex(), []), gtex = useMemo(() => facadeTex(true), []), htex = useMemo(() => facadeTex(false, true), [])
  const glow = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!, q = g.createRadialGradient(32, 32, 0, 32, 32, 32)
    q.addColorStop(0, 'rgba(255,230,180,1)'); q.addColorStop(0.25, 'rgba(255,200,120,0.5)'); q.addColorStop(1, 'rgba(255,190,110,0)'); g.fillStyle = q; g.fillRect(0, 0, 64, 64)
    const t = new THREE.CanvasTexture(c); return t
  }, [])
  return <group>
    <mesh geometry={homes} castShadow receiveShadow><meshStandardMaterial vertexColors map={htex.map} emissiveMap={htex.glow} emissive="#ffffff" emissiveIntensity={night * 1.3} roughness={0.75} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={walls} castShadow receiveShadow><meshStandardMaterial vertexColors map={tex.map} emissiveMap={tex.glow} emissive="#ffffff" emissiveIntensity={night * 1.4} roughness={0.55} metalness={0.15} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={glass} castShadow receiveShadow><meshStandardMaterial vertexColors map={gtex.map} emissiveMap={gtex.glow} emissive="#ffffff" emissiveIntensity={night * 1.2} roughness={0.18} metalness={0.55} envMapIntensity={1.4} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={roofs} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={0.85} /></mesh>
    <points geometry={lamps} visible={night > 0.05}><pointsMaterial map={glow} size={1.6} sizeAttenuation transparent opacity={night} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></points>
  </group>
}

// ---------- 工厂和烟囱 ----------
/** 烟囱：下粗上细的钢筋混凝土筒，顶上红白相间的警示带、检修平台和航空障碍灯 */
function Chimney({ night }: { night: number }) {
  const body = useMemo(() => {
    const pts: THREE.Vector2[] = [new THREE.Vector2(0, 0), new THREE.Vector2(1.05, 0), new THREE.Vector2(0.62, CHIMNEY_H), new THREE.Vector2(0.5, CHIMNEY_H), new THREE.Vector2(0.48, CHIMNEY_H - 0.6)]
    return new THREE.LatheGeometry(pts, 40)
  }, [])
  const r = (y: number) => 1.05 - 0.43 * (y / CHIMNEY_H)
  return <group position={P.chimney}>
    <mesh geometry={body} castShadow receiveShadow><meshStandardMaterial color="#c9c5bc" roughness={0.9} /></mesh>
    {[CHIMNEY_H - 0.7, CHIMNEY_H - 2.1, CHIMNEY_H - 3.5].map(y => <mesh key={y} position-y={y - 0.35}><cylinderGeometry args={[r(y) + 0.012, r(y - 0.7) + 0.012, 0.7, 40, 1, true]} /><meshStandardMaterial color="#c8372d" roughness={0.6} /></mesh>)}
    <mesh position-y={CHIMNEY_H - 4.4}><cylinderGeometry args={[r(CHIMNEY_H - 4.4) + 0.32, r(CHIMNEY_H - 4.4) + 0.32, 0.08, 40]} /><Metal kind="steel" grain="brushed" /></mesh>
    <mesh position-y={CHIMNEY_H - 4.0}><torusGeometry args={[r(CHIMNEY_H - 4.4) + 0.32, 0.02, 6, 40]} /><Metal kind="steel" /></mesh>
    <mesh position={[0, CHIMNEY_H + 0.08, 0]}><sphereGeometry args={[0.09, 12, 8]} /><meshBasicMaterial color={night > 0.3 ? '#ff3b2f' : '#7a2420'} toneMapped={false} /></mesh>
  </group>
}
function Factory() {
  const geo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = []
    const add = (g: THREE.BufferGeometry, c: string, x: number, y: number, z: number, ry = 0) => {
      g.rotateY(ry); g.translate(x, y, z); const cc = new THREE.Color(c), n = g.attributes.position.count, a = new Float32Array(n * 3)
      for (let i = 0; i < n; i++) { a[i * 3] = cc.r; a[i * 3 + 1] = cc.g; a[i * 3 + 2] = cc.b }
      g.setAttribute('color', new THREE.BufferAttribute(a, 3)); parts.push(g.index ? g.toNonIndexed() : g)
    }
    const [cx, cy, cz] = P.chimney
    // 两座锯齿形屋顶的厂房
    for (const [ox, oz, L] of [[-0.5, 6, 10], [3.5, -11, 8]] as const) {
      add(new THREE.BoxGeometry(6, 2.6, L), '#c7c2b5', cx + ox, cy + 1.3, cz + oz)
      for (let k = 0; k < L / 2; k++) { const s = new THREE.Shape(); s.moveTo(-3, 0); s.lineTo(3, 0); s.lineTo(3, 1.1); s.closePath(); const e = new THREE.ExtrudeGeometry(s, { depth: 1.9, bevelEnabled: false }); add(e, k % 2 ? '#8e9aa3' : '#99a5ad', cx + ox, cy + 2.6, cz + oz - L / 2 + k * 2 + 0.05) }
    }
    // 储罐
    for (const [ox, oz] of [[6.5, 2], [6.5, 5.6]] as const) add(new THREE.CylinderGeometry(1.4, 1.4, 3.2, 28), '#e4e3df', cx + ox, cy + 1.6, cz + oz)
    // 烟道：从厂房接到烟囱底部
    add(new THREE.BoxGeometry(0.8, 0.8, 2.4), '#8c8b86', cx, cy + 1.4, cz + 1.8)
    return mergeGeometries(parts)
  }, [])
  return <mesh geometry={geo} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={0.7} metalness={0.1} /></mesh>
}

// ---------- 塑料大棚 ----------
export const HOUSE = { n: 5, r: 1.5, L: 11, gap: 3.6 }
function Greenhouses() {
  const ribs = useMemo(() => {
    const gs: THREE.BufferGeometry[] = []
    for (let i = 0; i < HOUSE.n; i++) for (let k = 0; k <= 10; k++) { const t = new THREE.TorusGeometry(HOUSE.r, 0.025, 5, 24, Math.PI); t.translate(P.house[0] + (i - (HOUSE.n - 1) / 2) * HOUSE.gap, P.house[1], P.house[2] - HOUSE.L / 2 + k * HOUSE.L / 10); gs.push(t) }
    return mergeGeometries(gs)
  }, [])
  return <group>
    {Array.from({ length: HOUSE.n }, (_, i) => {
      const x = P.house[0] + (i - (HOUSE.n - 1) / 2) * HOUSE.gap
      return <group key={i} position={[x, P.house[1], P.house[2]]}>
        {/* 棚膜：半圆的拱，两头封住 */}
        <mesh rotation-x={Math.PI / 2} rotation-y={Math.PI / 2} renderOrder={5}><cylinderGeometry args={[HOUSE.r, HOUSE.r, HOUSE.L, 32, 1, true, 0, Math.PI]} /><meshPhysicalMaterial color="#eef6f2" transparent opacity={0.38} roughness={0.25} clearcoat={0.6} side={THREE.DoubleSide} depthWrite={false} /></mesh>
        {[-1, 1].map(s => <mesh key={s} position-z={s * HOUSE.L / 2} renderOrder={5}><circleGeometry args={[HOUSE.r, 32, 0, Math.PI]} /><meshPhysicalMaterial color="#eef6f2" transparent opacity={0.3} roughness={0.3} side={THREE.DoubleSide} depthWrite={false} /></mesh>)}
        {/* 棚里一垄垄的菜 */}
        {[-0.8, 0, 0.8].map(dx => <mesh key={dx} position={[dx, 0.12, 0]}><boxGeometry args={[0.42, 0.22, HOUSE.L - 0.6]} /><meshStandardMaterial color="#4f8a3a" roughness={0.9} /></mesh>)}
      </group>
    })}
    <mesh geometry={ribs}><Metal kind="zinc" grain="brushed" /></mesh>
  </group>
}

// ---------- 气象观测站 ----------
function Station() {
  const [x, y, z] = P.station
  const fence = useMemo(() => {
    const gs: THREE.BufferGeometry[] = []
    for (let i = 0; i <= 24; i++) {
      const t = i / 24 * 4, s = Math.floor(t), f = t - s, c = [[-3, -3], [3, -3], [3, 3], [-3, 3], [-3, -3]]
      const px = c[s][0] + (c[s + 1 > 4 ? 4 : s + 1][0] - c[s][0]) * f, pz = c[s][1] + (c[Math.min(4, s + 1)][1] - c[s][1]) * f
      const b = new THREE.BoxGeometry(0.06, 0.7, 0.06); b.translate(px, 0.35, pz); gs.push(b)
    }
    for (const [ax, az, bx, bz] of [[-3, -3, 3, -3], [3, -3, 3, 3], [3, 3, -3, 3], [-3, 3, -3, -3]]) { const b = new THREE.BoxGeometry(Math.abs(bx - ax) + 0.06, 0.05, Math.abs(bz - az) + 0.06); b.translate((ax + bx) / 2, 0.62, (az + bz) / 2); gs.push(b) }
    return mergeGeometries(gs)
  }, [])
  return <group position={[x, y, z]}>
    <mesh position-y={0.02} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[6, 6]} /><meshStandardMaterial color="#6f9a4c" roughness={1} /></mesh>
    <mesh geometry={fence}><meshStandardMaterial color="#f2f2ee" roughness={0.6} /></mesh>
    {/* 百叶箱 */}
    <group position={[-1.2, 0, 0.6]}>
      {[[-0.22, -0.18], [0.22, -0.18], [-0.22, 0.18], [0.22, 0.18]].map(([a, b], i) => <mesh key={i} position={[a, 0.5, b]}><boxGeometry args={[0.05, 1, 0.05]} /><meshStandardMaterial color="#f4f4f0" /></mesh>)}
      <mesh position-y={1.25} castShadow><boxGeometry args={[0.6, 0.5, 0.5]} /><meshStandardMaterial color="#fbfbf8" roughness={0.5} /></mesh>
      <mesh position-y={1.53}><boxGeometry args={[0.7, 0.06, 0.6]} /><meshStandardMaterial color="#fbfbf8" roughness={0.5} /></mesh>
    </group>
    {/* 测风塔 */}
    <mesh position={[1.6, 2.2, -1.6]} castShadow><cylinderGeometry args={[0.05, 0.07, 4.4, 10]} /><Metal kind="steel" grain="brushed" /></mesh>
    <mesh position={[1.6, 4.45, -1.6]} rotation-z={Math.PI / 2}><boxGeometry args={[0.04, 0.9, 0.04]} /><Metal kind="aluminum" /></mesh>
    {/* 太阳辐射表：白色底座上一只玻璃罩 */}
    <mesh position={[0.6, 0.6, 1.4]}><cylinderGeometry args={[0.04, 0.04, 1.2, 8]} /><Metal kind="steel" /></mesh>
    <mesh position={[0.6, 1.25, 1.4]}><cylinderGeometry args={[0.18, 0.2, 0.08, 20]} /><meshStandardMaterial color="#f4f4f0" /></mesh>
    <mesh position={[0.6, 1.31, 1.4]}><sphereGeometry args={[0.08, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshPhysicalMaterial color="#ffffff" transparent opacity={0.4} roughness={0.05} /></mesh>
    {/* 站房 */}
    <mesh position={[0, 1.2, -5.6]} castShadow receiveShadow><boxGeometry args={[6, 2.4, 3]} /><meshStandardMaterial color="#e8e4da" roughness={0.8} /></mesh>
    <mesh position={[0, 2.5, -5.6]}><boxGeometry args={[6.4, 0.2, 3.4]} /><meshStandardMaterial color="#8d4a36" roughness={0.8} /></mesh>
    {[-1.8, 0, 1.8].map(dx => <mesh key={dx} position={[dx, 1.4, -4.09]}><planeGeometry args={[1, 0.8]} /><meshStandardMaterial color="#38505f" roughness={0.2} metalness={0.4} /></mesh>)}
  </group>
}

// ---------- 森林 ----------
function Forest() {
  const mesh = useMemo(() => {
    const spots: V3[] = []
    for (let i = 0; i < 2600; i++) {
      const x = 47 + hash(i) * 47, z = -ZH + 0.8 + hash(i + 5000) * (ZH * 2 - 1.6), h = ground(x, z)
      if (h > 3.4 && h < 17 && hash(i + 999) < 0.85) spots.push([x, h, z])
    }
    // 近郊和海边步道上也种一些
    for (let i = 0; i < 70; i++) { const z = -24 + i * 0.7; if (i % 2) spots.push([-42.2, ground(-42.2, z), z]) }
    // 城区街道两旁的行道树
    for (let x = -40.6; x <= -6; x += 5.2) for (let z = -23.5; z <= 23.5; z += 1.6) if (hash(x * 7 + z) > 0.25) for (const dx of [-0.42, 0.42]) spots.push([x + dx, ground(x, z), z])
    const paint = (g: THREE.BufferGeometry, c: string) => { const col = new THREE.Color(c), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g.toNonIndexed() }
    const trunk = new THREE.CylinderGeometry(0.07, 0.1, 0.6, 5); trunk.translate(0, 0.3, 0)
    const low = new THREE.ConeGeometry(0.55, 1.1, 7); low.translate(0, 1.0, 0)
    const top = new THREE.ConeGeometry(0.38, 0.9, 7); top.translate(0, 1.6, 0)
    const tree = mergeGeometries([paint(trunk, '#6a5440'), paint(low, '#ffffff'), paint(top, '#ffffff')])
    const m = new THREE.InstancedMesh(tree, new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true, vertexColors: true }), spots.length), mat = new THREE.Matrix4(), col = new THREE.Color(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), sc = new THREE.Vector3(), ps = new THREE.Vector3()
    spots.forEach(([x, y, z], i) => { const s = x < -5 && x > -43 ? 0.38 + hash(i + 77) * 0.12 : 0.8 + hash(i + 77) * 0.7; q.setFromAxisAngle(up, i * 1.7); mat.compose(ps.set(x, y - 0.1, z), q, sc.set(s, s * (0.9 + hash(i + 31) * 0.3), s)); m.setMatrixAt(i, mat); m.setColorAt(i, col.setHSL(0.27 + hash(i + 3) * 0.06, 0.4, 0.18 + hash(i + 8) * 0.08)) })
    m.castShadow = true; m.receiveShadow = true
    return m
  }, [])
  return <primitive object={mesh} />
}

// ---------- 风向袋 ----------
/** 机场、海边常见的风向袋：红白相间的锥形布筒套在转环上。to：风吹向的方位角（度，从北顺时针）；k：风力 0–1，没风时垂下来 */
export function Windsock({ to, k }: { to: number; k: number }) {
  const ring = useRef<THREE.Group>(null), sock = useRef<THREE.Group>(null)
  const yaw = useRef(0), lift = useRef(0)
  const segs = useMemo(() => Array.from({ length: 5 }, (_, i) => ({ r0: 0.42 - i * 0.055, r1: 0.42 - (i + 1) * 0.055, c: i % 2 ? '#f5f3ee' : '#e0422e' })), [])
  useFrame(({ clock }, d) => {
    // 风吹向 to：场景里北是 −z、东是 +x；布筒沿局部 +x 伸出
    const goal = -(to - 90) * Math.PI / 180
    let dy = goal - yaw.current; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); yaw.current += dy * Math.min(1, d * 1.6)
    lift.current += (k - lift.current) * Math.min(1, d * 1.2)
    if (ring.current) ring.current.rotation.y = yaw.current + Math.sin(clock.elapsedTime * 3.1) * 0.04 * lift.current
    if (sock.current) sock.current.rotation.z = -(1 - lift.current) * 1.35 + Math.sin(clock.elapsedTime * 5.3) * 0.03
  })
  const H = 5.2
  return <group position={P.sock}>
    <mesh position-y={0.15}><cylinderGeometry args={[0.32, 0.38, 0.3, 20]} /><meshStandardMaterial color="#9a978f" roughness={0.9} /></mesh>
    <mesh position-y={H / 2} castShadow><cylinderGeometry args={[0.07, 0.09, H, 14]} /><Metal kind="stainless" grain="brushed" /></mesh>
    <group ref={ring} position-y={H}>
      <mesh><cylinderGeometry args={[0.1, 0.1, 0.22, 14]} /><Metal kind="chrome" /></mesh>
      <group ref={sock}>
        <mesh rotation-z={Math.PI / 2} position-x={0.05}><torusGeometry args={[0.42, 0.025, 8, 24]} /><Metal kind="stainless" /></mesh>
        {segs.map((s, i) => <mesh key={i} position-x={0.05 + 0.45 * i + 0.225} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[s.r1, s.r0, 0.45, 24, 1, true]} /><meshStandardMaterial color={s.c} roughness={0.8} side={THREE.DoubleSide} /></mesh>)}
      </group>
    </group>
  </group>
}

// ---------- 天空、昼夜 ----------
const DAY_TOP = new THREE.Color('#3f7fc7'), DAY_HOR = new THREE.Color('#bcd6ea'), DUSK_HOR = new THREE.Color('#e9a06a'), NIGHT_TOP = new THREE.Color('#050a18'), NIGHT_HOR = new THREE.Color('#1a2440')
/** 某个时候的地平线颜色：雾和背景都用它，远处才和天空接得上 */
export function horizon(day: number) {
  const c = NIGHT_HOR.clone().lerp(DUSK_HOR, smooth(day / 0.5)).lerp(DAY_HOR, smooth((day - 0.45) / 0.5))
  return '#' + c.getHexString()
}
/** 交给舞台的光照：天空自己画，阳光、环境光、雾跟着昼夜变 */
export function skyFor(day: number, fog: [number, number] = [260, 1400]) {
  return { sky: false, backdrop: horizon(day), sun: 3.1 * smooth((day - 0.15) / 0.85), env: 0.32 + 0.66 * day, fog }
}
function Sky({ day }: { day: number }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uTop: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uNight: { value: 0 } },
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 uTop, uHor; uniform float uNight; varying vec3 vP;
      float h(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
      void main(){ float y = clamp(vP.y, 0.0, 1.0); vec3 c = mix(uHor, uTop, pow(y, 0.42));
        vec3 q = floor(vP * 260.0); float s = step(0.9965, h(q)) * smoothstep(0.05, 0.3, y) * uNight; c += vec3(s * 0.9);
        gl_FragColor = vec4(c, 1.0); }`,
  }), [])
  mat.uniforms.uTop.value.copy(NIGHT_TOP).lerp(DAY_TOP, smooth((day - 0.2) / 0.7))
  mat.uniforms.uHor.value.set(horizon(day))
  mat.uniforms.uNight.value = 1 - smooth(day / 0.4)
  return <mesh material={mat} renderOrder={-10} frustumCulled={false}><sphereGeometry args={[2400, 32, 16]} /></mesh>
}

export function World({ want = {} }: { want?: Want }) {
  const day = want.day ?? 1, night = 1 - smooth(day / 0.55)
  return (
    <group>
      <Sky day={day} />
      {/* 夜里的月光和天光：淡蓝、不投影 */}
      <directionalLight position={[-60, 120, 80]} intensity={0.9 * night} color="#9fb6ff" />
      <hemisphereLight args={['#5d6f99', '#20242c', 0.35 * night]} />
      <Terrain />
      <HeatOverlay heat={want.heat ?? []} />
      <Sea />
      <City night={night} />
      <group position-x={want.plant ?? 0}><Factory /><Chimney night={night} /></group>
      <Greenhouses />
      <Station />
      <Forest />
      <Windsock to={want.sock?.to ?? 60} k={want.sock?.k ?? 0.5} />
      {want.smoke && <Smoke key={want.plant ?? 0} from={[P.chimney[0] + (want.plant ?? 0), ground(P.chimney[0] + (want.plant ?? 0), P.chimney[2]) + CHIMNEY_H + 0.2, P.chimney[2]]} wind={want.smoke.wind} on={want.smoke.on} n={130} life={15} />}
    </group>
  )
}

/** 机位：看向哪、装进多宽多高、从哪个方向看 */
const spot = (t: V3, w: number, h: number, view: [number, number]) => ({ target: new THREE.Vector3(...t), span: [w, h] as [number, number], view })
export const SPOT = {
  column: spot([P.station[0] - 6, 40, P.station[2] - 4], 130, 92, [-0.18, 0.14]),
  station: spot([P.station[0], 13.5, P.station[2] - 1], 33, 24, [-0.12, 0.3]),
  house: spot([P.house[0] - 2, 10, P.house[2] + HOUSE.L / 2 + 1.5], 27, 18, [-0.15, 0.32]),
  houseIn: spot([P.house[0] - HOUSE.gap, P.house[1] + 0.9, P.house[2] + HOUSE.L / 2 - 0.3], 5.4, 3.2, [0.06, 0.1]),
  field: spot([25, 13.5, ZH - 2], 42, 23, [0, 0.3]),
  high: spot([-72, 30, 2], 48, 40, [-0.15, 0.95]),
  low: spot([-56, 7, 3], 36, 30, [-0.2, 0.8]),
  coast: spot([-52, 8, ZH], 52, 22, [0, 0.08]),
  valley: spot([71, 14, ZH], 50, 30, [0, 0.08]),
  city: spot([-23, 9, ZH], 66, 28, [0, 0.1]),
  wide: spot([-14, 12, ZH], 90, 32, [0, 0.12]),
  overview: spot([-6, 4, -2], 96, 34, [-1.15, 0.2]),
}
