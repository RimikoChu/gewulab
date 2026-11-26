// 生态系统 · 第 3 课 食物链：在缓坡上一环一环连出“草 → 兔 → 狐”“草 → 鼠 → 蛇 → 鹰”。
// 发光的箭头从被吃的指向吃它的；再试着把蘑菇（分解者）接到狐后面，看为什么不行。
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { Eagle, Fox, Mouse, Rabbit, Snake } from './animals'
import { GlowArrow, Halo } from './fx'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { CHAINS, chainText, checkChain, type ChainKey } from './physics'
import { Flesh, fuse, place, tint, tube, useRun, type V3 } from './parts'
import { ChainLine, Finale, H } from './ui'
import { VOICE } from './voice'
import { Room, SPOT, ST, onGround, rockGeo } from './world'

const X = ST.chain.x, Z = ST.chain.z
/** 两条链上各个生物站在哪，箭头连到它身上的哪一点 */
export const C3 = {
  grassA: onGround(X - 1.6, Z + 1.0), rabbit: onGround(X - 0.85, Z + 0.95), fox: onGround(X + 0.35, Z + 0.55), shroom: onGround(X + 1.05, Z + 1.05),
  grassB: onGround(X + 1.0, Z - 0.35), mouse: onGround(X + 1.6, Z - 0.55), snake: onGround(X + 2.55, Z - 0.9), stump: onGround(X + 3.35, Z - 1.45),
}
const up = (p: V3, dy: number): V3 => [p[0], p[1] + dy, p[2]]
const NODES: Record<ChainKey, V3[]> = {
  rabbit: [up(C3.grassA, 0.12), up(C3.rabbit, 0.24), up(C3.fox, 0.42)],
  mouse: [up(C3.grassB, 0.12), up(C3.mouse, 0.06), up(C3.snake, 0.06), up(C3.stump, 0.62 + 0.42)],
}
const VIEW: Record<ChainKey, { at: V3; span: [number, number] }> = {
  rabbit: { at: onGround(X - 0.55, Z + 0.75, 0.28), span: [2.9, 1.25] },
  mouse: { at: onGround(X + 2.2, Z - 0.9, 0.42), span: [3.0, 1.45] },
}
const STUMP_H = 0.62

const TASKS: Task[] = [
  { id: 'rabbit', text: '从草开始，连出“草 → 兔 → 狐”', note: '箭头指向吃它的一方：草被兔吃，兔被狐吃' },
  { id: 'decomp', text: '试着把蘑菇（分解者）接到狐后面', note: '分解者不进入食物链' },
  { id: 'mouse', text: '换一条，连出“草 → 鼠 → 蛇 → 鹰”', note: '这条链有四个营养级，鹰是第四营养级' },
]
const NAME_OF: Record<string, string> = { 草: '草', 兔: '兔', 狐: '狐', 鼠: '鼠', 蛇: '蛇', 鹰: '鹰' }

export function Shrooms({ at, s = 1 }: { at: V3; s?: number }) {
  const g = useMemo(() => {
    const list: THREE.BufferGeometry[] = []
    ;[[0, 0, 1], [0.06, 0.03, 0.75], [-0.05, 0.04, 0.6]].forEach(([x, z, k]) => {
      const h = 0.07 * k, R = 0.05 * k
      list.push(place(tint(new THREE.LatheGeometry([new THREE.Vector2(0.012 * k, 0), new THREE.Vector2(0.01 * k, h * 0.7), new THREE.Vector2(0.009 * k, h)], 10), '#e8dcc2', '#efe6d0'), [x, 0, z]))
      list.push(place(tint(new THREE.LatheGeometry([new THREE.Vector2(0.006, h - 0.005), new THREE.Vector2(R * 0.9, h - 0.008), new THREE.Vector2(R, h - 0.002), new THREE.Vector2(R * 0.9, h + 0.012 * k), new THREE.Vector2(R * 0.5, h + 0.024 * k), new THREE.Vector2(0, h + 0.028 * k)], 20), '#d8c9a8', '#9a6a3e'), [x, 0, z]))
    })
    return fuse(list)
  }, [])
  return <group position={at} scale={s}><mesh geometry={g} castShadow receiveShadow><Flesh rough={0.55} /></mesh></group>
}
/** 一块半埋在土里的石头（蛇盘在它边上） */
export function Rock({ at, s = [0.32, 0.2, 0.26] }: { at: V3; s?: V3 }) {
  const g = useMemo(() => rockGeo(7, s), [s[0], s[1], s[2]])   // eslint-disable-line react-hooks/exhaustive-deps
  return <mesh geometry={g} position={[at[0], at[1] - s[1] * 0.25, at[2]]} castShadow receiveShadow><Flesh rough={0.9} /></mesh>
}
export function Stump({ at, h = STUMP_H }: { at: V3; h?: number }) {
  const g = useMemo(() => tube([[0, -0.1, 0], [0.02, h * 0.55, 0], [0.0, h, 0.01]], 0.13, 0.11, '#5b4a3a', '#6e5c48', 14, 6), [h])
  return <group position={at}><mesh geometry={g} castShadow receiveShadow><Flesh rough={0.95} /></mesh><mesh position={[0, h, 0.01]} rotation-x={-Math.PI / 2}><circleGeometry args={[0.11, 20]} /><meshStandardMaterial color="#9a7d58" roughness={1} /></mesh></group>
}

