// 光的折射和凸透镜成像 · 第 7 课 两块透镜接力（望远镜和显微镜）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { Axis, Candle, Dark, Lens, Ray } from './optics'
import { SCOPES, type ScopeKey } from './physics'
import { AXIS, ST } from './world'

const KEYS = Object.keys(SCOPES) as ScopeKey[]
const TASKS: Task[] = KEYS.map(k => ({ id: k, text: `${SCOPES[k].name}：一步一步看两块透镜各做了什么`, note: SCOPES[k].steps.join('；') }))
// 两种仪器的摆法（画面里的位置，示意）：物镜、目镜的 x，中间那个实像的 x 和高度，物体的 x 和高度（望远镜的物体在很远处，不画）
const LAY = { telescope: { ob: -1.25, ey: 0.85, ix: 0.45, ih: -0.13, ox: null as number | null, oh: 0 }, microscope: { ob: -1.25, ey: 0.85, ix: 0.4, ih: -0.34, ox: -1.55, oh: 0.07 } }
const X0 = ST.scope

export default function Lesson7() {
  const [kind, setKind] = useState<ScopeKey>('telescope')
  const [n, setN] = useState(0)
  const [did, setDid] = useState<ScopeKey[]>([])
  const T = useTasks('gewu:lens:7', TASKS)
  const s = SCOPES[kind], L = LAY[kind], full = n >= s.steps.length
  const go = () => { if (full) return; const k = n + 1; setN(k); if (k >= s.steps.length) { const next = did.includes(kind) ? did : [...did, kind]; setDid(next); T.check(id => next.includes(id as ScopeKey)) } }
  const pick = (k: ScopeKey) => { setKind(k); setN(0) }
  const resetAll = () => { setKind('telescope'); setN(0); setDid([]); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'kind' | 'go' | null } = !task ? { hint: '两种都看过了。都是物镜先成一个实像，目镜再把它放大。', next: null }
    : kind !== task.id ? { hint: `换成“${SCOPES[task.id as ScopeKey].name}”`, next: 'kind' } : full ? { hint: s.steps[s.steps.length - 1], next: null } : { hint: `${n ? `${s.steps[n - 1]}。` : ''}按“下一步”`, next: 'go' }
  const tip: [number, number] = [X0 + L.ix, AXIS + L.ih]
  const labels: Label[] = [
    { id: 'ob', at: [X0 + L.ob, AXIS + 0.66, 0.3], ax: 0.5, className: `scene-tag -translate-y-full${n === 1 ? ' key' : ''}`, children: '物镜' },
    { id: 'ey', at: [X0 + L.ey, AXIS + 0.5, 0.3], ax: 0.5, className: `scene-tag -translate-y-full${n === 2 ? ' key' : ''}`, children: '目镜' },
    { id: 'im', at: [X0 + L.ix, AXIS + L.ih - 0.06, 0.3], ax: 0.5, className: 'scene-name transition-opacity', style: { opacity: n >= 1 ? 1 : 0 }, children: kind === 'telescope' ? '倒立、缩小的实像' : '倒立、放大的实像' },
    { id: 'e', at: [X0 + L.ey + 0.56, AXIS + 0.24, 0.3], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '眼睛' },
  ]

  return (
    <LabShell title="折射和凸透镜" lessons={LESSONS} current="7" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={s.name}
      stage={<Dark at="scope" labels={labels}>
        <Axis x0={X0 - 2.05} x1={X0 + 1.6} y={AXIS} />
        {/* 镜筒：一段半透明的筒，两头各装一块透镜 */}
        <mesh position={[X0 + (L.ob + L.ey) / 2, AXIS, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.4, kind === 'telescope' ? 0.56 : 0.34, L.ey - L.ob, 40, 1, true]} /><meshBasicMaterial color="#9fb0c0" transparent opacity={0.045} side={2} depthWrite={false} toneMapped={false} /></mesh>
        <Lens x={X0 + L.ob} y={AXIS} h={kind === 'telescope' ? 0.52 : 0.3} stand={false} />
        <Lens x={X0 + L.ey} y={AXIS} h={0.36} stand={false} />
        <mesh position={[X0 + L.ey + 0.56, AXIS + 0.06, 0]}><sphereGeometry args={[0.12, 20, 14]} /><meshStandardMaterial color="#f3e6da" roughness={0.6} /></mesh>
        <mesh position={[X0 + L.ey + 0.45, AXIS + 0.06, 0]}><sphereGeometry args={[0.05, 14, 10]} /><meshStandardMaterial color="#30343a" /></mesh>
        {L.ox != null && <Candle x={X0 + L.ox} y={AXIS} h={L.oh} />}
        {n >= 1 && <>
          {[0.32, -0.2].map(h => { const hh = kind === 'telescope' ? h : h * 0.5; const from: [number, number] = L.ox != null ? [X0 + L.ox, AXIS + L.oh] : [X0 - 2.05, AXIS + hh + 0.07]; return <group key={h}><Ray a={from} b={[X0 + L.ob, AXIS + hh]} /><Ray a={[X0 + L.ob, AXIS + hh]} b={tip} /></group> })}
          <Candle x={X0 + L.ix} y={AXIS} h={L.ih} />
        </>}
        {n >= 2 && [0.2, -0.12].map(h => { const k = (L.ih) / (L.ix - L.ey); return <group key={h}><Ray a={tip} b={[X0 + L.ey, AXIS + h]} color="#7fe3d4" /><Ray a={[X0 + L.ey, AXIS + h]} b={[X0 + L.ey + 0.42, AXIS + h * 0.35 + k * 0.42 * 0.5]} color="#7fe3d4" /></group> })}
      </Dark>}
      lesson={<LessonBlock no="7" title="两块透镜接力" concept="物镜先成一个实像，目镜再把它放大" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <ul className="flex flex-col gap-2 text-[14px] text-white/80">{KEYS.map(k => <li key={k}><b className="text-[#7fe3d4]">{SCOPES[k].name}：</b>{SCOPES[k].steps.join('；')}</li>)}</ul>
          <p className="mt-3">两种仪器都是两块凸透镜接力：靠近物体的叫<b className="text-white">物镜</b>，靠近眼睛的叫<b className="text-white">目镜</b>。望远镜的物镜做得很大，是为了多收集一些远处来的光，让像更亮。</p>
          <p className="mt-3 text-[13.5px] text-white/65">图里透镜之间的距离是示意，没有按真实的焦距来摆。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">望远镜和显微镜都看过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">物镜成实像，目镜当放大镜</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">不同的是物镜成的那个像：望远镜的是缩小的，显微镜的是放大的。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{s.name} · 看到第</div>
            <div className="mt-1 text-[40px] leading-none font-bold tracking-tight tabular-nums">{n}<span className="ml-1 text-[15px] font-medium text-white/55">步 / {s.steps.length}</span></div>
          </div>
          {n === 0
            ? <p className="mt-4 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">每按一次看一步：先看物镜，再看目镜。</p>
            : <ol className="mt-4 flex flex-col gap-1.5 text-[13.5px]">{s.steps.slice(0, n).map((t, i) => <li key={i} className="row-in rounded-xl bg-white/6 px-3 py-2"><b className="text-white">{i + 1}. {i ? '目镜' : '物镜'}</b><span className="ml-2 text-white/65">{t}</span></li>)}</ol>}
        </Glass>
      }
      actions={<><LabButton primary pulse={next === 'go'} onClick={go} disabled={full}>{full ? '两步都看了' : '下一步'}</LabButton></>}
      extras={<Control label="仪器"><Segmented label="仪器" pulse={next === 'kind'} want={next === 'kind' ? task!.id as ScopeKey : null} value={kind} onChange={pick} options={KEYS.map(k => ({ value: k, label: SCOPES[k].name }))} /></Control>}
    />
  )
}
