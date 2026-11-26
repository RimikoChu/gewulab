// 等高线地形图 · 拓展课 用等高线地形图选路线、选址：翻山走哪条路，水库的坝修在哪，去哪看日出。每件事都有甲、乙两处，两处都试一试再比较。
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Spot from './stage'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { Dam, Flag, OnLand, Reservoir, Trail } from './marks'
import { DAMS, PASS_TO, TRAILS, VIEWPOINTS, WATER, X1, Y, altitude, damEnds, damLength, eastView, height, levels, reservoir, trail } from './physics'

type Job = 'trail' | 'dam' | 'sun'
type Pick = 'a' | 'b'
const JOB: Record<Job, string> = { trail: '翻山路线', dam: '水库坝址', sun: '看日出' }
const KEY = { trail: { a: 'saddle', b: 'peak' }, dam: { a: 'gorge', b: 'open' }, sun: { a: 'peakA', b: 'saddle' } } as const
const BTN: Record<Job, [string, string]> = { trail: ['走甲路', '走乙路'], dam: ['坝修在甲处', '坝修在乙处'], sun: ['去 A 峰山顶', '去鞍部'] }
const T1 = trail('saddle'), T2 = trail('peak'), RG = reservoir('gorge'), RO = reservoir('open'), SA = eastView('peakA'), SS = eastView('saddle')
const TASKS: Task[] = [
  { id: 'trail', text: '两条翻山的路都走一走，比一比', note: `经鞍部最高只到 ${T1.top} m，翻 A 峰要爬到 ${T2.top} m：翻山常走鞍部` },
  { id: 'dam', text: '把坝分别修在甲、乙两处，比一比', note: `峡谷口的坝只要 ${damLength('gorge')} m，水库却更大：坝址选在口小肚大的地方` },
  { id: 'sun', text: '分别去 A 峰山顶和鞍部看日出', note: '山顶东边没有更高的山；鞍部东边被 B 峰挡住了' },
]
const LINES = levels(100, 1600)
/** 太阳的光晕：中间亮、往外慢慢变淡的一张圆形贴图 */
const GLOW = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128
  const g = c.getContext('2d')!, r = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  r.addColorStop(0, 'rgba(255,240,210,0.9)'); r.addColorStop(0.25, 'rgba(255,200,120,0.45)'); r.addColorStop(1, 'rgba(255,170,80,0)')
  g.fillStyle = r; g.fillRect(0, 0, 128, 128)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
})()
const SUN: [number, number, number] = [X1 + 30, 9, -32]

