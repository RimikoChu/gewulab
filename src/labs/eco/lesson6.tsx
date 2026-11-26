// 生态系统 · 第 6 课 物质循环和生物富集：湖边的草地上。
// 碳循环：跟着一个碳走一圈：空气里的二氧化碳 → 光合作用进草 → 被兔吃 → 呼吸作用回到空气；再走一圈：草的落叶 → 分解者（枯木上的蘑菇）→ 二氧化碳。
// 生物富集：给草地喷农药，沿“草 → 鼠 → 蛇 → 鹰”看体内有毒物质越积越多（紫色的光点）。
import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { cn } from '@/lib/utils'
import { Eagle, Mouse, Rabbit, Snake } from './animals'
import { GlowArrow, Halo, Motes, arc } from './fx'
import { Stump } from './lesson3'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { CARBON, TOXIN_CHAIN, toxinAt } from './physics'
import { ease, useRun, type V3 } from './parts'
import { Finale, H, Row } from './ui'
import { VOICE } from './voice'
import { LOG2, Room, SPOT, ST, onGround } from './world'

type Sub = 'carbon' | 'toxin'
const X = ST.shore.x, Z = ST.shore.z
const logAt = (lx: number, ly: number, lz: number): V3 => { const c = Math.cos(LOG2.yaw), s = Math.sin(LOG2.yaw), b = onGround(LOG2.x, LOG2.z, -0.04); return [b[0] + lx * c + lz * s, b[1] + ly, b[2] - lx * s + lz * c] }
const CP: Record<string, V3> = { 空气: onGround(X - 0.5, Z + 0.1, 1.25), 草: onGround(X - 1.3, Z + 0.45, 0.12), 兔: onGround(X - 0.35, Z + 0.5, 0.25), 蘑菇: logAt(0.15, 0.36, 0.03) }
const RABBIT = onGround(X - 0.35, Z + 0.5)
const VIEWS: Record<Sub, { at: V3; span: [number, number]; view?: [number, number] }> = { carbon: { at: onGround(X + 0.35, Z + 0.1, 0.5), span: [4.2, 1.9] }, toxin: { at: onGround(X + 3.9, Z - 2.75, 0.42), span: [3.3, 1.45], view: [-0.75, 0.2] } }
const TP: V3[] = [onGround(X + 2.6, Z - 2.0), onGround(X + 3.3, Z - 2.35), onGround(X + 4.25, Z - 2.85), onGround(X + 5.2, Z - 3.4)]
const T_LIFT = [0.1, 0.06, 0.06, 0.5 + 0.45], STUMP = 0.5
const TT: V3[] = TP.map((p, i) => [p[0], p[1] + T_LIFT[i], p[2]])
/** 碳循环里的几根箭头：从哪到哪 */
const LINKS: [string, string, number][] = [['空气', '草', 0], ['草', '兔', 1], ['兔', '空气', 2], ['草', '蘑菇', 4], ['蘑菇', '空气', 5]]

const TASKS: Task[] = [
  { id: 'c1', text: '跟着一个碳：空气 → 草 → 兔 → 空气', note: '碳以二氧化碳的形式进出生物，在生物体内是有机物' },
  { id: 'c2', text: '再跟一圈：草的落叶 → 分解者 → 空气', note: '分解者把遗体里的有机物分解，碳又回到空气里' },
  { id: 't1', text: '换到“生物富集”，给草地喷农药', note: '有毒物质进入了草的体内' },
  { id: 't2', text: '沿着食物链一级一级看有毒物质', note: `鹰体内的有毒物质最多，是草的 ${toxinAt(4).toLocaleString('zh-CN')} 倍（示意）` },
]

