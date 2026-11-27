// 路边和加油站的器材：里程碑、加油机（带三行读数的屏、油枪和油管）。
import { useEffect, useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal } from '@/lab-kit'
import { canvas, makeMilestone, makeSign, FONT } from './mats'

/** 里程碑：白色水泥桩，圆头，上半截红色，正反两面写着千米数。站在地面上，正面朝 +z */
export function Milestone({ km, ...rest }: { km: number } & Record<string, unknown>) {
  const map = makeMilestone(km)
  return (
    <group {...rest}>
      <RoundedBox args={[0.42, 0.9, 0.16]} radius={0.05} position={[0, 0.45, 0]} castShadow receiveShadow><meshStandardMaterial color="#efeee8" roughness={0.8} /></RoundedBox>
      <mesh position={[0, 0.9, 0]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.21, 0.21, 0.16, 28, 1, false, 0, Math.PI]} /><meshStandardMaterial color="#c4302b" roughness={0.7} /></mesh>
      {[1, -1].map(s => <mesh key={s} position={[0, 0.5, s * 0.081]} rotation-y={s > 0 ? 0 : Math.PI}><planeGeometry args={[0.4, 0.8]} /><meshStandardMaterial map={map} roughness={0.75} /></mesh>)}
      <mesh position={[0, 0.02, 0]}><boxGeometry args={[0.6, 0.04, 0.34]} /><meshStandardMaterial color="#a7a49b" roughness={0.95} /></mesh>
    </group>
  )
}

