// 神经调节 · 第 3 课 反射和反射弧：一只手臂从展板里伸出来，手指碰到一杯热水；头顶悬着放大的一段脊髓。
// 先认一认反射弧的五个部分，再碰一下热水杯，看冲动走一圈、手缩回来、接着才觉得烫；然后剪断传入神经、传出神经，各碰一次。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useMemo, useRef, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { ARC_IN, ARC_MID, ARC_OUT, ARC_UP, ROOTS } from './cord'
import { tips } from './limb'
import { LESSONS, goLesson } from './lessons'
import { Place, ease, seg, useRun } from './parts'
import { ARC, ARC_ORDER, arcResult, type ArcKey, type Cut } from './physics'
import type { V3 } from './sdf'
import { Flash, Impulse, route, sOf } from './signal'
import { Big, Chain } from './ui'
import { CUP_AT, onArm3, onCord } from './world'

const TASKS: Task[] = [
  { id: 'arc', text: '认一认反射弧的五个部分', note: '感受器 → 传入神经 → 神经中枢 → 传出神经 → 效应器' },
  { id: 'touch', text: '手指碰一下热水杯', note: '手先缩回来，接着才觉得烫' },
  { id: 'in', text: '剪断传入神经，再碰一次', note: '冲动传不到脊髓：手不缩，也不觉得烫' },
  { id: 'out', text: '剪断传出神经，再碰一次', note: '手不缩，但还是觉得烫：冲动到了脊髓，又往上传到了大脑' },
]
const CUTS: { value: 'none' | 'afferent' | 'efferent'; label: string }[] = [{ value: 'none', label: '完好' }, { value: 'afferent', label: '剪断传入神经' }, { value: 'efferent', label: '剪断传出神经' }]
const WANT: Record<string, 'none' | 'afferent' | 'efferent'> = { touch: 'none', in: 'afferent', out: 'efferent' }

// ---------- 冲动走的路（手臂模型和脊髓模型都按它们在世界里的摆法换算） ----------
const TIP = tips('reach').index
const armIn: V3[] = [TIP, [14, 0.6, -2.4], [8, 0.9, -1.4], [1, 1.0, -0.6], [-10, 1.6, 0], [-22, 2.0, 0.2], [-29, 3.0, 0.4], [-33, 4.6, 0.2]]
const BICEPS: V3 = [-31.5, 3.6, 0.6]
const NERVE_END = onCord([-4.4, 0.15, 0.2])
const cable = (a: V3): V3[] => [a, [a[0] - 0.35, a[1] + 1.1, a[2] - 0.2], [NERVE_END[0] + 0.1, NERVE_END[1] - 1.0, NERVE_END[2]], NERVE_END]
const AFF = route(armIn.map(onArm3), cable(onArm3(armIn.at(-1)!)), ARC_IN.map(onCord))
const MID = route(ARC_MID.map(onCord))
const EFF = route(ARC_OUT.map(onCord), [...cable(onArm3([-32.6, 4.4, 0.4]))].reverse(), [onArm3([-32.6, 4.4, 0.4]), onArm3(BICEPS)])
const UP = route(ARC_UP.map(onCord), [onCord([-0.5, 0.66, -1.9]), onCord([-0.5, 3.2, -4.0]), onCord([-0.5, 7, -6])])
/** 剪断的地方：传入神经进入脊髓、传出神经离开脊髓的那一段的中间 */
const CUT_AT: Record<'afferent' | 'efferent', V3> = { afferent: onCord(ROOTS.L.dorsal[1]), efferent: onCord(ROOTS.L.ventral[1]) }
const CUT_S = { afferent: sOf(AFF, CUT_AT.afferent), efferent: sOf(EFF, CUT_AT.efferent) }
/** 碰一次的时间表（占全程的比例） */
const TL = { reach: [0, 0.08], aff: [0.1, 0.42], mid: [0.42, 0.5], eff: [0.5, 0.72], pull: [0.74, 0.84], up: [0.5, 0.92] } as const
/** 认反射弧时各部分对应的路 */
const PART_PATH: Record<ArcKey, { path: typeof AFF | null; at: V3 }> = {
  receptor: { path: null, at: onArm3(TIP) }, afferent: { path: AFF, at: onCord(ROOTS.L.dorsal[1]) }, center: { path: MID, at: onCord([-0.32, 0.1, 1.32]) },
  efferent: { path: EFF, at: onCord(ROOTS.L.ventral[1]) }, effector: { path: null, at: onArm3(BICEPS) },
}

