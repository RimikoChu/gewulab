// 力和运动 · 第 2 课 弹力和弹簧测力计：测力计平放在拉力架上，一头套在固定销上，一头用细线连着滑块。先调零，再把拉力一牛一牛加上去，
// 看弹簧的伸长和拉力的关系；松手后弹簧恢复原状；拉到量程就不能再加。指针的位置、伸长的厘米数都从计算核心取。
import { useEffect, useState } from 'react'
import { RoundedBox } from '@react-three/drei'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { Metal, useTasks, type Label } from '@/lab-kit'
import { Place, SpringScale, Wood, scaleSpan, useSettled, type V3 } from './gear'
import { LESSONS, goLesson } from './lessons'
import { PULLS, SCALE, SPRING_K, ZERO_ERR, overRange, scaleReads, stretchCm } from './physics'
import { Plot, ScaleView } from './views'
import { BENCH_Z, ST, TOP, U } from './world'

const LAST = PULLS[PULLS.length - 1]
const TASKS: Task[] = [
  { id: 'zero', text: '没受力时指针不在 0：先调零', note: '使用前先看量程和分度值，再让指针对准零刻度线' },
  { id: 'one', text: '把拉力加到 1 N，看弹簧伸长多少', note: `伸长 ${stretchCm(1).toFixed(1)} cm` },
  { id: 'all', text: `继续加到 ${LAST} N，看图上的点`, note: `${PULLS.map(F => stretchCm(F)).join('、')} cm：在弹性限度内，弹簧的伸长与拉力成正比` },
  { id: 'free', text: '松手，看指针回到哪里', note: '指针回到 0：撤去拉力后能恢复原状的形变叫弹性形变，弹簧因此产生的力叫弹力' },
]
const X = ST.l2, PIN = -27, AXIS = 4.6            // 固定销的位置、测力计轴线离台面多高（厘米）
const P = (x: number, y: number, z = 0): V3 => [X + x * U, TOP + y * U, BENCH_Z + z * U]
/** 测力计外壳顶（提环那一头）的位置，和不受力时挂钩的位置（厘米） */
const HEAD = PIN + 1.9, HOOK0 = HEAD + (scaleSpan(0) - 2.25 * U) / U

