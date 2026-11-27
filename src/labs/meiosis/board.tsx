// 白板和大屏上的内容：白板上用白板笔画的遗传图解（棋盘格、箭头、比例），贴着的磁性染色体模型；大屏上的系谱图和图解。
// 板面坐标：原点在白板中心，x 向右、y 向上，单位 cm。画布 2048×1024 对应 260×130 cm。
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { Chromatid } from './chromo'
import type { V3 } from './parts'
import { BACK_Z, BOARD, SCREEN } from './world'

export const BW = BOARD.w, BH = BOARD.y1 - BOARD.y0
const BCY = (BOARD.y0 + BOARD.y1) / 2
const SW = SCREEN.w, SH = SCREEN.y1 - SCREEN.y0, SCY = (SCREEN.y0 + SCREEN.y1) / 2
/** 白板上一点（板面坐标）的世界坐标；z 是离板面多远 */
export const onBoard = (x: number, y: number, z = 4): V3 => [BOARD.x + x, BCY + y, BACK_Z + 3.4 + z]
export const onScreen = (x: number, y: number, z = 3): V3 => [SCREEN.x + x, SCY + y, BACK_Z + 6.6 + z]

export const INK = { blue: '#1f4fa8', black: '#22262b', red: '#c0392b', green: '#1e7a55', mom: '#b8402a', dad: '#2a5aa8', grey: '#7b8088' }
const FONT = '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif'
/** 画布上的画笔：坐标用板面 cm，自动换算成像素 */
export class Pen {
  constructor(public g: CanvasRenderingContext2D, public w: number, public h: number, public u: number) {}
  X = (x: number) => (x + this.w / 2) * this.u
  Y = (y: number) => (this.h / 2 - y) * this.u
  text(s: string, x: number, y: number, size: number, color = INK.black, align: CanvasTextAlign = 'center', weight = 600) {
    const g = this.g; g.font = `${weight} ${size * this.u}px ${FONT}`; g.fillStyle = color; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, this.X(x), this.Y(y))
  }
  /** 带上标、下标的文字：片段 [文字, 'sup' | 'sub' | ''] */
  rich(parts: [string, string][], x: number, y: number, size: number, color = INK.black, align: 'left' | 'center' = 'center', weight = 600) {
    const g = this.g, px = size * this.u
    const fontOf = (k: string) => `${weight} ${k ? px * 0.7 : px}px ${FONT}`
    let total = 0; for (const [s, k] of parts) { g.font = fontOf(k); total += g.measureText(s).width }
    let cx = align === 'center' ? this.X(x) - total / 2 : this.X(x)
    g.fillStyle = color; g.textAlign = 'left'; g.textBaseline = 'middle'
    for (const [s, k] of parts) { g.font = fontOf(k); g.fillText(s, cx, this.Y(y) + (k === 'sup' ? -px * 0.34 : k === 'sub' ? px * 0.28 : 0)); cx += g.measureText(s).width }
  }
  line(pts: [number, number][], color = INK.black, width = 0.45, dash?: number[]) {
    const g = this.g; g.strokeStyle = color; g.lineWidth = width * this.u; g.lineCap = 'round'; g.lineJoin = 'round'; g.setLineDash(dash ? dash.map(d => d * this.u) : [])
    g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(this.X(x), this.Y(y)) : g.moveTo(this.X(x), this.Y(y)))); g.stroke(); g.setLineDash([])
  }
  arrow(x0: number, y0: number, x1: number, y1: number, color = INK.black, width = 0.45) {
    this.line([[x0, y0], [x1, y1]], color, width)
    const a = Math.atan2(y1 - y0, x1 - x0), L = 2.2
    this.line([[x1 - L * Math.cos(a - 0.45), y1 - L * Math.sin(a - 0.45)], [x1, y1], [x1 - L * Math.cos(a + 0.45), y1 - L * Math.sin(a + 0.45)]], color, width)
  }
  circle(x: number, y: number, r: number, color = INK.black, width = 0.45, fill?: string, dash?: number[]) {
    const g = this.g; g.beginPath(); g.arc(this.X(x), this.Y(y), r * this.u, 0, Math.PI * 2)
    if (fill) { g.fillStyle = fill; g.fill() }
    g.strokeStyle = color; g.lineWidth = width * this.u; g.setLineDash(dash ? dash.map(d => d * this.u) : []); g.stroke(); g.setLineDash([])
  }
  rect(x: number, y: number, w: number, h: number, color = INK.black, width = 0.4, fill?: string) {
    const g = this.g; if (fill) { g.fillStyle = fill; g.fillRect(this.X(x), this.Y(y + h), w * this.u, h * this.u) }
    g.strokeStyle = color; g.lineWidth = width * this.u; g.strokeRect(this.X(x), this.Y(y + h), w * this.u, h * this.u)
  }
}

