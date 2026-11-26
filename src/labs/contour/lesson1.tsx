// 等高线地形图 · 第 1 课 海拔和相对高度：从海平面量 A 峰和山脚村庄有多高，再算两地差多少。
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Spot from './stage'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { SeaLevel, Staff } from './marks'
import { SPOTS, Y, altitude, relHeight, type SpotKey } from './physics'

const A = SPOTS.peak.at, V = SPOTS.village.at
const TASKS: Task[] = [
  { id: 'peak', text: '量出 A 峰山顶的海拔', note: `A 峰山顶海拔 ${altitude(A)} m` },
  { id: 'village', text: '换到山脚村庄，再量一次海拔', note: `村庄海拔 ${altitude(V)} m` },
  { id: 'rel', text: '算出山顶比村庄高多少', note: `相对高度 ${relHeight(A, V)} m` },
]

export default function Lesson1() {
  const [spot, setSpot] = useState<SpotKey>('peak')
  const [measured, setMeasured] = useState<SpotKey[]>([])
  const [rel, setRel] = useState(false)
  const [busy, setBusy] = useState(false)
  const T = useTasks('gewu:contour:1', TASKS)
  // 标尺从海平面升起来：A 峰 2.4 秒，村庄短一些
  const grow = { peak: useSlide(measured.includes('peak') ? 1 : 0, 0.42), village: useSlide(measured.includes('village') ? 1 : 0, 0.9) }
  const relShow = useSlide(rel ? 1 : 0, 0.7)
  useEffect(() => { if (!busy) return; const t = setTimeout(() => { setBusy(false); T.check(id => id === spot) }, spot === 'peak' ? 2500 : 1300); return () => clearTimeout(t) }, [busy])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!rel) return; const t = setTimeout(() => T.check(id => id === 'rel'), 1500); return () => clearTimeout(t) }, [rel])   // eslint-disable-line react-hooks/exhaustive-deps
  const measure = () => { if (busy || measured.includes(spot)) return; setMeasured(m => [...m, spot]); setBusy(true) }
  const both = measured.includes('peak') && measured.includes('village') && !busy
  const resetAll = () => { setSpot('peak'); setMeasured([]); setRel(false); setBusy(false); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'spot' | 'measure' | 'rel' | null } = (() => {
    if (!task) return { hint: '都量完了。海拔从海平面算起，相对高度是两地的海拔差。', next: null }
    if (busy) return { hint: '标尺正从海平面往上升…', next: null }
    if (task.id === 'rel') return rel ? { hint: '看两条虚线之间的高差', next: null } : { hint: '两处都量好了：算一算山顶比村庄高多少', next: 'rel' }
    if (spot !== task.id) return { hint: `换到“${SPOTS[task.id as SpotKey].name}”`, next: 'spot' }
    return { hint: spot === 'peak' ? '从海平面量起：量一量 A 峰山顶的海拔' : '再量一量村庄的海拔', next: 'measure' }
  })()

  const hA = altitude(A), hV = altitude(V), relH = relHeight(A, V)
  const labels: Label[] = [
    { id: 'sea', at: [-44, 0.2, 30], className: 'scene-name -translate-y-full', children: '海平面 · 海拔 0 m' },
    { id: 'nA', at: [A[0], Y(hA) + 1.6, A[1]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: 'A 峰' },
    { id: 'nV', at: [V[0], Y(hV) + 1.2, V[1]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '山脚村庄' },
    { id: 'rA', at: [A[0] + 0.6, Y(hA), A[1]], className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: grow.peak > 0.99 ? 1 : 0 }, children: <><small>海拔</small>{hA} m</> },
    { id: 'rV', at: [V[0] + 0.6, Y(hV) + 0.6, V[1]], className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: grow.village > 0.99 ? 1 : 0 }, children: <><small>海拔</small>{hV} m</> },
    { id: 'rel', at: [A[0] + 3.2, (Y(hA) + Y(hV)) / 2, A[1]], className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: relShow > 0.99 ? 1 : 0 }, children: <><small>相对高度</small>{relH} m</> },
  ]
  return (
    <LabShell title="等高线地形图" lessons={LESSONS} current="1" narration={voiced(NARRATION['1'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="测量"
      stage={<Spot at="side" labels={labels} want={{}}>
        <SeaLevel on={measured.length > 0} />
        <Staff x={A[0]} z={A[1]} h={hA} show={grow.peak} />
        <Staff x={V[0]} z={V[1]} h={hV} show={grow.village} />
        <RelBar a={A} hA={hA} hV={hV} vx={V[0]} vz={V[1]} show={relShow} />
      </Spot>}
      lesson={<LessonBlock no="1" title="海拔和相对高度" concept="海拔从海平面算起，相对高度是两地海拔之差" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>地面某个地点高出<b className="text-white">海平面</b>的垂直距离，叫<b className="text-white">海拔</b>（也叫绝对高度）。</p>
          <p className="mt-2">某个地点高出另一个地点的垂直距离，叫<b className="text-white">相对高度</b>。它等于两地海拔之差。</p>
          <p className="mt-3 text-[13.5px] text-white/65">沙盘上的山在竖直方向放大了一些，坡看起来比实际陡。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[17px] leading-snug font-bold">A 峰海拔 {hA} m，村庄海拔 {hV} m，山顶比村庄高 {relH} m</p>
        <p className="mt-1 text-[14px] text-white/70">海拔都从海平面量起；相对高度 = 两地海拔之差。</p>
      </>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{SPOTS[spot].name} · 海拔</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{measured.includes(spot) && !(busy && task?.id === spot) ? altitude(SPOTS[spot].at) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">m</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="A 峰" value={T.done.peak ? `${hA}` : '—'} unit="m · 海拔" />
            <ParamTile symbol="村庄" value={T.done.village ? `${hV}` : '—'} unit="m · 海拔" />
          </div>
          <div className="mt-2 rounded-xl bg-white/8 px-3 py-2.5">
            <div className="text-[12.5px] text-white/55">相对高度 = A 峰海拔 − 村庄海拔</div>
            <div className="mt-1 text-[20px] font-bold tabular-nums">{T.done.rel ? `${hA} − ${hV} = ${relH} m` : '—'}</div>
          </div>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'measure'} onClick={measure} disabled={busy || measured.includes(spot)}>量海拔</LabButton>
        <LabButton primary pulse={next === 'rel'} onClick={() => setRel(true)} disabled={!both || rel}>算相对高度</LabButton>
      </>}
      extras={<Control label="量哪里"><Segmented label="量哪里" pulse={next === 'spot'} want={next === 'spot' ? task!.id as SpotKey : null} value={spot} disabled={busy} onChange={setSpot} options={(Object.keys(SPOTS) as SpotKey[]).map(k => ({ value: k, label: SPOTS[k].name }))} /></Control>}
    />
  )
}

/** 相对高度：两条水平虚线（山顶、村庄的高度）之间一道竖着的量尺 */
function RelBar({ a, hA, hV, vx, vz, show }: { a: readonly [number, number]; hA: number; hV: number; vx: number; vz: number; show: number }) {
  if (show < 0.01) return null
  const x = a[0] + 2.6, yA = Y(hA), yV = Y(hV), top = yV + (yA - yV) * show
  const bar = (x0: number, z0: number, x1: number, z1: number, y: number, k: number) => {
    const len = Math.hypot(x1 - x0, z1 - z0) * k
    return <mesh position={[x0 + (x1 - x0) * k / 2, y, z0 + (z1 - z0) * k / 2]} rotation-y={-Math.atan2(z1 - z0, x1 - x0)} renderOrder={11}><boxGeometry args={[len, 0.09, 0.09]} /><meshBasicMaterial color="#bfeaff" transparent opacity={0.9} depthTest={false} toneMapped={false} /></mesh>
  }
  return (
    <group>
      {bar(vx, vz, x, a[1], yV, show)}
      {bar(a[0], a[1], x, a[1], yA, show)}
      <mesh position={[x, (yV + top) / 2, a[1]]} renderOrder={12}><boxGeometry args={[0.22, Math.max(0.01, top - yV), 0.22]} /><meshBasicMaterial color="#35c7b3" toneMapped={false} depthTest={false} transparent /></mesh>
    </group>
  )
}
