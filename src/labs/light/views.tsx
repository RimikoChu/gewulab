// 读数面板上的几张小图：屏上的条纹（带毫米刻度）、测量头目镜里看到的、遏止电压和频率的图线。
// 都只负责画，数全部从 physics.ts 来。
import { useEffect, useRef } from 'react'
import { NU_C, freq14, stopUAt } from './physics'

const rgb = (hex: string) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]

/** 屏上的条纹，正对着看。I：屏上 x（mm）处的相对亮度；half：画出中央两侧各多少毫米；mark：标出一段长度（比如 5 个间距） */
export function FringeView({ I, hex, half = 20, mark, label = '屏上看到的' }: { I: (x: number) => number; hex: string; half?: number; mark?: { from: number; to: number; text: string } | null; label?: string }) {
  const ref = useRef<HTMLCanvasElement>(null), W = 580, HH = 150
  useEffect(() => {
    const g = ref.current?.getContext('2d'); if (!g) return
    const [r, gg, b] = rgb(hex), img = g.createImageData(W, HH)
    for (let px = 0; px < W; px++) {
      const k = Math.min(1, Math.max(0, I((px / (W - 1) * 2 - 1) * half)))
      for (let py = 0; py < HH; py++) {
        const v = k * Math.exp(-(((py - HH / 2) / (HH * 0.42)) ** 4)), w = Math.pow(v, 5) * 90, i = (py * W + px) * 4
        img.data[i] = Math.min(255, 14 + r * v + w); img.data[i + 1] = Math.min(255, 15 + gg * v + w); img.data[i + 2] = Math.min(255, 17 + b * v + w); img.data[i + 3] = 255
      }
    }
    g.putImageData(img, 0, 0)
  })
  const X = (mm: number) => `${(mm / half + 1) * 50}%`
  return (
    <div className="mt-3">
      <div className="mb-1 flex justify-between text-[12px] text-white/55"><span>{label}</span><span>刻度单位 mm</span></div>
      <div className="relative overflow-hidden rounded-lg ring-1 ring-white/15">
        <canvas ref={ref} width={W} height={HH} className="block h-[76px] w-full" />
        {mark && <div className="absolute top-1 flex h-4 items-center border-x-2 border-white" style={{ left: X(mark.from), width: `${(mark.to - mark.from) / half * 50}%` }}><span className="h-0.5 w-full bg-white" /></div>}
        {mark && <div className="absolute top-5 -translate-x-1/2 rounded bg-white px-1.5 text-[12px] font-semibold whitespace-nowrap text-[#10151a]" style={{ left: X((mark.from + mark.to) / 2) }}>{mark.text}</div>}
        <svg viewBox={`0 0 ${W} 34`} className="block w-full bg-[#d9d6cb]">
          {Array.from({ length: half * 2 + 1 }, (_, i) => i - half).map(mm => <rect key={mm} x={(mm / half + 1) * W / 2 - (mm % 5 === 0 ? 1.2 : 0.6)} y={0} width={mm % 5 === 0 ? 2.4 : 1.2} height={mm % 10 === 0 ? 14 : mm % 5 === 0 ? 10 : 6} fill="#16191c" />)}
          {Array.from({ length: Math.floor(half / 10) * 2 + 1 }, (_, i) => (i - Math.floor(half / 10)) * 10).map(mm => <text key={mm} x={Math.min(W - 10, Math.max(10, (mm / half + 1) * W / 2))} y={30} textAnchor="middle" fontSize={15} fontWeight={600} fill="#16191c">{Math.abs(mm)}</text>)}
        </svg>
      </div>
    </div>
  )
}

