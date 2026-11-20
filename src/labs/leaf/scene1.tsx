// 光合作用和呼吸作用 · 第 1 课的三维场景：一号台。一盆天竺葵，旁边把其中一片叶子放大了画：左半遮光，右半见光。
import { LabStage, useSlide, type Label } from '@/lab-kit'
import { Beaker, C, Lamp, Leaf, Plant } from './parts'
import { S_BENCH, SPOT } from './spots'
import { ST, TOP } from './world'

const X = ST.one, R = 0.24

/** step：做完了几步（0–4，依次是暗处理、遮光、照光、脱色）；iodine：滴没滴碘液 */
export default function Scene1({ step, iodine }: { step: number; iodine: boolean }) {
  const off = useSlide(step >= 4 ? 0.95 : 0.25, 0.9), y = useSlide(step >= 4 ? 0.42 : 0.72, 0.5)
  const shade = useSlide(step === 1 ? 1 : 0, 1.6), paper = step >= 2 && step < 4
  const base = step >= 4 ? C.pale : C.leaf, lit = iodine ? C.blue : base, dim = base
  const settled = Math.abs(off - (step >= 4 ? 0.95 : 0.25)) < 0.01
  const labels: Label[] = [
    { id: 'l', at: [X + off - R * 0.55, TOP + y + R + 0.06, 0.3], ax: 0.5, className: 'scene-tag -translate-y-full transition-opacity', style: { opacity: step >= 2 && settled ? 1 : 0 }, children: iodine ? <><small>遮光</small>不变蓝</> : '遮光的一半' },
    { id: 'r', at: [X + off + R * 0.55, TOP + y - R - 0.06, 0.3], ax: 0.5, className: `scene-tag transition-opacity${iodine ? ' key' : ''}`, style: { opacity: step >= 2 && settled ? 1 : 0 }, children: iodine ? <><small>见光</small>变蓝</> : '见光的一半' },
    { id: 'nPlant', at: [X - 0.55, TOP + 0.95, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '天竺葵' },
    { id: 'nBath', at: [X + 0.95, TOP + 0.02, 0.55], ax: 0.5, name: true, className: 'scene-name', children: step >= 4 ? '酒精脱色后漂洗干净' : '酒精（隔水加热）' },
  ]
  return (
    <LabStage labels={labels} target={SPOT.one} span={S_BENCH}>
      <group position={[X, TOP, 0]}>
        <Plant position={[-0.55, 0, 0]} s={1.9} />
        {/* 暗处理：罩上一只不透光的箱子 */}
        {shade > 0.02 && <mesh position={[-0.55, 0.48 + (1 - shade) * 0.9, 0]}><boxGeometry args={[0.72, 0.96, 0.72]} /><meshStandardMaterial color="#1b1e22" transparent opacity={0.88 * shade} roughness={1} /></mesh>}
        <Lamp position={[-1.25, 0, -0.15]} on={step === 3} h={1.05} />
        {/* 放大的那片叶子：正对着镜头 */}
        <group position={[off, y, 0.3]} rotation-y={-0.42}>
          <Leaf r={R} half="l" color={dim} />
          <Leaf r={R} half="r" color={lit} />
          <mesh position={[0, -R - 0.07, 0]}><cylinderGeometry args={[0.008, 0.008, 0.14, 6]} /><meshStandardMaterial color={step >= 4 ? C.pale : C.stem} /></mesh>
          {paper && <mesh position={[-R / 2 - 0.005, 0, 0.004]}><planeGeometry args={[R + 0.03, R * 2 + 0.04]} /><meshStandardMaterial color="#16181b" roughness={1} side={2} /></mesh>}
        </group>
        {/* 水浴：大烧杯里套一只装酒精的小烧杯；旁边是培养皿和碘液瓶 */}
        <Beaker position={[0.95, 0, -0.32]} r={0.17} h={0.24} fill={0.55} />
        <Beaker position={[0.95, 0.03, -0.32]} r={0.09} h={0.2} fill={0.6} liquid={step >= 4 ? '#7fae5a' : '#f1f4f2'} opacity={0.75} />
        <mesh position={[0.95, 0.012, 0.3]}><cylinderGeometry args={[0.27, 0.25, 0.024, 32]} /><meshStandardMaterial color="#e6f0f2" transparent opacity={0.6} roughness={0.1} /></mesh>
        <mesh position={[1.4, 0.07, 0.25]} castShadow><cylinderGeometry args={[0.04, 0.045, 0.14, 14]} /><meshStandardMaterial color="#6b3b1c" roughness={0.3} /></mesh>
        <mesh position={[1.4, 0.16, 0.25]}><cylinderGeometry args={[0.012, 0.02, 0.05, 10]} /><meshStandardMaterial color="#1c1c1c" /></mesh>
      </group>
    </LabStage>
  )
}
