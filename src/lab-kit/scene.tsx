// 实验页三维部分的通用部件：舞台（画布、镜头、标签、画质分档）、拼模型的小工具、常用的贴图和拖动。
// 各实验室只从 '@/lab-kit' 引用，不要互相引用别的实验室目录里的文件。
import { Suspense, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Environment, OrbitControls, PerformanceMonitor, useTexture } from '@react-three/drei'
import { EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

const SUN = new THREE.Vector3(0.812, 0.334, 0.478)   // 太阳方向（和天空图里的太阳对齐）
const SKY_ROT = 0.096

// ---------- 小工具 ----------
export interface Part { p: [number, number, number]; s: [number, number, number]; c: string; r?: [number, number, number]; cyl?: boolean }
/** 把一批方块 / 圆柱合并成一个带顶点颜色的模型：码头上的静态杂物都这样拼，省绘制次数 */
export function mergeParts(parts: Part[]) {
  const col = new THREE.Color(), e = new THREE.Euler(), m = new THREE.Matrix4()
  return mergeGeometries(parts.map(b => {
    const g = b.cyl ? new THREE.CylinderGeometry(b.s[0], b.s[0], b.s[1], 20) : new THREE.BoxGeometry(...b.s)
    if (b.r) g.applyMatrix4(m.makeRotationFromEuler(e.set(...b.r)))
    g.translate(...b.p)
    col.set(b.c)
    const n = g.attributes.position.count, a = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3))
    return g
  }))
}
export const Painted = ({ rough = 0.6, metal = 0.25 }: { rough?: number; metal?: number }) => <meshStandardMaterial vertexColors roughness={rough} metalness={metal} />

/** 两点之间的一根圆杆 */
export function Rod({ from, to, r = 0.03, children }: { from: [number, number, number]; to: [number, number, number]; r?: number; children: ReactNode }) {
  const { pos, quat, len } = useMemo(() => {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), d = b.clone().sub(a)
    return { pos: a.clone().add(b).multiplyScalar(0.5), len: d.length(), quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()) }
  }, [from[0], from[1], from[2], to[0], to[1], to[2]])   // eslint-disable-line react-hooks/exhaustive-deps
  return <mesh position={pos} quaternion={quat} castShadow><cylinderGeometry args={[r, r, len, 12]} />{children}</mesh>
}

/** 水面波纹用的法线贴图：几组方向不同的正弦波叠出来，四边能无缝拼接 */
let waterNormal: THREE.DataTexture | null = null
function getWaterNormal() {
  if (waterNormal) return waterNormal
  const N = 256, data = new Uint8Array(N * N * 4), TAU = Math.PI * 2
  const waves = [[3, 1, 0.5, 0.3], [-2, 4, 0.36, 1.7], [5, -3, 0.2, 4.1], [1, 6, 0.18, 2.6], [7, 2, 0.1, 5.2], [-4, -7, 0.09, 0.9]]
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let dx = 0, dy = 0
    for (const [kx, ky, a, ph] of waves) { const c = Math.cos((kx * x + ky * y) / N * TAU + ph) * a; dx += c * kx; dy += c * ky }
    const nx = -dx * 0.16, ny = -dy * 0.16, l = Math.hypot(nx, ny, 1), i = (y * N + x) * 4
    data[i] = (nx / l * 0.5 + 0.5) * 255; data[i + 1] = (ny / l * 0.5 + 0.5) * 255; data[i + 2] = (1 / l * 0.5 + 0.5) * 255; data[i + 3] = 255
  }
  const t = new THREE.DataTexture(data, N, N); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true
  return (waterNormal = t)
}
export function useRipple(repeat: number | [number, number], speed = 0.03) {
  const [rx, ry] = typeof repeat === 'number' ? [repeat, repeat] : repeat
  const map = useMemo(() => { const t = getWaterNormal().clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return t }, [rx, ry])
  useFrame((_, dt) => { map.offset.x += dt * speed; map.offset.y += dt * speed * 0.6 })
  return map
}