/** 一个碳原子：在空气里画成二氧化碳（一黑两红），在生物体内画成一团金色的光（有机物） */
function Carbon({ c }: { c: number }) {
  const i = Math.min(CARBON.length - 1, Math.floor(c)), f = ease(c - i), a = CARBON[i], b = CARBON[Math.min(CARBON.length - 1, i + 1)]
  const p = f > 0 && b ? arc(CP[a.at], CP[b.at], 0.35).getPointAt(f) : new THREE.Vector3(...CP[a.at])
  const inAir = (f < 0.5 ? a : b).at === '空气'
  return (
    <group position={p} scale={1.5}>
      {inAir ? <>
        <mesh renderOrder={14}><sphereGeometry args={[0.03, 16, 12]} /><meshStandardMaterial color="#2a2a2a" roughness={0.4} emissive="#555" emissiveIntensity={0.3} depthTest={false} /></mesh>
        {[1, -1].map(s => <mesh key={s} position={[s * 0.045, 0, 0]} renderOrder={14}><sphereGeometry args={[0.024, 14, 10]} /><meshStandardMaterial color="#e04a3a" roughness={0.4} emissive="#a02010" emissiveIntensity={0.4} depthTest={false} /></mesh>)}
      </> : <mesh renderOrder={14}><sphereGeometry args={[0.04, 16, 12]} /><meshBasicMaterial color={new THREE.Color('#ffd36a').multiplyScalar(2)} toneMapped={false} depthTest={false} /></mesh>}
    </group>
  )
}