export default function Lesson3() {
  const [cut, setCut] = useState<'none' | 'afferent' | 'efferent'>('none')
  const [last, setLast] = useState<{ cut: Cut; move: boolean; feel: boolean } | null>(null)
  const T = useTasks('gewu:nerve:3', TASKS)
  const cutRef = useRef(cut); cutRef.current = cut
  const tour = useRun(7.5, () => T.check(id => id === 'arc'))
  const touch = useRun(8, () => { const c: Cut = cutRef.current === 'none' ? null : cutRef.current; const r = arcResult(c); setLast({ cut: c, move: r.move, feel: r.feel }); T.check(id => (id === 'touch' && !c) || (id === 'in' && c === 'afferent') || (id === 'out' && c === 'efferent')) })
  const busy = tour.busy || touch.busy
  const doTour = () => { if (busy) return; setLast(null); touch.snap(0); tour.run() }
  const doTouch = () => { if (busy || !T.done.arc) return; setLast(null); touch.run() }
  const resetAll = () => { tour.snap(0); touch.snap(0); setCut('none'); setLast(null); T.reset() }
  const task = T.current
  const c: Cut = cut === 'none' ? null : cut
  const res = arcResult(c)
  const want = task && WANT[task.id]
  const { hint, next }: { hint: string; next: 'tour' | 'cut' | 'touch' | null } = !task ? { hint: '反射要靠完整的反射弧：哪一段断了，手都缩不回来。', next: null }
    : tour.busy ? { hint: `这是${ARC[ARC_ORDER[Math.min(4, Math.floor(tour.k * 5))]].name}…`, next: null }
    : touch.busy ? { hint: touch.k < TL.pull[0] ? '指尖碰到了热水杯，冲动沿着神经走…' : '看手和面板：缩没缩手？觉不觉得烫？', next: null }
    : task.id === 'arc' ? { hint: '按“认一认反射弧”，五个部分会依次亮起来', next: 'tour' }
    : want && cut !== want ? { hint: want === 'none' ? '选“完好”，先看看正常时会怎样' : want === 'afferent' ? '选“剪断传入神经”：剪断传入神经进入脊髓的那一段' : '选“剪断传出神经”：剪断传出神经离开脊髓的那一段', next: 'cut' }
    : { hint: '按“碰一下热水杯”', next: 'touch' }

  // ---------- 这一刻画面上的状态 ----------
  const k = touch.k, run = touch.busy || k > 0
  const affS = run ? Math.min(seg(k, ...TL.aff), c === 'afferent' ? CUT_S.afferent : 1) : 0
  const reachCord = res.reached.includes('center')
  const midS = run && reachCord ? seg(k, ...TL.mid) : 0
  const effS = run && reachCord ? Math.min(seg(k, ...TL.eff), c === 'efferent' ? CUT_S.efferent : 1) : 0
  const upS = run && reachCord ? seg(k, ...TL.up) : 0
  const pull = run && res.move ? ease(seg(k, ...TL.pull)) : 0
  const reach = run ? ease(seg(k, ...TL.reach)) : 0
  const tp = tour.busy || tour.k > 0 && !T.done.arc ? ARC_ORDER[Math.min(4, Math.floor(tour.k * 5))] : null
  const center = tp === 'center' || (run && midS > 0 && midS < 1) ? 1 : 0
  const feltNow = run && reachCord && upS >= 1
  const labels: Label[] = useMemo(() => {
    const L: Label[] = []
    if (tp) L.push({ id: 'tp', at: PART_PATH[tp].at, ax: tp === 'receptor' || tp === 'effector' ? 0.5 : 0, className: 'scene-tag key -translate-y-[130%]', children: <><small>{ARC[tp].at}</small>{ARC[tp].name}</> })
    else {
      L.push({ id: 'cord', at: onCord([0, 1.35, 0.8]), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '放大的一段脊髓 · 示意' })
      if (c) L.push({ id: 'cut', at: CUT_AT[c], ax: 1, className: 'scene-tag -translate-y-1/2 -translate-x-3', children: <><small>剪断了</small>{c === 'afferent' ? '传入神经' : '传出神经'}</> })
      if (run && k > TL.pull[0]) L.push({ id: 'r', at: [CUP_AT[0] - 0.4, CUP_AT[1] + 1.7, CUP_AT[2]], ax: 0.5, className: `scene-tag ${res.move ? 'key' : ''} -translate-y-full`, children: res.move ? '缩手' : '手没缩' })
      if (feltNow) L.push({ id: 'f', at: onCord([-0.5, 3.4, -4.2]), ax: 0, className: 'scene-tag key -translate-y-1/2', children: <><small>传到大脑</small>觉得烫</> })
    }
    return L
  }, [tp, c, run, k, res.move, feltNow])
  return (
    <LabShell title="神经调节" lessons={LESSONS} current="3" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['3'], VOICE)} actionsLabel="反射弧"
      stage={<Place at="arc" labels={labels} want={{ arm3: { flex: pull * 0.26, back: 1 - reach + pull * 3.5 }, cord: center }}>
        {/* 认反射弧：每段路整条亮起 */}
        {tp && PART_PATH[tp].path && <Impulse path={PART_PATH[tp].path!} s={0.999} size={0.07} />}
        {tp && !PART_PATH[tp].path && <Flash at={PART_PATH[tp].at} on r={0.32} />}
        {/* 碰一次 */}
        <Impulse path={AFF} s={affS} size={0.075} />
        <Impulse path={MID} s={midS} size={0.06} />
        <Impulse path={EFF} s={effS} size={0.075} color="#ffd27a" />
        <Impulse path={UP} s={upS} size={0.06} color="#c9b6ff" />
        <Flash at={onArm3(TIP)} on={run && k > TL.reach[1] && k < TL.aff[0] + 0.06} r={0.28} color="#ffb36b" />
        <Flash at={onArm3(BICEPS)} on={run && res.move && k > TL.eff[1] && k < TL.pull[1]} r={0.5} color="#ffd27a" />
        {/* 剪断处：一道红色的缺口 */}
        {c && <mesh position={CUT_AT[c]}><torusGeometry args={[0.2, 0.025, 10, 32]} /><meshBasicMaterial color="#ff5a52" toneMapped={false} /></mesh>}
      </Place>}
      lesson={<LessonBlock no="3" title="反射和反射弧" concept="反射要通过反射弧才能完成" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>人体通过神经系统，对外界或内部的各种刺激发生有规律的反应，叫<b className="text-white">反射</b>。反射是神经调节的基本方式。</p>
          <p className="mt-3">完成反射的结构是<b className="text-white">反射弧</b>，由感受器、传入神经、神经中枢、传出神经、效应器五部分组成。反射弧中任何一个环节中断，反射都不能进行。</p>
          <p className="mt-3">缩手反射的神经中枢在脊髓。冲动到了脊髓，一方面经传出神经让手缩回来，一方面沿脊髓里的神经纤维上传到大脑，我们才感觉到烫。所以手先缩回来，接着才觉得烫。</p>
          <p className="mt-3 text-[13.5px] text-white/65">脊髓放大了很多倍；神经在手臂里面，这里透出来画，看得清走向。冲动的速度放慢了。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三种情况都试过了</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">反射弧完整，反射才能完成：传出神经断了，手不缩但觉得烫</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">传入神经断了，冲动到不了脊髓，手不缩也不觉得烫。缩手反射的神经中枢在脊髓，觉得烫是在大脑。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          <div className="grid grid-cols-2 gap-2">
            <Big label="缩手" value={last ? (last.move ? '缩了' : '没缩') : '—'} tone={last ? (last.move ? 'good' : 'bad') : undefined} />
            <Big label="觉得烫" value={last ? (last.feel ? '是' : '否') : '—'} tone={last ? (last.feel ? 'good' : 'bad') : undefined} />
          </div>
          {last && <p className="mt-2 text-center text-[12.5px] text-white/55">{last.cut ? `${ARC[last.cut].name}剪断时` : '反射弧完整时'}</p>}
          <h2 className="mt-4 text-[12.5px] text-white/55">反射弧</h2>
          <div className="mt-2"><Chain items={ARC_ORDER.map(a => {
            const i = ARC_ORDER.indexOf(a), reached = run ? (a === 'receptor' ? k > TL.reach[1] : a === 'afferent' ? affS > 0 : a === 'center' ? midS > 0 : a === 'efferent' ? effS > 0 : pull > 0) : false
            return { name: ARC[a].name, sub: ARC[a].at, state: tp === a ? 'now' : c === a ? 'cut' : tp ? (ARC_ORDER.indexOf(tp) > i ? 'on' : 'off') : reached ? 'on' : 'off' }
          })} /></div>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'tour'} pulse={next === 'tour'} onClick={doTour} disabled={busy}>认一认反射弧</LabButton>
        <LabButton primary={next === 'touch'} pulse={next === 'touch'} onClick={doTouch} disabled={busy || !T.done.arc}>碰一下热水杯</LabButton>
      </>}
      extras={
        <Control label="反射弧">
          <Segmented label="反射弧" pulse={next === 'cut'} want={next === 'cut' ? want ?? null : null} value={cut} onChange={v => { setCut(v as typeof cut); touch.snap(0); setLast(null) }} disabled={busy || !T.done.arc} options={CUTS} />
        </Control>
      }
    />
  )
}
