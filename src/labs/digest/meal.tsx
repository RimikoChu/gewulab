// 第 7 课：展厅最左边，学生食堂的一张餐桌。桌上一只不锈钢分格餐盘、一盒牛奶，右边一座平衡膳食宝塔的桌面模型（五层）。
// 学生每放一类食物，它就落进餐盘的一格，宝塔上对应那一层亮起来。看包装时，牛奶盒转过来，把印着生产日期和保质期的那一面朝向镜头。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal } from '@/lab-kit'
import { FOODS, type FoodGroup } from './physics'
import { fbm, noise, type V3 } from './sdf'
import { ease } from './parts'

/** 桌面中心（桌面高 MEAL_AT[1]） */
export const MEAL_AT: V3 = [-34, 7.4, 1.6]
const TRAY: V3 = [-1.0, 0, 0.45]
/** 各类食物在餐盘里的位置（相对餐盘中心） */
const CELL: Record<FoodGroup, V3> = { grain: [-0.8, 0, 0.45], veg: [-1.05, 0, -0.55], meat: [0.05, 0, -0.55], fruit: [1.05, 0, -0.55], milk: [2.3, 0, 0.75] }
export const PAGODA_AT: V3 = [MEAL_AT[0] + 1.35, MEAL_AT[1], MEAL_AT[2] - 1.45]
/** 宝塔第 n 层（1–5）的中心高度和宽度 */
export const tier = (n: number) => ({ y: 0.12 + (n - 0.5) * 0.42, w: 1.9 - (n - 1) * 0.32 })
export const foodAt = (g: FoodGroup): V3 => [MEAL_AT[0] + TRAY[0] + CELL[g][0], MEAL_AT[1] + 0.25, MEAL_AT[2] + TRAY[2] + CELL[g][2]]

/** 第 7 课交给世界的：已经放上的食物、检查过没有、牛奶盒转过来多少（0–1） */
export interface MealWant { items: FoodGroup[]; checked: boolean; pack: number }

// ---------- 贴图 ----------
function woodTex() {
  const W = 512, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!, img = g.createImageData(W, H)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const ring = Math.sin(y * 0.9 + 6 * fbm(x * 0.003, y * 0.03, 0, 3)) * 0.5 + 0.5, f = 0.86 + 0.08 * ring + 0.06 * fbm(x * 0.01, y * 0.4, 2, 2)
    const k = (y * W + x) * 4; img.data[k] = 205 * f; img.data[k + 1] = 168 * f; img.data[k + 2] = 120 * f; img.data[k + 3] = 255
  }
  g.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 1); t.anisotropy = 8; return t
}
/** 牛奶盒的包装：正面一大块蓝白的“纯牛奶”，侧面印着生产日期、保质期、配料、营养成分表 */
function cartonTex() {
  const W = 1024, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!
  g.fillStyle = '#f7f8fb'; g.fillRect(0, 0, W, H)
  // 四个面：正面 0–320，侧面 320–512，背面 512–832，侧面 832–1024
  g.fillStyle = '#2f6fb7'; g.fillRect(0, 300, 320, 212); g.fillRect(512, 300, 320, 212)
  g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(160, 300, 200, 40, 0, Math.PI, 0); g.fill()
  g.fillStyle = '#1f4f8f'; g.font = '700 64px "PingFang SC", "Microsoft YaHei", sans-serif'; g.textAlign = 'center'; g.fillText('纯牛奶', 160, 200)
  g.font = '500 30px "PingFang SC", "Microsoft YaHei", sans-serif'; g.fillStyle = '#ffffff'; g.fillText('250 mL', 160, 420)
  // 侧面：生产日期、保质期、配料、营养成分表
  g.textAlign = 'left'; g.fillStyle = '#20252b'
  g.font = '600 26px "PingFang SC", "Microsoft YaHei", sans-serif'; g.fillText('生产日期', 334, 60); g.fillText('保质期', 334, 140)
  g.font = '400 22px "PingFang SC", "Microsoft YaHei", sans-serif'; g.fillText('见盒顶', 334, 96); g.fillText('常温密闭保存', 334, 176)
  g.fillText('配料：生牛乳', 334, 230)
  g.strokeStyle = '#20252b'; g.lineWidth = 2; g.strokeRect(334, 262, 164, 200)
  g.font = '600 20px "PingFang SC", "Microsoft YaHei", sans-serif'; g.fillText('营养成分表', 346, 292)
  g.font = '400 17px "PingFang SC", "Microsoft YaHei", sans-serif'; ['能量', '蛋白质', '脂肪', '碳水化合物', '钠'].forEach((k, i) => g.fillText(k, 346, 326 + i * 28))
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t
}

