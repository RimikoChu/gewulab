// 各处共用的材质：皮肤、湿润的组织、幽灵一样的半透明人体、神经，以及“按区域亮起来”的着色器补丁。
import * as THREE from 'three'

/** 皮肤：顶点颜色带一点红润的变化，薄薄的光泽，边缘一层暖色的绒光，像光透进皮肤里 */
export const skinMat = () => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.52, sheen: 0.55, sheenRoughness: 0.45, sheenColor: new THREE.Color('#ff9c7e'), clearcoat: 0.12, clearcoatRoughness: 0.55, specularIntensity: 0.45 })
/** 湿润的组织：脑、脊髓、眼、耳的剖面。clearcoat 给一层湿的高光 */
export const wetMat = (color: string | null, o: Partial<THREE.MeshPhysicalMaterialParameters> = {}) => new THREE.MeshPhysicalMaterial({ ...(color ? { color } : { vertexColors: true }), roughness: 0.42, clearcoat: 0.75, clearcoatRoughness: 0.22, sheen: 0.35, sheenRoughness: 0.5, sheenColor: new THREE.Color('#ffd0c0'), ...o })
/** 神经：淡黄白色，自己微微发光（暗展厅里看得见） */
export const nerveMat = (glow = 0.35) => new THREE.MeshPhysicalMaterial({ color: '#f3dfa6', emissive: '#ffc35a', emissiveIntensity: glow, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.3 })

/** 幽灵壳：边缘亮、中间透，叠加着画，看得见里面。uFade 让它淡出 */
export function ghostMat(color: string, base: number, rim: number, pow = 2.4) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uBase: { value: base }, uRim: { value: rim }, uPow: { value: pow }, uFade: { value: 1 } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 uColor; uniform float uBase; uniform float uRim; uniform float uPow; uniform float uFade; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(clamp(1.0 - abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0), uPow); gl_FragColor = vec4(uColor * (uBase + uRim * f) * uFade, 1.0); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  })
}

/**
 * 按区域亮起来：网格的每个顶点带一个区域号（attribute aTag，0–7），uHi[i] 是第 i 区亮多少（0–1）。
 * 亮的区域加一层自发光，uDim 大于 0 时其余区域压暗一点，选中的那块更跳。
 */
export function tagged<M extends THREE.MeshPhysicalMaterial | THREE.MeshStandardMaterial>(m: M, glow = '#7fe3d4') {
  const u = { uHi: { value: new Array(8).fill(0) as number[] }, uGlow: { value: new THREE.Color(glow) }, uDim: { value: 0 } }
  m.onBeforeCompile = s => {
    Object.assign(s.uniforms, u)
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute float aTag;\nflat varying float vTag;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvTag = aTag;')
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nflat varying float vTag;\nuniform float uHi[8];\nuniform vec3 uGlow;\nuniform float uDim;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\nfloat hi = uHi[int(vTag + 0.5)];\ndiffuseColor.rgb *= 1.0 - uDim * 0.55 * (1.0 - hi);\ntotalEmissiveRadiance += uGlow * hi * 0.32;\ndiffuseColor.rgb = mix(diffuseColor.rgb, uGlow * 0.9, hi * 0.35);')
  }
  m.customProgramCacheKey = () => 'nerve-tagged'
  return { mat: m, u }
}
