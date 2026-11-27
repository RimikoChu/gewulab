// 概率 · 第 5 课 摸两次球（树状图）：培训桌上一只透明的摸球箱，里面 1 个红球、2 个白球（白₁、白₂）；后面一块移动白板。
// 摸一个、记下、放回（或不放回），再摸一个。在白板上画树状图：放回 9 种结果，两次都白 4/9；不放回 6 种，两次都白 2/6 = 1/3。
import { useEffect, useMemo, useState } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { BALL_COL, BALL_R, Ball, BallBox, Glove, Place, ease, useRun, type V3 } from './parts'
import { BALLS5, both5, draw5, tree5, type Mode5 } from './physics'
import { FONT, canvas } from './mats'
import { BOARD, ST, TABLE_H } from './world'

const MODE: Record<Mode5, string> = { back: '放回', keep: '不放回' }
const X = ST.l5.x, Z = ST.l5.z
const BOX: V3 = [X - 0.2, TABLE_H, Z - 0.16], BOX_H = 0.24
const IN: V3[] = [[-0.07, 0, 0.02], [0.0, 0, -0.06], [0.07, 0, 0.04]]
const CARD: V3 = [X + 0.22, TABLE_H, Z - 0.1]
const colOf = (i: number) => (i === 0 ? BALL_COL.red : BALL_COL.white)
const TASKS: Task[] = [
  { id: 'draw', text: '摸一个，放回，再摸一个', note: '每次摸之前，箱里都是 3 个球' },
  { id: 'rtree', text: '放回：画树状图', note: '第一次 3 种，每种后面第二次又是 3 种：3 × 3 = 9 种' },
  { id: 'rp', text: '圈出“两次都是白球”', note: `9 种里有 4 种：P = ${both5('back').text}` },
  { id: 'ktree', text: '换成不放回，再画树状图', note: '第一次摸走一个，第二次只剩 2 个：3 × 2 = 6 种' },
  { id: 'kp', text: '再圈出“两次都是白球”', note: `6 种里有 2 种：P = ${both5('keep').text}` },
]

