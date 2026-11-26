// 人体模型的头颈部：沿正中矢状面剖开（教材上常见的侧剖图），留下人的左半边，剖面朝人的右侧（镜头从那边看）。
// 剖面上看得见嘴唇、牙齿、舌、硬腭和软腭、鼻腔、咽、会厌、喉和气管、食道，以及颅骨、脑、颈椎；皮肤和皮下组织是暖色的柔和截面。
// 三对唾液腺在剖面的另一侧，叠在剖面上画（像教材插图那样）。坐标是身体的：1 个单位 = 10 cm，人面朝 +z。
// 只在看头颈部的时候显示（look.head），全身的画面里交给半透明的身体外壳。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { chain, ellipsoid, fbm, lin, mix3, noise, roundCone, smin, sminAll, surfaceNetsGen, type V3 } from './sdf'
import { planarUV, tissueBump } from './tube'
import { prioOf, useJob } from './job'

// ---------- 形状 ----------
const HEAD_C: V3 = [0, 16.5, 0.05], HEAD_R: V3 = [0.72, 0.96, 0.88]
function outer(x: number, y: number, z: number) {
  return sminAll([
    ellipsoid(x, y, z, HEAD_C, HEAD_R),
    ellipsoid(x, y, z, [0, 15.85, 0.32], [0.5, 0.42, 0.55]),
    roundCone(x, y, z, [0, 14.5, -0.05], [0, 15.85, 0], 0.48, 0.42),
    roundCone(x, y, z, [0, 16.45, 0.84], [0, 16.25, 0.97], 0.06, 0.075),        // 鼻
    ellipsoid(x, y, z, [0, 15.955, 0.85], [0.19, 0.075, 0.075]),               // 嘴唇
  ], 0.08) + 0.004 * fbm(x * 6, y * 6, z * 6, 2)
}
const PHAR: V3[] = [[0, 16.3, 0.12], [0, 16.22, -0.02], [0, 15.95, -0.07], [0, 15.6, -0.07], [0, 15.42, -0.09]]
function cavity(x: number, y: number, z: number) {
  return sminAll([
    ellipsoid(x, y, z, [0, 16.0, 0.47], [0.2, 0.026, 0.32]),                   // 口腔：舌面和腭之间的一道缝
    roundCone(x, y, z, [0, 16.0, 0.2], [0, 15.97, -0.03], 0.03, 0.035),        // 口腔通到咽
    ellipsoid(x, y, z, [0, 16.33, 0.5], [0.09, 0.1, 0.37]),                    // 鼻腔
    roundCone(x, y, z, [0, 16.28, 0.84], [0, 16.27, 0.95], 0.022, 0.02),       // 鼻孔
    chain(x, y, z, PHAR, [0.055, 0.065, 0.06, 0.055, 0.04], 0.03),             // 咽
    chain(x, y, z, [[0, 15.55, 0.05], [0, 15.36, 0.12], [0, 14.4, 0.16]], [0.045, 0.05, 0.05], 0.03),   // 喉、气管
    roundCone(x, y, z, [0, 15.42, -0.09], [0, 14.4, -0.17], 0.017, 0.017),     // 食道：平时是扁的
  ], 0.03)
}
function tongue(x: number, y: number, z: number) {
  return smin(ellipsoid(x, y, z, [0, 15.89, 0.38], [0.2, 0.12, 0.32]), ellipsoid(x, y, z, [0, 15.78, 0.12], [0.16, 0.13, 0.15]), 0.08)
}
function inserts(x: number, y: number, z: number) {
  return Math.min(
    tongue(x, y, z),
    roundCone(x, y, z, [0, 15.57, 0.035], [0, 15.72, 0.005], 0.012, 0.018),                    // 会厌
    chain(x, y, z, [[0, 16.07, 0.22], [0, 16.035, 0.11], [0, 15.97, 0.07]], [0.028, 0.024, 0.016], 0.02),   // 软腭和悬雍垂
  )
}
function headSdf(x: number, y: number, z: number) {
  const o = outer(x, y, z)
  if (o > 0.04 || x > 0.85) return Math.max(o, -x, 14.52 - y)
  let d = Math.max(o, -x, 14.52 - y)
  if (x < 0.36) { d = Math.max(d, -cavity(x, y, z)); d = Math.min(d, Math.max(inserts(x, y, z), o, -x)) }
  return d
}

