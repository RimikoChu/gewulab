// 化验台上的器材：小型高压反应釜（加热炉、磁力搅拌、压力表、控制器）、钢瓶、NO₂ 平衡球、烧杯（热水和冰水）、电热板、注射器、手套。
// 尺寸按米，原点都在器材的底面正中。玻璃用薄壁实体，里面的气体、水各画一层。
import { useEffect, useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, bolts, disc, lathe, shell } from '@/lab-kit'
import { FONT, tagTex } from './mats'

/** 便宜的玻璃：薄、透明、反光（里面还要画东西，所以不用折射） */
export const Glass = ({ opacity = 0.18, color = '#e8f2f2' }: { opacity?: number; color?: string }) => <meshPhysicalMaterial color={color} transparent opacity={opacity} roughness={0.04} clearcoat={1} envMapIntensity={1.8} depthWrite={false} side={THREE.DoubleSide} />
/** 二氧化氮的红棕色：浓度和原来相比是 k 倍，厚度 d（m）；按吸光度换成不透明度 */
export const no2Opacity = (k: number, d: number) => 1 - Math.exp(-k * d / 0.04)
export const NO2_COL = '#5c1f06'

// ---------- 读数的表盘 ----------
/** 圆形压力表：0–max，单位 unit，读数 v。表面是画布贴图，指针单独一根 */
export function Gauge({ r = 0.045, max = 30, unit = 'MPa', v }: { r?: number; max?: number; unit?: string; v: number }) {
  const face = useMemo(() => {
    const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d')!
    g.fillStyle = '#f4f3ee'; g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, 7); g.fill()
    g.strokeStyle = '#1e1f21'; g.fillStyle = '#1e1f21'; g.textAlign = 'center'; g.textBaseline = 'middle'
    for (let i = 0; i <= 30; i++) { const a = -Math.PI * 1.25 + i / 30 * Math.PI * 1.5, big = i % 5 === 0; g.lineWidth = big ? 4 : 2; g.beginPath(); g.moveTo(S / 2 + Math.cos(a) * S * 0.44, S / 2 + Math.sin(a) * S * 0.44); g.lineTo(S / 2 + Math.cos(a) * S * (big ? 0.34 : 0.39), S / 2 + Math.sin(a) * S * (big ? 0.34 : 0.39)); g.stroke(); if (big) { g.font = `600 22px ${FONT}`; g.fillText(String(Math.round(i / 30 * max)), S / 2 + Math.cos(a) * S * 0.25, S / 2 + Math.sin(a) * S * 0.25) } }
    g.font = `600 20px ${FONT}`; g.fillText(unit, S / 2, S * 0.7)
    g.fillStyle = '#c0392b'; g.fillRect(S * 0.66, S * 0.06, 2, 2)
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
  }, [max, unit])
  const a = Math.PI * 1.25 - Math.min(1, Math.max(0, v / max)) * Math.PI * 1.5
  const ring = useMemo(() => lathe([[r * 0.9, -0.012], [r * 1.12, -0.012], [r * 1.14, 0.006], [r * 1.05, 0.012], [r * 1.02, 0.004]], { segs: 40 }), [r])
  return <group>
    <mesh geometry={ring} rotation-x={Math.PI / 2}><Metal kind="chrome" /></mesh>
    <mesh position-z={0.001}><circleGeometry args={[r * 1.02, 40]} /><meshStandardMaterial map={face} roughness={0.5} /></mesh>
    <mesh position-z={0.004} rotation-z={a - Math.PI / 2}><boxGeometry args={[r * 0.08, r * 1.6, 0.002]} /><meshStandardMaterial color="#1a1a1a" roughness={0.4} /></mesh>
    <mesh position-z={0.006}><cylinderGeometry args={[r * 0.12, r * 0.12, 0.004, 16]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
    <mesh position-z={0.009} renderOrder={4}><circleGeometry args={[r * 1.02, 40]} /><Glass opacity={0.12} /></mesh>
  </group>
}
/** 数码管式的小读数窗：深色底、亮字 */
export function Readout({ text, w = 0.08, h = 0.03, color = '#ff5b3a' }: { text: string; w?: number; h?: number; color?: string }) {
  const { tex, ctx } = useMemo(() => { const c = document.createElement('canvas'); c.width = 256; c.height = Math.round(256 * h / w); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return { tex: t, ctx: c.getContext('2d')! } }, [w, h])
  useEffect(() => { const W = 256, H = ctx.canvas.height; ctx.fillStyle = '#120807'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = color; ctx.font = `700 ${H * 0.72}px ui-monospace, Menlo, monospace`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(text, W - 10, H * 0.54); tex.needsUpdate = true }, [text, ctx, tex, color])
  return <mesh><planeGeometry args={[w, h]} /><meshBasicMaterial map={tex} toneMapped={false} /></mesh>
}