export default function Lesson2() {
  const [zero, setZero] = useState(ZERO_ERR)
  const [F, setF] = useState(0)
  const [rows, setRows] = useState<number[]>([])
  const [warn, setWarn] = useState<string | null>(null)
  const [freed, setFreed] = useState(false)
  const T = useTasks('gewu:force:2', TASKS)
  const settled = useSettled(`${F}:${zero}`, 1000)
  useEffect(() => {
    if (!settled) return
    if (F > 0 && !zero) { const next = rows.includes(F) ? rows : [...rows, F]; if (next !== rows) setRows(next); T.check(id => id === 'one' ? next.includes(1) : id === 'all' && PULLS.every(f => next.includes(f))) }
    if (F === 0 && !zero) T.check(id => id === 'zero' || (id === 'free' && freed))
  }, [settled, F, zero, freed])   // eslint-disable-line react-hooks/exhaustive-deps
  const doZero = () => { if (F > 0) { setWarn('先松手，不受力的时候才能调零'); return } setWarn(null); setZero(0) }
  const more = () => {
    if (zero) { setWarn('指针还没对准 0，先调零'); return }
    if (overRange(F + 1)) { setWarn(`已经拉到量程 ${SCALE.max} N 了：再加就超过弹性限度，弹簧会被拉坏`); return }
    setWarn(null); setFreed(false); setF(F + 1)
  }
  const free = () => { if (F === 0) return; setWarn(null); setFreed(true); setF(0) }
  const resetAll = () => { setZero(ZERO_ERR); setF(0); setRows([]); setWarn(null); setFreed(false); T.reset() }
  const task = T.current, shown = scaleReads(F, zero)
  const { hint, next }: { hint: string; next: 'zero' | 'more' | 'free' | null } = !task ? { hint: '在弹性限度内，弹簧受到的拉力越大，伸长就越长：测力计就是这样做出来的。', next: null }
    : !settled ? { hint: '指针还在晃，等它停稳…', next: null }
    : task.id === 'zero' ? { hint: `没有拉它，指针却指在 ${ZERO_ERR} N：按“调零”`, next: 'zero' }
    : task.id === 'free' ? { hint: '按“松手”，撤去拉力', next: 'free' }
    : { hint: `按“加 1 N 拉力”：现在是 ${F} N`, next: 'more' }
  const labels: Label[] = [
    { id: 'F', at: P(HEAD + 11, AXIS + 5.2), ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>示数</small>{shown.toFixed(1)} N</> },
    { id: 'dx', at: P(HOOK0 + 6 + F * SCALE.cmPerN, AXIS + 3.4), ax: 0.5, className: 'scene-tag -translate-y-full transition-opacity', style: { opacity: F > 0 && settled ? 1 : 0 }, children: <><small>伸长</small>{stretchCm(F).toFixed(1)} cm</> },
    { id: 'n1', at: P(HEAD + 11, -1.2, 6), ax: 0.5, name: true, className: 'scene-name', children: `弹簧测力计 · 量程 ${SCALE.max} N` },
    { id: 'n2', at: P(PIN, AXIS + 5), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '固定销' },
    { id: 'n3', at: P(HOOK0 + 6, -1.2, 6), ax: 0.5, name: true, className: 'scene-name', children: '拉力滑块' },
  ]
  return (
    <LabShell title="力和运动" lessons={LESSONS} current="2" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={warn ?? hint} actionsLabel="测力计"
      stage={<Place at="l2" labels={labels}>
        <group position={[X, TOP, BENCH_Z]}>
          {/* 拉力架：一块底板，左边一根立柱带固定销，中间一条托着测力计的垫条，右边一根带刻度的导轨 */}
          <RoundedBox args={[70 * U, 1.6 * U, 13 * U]} radius={0.014} smoothness={2} position={[0, 0.8 * U, 0]} castShadow receiveShadow><Wood kind="dark" rep={[2, 1]} /></RoundedBox>
          <RoundedBox args={[3 * U, 7.4 * U, 3 * U]} radius={0.012} smoothness={2} position={[PIN * U, 5.3 * U, -3 * U]} castShadow><Metal kind="aluminum" grain="brushed" /></RoundedBox>
          <mesh position={[PIN * U, AXIS * U, -0.4 * U]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.32 * U, 0.32 * U, 4.6 * U, 14]} /><Metal kind="steel" rough={0.25} /></mesh>
          <mesh position={[PIN * U, AXIS * U, 2 * U]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.6 * U, 0.6 * U, 0.4 * U, 14]} /><Metal kind="steel" grain="turned" /></mesh>
          <RoundedBox args={[20 * U, 0.6 * U, 3.2 * U]} radius={0.006} smoothness={2} position={[(HEAD + 11) * U, 1.9 * U, 0]} receiveShadow><meshStandardMaterial color="#2a2f33" roughness={0.9} /></RoundedBox>
          <mesh position={[(HOOK0 + 15) * U, 2 * U, 0]} castShadow receiveShadow><boxGeometry args={[30 * U, 0.8 * U, 2.2 * U]} /><Metal kind="aluminum" grain="brushed" rough={0.4} repeat={[4, 1]} /></mesh>
          {[-1, 1].map(k => <mesh key={k} position={[(HOOK0 + 15 + k * 15.4) * U, 2.3 * U, 0]}><boxGeometry args={[0.8 * U, 1.4 * U, 3 * U]} /><Metal kind="steel" grain="brushed" /></mesh>)}
          {/* 不受力时滑块所在的位置：导轨旁边一个红色的记号 */}
          <mesh position={[(HOOK0 + 6) * U, 1.62 * U, 2.6 * U]} rotation-x={-Math.PI / 2}><planeGeometry args={[0.3 * U, 2 * U]} /><meshBasicMaterial color="#d2362f" /></mesh>
          {/* 测力计：横过来，挂钩朝右 */}
          <group position={[HEAD * U, AXIS * U, 0]} rotation-z={Math.PI / 2}>
            <SpringScale force={F} zero={zero}>
              <group rotation-z={-Math.PI / 2}>
                <mesh position={[3 * U, 0, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.007, 0.007, 6 * U, 6]} /><meshStandardMaterial color="#e9e4d4" roughness={0.9} /></mesh>
                <group position={[6 * U, 0, 0]}>
                  <mesh position={[0, -0.4 * U, 0]}><cylinderGeometry args={[0.25 * U, 0.25 * U, 2 * U, 10]} /><Metal kind="steel" rough={0.25} /></mesh>
                  <RoundedBox args={[3.6 * U, 1.7 * U, 4.4 * U]} radius={0.012} smoothness={2} position={[0, -1.35 * U, 0]} castShadow><meshPhysicalMaterial color="#c5472e" roughness={0.4} clearcoat={0.5} /></RoundedBox>
                  <mesh position={[0, 0.9 * U, 0]} castShadow><cylinderGeometry args={[0.9 * U, 0.9 * U, 0.9 * U, 18]} /><Metal kind="aluminum" grain="turned" /></mesh>
                </group>
              </group>
            </SpringScale>
          </group>
        </group>
      </Place>}
      lesson={<LessonBlock no="2" title="弹力和测力计" concept="弹性限度内，伸长与拉力成正比" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>物体受力发生形变，撤去力后能恢复原状，这种性质叫<b className="text-white">弹性</b>；物体由于发生弹性形变而产生的力叫<b className="text-white">弹力</b>。</p>
          <p className="mt-3">弹簧的弹性有一定的限度，超过了就不能完全复原。在弹性限度内，弹簧受到的拉力越大，伸长量就越长：弹簧测力计就是根据这个道理制成的。</p>
          <p className="mt-3">使用测力计：先看清<b className="text-white">量程</b>和<b className="text-white">分度值</b>，所测的力不能超过量程；使用前看指针是否指在零刻度线上；读数时视线正对刻度。</p>
          <p className="mt-3 text-[13.5px] text-white/65">这只测力计量程 {SCALE.max} N、分度值 {SCALE.step} N，每受 1 N 的拉力弹簧伸长 {SCALE.cmPerN} cm，也就是每伸长 1 m 要 {SPRING_K.toFixed(1)} N 的力。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">调零、加力、松手都做过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">在弹性限度内，弹簧的伸长与拉力成正比</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">拉力 1、2、3、4 N，伸长 {PULLS.map(f => stretchCm(f)).join('、')} cm。刻度因此是均匀的；用之前要调零，所测的力不能超过量程。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再拉一拉</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">测力计的示数</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{shown.toFixed(1)}<span className="ml-1 text-[15px] font-medium text-white/55">N</span></div>
          </div>
          <ScaleView F={shown} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="F" value={`${F} N`} unit="拉力" />
            <ParamTile symbol="Δx" value={`${stretchCm(F).toFixed(1)} cm`} unit="弹簧的伸长" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">伸长随拉力变化的图线</h2>
          <Plot label="弹簧的伸长随拉力变化的图线" pts={rows.map(f => ({ x: f, y: stretchCm(f) }))} xm={SCALE.max} ym={stretchCm(SCALE.max)} xt={[1, 2, 3, 4, 5]} yt={[3, 6, 9, 12, 15]} xl="F / N" yl="Δx / cm" />
          {rows.length > 0 && <table className="mt-2 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">拉力 F / N</th><th className="text-right font-normal">伸长 Δx / cm</th></tr></thead>
            <tbody>{[...rows].sort((a, b) => a - b).map(f => <tr key={f} className="row-in border-t border-white/12"><td className="py-1.5 tabular-nums">{f}</td><td className="text-right font-semibold text-[#7fe3d4] tabular-nums">{stretchCm(f).toFixed(1)}</td></tr>)}</tbody>
          </table>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'zero'} onClick={doZero} disabled={!zero}>调零</LabButton>
        <LabButton primary pulse={next === 'more'} onClick={more} disabled={!settled}>加 1 N 拉力</LabButton>
        <LabButton pulse={next === 'free'} onClick={free} disabled={!settled || F === 0}>松手</LabButton>
      </>}
      extras={<Control label="规格"><p className="flex h-11 items-center rounded-xl bg-white/8 px-3 text-[13.5px] text-white/75">量程 0–{SCALE.max} N · 分度值 {SCALE.step} N</p></Control>}
    />
  )
}
