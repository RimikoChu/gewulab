// 镜头的小工具：临时换镜头的视角宽窄（望远镜里看远处的船、夜里抬头看星空），以及按“站在哪、看哪里”算出舞台要的机位。
import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

/** 舞台默认的镜头视角（°） */
const BASE = 34
/** 这一课的镜头视角换成 fov；离开这一课时换回来 */
export function Zoom({ fov }: { fov: number }) {
  const camera = useThree(s => s.camera) as THREE.PerspectiveCamera
  useEffect(() => { camera.fov = fov; camera.updateProjectionMatrix(); return () => { camera.fov = BASE; camera.updateProjectionMatrix() } }, [camera, fov])
  return null
}
/** 站在 eye、看向 at：换成舞台的 target、span、view（按 1366 宽的画面估算，宽屏时面板会让镜头略微偏一点） */
export function aim(eye: THREE.Vector3, at: THREE.Vector3) {
  const d = eye.clone().sub(at), dist = d.length(); d.normalize()
  return { target: at, span: [dist / 1.873, dist / 2.216] as [number, number], view: [Math.atan2(d.x, d.z), Math.asin(d.y)] as [number, number] }
}
