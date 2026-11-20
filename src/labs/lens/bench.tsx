// 光的折射和凸透镜成像 · 第 3、4、5 课和随堂检测共用的光具座：蜡烛、凸透镜、光屏，一束从烛焰射出的光，成的像，和三条特殊光线。
import type { ReactNode } from 'react'
import type { Label } from '@/lab-kit'
import { Axis, Beam, Candle, Dark, Dim, Lens, Ray, Screen } from './optics'
import { CANDLE as H, F, LENS_R, blurSize, imageDistance, magnify, nature } from './physics'
import { AXIS, CM, RAIL, ST } from './world'

const X = (cm: number) => ST.bench + cm * CM, Y = (cm: number) => AXIS + cm * CM
const TINT = ['#ffd24a', '#7fe3d4', '#ff8fb3']
/** 光具座上某一点在场景里的位置，给标签用 */
export const benchAt = (cm: number, up = 0): [number, number, number] => [X(cm), Y(up), 0.34]

/** u：物距；screen：光屏放在离透镜多少厘米处（不放就不传）；image：把像画出来；rays：画出前几条特殊光线；beam：画出从烛焰尖射向透镜的那一束光；f：焦距；k：整体缩小多少（物距很大时用）；dims：标出物距和像距 */
export default function Bench({ u, screen, image = false, rays = 0, beam = true, dims = false, f = F, k = 1, labels, children = null }: { u: number; screen?: number; image?: boolean; rays?: number; beam?: boolean; dims?: boolean; f?: number; k?: number; labels: Label[]; children?: ReactNode }) {
  const v = imageDistance(u, f), m = magnify(u, f), n = nature(u, f), real = !!n?.real
  const x = (cm: number) => X(cm * k), y = (cm: number) => Y(cm * k)
  const A: [number, number] = [x(-u), y(H * 0.92)], B: [number, number] = n ? [x(v), y((real ? -m : m) * H * 0.92)] : [0, 0], far = (RAIL - 1) / k, R = LENS_R
  // 光束：烛焰尖发出的光打满整块透镜；穿过透镜后，上下两条边各自的去向（实像：朝像点会聚再散开；虚像：一直散开）
  const edge = (side: number, cm: number) => { const y0 = side * R; return real ? y0 + ((-m * H * 0.92) - y0) * cm / v : y0 + (y0 - m * H * 0.92) * cm / -v }
  // 光束和光线都只画到离主光轴 EDGE 厘米以内：再远就照到白屏外面、甚至台面下面去了
  const EDGE = 13.5 / k, By = Math.abs(m * H * 0.92)
  const end = Math.min(screen ?? far, real ? (screen ?? v * (1 + (EDGE - By) / (R + By))) : far)
  // 虚像时下边那条边最先碰到 EDGE：从那里起沿着 EDGE 画
  const cut = real ? end : Math.min(end, (EDGE - R) * -v / (R + By))
  // 三条特殊光线在透镜上的落点高度，和通过透镜以后的去向
  const hit = [H * 0.92, 0, (real ? -m : m) * H * 0.92]
  // 虚像时三条光线穿过透镜后各自散开：画到 EDGE 为止
  const f0 = Math.min(far, f * (1 + EDGE / hit[0])), f1 = Math.min(far, EDGE * u / hit[0])
  const out = (i: number): [number, number] => real ? B : i === 0 ? [x(f0), y(hit[0] - hit[0] * f0 / f)] : i === 1 ? [x(f1), y(-hit[0] * f1 / u)] : [x(Math.min(far, 30 / k)), y(hit[2])]
  return (
    <Dark at="bench" labels={labels}>
      <Axis x0={X(-RAIL)} x1={X(RAIL)} y={AXIS} marks={[-2 * f, -f, f, 2 * f].map(c => x(c))} />
      {beam && n && <>
        <Beam pts={[A, [X(0), y(R)], [X(0), y(-R)]]} />
        {real && end > v
          ? <><Beam pts={[[X(0), y(R)], [X(0), y(-R)], B]} /><Beam pts={[B, [x(end), y(edge(1, end))], [x(end), y(edge(-1, end))]]} opacity={0.06} /></>
          : real ? <Beam pts={[[X(0), y(R)], [X(0), y(-R)], [x(end), y(edge(-1, end))], [x(end), y(edge(1, end))]]} />
          : <Beam pts={[[X(0), y(R)], [X(0), y(-R)], [x(cut), y(-EDGE)], [x(end), y(-EDGE)], [x(end), y(Math.max(-EDGE, edge(1, end)))]]} opacity={0.06} />}
      </>}
      <Lens x={X(0)} y={AXIS} h={R * CM * Math.min(1, k + 0.25)} />
      <Candle x={x(-u)} y={AXIS} h={H * CM * k} />
      {screen != null && <Screen x={x(screen)} y={AXIS} />}
      {image && n && <Candle x={B[0]} y={AXIS} h={(real ? -m : m) * H * CM * k} image ghost={!real} />}
      {[0, 1, 2].slice(0, rays).map(i => n && (
        <group key={i}>
          <Ray a={A} b={[X(0), y(hit[i])]} color={TINT[i]} />
          <Ray a={[X(0), y(hit[i])]} b={out(i)} color={TINT[i]} />
          {!real && <Ray a={[X(0), y(hit[i])]} b={B} color={TINT[i]} dash />}
          {i === 2 && !real && <Ray a={[x(-f), y(0)]} b={A} color={TINT[i]} dash />}
        </group>
      ))}
      {dims && <Dim a={x(-u)} b={X(0)} y={Y(-13.2)} />}
      {dims && image && real && <Dim a={X(0)} b={x(v)} y={Y(-13.2)} color="#7fe3d4" />}
      {children}
    </Dark>
  )
}

