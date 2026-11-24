// 一套过滤装置（第 3、4 课共用）：铁架台、铁圈上的漏斗和滤纸、底座上接滤液的烧杯、斜靠在三层滤纸一边的玻璃棒，
// 以及一只被手套拿过来、靠着玻璃棒往漏斗里倒水的烧杯。倒水的过程按时间 t 走（见 POUR）。
import { BEAKER, Beaker, FUNNEL, Funnel, GlassRod, Glove, IronStand, PaperCone, waterLook } from './gear'
import { Drips } from './fx'
import { ease, lerp, liftPath, seg } from './parts'
import { M, type V3 } from './world'

/** 铁架台的底座厚 0.014 m；接滤液的烧杯放在底座上，漏斗颈口伸进杯里、靠着杯的左内壁 */
export const RIG = { base: 0.014, stemY: 0.076, reach: 0.1, src: 0.22 }
const CUP = BEAKER[250]
/** 倒水的时间（s）：拿过来、倒、放回；滤液从开始流到流完 */
export const POUR = { go: [0, 1.3], pour: [1.5, 5.2], back: [5.4, 6.6], flow: [1.9, 7.6], end: 7.8 } as const
const ROD_TILT = -0.5

interface Look { k: number; tint?: string; tk?: number }
/**
 * x、y、z：铁架台底座正中、台面高度。t：倒水进行到第几秒；busy：正在倒；done：这一张滤纸已经滤完。
 * feed：倒进去的水，out：滤出来的水。cone：滤纸已经在漏斗里。paper：滤纸的样子。carbon：倒进去的水里混着活性炭粉
 */
export function FilterRig({ x, y, z, t, busy, done, feed, out, cone = true, wet = 1, torn = false, carbon = false }: { x: number; y: number; z: number; t: number; busy: boolean; done: boolean; feed: Look; out: Look; cone?: boolean; wet?: number; torn?: boolean; carbon?: boolean }) {
  const FX = x, FY = y + RIG.stemY * M, FZ = z
  const CX = x + (CUP.r - 0.0062) * M
  const pk = seg(t, ...POUR.go) - seg(t, ...POUR.back)
  const srcAt: V3 = busy ? liftPath([x + RIG.src * M, y, z + 0.02 * M], [FX + 0.103 * M, y + 0.15 * M, FZ + 0.004 * M], y + 0.2 * M, Math.max(0, pk)) : [x + RIG.src * M, y, z + 0.02 * M]
  const tilt = busy ? ease(seg(t, POUR.pour[0] - 0.3, POUR.pour[0] + 0.5)) * (1 - ease(seg(t, POUR.pour[1] - 0.2, POUR.pour[1] + 0.5))) * 1.25 : 0
  const pouring = busy && t > POUR.pour[0] + 0.3 && t < POUR.pour[1]
  const srcFill = done ? 0.18 : busy ? lerp(0.72, 0.18, seg(t, POUR.pour[0] + 0.3, POUR.pour[1])) : 0.72
  const level = busy ? Math.min(seg(t, POUR.pour[0] + 0.4, POUR.pour[0] + 1.6), 1 - seg(t, POUR.pour[1], POUR.end)) : 0
  const flowing = busy && t > POUR.flow[0] && t < POUR.flow[1]
  const cupFill = done ? 0.5 : busy ? 0.5 * seg(t, POUR.flow[0], POUR.flow[1]) : 0
  const fl = waterLook(feed.k, feed.tint, feed.tk), ol = waterLook(out.k, out.tint, out.tk)
  const dirty = done || (busy && t > POUR.pour[0] + 1)
  return <group>
    <group position={[x, y, z - (RIG.reach - 0.04) * M]}><IronStand ringY={RIG.stemY + 0.104} reach={RIG.reach} ring={0.031} rodH={0.42} /></group>
    <group position={[FX, FY, FZ]}>
      <Funnel />
      {cone && <group rotation-y={Math.PI}><PaperCone wet={wet} torn={torn} dirt={dirty ? (carbon ? 0.9 : torn ? 0.2 : feed.tint ? 0.05 : 0.55) : 0} /></group>}
      {/* 漏斗里的水：一个倒着的锥，液面在滤纸边缘下面 */}
      {level > 0.02 && <mesh position-y={(FUNNEL.apex + 0.04 * level / 2) * M} rotation-x={Math.PI} renderOrder={5}><coneGeometry args={[0.04 * level * Math.tan(Math.PI / 6) * M, 0.04 * level * M, 32, 1]} /><meshStandardMaterial color={carbon ? '#2a2a28' : fl.color} transparent opacity={carbon ? 0.85 : fl.opacity} roughness={0.2} depthWrite={false} /></mesh>}
      {flowing && <mesh position={[-0.0005 * M, -0.03 * M, 0]} renderOrder={6}><cylinderGeometry args={[0.0016 * M, 0.0016 * M, 0.06 * M, 8]} /><meshPhysicalMaterial color={ol.color} transparent opacity={Math.min(0.9, ol.opacity + 0.3)} roughness={0.02} clearcoat={1} depthWrite={false} /></mesh>}
    </group>
    <Drips at={[FX, FY, FZ]} drop={0.05 * M} on={busy && t > POUR.flow[1] - 1.5} every={0.5} r={0.0025 * M} color={ol.color} />
    <group position={[CX, y + RIG.base * M, FZ]}><Beaker vol={250} fill={cupFill} k={out.k} tint={out.tint} tk={out.tk} /></group>
    {/* 玻璃棒：倒水时斜靠在三层滤纸那一边 */}
    {(busy || done) && <group position={[FX + 0.012 * M, FY + (FUNNEL.apex + 0.012) * M, FZ]} rotation-z={ROD_TILT}><GlassRod len={0.15} /></group>}
    <group position={srcAt}>
      <group position={[-CUP.r * M, CUP.h * M, 0]} rotation-z={tilt}>
        <group position={[CUP.r * M, -CUP.h * M, 0]}><Beaker vol={250} fill={srcFill} k={carbon ? 0 : feed.k} tint={carbon ? '#141414' : feed.tint} tk={carbon ? 1 : feed.tk} mud={feed.tint || carbon ? (carbon ? 0.005 : 0) : 0.004} mudColor={carbon ? '#111111' : undefined} /></group>
        {busy && pk > 0 && <group position={[CUP.r * M + 0.03 * M, -CUP.h * M * 0.45, 0.01 * M]} rotation={[0.5, 0, -Math.PI / 2 - 0.35]}><Glove /></group>}
      </group>
    </group>
    {pouring && <group position={[FX + 0.012 * M, FY + (FUNNEL.apex + 0.012) * M, FZ + 0.0035 * M]} rotation-z={ROD_TILT}><mesh position-y={0.055 * M} renderOrder={8}><cylinderGeometry args={[0.0022 * M, 0.0028 * M, 0.11 * M, 8]} /><meshStandardMaterial color={carbon ? '#2a2a28' : fl.color} transparent opacity={0.8} roughness={0.1} depthWrite={false} /></mesh></group>}
  </group>
}