// ---------- 剖面上各种组织的颜色 ----------
const C = {
  skin: lin('#e7b094'), skinCut: lin('#efbfa2'), fat: lin('#f2d3b2'), flesh: lin('#e4a38c'), muscle: lin('#c96a68'), tongue: lin('#c25a5e'), tongueL: lin('#d97c78'),
  mucosa: lin('#e58c8c'), bone: lin('#efe5cf'), marrow: lin('#dcc39a'), tooth: lin('#f6f2e6'), cart: lin('#dfe7ea'), brain: lin('#e6c4bb'), brainD: lin('#d4aaa2'), lip: lin('#d97a76'),
}
function tissue(y: number, z: number): V3 {
  const x = 0
  // 牙：上下门牙
  if (roundCone(x, y, z, [0, 16.09, 0.75], [0, 15.985, 0.785], 0.022, 0.02) < 0 || roundCone(x, y, z, [0, 15.86, 0.73], [0, 15.965, 0.77], 0.02, 0.018) < 0) return C.tooth
  // 嘴唇（红色的唇缘）
  if (ellipsoid(x, y, z, [0, 15.955, 0.86], [0.19, 0.06, 0.06]) < 0) return C.lip
  // 硬腭
  if (roundCone(x, y, z, [0, 16.065, 0.26], [0, 16.085, 0.72], 0.016, 0.018) < 0) return C.bone
  // 颅骨和脑
  const sk = ellipsoid(x, y, z, HEAD_C, [HEAD_R[0] * 0.93, HEAD_R[1] * 0.93, HEAD_R[2] * 0.93]), skIn = ellipsoid(x, y, z, HEAD_C, [HEAD_R[0] * 0.86, HEAD_R[1] * 0.86, HEAD_R[2] * 0.86])
  if (y > 16.45 && z < 0.62) {
    if (skIn < 0) return mix3(C.brain, C.brainD, 0.35 + 0.5 * fbm(y * 9, z * 9, 2, 3))
    if (sk < 0) return C.bone
  }
  // 颈椎：咽后面一节节的椎体，节间是椎间盘
  if (y < 16.15 && y > 14.5 && z < -0.2 && z > -0.5) {
    const k = Math.floor((y - 14.5) / 0.17), cy = 14.5 + (k + 0.5) * 0.17, ly = Math.abs(y - cy)
    if (z > -0.42) return ly < 0.062 ? (Math.abs(z + 0.31) < 0.07 && ly < 0.045 ? C.marrow : C.bone) : C.cart
  }
  // 喉的软骨、气管的软骨环
  const tr = chain(x, y, z, [[0, 15.55, 0.05], [0, 15.36, 0.12], [0, 14.4, 0.16]], [0.045, 0.05, 0.05], 0.03)
  if (tr < 0.03 && tr > 0 && (y > 15.3 || ((y * 100) % 6) < 3.5)) return C.cart
  if (inserts(x, y, z) < 0) return tongue(x, y, z) < 0 ? mix3(C.tongue, C.tongueL, 0.5 + 0.5 * Math.sin(y * 160 + z * 40)) : C.mucosa
  const cav = cavity(x, y, z)
  if (cav < 0.018) return C.mucosa
  const o = outer(x, y, z)
  if (o > -0.022) return C.skinCut
  if (o > -0.06) return C.fat
  return mix3(C.flesh, C.muscle, 0.3 + 0.4 * fbm(y * 4, z * 4, 1, 2))
}
/** 每个顶点属于哪一段：1 口腔，2 咽，3 食道，0 都不是（第 2 课和拓展课亮起来用） */
function region(p: V3) {
  const [x, y, z] = p
  if (x > 0.3) return 0
  if (z > 0.1 && z < 0.86 && (tongue(x, y, z) < 0.012 || ellipsoid(x, y, z, [0, 16.0, 0.47], [0.2, 0.026, 0.32]) < 0.025)) return 1
  if (chain(x, y, z, PHAR, [0.055, 0.065, 0.06, 0.055, 0.04], 0.03) < 0.05 && y > 15.38) return 2
  if (y < 15.45 && roundCone(x, y, z, [0, 15.42, -0.09], [0, 14.4, -0.17], 0.017, 0.017) < 0.05) return 3
  return 0
}
function* headGen() {
  const O: [number, number][] = [[0, 0], [0.006, 0], [-0.006, 0], [0, 0.006], [0, -0.006]]
  const g = yield* surfaceNetsGen(headSdf, [[-0.03, 14.48, -0.95], [0.8, 17.55, 1.08]], 0.011, (p, n) => {
    if (n[0] < -0.6 && p[0] < 0.012) { const c: V3 = [0, 0, 0]; for (const [dy, dz] of O) { const t = tissue(p[1] + dy, p[2] + dz); c[0] += t[0] / O.length; c[1] += t[1] / O.length; c[2] += t[2] / O.length } return c }
    if (p[0] < 0.3 && cavity(p[0], p[1], p[2]) < 0.02) return C.mucosa
    return mix3(C.skin, C.skinCut, 0.3 + 0.3 * noise(p[0] * 10, p[1] * 10, p[2] * 10))
  }, region)
  // 唾液腺：只画剖面那一侧（人的左边）的三对里的一个，小一点、贴在真实的位置
  const glands = yield* surfaceNetsGen((x, y, z) => Math.min(
    ellipsoid(x, y, z, [0.56, 16.12, -0.02], [0.07, 0.15, 0.1]),        // 腮腺：耳朵前下方
    ellipsoid(x, y, z, [0.32, 15.7, 0.26], [0.08, 0.05, 0.085]),       // 下颌下腺：下颌角内侧
    ellipsoid(x, y, z, [0.12, 15.83, 0.47], [0.06, 0.022, 0.05]),      // 舌下腺：舌的下面
  ) + 0.008 * noise(x * 40, y * 40, z * 40), [[0.04, 15.6, -0.15], [0.66, 16.3, 0.56]], 0.01, p => mix3(lin('#e7b98e'), lin('#f4d6b4'), 0.4 + 0.7 * noise(p[0] * 40, p[1] * 40, p[2] * 40)))
  return { head: planarUV(g, 8), glands: planarUV(glands, 8) }
}

