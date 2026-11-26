// 内能和热机 · 第 1 课 分子热运动：质检实验室台子上，冷水、热水里同时滴红墨水比扩散快慢；抽掉两只集气瓶之间的玻璃片看气体扩散；
// 面板里换着看冷水、热水里分子的放大图。
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { InkCloud, Puffs } from './fx'
import { BEAKER, Beaker, Dropper, GasJar, JAR, Plate, WATER } from './gear'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { Done, H2, useRun } from './parts'
import { INK, diffuse, evenAt, gasEvenAt, gasMix, molSpeed } from './physics'
import { MolView } from './views'
import { VOICE } from './voice'
import { BZ, Room, ST, TOP } from './world'

const TASKS: Task[] = [
  { id: 'ink', text: '同时往冷水和热水里各滴一滴红墨水', note: '热水里的红墨水先散匀：温度越高，扩散越快' },
  { id: 'gas', text: '抽掉两只集气瓶之间的玻璃片，等上下颜色一样', note: '二氧化氮跑到了上面的瓶里：气体分子也在不停地运动' },
  { id: 'look', text: '把放大图换到热水，比一比分子的运动', note: '热水里分子跑得更快：温度越高，分子运动越剧烈' },
]
const X = ST.s1, Z = BZ + 0.2
const COLD: [number, number, number] = [X - 1.35, TOP, Z], HOT: [number, number, number] = [X - 0.45, TOP, Z]
const JX = X + 1.05, LEVEL = 0.62, DROP_SEC = 0.6
type Look = 'cold' | 'hot'

