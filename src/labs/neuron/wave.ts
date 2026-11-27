// 兴奋区：膜上哪几处正处在兴奋状态（膜外负、膜内正）。各课每帧把兴奋区的位置写进来，
// 膜的材质读它把那一段照亮，膜两侧的电荷读它决定画正号还是负号。位置用大场景里的 x 坐标。
import * as THREE from 'three'

/** 最多同时四处：x 中心，y 半宽，z 强度（0–1） */
export const ZONES = [0, 1, 2, 3].map(() => new THREE.Vector4(0, 1, 0, 0))
const U = { uZone: { value: ZONES }, uZoneColor: { value: new THREE.Color('#ffd98a') } }
export function setZones(list: { x: number; w: number; a: number }[]) {
  for (let i = 0; i < 4; i++) { const z = list[i]; if (z) ZONES[i].set(z.x, Math.max(0.05, z.w), z.a, 0); else ZONES[i].z = 0 }
}
/** x 处兴奋了多少（0–1） */
export function excitedAt(x: number) {
  let e = 0
  for (const z of ZONES) if (z.z > 0) e += z.z * Math.exp(-(((x - z.x) / z.y) ** 2))
  return Math.min(1, e)
}
/** 给材质加上“兴奋处发亮”：按片元在大场景里的 x 坐标算 */
export function excitable<M extends THREE.MeshStandardMaterial>(m: M, gain = 1) {
  m.onBeforeCompile = s => {
    Object.assign(s.uniforms, U, { uZoneGain: { value: gain } })
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying float vWX;').replace('#include <project_vertex>', '#include <project_vertex>\nvWX = (modelMatrix * vec4(transformed, 1.0)).x;')
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vWX;\nuniform vec4 uZone[4];\nuniform vec3 uZoneColor;\nuniform float uZoneGain;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\nfloat ex = 0.0;\nfor (int i = 0; i < 4; i++) { float d = (vWX - uZone[i].x) / uZone[i].y; ex += uZone[i].z * exp(-d * d); }\nex = min(ex, 1.0) * uZoneGain;\ndiffuseColor.rgb = mix(diffuseColor.rgb, uZoneColor, min(ex * 0.3, 0.6));\ntotalEmissiveRadiance += uZoneColor * ex * 0.3;')
  }
  m.customProgramCacheKey = () => 'neuron-excitable-' + gain
  return m
}
