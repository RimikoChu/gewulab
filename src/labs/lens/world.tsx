// 光的折射和凸透镜成像实验室的大场景：一间光学暗室。一张带孔阵的光学平台，从左到右是水槽、光具座、眼球模型、望远镜；
// 每一处头顶有一盏射灯，背后是一道遮光帘。整个实验室只有这一个世界，换课时画布不重建，镜头沿着平台飞过去。画面里 1 cm 画成 CM 个单位。
import { useMemo } from 'react'
import * as THREE from 'three'
import { Painted, mergeParts, type Part } from '@/lab-kit'

export const TOP = 0.9, AXIS = TOP + 1.0, CM = 0.06      // 台面高度、主光轴的高度、1 cm 在画面里多长
/** 光具座导轨从透镜往两边各伸出多少厘米 */
export const RAIL = 40
export const ST = { tank: -9, bench: 0, eye: 8, scope: 14.5 }
// 机位稍微偏一点、俯一点：器材看得出前后和厚薄，光路所在的平面仍然基本正对镜头
const VIEW: [number, number] = [-0.2, 0.17]
const at = (x: number, w: number, h: number, up = 0) => ({ target: new THREE.Vector3(x, AXIS + up, 0), span: [w, h] as [number, number], view: VIEW })
export const SPOT = { tank: at(ST.tank, 3.6, 2.3, -0.1), bench: at(ST.bench, 5.3, 2.75, -0.08), eye: at(ST.eye, 3.6, 2.3, -0.1), scope: at(ST.scope, 4.5, 2.3, -0.1) }
/** 暗室里的舞台设置：不画天空，背景近黑，环境光调小，亮的东西带一圈泛光 */
export const DARK = { sky: false, backdrop: '#07090c', env: 0.22, sun: 0, fog: [30, 120] as [number, number], bloom: 0.75 }
const X0 = -13, X1 = 19, DEPTH = 2.6

