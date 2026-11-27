// 种群和生态系统 · 第 2 课 标记重捕法：岛西林缘的空地上有 200 只兔，一个网围栏。
// 第一次捕 40 只，戴上橙色耳标放回；过几天重捕 50 只，数出带标记的 10 只，算出 N = M × n ÷ m。再假设有 2 只的耳标掉了，看估计值怎样变。
import { useEffect, useMemo, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { RabbitHerd } from './animals'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { rng } from './parts'
import { MARK, lincoln, lincolnLost } from './physics'
import { Big, Finale, H, Row } from './ui'
import { VOICE } from './voice'
import { PEN, PEN_GATE, Room, WARREN, ground } from './world'

const N = MARK.real, EST = lincoln(MARK.M, MARK.n, MARK.m), EST_LOST = lincolnLost()
const TASKS: Task[] = [
  { id: 'first', text: `第一次捕捉 ${MARK.M} 只，做上标记后放回`, note: `M = ${MARK.M}：这 ${MARK.M} 只带着耳标回到了兔群里` },
  { id: 'second', text: `过几天重捕 ${MARK.n} 只，数出带标记的`, note: `重捕 n = ${MARK.n} 只，其中带标记的 m = ${MARK.m} 只` },
  { id: 'calc', text: '算出兔的数量', note: `N = ${MARK.M} × ${MARK.n} ÷ ${MARK.m} = ${EST} 只` },
  { id: 'lost', text: `假设有 ${MARK.lost} 只的标记脱落了，再算一次`, note: `m 少数了 ${MARK.lost} 只，估成 ${EST_LOST} 只：偏大` },
]
type Loss = 'kept' | 'lost'
/** 围栏里的落脚点：每只被捕的兔一个 */
const SLOTS = (() => { const r = rng(55), out: [number, number][] = []; for (let t = 0; out.length < MARK.n && t < 5000; t++) { const a = r() * 6.28, d = Math.sqrt(r()) * (PEN.R - 0.55), p: [number, number] = [PEN.x + Math.cos(a) * d, PEN.z + Math.sin(a) * d]; if (out.every(q => Math.hypot(q[0] - p[0], q[1] - p[1]) > 0.5)) out.push(p) } return out })()
/** 第一次捕到的是 0–39 号；重捕的是 0–9 号（带标记）和 40–79 号 */
const inFirst = (i: number) => i < MARK.M, inSecond = (i: number) => i < MARK.m || (i >= MARK.M && i < MARK.M + MARK.n - MARK.m)
// 0 还没捕；1 第一次捕捉中；2 都在围栏里、戴上耳标；3 放回、混匀；4 重捕中；5 重捕的都在围栏里
type Phase = 0 | 1 | 2 | 3 | 4 | 5

export default function Lesson2() {
  const [phase, setPhase] = useState<Phase>(0), [mixed, setMixed] = useState(false), [loss, setLoss] = useState<Loss>('kept')
  const [calc, setCalc] = useState<Record<Loss, boolean>>({ kept: false, lost: false })
  const T = useTasks('gewu:population:2', TASKS)
  const goals = useMemo(() => Array.from({ length: N }, (_, i) => { if ((phase === 1 || phase === 2) && inFirst(i)) return SLOTS[i]; if ((phase === 4 || phase === 5) && inSecond(i)) return SLOTS[i < MARK.m ? i : i - MARK.M + MARK.m]; return null }), [phase])
  const tags = useMemo(() => Array.from({ length: N }, (_, i) => phase >= 2 && inFirst(i) && !(loss === 'lost' && i < MARK.lost)), [phase, loss])
  const onArrive = (n: number) => { if (phase === 1 && n >= MARK.M) setPhase(2); if (phase === 4 && n >= MARK.n) { setPhase(5); T.check(id => id === 'second') } }
  // 放回以后等一会儿：带标记的兔跳回各自的窝，和别的兔混在一起
  useEffect(() => { if (phase !== 3) return; setMixed(false); const t = setTimeout(() => { setMixed(true); T.check(id => id === 'first') }, 17000); return () => clearTimeout(t) }, [phase])   // eslint-disable-line react-hooks/exhaustive-deps
  const m = loss === 'lost' ? MARK.m - MARK.lost : MARK.m, est = lincoln(MARK.M, MARK.n, m)
  const catchIt = () => { if (phase === 0) setPhase(1); else if (phase === 3 && mixed) setPhase(4) }
  const release = () => { if (phase === 2) setPhase(3) }
  const compute = () => { if (phase !== 5 || calc[loss]) return; setCalc(c => ({ ...c, [loss]: true })); T.check(id => id === (loss === 'kept' ? 'calc' : 'lost')) }
  const resetAll = () => { setPhase(0); setMixed(false); setLoss('kept'); setCalc({ kept: false, lost: false }); T.reset() }

  const task = T.current
  const { hint, nx }: { hint: string; nx: 'catch' | 'release' | 'calc' | 'loss' | null } = (() => {
    if (!task) return { hint: '标记脱落会让 m 偏小，估计值偏大。标记物要牢固，又不能影响兔的活动。', nx: null }
    if (phase === 0) return { hint: `林缘的空地上有一群兔，跑来跑去数不清。按“捕捉”，第一次捕 ${MARK.M} 只`, nx: 'catch' }
    if (phase === 1) return { hint: '正在把兔赶进围栏…', nx: null }
    if (phase === 2) return { hint: `${MARK.M} 只都戴上了橙色耳标。按“放回”，让它们回到兔群里`, nx: 'release' }
    if (phase === 3 && !mixed) return { hint: '带标记的兔正在回到兔群里…', nx: null }
    if (phase === 3) return { hint: `过了几天，带标记的兔和别的兔混匀了。再按“捕捉”，重捕 ${MARK.n} 只`, nx: 'catch' }
    if (phase === 4) return { hint: '正在重捕…', nx: null }
    if (task.id === 'calc') return { hint: `重捕的 ${MARK.n} 只里，带耳标的有 ${MARK.m} 只。按“计算”`, nx: 'calc' }
    if (loss !== 'lost') return { hint: `把标记物换成“脱落 ${MARK.lost} 只”：假设重捕到的兔里有 ${MARK.lost} 只的耳标掉了`, nx: 'loss' }
    return { hint: `带耳标的只数得出 ${MARK.m - MARK.lost} 只了。再按“计算”`, nx: 'calc' }
  })()
  const zoom = phase === 2 || phase === 5
  const py = ground(PEN.x, PEN.z)
  const labels: Label[] = [
    { id: 'pen', at: [PEN.x, py + 2.5, PEN.z], ax: 0.5, className: 'scene-tag -translate-y-full transition-opacity', style: { opacity: zoom ? 1 : 0 }, children: phase === 2 ? <><small>第一次捕获并标记</small>M = {MARK.M} 只</> : <><small>重捕 n = {MARK.n} 只</small>带标记 m = {m} 只</> },
    { id: 'N', at: [PEN.x + 1.2, py + 3.6, PEN.z], ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: calc[loss] && phase === 5 ? 1 : 0 }, children: <><small>估计</small>N = {est} 只</> },
    { id: 'nPen', at: [PEN.x - 2.6, py + 1.5, PEN.z + 2], name: true, className: 'scene-name -translate-y-full', children: '捕捉围栏' },
    { id: 'nHerd', at: [WARREN.x + 3, ground(WARREN.x, WARREN.z) + 1.3, WARREN.z + 3], name: true, className: 'scene-name -translate-y-full', children: '兔群' },
  ]
  return (
    <LabShell title="种群和生态系统" lessons={LESSONS} current="2" narration={voiced(NARRATION['2'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="调查兔的数量"
      stage={<Room at="s2" labels={labels} span={zoom ? [10.5, 5.6] : undefined} shift={zoom ? [-4.4, 0.2, -4.2] : undefined} view={zoom ? [0.5, 0.5] : undefined}>
        <RabbitHerd n={N} max={N} area={WARREN} ground={ground} scale={1.35} seed={2} lo goals={goals} tags={tags} gate={PEN_GATE} onArrive={onArrive} />
      </Room>}
      lesson={<LessonBlock no="2" title="标记重捕法" concept="N = M × n ÷ m" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>许多动物活动能力强、活动范围大，不宜用样方法，常用<b className="text-white">标记重捕法</b>：在调查范围内捕获一部分个体，做上标记后放回原来的环境，经过一段时间后进行重捕，根据重捕到的动物中标记个体数占总个体数的比例，来估算种群密度。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>设种群数量为 N，第一次捕获并标记 M 只，重捕 n 只，其中带标记 m 只，则 <b className="text-white">N : M = n : m</b>，所以 N = M × n ÷ m。</li>
            <li>前提：标记个体和未标记个体被捕的机会相等；调查期间没有大量的迁入迁出、出生死亡；标记物不脱落，不影响动物的活动。</li>
            <li>标记物脱落、被标记的个体更难再捕到，都会让 m 偏小，估计值偏大。</li>
          </ul>
        </>} />}
      finale={T.finale && <Finale kicker="两种情况都算过了" title={`兔的数量约 ${EST} 只`} text={`N = M × n ÷ m = ${MARK.M} × ${MARK.n} ÷ ${MARK.m} = ${EST} 只。如果重捕到的兔里有 ${MARK.lost} 只的耳标掉了，m 数成 ${MARK.m - MARK.lost}，就会估成 ${EST_LOST} 只，偏大。`} notes="这片空地上画的兔正好是 200 只。真实调查里数不到全部，只能估计。" onClose={() => T.setFinale(false)} />}
      panel={
        <Glass className="px-4 py-4">
          <Big formula="N = M × n ÷ m" value={calc[loss] ? est : '—'} unit="只" />
          <H>关键参数</H>
          <div className="grid grid-cols-3 gap-2">
            <ParamTile symbol="M" value={phase >= 2 ? String(MARK.M) : '—'} unit="只 · 标记" />
            <ParamTile symbol="n" value={phase >= 5 ? String(MARK.n) : '—'} unit="只 · 重捕" />
            <ParamTile symbol="m" value={phase >= 5 ? String(m) : '—'} unit="只 · 带标记" />
          </div>
          <H>两种情况</H>
          <div className="flex flex-col gap-1.5">
            <Row name="标记物都还在" value={calc.kept ? `${EST} 只` : '—'} dim={!calc.kept} on={loss === 'kept' && calc.kept} />
            <Row name={`脱落 ${MARK.lost} 只`} value={calc.lost ? `${EST_LOST} 只（偏大）` : '—'} dim={!calc.lost} on={loss === 'lost' && calc.lost} />
          </div>
        </Glass>
      }
      actions={<>
        <LabButton pulse={nx === 'catch'} onClick={catchIt} disabled={!(phase === 0 || (phase === 3 && mixed))}>捕捉</LabButton>
        <LabButton pulse={nx === 'release'} onClick={release} disabled={phase !== 2}>放回</LabButton>
        <LabButton primary pulse={nx === 'calc'} onClick={compute} disabled={phase !== 5 || calc[loss]}>计算</LabButton>
      </>}
      extras={<Control label="标记物"><Segmented label="标记物" pulse={nx === 'loss'} want={nx === 'loss' ? 'lost' : null} value={loss} disabled={phase !== 5} onChange={v => setLoss(v)} options={[{ value: 'kept', label: '都还在' }, { value: 'lost', label: `脱落 ${MARK.lost} 只` }]} /></Control>}
    />
  )
}
