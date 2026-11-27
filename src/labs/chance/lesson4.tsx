// 概率 · 第 4 课 两枚骰子（列表法）：培训桌上的骰子盘里一白一红两枚骰子，后墙电子屏上一张 6 × 6 的表：行是白骰子，列是红骰子。
// 掷一次，屏上那一格亮起；把 36 种结果一格一格列出来，再圈出“两枚点数相同”“点数之和是 9”“至少一枚是 2”。
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { FELT_Y, FeltTray, Glove, Place, RollingDie, useRun, type V3 } from './parts'
import { DICE_EV, FACES, diceProb, roll4, type DiceEv } from './physics'
import { FONT, NUM, canvas } from './mats'
import { SCREEN, ST, TABLE_H } from './world'

const KEYS = Object.keys(DICE_EV) as DiceEv[]
const X = ST.l4.x, Z = ST.l4.z, S = 0.058
const TRAY: V3 = [X - 0.05, TABLE_H, Z - 0.17]
const RED = '#c8322a'
const TASKS: Task[] = [
  { id: 'roll', text: '同时掷两枚骰子', note: '白骰子和红骰子各出一个点数，合起来是一种结果' },
  { id: 'list', text: '列表：把全部结果列出来', note: '白的 6 种 × 红的 6 种 = 36 种，每种可能性相等' },
  ...KEYS.map(k => { const p = diceProb(k); return { id: k, text: `圈出“${DICE_EV[k].name}”`, note: `${p.m} 格，P = ${p.text}` } }),
]

