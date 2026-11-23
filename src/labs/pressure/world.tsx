// 压强实验室自己的远景：远山和松树。通用的部件在 '@/lab-kit'。
import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
/** 山：近的发绿，远的发蓝灰。snow 为 true 时换成雪山 */
export function Hills({ snow = false }: { snow?: boolean }) {
  const hills: [number, number, number, number, string][] = [
    // 山都放在大坝和水库的后面、两侧，不能压在坝体和水面上
    [70, -80, 60, 34, '#56684c'], [130, -150, 110, 60, '#5f705a'], [110, -230, 90, 46, '#6b7c6c'], [-260, -580, 110, 64, '#5a6b55'], [-560, -300, 120, 52, '#62735f'],
    [-150, -640, 150, 74, '#7a8a86'], [90, -330, 170, 88, '#8597a0'], [-40, -680, 200, 96, '#94a5b0'], [-680, -480, 220, 100, '#8a9aa6'], [280, -240, 160, 80, '#7e9099'],
  ]
  return <>{hills.map(([x, z, rr, h, c], i) => <mesh key={i} position={[x, h / 2 - 3, z]} rotation-y={i * 1.3} scale={[1, 1, 0.8]}><coneGeometry args={[rr, h, 7, 2]} /><meshStandardMaterial color={snow ? (i % 2 ? '#dfe8ee' : '#c9d6df') : c} roughness={1} flatShading /></mesh>)}</>
}
/** 松树：at 里每一项是 [x, z, 大小] */
/** 一片松树：每棵一截树干、四层往上收的树冠，每层转一个角度、深浅不同，合成一个带顶点颜色的模型 */
export function Pines({ at }: { at: [number, number, number][] }) {
  const geo = useMemo(() => {
    const gs: THREE.BufferGeometry[] = [], c = new THREE.Color()
    const paint = (g: THREE.BufferGeometry, hex: string, k = 1) => { c.set(hex).multiplyScalar(k); const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); gs.push(g.toNonIndexed()) }
    at.forEach(([x, z, s], i) => {
      const lean = Math.sin(i * 12.9) * 0.04, tone = 0.85 + (Math.sin(i * 7.3) * 0.5 + 0.5) * 0.3
      const trunk = new THREE.CylinderGeometry(0.09 * s, 0.17 * s, 1.5 * s, 7); trunk.translate(x, 0.75 * s, z); paint(trunk, '#5a4633')
      for (let k = 0; k < 4; k++) {
        const r = (1.3 - k * 0.27) * s, h = (1.5 - k * 0.12) * s, g = new THREE.ConeGeometry(r, h, 9)
        g.rotateY(k * 0.7 + i); g.translate(x + lean * k * s, (1.25 + k * 0.82) * s + h / 2 - 0.5 * s, z); paint(g, k % 2 ? '#3f6e4c' : '#345f42', tone)
      }
    })
    const out = mergeGeometries(gs); out.computeVertexNormals()
    return out
  }, [at])
  return <mesh geometry={geo} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={0.95} flatShading /></mesh>
}

