// 沿一条折线扫出来的扁管（截面是椭圆），顶点可以每帧重算：肋骨、肋软骨、软尺都用它。
// 和 TubeGeometry 不同：截面可以是扁的（肋骨是扁的骨板），粗细沿线可变，而且只改顶点不重建网格，动起来不卡。
import * as THREE from 'three'

export class Sweep {
  readonly geo = new THREE.BufferGeometry()
  private pos: Float32Array
  private nor: Float32Array
  constructor(readonly n: number, readonly radial = 10) {
    const rows = n, cols = radial + 1
    this.pos = new Float32Array(rows * cols * 3); this.nor = new Float32Array(rows * cols * 3)
    const uv = new Float32Array(rows * cols * 2), idx: number[] = []
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) { uv[(i * cols + j) * 2] = i / (rows - 1); uv[(i * cols + j) * 2 + 1] = j / radial }
    for (let i = 0; i < rows - 1; i++) for (let j = 0; j < radial; j++) { const a = i * cols + j, b = a + cols; idx.push(a, b, a + 1, b, b + 1, a + 1) }
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); this.geo.setAttribute('normal', new THREE.BufferAttribute(this.nor, 3)); this.geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); this.geo.setIndex(idx)
  }
  /**
   * pts：中心线上的 n 个点；a、b：每个点截面的两个半轴（a 沿“上”，b 沿“外”）；out：参考的“外”方向（会被扳到和中心线垂直）
   */
  update(pts: THREE.Vector3[], a: (i: number) => number, b: (i: number) => number, out: (p: THREE.Vector3, i: number) => THREE.Vector3) {
    const T = new THREE.Vector3(), O = new THREE.Vector3(), U = new THREE.Vector3(), P = this.pos, N = this.nor, cols = this.radial + 1
    for (let i = 0; i < this.n; i++) {
      const p = pts[i]
      T.copy(pts[Math.min(this.n - 1, i + 1)]).sub(pts[Math.max(0, i - 1)]).normalize()
      O.copy(out(p, i)); O.addScaledVector(T, -O.dot(T)).normalize()
      U.crossVectors(T, O).normalize()
      const ai = Math.max(1e-4, a(i)), bi = Math.max(1e-4, b(i))
      for (let j = 0; j < cols; j++) {
        const th = j / this.radial * Math.PI * 2, c = Math.cos(th), s = Math.sin(th), k = (i * cols + j) * 3
        P[k] = p.x + U.x * ai * c + O.x * bi * s; P[k + 1] = p.y + U.y * ai * c + O.y * bi * s; P[k + 2] = p.z + U.z * ai * c + O.z * bi * s
        let nx = U.x * c / ai + O.x * s / bi, ny = U.y * c / ai + O.y * s / bi, nz = U.z * c / ai + O.z * s / bi
        const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l
        N[k] = nx; N[k + 1] = ny; N[k + 2] = nz
      }
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.normal.needsUpdate = true
    this.geo.computeBoundingSphere()
  }
}

/** 两头收圆的粗细：t 从 0 到 1，两头各 end 那么长收到 tip 倍 */
export const taper = (t: number, end = 0.06, tip = 0.25) => {
  const e = Math.min(t, 1 - t) / end
  return e >= 1 ? 1 : tip + (1 - tip) * Math.sqrt(Math.max(0, 1 - (1 - e) * (1 - e)))
}