/** 加油机屏上的三行：金额、升数、单价。返回贴图，值变了就重画 */
function usePumpScreen(money: string, litres: string, price: string) {
  const { c, g, t } = useMemo(() => { const { c, g } = canvas(512, 384); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return { c, g, t } }, [])
  useEffect(() => {
    g.fillStyle = '#0d1512'; g.fillRect(0, 0, 512, 384)
    const rows: [string, string, string][] = [['金额', money, '元'], ['升数', litres, '升'], ['单价', price, '元/升']]
    rows.forEach(([name, v, unit], i) => {
      const y = 22 + i * 120
      g.fillStyle = '#16231d'; g.fillRect(16, y, 480, 104)
      g.fillStyle = '#9fb7aa'; g.font = `600 30px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(name, 28, y + 52)
      g.textAlign = 'right'; g.font = `500 24px ${FONT}`; g.fillText(unit, 488, y + 52)
      g.fillStyle = i === 0 ? '#ff9a3c' : '#8dffb7'; g.font = `700 74px ui-monospace, Menlo, monospace`; g.fillText(v, i === 2 ? 400 : 420, y + 56)
    })
    t.needsUpdate = true
  }, [money, litres, price, g, t])
  void c
  return t
}

/** 加油机：不锈钢底座、白色机身、上面的屏和键盘、两侧挂着油枪。宽 1.2 m、高 2.2 m，两块屏朝 ±z。
 *  hose：这一侧（+z）的油枪拔出来，油管连到 hose 这个点（加油机自己的坐标） */
export function Pump({ money = '0.00', litres = '0.00', price = '7.50', grade = '92#', hose, ...rest }: { money?: string; litres?: string; price?: string; grade?: string; hose?: [number, number, number] } & Record<string, unknown>) {
  const screen = usePumpScreen(money, litres, price)
  const head = makeSign(grade, { w: 256, h: 128, bg: '#f4f5f2', fg: '#1b7a52', size: 0.7 })
  const tube = useMemo(() => {
    if (!hose) return null
    const a = new THREE.Vector3(0.66, 1.55, 0.12), d = new THREE.Vector3(...hose)
    const curve = new THREE.CatmullRomCurve3([a, new THREE.Vector3(0.95, 1.25, 0.32), new THREE.Vector3((a.x + d.x) / 2, 0.55, (a.z + d.z) / 2 - 0.1), new THREE.Vector3(d.x - 0.25, d.y - 0.2, d.z - 0.3), d])
    return new THREE.TubeGeometry(curve, 80, 0.032, 12)
  }, [hose?.[0], hose?.[1], hose?.[2]])   // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <group {...rest}>
      <RoundedBox args={[1.3, 0.22, 0.66]} radius={0.03} position={[0, 0.11, 0]} castShadow receiveShadow><Metal kind="stainless" grain="brushed" /></RoundedBox>
      <RoundedBox args={[1.16, 1.2, 0.5]} radius={0.04} position={[0, 0.82, 0]} castShadow><meshStandardMaterial color="#eef0ee" roughness={0.4} metalness={0.1} /></RoundedBox>
      {[1, -1].map(s => <mesh key={`st${s}`} position={[0, 0.6, s * 0.252]} rotation-y={s > 0 ? 0 : Math.PI}><planeGeometry args={[1.16, 0.12]} /><meshStandardMaterial color="#1b7a52" roughness={0.5} /></mesh>)}
      <RoundedBox args={[1.2, 0.86, 0.46]} radius={0.05} position={[0, 1.86, 0]} castShadow><meshStandardMaterial color="#e6e8e6" roughness={0.45} metalness={0.1} /></RoundedBox>
      <RoundedBox args={[1.24, 0.3, 0.5]} radius={0.05} position={[0, 2.42, 0]} castShadow><meshStandardMaterial color="#f4f5f2" roughness={0.4} /></RoundedBox>
      {[1, -1].map(s => <group key={s} rotation-y={s > 0 ? 0 : Math.PI}>
        <mesh position={[0, 2.42, 0.252]}><planeGeometry args={[0.5, 0.25]} /><meshStandardMaterial map={head} roughness={0.5} /></mesh>
        {/* 屏：深色玻璃框里一块发光的读数屏 */}
        <mesh position={[-0.02, 1.98, 0.232]}><planeGeometry args={[0.78, 0.6]} /><meshStandardMaterial color="#121416" roughness={0.3} metalness={0.4} /></mesh>
        <mesh position={[-0.02, 1.98, 0.236]}><planeGeometry args={[0.72, 0.54]} /><meshBasicMaterial map={screen} toneMapped={false} /></mesh>
        {/* 键盘：一格格的按键 */}
        <mesh position={[0.42, 1.98, 0.234]}><planeGeometry args={[0.18, 0.5]} /><meshStandardMaterial color="#2a2e31" roughness={0.5} /></mesh>
        {Array.from({ length: 12 }, (_, i) => <mesh key={i} position={[0.385 + (i % 2) * 0.07, 2.18 - Math.floor(i / 2) * 0.075, 0.24]}><boxGeometry args={[0.055, 0.055, 0.012]} /><meshStandardMaterial color="#c9ced1" roughness={0.4} metalness={0.4} /></mesh>)}
        {/* 油枪架：没拔出来的那一支挂在这里 */}
        <mesh position={[0.66, 1.4, 0.12]}><boxGeometry args={[0.1, 0.36, 0.16]} /><meshStandardMaterial color="#2a2e31" roughness={0.5} /></mesh>
      </group>)}
      {/* 挂着的油枪和垂下来的油管（−z 一侧总是挂着；+z 一侧拔出来时不画） */}
      {[1, -1].filter(s => !(hose && s > 0)).map(s => <group key={`n${s}`} position={[0.72, 1.36, s * 0.12]} rotation-y={s > 0 ? 0 : Math.PI}>
        <mesh rotation-z={0.25}><boxGeometry args={[0.06, 0.26, 0.05]} /><meshStandardMaterial color="#1d1f21" roughness={0.6} /></mesh>
        <mesh position={[0.06, -0.12, 0]} rotation-z={-1.1}><cylinderGeometry args={[0.012, 0.014, 0.18, 10]} /><Metal kind="aluminum" /></mesh>
        <mesh position={[-0.02, -0.55, 0.05]}><cylinderGeometry args={[0.022, 0.022, 0.9, 10]} /><meshStandardMaterial color="#151617" roughness={0.6} /></mesh>
      </group>)}
      {tube && hose && <>
        <mesh geometry={tube} castShadow><meshStandardMaterial color="#151617" roughness={0.6} /></mesh>
        {/* 插在加油口里的油枪：绿色握把、护圈、铝枪管斜插进加油口 */}
        <group position={hose} rotation-y={0.25}>
          <mesh position={[-0.1, -0.02, -0.16]} rotation-x={-0.5}><boxGeometry args={[0.07, 0.09, 0.24]} /><meshStandardMaterial color="#1b7a52" roughness={0.5} /></mesh>
          <mesh position={[-0.1, -0.09, -0.14]} rotation-x={-0.5}><torusGeometry args={[0.06, 0.012, 8, 20, Math.PI]} /><meshStandardMaterial color="#202224" roughness={0.6} /></mesh>
          <mesh position={[-0.05, 0.02, -0.02]} rotation-z={Math.PI / 2} rotation-y={0.4}><cylinderGeometry args={[0.016, 0.018, 0.2, 12]} /><Metal kind="aluminum" grain="brushed" /></mesh>
        </group>
      </>}
    </group>
  )
}
