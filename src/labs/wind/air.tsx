// 把看不见的大气画出来的几样东西：半透明的大气剖面（按冷暖着色）、沿流线走的气流粒子、弯曲的等压面、
// 太阳短波和长波辐射的光束、烟囱的烟。冷暖着色全间统一：暖红、冷蓝；辐射：短波黄、长波红。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

type V3 = [number, number, number]
/** 风场：给一个位置，返回那里的风（场景单位/秒） */
export type Wind = (x: number, y: number, z: number) => V3
export const WARM = '#ff5a3c', COLD = '#3f8cff', SHORT = '#ffd23f', LONG = '#ff6a3d'
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))

// ---------- 大气剖面 ----------
/**
 * 竖着的一片半透明大气（在 x-y 平面里，位于 z）：field(u, v) 给出 0–1 坐标处的冷暖（−1 冷、+1 暖），amount 是着色的深浅。
 * fieldKey 变了才重新取样。四周一圈细框，看得出这是剖开的一片。
 */
export function Slab({ x0, x1, y0, y1, z, field, fieldKey, amount = 1, depth = 0, tint = 0.05, mask }: { x0: number; x1: number; y0: number; y1: number; z: number; field: (u: number, v: number) => number; fieldKey: string; amount?: number; depth?: number; tint?: number; mask?: (u: number, v: number) => boolean }) {
  const NX = 96, NY = 64
  const tex = useMemo(() => { const t = new THREE.DataTexture(new Uint8Array(NX * NY * 4), NX, NY); t.magFilter = t.minFilter = THREE.LinearFilter; t.needsUpdate = true; return t }, [])
  const goal = useMemo(() => { const a = new Float32Array(NX * NY); for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) a[j * NX + i] = clamp(field((i + 0.5) / NX, (j + 0.5) / NY), -1, 1); return a }, [fieldKey])   // eslint-disable-line react-hooks/exhaustive-deps
  // 剖面伸进山里的部分不画：贴图的绿色通道记下哪些格子在空气里
  useMemo(() => { const d = tex.image.data as Uint8Array; for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) d[(j * NX + i) * 4 + 1] = !mask || mask((i + 0.5) / NX, (j + 0.5) / NY) ? 255 : 0; tex.needsUpdate = true }, [tex])   // eslint-disable-line react-hooks/exhaustive-deps
  const cur = useRef<Float32Array | null>(null)
  const mat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { uF: { value: tex }, uA: { value: 0 }, uTint: { value: tint } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform sampler2D uF; uniform float uA, uTint; varying vec2 vUv;
      void main(){ float v = texture2D(uF, vUv).r * 2.0 - 1.0; v *= uA;
        vec3 warm = vec3(0.95, 0.2, 0.08), cold = vec3(0.06, 0.32, 0.95), air = vec3(0.72, 0.84, 1.0);
        vec3 c = v > 0.0 ? mix(air, warm, min(1.0, v * 1.4)) : mix(air, cold, min(1.0, -v * 1.4));
        float a = uTint + pow(abs(v), 0.6) * 0.8;
        float e = min(min(vUv.x, 1.0 - vUv.x) * ${(x1 - x0).toFixed(2)}, min(vUv.y, 1.0 - vUv.y) * ${(y1 - y0).toFixed(2)});
        if (e < 0.14) { c = vec3(1.0); a = 0.75; }
        a *= texture2D(uF, vUv).g;
        if (a < 0.004) discard;
        gl_FragColor = vec4(c, a); }`,
  }), [tex, x0, x1, y0, y1])   // eslint-disable-line react-hooks/exhaustive-deps
  useFrame((_, d) => {
    if (!cur.current) cur.current = Float32Array.from(goal)
    const c = cur.current, k = Math.min(1, d * 1.2), data = tex.image.data as Uint8Array; let moved = false
    for (let i = 0; i < c.length; i++) { const n = c[i] + (goal[i] - c[i]) * k; if (Math.abs(n - c[i]) > 1e-4) moved = true; c[i] = n; data[i * 4] = Math.round((n * 0.5 + 0.5) * 255) }
    if (moved || !tex.userData.init) { tex.needsUpdate = true; tex.userData.init = true }
    mat.uniforms.uA.value += (amount - mat.uniforms.uA.value) * Math.min(1, d * 1.5)
  })
  return <group>
    <mesh position={[(x0 + x1) / 2, (y0 + y1) / 2, z]} material={mat} renderOrder={6}><planeGeometry args={[x1 - x0, y1 - y0]} /></mesh>
    {depth > 0 && <mesh position={[(x0 + x1) / 2, y1, z - depth / 2]} rotation-x={-Math.PI / 2} renderOrder={6}><planeGeometry args={[x1 - x0, depth]} /><meshBasicMaterial color="#cfe0ff" transparent opacity={0.06} depthWrite={false} side={THREE.DoubleSide} /></mesh>}
  </group>
}

// ---------- 气流 ----------
/** 一条流线：一串点（closed 时首尾相接），heat 是每个点的冷暖（−1–1），粒子按它着色 */
export interface Stream { pts: V3[]; heat?: number[]; closed?: boolean }
const UP = new THREE.Vector3(0, 1, 0)
/** 沿流线走的箭头粒子，外加一条淡淡的线。on 0–1 淡入淡出；speed 场景单位/秒 */
export function Streams({ streams, on, speed = 3, per = 0.9, size = 1, line = 0.35 }: { streams: Stream[]; on: number; speed?: number; per?: number; size?: number; line?: number }) {
  const data = useMemo(() => streams.map(s => {
    const curve = new THREE.CatmullRomCurve3(s.pts.map(p => new THREE.Vector3(...p)), !!s.closed, 'centripetal')
    const len = curve.getLength(), n = Math.max(3, Math.round(len * per / 3.2))
    const heatAt = (t: number) => { if (!s.heat) return 0; const f = t * (s.heat.length - (s.closed ? 0 : 1)), i = Math.floor(f) % s.heat.length, j = (i + 1) % s.heat.length; return s.heat[i] + (s.heat[j] - s.heat[i]) * (f - Math.floor(f)) }
    return { curve, len, n, heatAt, closed: !!s.closed, line: new THREE.TubeGeometry(curve, Math.max(40, Math.round(len * 3)), 0.05 * size, 6, !!s.closed) }
  }), [streams])   // eslint-disable-line react-hooks/exhaustive-deps
  const total = data.reduce((a, d) => a + d.n, 0)
  const mesh = useMemo(() => {
    const cone = new THREE.ConeGeometry(0.22 * size, 0.7 * size, 10); cone.translate(0, 0.1 * size, 0)
    const tail = new THREE.CylinderGeometry(0.07 * size, 0.02 * size, 0.9 * size, 6); tail.translate(0, -0.6 * size, 0)
    const merged = new THREE.BufferGeometry()
    const a = cone.toNonIndexed(), b = tail.toNonIndexed()
    const pos = new Float32Array([...(a.attributes.position.array as Float32Array), ...(b.attributes.position.array as Float32Array)])
    merged.setAttribute('position', new THREE.BufferAttribute(pos, 3)); merged.computeVertexNormals()
    const m = new THREE.InstancedMesh(merged, new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, depthWrite: false }), Math.max(1, total))
    m.frustumCulled = false; m.renderOrder = 9
    const white = new THREE.Color('#ffffff'); for (let i = 0; i < Math.max(1, total); i++) m.setColorAt(i, white)
    return m
  }, [total, size])
  const lineMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#e8f1ff', transparent: true, opacity: 0, depthWrite: false, toneMapped: false }), [])
  const fade = useRef(0), clock = useRef(0)
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3(), p: new THREE.Vector3(), t: new THREE.Vector3(), c: new THREE.Color(), w: new THREE.Color(WARM), k: new THREE.Color(COLD), n: new THREE.Color('#f4f8ff') }), [])
  useFrame((_, d) => {
    const dt = Math.min(d, 1 / 30); clock.current += dt
    fade.current += (on - fade.current) * Math.min(1, dt * 2)
    lineMat.opacity = fade.current * line
    const mat = mesh.material as THREE.MeshBasicMaterial; mat.opacity = fade.current; mesh.visible = fade.current > 0.01
    let i = 0
    for (const s of data) for (let k = 0; k < s.n; k++) {
      let u = ((clock.current * speed) / s.len + k / s.n) % 1
      const edge = s.closed ? 1 : clamp(Math.min(u, 1 - u) / 0.08)
      if (!s.closed) u = Math.min(0.999, u)
      s.curve.getPointAt(u, tmp.p); s.curve.getTangentAt(u, tmp.t)
      tmp.q.setFromUnitVectors(UP, tmp.t.normalize()); const sc = 0.4 + 0.6 * edge
      tmp.m.compose(tmp.p, tmp.q, tmp.s.set(sc, sc, sc)); mesh.setMatrixAt(i, tmp.m)
      const h = s.heatAt(u); tmp.c.copy(tmp.n).lerp(h > 0 ? tmp.w : tmp.k, Math.min(1, Math.abs(h)))
      mesh.setColorAt(i, tmp.c); i++
    }
    mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })
  return <group>
    <primitive object={mesh} />
    {data.map((s, i) => <mesh key={i} geometry={s.line} material={lineMat} renderOrder={8} />)}
  </group>
}

/** 一条闭合的环流：沿着一个圆角矩形走（cw 为真时顺时针，从镜头这边看）。左下角 (xa, ya)、右上角 (xb, yb) */
export function loop(xa: number, xb: number, ya: number, yb: number, z: number, cw: boolean, hot: 'left' | 'right'): Stream {
  const r = Math.min(xb - xa, yb - ya) * 0.32, n = 6
  const pts: V3[] = [], heat: number[] = []
  const corner = (cx: number, cy: number, a0: number) => { for (let i = 0; i <= n; i++) { const a = a0 + (i / n) * (Math.PI / 2); pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, z]) } }
  // 逆时针：右下 → 右上 → 左上 → 左下
  corner(xb - r, ya + r, -Math.PI / 2); corner(xb - r, yb - r, 0); corner(xa + r, yb - r, Math.PI / 2); corner(xa + r, ya + r, Math.PI)
  for (const p of pts) { const u = (p[0] - xa) / (xb - xa), v = (p[1] - ya) / (yb - ya); const side = hot === 'right' ? u : 1 - u; heat.push(clamp((side - 0.5) * 2.4 * (1 - v * 0.4), -1, 1)) }
  if (cw) { pts.reverse(); heat.reverse() }
  return { pts, heat, closed: true }
}

// ---------- 等压面 ----------
/** 一张弯曲的等压面：h(x) 给出各处的高度，在 z0–z1 之间铺开；高出平均的地方偏暖色、低的偏冷色只是提示形状，统一用淡蓝白 */
export function Iso({ x0, x1, z0, z1, h, hKey, on, color = '#6f9dff' }: { x0: number; x1: number; z0: number; z1: number; h: (x: number) => number; hKey: string; on: number; color?: string }) {
  const { geo, edge } = useMemo(() => {
    const NX = 80, g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, NX, 2); g.rotateX(-Math.PI / 2)
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) { const x = p.getX(i) + (x0 + x1) / 2; p.setX(i, x); p.setZ(i, p.getZ(i) + (z0 + z1) / 2); p.setY(i, h(x)) }
    g.computeVertexNormals()
    const e: THREE.Vector3[] = []; for (let i = 0; i <= NX; i++) { const x = x0 + (i / NX) * (x1 - x0); e.push(new THREE.Vector3(x, h(x), z1 + 0.15)) }
    return { geo: g, edge: new THREE.TubeGeometry(new THREE.CatmullRomCurve3(e), NX * 2, 0.11, 6) }
  }, [hKey, x0, x1, z0, z1])   // eslint-disable-line react-hooks/exhaustive-deps
  const mat = useRef<THREE.MeshStandardMaterial>(null), lm = useRef<THREE.MeshBasicMaterial>(null), f = useRef(0)
  useFrame((_, d) => { f.current += (on - f.current) * Math.min(1, d * 2); if (mat.current) mat.current.opacity = 0.42 * f.current; if (lm.current) lm.current.opacity = Math.min(1, f.current * 1.8) })
  return <group>
    <mesh geometry={geo} renderOrder={7}><meshStandardMaterial ref={mat} color={color} transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} roughness={0.4} emissive={color} emissiveIntensity={0.25} /></mesh>
    <mesh geometry={edge} renderOrder={8}><meshBasicMaterial ref={lm} color="#2a66d8" transparent opacity={0} depthWrite={false} toneMapped={false} /></mesh>
  </group>
}

// ---------- 辐射 ----------
const RAY_V = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`
const RAY_F = `uniform float uT, uOn, uN; uniform vec3 uC; varying vec2 vUv;
void main(){ float u = vUv.x; float s = fract(u * uN - uT); float pulse = 0.45 + 0.55 * smoothstep(0.0, 0.5, s) * (1.0 - smoothstep(0.5, 1.0, s));
  float ends = smoothstep(0.0, 0.04, u) * (1.0 - smoothstep(0.96, 1.0, u)); float a = pulse * ends * uOn; if (a < 0.01) discard; gl_FragColor = vec4(uC * (0.9 + 0.5 * pulse), a); }`
/**
 * 一束辐射：沿 pts 这条折线走的波浪线（在剖面里摆动），末端一个箭头。wave 是波长（短波短、长波长），amp 振幅。
 * on 0–1；k 是这一束的强弱（变粗、变亮）
 */
export function Ray({ pts, color, wave, amp, on, k = 1, r = 0.09 }: { pts: V3[]; color: string; wave: number; amp: number; on: number; k?: number; r?: number }) {
  const { geo, tip, dir } = useMemo(() => {
    const base = new THREE.CurvePath<THREE.Vector3>()
    for (let i = 0; i < pts.length - 1; i++) base.add(new THREE.LineCurve3(new THREE.Vector3(...pts[i]), new THREE.Vector3(...pts[i + 1])))
    const L = base.getLength(), N = Math.max(60, Math.round(L / wave * 18)), out: THREE.Vector3[] = []
    const p = new THREE.Vector3(), t = new THREE.Vector3(), nrm = new THREE.Vector3()
    for (let i = 0; i <= N; i++) {
      const u = i / N; base.getPointAt(u, p); base.getTangentAt(u, t)
      nrm.set(-t.y, t.x, 0).normalize()
      const fade = Math.min(1, u / 0.06, (1 - u) / 0.1)
      out.push(p.clone().addScaledVector(nrm, Math.sin(u * L / wave * Math.PI * 2) * amp * Math.max(0, fade)))
    }
    const c = new THREE.CatmullRomCurve3(out)
    const end = new THREE.Vector3(...pts[pts.length - 1]), prev = new THREE.Vector3(...pts[pts.length - 2])
    return { geo: new THREE.TubeGeometry(c, N * 2, r, 6), tip: end, dir: end.clone().sub(prev).normalize() }
  }, [JSON.stringify(pts), wave, amp, r])   // eslint-disable-line react-hooks/exhaustive-deps
  const mat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: RAY_V, fragmentShader: RAY_F, transparent: true, depthWrite: false, toneMapped: false, uniforms: { uT: { value: 0 }, uOn: { value: 0 }, uN: { value: 6 }, uC: { value: new THREE.Color(color) } } }), [])   // eslint-disable-line react-hooks/exhaustive-deps
  const head = useRef<THREE.Mesh>(null), cur = useRef(0)
  useFrame(({ clock }, d) => {
    cur.current += (on - cur.current) * Math.min(1, d * 2.2)
    mat.uniforms.uT.value = clock.elapsedTime * 1.4; mat.uniforms.uOn.value = cur.current * (0.35 + 0.65 * k); mat.uniforms.uC.value.set(color)
    if (head.current) { (head.current.material as THREE.MeshBasicMaterial).opacity = cur.current * (0.4 + 0.6 * k); head.current.visible = cur.current > 0.02 }
  })
  const q = useMemo(() => new THREE.Quaternion().setFromUnitVectors(UP, dir), [dir])
  return <group>
    <mesh geometry={geo} material={mat} renderOrder={10} scale={1} />
    <mesh ref={head} position={tip} quaternion={q} renderOrder={10}><coneGeometry args={[r * 3.4, r * 8, 12]} /><meshBasicMaterial color={color} transparent depthWrite={false} toneMapped={false} /></mesh>
  </group>
}

