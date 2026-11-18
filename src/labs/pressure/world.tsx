// 压强实验室自己的远景：远山和松树。通用的部件在 '@/lab-kit'。
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
export function Pines({ at }: { at: [number, number, number][] }) {
  return <>{at.map(([x, z, s], i) => <group key={i} position={[x, 0, z]} scale={s}>
    <mesh position={[0, 0.5, 0]} castShadow><cylinderGeometry args={[0.12, 0.16, 1, 8]} /><meshStandardMaterial color="#5a4633" roughness={1} /></mesh>
    {[0, 1, 2].map(k => <mesh key={k} position={[0, 1.5 + k * 0.95, 0]} castShadow><coneGeometry args={[1.25 - k * 0.3, 1.7, 9]} /><meshStandardMaterial color={k % 2 ? '#3d6b4a' : '#356043'} roughness={0.95} flatShading /></mesh>)}
  </group>)}</>
}

