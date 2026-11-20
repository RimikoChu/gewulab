// 原电池 · 第 1–4 课和拓展共用的装置：一只烧杯、两片电极、一根经过电流表和小灯泡的导线。摆在一号台上。
import type { ReactNode } from 'react'
import { LabStage, type Label } from '@/lab-kit'
import { Beaker, Bubbles, Bulb, LIQUID, Meter, Plate, Wire } from './parts'
import type { MetalKey } from './physics'
import { SPAN, SPOT, ST, TOP } from './world'

export const X = ST.one
/** left、right：两片电极；joined：导线连没连上；flow：电子往哪边走（1 从左到右，−1 反过来，0 没有电流）；gasL、gasR：两片上冒气泡的多少（0–1）；apart：分装在两只不相通的烧杯里 */
export default function Rig({ left, right, liquid = LIQUID.acid, joined, flow = 0, gasL = 0, gasR = 0, apart = false, labels, children = null }: { left: MetalKey; right: MetalKey; liquid?: string; joined: boolean; flow?: number; gasL?: number; gasR?: number; apart?: boolean; labels: Label[]; children?: ReactNode }) {
  const dx = apart ? 0.34 : 0.11
  return (
    <LabStage labels={labels} target={SPOT.one} span={SPAN}>
      <group position={[X, TOP, 0]}>
        {apart ? <><Beaker position={[-dx, 0, 0]} r={0.2} liquid={liquid} /><Beaker position={[dx, 0, 0]} r={0.2} liquid={liquid} /></> : <Beaker position={[0, 0, 0]} r={0.27} liquid={liquid} />}
        <Plate position={[-dx, 0.05, 0]} metal={left} />
        <Plate position={[dx, 0.05, 0]} metal={right} />
        <Bubbles at={[-dx - 0.02, 0.08, 0]} top={0.27} rate={gasL} />
        <Bubbles at={[dx + 0.02, 0.08, 0]} top={0.27} rate={gasR} />
        <Meter position={[0, 0, -0.5]} value={flow} />
        <Bulb position={[0.42, 0, -0.5]} on={Math.abs(flow)} />
        <Wire points={[[-dx, 0.52, 0], [-dx - 0.06, 0.74, -0.14], [-0.14, 0.5, -0.44], [0.14, 0.5, -0.44], [dx + 0.06, 0.74, -0.14], [dx, 0.52, 0]]} flow={joined ? flow : 0} cut={!joined} />
        {children}
      </group>
    </LabStage>
  )
}