// ---------- 烟 ----------
let puff: THREE.CanvasTexture | null = null
function puffTex() {
  if (puff) return puff
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d')!
  let s = 3; const r = () => (s = (s * 16807) % 2147483647) / 2147483647
  for (let i = 0; i < 18; i++) { const a = r() * 6.28, dd = r() * 26, x = 64 + Math.cos(a) * dd, y = 64 + Math.sin(a) * dd, R = 18 + r() * 26; const q = g.createRadialGradient(x, y, 0, x, y, R); q.addColorStop(0, 'rgba(255,255,255,0.5)'); q.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = q; g.fillRect(0, 0, S, S) }
  puff = new THREE.CanvasTexture(c); puff.colorSpace = THREE.SRGBColorSpace; return puff
}
/** 从 from 冒出来的烟：一团团随风飘、越飘越大越淡。wind 给出每一处的风 */
export function Smoke({ from, wind, on, n = 90, life = 9, color = '#8d8a85' }: { from: V3; wind: Wind; on: number; n?: number; life?: number; color?: string }) {
  const st = useMemo(() => Array.from({ length: n }, (_, i) => {
    const m = new THREE.SpriteMaterial({ map: puffTex(), transparent: true, depthWrite: false, opacity: 0, color }); const sp = new THREE.Sprite(m); sp.renderOrder = 11
    return { sp, age: (i / n) * life, p: new THREE.Vector3(...from), rot: i * 2.3 }
  }), [n])   // eslint-disable-line react-hooks/exhaustive-deps
  const cur = useRef(0), w = useRef(wind); w.current = wind
  const fromV = useMemo(() => new THREE.Vector3(...from), [from[0], from[1], from[2]])   // eslint-disable-line react-hooks/exhaustive-deps
  useFrame((_, d) => {
    const dt = Math.min(d, 1 / 30); cur.current += (on - cur.current) * Math.min(1, dt * 1.5)
    for (const q of st) {
      q.age += dt
      if (q.age > life) { q.age -= life; q.p.copy(fromV) }
      const v = w.current(q.p.x, q.p.y, q.p.z); q.p.x += v[0] * dt; q.p.y += (v[1] + 0.35) * dt; q.p.z += v[2] * dt
      const k = q.age / life, m = q.sp.material as THREE.SpriteMaterial
      m.opacity = cur.current * Math.min(1, k * 8) * (1 - k * 0.8) * 0.95; q.sp.visible = m.opacity > 0.01
      const s = 0.9 + k * 4.2; q.sp.scale.set(s, s, 1); q.sp.position.copy(q.p); m.rotation = q.rot + k
    }
  })
  return <group>{st.map((q, i) => <primitive key={i} object={q.sp} />)}</group>
}

