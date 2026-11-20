// 光合作用和呼吸作用 · 第 4 课的三维场景：四号台。一块放大的叶片横切模型：上表皮、栅栏组织、海绵组织、叶脉、下表皮和一个气孔。
import { useMemo } from 'react'
import { LabStage, useSlide, type Label } from '@/lab-kit'
import { Bubbles } from './parts'
import { PARTS, type PartKey } from './physics'
import { SPOT } from './spots'
import { ST, TOP } from './world'

const X = ST.four, W = 1.9, D = 0.46, SX = 0.52   // 模型的宽、厚，气孔在 x = SX 处
const SPAN: [number, number] = [3.1, 1.75]

/** part：现在看哪一部分（别的部分变淡）；open：气孔张开 */
export default function Scene4({ part, open }: { part: PartKey | null; open: boolean }) {
  const gap = useSlide(open ? 0.085 : 0.012, 0.12)
  const a = (k: PartKey) => (!part || part === k ? 1 : 0.28)
  const cols = useMemo(() => Array.from({ length: 12 }, (_, i) => -W / 2 + (i + 0.5) * W / 12), [])
  const blobs = useMemo(() => Array.from({ length: 13 }, (_, i) => { const k = Math.sin(i * 9.7) * 43758.5; const r = k - Math.floor(k); return { x: -W / 2 + 0.12 + (i / 12) * (W - 0.24), y: 0.44 + (i % 3) * 0.085 + r * 0.02, r: 0.075 + r * 0.02 } }).filter(b => Math.abs(b.x) > 0.2 && (Math.abs(b.x - SX) > 0.12 || b.y > 0.52)), [])
  const mat = (color: string, k: PartKey, rough = 0.6) => <meshStandardMaterial color={color} roughness={rough} transparent opacity={a(k)} depthWrite={a(k) > 0.5} />
  const labels: Label[] = [
    { id: 'skin', at: [X - W / 2 - 0.06, TOP + 1.08, D / 2], ax: 1, className: `scene-tag -translate-y-1/2${part === 'skin' ? ' key' : ''}`, children: '上表皮' },
    { id: 'skin2', at: [X - W / 2 - 0.06, TOP + 0.32, D / 2], ax: 1, className: `scene-tag -translate-y-1/2${part === 'skin' ? ' key' : ''}`, children: '下表皮' },
    { id: 'meso', at: [X - W / 2 - 0.06, TOP + 0.74, D / 2], ax: 1, className: `scene-tag -translate-y-1/2${part === 'meso' ? ' key' : ''}`, children: <><small>有叶绿体</small>叶肉</> },
    { id: 'vein', at: [X, TOP + 1.22, D / 2], ax: 0.5, className: `scene-tag -translate-y-full${part === 'vein' ? ' key' : ''}`, children: <><small>导管和筛管</small>叶脉</> },
    { id: 'stoma', at: [X + SX + 0.2, TOP + 0.3, D / 2], className: `scene-tag -translate-y-1/2${part === 'stoma' ? ' key' : ''}`, children: <><small>保卫细胞围成</small>气孔{open ? '（张开）' : '（关闭）'}</> },
    { id: 'in', at: [X + SX - 0.1, TOP + 0.1, D / 2], ax: 1, className: 'scene-name transition-opacity', style: { opacity: open ? 1 : 0 }, children: '二氧化碳进' },
    { id: 'out', at: [X + SX + 0.1, TOP + 0.1, D / 2], className: 'scene-name transition-opacity', style: { opacity: open ? 1 : 0 }, children: '氧气和水蒸气出' },
  ]
  return (
    <LabStage labels={labels} target={SPOT.four} span={SPAN}>
      <group position={[X, TOP, 0]}>
        {/* 底座和两根支柱 */}
        <mesh position={[0, 0.02, 0]} castShadow><boxGeometry args={[W + 0.3, 0.04, D + 0.2]} /><meshStandardMaterial color="#2a3136" roughness={0.6} /></mesh>
        {[-1, 1].map(s => <mesh key={s} position={[s * (W / 2 - 0.05), 0.16, -D / 2 - 0.02]}><cylinderGeometry args={[0.018, 0.018, 0.28, 8]} /><meshStandardMaterial color="#5a6068" metalness={0.5} roughness={0.4} /></mesh>)}
        <mesh position={[0, 0.7, -D / 2 - 0.05]}><boxGeometry args={[W + 0.5, 1.25, 0.03]} /><meshStandardMaterial color="#1d2328" roughness={0.9} /></mesh>
        {/* 表皮：上下各一排扁平的细胞，不含叶绿体。下表皮在气孔那里留一个口 */}
        {cols.map((x, i) => <mesh key={`u${i}`} position={[x, 1.08, 0]}><boxGeometry args={[W / 12 - 0.012, 0.075, D]} />{mat('#dcebc4', 'skin', 0.35)}</mesh>)}
        {cols.filter(x => Math.abs(x - SX) > 0.11).map((x, i) => <mesh key={`d${i}`} position={[x, 0.32, 0]}><boxGeometry args={[W / 12 - 0.012, 0.075, D]} />{mat('#dcebc4', 'skin', 0.35)}</mesh>)}
        {/* 叶肉：上面是排得整齐的栅栏组织，下面是疏松的海绵组织；深色的小点是叶绿体 */}
        {cols.filter(x => Math.abs(x) > 0.17).map((x, i) => (
          <group key={`p${i}`} position={[x, 0.88, 0]}>
            <mesh><boxGeometry args={[W / 12 - 0.022, 0.3, D - 0.02]} />{mat('#69b65a', 'meso')}</mesh>
            {[0.1, 0.02, -0.07].map((y, j) => <mesh key={j} position={[(j % 2 ? 1 : -1) * 0.03, y, D / 2 - 0.006]}><sphereGeometry args={[0.022, 10, 8]} />{mat('#1f6b2c', 'meso')}</mesh>)}
          </group>
        ))}
        {blobs.map((b, i) => (
          <group key={`b${i}`} position={[b.x, b.y, 0]}>
            <mesh scale={[1, 1, D / (b.r * 2) * 0.96]}><sphereGeometry args={[b.r, 14, 10]} />{mat('#7cc169', 'meso')}</mesh>
            <mesh position={[0.01, 0.01, D / 2 - 0.004]}><sphereGeometry args={[0.02, 10, 8]} />{mat('#1f6b2c', 'meso')}</mesh>
          </group>
        ))}
        {/* 叶脉：一束管子。蓝的是导管（运水），橙的是筛管（运有机物） */}
        <mesh position={[0, 0.74, 0]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.16, 0.16, D + 0.02, 24]} />{mat('#e9e2c3', 'vein')}</mesh>
        {[[-0.06, 0.05], [0.05, 0.07], [0, 0.0]].map(([x, y], i) => <mesh key={`x${i}`} position={[x, 0.76 + y, 0]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.038, 0.038, D + 0.03, 12]} />{mat('#4a8fd9', 'vein')}</mesh>)}
        {[[-0.06, -0.09], [0.06, -0.08]].map(([x, y], i) => <mesh key={`s${i}`} position={[x, 0.74 + y, 0]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.03, 0.03, D + 0.03, 12]} />{mat('#f0a04b', 'vein')}</mesh>)}
        {/* 气孔：一对保卫细胞，吸水鼓起来就把中间撑开 */}
        {[-1, 1].map(s => <mesh key={s} position={[SX + s * (0.045 + gap / 2), 0.32, 0]} scale={[open ? 0.62 : 0.5, 1, D / 0.17]}><sphereGeometry args={[0.085, 16, 12]} />{mat('#2f8f45', 'stoma')}</mesh>)}
        <Bubbles from={[SX - 0.02, 0.02, 0.1]} top={0.5} rate={open ? 2.2 : 0} color="#b9c6da" size={0.016} n={8} />
        <Bubbles from={[SX + 0.02, 0.5, -0.08]} top={0.02} rate={open ? 2.2 : 0} color="#ff9c8a" size={0.016} n={8} />
      </group>
    </LabStage>
  )
}
