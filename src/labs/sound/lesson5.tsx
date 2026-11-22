// 声现象 · 第 5 课 响度的大小（响度和振幅有关，还和离声源的远近有关）：轻敲、重敲一面鼓，用分贝仪在近处和远处各量一次
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { DRUM_TOP, Drum, Hall, METER_MIC, Mallet, Meter, P, Rings, SWING, ringing, type Hit, type Pose } from './gear'
import { LESSONS, goLesson } from './lessons'
import { AMPS, FAR, NEAR, level, type HitKey } from './physics'

type Pos = 'near' | 'far'
const DIST: Record<Pos, number> = { near: NEAR, far: FAR }, HIT: Record<HitKey, string> = { soft: '轻敲', hard: '重敲' }
const read = (id: string) => { const [h, p] = id.split(':') as [HitKey, Pos]; return level(AMPS[h], DIST[p]) }
const TASKS: Task[] = [
  { id: 'soft:near', text: `分贝仪离鼓 ${NEAR} m：轻敲一下，记录`, note: `约 ${read('soft:near').toFixed(0)} dB：纸屑跳得不高，鼓面的振幅小` },
  { id: 'hard:near', text: '位置不变：重敲一下，记录', note: `约 ${read('hard:near').toFixed(0)} dB：纸屑跳得高，振幅大，响度大` },
  { id: 'hard:far', text: `把分贝仪挪到 ${FAR} m 处：再重敲一下，记录`, note: `约 ${read('hard:far').toFixed(0)} dB：同样重的一敲，离远了就没那么响` },
]
/** 画面里 1 m 画多长；鼓放在哪 */
const M = 4, DX = -2.3
const REST: Pose = { p: [DX - 0.55, 0.11, 1.12], a: Math.PI - 0.06 }, STRIKE: Pose = { p: [DX - 0.1, DRUM_TOP + 0.11, 0], a: Math.PI + 0.55 }
/** 台面上的卷尺：从鼓心量起，每 10 cm 一道刻线 */
function makeTape() {
  const W = 1024, H = 48, c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!, px = W / 1.2
  g.fillStyle = '#e8c93a'; g.fillRect(0, 0, W, H); g.fillStyle = '#15181b'; g.textAlign = 'center'; g.font = '700 24px sans-serif'
  for (let i = 0; i <= 120; i += 2) { const x = i / 100 * px; g.fillRect(x - 1, 0, i % 10 ? 2 : 4, i % 10 ? 10 : 20) }
  for (const m of [0.5, 1]) g.fillText(`${m} m`, m * px - (m === 1 ? 0 : 0), 43)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}

