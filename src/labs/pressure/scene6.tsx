// 压强 · 第 6 课的三维场景：一张桌子上的托里拆利实验。桌子在坝顶；换地点时镜头飞到远处的雪山顶，那里有同样一套器材。
import { useMemo, useRef } from 'react'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { SPOTS, TUBE, type SpotKey } from './physics'
import { CREST, PEAK } from './hydro'
import { LabStage, Metal, Painted, lathe, mergeParts, shell, type Label, type Part } from '@/lab-kit'

const AT: Record<SpotKey, [number, number, number]> = { crest: [CREST.x, CREST.y, -4], peak: [PEAK.x, PEAK.y, PEAK.z] }
const TOP = 0.8, HGY = TOP + 0.06                        // 桌面高度、槽里水银面的高度
const TARGETS: Record<SpotKey, THREE.Vector3> = { crest: new THREE.Vector3(AT.crest[0] + 0.12, AT.crest[1] + 1.38, AT.crest[2]), peak: new THREE.Vector3(AT.peak[0] + 0.12, AT.peak[1] + 1.38, AT.peak[2]) }
const SPAN: [number, number] = [1.9, 1.56]
const VIEW: [number, number] = [0.22, 0.1]
const FOG: Record<SpotKey, [number, number]> = { crest: [70, 420], peak: [400, 3200] }

/** 刻度尺：从水银面往上 1 m，每 10 mm 一小格，每 100 mm 一个数 */
function makeScale() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 2000
  const g = c.getContext('2d')!
  g.fillStyle = '#f6f4ec'; g.fillRect(0, 0, 128, 2000)
  g.fillStyle = '#1d2327'; g.font = '700 34px ui-monospace, Menlo, monospace'; g.textBaseline = 'middle'
  for (let mm = 0; mm <= 1000; mm += 10) { const y = 2000 - mm * 2; g.fillRect(0, y - (mm % 100 ? 1 : 2), mm % 100 ? (mm % 50 ? 26 : 44) : 64, mm % 100 ? 2 : 4); if (mm % 100 === 0 && mm > 0 && mm < 1000) g.fillText(String(mm), 68, y) }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}

interface SceneProps { spot: SpotKey; tilt: number; thick: boolean; h: number; len: number; onTilt: (deg: number) => void; dragHint?: boolean }

