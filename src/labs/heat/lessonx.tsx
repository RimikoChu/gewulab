// 内能和热机 · 拓展课 总装线：线头一台剖开的直列四缸机。启动它，看四个缸按 1-3-4-2 的顺序轮流做功；
// 换成柴油机，看吸气冲程吸进的是空气，压缩冲程末喷油、靠高温自己着火。
import { useEffect, useRef, useState } from 'react'
import { RoundedBox } from '@react-three/drei'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { Metal, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { CYL_X, Cut4 } from './cut4'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { Done, H2 } from './parts'
import { EFF, ORDER, working } from './physics'
import { FiringView } from './views'
import { VOICE } from './voice'
import { LINE_Z, PLINTH, Room, ST } from './world'

const TASKS: Task[] = [
  { id: 'order', text: '启动四缸汽油机，看四个缸怎样轮流做功', note: `按 ${ORDER.join('-')} 的顺序：曲轴每转半圈，就有一个缸在做功` },
  { id: 'air', text: '换成柴油机，看吸气冲程吸进的是什么', note: '柴油机吸进的只是空气，没有燃料' },
  { id: 'fire', text: '看柴油机怎样着火', note: '压缩冲程末喷油，压缩后的高温空气让柴油自己着火：压燃' },
]
type Kind = 'petrol' | 'diesel'
const X = ST.sx, Z = LINE_Z + 4, Y0 = PLINTH + 1.62
const DEG = 150

export default function LessonX() {
  const [kind, setKind] = useState<Kind>('petrol')
  const [run, setRun] = useState(false)
  const [angle, setAngle] = useState(0)
  const [from, setFrom] = useState(0)
  const cur = useRef(0), live = useRef(run); live.current = run
  const T = useTasks('gewu:heat:x', TASKS)
  useEffect(() => {
    let raf = 0, last = performance.now()
    const frame = (now: number) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; if (live.current) { cur.current += DEG * dt; setAngle(cur.current) } raf = requestAnimationFrame(frame) }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])
  const ran = run ? angle - from : 0
  useEffect(() => { T.check(id => id === 'order' ? kind === 'petrol' && ran >= 900 : id === 'air' ? kind === 'diesel' && ran >= 200 : kind === 'diesel' && !!T.done.air && ran >= 560) })
  // 看完吸气冲程先停一下，讲清楚了再接着看压缩冲程末的着火
  const airDone = !!T.done.air
  useEffect(() => { if (airDone && !T.done.fire) setRun(false) }, [airDone])   // eslint-disable-line react-hooks/exhaustive-deps
  const start = () => { setFrom(cur.current); setRun(true) }
  const choose = (k: Kind) => { setRun(false); setKind(k) }
  const resetAll = () => { setRun(false); setKind('petrol'); cur.current = 0; setAngle(0); T.reset() }
  const task = T.current
  const now = working(angle + 1e-3)
  const { hint, next }: { hint: string; next: 'start' | 'kind' | null } = (() => {
    if (!task) return { hint: '汽油机靠火花塞点火，柴油机靠压缩后的高温着火。', next: null }
    if (task.id === 'order') return !run ? { hint: '这是一台剖开的四缸汽油机。按“启动”', next: 'start' } : { hint: `做功的是 ${now} 缸…看下一个是哪一缸`, next: null }
    if (kind !== 'diesel') return { hint: '换成柴油机', next: 'kind' }
    if (!run) return task.id === 'air' ? { hint: '柴油机没有火花塞，缸盖上是喷油器。按“启动”', next: 'start' } : { hint: '柴油机吸进的只是空气。再按“启动”，看它怎样着火', next: 'start' }
    return task.id === 'air' ? { hint: '看吸气冲程：吸进缸里的是什么…', next: null } : { hint: '看压缩冲程快结束的时候…', next: null }
  })()
  const at = (x: number, y: number, z = 0.2): [number, number, number] => [X + x, Y0 + y, Z + z]
  const labels: Label[] = [
    ...CYL_X.map((x, i) => ({ id: `c${i}`, at: at(x, 4.25, 0), ax: 0.5, className: `scene-tag ${now === i + 1 && run ? 'key' : ''} -translate-y-full`, children: <><small>{i + 1} 缸</small>{now === i + 1 && run ? '做功' : ' '}</> })),
    { id: 'n1', at: at(-2.5, 0.2), ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '曲轴' },
    { id: 'n2', at: at(2.5, 2.9), name: true, className: 'scene-name -translate-y-1/2', children: kind === 'diesel' ? '喷油器' : '火花塞' },
    { id: 'n3', at: at(2.75, -1.2, -0.3), name: true, className: 'scene-name -translate-y-1/2', children: '飞轮' },
  ]
  return (
    <LabShell title="内能和热机" lessons={LESSONS} current="x" narration={voiced(NARRATION['x'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="发动机"
      stage={<Room at="sx" labels={labels} bloom={0.45}>
        {/* 线头的展示架：一张钢台，上面两个托架 */}
        <RoundedBox args={[7.2, PLINTH, 3.0]} radius={0.06} smoothness={2} position={[X, PLINTH / 2, Z - 0.4]} castShadow receiveShadow><meshPhysicalMaterial color="#2d3237" roughness={0.5} clearcoat={0.4} /></RoundedBox>
        <RoundedBox args={[7.4, 0.12, 3.2]} radius={0.03} smoothness={2} position={[X, PLINTH + 0.06, Z - 0.4]} castShadow receiveShadow><Metal kind="stainless" grain="brushed" /></RoundedBox>
        <Cut4 at={[X, Y0, Z]} angle={angle} diesel={kind === 'diesel'} />
      </Room>}
      lesson={<LessonBlock no="拓展" title="总装线" concept="多缸机轮流做功；柴油机靠压缩着火" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>单缸机一个工作循环只做功一次，转得不平稳。四缸机的四个缸轮流做功，曲轴每转半圈就有一个缸在做功。直列四缸机常见的点火顺序是 {ORDER.join('-')}。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>汽油机：吸进汽油和空气的混合物，火花塞点火</li>
            <li>柴油机：吸进空气，压缩冲程末由喷油器喷出雾状柴油，靠压缩后的高温着火（压燃）</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">在燃料燃烧、发动机做功的过程中，能量只是从一种形式转化为另一种形式、从一个物体转移到另一个物体，总量保持不变，这就是能量守恒定律。</p>
        </>} />}
      finale={T.finale && <Done head="拓展课做完了" title="多缸机轮流做功；柴油机靠压缩着火" onClose={() => T.setFinale(false)}>四个缸按 {ORDER.join('-')} 的顺序做功，发动机转得更平稳。柴油机吸进的是空气，压缩冲程末喷油，靠高温自己着火；汽油机吸进混合物，靠火花塞点火。</Done>}
      panel={
        <Glass className="px-4 py-4">
          <h2 className="text-[12.5px] text-white/55">各缸现在在哪个冲程</h2>
          <FiringView a={angle} />
          <H2>汽油机和柴油机</H2>
          <table className="mt-2 w-full text-[13.5px]">
            <thead><tr className="text-white/55"><th className="py-1 text-left font-normal" /><th className="text-left font-normal">汽油机</th><th className="text-left font-normal">柴油机</th></tr></thead>
            <tbody className="[&_td]:py-1.5 [&_tr]:border-t [&_tr]:border-white/10">
              <tr><td className="text-white/60">吸进</td><td>混合物</td><td>空气</td></tr>
              <tr><td className="text-white/60">着火</td><td>火花塞点火</td><td>压燃</td></tr>
              <tr><td className="text-white/60">缸顶</td><td>火花塞</td><td>喷油器</td></tr>
              <tr><td className="text-white/60">效率</td><td>{EFF.petrol[0]}%–{EFF.petrol[1]}%</td><td>{EFF.diesel[0]}%–{EFF.diesel[1]}%</td></tr>
            </tbody>
          </table>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'start'} pulse={next === 'start'} onClick={() => run ? setRun(false) : start()}>{run ? '停下' : '启动'}</LabButton>
      </>}
      extras={
        <Control label="发动机">
          <Segmented label="发动机" pulse={next === 'kind'} want={next === 'kind' ? 'diesel' : null} value={kind} onChange={k => choose(k as Kind)} options={[{ value: 'petrol', label: '汽油机' }, { value: 'diesel', label: '柴油机' }]} />
        </Control>
      }
    />
  )
}
