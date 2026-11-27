// 相似和测量 · 第 2 课 两角相等就相似：教学楼前的广场上，先摆一根底边木条，在两端各放一个大量角器，定出 50° 和 60°，
// 两根木条转过去交于一点，就是一个三角形。换三种底边各摆一个，量三边：三边都按同一个比放大，第三个角都是 70°。
import { useMemo, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { Clipboard, ANG, Arc, Lath, Place, SIDE, ease, spot, tag, tagStyle, useRun, type V3 } from './parts'
import { onPlane, sideLabels, vertexLabels } from './figure'
import { makeProtractorFlat } from './mats'
import { ANG2, BASES2, f2, ratio2, tri2, type P2 } from './physics'
import { ST } from './world'

type B = 'b1' | 'b15' | 'b2'
const KEYS: B[] = ['b1', 'b15', 'b2']
const BASE: Record<B, number> = { b1: BASES2[0], b15: BASES2[1], b2: BASES2[2] }
const OFF: Record<B, number> = { b1: 0, b15: 1.45, b2: 3.3 }          // 三个三角形在地上从左往右排
const TASKS: Task[] = KEYS.map((k, i) => ({ id: k, text: `底边 ${f2(BASE[k])} m：定 50° 和 60°，量三边`, note: i === 0 ? '第三个角是 70°；记下三边' : `三条边都是第一组的 ${ratio2(BASE[k]).c} 倍，第三个角还是 70°` }))
const O: V3 = [ST.l2.x - 2.6, 0.003, ST.l2.z + 0.6]
const at = onPlane(O)

/** 平放在地上的教学用大量角器：一块 4 mm 厚、淡蓝透明的有机玻璃半圆板，上面印着两套刻度。直边沿着底边，圆弧朝三角形里面；flip 时从右往左量（读内圈的数） */
function FlatProtractor({ p, R = 0.3, flip = false }: { p: V3; R?: number; flip?: boolean }) {
  const tex = makeProtractorFlat()
  const plate = useMemo(() => { const s = new THREE.Shape(); s.absarc(0, 0, R, 0, Math.PI, false); s.lineTo(R, 0); const g = new THREE.ExtrudeGeometry(s, { depth: 0.004, bevelEnabled: true, bevelThickness: 0.0008, bevelSize: 0.0012, bevelSegments: 1, curveSegments: 48 }); g.rotateX(-Math.PI / 2); return g }, [R])
  return <group position={[p[0], p[1], p[2]]} rotation-y={flip ? 0 : 0}>
    <mesh geometry={plate} renderOrder={5}><meshPhysicalMaterial color="#cfe8f2" transparent opacity={0.32} roughness={0.08} clearcoat={1} envMapIntensity={1.4} depthWrite={false} /></mesh>
    <mesh position={[0, 0.0052, -R * 0.5 * 1.08 + R * 0.04]} rotation-x={-Math.PI / 2} renderOrder={6}><planeGeometry args={[2 * R * 1.032, R * 1.088]} /><meshBasicMaterial map={tex} transparent depthWrite={false} toneMapped={false} /></mesh>
  </group>
}

export default function Lesson2() {
  const [k, setK] = useState<B>('b1')
  const [rows, setRows] = useState<B[]>([])
  const T = useTasks('gewu:similar:2', TASKS)
  const lay = useRun(3), meas = useRun(1.6)
  const laid = lay.k >= 1, measured = meas.k >= 1, recorded = rows.includes(k)
  const pick = (v: B) => { if (lay.busy || meas.busy) return; setK(v); lay.snap(0); meas.snap(0) }
  const record = () => { if (!measured || recorded) return; const n = [...rows, k]; setRows(n); T.check(id => n.includes(id as B)) }
  const resetAll = () => { setK('b1'); setRows([]); lay.snap(0); meas.snap(0); T.reset() }
  const t = tri2(BASE[k])

  const task = T.current
  const { hint, next }: { hint: string; next: 'k' | 'lay' | 'meas' | 'rec' | null } = (() => {
    if (!task) return { hint: '两个角分别相等，三角形就相似。', next: null }
    if (k !== task.id) return { hint: `换成底边 ${f2(BASE[task.id as B])} m`, next: 'k' }
    if (lay.busy) return { hint: '两根木条转过去…', next: null }
    if (!laid) return { hint: `底边 ${f2(BASE[k])} m：在两端用量角器定出 50° 和 60°，摆出三角形`, next: 'lay' }
    if (meas.busy) return { hint: '量三条边…', next: null }
    if (!measured) return { hint: '量一量三条边，看看第三个角', next: 'meas' }
    return { hint: k === 'b1' ? '第三个角是 70°：记下三条边' : `三条边都是第一组的 ${ratio2(BASE[k]).c} 倍：记下来`, next: 'rec' }
  })()

  // 已经记下的三角形留在地上，当前这个按摆的进度画
  const shown = KEYS.filter(x => rows.includes(x) || x === k)
  const view = useMemo(() => { const w = OFF[k] + BASE[k]; return spot(O[0] + w / 2, 0.1, O[2] - 0.45 - BASE[k] * 0.3, w + 0.4, 0.75 * BASE[k] + 0.6, -0.18, 0.4) }, [k])
  const labels: Label[] = []
  for (const x of shown) {
    const tt = tri2(BASE[x]), a2 = onPlane([O[0] + OFF[x], O[1], O[2]]), op = x === k ? Math.min(1, meas.k * 1.5) : 1
    if (x === k && !measured && !rows.includes(x)) { if (laid) labels.push(...vertexLabels(`v${x}`, tt.pts, a2, ['A', 'B', 'C'])) }
    labels.push(...sideLabels(x, tt.pts, a2, i => `${f2([tt.c, tt.a, tt.b][i])}`, op, 0.13))
    const ang = [ANG2.A, ANG2.B, tt.C], pos: P2[] = [[0.34, 0.12], [tt.c - 0.34, 0.12], [tt.pts[2][0], tt.pts[2][1] - 0.36]]
    pos.forEach((p, i) => labels.push({ id: `${x}a${i}`, at: a2(p[0], p[1], 0.05), ax: 0.5, className: `${tag} transition-opacity`, style: tagStyle(ANG[i], { opacity: i < 2 ? (x === k ? Math.min(1, lay.k * 3) : 1) : op, fontSize: 14, padding: '1px 7px' }), children: `${ang[i]}°` }))
  }
  return (
    <LabShell title="相似和测量" lessons={LESSONS} current="2" narration={voiced(NARRATION['2'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="量角器和木条"
      stage={<Place view={view} labels={labels} elev={52}>
        <Clipboard at={at(-0.5, 0.2, 0)} yaw={-0.2} />
        {shown.map(x => <Tri key={x} c={BASE[x]} u0={OFF[x]} k={x === k ? lay.k : 1} />)}
      </Place>}
      lesson={<LessonBlock no="2" title="两角相等就相似" concept="两个角分别相等，三角形就相似" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>三角形的内角和是 180°。两个角分别是 50° 和 60°，第三个角一定是 70°：三个角都对应相等。</p>
          <p className="mt-3">底边定了、两端的角定了，两根木条只能交在一个点上，三角形就定了。底边放大几倍，整个三角形也放大几倍，三边成比例。</p>
          <p className="mt-3">判定两个三角形相似：<b className="text-white">两角分别相等</b>；或者<b className="text-white">三边成比例</b>；或者<b className="text-white">两边成比例且夹角相等</b>。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[17px] leading-snug font-bold">只要两个角分别相等，三角形就相似</p>
        <p className="mt-1 text-[14px] text-white/70">50° 和 60° 定下来，第三个角就是 70°；底边 1 m、1.5 m、2 m，三边之比都是 1 ∶ 1.5 ∶ 2。</p>
      </>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">∠A · ∠B · ∠C</div>
            <div className="mt-1 text-[30px] leading-none font-bold tracking-tight tabular-nums"><span style={{ color: ANG[0] }}>50°</span> · <span style={{ color: ANG[1] }}>60°</span> · <span style={{ color: ANG[2] }}>{laid ? '70°' : '?'}</span></div>
          </div>
          <table className="mt-4 w-full text-[14px] tabular-nums">
            <thead><tr className="text-white/55"><th className="py-1 text-left font-normal">m</th><th className="font-normal" style={{ color: SIDE[0] }}>AB</th><th className="font-normal" style={{ color: SIDE[1] }}>BC</th><th className="font-normal" style={{ color: SIDE[2] }}>CA</th><th className="font-normal">比</th></tr></thead>
            <tbody>{KEYS.map((x, i) => { const tt = tri2(BASE[x]), on = rows.includes(x) || (x === k && measured); return <tr key={x} className={on ? 'text-white' : 'text-white/30'}>
              <td className="py-1">第 {i + 1} 组</td><td className="text-center">{f2(tt.c)}</td><td className="text-center">{on ? f2(tt.a) : '—'}</td><td className="text-center">{on ? f2(tt.b) : '—'}</td><td className="text-center">{on ? ratio2(BASE[x]).c : '—'}</td>
            </tr> })}</tbody>
          </table>
          <p className="mt-3 text-[13px] leading-relaxed text-white/60">“比”是和第 1 组对应边的比。底边 {f2(t.c)} m 时：BC ÷ 0.82 = AC ÷ 0.92 = {ratio2(t.c).c}</p>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'lay'} onClick={lay.run} disabled={lay.busy || laid}>定两个角</LabButton>
        <LabButton pulse={next === 'meas'} onClick={meas.run} disabled={!laid || meas.busy || measured}>量三条边</LabButton>
        <LabButton primary pulse={next === 'rec'} onClick={record} disabled={!measured || recorded}>记录数据</LabButton>
      </>}
      extras={<Control label="底边"><Segmented label="底边" pulse={next === 'k'} want={next === 'k' ? task!.id as B : null} disabled={lay.busy || meas.busy} value={k} onChange={pick} options={KEYS.map(x => ({ value: x, label: `${f2(BASE[x])} m` }))} /></Control>}
    />
  )
}

/** 一个三角形：底边木条一直在；两端的量角器；两根木条从贴着底边的位置转到 50°、60°，再伸长到交点 */
function Tri({ c, u0, k }: { c: number; u0: number; k: number }) {
  const a2 = onPlane([O[0] + u0, O[1], O[2]]), t = tri2(c)
  const turn = ease(Math.min(1, k * 1.7)), grow = ease(Math.max(0, Math.min(1, (k - 0.45) / 0.55)))
  const aA = ANG2.A * Math.PI / 180 * turn, aB = Math.PI - ANG2.B * Math.PI / 180 * turn
  const lA = 0.35 + (t.b - 0.35) * grow, lB = 0.35 + (t.a - 0.35) * grow
  const C1: P2 = [Math.cos(aA) * lA, Math.sin(aA) * lA], C2: P2 = [c + Math.cos(aB) * lB, Math.sin(aB) * lB]
  const pr = k < 1
  const vA = a2(0, 0, 0.03), vB = a2(c, 0, 0.03)
  return <group>
    <Lath p={a2(0, 0, 0.002)} q={a2(c, 0, 0.002)} color={SIDE[0]} w={0.06} />
    <Lath p={a2(0, 0, 0.002)} q={a2(C1[0], C1[1], 0.002)} color={SIDE[2]} w={0.06} />
    <Lath p={a2(c, 0, 0.002)} q={a2(C2[0], C2[1], 0.002)} color={SIDE[1]} w={0.06} />
    {pr && <><FlatProtractor p={a2(0, 0, 0.032)} /><FlatProtractor p={a2(c, 0, 0.032)} /></>}
    {k > 0 && <>
      <Arc v={vA} p={a2(1, 0, 0.03)} q={a2(Math.cos(aA), Math.sin(aA), 0.03)} rad={0.17} color={ANG[0]} r={0.012} />
      <Arc v={vB} p={a2(c - 1, 0, 0.03)} q={a2(c + Math.cos(aB), Math.sin(aB), 0.03)} rad={0.17} color={ANG[1]} r={0.012} />
    </>}
    {k >= 1 && <Arc v={a2(t.pts[2][0], t.pts[2][1], 0.03)} p={a2(0, 0, 0.03)} q={a2(c, 0, 0.03)} rad={0.17} color={ANG[2]} r={0.012} />}
  </group>
}