/** 一套器材：桌子、水银槽、铁架台、刻度尺、玻璃管。两个地点各摆一套，只有当前地点的那套能操作 */
function Bench({ at, live, tilt, thick, h, len, onTilt, snow }: { at: [number, number, number]; live: boolean; tilt: number; thick: boolean; h: number; len: number; onTilt: (deg: number) => void; snow?: boolean }) {
  const scale = useMemo(makeScale, [])
  const controls = useThree(s => s.controls) as { enabled: boolean } | null
  const drag = useRef<{ x: number; t: number } | null>(null)
  const furniture = useMemo(() => {
    const P: Part[] = []
    for (const [x, z] of [[-0.72, -0.32], [0.72, -0.32], [-0.72, 0.32], [0.72, 0.32]]) P.push({ p: [x, TOP / 2 - 0.02, z], s: [0.05, TOP - 0.04, 0.05], c: '#4a5058' })
    P.push({ p: [0, 0.3, 0], s: [1.44, 0.03, 0.64], c: '#4a5058' })
    // 桌子：台面下一圈裙板、两道横撑、四只脚垫
    P.push({ p: [0, TOP - 0.1, 0.34], s: [1.46, 0.1, 0.02], c: '#3d4349' }, { p: [0, TOP - 0.1, -0.34], s: [1.46, 0.1, 0.02], c: '#3d4349' }, { p: [0.73, TOP - 0.1, 0], s: [0.02, 0.1, 0.66], c: '#3d4349' }, { p: [-0.73, TOP - 0.1, 0], s: [0.02, 0.1, 0.66], c: '#3d4349' })
    for (const [x, z] of [[-0.72, -0.32], [0.72, -0.32], [-0.72, 0.32], [0.72, 0.32]]) P.push({ p: [x, 0.012, z], s: [0.08, 0.024, 0.08], c: '#1c1f22' })
    // 台面上的东西：一本记录本、一支笔、一只装水银的小瓶
    P.push({ p: [0.5, TOP + 0.008, 0.16], s: [0.26, 0.016, 0.2], c: '#2f4a5c', r: [0, 0.3, 0] }, { p: [0.5, TOP + 0.018, 0.16], s: [0.24, 0.004, 0.18], c: '#f1efe6', r: [0, 0.3, 0] }, { p: [0.36, TOP + 0.03, 0.24], s: [0.006, 0.15, 0.006], c: '#c0392b', cyl: true, r: [Math.PI / 2, 0, 0.5] })
    // 百叶箱：气象观测用的白色小木箱
    P.push({ p: [1.9, 1.35, -0.9], s: [0.6, 0.6, 0.5], c: '#f1efe8' }, { p: [1.9, 1.69, -0.9], s: [0.74, 0.08, 0.64], c: '#e1ded4' })
    for (let k = 0; k < 5; k++) P.push({ p: [1.9, 1.14 + k * 0.1, -0.645], s: [0.56, 0.03, 0.02], c: '#d3d0c6' })
    for (const [x, z] of [[1.66, -1.1], [2.14, -1.1], [1.66, -0.7], [2.14, -0.7]]) P.push({ p: [x, 0.52, z], s: [0.04, 1.05, 0.04], c: '#f1efe8' })
    return mergeParts(P)
  }, [])
  const r = thick ? 0.024 : 0.012, a = tilt * Math.PI / 180
  const kit = useMemo(() => ({
    base: (() => { const sh = new THREE.Shape(); sh.moveTo(-0.15, -0.09); sh.lineTo(0.15, -0.09); sh.lineTo(0.15, 0.09); sh.lineTo(-0.15, 0.09); sh.lineTo(-0.15, -0.09); const g = new THREE.ExtrudeGeometry(sh, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.005, bevelSegments: 2 }); g.rotateX(-Math.PI / 2); return g })(),
    collar: lathe([[0.008, 0], [0.022, 0], [0.024, 0.003], [0.024, 0.027], [0.022, 0.03], [0.008, 0.03]], { segs: 20, closed: true }),
    knob: lathe([[0, 0], [0.006, 0], [0.006, 0.014], [0.014, 0.014], [0.016, 0.016], [0.016, 0.028], [0.014, 0.03], [0, 0.03]], { segs: 16 }),
    trough: shell([[0, 0], [0.19, 0], [0.2, 0.008], [0.2, 0.09], [0.208, 0.098]], 0.008, { segs: 4 }),
    vial: shell([[0, 0], [0.028, 0], [0.03, 0.004], [0.03, 0.06], [0.018, 0.075], [0.016, 0.09]], 0.003, { segs: 24 }),
  }), [])
  const hg = <meshStandardMaterial color="#c9d0d6" metalness={1} roughness={0.12} envMapIntensity={1.6} />
  const glass = <meshPhysicalMaterial color="#e8f6fb" transparent opacity={0.22} roughness={0.04} envMapIntensity={1.5} side={THREE.DoubleSide} depthWrite={false} />
  const hand = live ? {
    onPointerDown: (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); (e.target as Element).setPointerCapture(e.pointerId); drag.current = { x: e.nativeEvent.clientX, t: tilt }; if (controls) controls.enabled = false },
    onPointerMove: (e: ThreeEvent<PointerEvent>) => { if (drag.current) onTilt(Math.round(Math.min(45, Math.max(0, drag.current.t + (e.nativeEvent.clientX - drag.current.x) * 0.22)))) },
    onPointerUp: (e: ThreeEvent<PointerEvent>) => { drag.current = null; (e.target as Element).releasePointerCapture?.(e.pointerId); if (controls) controls.enabled = true },
    onPointerOver: () => { document.body.style.cursor = 'ew-resize' }, onPointerOut: () => { document.body.style.cursor = '' },
  } : {}
  return (
    <group position={at}>
      <RoundedBox args={[1.6, 0.05, 0.8]} radius={0.015} position={[0, TOP - 0.025, 0]} castShadow receiveShadow><meshPhysicalMaterial color={snow ? '#b9c2c8' : '#8a6a45'} roughness={0.55} clearcoat={0.3} clearcoatRoughness={0.4} /></RoundedBox>
      <mesh geometry={furniture} castShadow receiveShadow><Painted rough={0.6} metal={0.3} /></mesh>
      {/* 铁架台：带倒角的铸铁底座、镀铬立杆、十字夹和夹住玻璃管的铁夹 */}
      <mesh geometry={kit.base} position={[-0.3, TOP, -0.16]} castShadow><Metal kind="iron" grain="cast" /></mesh>
      <mesh position={[-0.3, TOP + 0.62, -0.2]} castShadow><cylinderGeometry args={[0.007, 0.007, 1.2, 14]} /><Metal kind="chrome" rough={0.16} /></mesh>
      <mesh geometry={kit.collar} position={[-0.3, TOP + 0.02, -0.2]}><Metal kind="steel" grain="turned" /></mesh>
      <mesh geometry={kit.collar} position={[-0.3, HGY - 0.035 + Math.cos(a) * 0.6, -0.2]}><Metal kind="steel" grain="turned" /></mesh>
      <mesh geometry={kit.knob} position={[-0.325, HGY - 0.02 + Math.cos(a) * 0.6, -0.2]} rotation-z={Math.PI / 2}><meshStandardMaterial color="#1c1f22" roughness={0.5} /></mesh>
      <mesh geometry={kit.vial} position={[0.62, TOP, -0.2]} renderOrder={5}>{glass}</mesh>
      <mesh position={[0.62, TOP + 0.022, -0.2]}><cylinderGeometry args={[0.026, 0.026, 0.04, 20]} />{hg}</mesh>
      <mesh position={[0.62, TOP + 0.097, -0.2]}><cylinderGeometry args={[0.019, 0.019, 0.016, 16]} /><meshStandardMaterial color="#2b2f33" roughness={0.6} /></mesh>
      {/* 水银槽：玻璃槽里一层水银 */}
      <mesh position={[0, TOP + 0.03, 0]}><boxGeometry args={[0.4, 0.06, 0.22]} />{hg}</mesh>
      <mesh position={[0, TOP + 0.05, 0]} renderOrder={5}><boxGeometry args={[0.42, 0.1, 0.24]} />{glass}</mesh>
      {/* 刻度尺：立在管子后面，零刻度对准槽里的水银面 */}
      <mesh position={[-0.16, HGY + 0.5, -0.07]}><planeGeometry args={[0.064, 1]} /><meshBasicMaterial map={scale} toneMapped={false} /></mesh>
      {/* 玻璃管：绕着下端倾斜。管里下面一段是水银，上面是真空 */}
      <group position={[0, HGY - 0.02, 0]} rotation-z={-a} {...hand}>
        <mesh position={[0, len / 2 + 0.01, 0]}><cylinderGeometry args={[r - 0.002, r - 0.002, len + 0.02, 24]} />{hg}</mesh>
        <mesh position={[0, TUBE.len / 2, 0]} renderOrder={5}><cylinderGeometry args={[r, r, TUBE.len + 0.02, 24, 1, true]} />{glass}</mesh>
        <mesh position={[0, TUBE.len + 0.01, 0]} renderOrder={5}><sphereGeometry args={[r, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />{glass}</mesh>
        <mesh position={[0, 0.5, 0]} visible={false}><boxGeometry args={[0.24, 1.1, 0.2]} /></mesh>
      </group>
      {/* 夹住管子的横夹，随管子的倾斜往右移 */}
      <mesh position={[-0.3 + (0.3 + Math.sin(a) * 0.6) / 2, HGY - 0.02 + Math.cos(a) * 0.6, -0.1]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.006, 0.006, 0.3 + Math.sin(a) * 0.6, 8]} /><meshStandardMaterial color="#8d949c" metalness={0.8} roughness={0.4} /></mesh>
      {/* 水银柱顶端的水平线：一直画到刻度尺，读竖直高度 */}
      <mesh position={[(-0.19 + Math.sin(a) * len) / 2, HGY + h, 0.03]}><planeGeometry args={[Math.sin(a) * len + 0.19 + 0.06, 0.004]} /><meshBasicMaterial color="#ffe14d" toneMapped={false} /></mesh>
    </group>
  )
}