// ---------- 云 ----------
/** 一片积云：在 c 周围 size 的范围里摆 n 团。amount 0–1；dark 云底灰一些 */
export function Cloud({ c, size, n = 14, r = [3, 6], amount = 1, dark = 0, seed = 1 }: { c: V3; size: V3; n?: number; r?: [number, number]; amount?: number; dark?: number; seed?: number }) {
  const st = useMemo(() => {
    let s = seed * 7919 + 17; const rn = () => (s = (s * 16807) % 2147483647) / 2147483647
    return Array.from({ length: n }, () => {
      const m = new THREE.SpriteMaterial({ map: puffTex(), transparent: true, depthWrite: false, opacity: 0 }); const sp = new THREE.Sprite(m)
      const R = r[0] + (r[1] - r[0]) * rn(), low = rn()
      sp.position.set(c[0] + (rn() - 0.5) * size[0], c[1] + (low - 0.3) * size[1], c[2] + (rn() - 0.5) * size[2]); sp.scale.set(R * 1.3, R, 1); m.rotation = rn() * 6.28; sp.renderOrder = 12
      return { sp, low }
    })
  }, [n, seed, c[0], c[1], c[2]])   // eslint-disable-line react-hooks/exhaustive-deps
  const cur = useRef(0)
  useFrame((_, d) => {
    cur.current += (amount - cur.current) * Math.min(1, d * 1.2)
    for (const q of st) { const m = q.sp.material as THREE.SpriteMaterial; m.opacity = Math.min(1, cur.current) * 0.95; q.sp.visible = m.opacity > 0.01; const g = 1 - dark * (0.5 - q.low * 0.35); m.color.setRGB(g, g, g * 1.02) }
  })
  return <group>{st.map((q, i) => <primitive key={i} object={q.sp} />)}</group>
}

