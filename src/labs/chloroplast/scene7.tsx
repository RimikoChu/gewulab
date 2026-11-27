// 光反应和暗反应 · 第 7 课和拓展课的器材：一盆菠菜，一片叶子夹在叶室里，上面一盏补光灯，旁边是光合仪和二氧化碳小钢瓶。
// 光合仪两块屏：左边是正在改变的条件，右边是测到的净光合速率。
import { Analyzer, Cylinder, Hose, LEAF0, LEAF0_Q, LampHead, LeafChamber, Pot, Stand } from './gear'
import type { V3 } from './kit'
import { M } from './world'

/** 盆、光合仪相对这一格原点的位置（画面单位） */
const POT: V3 = [-0.17 * M, 0, 0.02 * M], BOX: V3 = [0.2 * M, 0, 0.0], GAS: V3 = [0.4 * M, 0, -0.1 * M]
export const CHAMBER: V3 = [POT[0] + LEAF0[0], LEAF0[1], POT[2] + LEAF0[2]]
export const LAMP_Y = 0.36 * M
export function RateRig({ light, color, a, b }: { light: number; color?: string; a: string; b: string }) {
  const c = CHAMBER
  return <group>
    <group position={POT}><Pot /></group>
    <group position={c} quaternion={LEAF0_Q}><group rotation-x={Math.PI / 2} scale={1.12}><LeafChamber /></group></group>
    {/* 铁架台举着补光灯，正对叶室 */}
    <group position={[c[0] + 0.14 * M, 0, c[2] - 0.05 * M]} rotation-y={Math.PI}><Stand h={0.37} len={0.14} rodH={0.44} /></group>
    <group position={[c[0], LAMP_Y, c[2]]}><LampHead level={light} color={color} /></group>
    <group position={BOX} rotation-y={-0.12}><Analyzer a={a} b={b} /></group>
    <group position={GAS}><Cylinder /></group>
    {/* 进气、出气两根气管，从叶室顶上接到光合仪 */}
    {[-1, 1].map(s => <Hose key={s} pts={[[c[0] + s * 0.02 * M, c[1] + 0.035 * M, c[2] + s * 0.012 * M], [c[0] + (0.07 + s * 0.02) * M, c[1] + (0.1 + s * 0.02) * M, c[2] - 0.02 * M], [BOX[0] - (0.05 - s * 0.02) * M, 0.2 * M, BOX[2] - 0.03 * M], [BOX[0] - (0.04 - s * 0.025) * M, 0.118 * M, BOX[2] - 0.02 * M]]} />)}
    <Hose color="#2c3034" pts={[[GAS[0] + 0.03 * M, 0.285 * M, GAS[2]], [GAS[0] + 0.07 * M, 0.2 * M, GAS[2] + 0.04 * M], [GAS[0] - 0.02 * M, 0.04 * M, GAS[2] + 0.09 * M], [BOX[0] + 0.1 * M, 0.05 * M, BOX[2]]]} />
  </group>
}