export default function Lesson6() {
  const [sub, setSub] = useState<Sub>('carbon')
  const [c, setC] = useState(0), [spray, setSpray] = useState(false), [lv, setLv] = useState(0)
  const T = useTasks('gewu:eco:6', TASKS)
  const ck = useRun(c, 1.4), mist = useRun(spray ? 1 : 0, 2.2), tk = useRun(lv, 1.1)
  useEffect(() => { T.check(id => id === 'c1' ? ck >= 3 : id === 'c2' ? ck >= 6 : id === 't1' ? mist >= 1 : id === 't2' ? tk >= 3 : false) }, [ck >= 3, ck >= 6, mist >= 1, tk >= 3])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setSub('carbon'); setC(0); setSpray(false); setLv(0); T.reset() }
  const busy = Math.abs(ck - c) > 0.001 || (spray && mist < 1) || Math.abs(tk - lv) > 0.001
  const task = T.current, want: Sub = task?.id.startsWith('t') ? 'toxin' : 'carbon'
  const step = CARBON[Math.min(c, CARBON.length - 1)]
  const { hint, nx }: { hint: string; nx: 'sub' | 'step' | 'spray' | 'look' | null } = (() => {
    if (!task) return { hint: '物质在生物和环境之间循环；有毒物质沿食物链积累，营养级越高越多。', nx: null }
    if (busy) return { hint: sub === 'carbon' ? '碳在移动…' : spray && mist < 1 ? '农药雾落到草上…' : '…', nx: null }
    if (sub !== want) return { hint: want === 'toxin' ? '换到“生物富集”' : '换到“碳循环”', nx: 'sub' }
    if (sub === 'carbon') return { hint: `碳在${step.at}里（${step.what}）。下一步：${step.via}`, nx: 'step' }
    if (!spray) return { hint: '草地上喷了农药。按“喷洒农药”', nx: 'spray' }
    return { hint: lv === 0 ? '有毒物质进入了草的体内。按“沿食物链看”' : `${TOXIN_CHAIN[lv]}体内是草的 ${toxinAt(lv + 1).toLocaleString('zh-CN')} 倍。按“沿食物链看”`, nx: 'look' }
  })()
  const v = VIEWS[sub], base = SPOT.s6.target
  const shown = Math.round(tk)
  const labels: Label[] = sub === 'carbon' ? [
    { id: 'air', at: [CP.空气[0], CP.空气[1] + 0.12, CP.空气[2]], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>空气</small>二氧化碳</> },
    { id: 'g', at: [CP.草[0], CP.草[1] + 0.06, CP.草[2]], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>生产者</small>草</> },
    { id: 'r', at: [CP.兔[0], CP.兔[1] + 0.22, CP.兔[2]], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>消费者</small>兔</> },
    { id: 'm', at: [CP.蘑菇[0], CP.蘑菇[1] + 0.1, CP.蘑菇[2]], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>分解者</small>蘑菇</> },
    ...(c < CARBON.length - 1 && !busy ? [{ id: 'via', at: arc(CP[step.at], CP[CARBON[c + 1].at], 0.35).getPointAt(0.5).toArray() as V3, ax: 0.5, className: 'scene-tag key -translate-y-1/2', children: step.via }] : []),
  ] : TOXIN_CHAIN.map((nm, i) => ({ id: nm, at: [TT[i][0], TT[i][1] + 0.22, TT[i][2]] as V3, ax: 0.5, className: `scene-tag ${spray && i <= shown && i <= lv ? 'key' : ''} -translate-y-full`, children: spray && i <= lv ? <><small>{nm}</small>× {toxinAt(i + 1).toLocaleString('zh-CN')}</> : nm }))
  return (
    <LabShell title="生态系统" lessons={LESSONS} current="6" narration={voiced(NARRATION['6'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={sub === 'carbon' ? '碳循环' : '生物富集'}
      stage={<Room at="s6" labels={labels} shift={[v.at[0] - base.x, v.at[1] - base.y, v.at[2] - base.z]} span={v.span} view={v.view} bloom={0.6}>
        <Rabbit position={RABBIT} rotation-y={Math.PI - 0.2} seed={6} />
        <Halo at={onGround(CP.草[0], CP.草[2])} r={0.25} on={sub === 'carbon'} />
        {sub === 'carbon' && <>
          {LINKS.map(([a, b, s]) => <GlowArrow key={a + b} from={CP[a]} to={CP[b]} lift={0.35} dim={!(Math.floor(ck) === s && busy) && !(c > s)} color={b === '空气' ? '#9fd8ff' : '#ffd36a'} width={0.014} />)}
          <Carbon c={ck} />
        </>}
        <Mouse position={TP[1]} rotation-y={Math.PI - 0.4} />
        <Snake position={TP[2]} rotation-y={Math.PI - 0.5} />
        <Stump at={TP[3]} h={STUMP} />
        <Eagle position={[TP[3][0], TP[3][1] + STUMP, TP[3][2]]} rotation-y={Math.PI - 0.2} />
        {sub === 'toxin' && <>
          <Halo at={TP[0]} r={0.28} />
          {mist > 0 && mist < 1 && <Motes at={[TP[0][0], TP[0][1] + 0.6 - mist * 0.5, TP[0][2]]} n={60} spread={[0.35, 0.25, 0.35]} color="#c9d6c0" size={0.008} />}
          {TT.map((p, i) => spray && mist >= 1 && i <= tk + 0.01 && <Motes key={i} at={[p[0], p[1] + (i === 3 ? -0.15 : 0.02), p[2]]} n={[4, 10, 22, 46][i]} spread={i === 3 ? [0.08, 0.16, 0.08] : [0.12, 0.04, 0.12]} size={0.011} />)}
          {TT.slice(1).map((p, i) => <GlowArrow key={i} from={TT[i]} to={p} lift={0.3} on={tk - i} flow={tk >= i + 1 ? 0.5 : 0} color="#c77dff" width={0.016} />)}
        </>}
      </Room>}
      lesson={<LessonBlock no="6" title="物质循环和生物富集" concept="物质循环，有毒物质会富集" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>组成生物体的碳、氢、氧、氮等物质，在生物和无机环境之间<b className="text-white">反复循环</b>：生产者通过光合作用把二氧化碳变成有机物，有机物沿食物链传递，再通过生物的呼吸作用和分解者的分解作用变回二氧化碳。</p>
          <p className="mt-3">有些有毒物质（如某些农药、重金属）在生物体内<b className="text-white">不易分解、不易排出</b>，会沿着食物链积累，营养级越高，体内积累得越多。</p>
        </>} />}
      finale={T.finale && <Finale kicker="碳走了两圈，毒也沿链看完了" title="物质在循环，有毒物质沿食物链积累" text={`碳以二氧化碳的形式进入生物，在生物体内是有机物，又通过呼吸作用和分解作用回到空气里。草地喷了农药，营养级最高的鹰体内积累得最多。`} notes={`有毒物质每升一级乘 10、鹰是草的 ${toxinAt(4).toLocaleString('zh-CN')} 倍，只是示意趋势的数；光点表示看不见的物质。`} onClose={() => T.setFinale(false)} />}
      panel={sub === 'carbon' ? (
        <Glass className="px-4 py-4">
          <div className="text-center"><div className="text-[13px] text-white/60">碳现在在</div><div className="mt-1 text-[30px] leading-tight font-bold">{step.at}</div><div className="text-[14px] text-[#7fe3d4]">{step.what}</div>
            <div className="mt-1 min-h-[2.6em] text-[13.5px] leading-snug text-white/70">{step.note}</div></div>
          <H>走过的路</H>
          <div className="flex flex-col gap-1.5">{CARBON.slice(0, -1).map((s, i) => <Row key={i} name={`${s.at} →`} text={`${s.via}`} on={i === c} seen={i < c} />)}</div>
        </Glass>
      ) : (
        <Glass className="px-4 py-4">
          <div className="text-center text-[13px] text-white/60">有毒物质的相对含量（草为 1，示意）</div>
          <div className="mt-3 flex flex-col gap-1.5">
            {TOXIN_CHAIN.map((nm, i) => {
              const on = spray && mist >= 1 && i <= shown
              return (
                <div key={nm} className="flex items-center gap-2.5">
                  <span className="w-[2em] text-[14px] font-semibold">{nm}</span>
                  <div className="h-5 flex-1 overflow-hidden rounded-md bg-white/8"><div className={cn('h-full rounded-md bg-[#c77dff]/80 transition-all duration-700')} style={{ width: on ? `${(Math.log10(toxinAt(i + 1)) + 1) * 25}%` : '0%' }} /></div>
                  <span className="w-[4.2em] text-right text-[14px] tabular-nums">{on ? toxinAt(i + 1).toLocaleString('zh-CN') : '—'}</span>
                </div>
              )
            })}
          </div>
          <p className="mt-2 text-center text-[12px] text-white/45">条的长度按每级 ×10 画，只是示意</p>
          <div className="mt-3 grid grid-cols-2 gap-2"><ParamTile symbol="最多的" value={shown >= 3 && spray ? '鹰' : '—'} unit="最高营养级" /><ParamTile symbol="每升一级" value="× 10" unit="示意" /></div>
        </Glass>
      )}
      actions={sub === 'carbon' ? <>
        <LabButton primary pulse={nx === 'step'} onClick={() => setC(x => Math.min(CARBON.length - 1, x + 1))} disabled={busy || c >= CARBON.length - 1}>下一步</LabButton>
      </> : <>
        <LabButton pulse={nx === 'spray'} onClick={() => setSpray(true)} disabled={busy || spray}>喷洒农药</LabButton>
        <LabButton primary pulse={nx === 'look'} onClick={() => setLv(l => Math.min(3, l + 1))} disabled={busy || !spray || lv >= 3}>沿食物链看</LabButton>
      </>}
      extras={<Control label="看哪一样"><Segmented label="看哪一样" pulse={nx === 'sub'} want={nx === 'sub' ? want : null} value={sub} onChange={v => { if (!busy) setSub(v) }} options={[{ value: 'carbon', label: '碳循环' }, { value: 'toxin', label: '生物富集' }]} /></Control>}
    />
  )
}