/** 电子读数屏：深色底、亮字 */
export function Led({ text, w = 0.9, h = 0.34, ...rest }: { text: string; w?: number; h?: number } & Record<string, unknown>) {
  const { tex, ctx } = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 384; c.height = 144
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
    return { tex: t, ctx: c.getContext('2d')! }
  }, [])
  useEffect(() => {
    ctx.fillStyle = '#0c1410'; ctx.fillRect(0, 0, 384, 144)
    ctx.fillStyle = '#7dffb0'; ctx.font = '700 84px ui-monospace, Menlo, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(text, 192, 76); tex.needsUpdate = true
  }, [text, ctx, tex])
  return <mesh {...rest}><planeGeometry args={[w, h]} /><meshBasicMaterial map={tex} toneMapped={false} /></mesh>
}


/** 实拍的混凝土材质（Poly Haven，CC0）：颜色、法线、粗糙度三张，rx、ry 是重复次数 */
export function useConcrete(rx: number, ry: number) {
  const [d, n, r] = useTexture(['/assets/tex/concrete_diff.jpg', '/assets/tex/concrete_nor.jpg', '/assets/tex/concrete_rough.jpg'])
  return useMemo(() => {
    const out = [d, n, r].map(t => { const c = t.clone(); c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(rx, ry); c.anisotropy = 8; c.needsUpdate = true; return c })
    out[0].colorSpace = THREE.SRGBColorSpace
    return out
  }, [d, n, r, rx, ry])
}


/** 直接拖动吊着的物体：上下拖；拖的时候暂停旋转视角。返回要挂到那一组模型上的事件 */
export function useLiftDrag(drop: number, max: number, onDrop: (v: number) => void, about: THREE.Vector3, onEnd?: () => void) {
  const { camera, size, gl } = useThree()
  const controls = useThree(s => s.controls) as { enabled: boolean } | null
  const drag = useRef<{ y: number; drop: number } | null>(null)
  const perPx = () => (2 * camera.position.distanceTo(about) * Math.tan(((camera as THREE.PerspectiveCamera).fov * Math.PI) / 360)) / size.height
  return {
    onPointerDown: (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); (e.target as Element).setPointerCapture(e.pointerId); drag.current = { y: e.nativeEvent.clientY, drop }; if (controls) controls.enabled = false; gl.domElement.style.cursor = 'grabbing' },
    onPointerMove: (e: ThreeEvent<PointerEvent>) => { if (!drag.current) return; const dy = (e.nativeEvent.clientY - drag.current.y) * perPx(); onDrop(Math.round(Math.min(max, Math.max(0, drag.current.drop + dy)) * 100) / 100) },
    onPointerUp: (e: ThreeEvent<PointerEvent>) => { drag.current = null; onEnd?.(); (e.target as Element).releasePointerCapture?.(e.pointerId); if (controls) controls.enabled = true; gl.domElement.style.cursor = 'grab' },
    onPointerCancel: (e: ThreeEvent<PointerEvent>) => { drag.current = null; onEnd?.(); (e.target as Element).releasePointerCapture?.(e.pointerId); if (controls) controls.enabled = true; gl.domElement.style.cursor = '' },
    onPointerOver: () => { if (!drag.current) gl.domElement.style.cursor = 'grab' },
    onPointerOut: () => { if (!drag.current) gl.domElement.style.cursor = '' },
  }
}

/** 力的箭头：tip 是箭头尖顶到的位置，dir 是它指的方向，len 是长度。不受遮挡，随时看得见 */
export function ForceArrow({ tip, dir, len, color, opacity = 1, thick = 1 }: { tip: [number, number, number]; dir: [number, number, number]; len: number; color: string; opacity?: number; thick?: number }) {
  const quat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...dir).normalize()), [dir[0], dir[1], dir[2]])   // eslint-disable-line react-hooks/exhaustive-deps
  if (len < 0.03 * thick) return null
  const head = Math.min(0.24 * thick, len * 0.6), shaft = len - head
  const mat = <meshBasicMaterial color={color} depthTest={false} transparent opacity={opacity} toneMapped={false} />
  return (
    <group position={tip} quaternion={quat}>
      <mesh position={[0, -head - shaft / 2, 0]} renderOrder={10}><cylinderGeometry args={[0.04 * thick, 0.04 * thick, shaft, 12]} />{mat}</mesh>
      <mesh position={[0, -head / 2, 0]} renderOrder={10}><coneGeometry args={[0.115 * thick, head, 16]} />{mat}</mesh>
    </group>
  )
}