/** on：显示多少（0–1）；hl：亮起来的那一段（1 口腔，2 咽，3 食道，0 不亮）；glands：唾液腺亮起来 */
export function HeadSection({ on, hl, glands }: { on: number; hl: number; glands: boolean }) {
  const G = useJob('head', headGen, prioOf('body'))
  const U = useMemo(() => ({ hl: { value: 0 }, glow: { value: 0 } }), [])
  const mat = useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.4, sheen: 0.5, sheenColor: new THREE.Color('#ffd8c8'), bumpMap: tissueBump(), bumpScale: 0.3, transparent: true })
    m.onBeforeCompile = sh => {
      sh.uniforms.uHL = U.hl; sh.uniforms.uGlow = U.glow
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aTag; varying float vTag;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvTag = aTag;')
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vTag; uniform float uHL; uniform float uGlow;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\nif (uHL > 0.5 && abs(vTag - uHL) < 0.5) totalEmissiveRadiance += vec3(1.0, 0.78, 0.55) * uGlow;')
    }
    return m
  }, [U])
  const gMat = useMemo(() => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.5, clearcoat: 0.5, sheen: 0.5, sheenColor: new THREE.Color('#fff0d8'), bumpMap: tissueBump(), bumpScale: 1.2, transparent: true, depthTest: false }), [])
  const cur = useRef({ on: 0, g: 0 })
  useFrame(({ clock }, dt0) => {
    const dt = Math.min(dt0, 1 / 30), k = 1 - Math.exp(-dt / 0.3), c = cur.current
    c.on += (on - c.on) * k; c.g += ((glands ? 1 : 0) - c.g) * k
    mat.opacity = c.on; mat.visible = c.on > 0.02; mat.depthWrite = c.on > 0.6
    U.hl.value = hl; U.glow.value = 0.1 + 0.08 * Math.sin(clock.elapsedTime * 3.2)
    gMat.opacity = c.on * (0.55 + 0.4 * c.g); gMat.visible = c.on > 0.02
    gMat.emissive.set('#ffd2a8'); gMat.emissiveIntensity = c.g * (0.1 + 0.08 * Math.sin(clock.elapsedTime * 3.2))
  })
  if (!G) return null
  return <group>
    <mesh geometry={G.head} material={mat} renderOrder={1} />
    <mesh geometry={G.glands} material={gMat} renderOrder={9} />
  </group>
}
