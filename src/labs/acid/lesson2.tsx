// 酸、碱和中和 · 第 2 课 常见的酸：化验室最西头的通风橱里。左边一瓶浓盐酸、一瓶浓硫酸，中间一张白纸和一根玻璃棒，右边一只盛水的烧杯。
// 打开浓盐酸的瓶塞，瓶口冒白雾；用玻璃棒蘸浓硫酸在纸上写字，字迹慢慢变黑；把浓硫酸沿玻璃棒慢慢注入水中，烧杯外壁发烫。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useState } from 'react'
import { Glass as Panel, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { BEAKER, Beaker, GlassRod, Glove, LOOK, NarrowBottle, Stopper, u } from './gear'
import { Puffs, Stream } from './fx'
import { charTex, sheetTex } from './mats'
import { LESSONS, goLesson } from './lessons'
import { ease, liftPath, seg, useClock, useRun } from './parts'
import { BZ, ST, TOP, Place, type V3 } from './world'

const X0 = ST.l2, Y = TOP, Z = BZ + 2.0
const HCL: V3 = [X0 - u(0.21), Y, Z - u(0.06)]
const H2SO4: V3 = [X0 - u(0.09), Y, Z - u(0.08)]
const SHEET: V3 = [X0 + u(0.05), Y, Z + u(0.02)]
const ROD_HOME: V3 = [X0 - u(0.02), Y + u(0.004), Z + u(0.065)]
const BK: V3 = [X0 + u(0.19), Y, Z - u(0.02)]
const TASKS: Task[] = [
  { id: 'open', text: '打开浓盐酸的瓶塞，看瓶口', note: '瓶口出现白雾：浓盐酸有挥发性，挥发出的氯化氢和空气里的水蒸气结合成盐酸小液滴' },
  { id: 'char', text: '用玻璃棒蘸浓硫酸，在纸上写个字', note: '字迹慢慢变黑：浓硫酸有强烈的腐蚀性，能夺取纸张里的水分，生成黑色的炭' },
  { id: 'dilute', text: '稀释浓硫酸：把浓硫酸沿玻璃棒慢慢注入水中', note: '烧杯外壁发烫：浓硫酸溶于水放出大量的热。一定要酸入水，切不可把水倒进浓硫酸' },
]
const W0 = 0.045, W1 = 0.053          // 烧杯里水面的高度（m）：倒入浓硫酸前、后

export default function Lesson2() {
  const [open, setOpen] = useState(false)
  const [wrote, setWrote] = useState(false)
  const [mixed, setMixed] = useState(false)
  const T = useTasks('gewu:acid:2', TASKS)
  const charClock = useClock()
  const pull = useRun(2.4, () => { setOpen(true); T.check(id => id === 'open') })
  const write = useRun(4.6, () => { setWrote(true); charClock.start() })
  const pour = useRun(6.2, () => { setMixed(true); T.check(id => id === 'dilute') })
  const char = wrote ? Math.min(1, charClock.t / 4.5) : 0
  useEffect(() => { if (wrote && char >= 1) T.check(id => id === 'char') }, [wrote && char >= 1])   // eslint-disable-line react-hooks/exhaustive-deps
  const busy = pull.busy || write.busy || pour.busy
  const resetAll = () => { pull.snap(0); write.snap(0); pour.snap(0); charClock.stop(); setOpen(false); setWrote(false); setMixed(false); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'open' | 'write' | 'pour' | null } = !task ? { hint: '浓盐酸易挥发；浓硫酸有强腐蚀性，稀释时要酸入水、慢慢倒、不断搅拌。', next: null }
    : pull.busy ? { hint: '拔下瓶塞，倒放在台面上…', next: null }
    : write.busy ? { hint: '用玻璃棒蘸一点浓硫酸，在纸上写字…', next: null }
    : pour.busy ? { hint: '把浓硫酸沿玻璃棒慢慢注入水中，边倒边搅拌…', next: null }
    : task.id === 'open' ? { hint: '在通风橱里打开浓盐酸的瓶塞，看瓶口', next: 'open' }
    : task.id === 'char' ? (wrote ? { hint: '看纸上的字迹…', next: null } : { hint: '用玻璃棒蘸浓硫酸，在纸上写个字', next: 'write' })
    : { hint: '稀释浓硫酸：把浓硫酸沿玻璃棒慢慢注入水中', next: 'pour' }

  // 拔瓶塞：手捏住塞子往上提，移到瓶子旁边倒放
  const pk = pull.busy ? ease(seg(pull.t, 0.2, 1.8)) : open ? 1 : 0
  const plugAt: V3 = liftPath([HCL[0], HCL[1] + u(0.118), HCL[2]], [HCL[0] + u(0.06), Y + u(0.016), HCL[2] + u(0.07)], HCL[1] + u(0.19), pk)
  // 写字：玻璃棒从台上拿起，伸进浓硫酸瓶口蘸一下，再到纸上画几笔
  const wt = write.t
  const rodWrite = (): V3 => {
    const top = Y + u(0.2), mouth: V3 = [H2SO4[0], Y + u(0.07), H2SO4[2]], paper: V3 = [SHEET[0] - u(0.02), Y + u(0.002), SHEET[2]]
    if (wt < 1.2) return liftPath(ROD_HOME, mouth, top, seg(wt, 0, 1.2))
    if (wt < 2.2) return liftPath(mouth, paper, top, seg(wt, 1.2, 2.2))
    if (wt < 3.8) { const q = seg(wt, 2.2, 3.8) * Math.PI * 4; return [paper[0] + u(0.02) * Math.sin(q * 0.5) + u(0.012) * (q / 12.6), paper[1], paper[2] + u(0.012) * Math.cos(q)] }
    return liftPath([paper[0] + u(0.03), paper[1], paper[2]], ROD_HOME, top, seg(wt, 3.8, 4.6))
  }
  // 稀释：右手拿起浓硫酸瓶移到烧杯边上倾斜，左手把玻璃棒斜靠在杯口，酸液顺着玻璃棒流下去
  const ptk = pour.t
  const bottleK = pour.busy ? ease(seg(ptk, 0, 1.2)) - ease(seg(ptk, 4.4, 5.4)) : 0
  const tilt = pour.busy ? ease(seg(ptk, 1.1, 1.8)) - ease(seg(ptk, 3.9, 4.5)) : 0
  const bottleAt: V3 = bottleK > 0 ? liftPath(H2SO4, [BK[0] - u(0.07), Y + u(0.11), BK[2]], Y + u(0.13), bottleK) : H2SO4
  const flowing = pour.busy && ptk > 1.8 && ptk < 4.0
  const level = mixed ? W1 : pour.busy ? W0 + (W1 - W0) * seg(ptk, 1.8, 4.0) : W0
  const touched = mixed || (pour.busy && ptk > 5.2)
  const rodAt: V3 = write.busy ? rodWrite() : pour.busy ? [BK[0] - u(0.01), Y + u(0.004), BK[2]] : ROD_HOME
  const rodRot: [number, number, number] = write.busy ? [0, 0, -0.25] : pour.busy ? [0, 0, 0.3 + Math.sin(ptk * 5) * 0.08 * (flowing ? 1 : 0)] : [0, 0.3, Math.PI / 2]
  const sheet = sheetTex(), letters = char > 0 || write.busy ? charTex(write.busy ? seg(wt, 2.2, 3.8) * 0.05 : char) : null

  const labels: Label[] = [
    { id: 'n1', at: [HCL[0], Y - u(0.004), HCL[2] + u(0.05)], ax: 0.5, name: true, className: 'scene-name', children: '浓盐酸' },
    { id: 'n2', at: [H2SO4[0], Y - u(0.004), H2SO4[2] + u(0.05)], ax: 0.5, name: true, className: 'scene-name', children: '浓硫酸' },
    { id: 'n3', at: [BK[0], Y - u(0.004), BK[2] + u(0.05)], ax: 0.5, name: true, className: 'scene-name', children: '水' },
    ...(open ? [{ id: 'fog', at: [HCL[0] + u(0.04), Y + u(0.2), HCL[2]] as V3, ax: 0, className: 'scene-tag key -translate-y-1/2', children: <><small>瓶口</small>白雾</> }] : []),
    ...(char > 0.4 ? [{ id: 'ch', at: [SHEET[0] + u(0.07), Y + u(0.01), SHEET[2]] as V3, ax: 0, className: 'scene-tag key -translate-y-1/2', children: <><small>字迹</small>变黑</> }] : []),
    ...(touched ? [{ id: 'hot', at: [BK[0] + u(0.05), Y + u(0.06), BK[2]] as V3, ax: 0, className: 'scene-tag key -translate-y-1/2', children: <><small>外壁</small>发烫</> }] : []),
  ]
  return (
    <LabShell title="酸、碱和中和" lessons={LESSONS} current="2" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['2'], VOICE)} actionsLabel="在通风橱里操作"
      stage={<Place at="l2" labels={labels}>
        {/* 浓盐酸：瓶塞拔下以后，瓶口不断冒出白雾 */}
        <group position={HCL}><NarrowBottle label="浓盐酸" sub="HCl" band="#c23a2a" plug={!open && !pull.busy} /></group>
        {(open || pull.busy) && <group position={plugAt} rotation-x={open ? Math.PI : 0}><Stopper alone />{pull.busy && <group position={[0, u(0.03), 0]} rotation={[0.3, 0, 0.2]}><Glove s={u(0.0055)} /></group>}</group>}
        <Puffs at={[HCL[0], Y + u(0.125), HCL[2]]} on={open} opt={{ rate: 9, life: 2.6, size: [u(0.012), u(0.07)], speed: u(0.03), dir: [0.2, 1, 0.1], spread: 0.35, color: '#f3f6f6', opacity: 0.4, accel: [u(0.004), u(0.006), 0], drag: 0.6, jitter: u(0.005) }} seed={3} />
        {/* 浓硫酸：无色、黏稠的油状液体 */}
        <group position={bottleAt} rotation-z={tilt * 1.45}>
          <NarrowBottle label="浓硫酸" sub="H₂SO₄" band="#b8860b" look={{ color: '#e8ecdf', opacity: 0.38, vivid: false }} plug={!pour.busy} />
          {pour.busy && <group position={[-u(0.03), u(0.06), 0]} rotation={[0.2, 0, 0.3]}><Glove s={u(0.0064)} /></group>}
        </group>
        <Stream top={[BK[0] - u(0.008), Y + u(0.105), BK[2]]} bottom={[BK[0] - u(0.004), Y + u(level + 0.003), BK[2]]} r={u(0.0016)} on={flowing} color="#eef0e6" opacity={0.65} />
        {/* 白纸和纸上的字 */}
        <group position={SHEET}>
          <mesh position-y={u(0.0008)} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[u(0.15), u(0.1)]} /><meshStandardMaterial map={sheet} roughness={0.9} /></mesh>
          {letters && <mesh position-y={u(0.0012)} rotation-x={-Math.PI / 2}><planeGeometry args={[u(0.07), u(0.07)]} /><meshStandardMaterial map={letters} transparent roughness={0.9} depthWrite={false} /></mesh>}
        </group>
        <group position={rodAt} rotation={rodRot}>
          <GlassRod len={0.2} wet={write.busy && wt > 1.1 && wt < 3.8 ? { color: '#e9ecdf', opacity: 0.6, vivid: false } : undefined} />
          {write.busy && <group position={[0, u(0.12), 0]} rotation={[0.3, 0, 0.1]}><Glove s={u(0.0055)} /></group>}
        </group>
        {/* 烧杯：倒完以后手背贴一下外壁 */}
        <group position={BK}><Beaker vol={250} level={level} look={LOOK.clear} /></group>
        <Puffs at={[BK[0], Y + u(BEAKER[250].h * 0.7), BK[2]]} on={pour.busy && ptk > 2.5 || mixed} opt={{ rate: 3, life: 2.2, size: [u(0.02), u(0.06)], speed: u(0.02), dir: [0, 1, 0], spread: 0.25, color: '#f6f6f2', opacity: 0.12, accel: [0, u(0.01), 0], drag: 0.4, jitter: u(0.01) }} seed={5} />
        {pour.busy && ptk > 5.0 && <group position={[BK[0] + u(0.05), Y + u(0.05), BK[2] + u(0.01)]} rotation={[0.1, -0.4, 1.3]}><Glove s={u(0.006)} /></group>}
      </Place>}
      lesson={<LessonBlock no="2" title="常见的酸" concept="浓盐酸易挥发，浓硫酸有强腐蚀性" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>盐酸是氯化氢的水溶液，浓盐酸有挥发性，打开瓶塞，瓶口出现白雾。硫酸的浓溶液是无色、黏稠的油状液体，有吸水性，可以做干燥剂。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li><b className="text-white">腐蚀性</b>：浓硫酸能夺取纸张、木材、皮肤里的水分，生成黑色的炭</li>
            <li><b className="text-white">稀释</b>：把浓硫酸沿器壁慢慢注入水里，并用玻璃棒不断搅拌。切不可把水倒进浓硫酸里：水的密度比浓硫酸小，浮在上面，放出的热使水沸腾，硫酸液滴向四周飞溅</li>
            <li><b className="text-white">万一沾到皮肤</b>：立即用大量水冲洗，再涂 3%～5% 的碳酸氢钠溶液</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">浓盐酸、浓硫酸都要在通风橱里取用，戴好手套和护目镜。</p>
        </>} />}
      finale={T.finale && (
        <Panel className="w-[min(92vw,460px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两种浓酸都看过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">浓盐酸易挥发，浓硫酸有强腐蚀性</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">稀释浓硫酸要酸入水：沿器壁慢慢注入水中，并不断搅拌。</p>
        </Panel>
      )}
      panel={
        <Panel className="px-4 py-4">
          <h2 className="text-[12.5px] text-white/55">两种浓酸</h2>
          <table className="mt-2 w-full text-center text-[13.5px]">
            <thead><tr className="text-white/55"><th className="pb-1 text-left font-medium"></th><th className="pb-1 font-medium">浓盐酸</th><th className="pb-1 font-medium">浓硫酸</th></tr></thead>
            <tbody>
              <tr className="bg-white/[0.04]"><td className="rounded-l-lg px-2 py-1.5 text-left text-white/60">颜色状态</td><td>无色液体</td><td className="rounded-r-lg">无色黏稠油状</td></tr>
              <tr><td className="px-2 py-1.5 text-left text-white/60">气味</td><td>刺激性气味</td><td>无</td></tr>
              <tr className="bg-white/[0.04]"><td className="rounded-l-lg px-2 py-1.5 text-left text-white/60">打开瓶塞</td><td>{open ? '瓶口有白雾' : '—'}</td><td className="rounded-r-lg">无明显现象</td></tr>
              <tr><td className="px-2 py-1.5 text-left text-white/60">在纸上写字</td><td>—</td><td>{char > 0.4 ? '字迹变黑' : '—'}</td></tr>
              <tr className="bg-white/[0.04]"><td className="rounded-l-lg px-2 py-1.5 text-left text-white/60">注入水中</td><td>—</td><td className="rounded-r-lg">{touched ? '放出大量热' : '—'}</td></tr>
            </tbody>
          </table>
          <p className="mt-3 rounded-xl bg-white/8 px-3 py-2.5 text-[13.5px] leading-relaxed text-white/80">稀释浓硫酸：<b className="text-white">酸入水</b>，沿器壁慢慢倒，不断搅拌。</p>
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'open'} pulse={next === 'open'} onClick={() => pull.run()} disabled={busy || open}>打开瓶塞</LabButton>
        <LabButton primary={next === 'write'} pulse={next === 'write'} onClick={() => write.run()} disabled={busy || !open || wrote}>在纸上写字</LabButton>
        <LabButton primary={next === 'pour'} pulse={next === 'pour'} onClick={() => pour.run()} disabled={busy || !T.done.char || mixed}>稀释浓硫酸</LabButton>
      </>}
      extras={null}
    />
  )
}