export default function LessonX() {
  const [job, setJob] = useState<Job>('trail')
  const [tried, setTried] = useState<Record<Job, Pick[]>>({ trail: [], dam: [], sun: [] })
  const [now, setNow] = useState<Record<Job, Pick | null>>({ trail: null, dam: null, sun: null })
  const [busy, setBusy] = useState(false)
  const T = useTasks('gewu:contour:x', TASKS)
  const cur = now[job]
  const prog = useSlide(busy ? 1 : cur ? 1 : 0, 0.45)
  useEffect(() => { if (!busy) return; const t = setTimeout(() => { setBusy(false); const n = { ...tried, [job]: tried[job].includes(cur!) ? tried[job] : [...tried[job], cur!] }; setTried(n); T.check(id => n[id as Job].length === 2) }, 2400); return () => clearTimeout(t) }, [busy])   // eslint-disable-line react-hooks/exhaustive-deps
  const go = (p: Pick) => { if (busy) return; setNow(n => ({ ...n, [job]: p })); setBusy(true) }
  const resetAll = () => { setJob('trail'); setTried({ trail: [], dam: [], sun: [] }); setNow({ trail: null, dam: null, sun: null }); setBusy(false); T.reset() }

  const task = T.current, wantJob = (task?.id ?? job) as Job, todo: Pick | undefined = (['a', 'b'] as Pick[]).find(p => !tried[wantJob].includes(p))
  const { hint, next }: { hint: string; next: 'job' | Pick | null } = (() => {
    if (!task) return { hint: '都试过了。读懂等高线，就能替人选路、选址。', next: null }
    if (busy) return { hint: job === 'trail' ? '正在翻山…' : job === 'dam' ? '正在修坝、蓄水…' : '正在上山，等太阳出来…', next: null }
    if (job !== wantJob) return { hint: `换到“${JOB[wantJob]}”`, next: 'job' }
    const name = wantJob === 'trail' ? TRAILS[KEY.trail[todo!]].name : wantJob === 'dam' ? DAMS[KEY.dam[todo!]].name : VIEWPOINTS[KEY.sun[todo!]].name
    return { hint: tried[wantJob].length === 0 ? `先试“${name}”` : `再试“${name}”，比一比`, next: todo! }
  })()

  // ---- 场景里的东西 ----
  const walker = useMemo(() => {
    if (job !== 'trail' || !cur) return null
    const pts = TRAILS[KEY.trail[cur]].pts, seg: number[] = [0]
    for (let i = 1; i < pts.length; i++) seg.push(seg[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
    const d = prog * seg[seg.length - 1]; let i = 1; while (i < seg.length - 1 && seg[i] < d) i++
    const t = (d - seg[i - 1]) / (seg[i] - seg[i - 1] || 1), x = pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, z = pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t
    return [x, Y(height(x, z)) + 0.4, z] as [number, number, number]
  }, [job, cur, prog])
  const damK = cur && job === 'dam' ? KEY.dam[cur] : null, ends = damK ? damEnds(damK) : null, res = damK ? (damK === 'gorge' ? RG : RO) : null
  const bed = damK ? height(DAMS[damK].at[0], DAMS[damK].at[1]) : 0
  const look = cur && job === 'sun' ? KEY.sun[cur] : null, ev = look ? (look === 'peakA' ? SA : SS) : null
  const vp = look ? VIEWPOINTS[look].at : null

  const labels: Label[] = job === 'trail' ? (['a', 'b'] as Pick[]).map((p): Label => { const pts = TRAILS[KEY.trail[p]].pts, m = pts[p === 'a' ? 1 : 3]; return { id: p, at: [m[0], Y(height(m[0], m[1])) + 0.8, m[1]], ax: 0.5, className: `scene-tag -translate-y-full${cur === p ? ' key' : ''}`, children: TRAILS[KEY.trail[p]].name } })
    : job === 'dam' ? (['a', 'b'] as Pick[]).map((p): Label => { const [x, z] = DAMS[KEY.dam[p]].at; return { id: p, at: [x + 3.4, Y(WATER) + 0.6, z], className: `scene-tag -translate-y-1/2${cur === p ? ' key' : ''}`, children: DAMS[KEY.dam[p]].name } })
    : (['a', 'b'] as Pick[]).map((p): Label => { const [x, z] = VIEWPOINTS[KEY.sun[p]].at; return { id: p, at: [x, Y(altitude([x, z])) + 2.6, z], ax: 0.5, className: `scene-tag -translate-y-full${cur === p ? ' key' : ''}`, children: `${p === 'a' ? '甲' : '乙'}：${VIEWPOINTS[KEY.sun[p]].name}` } })
  if (job === 'sun' && ev && !busy) labels.push({ id: 'ev', at: [ev.blocked ? ev.at[0] : vp![0] + 8, Y(ev.blocked ? ev.block : altitude(vp!)) + 1.2, ev.at[1]], ax: 0.5, className: 'scene-tag -translate-y-full', children: ev.blocked ? '被 B 峰挡住' : '东边一览无余' })

  return (
    <LabShell title="等高线地形图" lessons={LESSONS} current="x" narration={voiced(NARRATION['x'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={JOB[job]}
      stage={<Spot at={job === 'trail' ? 'trail' : job === 'dam' ? 'dam' : 'sunrise'} labels={labels} want={{ lines: LINES }}>
        {job === 'trail' && <>
          <OnLand lift={0}>{(['a', 'b'] as Pick[]).map(p => <Trail key={p} pts={TRAILS[KEY.trail[p]].pts} color={p === 'a' ? '#7fe3d4' : '#ff9f6b'} width={cur === p ? 6 : 4} dash={!tried.trail.includes(p) && cur !== p} drape={0.2} />)}</OnLand>
          {walker && <mesh position={walker} renderOrder={12}><sphereGeometry args={[0.4, 18, 14]} /><meshBasicMaterial color={cur === 'a' ? '#7fe3d4' : '#ff9f6b'} toneMapped={false} depthTest={false} transparent /></mesh>}
          <Flag x={PASS_TO[0]} z={PASS_TO[1]} color="#e84a3a" s={1.8} />
        </>}
        {job === 'dam' && <>
          {(['a', 'b'] as Pick[]).map(p => <OnLand key={p} lift={0}><Trail pts={[[DAMS[KEY.dam[p]].at[0] - 2.5, DAMS[KEY.dam[p]].at[1]], [DAMS[KEY.dam[p]].at[0] + 2.5, DAMS[KEY.dam[p]].at[1]]]} color="#ffffff" width={3} dash drape={0.6} /></OnLand>)}
          {ends && damK && <Dam x0={ends[0]} x1={ends[1]} z={DAMS[damK].at[1]} crest={WATER} bed={bed} rise={Math.min(1, prog * 2)} />}
          {res && <Reservoir key={damK} cells={res.cells} level={WATER} fill={Math.max(0, prog * 2 - 1)} damZ={DAMS[damK!].at[1]} />}
        </>}
        {job === 'sun' && <>
          <mesh position={SUN}><sphereGeometry args={[4.5, 32, 24]} /><meshBasicMaterial color="#fff0c8" toneMapped={false} /></mesh>
          <sprite position={SUN} scale={[26, 26, 1]}><spriteMaterial map={GLOW} color="#ffc070" transparent depthWrite={false} toneMapped={false} /></sprite>
          {(['a', 'b'] as Pick[]).map(p => <Flag key={p} x={VIEWPOINTS[KEY.sun[p]].at[0]} z={VIEWPOINTS[KEY.sun[p]].at[1]} color={cur === p ? '#35c7b3' : '#e8e2d0'} s={1.8} />)}
          {ev && vp && !busy && <SightLine from={[vp[0], Y(altitude(vp)) + 0.3, vp[1]]} to={ev.blocked ? [ev.at[0], Y(ev.block), ev.at[1]] : [SUN[0], SUN[1], vp[1]]} blocked={ev.blocked} />}
        </>}
      </Spot>}
      lesson={<LessonBlock no="拓展" title="选路线 · 选址" concept="读懂等高线，替人选路、选址" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <ul className="flex flex-col gap-1.5">
            <li><b className="text-[#7fe3d4]">翻山：</b>常走两峰之间的鞍部（山口），要爬的高度少；路线选在等高线稀疏、坡缓的地方，避开陡崖。</li>
            <li><b className="text-[#7fe3d4]">坝址：</b>选在河谷“口小肚大”的地方：峡谷口等高线密集、两岸靠得近，坝短；上游开阔，能蓄更多水。</li>
            <li><b className="text-[#7fe3d4]">看日出：</b>选地势高、东边没有更高山峰挡住的地方。</li>
          </ul>
        </>} />}
      finale={T.finale && <>
        <p className="text-[17px] leading-snug font-bold">翻山走鞍部，坝修在峡谷口，到 A 峰山顶看日出</p>
        <p className="mt-1 text-[14px] text-white/70">等高线的疏密、弯曲和数值，说出了哪里陡、哪里窄、哪里高。</p>
      </>}
      panel={
        <Glass className="px-4 py-4">
          <h2 className="text-[13px] text-white/60">{JOB[job]}</h2>
          {job === 'trail' && <div className="mt-2 grid grid-cols-2 gap-2">
            {(['a', 'b'] as Pick[]).map(p => { const r = p === 'a' ? T1 : T2; const ok = tried.trail.includes(p); return <ParamTile key={p} symbol={p === 'a' ? '甲：经鞍部' : '乙：翻 A 峰'} value={ok ? `${r.top} m` : '—'} unit={ok ? `路上最高处 · 要爬 ${r.climb} m` : '路上最高处'} /> })}
          </div>}
          {job === 'dam' && <div className="mt-2 grid grid-cols-2 gap-2">
            {(['a', 'b'] as Pick[]).map(p => { const k = KEY.dam[p], ok = tried.dam.includes(p); return <ParamTile key={p} symbol={p === 'a' ? '甲：峡谷口' : '乙：宽谷中'} value={ok ? `${damLength(k)} m` : '—'} unit={ok ? `坝长 · 水库约 ${(k === 'gorge' ? RG : RO).km2.toFixed(1)} km²` : '坝长'} /> })}
          </div>}
          {job === 'sun' && <div className="mt-2 grid grid-cols-2 gap-2">
            {(['a', 'b'] as Pick[]).map(p => { const k = KEY.sun[p], ok = tried.sun.includes(p), e = k === 'peakA' ? SA : SS; return <ParamTile key={p} symbol={VIEWPOINTS[k].name} value={ok ? (e.blocked ? '挡住' : '看得见') : '—'} unit={ok ? (e.blocked ? `东边 ${e.block} m 的山挡住了` : `海拔 ${altitude(VIEWPOINTS[k].at)} m，东边更低`) : '东边有没有遮挡'} /> })}
          </div>}
          <p className="mt-3 text-[13px] leading-relaxed text-white/55">{job === 'trail' ? '两条路都从山谷里出发，翻到山岭北边去。' : job === 'dam' ? `两处的坝都把水蓄到海拔 ${WATER} m。` : '太阳从东边升起。'}</p>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'a'} onClick={() => go('a')} disabled={busy}>{BTN[job][0]}</LabButton>
        <LabButton pulse={next === 'b'} onClick={() => go('b')} disabled={busy}>{BTN[job][1]}</LabButton>
      </>}
      extras={<Control label="做哪件事"><Segmented label="做哪件事" pulse={next === 'job'} want={next === 'job' ? wantJob : null} value={job} disabled={busy} onChange={setJob} options={(Object.keys(JOB) as Job[]).map(j => ({ value: j, label: JOB[j] }))} /></Control>}
    />
  )
}

/** 视线：从观景点朝东望去的一条线；被挡住时是红色，停在挡住的山上 */
function SightLine({ from, to, blocked }: { from: [number, number, number]; to: [number, number, number]; blocked: boolean }) {
  const mid: [number, number, number] = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2]
  const len = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2])
  const ang = Math.atan2(to[1] - from[1], to[0] - from[0])
  return <mesh position={mid} rotation-z={ang} renderOrder={11}><boxGeometry args={[len, 0.1, 0.1]} /><meshBasicMaterial color={blocked ? '#ff5a4a' : '#ffd36b'} toneMapped={false} transparent opacity={0.9} depthTest={false} /></mesh>
}
