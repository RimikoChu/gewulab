// 小器材：戴丁腈手套的手（接白大褂袖口）、粉笔铅笔、钉子、细绳。
import { RoundedBox } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'
import { Metal, lathe, type RY } from '@/lab-kit'
import { strut, type V3 } from './geo'

const FINGER = new THREE.CapsuleGeometry(1, 3.2, 6, 14)
/** 戴蓝色丁腈手套的手，手腕接着白袖口。原点在指尖附近，手指朝 −y、小臂朝 +y，手背朝 +z。pinch：捏紧的程度；arm：袖子露出多长（m） */
export function Glove({ pinch = 0.6, arm = 0.35 }: { pinch?: number; arm?: number }) {
  const glove = <meshStandardMaterial color="#4a76bd" roughness={0.62} />
  const cloth = <meshStandardMaterial color="#eeefea" roughness={0.88} />
  const grip = 0.15 + pinch * 0.75, sl = Math.max(10, arm * 100)
  return <group scale={0.01}>
    <RoundedBox args={[8.2, 8.6, 3.4]} radius={1.5} smoothness={4} position={[0, 4.4, 0]} castShadow>{glove}</RoundedBox>
    {[-2.85, -0.95, 0.95, 2.85].map((x, i) => <group key={x} position={[x, 0.2, 0]} rotation-x={-grip * 1.1}>
      <mesh geometry={FINGER} position={[0, -2.2 + Math.abs(i - 1.5) * 0.4, 0]} scale={[0.95, 0.95 - Math.abs(i - 1.5) * 0.08, 0.95]} castShadow>{glove}</mesh>
    </group>)}
    <group position={[4.4, 3.4, -0.6]} rotation={[-grip * 0.6, 0, 0.75]}><mesh geometry={FINGER} position-y={-2.4} scale={[1.08, 0.82, 1.08]} castShadow>{glove}</mesh></group>
    {/* 手套口翻边、手腕、白大褂袖子和袖口 */}
    <mesh position={[0, 10.2, 0]} castShadow><cylinderGeometry args={[3.7, 4.3, 3.2, 28]} />{glove}</mesh>
    <mesh position={[0, 11.9, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[3.75, 0.4, 8, 28]} />{glove}</mesh>
    <mesh position={[0, 12 + sl / 2, 0]} castShadow><cylinderGeometry args={[4.9, 4.35, sl, 28]} />{cloth}</mesh>
    <mesh position={[0, 12.4, 0]} castShadow><cylinderGeometry args={[4.45, 4.45, 1.2, 28]} /><meshStandardMaterial color="#e2e3de" roughness={0.9} /></mesh>
  </group>
}

/** 把手摆到指定的位置：arm 是小臂伸出去的方向，back 是手背朝的方向（都在所在那一组的局部坐标里） */
export function GloveAt({ at, arm, back, scale = 1, pinch = 0.7 }: { at: V3; arm: V3; back: V3; scale?: number; pinch?: number }) {
  const q = useMemo(() => {
    const y = new THREE.Vector3(...arm).normalize(), z = new THREE.Vector3(...back); z.addScaledVector(y, -z.dot(y)).normalize()
    return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(y, z), y, z))
  }, [arm[0], arm[1], arm[2], back[0], back[1], back[2]])   // eslint-disable-line react-hooks/exhaustive-deps
  return <group position={at} quaternion={q} scale={scale}><Glove pinch={pinch} arm={0.42} /></group>
}

/** 粉笔铅笔：六棱的黄漆笔杆，削出来的木头尖和白色的笔芯。笔尖在原点，笔杆沿 +y */
export function Pencil({ len = 0.36, r = 0.016 }: { len?: number; r?: number }) {
  return (
    <group>
      <mesh position-y={r * 1.1}><coneGeometry args={[r * 0.36, r * 2.2, 12]} /><meshStandardMaterial color="#f6f4ee" roughness={0.7} /></mesh>
      <mesh position-y={r * 3.2} rotation-x={Math.PI}><coneGeometry args={[r, r * 4.4, 6, 1, true]} /><meshStandardMaterial color="#d9b88a" roughness={0.8} side={THREE.DoubleSide} /></mesh>
      <mesh position-y={r * 5.4 + (len - r * 5.4) / 2} castShadow><cylinderGeometry args={[r, r, len - r * 5.4, 6]} /><meshStandardMaterial color="#e2b534" roughness={0.45} /></mesh>
      <mesh position-y={len + 0.012}><cylinderGeometry args={[r * 1.02, r * 1.02, 0.03, 12]} /><Metal kind="brass" /></mesh>
      <mesh position-y={len + 0.045}><cylinderGeometry args={[r * 0.9, r * 0.9, 0.04, 12]} /><meshStandardMaterial color="#c9605a" roughness={0.9} /></mesh>
    </group>
  )
}

/** 一颗图钉样的钢钉：钉帽、钉身。钉在板面上，钉身沿 +z 露出来 */
export function Nail({ color = '#ff7a59' }: { color?: string }) {
  const g = useMemo(() => lathe([[0, 0], [0.012, 0], [0.012, 0.07], [0.04, 0.075], [0.045, 0.1], [0.03, 0.115], [0, 0.118]] as RY[], { segs: 24 }), [])
  return <group rotation-x={Math.PI / 2}>
    <mesh geometry={g} castShadow><Metal kind="steel" grain="turned" /></mesh>
    <mesh position-y={0.118}><sphereGeometry args={[0.03, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={color} roughness={0.35} /></mesh>
  </group>
}

/** 绷紧的一段细绳 */
export function Twine({ a, b, r = 0.007 }: { a: V3; b: V3; r?: number }) {
  const g = useMemo(() => strut(a, b, r, 6), [a[0], a[1], a[2], b[0], b[1], b[2], r])   // eslint-disable-line react-hooks/exhaustive-deps
  if (Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 1e-3) return null
  return <mesh geometry={g} castShadow><meshStandardMaterial color="#f1ead8" roughness={0.9} /></mesh>
}
