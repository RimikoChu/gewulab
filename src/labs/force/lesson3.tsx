// 力和运动 · 第 3 课 重力：铁架台上挂一只测力计，下面一只一只挂钩码，记下重力和质量，画 G–m 图线；
// 再把铁架台垫斜，看旁边的重垂线：重力的方向总是竖直向下。重力的大小都由 G = mg 算出来。
import { useEffect, useState } from 'react'
import { RoundedBox } from '@react-three/drei'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { Force, HOOK_PITCH, Hooks, Place, Plumb, SCALE_RING, STAND, SpringScale, Stand, Wood, scaleSpan, useSettled, type V3 } from './gear'
import { LESSONS, goLesson } from './lessons'
import { G, HOOK_M, TILT, hooks, ratio } from './physics'
import { Plot, ScaleView } from './views'
import { BENCH_Z, ST, TOP, U } from './world'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

const MAX = 4
const TASKS: Task[] = [
  { id: 'one', text: '挂一只 50 g 的钩码，记下重力', note: `${hooks(1).G.toFixed(2)} N` },
  { id: 'all', text: `一只一只加到 ${MAX} 只，每次都记录`, note: `图上的点连成过原点的直线：物体所受的重力跟它的质量成正比，比值 g = ${G} N/kg` },
  { id: 'tilt', text: '把铁架台的底座垫斜，看重垂线', note: `铁架台斜了 ${TILT}°，重垂线和钩码仍然竖直向下：重力的方向总是竖直向下` },
]
const X = ST.l3
const P = (x: number, y: number, z = 0): V3 => [X + x * U, TOP + y * U, BENCH_Z + z * U]
/** 底座右下角的那条棱：垫斜时铁架台绕它转（厘米，从底座中心算） */
const PIVOT = 3 + STAND.baseW / 2
/** 垫斜 deg 度以后，横杆上离底座中心 x 厘米的挂点到了哪里（厘米） */
function hang(x: number, deg: number): [number, number] { const a = deg * Math.PI / 180, dx = x - PIVOT, dy = STAND.hang; return [PIVOT + dx * Math.cos(a) + dy * Math.sin(a), -dx * Math.sin(a) + dy * Math.cos(a)] }
/** 重力的箭头：每 1 N 画多长 */
const PER = 0.55