// ---------- 食物 ----------
function riceGeo() {
  const g = new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), p = g.attributes.position
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + 0.06 * noise(x * 6, y * 6, z * 6); p.setXYZ(i, x * 0.55 * k, y * 0.26 * k, z * 0.4 * k) }
  g.computeVertexNormals(); return g
}
/** 饭粒：撒在饭团表面的一粒粒米 */
function grains() {
  let sd = 11; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647
  return Array.from({ length: 420 }, () => { const a = rnd() * Math.PI * 2, b = rnd() * Math.PI * 0.48, n = new THREE.Vector3(Math.cos(a) * Math.sin(b), Math.cos(b), Math.sin(a) * Math.sin(b)); return { p: new THREE.Vector3(n.x * 0.55, n.y * 0.26, n.z * 0.4), r: new THREE.Euler(rnd() * 3, rnd() * 3, rnd() * 3) } })
}
/** 一片青菜叶：中间一条白色叶柄，绿色叶片往两边卷 */
function leafGeo() {
  const g = new THREE.PlaneGeometry(0.22, 0.5, 8, 12), p = g.attributes.position, col = new Float32Array(p.count * 3)
  const green = new THREE.Color('#3f7d2c'), dark = new THREE.Color('#2a5a1e'), stem = new THREE.Color('#e8f0d8')
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), w = 0.11 * Math.sin(Math.PI * (y / 0.5 + 0.5)) ** 0.6
    const nx = Math.max(-1, Math.min(1, x / 0.11)) * w
    p.setXYZ(i, nx, y, 0.12 * nx * nx / 0.01 * 0.1 + 0.02 * Math.sin(y * 20))
    const c = Math.abs(x) < 0.018 || y < -0.12 ? stem : green.clone().lerp(dark, 0.4 + 0.3 * noise(x * 30, y * 30, 0)); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g
}
function orangeGeo() {
  const g = new THREE.SphereGeometry(0.18, 48, 32), p = g.attributes.position
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + 0.008 * noise(x * 120, y * 120, z * 120); p.setXYZ(i, x * k, y * k * 0.93, z * k) }
  g.computeVertexNormals(); return g
}