/** 光学平台的台面：深色阳极氧化铝板，上面一格一格的螺纹孔 */
function makeBoard() {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!
  g.fillStyle = '#4a5158'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.03})`; g.fillRect(Math.random() * S, Math.random() * S, 1 + Math.random() * 2, 1) }   // 拉丝的细纹
  for (const x of [64, 192]) for (const y of [64, 192]) {
    const r = g.createRadialGradient(x, y, 2, x, y, 15); r.addColorStop(0, '#05070a'); r.addColorStop(0.62, '#0b0e11'); r.addColorStop(0.7, '#8a939b'); r.addColorStop(0.86, '#555d64'); r.addColorStop(1, 'rgba(74,81,88,0)')
    g.fillStyle = r; g.beginPath(); g.arc(x, y, 15, 0, Math.PI * 2); g.fill()
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8
  return t
}
/** 遮光帘：一道道竖着的褶 */
function makeCurtain() {
  const W = 512, c = document.createElement('canvas'); c.width = W; c.height = 8
  const g = c.getContext('2d')!
  for (let x = 0; x < W; x++) { const k = 0.5 + 0.5 * Math.sin(x / W * Math.PI * 2 * 9) * Math.sin(x / W * Math.PI * 2 * 2.3 + 1); const v = Math.round(10 + 22 * k); g.fillStyle = `rgb(${v},${v + 2},${v + 6})`; g.fillRect(x, 0, 1, 8) }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping
  return t
}
/** 导轨正面的标尺：0 到 80 cm，每厘米一道刻线，每 10 cm 一个数字。透镜立在 40 cm 处 */
function makeScale() {
  const W = 4096, H = 96, c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!, px = W / (RAIL * 2)
  g.fillStyle = '#f2efe4'; g.fillRect(0, 0, W, H); g.fillStyle = '#1c2024'; g.textAlign = 'center'; g.font = '600 44px sans-serif'
  for (let cm = 0; cm <= RAIL * 2; cm++) {
    const x = Math.min(W - 2, Math.max(2, cm * px)), h = cm % 10 === 0 ? 40 : cm % 5 === 0 ? 30 : 18
    g.fillRect(x - (cm % 10 === 0 ? 2.5 : 1.5), 0, cm % 10 === 0 ? 5 : 3, h)
    if (cm % 10 === 0 && cm > 0 && cm < RAIL * 2) g.fillText(String(cm), x, 88)
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}

/** 一盏从上方斜着打下来的射灯，照亮一处器材 */
function Lamp({ x }: { x: number }) {
  const aim = useMemo(() => { const o = new THREE.Object3D(); o.position.set(x, TOP, 0); o.updateMatrixWorld(); return o }, [x])
  return <>
    <primitive object={aim} />
    <spotLight position={[x - 0.6, 4.4, 2.6]} target={aim} angle={0.6} penumbra={1} intensity={150} distance={16} decay={1.6} color="#dfe6f5" castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0008} />
  </>
}

export function World() {
  const board = useMemo(() => { const t = makeBoard(); t.repeat.set((X1 - X0) / 0.5, DEPTH / 0.5); return t }, [])
  const curtain = useMemo(() => { const t = makeCurtain(); t.repeat.set(5, 1); return t }, [])
  const scale = useMemo(makeScale, [])
  const geo = useMemo(() => {
    const parts: Part[] = [], cx = (X0 + X1) / 2, len = X1 - X0
    // 平台的台体：台面下面一圈深色的蜂窝板侧边，再下面是四条粗腿
    parts.push({ p: [cx, TOP - 0.12, 0], s: [len, 0.22, DEPTH], c: '#15181b' }); parts.push({ p: [cx, TOP - 0.245, 0], s: [len + 0.04, 0.03, DEPTH + 0.04], c: '#3b4248' })
    for (let x = X0 + 1.2; x <= X1 - 1; x += 5.9) for (const z of [-DEPTH / 2 + 0.25, DEPTH / 2 - 0.25]) parts.push({ p: [x, (TOP - 0.26) / 2, z], s: [0.26, TOP - 0.26, 0.26], c: '#1b1f23' })
    // 光具座：一根黑色的铝轨，上面两道导棱，两端各一只底脚
    const rail = RAIL * 2 * CM + 0.24
    parts.push({ p: [ST.bench, TOP + 0.075, 0], s: [rail, 0.07, 0.17], c: '#23282d' })
    for (const z of [-0.06, 0.06]) parts.push({ p: [ST.bench, TOP + 0.118, z], s: [rail, 0.016, 0.022], c: '#3b4248' })
    for (const s of [-1, 1]) { parts.push({ p: [ST.bench + s * (rail / 2 - 0.09), TOP + 0.02, 0], s: [0.16, 0.04, 0.4], c: '#2b3136' }); parts.push({ p: [ST.bench + s * (rail / 2 - 0.09), TOP + 0.045, 0], s: [0.1, 0.03, 0.2], c: '#3b4248' }) }
    return mergeParts(parts)
  }, [])
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[3, 0, 0]} receiveShadow><planeGeometry args={[60, 24]} /><meshStandardMaterial color="#0d1013" roughness={0.9} /></mesh>
      <mesh geometry={geo} castShadow receiveShadow><Painted rough={0.6} metal={0.35} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[(X0 + X1) / 2, TOP + 0.001, 0]} receiveShadow><planeGeometry args={[X1 - X0, DEPTH]} /><meshStandardMaterial map={board} roughness={0.5} metalness={0.45} envMapIntensity={1.2} /></mesh>
      <mesh position={[ST.bench, TOP + 0.078, 0.0865]}><planeGeometry args={[RAIL * 2 * CM, 0.056]} /><meshStandardMaterial map={scale} color="#b9b6ac" roughness={0.85} /></mesh>
      {/* 背后的遮光帘，由一盏很暗的灯从下往上抹亮一点 */}
      <mesh position={[3, 2.6, -3.4]}><planeGeometry args={[44, 5.4]} /><meshStandardMaterial map={curtain} roughness={1} /></mesh>
      <pointLight position={[3, 0.5, -2.2]} intensity={9} distance={18} decay={1.2} color="#5a7fb8" />
      {Object.values(ST).map(x => <Lamp key={x} x={x} />)}
    </group>
  )
}