function useCanvas(W: number, H: number, px: number, draw: (p: Pen) => void, deps: unknown[], bg?: string) {
  const { tex, ctx } = useMemo(() => {
    const c = document.createElement('canvas'); c.width = Math.round(W * px); c.height = Math.round(H * px)
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
    return { tex: t, ctx: c.getContext('2d')! }
  }, [W, H, px])
  useEffect(() => {
    const c = ctx.canvas; ctx.clearRect(0, 0, c.width, c.height)
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height) }
    draw(new Pen(ctx, W, H, px)); tex.needsUpdate = true
  }, deps)   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => tex.dispose(), [tex])
  return tex
}
/** 白板上的笔迹：draw 用 Pen 在板面坐标里画；deps 变了才重画 */
export function BoardInk({ draw, deps }: { draw: (p: Pen) => void; deps: unknown[] }) {
  const tex = useCanvas(BW, BH, 2048 / BW, draw, deps, '#f4f5f2')
  // 不透明：画布里先铺一层白板的底色，免得半透明的面和环境遮蔽打架出现灰斑
  return <mesh position={[BOARD.x, BCY, BACK_Z + 3.4]}><planeGeometry args={[BW, BH]} /><meshPhysicalMaterial map={tex} roughness={0.2} clearcoat={0.6} clearcoatRoughness={0.15} polygonOffset polygonOffsetFactor={-2} /></mesh>
}
/** 大屏上的画面：深色底，亮字 */
export const SCR = { bg: '#0d1620', fg: '#eef3f7', dim: '#8fa3b5', key: '#7fe3d4', warm: '#ffd27a', red: '#ff8a7a', blue: '#8fb6ff' }
export function ScreenInk({ draw, deps }: { draw: (p: Pen) => void; deps: unknown[] }) {
  const tex = useCanvas(SW, SH, 2048 / SW, draw, deps, SCR.bg)
  return <mesh position={[SCREEN.x, SCY, BACK_Z + 6.6]}><planeGeometry args={[SW, SH]} /><meshBasicMaterial map={tex} toneMapped={false} color="#d8d8d8" /></mesh>
}

/** 贴在白板上的磁性染色体模型：一条（没有复制的）染色体，pair 决定长短，who 决定颜色（0 母本 1 父本）。at 是板面坐标 */
export function Magnet({ pair, who, at, scale = 2, th = 0, opacity = 1, gene = true }: { pair: number; who: number; at: [number, number]; scale?: number; th?: number; opacity?: number; gene?: boolean }) {
  return <Chromatid pair={pair} who={who} inner={false} dir={1} gap={0} at={onBoard(at[0], at[1], 2.4)} th={th} scale={scale} opacity={opacity} gene={gene} />
}

/** 'X^WX^w' 这样的写法拆成正文和上标 */
export function richOf(s: string): [string, string][] {
  const out: [string, string][] = []
  s.split(/(\^\w)/).forEach(t => { if (!t) return; if (t[0] === '^') out.push([t[1], 'sup']); else out.push([t, '']) })
  return out
}
/** 白板上的棋盘格：左上角在 (x, y)，top 是一方的配子（♀），left 是另一方的（♂）；fill 给每格的底色，sub 给每格第二行的小字 */
export function drawPunnett(p: Pen, x: number, y: number, top: string[], left: string[], cells: string[], cw: number, ch: number, fill: (g: string) => string, sub: (g: string) => string, show = true, size = 5.2) {
  const hw = 15, R = size * 0.85
  p.text('♀', x + 3, y - 2, size * 0.8, INK.mom); p.text('♂', x + 3, y - 9, size * 0.8, INK.dad)
  top.forEach((t, i) => { p.circle(x + hw + cw * (i + 0.5), y - 5, R, INK.mom, 0.4); p.rich(richOf(t), x + hw + cw * (i + 0.5), y - 5, size, INK.mom) })
  left.forEach((t, j) => { p.circle(x + hw / 2, y - 10 - ch * (j + 0.5), R, INK.dad, 0.4); p.rich(richOf(t), x + hw / 2, y - 10 - ch * (j + 0.5), size, INK.dad) })
  left.forEach((_, j) => top.forEach((_, i) => {
    const g = cells[j * top.length + i], cx = x + hw + cw * i, cy = y - 10 - ch * (j + 1)
    p.rect(cx, cy, cw, ch, INK.black, 0.4, show ? fill(g) : undefined)
    if (show) { p.rich(richOf(g), cx + cw / 2, cy + ch * 0.64, size, INK.black); p.text(sub(g), cx + cw / 2, cy + ch * 0.27, size * 0.62, '#3b4148', 'center', 500) }
  }))
}
