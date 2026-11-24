// 两个放大模型：一串肺泡（第 2、6 课）和一段肺泡壁（第 6 课）。都是放大的示意，坐标是模型自己的。
// 肺泡是一层很薄的壁围成的空泡，像一串葡萄挂在细支气管的末端；外面缠着毛细血管，从流进来的一头（静脉血，蓝）到流出去的一头（动脉血，红）渐变。
// 剖开时用一个切面把朝镜头的一半切掉，看得见泡是空的、壁只有薄薄一层。
import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { bloodAlong, type GasKey } from './physics'
import { curveOf, ellipsoid, fbm, roundCone, sminAll, surfaceNetsGen, type V3 } from './sdf'
import { prioOf, useJob } from './job'

/** 和血液循环实验室一样的两种颜色 */
export const RED = '#c8232f', BLUE = '#33509e'
const cRed = new THREE.Color(RED), cBlue = new THREE.Color(BLUE)
/** 血里的氧 o（0 静脉血，1 动脉血）对应的颜色 */
export const oxyColor = (o: number, out = new THREE.Color()) => out.copy(cBlue).lerp(cRed, Math.min(1, Math.max(0, o)))
const rnd0 = (seed: number) => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647 }

/** 红细胞：两面凹的圆饼 */
export function rbcGeo(r: number) {
  const pts: THREE.Vector2[] = []
  for (let i = 0; i <= 16; i++) { const t = i / 16, x = r * t, h = r * (0.18 + 0.36 * t * t - 0.3 * t ** 4) * Math.sqrt(Math.max(0, 1 - t * t)) + r * 0.04; pts.push(new THREE.Vector2(x, h)) }
  for (let i = 16; i >= 0; i--) pts.push(new THREE.Vector2(pts[i].x, -pts[i].y))
  const g = new THREE.LatheGeometry(pts, 24); g.computeVertexNormals(); return g
}

// ---------- 一串肺泡 ----------
export const ALV: { c: V3; r: number }[] = [
  { c: [0.15, 0.05, 0.0], r: 0.6 }, { c: [1.0, 0.45, -0.3], r: 0.5 }, { c: [0.85, -0.65, -0.2], r: 0.52 }, { c: [-0.25, -0.95, -0.25], r: 0.5 },
  { c: [0.45, 1.0, -0.5], r: 0.46 }, { c: [1.35, -0.1, -0.85], r: 0.45 }, { c: [-0.15, 0.6, -0.95], r: 0.46 }, { c: [0.6, -0.2, -1.15], r: 0.5 },
  { c: [-0.7, -0.15, -0.6], r: 0.42 },
]
/** 细支气管：从左上进来，接到肺泡管 */
export const BRONCHIOLE: V3[] = [[-2.0, 1.4, -0.3], [-1.25, 0.85, -0.25], [-0.55, 0.35, -0.3]]
const WALL_T = 0.06
/** 剖开的只是 x < CUT_X 的那一部分 */
const CUT_X = 0.85
function sacSdf(x: number, y: number, z: number) {
  return sminAll([...ALV.map(a => ellipsoid(x, y, z, a.c, [a.r, a.r, a.r])), roundCone(x, y, z, BRONCHIOLE[0], BRONCHIOLE[1], 0.19, 0.17), roundCone(x, y, z, BRONCHIOLE[1], BRONCHIOLE[2], 0.17, 0.24)], 0.16) + 0.012 * fbm(x * 5, y * 5, z * 5, 2)
}
type Sac = { wall: THREE.BufferGeometry; caps: { curve: THREE.CatmullRomCurve3 }[]; art: THREE.CatmullRomCurve3; ven: THREE.CatmullRomCurve3 }
/** 分段生成（见 job.ts） */
function* sacGen(): Generator<void, Sac> {
  // 壁：外表面和往里收 WALL_T 的内表面之间是实的，剖开就是一圈薄薄的壁
  const wall = yield* surfaceNetsGen((x, y, z) => { const d = sacSdf(x, y, z); return Math.max(d, -(d + WALL_T)) }, [[-2.3, -1.7, -1.9], [2.0, 1.75, 0.85]], 0.028)
  // 小动脉（蓝，含氧少）沿左下走，小静脉（红）沿右边走，毛细血管从一边绕过肺泡表面到另一边
  const art = curveOf([[-2.1, -1.35, 0.35], [-1.2, -1.45, 0.4], [-0.2, -1.6, 0.3], [0.8, -1.5, 0.15]], 0.5)
  const ven = curveOf([[2.05, 1.5, 0.2], [1.6, 0.7, 0.35], [1.75, -0.2, 0.3], [1.5, -1.1, 0.1]], 0.5)
  const r = rnd0(17), caps: { curve: THREE.CatmullRomCurve3 }[] = []
  const onSurface = (p: THREE.Vector3) => {
    let best = ALV[0], bd = 1e9
    for (const a of ALV) { const d = p.distanceTo(new THREE.Vector3(...a.c)) - a.r; if (d < bd) { bd = d; best = a } }
    const c = new THREE.Vector3(...best.c); return c.add(p.clone().sub(c).normalize().multiplyScalar(best.r + 0.045))
  }
  // 每根毛细血管：从小动脉上一点出发，贴着一两个肺泡的表面绕过去，接到小静脉上；一半走在前面，一半绕到后面
  for (let i = 0; i < 30; i++) {
    const a = art.getPointAt(0.06 + 0.9 * (i / 30) + 0.02 * r()), b = ven.getPointAt(0.04 + 0.92 * r())
    const side = i % 2 ? 0.9 : -0.9, n = 18, pts: THREE.Vector3[] = [a]
    const bend = new THREE.Vector3((r() - 0.5) * 1.2, (r() - 0.5) * 1.2, side)
    for (let k = 1; k < n; k++) {
      const t = k / n, p = a.clone().lerp(b, t).addScaledVector(bend, Math.sin(Math.PI * t))
      pts.push(onSurface(p))
    }
    pts.push(b)
    caps.push({ curve: new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5) })
  }
  return { wall, caps, art, ven }
}