// ---------- 空气粒子 ----------
let dotTex: THREE.CanvasTexture | null = null
function getDot() {
  if (dotTex) return dotTex
  const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d')!, q = g.createRadialGradient(16, 16, 0, 16, 16, 16)
  q.addColorStop(0, 'rgba(255,255,255,1)'); q.addColorStop(0.5, 'rgba(255,255,255,0.7)'); q.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = q; g.fillRect(0, 0, 32, 32)
  return (dotTex = new THREE.CanvasTexture(c))
}
/**
 * 剖面里的一颗颗空气粒子：在原地轻轻抖动；drift(x, y) 给出它们被带着走的速度（场景单位/秒，没有就不动），
 * heat(x, y) 给出冷暖（−1–1）着色。粒子跑出范围就从另一边回来。
 */
export function Motes({ x0, x1, y0, y1, z, n = 260, heat, drift, size = 1.3, floor }: { x0: number; x1: number; y0: number; y1: number; z: number; n?: number; heat?: (x: number, y: number) => number; drift?: (x: number, y: number) => [number, number]; size?: number; floor?: (x: number) => number }) {
  const { geo, pts } = useMemo(() => {
    let s = 77; const r = () => (s = (s * 16807) % 2147483647) / 2147483647
    const pts = Array.from({ length: n }, () => ({ x: x0 + r() * (x1 - x0), y: y0 + r() * (y1 - y0), ph: r() * 6.28 }))
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3))
    return { geo: g, pts }
  }, [n, x0, x1, y0, y1])
  const h = useRef(heat), dr = useRef(drift); h.current = heat; dr.current = drift
  const c = useMemo(() => ({ w: new THREE.Color(WARM), k: new THREE.Color(COLD), a: new THREE.Color('#6d8db0'), t: new THREE.Color() }), [])
  useFrame(({ clock }, d) => {
    const dt = Math.min(d, 1 / 30), t = clock.elapsedTime, P = geo.attributes.position as THREE.BufferAttribute, C = geo.attributes.color as THREE.BufferAttribute
    pts.forEach((p, i) => {
      const v = dr.current?.(p.x, p.y)
      if (v) { p.x += v[0] * dt; p.y += v[1] * dt }
      if (p.x < x0) p.x += x1 - x0; if (p.x > x1) p.x -= x1 - x0
      const lo = Math.max(y0, floor?.(p.x) ?? y0)
      if (p.y < lo) p.y = y1 - (lo - p.y); if (p.y > y1) p.y = lo + (p.y - y1)
      P.setXYZ(i, p.x + Math.sin(t * 1.7 + p.ph) * 0.12, p.y + Math.cos(t * 1.3 + p.ph * 2) * 0.12, z)
      const hv = h.current?.(p.x, p.y) ?? 0
      c.t.copy(c.a).lerp(hv > 0 ? c.w : c.k, Math.min(1, Math.abs(hv) * 1.3)); C.setXYZ(i, c.t.r, c.t.g, c.t.b)
    })
    P.needsUpdate = true; C.needsUpdate = true
  })
  return <points geometry={geo} renderOrder={9} frustumCulled={false}><pointsMaterial map={getDot()} vertexColors size={size} sizeAttenuation transparent opacity={0.95} depthWrite={false} toneMapped={false} /></points>
}
