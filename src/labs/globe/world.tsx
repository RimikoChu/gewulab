// 地球和经纬网实验室的大场景：一片海，海上一艘远洋科考船。船里有地球仪大厅和驾驶台，驾驶台顶上是罗经甲板。
// 整个实验室只有这一个世界，各课在里面各占一处；换课时画布不重建，镜头飞过去。
// 第 1 课的海面画成弯的（弯曲放大了很多倍，示意）；别的课海面是平的（真实地球在船边几百米里看不出弯）。
import { useMemo } from 'react'
import * as THREE from 'three'
import { useRipple } from '@/lab-kit'
import { Bridge, type BridgeWant } from './bridge'
import { Globe, type GlobeWant } from './globe'
import { GLOBE_AT, Hall } from './hall'
import { SEA_R } from './physics'
import { Ship } from './ship'

/** 各课所在的位置 */
export const ST = {
  bow: new THREE.Vector3(44, 14, 0),
  globe: GLOBE_AT,
  bridge: new THREE.Vector3(23.4, 17.2, 0),
  roof: new THREE.Vector3(20, 20.2, 2),
}

/** 这一课对整个世界的要求 */
export interface Want extends BridgeWant {
  /** 海面：弯的（第 1 课）还是平的 */
  sea?: 'curved' | 'flat'
  /** 夜里：天黑、出星星。lat 是船所在的纬度（北极星的高度跟着变） */
  night?: { lat: number }
  globe?: GlobeWant
}

/** 海水：深蓝，表面一层会动的细浪，反射天空 */
function Sea({ curved }: { curved: boolean }) {
  const normal = useRipple([520, 520], 0.003)
  const near = useRipple([30, 30], 0.012)
  const cap = useMemo(() => new THREE.SphereGeometry(SEA_R, 256, 96, 0, Math.PI * 2, 0, 1.0), [])
  const mat = <meshPhysicalMaterial color="#0f2f4a" roughness={0.12} metalness={0.05} normalMap={normal} normalScale={new THREE.Vector2(0.2, 0.2)} clearcoat={1} clearcoatRoughness={0.06} clearcoatNormalMap={near} clearcoatNormalScale={new THREE.Vector2(0.25, 0.25)} envMapIntensity={1.1} />
  return curved
    ? <mesh key="curved" geometry={cap} position={[0, -SEA_R, 0]} receiveShadow>{mat}</mesh>
    : <mesh key="flat" rotation-x={-Math.PI / 2} receiveShadow><circleGeometry args={[3000, 96]} />{mat}</mesh>
}

/** 星空的半径（m）：远到看上去和无穷远一样 */
const SKY = 900
const RAD = Math.PI / 180
/** 演示用的“当地恒星时”（小时）：让北斗七星停在北极星的东边，和北极星同在画面里 */
const LST = 9.6
/** 北斗七星：赤经（小时）、赤纬（°），取常用星表的近似值 */
export const DIPPER: [number, number][] = [[11.06, 61.75], [11.03, 56.38], [11.9, 53.69], [12.26, 57.03], [12.9, 55.96], [13.4, 54.93], [13.79, 49.31]]
/** 天上一点（赤经、赤纬）在场景里的方向：北是 −z，东是 +x；lat 是观察者的纬度 */
export function skyDir(ra: number, dec: number, lat: number): THREE.Vector3 {
  const H = (LST - ra) * 15 * RAD, d = dec * RAD
  // 星空自己的坐标：y 指北天极，+z 指子午线上天顶那一侧，−x 指西
  const v = new THREE.Vector3(-Math.cos(d) * Math.sin(H), Math.sin(d), Math.cos(d) * Math.cos(H))
  return v.applyAxisAngle(new THREE.Vector3(1, 0, 0), -(90 - lat) * RAD)
}

/** 星空：随机的星星，加上北极星和北斗七星。北极星在正北，高度角等于船所在的纬度 */
function Stars({ lat }: { lat: number }) {
  const geo = useMemo(() => {
    const n = 3200, a = new Float32Array(n * 3), c = new Float32Array(n * 3); let s = 17
    const r = () => (s = (s * 16807) % 2147483647) / 2147483647
    for (let i = 0; i < n; i++) {
      const u = r() * 2 - 1, t = r() * Math.PI * 2, k = Math.sqrt(1 - u * u)
      a[i * 3] = SKY * k * Math.cos(t); a[i * 3 + 1] = SKY * u; a[i * 3 + 2] = SKY * k * Math.sin(t)
      const b = 0.45 + r() ** 3 * 1.5; c[i * 3] = b; c[i * 3 + 1] = b; c[i * 3 + 2] = b * (0.9 + r() * 0.2)
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3)); g.setAttribute('color', new THREE.BufferAttribute(c, 3))
    return g
  }, [])
  const dipper = DIPPER.map(([ra, dec]) => skyDir(ra, dec, lat).multiplyScalar(SKY))
  const line = useMemo(() => new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#7f9cc8', transparent: true, opacity: 0.45, toneMapped: false })), [])
  line.geometry.setFromPoints(dipper)
  return <group>
    <group rotation-x={-(90 - lat) * RAD}><points geometry={geo}><pointsMaterial vertexColors size={2.6} sizeAttenuation={false} toneMapped={false} transparent opacity={0.95} depthWrite={false} /></points></group>
    {/* 北极星 */}
    <mesh position={skyDir(0, 90, lat).multiplyScalar(SKY).toArray()}><sphereGeometry args={[3.6, 14, 10]} /><meshBasicMaterial color="#fff4d6" toneMapped={false} /></mesh>
    {/* 北斗七星和连线 */}
    {dipper.map((p, i) => <mesh key={i} position={p.toArray()}><sphereGeometry args={[2.9, 12, 10]} /><meshBasicMaterial color="#eef3ff" toneMapped={false} /></mesh>)}
    <primitive object={line} />
  </group>
}

export function World({ want }: { want?: Want }) {
  const w = want ?? {}
  return (
    <group>
      <Sea curved={w.sea === 'curved'} />
      {w.night && <Stars lat={w.night.lat} />}
      {w.night && <hemisphereLight args={['#3a5486', '#0a0e16', 0.6]} />}
      <Ship />
      <Hall />
      <Globe at={GLOBE_AT} want={w.globe ?? {}} />
      <Bridge want={w} />
    </group>
  )
}