// ---------- 高压反应釜 ----------
/** 釜的各处高度（m，从台面算）：加热炉、釜体、釜盖和法兰 */
export const AC = { furnaceR: 0.11, furnaceH: 0.2, bodyR: 0.062, y0: 0.05, y1: 0.24, flangeR: 0.092 }
/**
 * 小型高压反应釜：一个圆筒形的加热炉（外壳蓝灰烤漆，顶上一圈隔热环），不锈钢釜体坐在炉膛里；
 * 厚法兰用八颗螺栓压紧釜盖；盖上是磁力搅拌器、压力表、进气阀和取样阀、热电偶。p 是压力（MPa），heat 0–1 炉子有多热
 */
export function Autoclave({ p, heat = 0 }: { p: number; heat?: number }) {
  const g = useMemo(() => ({
    furnace: lathe([[0, 0], [AC.furnaceR, 0], [AC.furnaceR + 0.004, 0.004], [AC.furnaceR + 0.004, AC.furnaceH - 0.004], [AC.furnaceR, AC.furnaceH], [AC.bodyR + 0.006, AC.furnaceH], [AC.bodyR + 0.006, AC.furnaceH - 0.02], [0, AC.furnaceH - 0.02]]),
    ringTop: disc(AC.furnaceR - 0.006, 0.012, { hole: AC.bodyR + 0.008 }),
    body: shell([[0, AC.y0], [AC.bodyR, AC.y0], [AC.bodyR, AC.y1 - 0.03]], 0.012),
    flange: disc(AC.flangeR, 0.026, { hole: AC.bodyR - 0.012, chamfer: 0.003 }),
    lid: disc(AC.flangeR, 0.032, { chamfer: 0.004 }),
    bolts: bolts(8, AC.flangeR - 0.014, 0.017, 0.014),
    studs: bolts(8, AC.flangeR - 0.014, 0.008, 0.07),
    motor: lathe([[0, 0], [0.024, 0], [0.026, 0.004], [0.026, 0.09], [0.022, 0.094], [0, 0.094]]),
    valve: lathe([[0, 0], [0.008, 0], [0.008, 0.03], [0.013, 0.03], [0.013, 0.05], [0.008, 0.05], [0.008, 0.06], [0, 0.06]], { segs: 24 }),
    knob: disc(0.016, 0.008, { chamfer: 0.002, segs: 24 }),
  }), [])
  const yF = AC.y1 - 0.03, yL = yF + 0.026
  return <group>
    {/* 加热炉 */}
    <mesh geometry={g.furnace} castShadow receiveShadow><meshPhysicalMaterial color="#3f5f78" roughness={0.38} metalness={0.2} clearcoat={0.6} clearcoatRoughness={0.25} /></mesh>
    <mesh geometry={g.ringTop} position-y={AC.furnaceH - 0.012} receiveShadow><meshStandardMaterial color="#d8d6cf" roughness={0.9} emissive="#ff5a1c" emissiveIntensity={heat * 0.12} /></mesh>
    <mesh position={[0, 0.06, AC.furnaceR + 0.005]}><planeGeometry args={[0.07, 0.035]} /><meshStandardMaterial map={tagTex('加热炉', '#3f5f78')} roughness={0.6} /></mesh>
    {/* 釜体、法兰、釜盖、螺栓 */}
    <mesh geometry={g.body} castShadow><Metal kind="stainless" grain="turned" /></mesh>
    <mesh geometry={g.flange} position-y={yF - 0.026} castShadow><Metal kind="stainless" grain="turned" /></mesh>
    <mesh geometry={g.lid} position-y={yF} castShadow><Metal kind="stainless" grain="turned" /></mesh>
    <mesh geometry={g.studs} position-y={yF - 0.03} castShadow><Metal kind="steel" grain="turned" /></mesh>
    <mesh geometry={g.bolts} position-y={yL + 0.006} castShadow><Metal kind="steel" grain="cast" /></mesh>
    {/* 磁力搅拌器 */}
    <mesh geometry={g.motor} position={[0, yL + 0.006, 0]} castShadow><meshPhysicalMaterial color="#2f3236" roughness={0.35} clearcoat={0.6} /></mesh>
    <mesh position={[0, yL + 0.003, 0]} castShadow><cylinderGeometry args={[0.03, 0.03, 0.008, 32]} /><Metal kind="stainless" grain="turned" /></mesh>
    {/* 压力表：一根短管上来，表盘朝前 */}
    <mesh position={[0.05, yL + 0.04, 0.02]} castShadow><cylinderGeometry args={[0.005, 0.005, 0.075, 12]} /><Metal kind="stainless" /></mesh>
    <group position={[0.05, yL + 0.1, 0.03]} rotation-x={-0.15}><Gauge r={0.036} max={30} v={p} /></group>
    {/* 进气阀、取样阀、热电偶 */}
    <group position={[-0.055, yL, 0.02]}><mesh geometry={g.valve} castShadow><Metal kind="stainless" grain="turned" /></mesh><mesh geometry={g.knob} position-y={0.06} castShadow><meshStandardMaterial color="#1f2124" roughness={0.5} /></mesh></group>
    <group position={[-0.03, yL, -0.045]}><mesh geometry={g.valve} castShadow><Metal kind="stainless" grain="turned" /></mesh><mesh geometry={g.knob} position-y={0.06} castShadow><meshStandardMaterial color="#b8322a" roughness={0.5} /></mesh></group>
    <mesh position={[0.035, yL + 0.04, -0.04]} castShadow><cylinderGeometry args={[0.003, 0.003, 0.08, 10]} /><Metal kind="stainless" /></mesh>
  </group>
}
/** 控制器：一台带三个读数窗和几个按键的小机箱 */
export function Controller({ temp, p, rpm }: { temp: string; p: string; rpm: string }) {
  return <group>
    <RoundedBox args={[0.24, 0.16, 0.2]} radius={0.008} position={[0, 0.08, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#e5e6e2" roughness={0.45} clearcoat={0.4} /></RoundedBox>
    <mesh position={[0, 0.08, 0.1005]}><planeGeometry args={[0.226, 0.146]} /><meshStandardMaterial color="#2b3035" roughness={0.5} /></mesh>
    {[[temp, 0.115, '#ff5b3a'], [p, 0.075, '#7dffb0'], [rpm, 0.035, '#ffd35b']].map(([t, y, c]) => <group key={String(y)} position={[0.03, y as number, 0.102]}><Readout text={t as string} w={0.12} h={0.03} color={c as string} /></group>)}
    {['温度 °C', '压力 MPa', '转速'].map((s, i) => <mesh key={s} position={[-0.075, 0.115 - i * 0.04, 0.102]}><planeGeometry args={[0.06, 0.018]} /><meshBasicMaterial map={tagTex(s, '#2b3035')} toneMapped={false} /></mesh>)}
  </group>
}
/** 钢瓶：瓶身、瓶肩、瓶阀和护帽、减压阀。color 瓶色（氢气淡绿、氮气黑），name 瓶上的字 */
export function Cylinder({ color, name, h = 1.35 }: { color: string; name: string; h?: number }) {
  const g = useMemo(() => ({ body: lathe([[0, 0], [0.1, 0], [0.11, 0.02], [0.11, h - 0.16], [0.08, h - 0.06], [0.03, h - 0.02], [0.03, h], [0, h]]) }), [h])
  return <group>
    <mesh geometry={g.body} castShadow receiveShadow><meshPhysicalMaterial color={color} roughness={0.42} clearcoat={0.5} metalness={0.2} /></mesh>
    <mesh position={[0, h + 0.04, 0]} castShadow><cylinderGeometry args={[0.018, 0.022, 0.08, 16]} /><Metal kind="brass" grain="turned" /></mesh>
    <mesh position={[0.05, h + 0.06, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.03, 0.03, 0.04, 20]} /><Metal kind="chrome" /></mesh>
    <group position={[0.05, h + 0.06, 0.022]}><Gauge r={0.02} max={25} v={12} /></group>
    <mesh position={[0, h * 0.55, 0.111]}><planeGeometry args={[0.12, 0.3]} /><meshStandardMaterial map={tagTex(name, color === '#1a1b1d' ? '#d9b23a' : '#c0392b')} roughness={0.6} /></mesh>
  </group>
}

// ---------- NO₂ 平衡球、烧杯、电热板 ----------
/** 烧瓶的玻璃：只在轮廓处亮（菲涅耳），正对镜头的地方几乎透明，瓶里的气体颜色不被冲淡；再加一点固定方向的高光 */
const rimGlass = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, side: THREE.FrontSide,
  vertexShader: 'varying vec3 vN; varying vec3 vV; void main() { vec4 p = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-p.xyz); gl_Position = projectionMatrix * p; }',
  fragmentShader: 'varying vec3 vN; varying vec3 vV; void main() { vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n; float f = pow(1.0 - abs(dot(n, vV)), 2.2); float spec = pow(max(dot(reflect(-vV, n), normalize(vec3(-0.4, 0.6, 0.7))), 0.0), 60.0); gl_FragColor = vec4(vec3(0.93, 0.98, 1.0), clamp(f * 0.6 + spec * 0.9, 0.0, 0.95)); }',
})
/** 两个密封的圆底烧瓶（球半径 FL.R），瓶口塞着橡胶塞，一根弯玻璃管从两个塞子上面连通。原点在两瓶底部连线的中点；kL、kR 是两瓶 NO₂ 浓度和原来的比值 */
export const FL = { R: 0.042, rn: 0.011, neck: 0.05, gap: 0.26 }
export const FL_TOP = 2 * FL.R + FL.neck + 0.014 + 0.07   // 连通管最高处（铁架台夹在这里）
export function Flasks({ kL, kR }: { kL: number; kR: number }) {
  const { R, rn, neck, gap } = FL
  const g = useMemo(() => {
    const tn = Math.acos(rn / R), yNeck = R + R * Math.sin(tn), top = yNeck + neck
    const outer: [number, number][] = []
    for (let i = 0; i <= 24; i++) { const t = -Math.PI / 2 + (tn + Math.PI / 2) * i / 24; outer.push([Math.max(0, R * Math.cos(t)), R + R * Math.sin(t)]) }
    outer[0] = [0, 0]
    outer.push([rn, top - 0.004], [rn + 0.0025, top - 0.002], [rn + 0.0025, top])
    const glass = shell(outer, 0.0016, { segs: 48 })
    const gasNeck = new THREE.CylinderGeometry(rn - 0.0018, rn - 0.0018, neck - 0.008, 24); gasNeck.translate(0, yNeck + (neck - 0.008) / 2 - 0.004, 0)
    const stopper = lathe([[0, 0], [rn - 0.0012, 0], [rn + 0.003, 0.016], [rn + 0.0035, 0.02], [0, 0.02]], { segs: 32 })
    const ys = top - 0.006, yt = ys + 0.02
    const c = new THREE.CatmullRomCurve3([new THREE.Vector3(-gap / 2, ys, 0), new THREE.Vector3(-gap / 2, yt + 0.04, 0), new THREE.Vector3(-gap / 2 + 0.035, yt + 0.07, 0), new THREE.Vector3(gap / 2 - 0.035, yt + 0.07, 0), new THREE.Vector3(gap / 2, yt + 0.04, 0), new THREE.Vector3(gap / 2, ys, 0)])
    return { glass, gasNeck, stopper, ys, tubeG: new THREE.TubeGeometry(c, 80, 0.0042, 12), tubeGas: new THREE.TubeGeometry(c, 80, 0.0028, 10) }
  }, [R, rn, neck, gap])
  return <group>
    {[[-gap / 2, kL], [gap / 2, kR]].map(([x, k]) => <group key={x} position-x={x}>
      {/* 瓶里的气体先画，玻璃后画：玻璃的反光盖在气体上面，看得出是一只玻璃瓶 */}
      <mesh position-y={R} renderOrder={9}><sphereGeometry args={[R - 0.0018, 40, 28]} /><meshBasicMaterial color={NO2_COL} transparent opacity={no2Opacity(k, R * 1.4)} depthWrite={false} /></mesh>
      <mesh geometry={g.gasNeck} renderOrder={9}><meshBasicMaterial color={NO2_COL} transparent opacity={no2Opacity(k, 0.02)} depthWrite={false} /></mesh>
      <mesh geometry={g.glass} renderOrder={10} castShadow material={rimGlass} />
      <mesh geometry={g.stopper} position-y={g.ys} castShadow><meshStandardMaterial color="#c2412a" roughness={0.75} /></mesh>
    </group>)}
    <mesh geometry={g.tubeGas} renderOrder={9}><meshBasicMaterial color={NO2_COL} transparent opacity={no2Opacity((kL + kR) / 2, 0.006)} depthWrite={false} /></mesh>
    <mesh geometry={g.tubeG} renderOrder={10}><meshPhysicalMaterial color="#f2fbfb" transparent opacity={0.3} roughness={0.02} clearcoat={1} envMapIntensity={2.6} depthWrite={false} /></mesh>
    {/* 铁架台的夹子：两片衬软木的夹爪夹住连通管正中 */}
    {[-1, 1].map(s => <mesh key={s} position={[0, FL_TOP - 0.002, s * 0.0075]} castShadow><boxGeometry args={[0.03, 0.014, 0.006]} /><meshStandardMaterial color="#8a6a48" roughness={0.8} /></mesh>)}
  </group>
}
/** 烧杯（薄壁、带倒口）：r 半径、h 高、水深 water（m）；water 颜色；ice 放几块冰 */
export function Beaker({ r = 0.065, h = 0.15, water = 0.1, tint = '#bcd9e6', ice = 0, steam = false }: { r?: number; h?: number; water?: number; tint?: string; ice?: number; steam?: boolean }) {
  const g = useMemo(() => ({ glass: shell([[0, 0], [r, 0], [r, h], [r + 0.004, h + 0.004]], 0.0025) }), [r, h])
  const cubes = useMemo(() => Array.from({ length: ice }, (_, i) => { const a = i * 2.4; return [Math.cos(a) * r * 0.55, water - 0.012 - (i % 2) * 0.012, Math.sin(a) * r * 0.55, a] as const }), [ice, r, water])
  void steam
  return <group>
    <mesh geometry={g.glass} renderOrder={6} castShadow><Glass opacity={0.1} /></mesh>
    <mesh position-y={water / 2 + 0.002} renderOrder={4}><cylinderGeometry args={[r - 0.003, r - 0.003, water, 40]} /><meshPhysicalMaterial color={tint} transparent opacity={0.35} roughness={0.05} transmission={0} depthWrite={false} /></mesh>
    <mesh position-y={water + 0.002} rotation-x={-Math.PI / 2} renderOrder={5}><circleGeometry args={[r - 0.003, 40]} /><meshPhysicalMaterial color={tint} transparent opacity={0.3} roughness={0.02} clearcoat={1} depthWrite={false} /></mesh>
    {cubes.map(([x, y, z, a], i) => <RoundedBox key={i} args={[0.022, 0.02, 0.022]} radius={0.004} position={[x, y, z]} rotation={[a, a * 0.7, 0]}><meshPhysicalMaterial color="#eef6fb" transparent opacity={0.7} roughness={0.15} clearcoat={1} /></RoundedBox>)}
    {/* 刻度 */}
    {[0.25, 0.5, 0.75].map(k => <mesh key={k} position={[0, h * k, r + 0.0005]}><planeGeometry args={[0.02, 0.0015]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.7} /></mesh>)}
  </group>
}
/** 电热板：一块方形的铸铝加热面、白色机身、一个旋钮和指示灯 */
export function HotPlate({ on }: { on: boolean }) {
  return <group>
    <RoundedBox args={[0.2, 0.06, 0.22]} radius={0.008} position-y={0.03} castShadow receiveShadow><meshPhysicalMaterial color="#e9e9e5" roughness={0.45} clearcoat={0.4} /></RoundedBox>
    <mesh position-y={0.062}><boxGeometry args={[0.17, 0.006, 0.17]} /><Metal kind="aluminum" grain="cast" rough={0.45} /></mesh>
    <mesh position={[0.05, 0.03, 0.111]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.013, 0.013, 0.012, 24]} /><meshStandardMaterial color="#2a2c2f" /></mesh>
    <mesh position={[-0.05, 0.03, 0.111]}><circleGeometry args={[0.005, 16]} /><meshBasicMaterial color={on ? '#ff4a2a' : '#4a2a26'} toneMapped={false} /></mesh>
  </group>
}

