// 概率 · 第 3 课 转盘和扑克：培训桌上一只立式转盘（8 个大小相同的扇形：红 3、黄 2、绿 3，指针固定在正上方），旁边 13 张扣着的黑桃。
// 转一次，再数格子：P(指向红色) = 3/8，P(不指向红色) = 5/8 = 1 − 3/8；抽一张牌，数一数 13 张里 J、Q、K 有几张：3/13。
import { useMemo, useState } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { Metal, disc, lathe, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { Glove, Place, ease, useRun, type V3 } from './parts'
import { FACE_CARDS, HUE_NAME, RANKS, WHEEL, cardProb, deck3, spin3, wheelProb, type Hue } from './physics'
import { makeCardBack, makeCardFace, makeWood } from './mats'
import { ST, TABLE_H } from './world'

type Prop = 'wheel' | 'card'
const X = ST.l3.x, Z = ST.l3.z
const WR = 0.17, WC: V3 = [X - 0.4, TABLE_H + 0.27, Z - 0.05]   // 转盘的半径、圆心
const HUE: Record<Hue, string> = { red: '#d8392f', yellow: '#f2b51f', green: '#2f9e5b' }
const TASKS: Task[] = [
  { id: 'spin', text: '转一次转盘，看指针停在哪', note: '转之前不知道停在哪：8 格大小相同，停在每一格的可能性相等' },
  { id: 'red', text: '数一数：指向红色的概率', note: `8 格里 3 格红：P(指向红色) = ${wheelProb('red').text}` },
  { id: 'notRed', text: '再数不指向红色的', note: `5 格不是红：P = ${wheelProb('notRed').text} = 1 − 3/8` },
  { id: 'card', text: '换成扑克：抽一张，数 J、Q、K', note: `13 张里 3 张：P(抽到 J、Q、K) = ${cardProb().text}` },
]
const CW = 0.063, CH = 0.088

export default function Lesson3() {
  const [prop, setProp] = useState<Prop>('wheel')
  const [spun, setSpun] = useState(false)
  const [drawn, setDrawn] = useState(false)
  const [counted, setCounted] = useState<string[]>([])
  const T = useTasks('gewu:chance:3', TASKS)
  const spin = useRun(4.2, () => { setSpun(true); T.check(id => id === 'spin') })
  const draw = useRun(1.6, () => setDrawn(true))
  const cur = T.current?.id
  const cnt = useRun(2.0, () => { const id = prop === 'card' ? 'card' : (cur === 'notRed' ? 'notRed' : 'red'); const n = [...counted, id]; setCounted(n); T.check(x => n.includes(x)) })
  const busy = spin.busy || draw.busy || cnt.busy
  const pick = (p: Prop) => { if (!busy) setProp(p) }
  const resetAll = () => { setProp('wheel'); setSpun(false); setDrawn(false); setCounted([]); spin.snap(0); draw.snap(0); cnt.snap(0); T.reset() }

  const sp = spin3(), dk = deck3()
  const goal = (sp.turns + (sp.sector + 0.5) / WHEEL.length) * Math.PI * 2
  const ang = spun ? goal : goal * (1 - Math.pow(1 - spin.k, 3))
  const counting = cnt.busy ? (prop === 'card' ? 'card' : cur === 'notRed' ? 'notRed' : 'red') : null

  const { hint, next }: { hint: string; next: 'spin' | 'draw' | 'count' | 'prop' | null } = (() => {
    if (!cur) return { hint: '转盘 8 格、扑克 13 张，每种结果可能性相等：P(A) = m/n。', next: null }
    if (spin.busy) return { hint: '转盘越转越慢…', next: null }
    if (draw.busy || cnt.busy) return { hint: '数一数…', next: null }
    if (cur === 'card') {
      if (prop !== 'card') return { hint: '换成扑克', next: 'prop' }
      if (!drawn) return { hint: '13 张黑桃洗好扣着，抽一张', next: 'draw' }
      return { hint: '翻开全部 13 张，数一数 J、Q、K 有几张', next: 'count' }
    }
    if (prop !== 'wheel') return { hint: '换成转盘', next: 'prop' }
    if (cur === 'spin') return { hint: '转一次转盘，看指针停在哪种颜色', next: 'spin' }
    if (cur === 'red') return { hint: '数一数：8 格里有几格红色', next: 'count' }
    return { hint: '不指向红色的有几格？再数一数', next: 'count' }
  })()

  const lit = (i: number) => {
    const show = counting === 'red' || counting === 'notRed' ? counting : prop === 'wheel' && counted.length && !counting ? (counted.includes('notRed') ? 'notRed' : counted.includes('red') ? 'red' : null) : null
    if (!show) return false
    const match = show === 'red' ? WHEEL[i] === 'red' : WHEEL[i] !== 'red'
    return match && (!counting || cnt.k * 1.3 > i / WHEEL.length)
  }
  const faceUp = counting === 'card' || counted.includes('card')
  const wheelEv = counted.includes('red') && (cur === 'notRed' || counted.includes('notRed')) ? 'notRed' : 'red'
  const wp = wheelProb(wheelEv), cp = cardProb()
  const show = prop === 'card' ? (counted.includes('card') ? cp.text : '?') : counted.includes(wheelEv) ? wp.text : '?'
  const labels: Label[] = [
    { id: 'stop', at: [WC[0], WC[1] + WR + 0.07, WC[2]], ax: 0.5, className: 'scene-tag -translate-y-full transition-opacity', style: { opacity: spun ? 1 : 0 }, children: <><small>停在</small>{HUE_NAME[WHEEL[sp.sector]]}色</> },
    { id: 'pick', at: [X + 0.4, TABLE_H + 0.16, Z + 0.06], ax: 0.5, className: 'scene-tag -translate-y-full transition-opacity', style: { opacity: drawn && !faceUp ? 1 : 0 }, children: <><small>抽到</small>黑桃 {dk.order[dk.pick]}</> },
    { id: 'n1', at: [WC[0] - WR - 0.03, WC[1], WC[2]], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '转盘 · 8 格一样大' },
    { id: 'n2', at: [X + 0.4, TABLE_H + 0.01, Z + 0.2], ax: 0.5, name: true, className: 'scene-name', children: '13 张黑桃' },
  ]
  return (
    <LabShell title="概率" lessons={LESSONS} current="3" narration={voiced(NARRATION['3'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={prop === 'wheel' ? '转盘' : '扑克'}
      stage={<Place at={prop === 'card' ? 'l3c' : 'l3'} labels={labels}>
        <Wheel ang={ang} lit={lit} />
        {spin.busy && spin.k < 0.18 && <group position={[WC[0] + WR * 0.7, WC[1] + WR * 0.75 - ease(spin.k / 0.18) * 0.12, WC[2] + 0.05]} rotation={[0.2, 0, 0.6]}><Glove pinch={0.2} arm={0.3} /></group>}
        <Cards order={dk.order} pick={dk.pick} draw={drawn ? 1 : draw.k} faceUp={faceUp ? (counting === 'card' ? Math.min(1, cnt.k * 1.6) : 1) : 0} />
      </Place>}
      lesson={<LessonBlock no="3" title="转盘和扑克" concept="结果等可能时，数一数就能求概率" tasks={TASKS} done={T.done} current={cur}
        theory={<>
          <p>转盘的 8 个扇形大小相同，转动后指针停在每一格的可能性相等，n = 8。红色占 3 格，P(指向红色) = 3/8。</p>
          <p className="mt-3">不指向红色就是指向黄色或绿色，有 5 格：P = 5/8。也可以这样想：P(不指向红色) = 1 − P(指向红色) = 1 − 3/8 = 5/8。</p>
          <p className="mt-3">13 张牌洗匀扣着，抽到每一张的可能性相等，n = 13；J、Q、K 共 3 张，P = 3/13。</p>
          <p className="mt-3">要用 m/n，先确认每种结果可能性相等：如果扇形大小不同，就不能只数格数。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[17px] leading-snug font-bold">P(指向红色) = 3/8，P(不指向红色) = 5/8，P(抽到 J、Q、K) = 3/13</p>
        <p className="mt-1 text-[14px] text-white/70">每种结果可能性相等时，数出全部结果 n 和事件包含的 m，P = m/n。</p>
      </>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{prop === 'card' ? 'P(抽到 J、Q、K)' : wheelEv === 'notRed' ? 'P(不指向红色)' : 'P(指向红色)'}</div>
            <div className="mt-1 text-[40px] leading-none font-bold tracking-tight tabular-nums">{show}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {prop === 'card' ? <>
              <ParamTile symbol="m" value={counted.includes('card') ? String(cp.m) : '—'} unit="张 · J、Q、K" />
              <ParamTile symbol="n" value={String(RANKS.length)} unit="张 · 全部" />
            </> : <>
              <ParamTile symbol="m" value={counted.includes(wheelEv) ? String(wp.m) : '—'} unit={`格 · ${wheelEv === 'notRed' ? '不是红' : '红色'}`} />
              <ParamTile symbol="n" value={String(WHEEL.length)} unit="格 · 全部" />
            </>}
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">转盘的 8 格</h2>
          <div className="mt-1.5 flex gap-1">{WHEEL.map((c, i) => <span key={i} className="h-6 flex-1 rounded" style={{ background: HUE[c], opacity: lit(i) || !counted.length ? 1 : 0.35 }} />)}</div>
          <p className="mt-1.5 text-[13px] text-white/60">红 3 格，黄 2 格，绿 3 格</p>
        </Glass>
      }
      actions={<>
        {prop === 'wheel'
          ? <LabButton pulse={next === 'spin'} onClick={() => { if (!busy && !spun) spin.run() }} disabled={busy || spun}>转一次</LabButton>
          : <LabButton pulse={next === 'draw'} onClick={() => { if (!busy && !drawn) draw.run() }} disabled={busy || drawn}>抽一张</LabButton>}
        <LabButton primary pulse={next === 'count'} onClick={() => { if (!busy) cnt.run() }} disabled={busy || next !== 'count'}>数一数</LabButton>
      </>}
      extras={<Control label="道具"><Segmented label="道具" pulse={next === 'prop'} want={next === 'prop' ? (cur === 'card' ? 'card' : 'wheel') : null} disabled={busy} value={prop} onChange={pick} options={[{ value: 'wheel', label: '转盘' }, { value: 'card', label: '扑克' }]} /></Control>}
    />
  )
}

/** 立式转盘：木底座、一根立柱，盘面 8 个扇形，外圈一道金属边，中间一颗轮毂；指针固定在正上方 */
function Wheel({ ang, lit }: { ang: number; lit: (i: number) => boolean }) {
  const sectors = useMemo(() => WHEEL.map((_, i) => { const a0 = Math.PI / 2 - (i + 1) * Math.PI * 2 / WHEEL.length; return new THREE.CircleGeometry(WR, 24, a0 + 0.004, Math.PI * 2 / WHEEL.length - 0.008) }), [])
  const rim = useMemo(() => new THREE.TorusGeometry(WR + 0.004, 0.006, 12, 96), [])
  const hub = useMemo(() => lathe([[0, 0], [0.026, 0], [0.026, 0.008], [0.016, 0.02], [0, 0.022]], { segs: 32 }), [])
  const base = useMemo(() => disc(0.11, 0.025), [])
  const wood = makeWood()
  return <group>
    <mesh geometry={base} position={[WC[0], TABLE_H, WC[2]]} castShadow receiveShadow><meshStandardMaterial map={wood} color="#9b6b40" roughness={0.5} /></mesh>
    <mesh position={[WC[0], TABLE_H + (WC[1] - TABLE_H) / 2, WC[2] - 0.02]} castShadow><boxGeometry args={[0.03, WC[1] - TABLE_H, 0.02]} /><meshStandardMaterial map={wood} color="#9b6b40" roughness={0.5} /></mesh>
    <group position={WC} rotation-z={-ang}>
      <mesh position={[0, 0, -0.006]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[WR + 0.002, WR + 0.002, 0.012, 64]} /><meshStandardMaterial color="#f2f0ea" roughness={0.5} /></mesh>
      {sectors.map((g, i) => <mesh key={i} geometry={g} position={[0, 0, 0.0005]} rotation-x={0}><meshStandardMaterial color={HUE[WHEEL[i]]} roughness={0.42} emissive={lit(i) ? '#ffffff' : '#000000'} emissiveIntensity={lit(i) ? 0.25 : 0} /></mesh>)}
      <mesh geometry={rim}><Metal kind="chrome" /></mesh>
      {/* 扇形之间的白色分隔线 */}
      {WHEEL.map((_, i) => { const a = Math.PI / 2 - i * Math.PI * 2 / WHEEL.length; return <mesh key={i} position={[Math.cos(a) * WR / 2, Math.sin(a) * WR / 2, 0.001]} rotation-z={a}><planeGeometry args={[WR, 0.003]} /><meshBasicMaterial color="#ffffff" /></mesh> })}
    </group>
    <mesh geometry={hub} position={[WC[0], WC[1], WC[2] + 0.001]} rotation-x={Math.PI / 2}><Metal kind="chrome" grain="turned" /></mesh>
    {/* 指针：固定在盘的正上方，尖朝下 */}
    <group position={[WC[0], WC[1] + WR + 0.012, WC[2] + 0.012]}>
      <mesh rotation-z={Math.PI}><coneGeometry args={[0.016, 0.045, 3]} /><meshStandardMaterial color="#1c1e21" roughness={0.4} /></mesh>
      <mesh position={[0, 0.03, -0.012]}><boxGeometry args={[0.03, 0.025, 0.012]} /><Metal kind="steel" /></mesh>
    </group>
  </group>
}

/**
 * 13 张牌扣着排成一个扇面。draw：抽出的那张抬起、翻开放到前面；faceUp：全部翻开，J、Q、K 往前挪一点
 */
function Cards({ order, pick, draw, faceUp }: { order: string[]; pick: number; draw: number; faceUp: number }) {
  const back = makeCardBack()
  return <group>
    {order.map((r, i) => {
      const n = order.length, t = i - (n - 1) / 2, cx = X + 0.4 + t * 0.026, cz = Z + 0.02 - Math.abs(t) * 0.004
      const isPick = i === pick, star = FACE_CARDS.includes(r)
      let x = cx, y = TABLE_H + 0.0012 + i * 0.0004, z = cz, flip = faceUp * Math.PI
      if (isPick && draw > 0) { const k = ease(draw); x = cx + (X + 0.4 - cx) * k; z = cz + 0.13 * k; y += Math.sin(k * Math.PI) * 0.06 + 0.002; flip = Math.max(flip, k * Math.PI) }
      // 全部翻开时排成两行（7 张、6 张），一张不挡一张
      if (faceUp > 0) { const row = i < 7 ? 0 : 1, col = row ? i - 7 : i, gx = X + 0.4 + (col - (row ? 2.5 : 3)) * 0.07, gz = Z - 0.02 + row * 0.1 + (star ? 0.012 : 0), f = ease(faceUp); x = x + (gx - x) * f; z = z + (gz - z) * f; y = TABLE_H + 0.0012 + Math.sin(f * Math.PI) * 0.03 }
      return <group key={r} position={[x, y, z]} rotation-y={t * -0.06 * (1 - ease(faceUp))}>
        <group rotation-z={flip}>
          <RoundedBox args={[CW, 0.0006, CH]} radius={0.0003} smoothness={1} castShadow receiveShadow><meshStandardMaterial color="#fbfaf6" roughness={0.5} /></RoundedBox>
          <mesh position={[0, 0.00035, 0]} rotation-x={-Math.PI / 2}><planeGeometry args={[CW, CH]} /><meshStandardMaterial map={back} roughness={0.45} /></mesh>
          <mesh position={[0, -0.00035, 0]} rotation-x={Math.PI / 2} rotation-z={Math.PI}><planeGeometry args={[CW, CH]} /><meshStandardMaterial map={makeCardFace(r)} roughness={0.45} emissive={star && faceUp > 0.9 ? '#ffd76a' : '#000'} emissiveIntensity={star && faceUp > 0.9 ? 0.18 : 0} /></mesh>
        </group>
      </group>
    })}
  </group>
}