// ---------- 镜头、标签、舞台 ----------
/** 镜头：斜侧俯视；宽屏时给右边的面板让出位置 */
function Rig({ home, target, span, view }: { home: number; target: THREE.Vector3; span: [number, number]; view: [number, number] }) {
  const { camera, size, scene } = useThree()
  const controls = useThree(s => s.controls) as (THREE.EventDispatcher & { target: THREE.Vector3; minDistance: number; maxDistance: number; enabled: boolean; update: () => void }) | null
  useEffect(() => { if (import.meta.env.DEV) Object.assign(window, { __scene: scene, __camera: camera }) }, [scene, camera])   // 仅开发时：方便在控制台里检查场景
  // 画布尺寸变了、按了复位：直接跳到默认机位。看向的地方变了（同一个大场景里换到另一处）：飞过去
  const seen = useRef({ w: 0, h: 0, home: -1 })
  const fly = useRef<{ t: number; p0: THREE.Vector3; l0: THREE.Vector3; p1: THREE.Vector3; l1: THREE.Vector3; d0: number; d1: number } | null>(null)
  const range = (dist: number) => { const cam = camera as THREE.PerspectiveCamera; cam.near = Math.max(0.3, dist * 0.02); cam.far = Math.max(900, dist * 40); cam.updateProjectionMatrix() }
  useEffect(() => {
    if (size.width < 2 || size.height < 2) return
    const wide = size.width >= 1024
    const usableW = Math.max(240, size.width - (wide ? 650 : 0)), usableH = Math.max(200, size.height - (wide ? 215 : 0))
    const tan = Math.tan((34 * Math.PI) / 360) * 2
    const dist = Math.max(span[1] / (tan * (usableH / size.height)), span[0] / (tan * (size.width / size.height) * (usableW / size.width)))
    const [az, el] = view
    const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el))
    const right = new THREE.Vector3(Math.cos(az), 0, -Math.sin(az))
    // 面板在右边：把看向的点往右挪，器材就落在画面偏左
    const shift = wide ? 25 * ((tan * dist) / size.height) : 0
    const look = target.clone().addScaledVector(right, shift)
    if (wide) look.y -= 52 * ((tan * dist) / size.height)   // 底部有操作条，画面整体往上让一点
    const pos = look.clone().addScaledVector(dir, dist)
    const snap = !controls || seen.current.home < 0 || seen.current.w !== size.width || seen.current.h !== size.height || seen.current.home !== home
    seen.current = { w: size.width, h: size.height, home }
    if (snap) {
      fly.current = null
      camera.position.copy(pos); camera.lookAt(look); range(dist)
      if (controls) { controls.enabled = true; controls.target.copy(look); controls.minDistance = dist * 0.4; controls.maxDistance = dist * 2.2; controls.update() }
    } else {
      const d0 = camera.position.distanceTo(controls.target)
      fly.current = { t: 0, p0: camera.position.clone(), l0: controls.target.clone(), p1: pos, l1: look, d0, d1: dist }
      controls.enabled = false; controls.minDistance = 0; controls.maxDistance = Infinity
      range(Math.min(d0, dist)); (camera as THREE.PerspectiveCamera).far = Math.max(900, Math.max(d0, dist) * 40 + pos.distanceTo(camera.position)); camera.updateProjectionMatrix()
    }
  }, [camera, controls, size.width, size.height, home, target, span, view])   // eslint-disable-line react-hooks/exhaustive-deps
  useFrame((_, dt) => {
    const f = fly.current; if (!f || !controls) return
    const far = f.p0.distanceTo(f.p1)
    f.t = Math.min(1, f.t + dt / Math.min(3.2, 1.4 + far / 160))
    const k = f.t < 0.5 ? 4 * f.t ** 3 : 1 - Math.pow(-2 * f.t + 2, 3) / 2           // 先慢、中间快、最后慢
    camera.position.lerpVectors(f.p0, f.p1, k); controls.target.lerpVectors(f.l0, f.l1, k)
    camera.position.y += Math.sin(k * Math.PI) * Math.min(60, far * 0.12)            // 中途抬高一点，像越过去
    camera.lookAt(controls.target)
    if (f.t >= 1) { fly.current = null; range(f.d1); controls.minDistance = f.d1 * 0.4; controls.maxDistance = f.d1 * 2.2; controls.enabled = true; controls.update() }
  })
  // 平移时，看向的点不能离器材太远
  useEffect(() => {
    if (!controls) return
    const lo = target.clone().add(new THREE.Vector3(-8, -3.4, -7)), hi = target.clone().add(new THREE.Vector3(8, 5, 7)), c = new THREE.Vector3()
    const clamp = () => { if (fly.current) return; c.copy(controls.target).clamp(lo, hi); if (c.distanceToSquared(controls.target) > 1e-8) { camera.position.add(c.clone().sub(controls.target)); controls.target.copy(c) } }
    controls.addEventListener('change' as never, clamp)
    return () => controls.removeEventListener('change' as never, clamp)
  }, [controls, camera, target])
  return null
}