/** 测量头目镜里看到的：一个圆视场，竖着的亮暗条纹，正中一条分划板的刻线。at：现在手轮的读数（mm）；x1：第 1 条亮纹的位置；gap：条纹间距 */
export function Eyepiece({ at, x1, gap, hex }: { at: number; x1: number; gap: number; hex: string }) {
  const ref = useRef<HTMLCanvasElement>(null), S = 360, SPAN = 4.2      // 视场里左右各看得到多少毫米
  useEffect(() => {
    const g = ref.current?.getContext('2d'); if (!g) return
    const [r, gg, b] = rgb(hex), img = g.createImageData(S, S)
    for (let px = 0; px < S; px++) {
      const x = at + (px / (S - 1) * 2 - 1) * SPAN, k = Math.cos(Math.PI * (x - x1) / gap) ** 2
      for (let py = 0; py < S; py++) {
        const rr = Math.hypot(px - S / 2, py - S / 2) / (S / 2), fall = rr >= 1 ? 0 : Math.min(1, (1 - rr) * 9) * (1 - 0.35 * rr * rr), v = k * fall, i = (py * S + px) * 4
        img.data[i] = (10 + r * v) * (rr < 1 ? 1 : 0); img.data[i + 1] = (10 + gg * v) * (rr < 1 ? 1 : 0); img.data[i + 2] = (12 + b * v) * (rr < 1 ? 1 : 0); img.data[i + 3] = rr < 1 ? 255 : 0
      }
    }
    g.putImageData(img, 0, 0)
  })
  // 视场里每条亮纹头上标出是第几条
  const first = Math.ceil((at - SPAN - x1) / gap), tags = Array.from({ length: 8 }, (_, i) => first + i).filter(n => n >= 0 && n <= 7 && Math.abs(x1 + n * gap - at) < SPAN * 0.86)
  return (
    <div className="relative mx-auto mt-3 size-[190px]">
      <canvas ref={ref} width={S} height={S} className="size-full rounded-full ring-2 ring-white/20" />
      <div className="absolute inset-y-[7%] left-1/2 w-px -translate-x-1/2 bg-white" />
      <div className="absolute top-1/2 left-1/2 h-px w-10 -translate-x-1/2 bg-white/80" />
      {tags.map(n => <span key={n} className="absolute top-[14%] -translate-x-1/2 rounded bg-black/55 px-1 text-[11.5px] font-semibold text-white tabular-nums" style={{ left: `${((x1 + n * gap - at) / SPAN + 1) * 50}%` }}>{n + 1}</span>)}
    </div>
  )
}

/** 遏止电压和入射光频率的图线。pts：已经测到的点（波长 nm、遏止电压 V）；line：把直线画出来 */
export function StopChart({ pts, line }: { pts: { nm: number; u: number; hex: string }[]; line: boolean }) {
  const W = 290, HH = 170, L = 30, B = 28, x0 = 4, x1 = 8.4, y1 = 1.1
  const X = (f: number) => L + (f - x0) / (x1 - x0) * (W - L - 12), Y = (u: number) => HH - B - u / y1 * (HH - B - 14)
  const U = (f: number) => stopUAt(f * 1e14)
  return (
    <svg viewBox={`0 0 ${W} ${HH}`} className="mt-2 w-full rounded-lg bg-white/6" role="img" aria-label="遏止电压和频率的图线">
      {[0, 0.2, 0.4, 0.6, 0.8, 1].map(u => <g key={u}><line x1={L} x2={W - 12} y1={Y(u)} y2={Y(u)} stroke="white" strokeOpacity={u ? 0.1 : 0.5} /><text x={L - 5} y={Y(u) + 4} textAnchor="end" fontSize={11} fill="white" fillOpacity={0.6}>{u.toFixed(1)}</text></g>)}
      {[4, 5, 6, 7, 8].map(f => <g key={f}><line x1={X(f)} x2={X(f)} y1={Y(0)} y2={Y(0) + 4} stroke="white" strokeOpacity={0.5} /><text x={X(f)} y={HH - 10} textAnchor="middle" fontSize={11} fill="white" fillOpacity={0.6}>{f}</text></g>)}
      <line x1={L} x2={L} y1={14} y2={Y(0)} stroke="white" strokeOpacity={0.5} />
      <text x={L + 6} y={12} fontSize={11} fill="white" fillOpacity={0.7}>Uc / V</text>
      <text x={W - 8} y={Y(0) - 6} textAnchor="end" fontSize={11} fill="white" fillOpacity={0.7}>ν / 10¹⁴ Hz</text>
      {line && <>
        <line x1={X(NU_C / 1e14)} y1={Y(0)} x2={X(7.9)} y2={Y(U(7.9))} stroke="#7fe3d4" strokeWidth={2} />
        <circle cx={X(NU_C / 1e14)} cy={Y(0)} r={3.5} fill="none" stroke="#ffe9a8" strokeWidth={1.5} />
        <text x={X(NU_C / 1e14)} y={Y(0) - 8} textAnchor="middle" fontSize={11} fill="#ffe9a8">νc = {(NU_C / 1e14).toFixed(2)}</text>
      </>}
      {pts.map(p => <circle key={p.nm} cx={X(freq14(p.nm))} cy={Y(p.u)} r={5} fill={p.hex} stroke="white" strokeWidth={1.5} />)}
    </svg>
  )
}
