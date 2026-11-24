// 第 2、3 课的几只电阻：不用的放在台子前面各自的位置上，正在用的那只接在电路里（POS.EL）。
// 换电阻时，旧的那只被拿回原处、新的那只被手套拿到电路里，两只都沿一道弧线走。按厘米写。
import { RoundedBox } from '@react-three/drei'
import { ResBoard, Glove, type V3 } from './gear'
import { POS, lerp3 } from './rig'
import { ease } from './parts'

export interface Item { key: string; tag: string; print: string[]; home: V3 }
const arc = (a: V3, b: V3, k: number): V3 => { const e = ease(k), p = lerp3(a, b, e); return [p[0], p[1] + Math.sin(Math.PI * e) * 7, p[2]] }

/** items：全部电阻；at：接在电路里的那只；from：正在换下来的那只（不在换时为 null）；k：换到哪一步（0–1） */
export function Boards({ items, at, from, k }: { items: Item[]; at: string; from: string | null; k: number }) {
  const moving = from !== null && k < 1
  return <>
    {items.map(it => {
      const pos = moving ? (it.key === at ? arc(it.home, POS.EL, k) : it.key === from ? arc(POS.EL, it.home, k) : it.home) : it.key === at ? POS.EL : it.home
      return <group key={it.key} position={pos}>
        <ResBoard tag={it.tag} print={it.print} />
        {moving && it.key === at && <group position={[0, 4.2, 1.2]} rotation-x={0.75}><Glove scale={0.32} /></group>}
      </group>
    })}
  </>
}

/** 放换用电阻的料盒：一只浅的蓝色防静电周转盒，三格 */
export function PartsTray() {
  const blue = <meshPhysicalMaterial color="#3d6fae" roughness={0.5} clearcoat={0.2} />
  const W = 50, D = 8, H = 1.6, X = -4, Z = 26
  return <group position={[X, 0, Z]}>
    <RoundedBox args={[W, 0.4, D]} radius={0.15} position={[0, 0.2, 0]} receiveShadow castShadow>{blue}</RoundedBox>
    {[-1, 1].map(s => <mesh key={s} position={[0, H / 2, s * (D / 2 - 0.2)]} castShadow><boxGeometry args={[W, H, 0.4]} />{blue}</mesh>)}
    {[-W / 2 + 0.2, -8, 8, W / 2 - 0.2].map(x => <mesh key={x} position={[x, H / 2, 0]} castShadow><boxGeometry args={[0.4, H, D]} />{blue}</mesh>)}
  </group>
}