export default function Lesson3() {
  const [n, setN] = useState(0)
  const [rows, setRows] = useState<number[]>([])
  const [tilt, setTilt] = useState(false)
  const T = useTasks('gewu:force:3', TASKS)
  const deg = useSlide(tilt ? TILT : 0, 9), settled = useSettled(n, 1100), still = deg === (tilt ? TILT : 0)
  useEffect(() => { if (tilt && still) T.check(id => id === 'tilt') }, [tilt, still])   // eslint-disable-line react-hooks/exhaustive-deps
  const h = hooks(n), dup = n === 0 || rows.includes(n)
  const add = () => { if (!settled || n >= MAX || !dup) return; setN(n + 1) }
  const record = () => { if (!settled || dup) return; const next = [...rows, n]; setRows(next); T.check(id => id === 'one' ? next.includes(1) : id === 'all' && next.length === MAX) }
  const resetAll = () => { setN(0); setRows([]); setTilt(false); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'add' | 'record' | 'tilt' | null } = !task ? { hint: '重力的大小 G = mg，方向竖直向下，作用点在重心。', next: null }
    : !settled || !still ? { hint: '等指针停稳…', next: null }
    : task.id === 'tilt' ? { hint: '按“垫斜底座”，看重垂线还是不是竖直的', next: 'tilt' }
    : !dup ? { hint: `${n} 只钩码一共 ${(h.m * 1000).toFixed(0)} g，测力计的示数是 ${h.G.toFixed(2)} N。按“记录”`, next: 'record' }
    : { hint: '按“挂一只钩码”', next: 'add' }
  const sc = hang(STAND.hookX, deg), pl = hang(STAND.plumbX, deg), top = sc[1] - SCALE_RING / U
  const labels: Label[] = [
    { id: 'G', at: P(sc[0] - 4, top - 9), ax: 1, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: n > 0 && settled ? 1 : 0 }, children: <><small>重力 G</small>{h.G.toFixed(2)} N</> },
    { id: 'tilt', at: P(pl[0] + 3, 30), className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: tilt && still ? 1 : 0 }, children: '重垂线仍然竖直向下' },
    { id: 'n1', at: P(STAND.rodX - 2, 40), ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '铁架台' },
    { id: 'n2', at: P(pl[0] + 2.5, 14), name: true, className: 'scene-name -translate-y-1/2', children: '重垂线' },
    { id: 'n3', at: P(sc[0] - 4, top - 16), ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '弹簧测力计' },
  ]
  return (
    <LabShell title="力和运动" lessons={LESSONS} current="3" narration={voiced(NARRATION['3'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="钩码（每只 50 g）"
      stage={<Place at="l3" labels={labels}>
        <group position={[X, TOP, BENCH_Z]}>
          {/* 铁架台：垫斜时绕底座右下角的棱转 */}
          <group position={[PIVOT * U, 0, 0]} rotation-z={-deg * Math.PI / 180}><group position={[-PIVOT * U, 0, 0]}><Stand /></group></group>
          {/* 垫在底座左边下面的木楔 */}
          {deg > 0.2 && <RoundedBox args={[5 * U, Math.max(0.02, STAND.baseW * Math.sin(deg * Math.PI / 180) * U * 0.94), 12 * U]} radius={0.008} smoothness={2} position={[(3 - STAND.baseW / 2 + 2.6) * U, STAND.baseW * Math.sin(deg * Math.PI / 180) * U * 0.47, 0]} castShadow><Wood kind="dark" /></RoundedBox>}
          {/* 测力计和钩码：挂在横杆上，总是竖直的 */}
          <group position={[sc[0] * U, top * U, 0.1 * U]}>
            <SpringScale force={h.G}>
              <Hooks n={n} />
              {n > 0 && <Force from={[0, -n * HOOK_PITCH / 2 - 0.02, 0.08]} dir={[0, -1, 0]} len={h.G * PER} color="#ffd24a" thick={0.42} />}
            </SpringScale>
          </group>
          <group position={[pl[0] * U, pl[1] * U, 0]}><Plumb len={42} /></group>
          {/* 台面上还没挂的钩码 */}
          {Array.from({ length: MAX - n }, (_, i) => <group key={i} position={[(20 + i * 3.4) * U, 3.8 * U, (5 - (i % 2) * 2.4) * U]}><Hooks n={1} /></group>)}
          <RoundedBox args={[17 * U, 0.3 * U, 9 * U]} radius={0.006} smoothness={2} position={[25 * U, 0.15 * U, 3.8 * U]} receiveShadow><meshStandardMaterial color="#2e4a44" roughness={0.95} /></RoundedBox>
        </group>
      </Place>}
      lesson={<LessonBlock no="3" title="重力" concept="G = mg，方向竖直向下" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>由于地球的吸引而使物体受到的力叫<b className="text-white">重力</b>，用 G 表示。地球附近的所有物体都受到重力。</p>
          <p className="mt-3">物体所受的重力跟它的质量成正比：<b className="font-formula text-white">G = mg</b>。g = {G} N/kg，意思是质量 1 kg 的物体受到的重力是 {G} N。</p>
          <p className="mt-3">重力的方向<b className="text-white">竖直向下</b>。建筑工人用重垂线检查墙砌得直不直，用的就是这一点。</p>
          <p className="mt-3">重力在物体上的作用点叫<b className="text-white">重心</b>。形状规则、质量分布均匀的物体，重心在它的几何中心上。画面上的箭头就是从这串钩码的重心画出的。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四组数据和重垂线都看过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">重力跟质量成正比：G = mg；方向竖直向下</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">50、100、150、200 g 的钩码，重力是 {[1, 2, 3, 4].map(k => hooks(k).G.toFixed(2)).join('、')} N，比值都是 {G} N/kg。铁架台斜了，重垂线照样竖直向下。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">G = m g</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{settled ? h.G.toFixed(2) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">N</span></div>
          </div>
          <ScaleView F={h.G} />
          <div className="mt-3 grid grid-cols-3 gap-2">
            <ParamTile symbol="m" value={h.m.toFixed(2)} unit="kg" />
            <ParamTile symbol="g" value={String(G)} unit="N/kg" />
            <ParamTile symbol="G/m" value={n > 0 ? ratio(h.G, h.m).toFixed(1) : '—'} unit="N/kg" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">G–m 图线</h2>
          <Plot label="重力随质量变化的图线" pts={rows.map(k => ({ x: hooks(k).m, y: hooks(k).G }))} xm={(MAX + 1) * HOOK_M} ym={2.5} xt={[0.05, 0.1, 0.15, 0.2]} yt={[0.5, 1, 1.5, 2]} xl="m / kg" yl="G / N" />
          {rows.length > 0 && <table className="mt-2 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">m / kg</th><th className="text-right font-normal">G / N</th><th className="text-right font-normal">G ÷ m</th></tr></thead>
            <tbody>{rows.map(k => <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5 tabular-nums">{hooks(k).m.toFixed(2)}</td><td className="text-right tabular-nums">{hooks(k).G.toFixed(2)}</td><td className="text-right font-semibold text-[#7fe3d4] tabular-nums">{ratio(hooks(k).G, hooks(k).m).toFixed(1)}</td></tr>)}</tbody>
          </table>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'add'} onClick={add} disabled={!settled || n >= MAX || !dup}>挂一只钩码</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={!settled || dup}>记录</LabButton>
        <LabButton pulse={next === 'tilt'} onClick={() => setTilt(t => !t)} disabled={!still}>{tilt ? '把底座放平' : '垫斜底座'}</LabButton>
      </>}
      extras={null}
    />
  )
}