/** 面板上的小图：从光屏正面看过去，屏上是什么样。光屏离像的位置越远，屏上越模糊；虚像时屏上只有一片光 */
export function ScreenView({ u, screen, f = F }: { u: number; screen: number; f?: number }) {
  const n = nature(u, f), real = !!n?.real, m = magnify(u, f), spot = blurSize(u, screen, f), W = 250, HH = 150, S = 5.2     // 1 cm 画 5.2 个单位
  const blur = Math.min(26, spot * 2.4), dim = real ? Math.max(0.25, 1 - spot / 14) : 0, hgt = m * H * S, wid = hgt * 0.24 + 4
  return (
    <svg viewBox={`0 0 ${W} ${HH}`} className="mt-3 w-full rounded-lg" role="img" aria-label="光屏上看到的">
      <defs><filter id="lens-screen-blur" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation={blur} /></filter></defs>
      <rect width={W} height={HH} fill="#eeeee8" /><rect x={1} y={1} width={W - 2} height={HH - 2} fill="none" stroke="#2b3136" strokeWidth={2} />
      <ellipse cx={W / 2} cy={HH / 2} rx={Math.min(120, 14 + spot * 4)} ry={Math.min(72, 12 + spot * 3.2)} fill="#ffcf7a" opacity={real ? 0.12 + Math.min(0.2, spot / 40) : 0.2} filter="url(#lens-screen-blur)" />
      {real && <g opacity={dim} filter={blur > 0.6 ? 'url(#lens-screen-blur)' : undefined} transform={`translate(${W / 2} ${HH / 2})`}>
        <rect x={-wid / 2} y={0} width={wid} height={hgt * 0.72} rx={1.5} fill="#e9dcc0" stroke="#b9a988" strokeWidth={0.6} />
        <path d={`M0 ${hgt} C ${wid * 0.55} ${hgt * 0.86} ${wid * 0.42} ${hgt * 0.76} 0 ${hgt * 0.74} C ${-wid * 0.42} ${hgt * 0.76} ${-wid * 0.55} ${hgt * 0.86} 0 ${hgt}Z`} fill="#ff9a2e" />
        <path d={`M0 ${hgt * 0.9} C ${wid * 0.22} ${hgt * 0.83} ${wid * 0.18} ${hgt * 0.77} 0 ${hgt * 0.76} C ${-wid * 0.18} ${hgt * 0.77} ${-wid * 0.22} ${hgt * 0.83} 0 ${hgt * 0.9}Z`} fill="#fff3b0" />
      </g>}
      <line x1={0} y1={HH / 2} x2={W} y2={HH / 2} stroke="#2b3136" strokeOpacity={0.14} strokeDasharray="3 4" />
    </svg>
  )
}
