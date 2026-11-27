// 一次函数 · 第 2 课的器材：服务区加油站。小轿车停在加油机旁，加油口盖打开，油枪插在里面；加油机屏上是金额、升数、单价。
import type { Label } from '@/lab-kit'
import At from './at'
import { Sedan } from './car'
import { Pump } from './equip'
import { PRICE } from './physics'
import { P } from './world'

/** 加油口在车上的位置（车的坐标）：左后方 */
const FILL: [number, number, number] = [-1.52, 0.93, -0.9]
export default function Scene2({ litres, money }: { litres: number; money: number }) {
  const [px, py, pz] = P.pump, [cx, , cz] = P.car2
  const hose: [number, number, number] = [cx + FILL[0] - px + 0.05, FILL[1] - py, cz + FILL[2] - pz + 0.1]
  const labels: Label[] = [
    { id: 'm', at: [px, py + 3.5, pz], ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>金额</small>{money.toFixed(2)} 元</> },
    { id: 'l', at: [px, py + 3.05, pz], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>升数</small>{litres.toFixed(2)} 升</> },
    { id: 'nP', at: [px + 0.75, py + 0.5, pz + 0.4], ax: 0, name: true, className: 'scene-name', children: `加油机 · 单价 ${PRICE.toFixed(2)} 元/升` },
    { id: 'nC', at: [cx + FILL[0], 1.35, cz + FILL[2] - 0.2], ax: 0.5, name: true, className: 'scene-name', children: '加油口' },
  ]
  return (
    <At at="pump" labels={labels}>
      <Pump position={[px, py, pz]} money={money.toFixed(2)} litres={litres.toFixed(2)} price={PRICE.toFixed(2)} hose={hose} />
      <Sedan position={[cx, 0, cz]} color="#8e1b22">
        {/* 打开的加油口盖 */}
        <mesh position={[FILL[0] - 0.1, FILL[1], FILL[2] - 0.08]} rotation-y={0.9}><boxGeometry args={[0.17, 0.12, 0.012]} /><meshPhysicalMaterial color="#8e1b22" roughness={0.28} metalness={0.45} clearcoat={1} /></mesh>
        <mesh position={[FILL[0], FILL[1], FILL[2] + 0.003]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.055, 0.055, 0.02, 20]} /><meshStandardMaterial color="#141516" roughness={0.6} /></mesh>
      </Sedan>
    </At>
  )
}
