// 细胞实验室 · 面板上的“视野”：从目镜里看到的那个圆。画的是一张平面示意图。
import type { Dir } from './physics'

const R = 92
/** mode：全黑、白亮但没有像、模糊、清楚；row：视野直径上一行有几个细胞；light：亮度（0–1）；at：物像偏在哪边；animal：画口腔上皮细胞而不是洋葱表皮；letter：改成只显示一个字母 */
export default function View({ mode, row = 8, light = 1, at = null, animal = false, stained = true, letter }: { mode: 'dark' | 'bright' | 'blur' | 'sharp'; row?: number; light?: number; at?: Dir | null; animal?: boolean; stained?: boolean; letter?: string }) {
  const size = 2 * R / row, n = Math.ceil(row / 2) + 1, shift = at === 'ld' ? [-46, 46] : at === 'ru' ? [46, -46] : [0, 0]
  const cells = []
  if (mode === 'blur' || mode === 'sharp') for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
    const x = i * size + (animal ? (j % 2) * size * 0.3 : (j % 2) * size * 0.5), y = j * size * (animal ? 1 : 0.62)
    if (animal && (i * 7 + j * 13) % 3 === 0) continue
    cells.push(animal
      ? <g key={`${i}|${j}`}><ellipse cx={x} cy={y} rx={size * 0.4} ry={size * 0.33} fill="#f6e9df" stroke="#c9a58f" strokeWidth={1} /><circle cx={x + size * 0.05} cy={y} r={size * 0.09} fill={stained ? '#7a4a2a' : '#d9c3b3'} /></g>
      : <g key={`${i}|${j}`}><rect x={x - size / 2} y={y - size * 0.31} width={size} height={size * 0.62} rx={size * 0.06} fill="#f5efd9" stroke="#8a7a4a" strokeWidth={Math.max(1, size * 0.03)} /><circle cx={x - size * 0.2} cy={y} r={size * 0.08} fill={stained ? '#7a4a2a' : '#e2d9b8'} /></g>)
  }
  return (
    <svg viewBox={`${-R - 6} ${-R - 6} ${2 * R + 12} ${2 * R + 12}`} className="mx-auto mt-3 w-[200px]" role="img" aria-label="显微镜的视野">
      <defs><clipPath id="cells-view"><circle r={R} /></clipPath><filter id="cells-blur"><feGaussianBlur stdDeviation={5} /></filter></defs>
      <circle r={R + 5} fill="#0b0d0f" />
      <circle r={R} fill={mode === 'dark' ? '#15181b' : '#fbf8ea'} opacity={mode === 'dark' ? 1 : 0.55 + 0.45 * light} />
      <g clipPath="url(#cells-view)" filter={mode === 'blur' ? 'url(#cells-blur)' : undefined} opacity={0.5 + 0.5 * light}>
        {letter
          ? <text x={shift[0]} y={shift[1] + 26} textAnchor="middle" fontSize={78} fontWeight={700} fill="#30343a">{letter}</text>
          : at ? <g transform={`translate(${shift[0]} ${shift[1]})`}><circle r={30} fill="#f5efd9" stroke="#8a7a4a" strokeWidth={2} /><circle cx={-8} r={7} fill="#7a4a2a" /></g> : cells}
      </g>
      <circle r={R} fill="none" stroke="#000" strokeOpacity={0.5} strokeWidth={2} />
    </svg>
  )
}