/** 一串肺泡。cut：剖开多少（0 不剖，1 剖到中间）；flow：血流动不动 */
export function AlveolarSac(props: { cut: number; flow: boolean }) {
  const G = useJob('sac', sacGen, prioOf('sac'))
  return G ? <SacInner G={G} {...props} /> : null
}
function SacInner({ cut, flow, G }: { cut: number; flow: boolean; G: Sac }) {
  const gl = useThree(s => s.gl)
  gl.localClippingEnabled = true
  // 切面：法线朝里（−z），切面从模型前面（z = 1）往里推到 z = 0.02
  // 只剖左上的一半（x < CUT_X 而且 z > 切面的部分去掉），右边的肺泡和毛细血管留着对照
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, -1), 1), [])
  const side = useMemo(() => new THREE.Plane(new THREE.Vector3(1, 0, 0), 0), [])
  const grp = useRef<THREE.Group>(null)
  const mats = useMemo(() => ({
    wall: new THREE.MeshPhysicalMaterial({ color: '#f3b9bd', roughness: 0.38, clearcoat: 0.6, sheen: 0.8, sheenColor: '#ffe0e0', transmission: 0, transparent: true, opacity: 0.92, side: THREE.DoubleSide, clippingPlanes: [plane, side], clipIntersection: true, clipShadows: true }),
    cap: new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.3, clearcoat: 0.7, clippingPlanes: [plane, side], clipIntersection: true }),
    art: new THREE.MeshPhysicalMaterial({ color: BLUE, roughness: 0.3, clearcoat: 0.7 }),
    ven: new THREE.MeshPhysicalMaterial({ color: RED, roughness: 0.3, clearcoat: 0.7 }),
  }), [plane, side])
  const capGeo = useMemo(() => mergeGeometries(G.caps.map(({ curve }) => {
    const g = new THREE.TubeGeometry(curve, 72, 0.026, 6), n = g.attributes.position.count, col = new Float32Array(n * 3), c = new THREE.Color()
    for (let v = 0; v < n; v++) { oxyColor(Math.floor(v / 7) / 72, c); col[v * 3] = c.r; col[v * 3 + 1] = c.g; col[v * 3 + 2] = c.b }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g
  })), [G])
  const artGeo = useMemo(() => new THREE.TubeGeometry(G.art, 40, 0.11, 12), [G]), venGeo = useMemo(() => new THREE.TubeGeometry(G.ven, 40, 0.12, 12), [G])
  const cells = useRef<THREE.InstancedMesh>(null)
  const rbc = useMemo(() => rbcGeo(0.045), [])
  const st = useMemo(() => Array.from({ length: 40 }, (_, i) => ({ k: i % G.caps.length, s: (i * 0.137) % 1 })), [G])
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), v: new THREE.Vector3(), sc: new THREE.Vector3(1, 1, 1), c: new THREE.Color(), w: new THREE.Vector3() }), [])
  useFrame((s, dt0) => {
    const dt = Math.min(dt0, 1 / 30)
    // 切面跟着模型走（切面是世界坐标的）
    if (grp.current) {
      // 切面先按模型自己的坐标写，再换到世界坐标（模型在展厅里转过半圈）
      grp.current.updateWorldMatrix(true, false)
      plane.set(new THREE.Vector3(0, 0, -1), 1.0 - (1.0 - 0.02) * cut).applyMatrix4(grp.current.matrixWorld)
      side.set(new THREE.Vector3(1, 0, 0), -CUT_X).applyMatrix4(grp.current.matrixWorld)
    }
    const m = cells.current; if (!m) return
    st.forEach((c, i) => {
      if (flow) c.s = (c.s + dt * 0.16) % 1
      const p = G.caps[c.k].curve.getPointAt(c.s)
      m.setMatrixAt(i, tmp.m.compose(p, tmp.q.setFromEuler(tmp.e.set(i + s.clock.elapsedTime * 0.5, i * 0.7, 0)), tmp.sc.setScalar(p.z > 1.0 - 0.98 * cut && p.x < CUT_X ? 0.0001 : 1)))
      m.setColorAt(i, oxyColor(c.s, tmp.c))
    })
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true
  })
  return <group ref={grp}>
    <mesh geometry={G.wall} material={mats.wall} castShadow renderOrder={3} />
    <mesh geometry={capGeo} material={mats.cap} />
    <mesh geometry={artGeo} material={mats.art} />
    <mesh geometry={venGeo} material={mats.ven} />
    <instancedMesh ref={cells} args={[rbc, undefined, st.length]} frustumCulled={false}><meshPhysicalMaterial roughness={0.35} clearcoat={0.5} /></instancedMesh>
  </group>
}