export default function Lesson3() {
  const [chain, setChain] = useState<ChainKey>('rabbit')
  const [lit, setLit] = useState<Record<ChainKey, number>>({ rabbit: 1, mouse: 1 })
  const [tried, setTried] = useState(false)
  const T = useTasks('gewu:eco:3', TASKS)
  const a = useRun(lit.rabbit, 1.1), b = useRun(lit.mouse, 1.1), dec = useRun(tried ? 1 : 0, 1.1)
  const names = CHAINS[chain], n = lit[chain], full = n >= names.length
  useEffect(() => { T.check(id => id === 'rabbit' ? a >= CHAINS.rabbit.length : id === 'mouse' ? b >= CHAINS.mouse.length : id === 'decomp' ? dec >= 1 : false) }, [a >= 3, b >= 4, dec >= 1])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setChain('rabbit'); setLit({ rabbit: 1, mouse: 1 }); setTried(false); T.reset() }
  const busy = Math.abs(a - lit.rabbit) > 0.001 || Math.abs(b - lit.mouse) > 0.001 || (tried && dec < 1)
  const task = T.current
  const want: ChainKey = task?.id === 'mouse' ? 'mouse' : 'rabbit'
  const { hint, nx }: { hint: string; nx: 'chain' | 'link' | 'dec' | null } = (() => {
    if (!task) return { hint: '两条食物链都连好了。食物链从生产者开始，箭头指向吃它的一方。', nx: null }
    if (busy) return { hint: '连上了…', nx: null }
    if (chain !== want) return { hint: want === 'mouse' ? '换一条：草 → 鼠 → 蛇 → 鹰' : '先看“草 → 兔 → 狐”这一条', nx: 'chain' }
    if (task.id === 'decomp') return { hint: '蘑菇也吃狐吗？按“接上分解者”试一试', nx: 'dec' }
    if (n === 1) return { hint: '食物链从生产者开始。谁吃草？按“接下一环”', nx: 'link' }
    return { hint: `谁吃${NAME_OF[names[n - 1]]}？按“接下一环”`, nx: 'link' }
  })()
  const link = () => { if (!full) setLit({ ...lit, [chain]: n + 1 }) }
  const v = VIEW[chain], base = SPOT.s3.target
  const nodes = NODES[chain]
  const result = tried && chain === 'rabbit' ? checkChain([...CHAINS.rabbit, '蘑菇']) : checkChain(names.slice(0, Math.max(1, n)))
  const labels: Label[] = [
    ...names.map((nm, k) => ({ id: `n${k}`, at: [nodes[k][0], nodes[k][1] + (k === 0 ? 0.05 : 0.18), nodes[k][2]] as V3, ax: 0.5, className: `scene-tag ${k < n ? 'key' : ''} -translate-y-full transition-opacity`, style: { opacity: k < n ? 1 : 0.55 }, children: k === 0 ? <><small>生产者</small>{nm}</> : nm })),
    ...(chain === 'rabbit' && dec > 0.5 ? [{ id: 'sh', at: up(C3.shroom, 0.16), ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>分解者</small>蘑菇 ✕</> }] : []),
  ]
  return (
    <LabShell title="生态系统" lessons={LESSONS} current="3" narration={voiced(NARRATION['3'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={chainText(names)}
      stage={<Room at="s3" labels={labels} shift={[v.at[0] - base.x, v.at[1] - base.y, v.at[2] - base.z]} span={v.span}>
        <Rabbit position={C3.rabbit} rotation-y={Math.PI + 0.1} seed={3} />
        <Fox position={C3.fox} rotation-y={Math.PI - 0.35} />
        <Shrooms at={C3.shroom} />
        <Mouse position={C3.mouse} rotation-y={Math.PI + 0.3} />
        <Snake position={C3.snake} rotation-y={Math.PI - 0.3} />
        <Stump at={C3.stump} />
        <Eagle position={up(C3.stump, STUMP_H)} rotation-y={Math.PI - 0.5} />
        <Halo at={C3.grassA} r={0.28} on={chain === 'rabbit'} />
        <Halo at={C3.grassB} r={0.28} on={chain === 'mouse'} />
        {NODES.rabbit.slice(1).map((p, k) => <GlowArrow key={`a${k}`} from={NODES.rabbit[k]} to={p} lift={0.35} on={a - 1 - k} flow={a >= k + 2 ? 0.6 : 0} />)}
        {NODES.mouse.slice(1).map((p, k) => <GlowArrow key={`b${k}`} from={NODES.mouse[k]} to={p} lift={0.35} on={b - 1 - k} flow={b >= k + 2 ? 0.6 : 0} />)}
        <GlowArrow from={NODES.rabbit[2]} to={up(C3.shroom, 0.08)} lift={0.25} on={dec} color="#ff7070" dash />
      </Room>}
      lesson={<LessonBlock no="3" title="食物链" concept="食物链从生产者开始" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>生态系统中，生产者与消费者之间吃与被吃的关系，构成<b className="text-white">食物链</b>。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>食物链的起点是生产者（绿色植物）。</li>
            <li>箭头指向吃它的一方（捕食者），表示物质和能量流动的方向。</li>
            <li>食物链里只有生产者和消费者，没有分解者，也没有阳光这类非生物部分。</li>
          </ul>
        </>} />}
      finale={T.finale && <Finale kicker="两条食物链都连好了" title="食物链从生产者开始，箭头指向吃它的一方" text={`${chainText(CHAINS.rabbit)}；${chainText(CHAINS.mouse)}。分解者和非生物部分不写进食物链。`} notes="发光的箭头是为了看清画的。" onClose={() => T.setFinale(false)} />}
      panel={
        <Glass className="px-4 py-4">
          <div className="rounded-xl bg-white/6 px-2 py-4"><ChainLine names={names} lit={n} bad={chain === 'rabbit' && tried ? '蘑菇' : undefined} /></div>
          <p className={`mt-3 text-center text-[14px] ${result.ok ? 'text-[#7fe3d4]' : 'text-[#ff9a9a]'}`}>{n === 1 && !tried ? '从生产者开始' : result.why}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="营养级" value={`${n} 个`} unit="已连上" />
            <ParamTile symbol="最高" value={names[n - 1]} unit={`第 ${n} 营养级`} />
          </div>
          <H>写法</H>
          <ul className="flex flex-col gap-1 text-[13.5px] text-white/75">
            <li>起点是生产者</li><li>箭头指向吃它的一方</li><li>不写分解者和非生物部分</li>
          </ul>
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={nx === 'link'} onClick={link} disabled={busy || full}>接下一环</LabButton>
        {chain === 'rabbit' && <LabButton pulse={nx === 'dec'} onClick={() => setTried(true)} disabled={busy || !full || tried}>接上分解者</LabButton>}
      </>}
      extras={<Control label="哪一条"><Segmented label="哪一条" pulse={nx === 'chain'} want={nx === 'chain' ? want : null} value={chain} onChange={c => { if (!busy) setChain(c) }} options={[{ value: 'rabbit', label: '草 → 兔 → 狐' }, { value: 'mouse', label: '草 → 鼠 → 蛇 → 鹰' }]} /></Control>}
    />
  )
}