export default function Lesson5() {
  const [mode, setMode] = useState<Mode5>('back')
  const [drawn, setDrawn] = useState<Mode5[]>([])
  const [trees, setTrees] = useState<Mode5[]>([])
  const [circled, setCircled] = useState<Mode5[]>([])
  const T = useTasks('gewu:chance:5', TASKS)
  const draw = useRun(3.6, () => { const n = [...drawn, mode]; setDrawn(n); T.check(id => id === 'draw' && n.includes('back')) })
  const tree = useRun(3.0, () => { const n = [...trees, mode]; setTrees(n); T.check(id => (id === 'rtree' && n.includes('back')) || (id === 'ktree' && n.includes('keep'))) })
  const circ = useRun(1.8, () => { const n = [...circled, mode]; setCircled(n); T.check(id => (id === 'rp' && n.includes('back')) || (id === 'kp' && n.includes('keep'))) })
  const busy = draw.busy || tree.busy || circ.busy
  const pick = (m: Mode5) => { if (!busy) { setMode(m); draw.snap(0) } }
  const resetAll = () => { setMode('back'); setDrawn([]); setTrees([]); setCircled([]); draw.snap(0); tree.snap(0); circ.snap(0); T.reset() }
  const p = both5(mode), all = useMemo(() => tree5(mode), [mode])
  const treeK = trees.includes(mode) ? 1 : tree.busy ? tree.k : 0
  const circK = circled.includes(mode) ? 1 : circ.busy ? circ.k : 0

  const task = T.current
  const { hint, next }: { hint: string; next: 'draw' | 'tree' | 'circ' | 'mode' | null } = (() => {
    if (!task) return { hint: '放回 9 种、两次都白 4/9；不放回 6 种、两次都白 1/3。摸法不同，结果数就不同。', next: null }
    if (draw.busy) return { hint: '摸球中…', next: null }
    if (tree.busy) return { hint: '一层一层画分支…', next: null }
    if (circ.busy) return { hint: '圈出来…', next: null }
    const want: Mode5 = task.id === 'ktree' || task.id === 'kp' ? 'keep' : 'back'
    if (mode !== want) return { hint: `换成${MODE[want]}`, next: 'mode' }
    if (task.id === 'draw') return { hint: '摸一个，记下颜色，放回去，再摸一个', next: 'draw' }
    if (task.id === 'rtree') return { hint: '第一次可能摸到 3 个球里的任一个，第二次又是 3 个。画树状图', next: 'tree' }
    if (task.id === 'ktree') return { hint: '不放回：第一次摸走一个，第二次只剩 2 个。画树状图', next: 'tree' }
    return { hint: '在树状图上圈出两次都是白球的结果', next: 'circ' }
  })()

  // 摸球的动画：两次，每次手伸进箱子拿出一个球，在记录卡上放一枚同色的筹码；放回的把球放回去，不放回的放在箱子旁边
  const pair = draw5(mode), k = draw.k, d = k < 0.5 ? 0 : 1, sub = draw.busy ? (k - d * 0.5) / 0.5 : 0
  const held = pair[d]
  const top = TABLE_H + BOX_H
  const dip = sub < 0.25 ? ease(sub / 0.25) : sub < 0.35 ? 1 : sub < 0.6 ? 1 - ease((sub - 0.35) / 0.25) : 0
  const go = sub < 0.6 ? 0 : sub < 0.8 ? ease((sub - 0.6) / 0.2) : 1 - ease((sub - 0.8) / 0.2)
  const handAt: V3 = [BOX[0] + IN[held][0] * dip + (CARD[0] - 0.05 * (1 - d) + 0.05 * d - BOX[0]) * go, top + 0.18 - dip * (BOX_H + 0.02) + 0.06 * go - 0.12 * go, BOX[2] + IN[held][2] * dip + (CARD[2] - BOX[2]) * go]
  const holding = draw.busy && sub > 0.3 && sub < 0.8
  const out = new Set<number>()
  if (mode === 'keep' && (draw.busy ? d === 1 || sub > 0.8 : drawn.includes('keep'))) out.add(pair[0])
  if (holding) out.add(held)
  const chips = drawn.includes(mode) && !draw.busy ? 2 : draw.busy ? (sub > 0.75 ? d + 1 : d) : 0

  const labels: Label[] = [
    ...BALLS5.map((b, i) => ({ id: `b${i}`, at: [BOX[0] + IN[i][0], TABLE_H + 0.02 + BALL_R * 2 + 0.012, BOX[2] + IN[i][2] + 0.15] as V3, ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: b })),
    { id: 'c1', at: [CARD[0] - 0.05, TABLE_H + 0.03, CARD[2] + 0.05], ax: 0.5, className: 'scene-tag transition-opacity', style: { opacity: chips >= 1 ? 1 : 0 }, children: <><small>第一次</small>{BALLS5[pair[0]]}</> },
    { id: 'c2', at: [CARD[0] + 0.05, TABLE_H + 0.03, CARD[2] - 0.05], ax: 0, className: 'scene-tag -translate-y-full transition-opacity', style: { opacity: chips >= 2 ? 1 : 0 }, children: <><small>第二次</small>{BALLS5[pair[1]]}</> },
    { id: 'n1', at: [BOX[0], top + 0.03, BOX[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '1 个红球、2 个白球' },
  ]
  return (
    <LabShell title="概率" lessons={LESSONS} current="5" narration={voiced(NARRATION['5'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="摸两次球"
      stage={<Place at="l5" labels={labels}>
        <BallBox at={BOX} h={BOX_H} opaque={false}>
          {IN.map((q, i) => !out.has(i) && <Ball key={i} color={colOf(i)} at={[q[0], 0.012 + BALL_R, q[2]]} />)}
        </BallBox>
        {/* 不放回时，第一次摸出的球放在箱子旁边 */}
        {mode === 'keep' && out.has(pair[0]) && !(holding && held === pair[0]) && <Ball color={colOf(pair[0])} at={[BOX[0] + 0.21, TABLE_H + BALL_R, BOX[2] + 0.1]} />}
        {draw.busy && <group position={handAt} rotation-x={-Math.PI / 2 - 0.5}><Glove pinch={holding ? 0.8 : 0.15} arm={0.34} /></group>}
        {holding && <Ball color={colOf(held)} at={[handAt[0], handAt[1] - 0.068, handAt[2] + 0.036]} />}
        <RecordCard chips={[pair[0], pair[1]].slice(0, chips).map(colOf)} />
        <Whiteboard mode={mode} k={treeK} circ={circK} all={all} />
      </Place>}
      lesson={<LessonBlock no="5" title="摸两次球" concept="树状图：一步一层，分支不重不漏" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>一次试验分几步完成时，可以用<b className="text-white">树状图</b>：第一步的每种结果画一个分支，每个分支后面再画第二步的结果。最后一层有几个末梢，就有几种结果。</p>
          <p className="mt-3">两个白球编上号（白₁、白₂），每个球被摸到的可能性才相等，结果才是等可能的。</p>
          <p className="mt-3"><b className="text-white">放回</b>：第二次还是 3 个球，3 × 3 = 9 种，两次都白有 4 种，P = 4/9。<b className="text-white">不放回</b>：第二次只剩 2 个，3 × 2 = 6 种，两次都白有 2 种，P = 2/6 = 1/3。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[17px] leading-snug font-bold">两次都是白球：放回 P = 4/9，不放回 P = 1/3</p>
        <p className="mt-1 text-[14px] text-white/70">树状图一步画一层；放回和不放回，第二步的分支数不一样。</p>
      </>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{MODE[mode]} · P(两次都是白球)</div>
            <div className="mt-1 text-[40px] leading-none font-bold tracking-tight tabular-nums">{circK >= 1 ? p.text : '?'}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="m" value={circK >= 1 ? String(p.m) : '—'} unit="种 · 两次都白" />
            <ParamTile symbol="n" value={treeK >= 1 ? String(p.n) : '—'} unit={`种 · ${mode === 'back' ? '3 × 3' : '3 × 2'}`} />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">两种摸法</h2>
          <table className="mt-1.5 w-full text-[14px] tabular-nums">
            <tbody>{(['back', 'keep'] as Mode5[]).map(m => { const on = circled.includes(m), q = both5(m); return <tr key={m} className={on ? 'text-white' : 'text-white/30'}><td className="py-1">{MODE[m]}</td><td className="text-right">{trees.includes(m) ? `${q.n} 种` : '—'}</td><td className="pl-3 text-right">{on ? q.text : ''}</td></tr> })}</tbody>
          </table>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'draw'} onClick={() => { if (!busy) draw.run() }} disabled={busy}>摸两次</LabButton>
        <LabButton pulse={next === 'tree'} onClick={() => { if (!busy && treeK < 1) tree.run() }} disabled={busy || treeK >= 1}>画树状图</LabButton>
        <LabButton primary pulse={next === 'circ'} onClick={() => { if (!busy && circK < 1) circ.run() }} disabled={busy || treeK < 1 || circK >= 1}>圈出来</LabButton>
      </>}
      extras={<Control label="摸法"><Segmented label="摸法" pulse={next === 'mode'} want={next === 'mode' ? (task!.id === 'ktree' || task!.id === 'kp' ? 'keep' : 'back') : null} disabled={busy} value={mode} onChange={pick} options={[{ value: 'back', label: '放回' }, { value: 'keep', label: '不放回' }]} /></Control>}
    />
  )
}

/** 记录卡：一张白卡纸，印着“第一次”“第二次”两个圆圈，摸到什么颜色就放一枚同色的塑料筹码 */
function RecordCard({ chips }: { chips: string[] }) {
  return <group position={CARD}>
    <RoundedBox args={[0.24, 0.002, 0.14]} radius={0.001} smoothness={1} position={[0, 0.001, 0]} receiveShadow castShadow><meshStandardMaterial color="#f4f1e8" roughness={0.8} /></RoundedBox>
    {[-0.05, 0.05].map((dx, i) => <group key={i} position={[dx, 0.0022, 0]}>
      <mesh rotation-x={-Math.PI / 2}><ringGeometry args={[0.024, 0.027, 40]} /><meshBasicMaterial color="#8a8780" /></mesh>
      {chips[i] && <mesh position={[0, 0.003, 0]} castShadow><cylinderGeometry args={[0.022, 0.022, 0.006, 32]} /><meshPhysicalMaterial color={chips[i]} roughness={0.35} clearcoat={0.5} /></mesh>}
    </group>)}
  </group>
}

/** 白板上的树状图：像用马克笔画的。k 是画到哪了，circ 是圈到哪了 */
function Whiteboard({ mode, k, circ, all }: { mode: Mode5; k: number; circ: number; all: [string, string][] }) {
  const { tex, g, W, H } = useMemo(() => { const W = 1500, H = 1000, { c, g } = canvas(W, H); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return { tex: t, g, W, H } }, [])
  useEffect(() => {
    g.fillStyle = '#f7f7f4'; g.fillRect(0, 0, W, H)
    const ink = '#1f3f7a', red = '#c0392b'
    g.lineCap = 'round'; g.lineJoin = 'round'
    g.fillStyle = ink; g.font = `600 46px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle'
    g.fillText(`摸两次球（${MODE[mode]}）`, 50, 60)
    const n = all.length, top = 180, rowH = (H - top - 70) / n
    const x0 = 120, x1 = 430, x2 = 760, x3 = 1000
    if (k <= 0) {
      // 还没画：先用浅色虚线预示第一层的三个分支
      g.font = `500 34px ${FONT}`; g.fillStyle = 'rgba(31,63,122,0.6)'; g.textAlign = 'center'; g.fillText('第一次', x1, 130); g.fillText('第二次', x2, 130)
      const cy = (top + H - 70) / 2
      g.fillStyle = ink; g.beginPath(); g.arc(x0, cy, 8, 0, 7); g.fill()
      g.setLineDash([16, 14]); g.strokeStyle = 'rgba(31,63,122,0.6)'; g.lineWidth = 5
      BALLS5.forEach((b, i) => { const y1 = top + (H - top - 70) / 3 * (i + 0.5); g.beginPath(); g.moveTo(x0 + 10, cy); g.lineTo(x1 - 60, y1); g.stroke(); g.font = `700 50px ${FONT}`; g.fillStyle = i === 0 ? 'rgba(192,57,43,0.75)' : 'rgba(31,63,122,0.7)'; g.fillText(b, x1, y1) })
      g.setLineDash([]); g.font = `500 36px ${FONT}`; g.fillStyle = 'rgba(31,63,122,0.45)'; g.fillText('?', x2, cy)
      tex.needsUpdate = true; return
    }
    g.font = `500 34px ${FONT}`; g.fillStyle = 'rgba(31,63,122,0.6)'; g.textAlign = 'center'
    g.fillText('第一次', x1, 130); g.fillText('第二次', x2, 130); g.fillText('结果', x3 + 120, 130)
    const leafY = (i: number) => top + rowH * (i + 0.5)
    const per = n / 3
    const k1 = Math.min(1, k / 0.35), k2 = Math.max(0, (k - 0.35) / 0.65)
    g.strokeStyle = ink; g.lineWidth = 5; g.fillStyle = ink
    g.beginPath(); g.arc(x0, (top + H - 70) / 2, 8, 0, 7); g.fill()
    const seg = (ax: number, ay: number, bx: number, by: number, t: number) => { if (t <= 0) return; g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax + (bx - ax) * Math.min(1, t), ay + (by - ay) * Math.min(1, t)); g.stroke() }
    BALLS5.forEach((b, i) => {
      const y1 = top + rowH * per * (i + 0.5)
      seg(x0 + 10, (top + H - 70) / 2, x1 - 60, y1, k1 * 1.2 - i * 0.1)
      if (k1 >= 1) { g.font = `700 50px ${FONT}`; g.fillStyle = i === 0 ? red : ink; g.textAlign = 'center'; g.fillText(b, x1, y1) }
      const kids = all.map((r, j) => [r, j] as const).filter(([r]) => r[0] === b)
      kids.forEach(([r, j]) => {
        const t = k2 * (all.length) - j
        seg(x1 + 50, y1, x2 - 60, leafY(j), t)
        if (t >= 1) {
          g.font = `700 44px ${FONT}`; g.fillStyle = r[1] === '红' ? red : ink; g.textAlign = 'center'; g.fillText(r[1], x2, leafY(j))
          g.font = `500 40px ${FONT}`; g.fillStyle = ink; g.textAlign = 'left'; g.fillText(`${r[0]} ${r[1]}`, x3, leafY(j))
        }
      })
    })
    if (circ > 0) {
      let c = 0
      all.forEach((r, j) => {
        if (!(r[0].startsWith('白') && r[1].startsWith('白'))) return
        c++; if (c > Math.ceil(circ * 4.2)) return
        g.strokeStyle = red; g.lineWidth = 5; g.beginPath(); g.ellipse(x3 + 75, leafY(j), 110, rowH * 0.42, -0.04, 0, Math.PI * 2); g.stroke()
      })
      if (circ >= 1) { const m = all.filter(r => r[0].startsWith('白') && r[1].startsWith('白')).length; g.fillStyle = red; g.font = `700 46px ${FONT}`; g.textAlign = 'left'; g.fillText(`P = ${m}/${all.length}`, x3 + 230, (top + H - 70) / 2) }
    }
    if (k >= 1) { g.fillStyle = ink; g.font = `600 40px ${FONT}`; g.textAlign = 'left'; g.fillText(`共 ${all.length} 种`, x3 + 230, H - 70) }
    tex.needsUpdate = true
  }, [mode, k, circ, all])   // eslint-disable-line react-hooks/exhaustive-deps
  return <mesh position={[BOARD.x, BOARD.y, BOARD.z + 0.018]}><planeGeometry args={[BOARD.w, BOARD.h]} /><meshStandardMaterial map={tex} roughness={0.35} /></mesh>
}