// ---------- 注射器 ----------
/** 100 mL 的注射器：横着放，针筒长 len，活塞推进到 pos（0 是拉满，1 是到头）。管口用橡胶帽封住；里面是 NO₂，浓度比 k */
export const SYR = { len: 0.2, r: 0.018 }
export function Syringe({ fill, k }: { fill: number; k: number }) {
  const { len, r } = SYR
  const g = useMemo(() => ({
    barrel: shell([[r * 0.35, -0.012], [r * 0.35, 0], [r, 0.004], [r, len]], 0.0018),
    flangeB: disc(r * 2.0, 0.004, { hole: r * 0.9 }),
    tip: lathe([[0, -0.03], [r * 0.3, -0.03], [r * 0.32, -0.012], [r * 0.4, -0.004], [0, -0.004]]),
  }), [len, r])
  const L = len * fill   // 气柱的长度（从管口量起）
  return <group rotation-z={-Math.PI / 2}>
    {/* 针筒：玻璃、刻度、末端的翻边 */}
    <mesh geometry={g.barrel} renderOrder={6}><Glass opacity={0.2} /></mesh>
    <mesh geometry={g.flangeB} position-y={len}><Glass opacity={0.4} /></mesh>
    {Array.from({ length: 11 }, (_, i) => <mesh key={i} position={[0, 0.01 + i * (len - 0.02) / 10, r + 0.0003]}><planeGeometry args={[i % 5 === 0 ? 0.014 : 0.008, 0.0012]} /><meshBasicMaterial color="#1e2a30" transparent opacity={0.8} /></mesh>)}
    <mesh geometry={g.tip}><meshStandardMaterial color="#b8322a" roughness={0.7} /></mesh>
    {/* 管里的气体 */}
    <mesh position-y={L / 2 + 0.002} renderOrder={7}><cylinderGeometry args={[r - 0.002, r - 0.002, Math.max(0.001, L - 0.004), 32]} /><meshBasicMaterial color={NO2_COL} transparent opacity={no2Opacity(k, r * 3)} depthWrite={false} /></mesh>
    {/* 活塞：黑色的橡胶头、白色的推杆、末端的推板 */}
    <mesh position-y={L + 0.006}><cylinderGeometry args={[r - 0.0018, r - 0.0018, 0.012, 32]} /><meshStandardMaterial color="#1f2124" roughness={0.6} /></mesh>
    <mesh position-y={L + 0.012 + (len + 0.03 - L) / 2}><boxGeometry args={[r * 0.9, len + 0.03 - L, 0.003]} /><meshStandardMaterial color="#e8e8e3" roughness={0.5} /></mesh>
    <mesh position-y={L + 0.012 + (len + 0.03 - L) / 2}><boxGeometry args={[0.003, len + 0.03 - L, r * 0.9]} /><meshStandardMaterial color="#e8e8e3" roughness={0.5} /></mesh>
    <mesh position-y={len + 0.045}><cylinderGeometry args={[r * 1.2, r * 1.2, 0.005, 32]} /><meshStandardMaterial color="#e8e8e3" roughness={0.5} /></mesh>
  </group>
}