export default function Lesson5() {
  const [pos, setPos] = useState<Pos>('near')
  const [hit, setHit] = useState<Hit | null>(null)
  const [last, setLast] = useState<string | null>(null)      // 分贝仪上留着的那次读数
  const [kind, setKind] = useState<HitKey>('soft')
  const [rows, setRows] = useState<string[]>([])
  const T = useTasks('gewu:sound:5', TASKS)
  const tape = useMemo(makeTape, [])
  const d = useSlide(DIST[pos], 0.5), moving = Math.abs(d - DIST[pos]) > 0.001, mx = DX + d * M
  const strike = (k: HitKey) => { if (moving) return; setKind(k); setLast(null); setHit({ t: performance.now() + SWING, amp: k === 'hard' ? 1 : 0.5 }) }
  useEffect(() => { if (!hit) return; const t = setTimeout(() => setLast(`${kind}:${pos}`), Math.max(0, hit.t - performance.now()) + 250); return () => clearTimeout(t) }, [hit])   // eslint-disable-line react-hooks/exhaustive-deps
  const dup = !!last && rows.includes(last)
  const record = () => { if (!last || dup) return; const n = [...rows, last]; setRows(n); T.check(id => n.includes(id)) }
  const pick = (p: Pos) => { setPos(p); setLast(null); setHit(null) }
  const resetAll = () => { setPos('near'); setHit(null); setLast(null); setRows([]); T.reset() }
  const lv = () => ringing(hit, 1.5)
  const task = T.current, [th, tp] = (task?.id ?? ':').split(':') as [HitKey, Pos]
  const { hint, next }: { hint: string; next: 'pos' | 'soft' | 'hard' | 'record' | null } = !task ? { hint: '都量过了。敲得越重，振幅越大，响度越大；离得越远，听到的越轻。', next: null }
    : moving ? { hint: '分贝仪在挪…', next: null }
    : pos !== tp ? { hint: `把分贝仪挪到离鼓 ${DIST[tp]} m 处`, next: 'pos' }
    : last === task.id ? { hint: `分贝仪读到约 ${read(last).toFixed(0)} dB，按“记录”`, next: 'record' } : { hint: `按“${HIT[th]}”，看纸屑跳多高、分贝仪读多少`, next: th }
  const labels: Label[] = [
    { id: 'a', at: P('drum', DX, DRUM_TOP + 1.25), ax: 0.5, className: 'scene-tag -translate-y-full transition-opacity', style: { opacity: last ? 1 : 0 }, children: <><small>鼓面振幅</small>{AMPS[kind]} mm</> },
    { id: 'm', at: P('drum', mx + 0.35, METER_MIC + 0.1), className: `scene-tag -translate-y-1/2${last ? ' key' : ''}`, children: last ? <><small>响度</small>约 {read(last).toFixed(0)} dB</> : <><small>离鼓</small>{d.toFixed(1)} m</> },
    { id: 'n', at: P('drum', mx, 0.05, 0.75), ax: 0.5, name: true, className: 'scene-name', children: '分贝仪' },
    { id: 'd', at: P('drum', DX, 0.1, 1.45), ax: 0.5, name: true, className: 'scene-name', children: '鼓面上撒了碎纸屑' },
  ]
  return (
    <LabShell title="声现象" lessons={LESSONS} current="5" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="鼓"
      stage={<Hall at="drum" labels={labels}>
        <Drum x={DX} level={lv} jump={0.9} />
        <Mallet rest={REST} hit={STRIKE} t0={hit ? hit.t - SWING : null} />
        <mesh position={[DX + 0.6 * M, 0.004, 0.62]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[1.2 * M, 0.2]} /><meshStandardMaterial map={tape} roughness={0.7} /></mesh>
        <Meter x={mx} text={last ? `${read(last).toFixed(0)}` : '--'} />
        <Rings at={[DX, DRUM_TOP + 0.15, 0]} level={lv} r0={0.5} r1={5.2} n={6} half />
      </Hall>}
      lesson={<LessonBlock no="5" title="响度的大小" concept="振幅越大，响度越大；离得越远越轻" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>声音的强弱叫<b className="text-white">响度</b>。物体振动的幅度叫<b className="text-white">振幅</b>：振幅越大，响度越大。响度还和离声源的远近有关：离得越远，听到的声音越轻。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>重敲时纸屑跳得高，说明鼓面的振幅大</li>
            <li>声音向四面八方散开，越远越分散，所以越远越轻</li>
            <li>人们用分贝（dB）来表示声音强弱的等级</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">这里设定：轻敲时振幅 {AMPS.soft} mm，在 {NEAR} m 处是 {level(AMPS.soft, NEAR)} dB。振幅加倍约高 6 dB，距离加倍约低 6 dB（空旷处的算法，初中不要求）。所以重敲、站远一倍，读数又回到了 {level(AMPS.hard, FAR).toFixed(0)} dB 左右。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三次都量过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">振幅越大，响度越大；离得越远，越轻</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">重敲比轻敲高了约 6 dB；分贝仪退远一倍，又低了约 6 dB。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">分贝仪的读数</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{last ? `约 ${read(last).toFixed(0)}` : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">dB</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="振幅" value={last ? `${AMPS[kind]} mm` : '—'} unit={last ? HIT[kind] : '还没敲'} />
            <ParamTile symbol="距离" value={`${DIST[pos]} m`} unit="分贝仪离鼓" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">数据表</h2>
          {rows.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">每敲一下，等分贝仪出了读数再记。</p>
            : <table className="mt-1 w-full text-[13.5px]">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">怎么敲</th><th className="font-normal">振幅</th><th className="font-normal">距离</th><th className="text-right font-normal">响度</th></tr></thead>
                <tbody>{rows.map(id => { const [h, p] = id.split(':') as [HitKey, Pos]; return <tr key={id} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{HIT[h]}</td><td className="tabular-nums">{AMPS[h]} mm</td><td className="tabular-nums">{DIST[p]} m</td><td className="text-right font-semibold text-[#7fe3d4] tabular-nums">约 {read(id).toFixed(0)} dB</td></tr> })}</tbody>
              </table>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'soft'} onClick={() => strike('soft')} disabled={moving}>轻敲</LabButton>
        <LabButton pulse={next === 'hard'} onClick={() => strike('hard')} disabled={moving}>重敲</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={!last || dup}>记录</LabButton>
      </>}
      extras={<Control label="分贝仪离鼓"><Segmented label="分贝仪离鼓" pulse={next === 'pos'} want={next === 'pos' ? tp : null} value={pos} onChange={pick} options={[{ value: 'near', label: `${NEAR} m` }, { value: 'far', label: `${FAR} m` }]} /></Control>}
    />
  )
}