// ---------- 肺泡壁（再放大） ----------
/**
 * 一段肺泡壁的剖面：上面是肺泡里的空气，中间一层扁平的肺泡壁细胞，紧贴着下面一根剖开的毛细血管（管壁也是一层细胞），
 * 管里的红细胞从左往右走，由蓝变红。橙色的氧从空气穿过两层细胞进到红细胞里，灰紫色的二氧化碳反过来。
 * gas：现在看哪种气（null 都不看）；flow：血流动不动；hold：屏住呼吸了多久（0–1）
 */
export const WALL = { len: 3.6, capR: 0.5, capY: -0.56, sheetY: 0, sheetT: 0.07, capT: 0.06, depth: 1.4 }
export function AlveolarWall({ gas, flow, hold }: { gas: GasKey | null; flow: boolean; hold: number }) {
  const L = WALL.len
  // 肺泡壁：一条薄薄的带子，几处鼓起来是细胞核；沿 z 拉出厚度，前面的切面看得见只有一层
  const sheet = useMemo(() => {
    const sh = new THREE.Shape(), N = 80, top: [number, number][] = [], bot: [number, number][] = []
    for (let i = 0; i <= N; i++) {
      const x = -L / 2 + L * i / N, nuc = [-1.1, 0.35, 1.35].reduce((s, c) => s + 0.07 * Math.exp(-(((x - c) / 0.22) ** 2)), 0)
      const y0 = 0.02 * Math.sin(x * 2.1) - 0.04 * Math.exp(-((x / 1.1) ** 2)) * 0
      top.push([x, y0 + WALL.sheetT / 2 + nuc]); bot.push([x, y0 - WALL.sheetT / 2 - nuc * 0.3])
    }
    sh.moveTo(...top[0]); top.forEach(p => sh.lineTo(...p)); for (let i = N; i >= 0; i--) sh.lineTo(...bot[i]); sh.closePath()
    const g = new THREE.ExtrudeGeometry(sh, { depth: WALL.depth, bevelEnabled: false, curveSegments: 4 }); g.translate(0, 0, -WALL.depth + 0.0)
    return g
  }, [L])
  // 毛细血管：剖开的半根管（留下远的那一半），管壁有厚度
  const cap = useMemo(() => {
    const R = WALL.capR, t = WALL.capT, g: THREE.BufferGeometry[] = []
    const outer = new THREE.CylinderGeometry(R, R, L, 48, 1, true, Math.PI / 2, Math.PI), inner = new THREE.CylinderGeometry(R - t, R - t, L, 48, 1, true, Math.PI / 2, Math.PI)
    inner.scale(-1, 1, 1)
    g.push(outer, inner)
    return g.map(x => { x.rotateZ(Math.PI / 2); x.translate(0, WALL.capY, 0); return x })
  }, [L])
  const junction = useMemo(() => [-1.7, -0.6, 0.85, 1.75], [])
  // 红细胞
  const cells = useRef<THREE.InstancedMesh>(null), o2 = useRef<THREE.InstancedMesh>(null), co2 = useRef<THREE.InstancedMesh>(null)
  const rbc = useMemo(() => rbcGeo(0.2), [])
  const NC = 9, st = useMemo(() => Array.from({ length: NC }, (_, i) => ({ s: i / NC, a: i * 1.7 })), [])
  // 气体小球的路：氧 空气 → 穿过肺泡壁 → 穿过毛细血管壁 → 进到血里；二氧化碳反过来
  const paths = useMemo(() => {
    const r = rnd0(23)
    const P = (k: number): V3[] => { const x = -1.5 + 3.0 * r(), z = -0.25 - 0.8 * r(); return k === 0 ? [[x - 0.3, 1.2 + r() * 0.5, z], [x, 0.05, z], [x + 0.05, WALL.capY + WALL.capR - 0.03, z], [x + 0.35, WALL.capY + 0.05 * (r() - 0.5), z + 0.1]] : [[x + 0.2, WALL.capY - 0.1, z], [x, WALL.capY + WALL.capR - 0.03, z], [x - 0.05, 0.05, z], [x - 0.3, 1.25 + r() * 0.5, z]] }
    return { o2: Array.from({ length: 22 }, () => P(0)), co2: Array.from({ length: 18 }, () => P(1)) }
  }, [])
  const t0 = useRef(0)
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), v: new THREE.Vector3(), sc: new THREE.Vector3(1, 1, 1), c: new THREE.Color() }), [])
  useFrame((s, dt0) => {
    const dt = Math.min(dt0, 1 / 30); if (flow) t0.current += dt
    const t = t0.current
    const m = cells.current
    if (m) {
      st.forEach((c, i) => {
        if (flow) c.s = (c.s + dt * 0.07) % 1
        const x = -L / 2 + 0.2 + (L - 0.4) * c.s
        m.setMatrixAt(i, tmp.m.compose(tmp.v.set(x, WALL.capY + 0.04 * Math.sin(i * 2), -0.15 - 0.12 * Math.cos(i)), tmp.q.setFromEuler(tmp.e.set(c.a + s.clock.elapsedTime * 0.4, 0.4 + c.a, 0.3)), tmp.sc.setScalar(1)))
        // 走到哪，血里的氧就是多少（扩散到和肺泡里差不多为止）
        const o = (bloodAlong('o2', c.s, hold) - bloodAlong('o2', 0)) / (bloodAlong('o2', 1, 0) - bloodAlong('o2', 0))
        m.setColorAt(i, oxyColor(o, tmp.c))
      })
      m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true
    }
    // 屏住呼吸时肺泡里的氧少了，往血里走的氧也少
    const rate = 1 - 0.6 * hold
    const run = (mesh: THREE.InstancedMesh | null, ps: V3[][], on: boolean, speed: number) => {
      if (!mesh) return
      ps.forEach((p, i) => {
        const ph = (t * speed + i / ps.length) % 1, legs = p.length - 1, x = ph * legs, k = Math.min(legs - 1, Math.floor(x)), f = x - k, e = f * f * (3 - 2 * f)
        tmp.v.set(p[k][0] + (p[k + 1][0] - p[k][0]) * e, p[k][1] + (p[k + 1][1] - p[k][1]) * e, p[k][2] + (p[k + 1][2] - p[k][2]) * e)
        const vis = on && t > (i / ps.length) / speed && (i / ps.length) < rate + 0.4 ? Math.min(1, ph / 0.08, (1 - ph) / 0.08) : 0
        mesh.setMatrixAt(i, tmp.m.compose(tmp.v, tmp.q.identity(), tmp.sc.setScalar(Math.max(0.0001, vis))))
      })
      mesh.instanceMatrix.needsUpdate = true
    }
    run(o2.current, paths.o2, flow && gas === 'o2', 0.16 * rate)
    run(co2.current, paths.co2, flow && gas === 'co2', 0.14 * rate)
  })
  return <group>
    <mesh geometry={sheet} castShadow receiveShadow><meshPhysicalMaterial color="#f0b3b6" roughness={0.42} clearcoat={0.5} sheen={0.7} sheenColor="#ffe2e2" /></mesh>
    {[-1.1, 0.35, 1.35].map(x => <mesh key={x} position={[x, 0.035, 0.005]} scale={[0.2, 0.05, 0.02]}><sphereGeometry args={[1, 18, 10]} /><meshStandardMaterial color="#7b3f73" roughness={0.5} /></mesh>)}
    {junction.map(x => <mesh key={x} position={[x, 0, 0.004]}><boxGeometry args={[0.012, WALL.sheetT * 1.4, 0.01]} /><meshBasicMaterial color="#9b5560" /></mesh>)}
    {cap.map((g, i) => <mesh key={i} geometry={g} castShadow receiveShadow>{i ? <meshStandardMaterial color="#8a4a54" roughness={0.85} envMapIntensity={0.3} side={THREE.DoubleSide} /> : <meshPhysicalMaterial color="#e7a2a6" roughness={0.42} clearcoat={0.5} sheen={0.6} sheenColor="#ffe0e0" side={THREE.DoubleSide} />}</mesh>)}
    {/* 管壁剖开的两条边 */}
    {[1, -1].map(s => <mesh key={s} position={[0, WALL.capY + s * (WALL.capR - WALL.capT / 2), 0]}><boxGeometry args={[L, WALL.capT, 0.01]} /><meshStandardMaterial color="#d98d93" roughness={0.5} /></mesh>)}
    <instancedMesh ref={cells} args={[rbc, undefined, NC]} frustumCulled={false}><meshPhysicalMaterial roughness={0.35} clearcoat={0.5} /></instancedMesh>
    <instancedMesh ref={o2} args={[undefined, undefined, paths.o2.length]} frustumCulled={false}><sphereGeometry args={[0.05, 14, 10]} /><meshStandardMaterial color="#ff9b2f" emissive="#ff9b2f" emissiveIntensity={0.55} roughness={0.4} /></instancedMesh>
    <instancedMesh ref={co2} args={[undefined, undefined, paths.co2.length]} frustumCulled={false}><sphereGeometry args={[0.05, 14, 10]} /><meshStandardMaterial color="#a493d6" emissive="#a493d6" emissiveIntensity={0.55} roughness={0.4} /></instancedMesh>
  </group>
}