/** 把三维位置投到屏幕上，驱动画布外面的文字标签 */
/** ax：标签的哪一处对准这个点（0 左边缘，0.5 中间，1 右边缘）。标签不会被推出画面 */
export interface Tag { id: string; at: [number, number, number]; ax?: number }
function TagProjector({ tags, els }: { tags: Tag[]; els: React.RefObject<Record<string, HTMLDivElement | null>> }) {
  const v = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ camera, size }) => {
    for (const t of tags) {
      const el = els.current[t.id]; if (!el) continue
      v.set(...t.at).project(camera)
      const w = el.offsetWidth, x = ((v.x + 1) / 2) * size.width - (t.ax ?? 0) * w
      el.style.left = `${Math.min(Math.max(6, x), Math.max(6, size.width - w - 6))}px`; el.style.top = `${((1 - v.y) / 2) * size.height}px`
    }
  })
  return null
}

/** 画面上的一个文字标签。name：器材名称（开头显示几秒后淡出，可用“名称”开关叫回来） */
export interface Label extends Tag { className: string; style?: CSSProperties; name?: boolean; children: ReactNode }

/** 舞台：画布、天空、灯光、镜头控制、文字标签、后期和画质分档都在这里。children 是场景里的东西（整个世界和这一课的器材） */
const VIEW: [number, number] = [-0.42, 0.2]
/** view：默认机位的方位角和仰角；pan：平移时看向的点能离 target 多远 */
/** target：镜头看向哪里；span：要装进画面的宽和高（m）；sky：背景要不要画天空（不画时用 backdrop 这个颜色）；fog：雾的起止距离；sun：阳光强度 */
export interface StageProps { labels: Label[]; target: THREE.Vector3; span: [number, number]; view?: [number, number]; backdrop?: string; sky?: boolean; fog?: [number, number]; sun?: number; children: ReactNode }
export function Stage({ labels, target, span, view = VIEW, backdrop = '#1c2125', sky = true, fog = [70, 420], sun = 3.4, children }: StageProps) {
  const aim = useMemo(() => { const o = new THREE.Object3D(); o.position.set(target.x, 0, target.z); o.updateMatrixWorld(); return o }, [target])   // 阳光对着这一课的器材，影子才落在画面里
  const [home, setHome] = useState(0)                 // 每加一，镜头回到默认位置
  const [names, setNames] = useState(true)
  useEffect(() => { setNames(true); const t = setTimeout(() => setNames(false), 9000); return () => clearTimeout(t) }, [target])   // 换到另一处，器材名称再显示一遍
  const els = useRef<Record<string, HTMLDivElement | null>>({})
  // 画质三档：2 全开；1 环境遮蔽减半；0 只留色调。手机从 1 起步，帧率不够再自动降一档
  const [tier, setTier] = useState(() => (typeof window !== 'undefined' && (window.innerWidth < 820 || window.matchMedia('(pointer: coarse)').matches) ? 1 : 2))
  return (
    <div className="relative size-full">
      <Canvas onDoubleClick={() => setHome(h => h + 1)} shadows dpr={[1, tier === 2 ? 1.75 : tier === 1 ? 1.5 : 1.25]} camera={{ fov: 34, near: 0.5, far: 900 }} gl={{ antialias: false }}>
        <color attach="background" args={[sky ? '#9fb4c8' : backdrop]} />
        <fog attach="fog" args={[sky ? '#b7c4d0' : backdrop, fog[0], fog[1]]} />
        <Rig home={home} target={target} span={span} view={view} />
        <PerformanceMonitor bounds={() => [32, 70]} flipflops={2} onDecline={() => setTier(t => Math.max(0, t - 1))} />
        <ambientLight intensity={0.12} />
        {/* 傍晚的斜阳：方向和天空图里的太阳一致，拉出长影子 */}
        <primitive object={aim} />
        <directionalLight castShadow target={aim} position={SUN.clone().multiplyScalar(60).add(new THREE.Vector3(1, 0, 0)).add(aim.position).toArray()} intensity={sun} color="#ffe0b8"
          shadow-mapSize={tier === 0 ? [1024, 1024] : [2048, 2048]} shadow-bias={-0.0006} shadow-normalBias={0.03} shadow-radius={5}>
          <orthographicCamera attach="shadow-camera" args={[-24, 16, 18, -14, 1, 140]} />
        </directionalLight>
        <Suspense fallback={null}>
          {/* 实拍天空（Poly Haven，CC0）：背景、环境光、反射都用它 */}
          <Environment files="/assets/env/sky_1k.hdr" background={sky} backgroundBlurriness={0.04} environmentIntensity={1.15}
            backgroundRotation={[0, SKY_ROT, 0]} environmentRotation={[0, SKY_ROT, 0]} />
          {children}
        </Suspense>
        <TagProjector tags={labels} els={els} />
        <OrbitControls makeDefault enablePan enableDamping dampingFactor={0.08} rotateSpeed={0.6} minPolarAngle={0.25} maxPolarAngle={1.52} />
        {tier === 2 && <EffectComposer key="hi" multisampling={0}>
          <N8AO aoRadius={1.6} intensity={1.8} distanceFalloff={1} quality="medium" />
          <Vignette offset={0.3} darkness={0.36} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          <SMAA />
        </EffectComposer>}
        {tier === 1 && <EffectComposer key="mid" multisampling={0}>
          <N8AO aoRadius={1.6} intensity={1.8} distanceFalloff={1} quality="low" halfRes />
          <Vignette offset={0.3} darkness={0.36} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          <SMAA />
        </EffectComposer>}
        {tier === 0 && <EffectComposer key="lo" multisampling={0}>
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>}
      </Canvas>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {labels.map(l => (
          <div key={l.id} ref={e => { els.current[l.id] = e }} className={`absolute ${l.className}`} style={{ ...l.style, ...(l.name ? { opacity: names ? 1 : 0 } : null) }}>{l.children}</div>
        ))}
      </div>
      <div className="glass absolute bottom-3 left-3 flex rounded-xl p-1 lg:bottom-4 lg:left-5">
        <button className="scene-btn" aria-pressed={names} onClick={() => setNames(n => !n)}>名称</button>
        <button className="scene-btn" onClick={() => setHome(h => h + 1)}>复位视角</button>
      </div>
    </div>
  )
}
