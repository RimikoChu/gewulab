// 电与磁 · 第 1 课 磁现象：实验台第 1 格。用条形磁体靠近铁钉、铜片、铝片；放进回形针盒再提起，看哪里吸得多；
// 用细线吊起来，看它停在什么方向；再拿另一块磁体的 N 极、S 极去靠近吊着的磁体的 N 极。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { BAR, MATERIALS, attracts, bearing, interact, needleAngle, type MaterialKey } from './physics'
import { L1, Scene1 } from './scene1'
import { Bench, Place, toWorld } from './world'
import { useGoto, useSeq, useSettled } from './anim'
import type { V3 } from './gear'

const TASKS: Task[] = [
  { id: 'mat', text: '拿磁体分别靠近铁钉、铜片、铝片', note: '铁钉被吸过来，铜片、铝片不动：磁体能吸引铁、钴、镍' },
  { id: 'clips', text: '把磁体放进回形针盒，再提起来', note: '回形针挂在两端，中间几乎没有：两端磁性最强，叫磁极' },
  { id: 'hang', text: '用细线把磁体吊起来，等它停稳', note: '停稳后 N 极指北、S 极指南' },
  { id: 'rule', text: '用另一块磁体的 N 极、S 极分别靠近吊着的 N 极', note: '同名磁极相互排斥，异名磁极相互吸引' },
]
const ORDER: MaterialKey[] = ['copper', 'alu', 'iron']
const IDLE: V3 = [-10, 0.02, 5]
const HOOK: V3 = [L1.stand[0], L1.hookY - BAR.h / 2, L1.stand[2] - 3]
/** 另一块磁体：从东边伸过来，朝前的一端离吊着的 N 极 3 cm */
const B_FAR: V3 = [26, HOOK[1], HOOK[2] - BAR.len / 2], B_NEAR: V3 = [HOOK[0] + 3 + BAR.len / 2, HOOK[1], HOOK[2] - BAR.len / 2]
const W = (p: V3) => toWorld('l1', p)