// ---------- 手套 ----------
/** 一只戴着白色乳胶手套的手（从袖子里伸出来），掌心朝 -x，伸直的手指沿 -x：推注射器的活塞用 */
export function Glove() {
  const latex = <meshPhysicalMaterial color="#eef0ee" roughness={0.45} clearcoat={0.3} />
  return <group>
    <RoundedBox args={[0.03, 0.085, 0.075]} radius={0.014} smoothness={3} position={[0.02, 0, 0]} castShadow>{latex}</RoundedBox>
    {[-0.027, -0.009, 0.009, 0.027].map((z, i) => <mesh key={z} position={[-0.012, 0.03 - Math.abs(i - 1.5) * 0.004, z]} rotation-z={0.25} castShadow><capsuleGeometry args={[0.0085, 0.035 - Math.abs(i - 1.5) * 0.004, 6, 12]} />{latex}</mesh>)}
    <mesh position={[0.005, -0.03, 0.035]} rotation={[0.6, 0, 0.9]} castShadow><capsuleGeometry args={[0.01, 0.03, 6, 12]} />{latex}</mesh>
    {/* 袖口和实验服的袖子 */}
    <mesh position={[0.07, 0, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.038, 0.034, 0.05, 28]} />{latex}</mesh>
    <mesh position={[0.2, 0, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.05, 0.044, 0.22, 28]} /><meshStandardMaterial color="#f2f2ee" roughness={0.9} /></mesh>
    <mesh position={[0.1, 0, 0]} rotation-z={Math.PI / 2}><torusGeometry args={[0.046, 0.005, 8, 28]} /><meshStandardMaterial color="#dcdcd6" roughness={0.9} /></mesh>
  </group>
}
/** 铁架台：方底座、立杆、一个十字夹和一只烧瓶夹（夹在 clampY 高处，夹口朝 +x 伸出 reach） */
export function Stand({ h = 0.5, clampY, reach = 0.14, front = false }: { h?: number; clampY: number; reach?: number; front?: boolean }) {
  return <group>
    <RoundedBox args={[0.16, 0.012, 0.22]} radius={0.004} position={[0, 0.006, 0]} castShadow receiveShadow><meshStandardMaterial color="#26282b" roughness={0.6} metalness={0.4} /></RoundedBox>
    <mesh position={[0, h / 2, -0.06]} castShadow><cylinderGeometry args={[0.006, 0.006, h, 16]} /><Metal kind="chrome" /></mesh>
    <mesh position={[0, clampY, -0.06]} castShadow><boxGeometry args={[0.026, 0.026, 0.026]} /><meshStandardMaterial color="#3a3d40" roughness={0.5} metalness={0.5} /></mesh>
    {front ? <mesh position={[0, clampY, -0.06 + reach / 2]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.004, 0.004, reach, 12]} /><Metal kind="chrome" /></mesh>
      : <mesh position={[reach / 2, clampY, -0.06]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.004, 0.004, reach, 12]} /><Metal kind="chrome" /></mesh>}
  </group>
}