function Food({ g, on }: { g: FoodGroup; on: boolean }) {
  const geo = useMemo(() => ({ rice: riceGeo(), leaf: leafGeo(), orange: orangeGeo(), grain: new THREE.CapsuleGeometry(0.012, 0.03, 2, 6) }), [])
  const gr = useMemo(grains, [])
  const ref = useRef<THREE.Group>(null), k = useRef(0)
  useFrame((_, dt) => {
    k.current += ((on ? 1 : 0) - k.current) * (1 - Math.exp(-Math.min(dt, 1 / 30) / 0.18))
    const e = k.current, o = ref.current; if (!o) return
    o.visible = e > 0.01; o.position.y = (1 - ease(e)) * 0.5; o.scale.setScalar(0.6 + 0.4 * ease(e))
  })
  const grainRef = useRef<THREE.InstancedMesh>(null)
  useMemo(() => setTimeout(() => { const m = grainRef.current; if (!m) return; const M = new THREE.Matrix4(), q = new THREE.Quaternion(); gr.forEach((x, i) => m.setMatrixAt(i, M.compose(x.p, q.setFromEuler(x.r), new THREE.Vector3(1, 1, 1)))); m.instanceMatrix.needsUpdate = true }, 0), [gr])
  return <group ref={ref}>
    {g === 'grain' && <group position={[0, 0.03, 0]}>
      <mesh geometry={geo.rice} castShadow><meshPhysicalMaterial color="#f6f3ec" roughness={0.45} sheen={0.6} sheenColor="#ffffff" clearcoat={0.3} /></mesh>
      <instancedMesh ref={grainRef} args={[geo.grain, undefined, gr.length]}><meshPhysicalMaterial color="#fbf9f3" roughness={0.35} clearcoat={0.5} /></instancedMesh>
    </group>}
    {g === 'veg' && <group position={[0, 0.04, 0]}>
      {Array.from({ length: 11 }, (_, i) => <mesh key={i} geometry={geo.leaf} position={[Math.cos(i * 2.4) * 0.18, 0.02 + (i % 4) * 0.025, Math.sin(i * 2.4) * 0.12]} rotation={[-Math.PI / 2 + 0.25 * Math.sin(i), 0.3 * Math.cos(i * 1.7), i * 2.4]} castShadow><meshPhysicalMaterial vertexColors roughness={0.35} clearcoat={0.8} clearcoatRoughness={0.2} side={THREE.DoubleSide} /></mesh>)}
    </group>}
    {g === 'meat' && <group position={[0, 0.03, 0]}>
      {/* 一块清蒸鱼和半个煮鸡蛋 */}
      <RoundedBox args={[0.55, 0.1, 0.32]} radius={0.04} smoothness={3} position={[-0.12, 0.05, 0.02]} rotation-y={0.2} castShadow><meshPhysicalMaterial color="#efe6d6" roughness={0.4} clearcoat={0.6} sheen={0.4} sheenColor="#ffffff" /></RoundedBox>
      <mesh position={[-0.12, 0.103, 0.02]} rotation-x={-Math.PI / 2} rotation-z={0.2}><planeGeometry args={[0.4, 0.06]} /><meshStandardMaterial color="#5a8a3a" roughness={0.5} /></mesh>
      <group position={[0.27, 0.02, 0.05]}>
        <mesh scale={[0.11, 0.075, 0.08]} castShadow><sphereGeometry args={[1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshPhysicalMaterial color="#fbfaf5" roughness={0.3} clearcoat={0.6} /></mesh>
        <mesh position={[0, 0.002, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[0.045, 24]} /><meshStandardMaterial color="#f2b62e" roughness={0.6} /></mesh>
      </group>
    </group>}
    {g === 'fruit' && <group position={[0, 0.17, 0]}>
      <mesh geometry={geo.orange} castShadow><meshPhysicalMaterial color="#f08a1c" roughness={0.4} clearcoat={0.5} clearcoatRoughness={0.4} /></mesh>
      <mesh position={[0, 0.165, 0]}><cylinderGeometry args={[0.012, 0.016, 0.03, 8]} /><meshStandardMaterial color="#5a6a2a" /></mesh>
    </group>}
  </group>
}

export function Canteen({ want }: { want?: MealWant }) {
  const w = want ?? { items: [], checked: false, pack: 0 }
  const tex = useMemo(() => ({ wood: woodTex(), carton: cartonTex() }), [])
  const has = (g: FoodGroup) => w.items.includes(g)
  // 分格餐盘：一块底板、一圈翻边、几道隔断
  const tray = useMemo(() => {
    const s = new THREE.Shape(), W = 1.75, D = 1.25, r = 0.18
    s.moveTo(-W + r, -D); s.lineTo(W - r, -D); s.quadraticCurveTo(W, -D, W, -D + r); s.lineTo(W, D - r); s.quadraticCurveTo(W, D, W - r, D); s.lineTo(-W + r, D); s.quadraticCurveTo(-W, D, -W, D - r); s.lineTo(-W, -D + r); s.quadraticCurveTo(-W, -D, -W + r, -D)
    const base = new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.012, bevelSegments: 2, curveSegments: 16 }); base.rotateX(-Math.PI / 2)
    const rimPts = s.getSpacedPoints(160).map(p => new THREE.Vector3(p.x, 0.09, -p.y)); rimPts.pop()
    const rim = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rimPts, true), 320, 0.028, 8, true)
    return { base, rim }
  }, [])
  // 牛奶盒六个面各取包装图的一段：+x 侧面（日期）、−x 侧面、顶、底、正面、背面
  const faces = useMemo(() => {
    const part = (u0: number, u1: number) => { const t = tex.carton.clone(); t.offset.set(u0, 0); t.repeat.set(u1 - u0, 1); t.needsUpdate = true; return t }
    return [part(0.3125, 0.5), part(0.8125, 1), null, null, part(0, 0.3125), part(0.5, 0.8125)]
  }, [tex])
  const pk = ease(w.pack)
  const lights = useRef<THREE.MeshPhysicalMaterial[]>([])
  useFrame(({ clock }) => {
    lights.current.forEach((m, i) => {
      const n = i + 1, on = n <= 4 && w.items.some(g => FOODS[g].layer === n)
      const tgt = on ? 0.55 + (w.checked ? 0.15 * Math.sin(clock.elapsedTime * 3 + i) : 0) : 0
      m.emissiveIntensity += (tgt - m.emissiveIntensity) * 0.1
    })
  })
  const TIER = ['#e3b964', '#6fae4c', '#c9654a', '#9cc7e0', '#d9cf9a']
  return <group>
    {/* 餐桌：浅色木纹桌面、不锈钢桌腿 */}
    <group position={[MEAL_AT[0], 0, MEAL_AT[2]]}>
      <RoundedBox args={[8.6, 0.3, 4.6]} radius={0.06} smoothness={3} position={[0, MEAL_AT[1] - 0.15, 0]} castShadow receiveShadow><meshPhysicalMaterial map={tex.wood} roughness={0.42} clearcoat={0.5} clearcoatRoughness={0.3} /></RoundedBox>
      {[-3.9, 3.9].flatMap(x => [-1.9, 1.9].map(z => <mesh key={`${x}${z}`} position={[x, (MEAL_AT[1] - 0.3) / 2, z]} castShadow><cylinderGeometry args={[0.1, 0.1, MEAL_AT[1] - 0.3, 20]} /><Metal kind="stainless" grain="brushed" /></mesh>))}
      {[-1.9, 1.9].map(z => <mesh key={z} position={[0, MEAL_AT[1] - 0.45, z]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.06, 0.06, 7.8, 14]} /><Metal kind="stainless" grain="brushed" /></mesh>)}
    </group>
    {/* 餐盘和食物 */}
    <group position={[MEAL_AT[0] + TRAY[0], MEAL_AT[1], MEAL_AT[2] + TRAY[2]]}>
      <mesh geometry={tray.base} castShadow receiveShadow><Metal kind="stainless" grain="brushed" rough={0.5} env={1.8} /></mesh>
      <mesh geometry={tray.rim} castShadow><Metal kind="stainless" grain="brushed" rough={0.4} env={1.8} /></mesh>
      {/* 隔断：上面一排三小格，下面一个大格放饭，右下一格空着 */}
      {[[0, 0.06, -0.05, 3.4, 0.05], [-0.52, 0.06, -0.62, 0.05, 1.1], [0.55, 0.06, -0.62, 0.05, 1.1], [0.2, 0.06, 0.55, 0.05, 1.3]].map(([x, y, z, wx, dz], i) => <RoundedBox key={i} args={[wx, 0.12, dz]} radius={0.02} smoothness={2} position={[x, y, z]} castShadow><Metal kind="stainless" grain="brushed" rough={0.45} env={1.8} /></RoundedBox>)}
      {(['grain', 'veg', 'meat', 'fruit'] as FoodGroup[]).map(g => <group key={g} position={CELL[g]}><Food g={g} on={has(g)} /></group>)}
    </group>
    {/* 牛奶盒：屋顶形的利乐包；看包装时转过来、立到前面 */}
    <group position={[MEAL_AT[0] + TRAY[0] + CELL.milk[0] - 0.2 * pk, MEAL_AT[1] + 0.5 * pk * (1 - pk) * 2, MEAL_AT[2] + TRAY[2] + CELL.milk[2] + 0.5 * pk]} rotation-y={-0.35 - pk * 1.07} scale={has('milk') ? 1 : 0.0001}>
      <mesh position={[0, 0.48, 0]} castShadow>
        <boxGeometry args={[0.64, 0.95, 0.4]} />
        {faces.map((t, i) => <meshPhysicalMaterial key={i} attach={`material-${i}`} map={t} color={t ? '#ffffff' : '#f4f6fa'} roughness={0.35} clearcoat={0.6} />)}
      </mesh>
      <mesh position={[0, 1.02, 0]} rotation-y={Math.PI / 2} castShadow><cylinderGeometry args={[0.001, 0.2, 0.14, 4, 1, false, Math.PI / 4]} /><meshPhysicalMaterial color="#f4f6fa" roughness={0.4} clearcoat={0.5} /></mesh>
      <mesh position={[0, 1.08, 0]}><boxGeometry args={[0.02, 0.06, 0.4]} /><meshPhysicalMaterial color="#f4f6fa" roughness={0.4} /></mesh>
    </group>
    {/* 平衡膳食宝塔：五层半透明的塔身，自下而上越来越窄 */}
    <group position={PAGODA_AT}>
      <RoundedBox args={[2.2, 0.12, 1.0]} radius={0.03} smoothness={2} position={[0, 0.06, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#2a2f35" roughness={0.4} clearcoat={0.5} /></RoundedBox>
      {[1, 2, 3, 4, 5].map(n => { const t = tier(n), t2 = tier(n + 1); return <group key={n} position={[0, t.y, 0]}>
        <mesh castShadow rotation-y={Math.PI / 4}><cylinderGeometry args={[t2.w / 2 * 1.08 * Math.SQRT2, t.w / 2 * Math.SQRT2, 0.38, 4, 1]} /><meshPhysicalMaterial ref={m => { if (m) lights.current[n - 1] = m }} color={TIER[n - 1]} roughness={0.25} clearcoat={0.8} transparent opacity={0.88} emissive={TIER[n - 1]} emissiveIntensity={0} flatShading /></mesh>
      </group> })}
    </group>
  </group>
}