export default function Scene6(props: SceneProps) {
  const { spot, tilt, h, len } = props, [bx, by, bz] = AT[spot], a = tilt * Math.PI / 180
  const labels: Label[] = [
    { id: 'h', at: [bx - 0.22, by + HGY + h, bz], ax: 1, className: 'scene-tag key -translate-y-1/2', children: <><small>竖直高度</small>{Math.round(h * 1000)} mm</> },
    { id: 'len', at: [bx + Math.sin(a) * len * 0.55 + 0.06, by + HGY + Math.cos(a) * len * 0.55, bz], className: 'scene-name -translate-y-1/2 transition-opacity', style: { opacity: tilt >= 5 ? 1 : 0 }, children: `管里的水银长 ${Math.round(len * 1000)} mm` },
    { id: 'vac', at: [bx + Math.sin(a) * 0.96 + 0.05, by + HGY + Math.cos(a) * 0.96, bz], name: true, className: 'scene-name -translate-y-1/2', style: props.len > 0.97 ? { display: 'none' } : undefined, children: '这一段是真空' },
    { id: 'spot', at: [bx + 0.55, by + TOP + 0.16, bz + 0.2], name: true, className: 'scene-name', children: `${SPOTS[spot].name} · ${SPOTS[spot].note}` },
    { id: 'drag', at: [bx + Math.sin(a) * 0.7 + 0.08, by + HGY + Math.cos(a) * 0.7, bz], className: '', style: { display: props.dragHint ? undefined : 'none' }, children: <div className="drag-hint" style={{ animation: 'none', transform: 'none' }}>↔ 抓住管子可以倾斜</div> },
  ]
  return (
    <LabStage labels={labels} target={TARGETS[spot]} span={SPAN} view={VIEW} fog={FOG[spot]}>
      <Bench at={AT.crest} live={spot === 'crest'} tilt={spot === 'crest' ? tilt : 0} thick={props.thick} h={spot === 'crest' ? h : 0.76} len={spot === 'crest' ? len : 0.76} onTilt={props.onTilt} />
      <Bench at={AT.peak} live={spot === 'peak'} tilt={spot === 'peak' ? tilt : 0} thick={props.thick} h={spot === 'peak' ? h : 0.526} len={spot === 'peak' ? len : 0.526} onTilt={props.onTilt} snow />
    </LabStage>
  )
}