export default function Lesson1() {
  const [mat, setMat] = useState<MaterialKey>('copper')
  const [face, setFace] = useState<'N' | 'S'>('N')
  const [tested, setTested] = useState<MaterialKey[]>([])
  const [tried, setTried] = useState<('N' | 'S')[]>([])
  const [nail, setNail] = useState(false)
  const [clips, setClips] = useState(false)
  const [hung, setHung] = useState(false)
  const [push, setPush] = useState(0)
  const [aim, setAim] = useState<number[]>([...IDLE, 0])
  const [bAt, setBAt] = useState<V3 | null>(null)
  const T = useTasks('gewu:magnet:1', TASKS)
  const seq = useSeq()
  const hand = useGoto(aim, 26), b = useGoto(bAt ?? B_FAR, 22)
  const settled = useSettled(`${hung}${push}`, 5200) && hung && push === 0
  const resetAll = () => { seq.stop(); setMat('copper'); setFace('N'); setTested([]); setTried([]); setNail(false); setClips(false); setHung(false); setPush(0); setAim([...IDLE, 0]); hand.snap([...IDLE, 0]); setBAt(null); b.snap(B_FAR); T.reset() }

  const near = () => {
    if (seq.busy) return
    if (!T.done.mat) {
      const it = L1.item[mat], m = mat
      seq.run([
        [0, () => setAim([it[0] - BAR.len / 2 + 1.5, 2.2, it[2], 0])],
        [900, () => { if (attracts(m)) setNail(true) }],
        [1300, () => setAim([...IDLE, 0])],
        [600, () => { const n = [...new Set([...tested, m])]; setTested(n); if (n.length === 3) T.check(id => id === 'mat') }],
      ])
    } else {
      const f = face
      seq.run([
        [0, () => setBAt(B_NEAR)],
        [1100, () => setPush(interact(f, 'N'))],
        [2600, () => { setPush(0); setBAt(null) }],
        [900, () => { const n = [...new Set([...tried, f])]; setTried(n); if (n.length === 2) T.check(id => id === 'rule') }],
      ])
    }
  }
  const dip = () => {
    if (seq.busy) return
    const c = L1.clips
    seq.run([
      [0, () => setAim([c[0], 0.5, c[2], 0])],
      [1000, () => setClips(true)],
      [400, () => setAim([...IDLE, 0])],
      [900, () => T.check(id => id === 'clips')],
    ])
  }
  const hang = () => {
    if (seq.busy) return
    const c = L1.clips
    seq.run([
      [0, () => setAim([c[0], 7, c[2], 0])],
      [700, () => { setClips(false); setNail(false) }],
      [500, () => setAim([...HOOK, 0])],
      [1500, () => setHung(true)],
    ])
  }
  useEffect(() => { if (settled && T.done.clips) T.check(id => id === 'hang') }, [settled])   // eslint-disable-line react-hooks/exhaustive-deps

  const task = T.current
  type Next = 'mat' | 'near' | 'dip' | 'hang' | 'face' | null
  const { hint, next }: { hint: string; next: Next } = (() => {
    if (!task) return { hint: '同名磁极相互排斥，异名磁极相互吸引。', next: null }
    if (seq.busy) return { hint: task.id === 'hang' ? '把回形针抖回盒里，挂到纸托上…' : '看磁体…', next: null }
    if (task.id === 'mat') {
      const left = ORDER.find(k => !tested.includes(k))!
      if (tested.includes(mat)) return { hint: `换成${MATERIALS[left].name}`, next: 'mat' }
      return { hint: `拿磁体靠近${MATERIALS[mat].name}`, next: 'near' }
    }
    if (task.id === 'clips') return { hint: '把磁体放进回形针盒，再提起来', next: 'dip' }
    if (task.id === 'hang') return hung ? { hint: '磁体在来回摆，等它停稳…', next: null } : { hint: '用细线把磁体吊起来', next: 'hang' }
    if (tried.includes(face)) return { hint: `换成 ${face === 'N' ? 'S' : 'N'} 极朝前`, next: 'face' }
    return { hint: `用另一块磁体的 ${face} 极靠近吊着的 N 极`, next: 'near' }
  })()
  const leftMat = ORDER.find(k => !tested.includes(k)) ?? null
  const dir = bearing(needleAngle(null, [0, 0]))

  const labels: Label[] = [
    { id: 'n1', at: W([L1.stand[0] - 5, 27.5, L1.stand[2] - 3]), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '悬挂架' },
    { id: 'n2', at: W([L1.tray[0], 1.6, L1.tray[2] + 3.5]), ax: 0.5, name: true, className: 'scene-name', children: '铜片　铝片　铁钉' },
    { id: 'n3', at: W([L1.clips[0], 2.4, L1.clips[2]]), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '回形针盒' },
    { id: 'north', at: W([HOOK[0], HOOK[1] + 3, HOOK[2] - BAR.len / 2]), ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: settled ? 1 : 0 }, children: <><small>N 极指向</small>北</> },
  ]
  const res = (k: MaterialKey) => tested.includes(k) ? (attracts(k) ? '吸过来' : '不动') : '—'
  return (
    <LabShell title="电与磁" lessons={LESSONS} current="1" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['1'], VOICE)} actionsLabel="条形磁体"
      stage={<Place at={T.done.clips ? 'l1b' : 'l1'} labels={labels}><Bench at="l1">
        <Scene1 a={{ p: [hand.x[0], hand.x[1], hand.x[2]], yaw: hand.x[3] }} hung={hung} push={push} nail={nail} clips={clips} hold={seq.busy || hand.moving} b={bAt || b.moving ? [b.x[0], b.x[1], b.x[2]] : null} bFace={face} />
      </Bench></Place>}
      lesson={<LessonBlock no="1" title="磁现象" concept="同名磁极相斥，异名磁极相吸" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>磁体能吸引铁、钴、镍等物质，这种性质叫<b className="text-white">磁性</b>。铜、铝不能被磁体吸引。</p>
          <p className="mt-3">磁体上磁性最强的部分叫<b className="text-white">磁极</b>。条形磁体的两个磁极在两端，中间磁性最弱。</p>
          <p className="mt-3">能够自由转动的磁体，静止时指南的那个磁极叫南极（S 极），指北的那个磁极叫北极（N 极）。指南针就是根据这个道理制成的。</p>
          <p className="mt-3">磁极间相互作用的规律：<b className="text-white">同名磁极相互排斥，异名磁极相互吸引</b>。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四件事都做完了</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">同名磁极相互排斥，异名磁极相互吸引</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">磁体吸引铁钉，不吸引铜片和铝片；两端磁性最强；吊起来静止时 N 极指北。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          <h2 className="text-[12.5px] text-white/55">吊着的磁体 · N 极所指</h2>
          <div className="mt-2 flex items-center gap-4">
            <svg viewBox="-50 -50 100 100" className="size-[92px] flex-none">
              <circle r="44" fill="none" stroke="rgb(255 255 255 / 0.25)" strokeWidth="1.5" />
              {['北', '东', '南', '西'].map((t, i) => <text key={t} x={Math.sin(i * Math.PI / 2) * 34} y={-Math.cos(i * Math.PI / 2) * 34 + 4} textAnchor="middle" fontSize="11" fill="rgb(255 255 255 / 0.6)">{t}</text>)}
              <g transform={`rotate(${settled ? dir : hung ? 0 : 90})`} style={{ transition: 'transform 1.2s cubic-bezier(.3,1.4,.5,1)', opacity: hung ? 1 : 0.3 }}>
                <path d="M0 -26 L5 0 L-5 0 Z" fill="#e5483d" /><path d="M0 26 L5 0 L-5 0 Z" fill="#e9e7e0" />
              </g>
            </svg>
            <div className="text-[40px] leading-none font-bold tabular-nums">{settled ? `${dir}°` : '—'}<div className="mt-1 text-[13px] font-medium text-white/55">{settled ? '正北' : hung ? '还在摆' : '还没吊起来'}</div></div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">靠近磁体的一端</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {ORDER.map(k => <ParamTile key={k} symbol={MATERIALS[k].name} value={res(k)} unit={k === 'iron' ? '铁' : k === 'copper' ? '铜' : '铝'} />)}
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">靠近吊着的 N 极</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="N 对 N" value={tried.includes('N') ? '推开' : '—'} unit="同名磁极" />
            <ParamTile symbol="S 对 N" value={tried.includes('S') ? '吸过来' : '—'} unit="异名磁极" />
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'near'} pulse={next === 'near'} onClick={near} disabled={seq.busy || (!!T.done.mat && !T.done.hang) || (!T.done.mat && tested.includes(mat))}>{T.done.mat ? '靠近吊着的磁体' : `靠近${MATERIALS[mat].name}`}</LabButton>
        <LabButton pulse={next === 'dip'} onClick={dip} disabled={seq.busy || !T.done.mat || !!T.done.clips}>放进回形针盒</LabButton>
        <LabButton pulse={next === 'hang'} onClick={hang} disabled={seq.busy || !T.done.clips || hung}>吊起来</LabButton>
      </>}
      extras={!T.done.mat
        ? <Control label="靠近什么"><Segmented label="靠近什么" pulse={next === 'mat'} want={next === 'mat' ? leftMat : null} value={mat} onChange={k => setMat(k as MaterialKey)} disabled={seq.busy} options={ORDER.map(k => ({ value: k, label: MATERIALS[k].name }))} /></Control>
        : T.done.hang ? <Control label="手里的磁体朝前的一端"><Segmented label="朝前的一端" pulse={next === 'face'} want={next === 'face' ? (face === 'N' ? 'S' : 'N') : null} value={face} onChange={k => setFace(k as 'N' | 'S')} disabled={seq.busy} options={[{ value: 'N', label: 'N 极' }, { value: 'S', label: 'S 极' }]} /></Control> : null}
    />
  )
}