export default function Lesson4() {
  const [ev, setEv] = useState<DiceEv>('same')
  const [rolled, setRolled] = useState(false)
  const [listed, setListed] = useState(false)
  const [circled, setCircled] = useState<DiceEv[]>([])
  const T = useTasks('gewu:chance:4', TASKS)
  const roll = useRun(1.5, () => { setRolled(true); T.check(id => id === 'roll') })
  const list = useRun(3.2, () => { setListed(true); T.check(id => id === 'list') })
  const circ = useRun(1.8, () => { const n = [...circled, ev]; setCircled(n); T.check(id => n.includes(id as DiceEv)) })
  const busy = roll.busy || list.busy || circ.busy
  const pick = (k: DiceEv) => { if (!busy) { setEv(k); circ.snap(0) } }
  const resetAll = () => { setEv('same'); setRolled(false); setListed(false); setCircled([]); roll.snap(0); list.snap(0); circ.snap(0); T.reset() }
  const [w, r] = roll4(), p = diceProb(ev), done = circled.includes(ev)

  const task = T.current
  const { hint, next }: { hint: string; next: 'roll' | 'list' | 'circ' | 'ev' | null } = (() => {
    if (!task) return { hint: '36 种结果一样可能：数出事件占几格，P = 格数 ÷ 36。', next: null }
    if (roll.busy) return { hint: '两枚骰子滚出去了…', next: null }
    if (list.busy) return { hint: '一行一行列出来…', next: null }
    if (circ.busy) return { hint: '一格一格圈出来…', next: null }
    if (task.id === 'roll') return { hint: '同时掷一白一红两枚骰子', next: 'roll' }
    if (task.id === 'list') return { hint: '一次掷出的是一对点数。列一张表，把所有可能的结果都写出来', next: 'list' }
    if (ev !== task.id) return { hint: `换成事件“${DICE_EV[task.id as DiceEv].name}”`, next: 'ev' }
    return { hint: `在表里圈出“${DICE_EV[ev].name}”的格子`, next: 'circ' }
  })()

  const fill = listed ? 36 : Math.floor(list.k * 36 + 1e-6)
  const hl = done ? 1 : circ.busy ? circ.k : 0
  const labels: Label[] = [
    { id: 'got', at: [TRAY[0], TABLE_H + 0.1, TRAY[2]], ax: 0.5, className: 'scene-tag -translate-y-full transition-opacity', style: { opacity: rolled ? 1 : 0 }, children: <><small>白</small>{w}<small className="ml-2">红</small>{r}</> },
    { id: 'pv', at: [SCREEN.x + SCREEN.w / 2 + 0.05, SCREEN.y - 0.15, SCREEN.z + 0.05], ax: 0, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: done ? 1 : 0 }, children: <><small>P</small>{p.text}</> },
    { id: 'n1', at: [SCREEN.x - SCREEN.w / 2 - 0.05, SCREEN.y + 0.3, SCREEN.z + 0.05], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '行：白骰子　列：红骰子' },
  ]
  return (
    <LabShell title="概率" lessons={LESSONS} current="4" narration={voiced(NARRATION['4'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="两枚骰子"
      stage={<Place at="l4" labels={labels}>
        <FeltTray at={TRAY} r={0.24} />
        <RollingDie k={rolled ? 1 : roll.k} from={[TRAY[0] + 0.3, TABLE_H + S / 2, TRAY[2] + 0.14]} to={[TRAY[0] - 0.06, TABLE_H + FELT_Y + S / 2, TRAY[2] + 0.03]} face={w} yaw={0.25} size={S} spin={[1, 0.3, 0.5]} />
        <RollingDie k={rolled ? 1 : roll.k} from={[TRAY[0] + 0.37, TABLE_H + S / 2, TRAY[2] + 0.1]} to={[TRAY[0] + 0.07, TABLE_H + FELT_Y + S / 2, TRAY[2] - 0.03]} face={r} yaw={-0.35} size={S} body={RED} pips="#ffffff" spin={[0.3, 1, 0.8]} />
        {roll.busy && roll.k < 0.25 && <group position={[TRAY[0] + 0.34 - roll.k * 0.3, TABLE_H + S + 0.01 + roll.k * 0.3, TRAY[2] + 0.04]} rotation={[0, Math.PI - 0.4, 0]}><Glove pinch={0.6} arm={0.3} /></group>}
        <Screen fill={fill} ev={ev} hl={hl} roll={rolled ? [w, r] : null} />
      </Place>}
      lesson={<LessonBlock no="4" title="两枚骰子" concept="列表法：一行一列列全结果，再数" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>一次试验要涉及两个因素（白骰子、红骰子），而且可能出现的结果很多时，用<b className="text-white">列表法</b>：一个因素的结果作行，另一个作列，每一格是一种结果，不重不漏。</p>
          <p className="mt-3">两枚骰子质地均匀，36 种结果出现的可能性相等。白 2 红 3 和白 3 红 2 是两种不同的结果，要分开算。</p>
          <p className="mt-3">点数相同在对角线上，6 格；和是 9 的是 (3,6)(4,5)(5,4)(6,3)，4 格；至少一枚是 2 的是第 2 行和第 2 列，6 + 6 − 1 = 11 格（交叉的 (2,2) 只算一次）。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[17px] leading-snug font-bold">P(点数相同) = 1/6，P(和是 9) = 1/9，P(至少一枚是 2) = 11/36</p>
        <p className="mt-1 text-[14px] text-white/70">两步的试验用列表法列出全部等可能的结果，再数事件占几格。</p>
      </>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">P（{DICE_EV[ev].name}）</div>
            <div className="mt-1 text-[40px] leading-none font-bold tracking-tight tabular-nums">{done ? p.text : '?'}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="m" value={done ? String(p.m) : '—'} unit="格 · 事件" />
            <ParamTile symbol="n" value={listed ? '36' : '—'} unit="格 · 全部结果" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">圈过的事件</h2>
          <table className="mt-1.5 w-full text-[14px] tabular-nums">
            <tbody>{KEYS.map(k => { const on = circled.includes(k), q = diceProb(k); return <tr key={k} className={on ? 'text-white' : 'text-white/30'}><td className="py-1">{DICE_EV[k].name}</td><td className="text-right">{on ? `${q.m} 格` : '—'}</td><td className="pl-3 text-right">{on ? q.text : ''}</td></tr> })}</tbody>
          </table>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'roll'} onClick={() => { if (!busy && !rolled) roll.run() }} disabled={busy || rolled}>掷两枚</LabButton>
        <LabButton pulse={next === 'list'} onClick={() => { if (!busy && !listed) list.run() }} disabled={busy || !rolled || listed}>列表</LabButton>
        <LabButton primary pulse={next === 'circ'} onClick={() => { if (!busy && !done) circ.run() }} disabled={busy || !listed || done}>圈出来</LabButton>
      </>}
      extras={<Control label="事件"><Segmented label="事件" pulse={next === 'ev'} want={next === 'ev' ? task!.id as DiceEv : null} disabled={busy} value={ev} onChange={pick} options={KEYS.map(k => ({ value: k, label: DICE_EV[k].name }))} /></Control>}
    />
  )
}

/** 后墙上的电子屏：6 × 6 的表。fill 是列到第几格；ev 是要圈的事件，hl 圈到哪了；roll 是刚掷出的那一格 */
function Screen({ fill, ev, hl, roll }: { fill: number; ev: DiceEv; hl: number; roll: [number, number] | null }) {
  const { tex, g, W, H } = useMemo(() => { const W = 1600, H = 900, { c, g } = canvas(W, H); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return { tex: t, g, W, H } }, [])
  const step = Math.floor(hl * 36)
  useEffect(() => {
    g.fillStyle = '#0c1418'; g.fillRect(0, 0, W, H)
    g.fillStyle = '#e8f1f4'; g.font = `600 40px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle'
    g.fillText('同时掷两枚骰子的全部结果', 60, 58)
    const x0 = 330, y0 = 130, cw = 170, ch = 118
    g.font = `600 34px ${FONT}`; g.fillStyle = '#ff8a80'; g.textAlign = 'center'; g.fillText('红骰子', x0 + cw * 3, y0 - 6)
    g.save(); g.translate(x0 - 150, y0 + 60 + ch * 3); g.rotate(-Math.PI / 2); g.fillStyle = '#ffffff'; g.fillText('白骰子', 0, 0); g.restore()
    g.font = `700 40px ${NUM}`
    FACES.forEach((v, j) => { g.fillStyle = '#ff8a80'; g.fillText(String(v), x0 + cw * (j + 0.5), y0 + 34) })
    FACES.forEach((v, i) => { g.fillStyle = '#ffffff'; g.fillText(String(v), x0 - 50, y0 + 60 + ch * (i + 0.5)) })
    g.strokeStyle = 'rgba(160,210,230,0.35)'; g.lineWidth = 2
    for (let i = 0; i <= 6; i++) { g.beginPath(); g.moveTo(x0, y0 + 60 + ch * i); g.lineTo(x0 + cw * 6, y0 + 60 + ch * i); g.stroke(); g.beginPath(); g.moveTo(x0 + cw * i, y0 + 60); g.lineTo(x0 + cw * i, y0 + 60 + ch * 6); g.stroke() }
    FACES.forEach((a, i) => FACES.forEach((b, j) => {
      const k = i * 6 + j, cx = x0 + cw * (j + 0.5), cy = y0 + 60 + ch * (i + 0.5)
      const on = DICE_EV[ev].ok(a, b) && hl > 0 && (k <= step || hl >= 1)
      if (on) { g.fillStyle = 'rgba(53,199,179,0.32)'; g.fillRect(x0 + cw * j + 3, y0 + 60 + ch * i + 3, cw - 6, ch - 6) }
      if (roll && roll[0] === a && roll[1] === b) { g.strokeStyle = '#ffd45c'; g.lineWidth = 6; g.strokeRect(x0 + cw * j + 6, y0 + 60 + ch * i + 6, cw - 12, ch - 12) }
      if (k < fill) { g.fillStyle = on ? '#ffffff' : '#cfe3ea'; g.font = `600 40px ${NUM}`; g.fillText(`${a}, ${b}`, cx, cy) }
      if (on) { g.strokeStyle = '#35c7b3'; g.lineWidth = 5; g.beginPath(); g.ellipse(cx, cy, cw * 0.4, ch * 0.36, 0, 0, Math.PI * 2); g.stroke() }
    }))
    g.textAlign = 'left'; g.font = `500 30px ${FONT}`; g.fillStyle = 'rgba(232,241,244,0.7)'
    g.fillText('每格：白, 红', x0 + cw * 6 + 40, y0 + 90)
    if (fill >= 36) { g.fillText('共 36 种', x0 + cw * 6 + 40, y0 + 140) }
    tex.needsUpdate = true
  }, [fill, ev, step, hl, roll?.[0], roll?.[1]])   // eslint-disable-line react-hooks/exhaustive-deps
  return <mesh position={[SCREEN.x, SCREEN.y, SCREEN.z + 0.053]}><planeGeometry args={[SCREEN.w, SCREEN.h]} /><meshBasicMaterial map={tex} toneMapped={false} /></mesh>
}