export default function Lesson1() {
  const [dropped, setDropped] = useState(false)
  const [t, setT] = useRun(dropped, 1, 60)
  const [pulled, setPulled] = useState(false)
  const [tg, setTg] = useRun(pulled, 1, 40)
  const [look, setLook] = useState<Look>('cold')
  const T = useTasks('gewu:heat:1', TASKS)
  const f = Math.min(1, t / DROP_SEC), td = Math.max(0, t - DROP_SEC)
  const dCold = diffuse(td, false), dHot = diffuse(td, true)
  const hotEven = dropped && td >= evenAt(true), gasEven = pulled && tg >= gasEvenAt()
  const mix = pulled ? gasMix(tg) : 0
  const plateX = useSlide(pulled ? 1.25 : 0, 1.4)
  useEffect(() => { T.check(id => id === 'ink' ? hotEven : id === 'gas' ? gasEven : look === 'hot' && T.done.gas === true) })
  const resetAll = () => { setDropped(false); setT(0); setPulled(false); setTg(0); setLook('cold'); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'drop' | 'pull' | 'look' | null } = (() => {
    if (!task) return { hint: '温度越高，分子的无规则运动越剧烈，扩散越快。', next: null }
    if (task.id === 'ink') return !dropped ? { hint: '按“滴入红墨水”：同时往冷水、热水里各滴一滴', next: 'drop' } : { hint: '看两杯水：哪一杯里的红墨水先散开…', next: null }
    if (task.id === 'gas') return !pulled ? { hint: '下面的瓶里是红棕色的二氧化氮，上面是空气。按“抽掉玻璃片”', next: 'pull' } : { hint: '玻璃片抽掉了，看上面的瓶子…', next: null }
    return { hint: '把放大图换到“热水”，和冷水比一比', next: 'look' }
  })()
  const squeeze = dropped ? Math.min(1, t / 0.25) * (t < 0.9 ? 1 : Math.max(0, 1 - (t - 0.9) * 3)) : 0
  const lift = dropped ? Math.min(1, Math.max(0, (t - 1.0) / 0.8)) : 0
  const labels: Label[] = [
    { id: 'c', at: [COLD[0], TOP + BEAKER.h + 0.12, Z + 0.3], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>冷水</small>{INK.cold} ℃</> },
    { id: 'h', at: [HOT[0], TOP + BEAKER.h + 0.12, Z + 0.3], ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>热水</small>{INK.hot} ℃</> },
    { id: 'n1', at: [JX + 0.42, TOP + 0.55, Z], name: true, className: 'scene-name -translate-y-1/2', children: '二氧化氮' },
    { id: 'n2', at: [JX + 0.42, TOP + 2.0, Z], name: true, className: 'scene-name -translate-y-1/2', children: '空气' },
    { id: 'n3', at: [JX - 0.5, TOP + 1.3, Z + 0.3], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '玻璃片' },
    { id: 'n4', at: [COLD[0] - 0.42, TOP + 0.3, Z + 0.2], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '烧杯' },
  ]
  const inkCol = (d: number) => d > 0 ? `rgb(${Math.round(134 + 90 * d)},${Math.round(185 - 140 * d)},${Math.round(224 - 160 * d)})` : WATER
  const dropAt = (p: [number, number, number]): [number, number, number] => [p[0] + 0.05, TOP + BEAKER.h + 0.25 + lift * 1.2, p[2]]
  return (
    <LabShell title="内能和热机" lessons={LESSONS} current="1" narration={voiced(NARRATION['1'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="操作"
      stage={<Room at="s1" labels={labels}>
        {[COLD, HOT].map((p, i) => { const d = i ? dHot : dCold; return <group key={i}>
          <Beaker at={p} level={LEVEL} color={inkCol(d * 0.8)} o={0.45 + d * 0.15}><InkCloud r={BEAKER.inR - 0.03} h={LEVEL} spread={d} drop={dropped ? f : 0} /></Beaker>
          {/* 滴管和捏着它的手 */}
          {lift < 1 && <group position={dropAt(p)}>
            <Dropper at={[0, 0, 0]} squeeze={squeeze} ink={!dropped || t < 0.25} />
          </group>}
          {i === 1 && <Puffs at={[p[0], TOP + BEAKER.h - 0.05, p[2]]} on={1} len={0.7} size={0.22} spread={0.1} dense={0.16} />}
        </group> })}
        {/* 两只口对口的集气瓶，中间隔着玻璃片 */}
        <GasJar at={[JX, TOP, Z]} fill={1 - mix} />
        <Plate at={[JX + plateX, TOP + JAR.h + 0.015, Z]} />
        <GasJar at={[JX, TOP + JAR.h * 2 + 0.03, Z]} fill={mix} flip />
              </Room>}
      lesson={<LessonBlock no="1" title="分子热运动" concept="温度越高，分子运动越剧烈" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>不同的物质在互相接触时彼此进入对方的现象，叫做<b className="text-white">扩散</b>。扩散现象说明，一切物质的分子都在不停地做无规则的运动。</p>
          <p className="mt-3">分子的运动跟温度有关：温度越高，分子的无规则运动越剧烈，所以热水里的红墨水扩散得快。这种无规则运动叫做分子的<b className="text-white">热运动</b>。</p>
          <p className="mt-3 text-[13.5px] text-white/65">二氧化氮的密度比空气大，所以放在下面的瓶里：它跑到上面去，不是被重力拉过去的。厂里闻得到汽油味，也是因为汽油分子扩散到了空气里。</p>
        </>} />}
      finale={T.finale && <Done head="三件事都做完了" title="温度越高，分子运动越剧烈" onClose={() => T.setFinale(false)}>红墨水在热水里很快散匀，在冷水里慢得多；二氧化氮自己跑到了上面的瓶里。一切物质的分子都在不停地做无规则运动，温度越高，运动越剧烈。</Done>}
      panel={
        <Glass className="px-4 py-4">
          <h2 className="text-[12.5px] text-white/55">红墨水散开了多少</h2>
          {[['冷水', dCold, INK.cold], ['热水', dHot, INK.hot]].map(([name, d, temp]) => <div key={name as string} className="mt-2">
            <div className="flex justify-between text-[13.5px]"><span>{name} · {temp} ℃</span><span className="tabular-nums text-white/70">{Math.round((d as number) * 100)}%</span></div>
            <div className="mt-1 h-2 rounded-full bg-white/10"><div className="h-2 rounded-full bg-[#e5484d] transition-[width]" style={{ width: `${(d as number) * 100}%` }} /></div>
          </div>)}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="t" value={dropped ? `${Math.floor(td)} s` : '—'} unit="滴进去以后" />
            <ParamTile symbol="上瓶" value={pulled ? `${Math.round(mix * 100)}%` : '—'} unit="二氧化氮跑上去的比例" />
          </div>
          <H2>分子的运动</H2>
          <MolView speed={molSpeed(look === 'hot' ? INK.hot : INK.cold)} ink={dropped ? 1 : 0} label={look === 'hot' ? `热水 ${INK.hot} ℃` : `冷水 ${INK.cold} ℃`} />
          <p className="mt-2 text-[13px] text-white/60">平均速度是 20 ℃ 时的 {molSpeed(look === 'hot' ? INK.hot : INK.cold).toFixed(2)} 倍</p>
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'drop'} onClick={() => setDropped(true)} disabled={dropped}>滴入红墨水</LabButton>
        <LabButton pulse={next === 'pull'} onClick={() => setPulled(true)} disabled={pulled || !T.done.ink}>抽掉玻璃片</LabButton>
      </>}
      extras={
        <Control label="放大看">
          <Segmented label="放大看" pulse={next === 'look'} want={next === 'look' ? 'hot' : null} value={look} onChange={k => setLook(k as Look)} options={[{ value: 'cold', label: '冷水' }, { value: 'hot', label: '热水' }]} />
        </Control>
      }
    />
  )
}
