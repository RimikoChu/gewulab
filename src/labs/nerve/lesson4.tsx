// 神经调节 · 第 4 课 简单反射和复杂反射：先给展馆正中坐着的人叩一下膝盖下方的韧带，看冲动走到脊髓又回来、小腿弹起；
// 再到他的头部：吃梅子、看梅子、听人说起梅子，三种情况都分泌唾液，看冲动各走哪条路、有没有经过大脑皮层。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useRef, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { CORD, EAR_AT, EYE_AT, GLAND_AT, QUAD, TONGUE_AT, cordAt, inHead, legFront } from './body'
import type { TagKey } from './brain'
import { LESSONS, goLesson } from './lessons'
import { Place, ease, seg, useRun } from './parts'
import { KINDS, STIMULI, inborn, kindOf, type StimKey } from './physics'
import { Hammer, Plum } from './props'
import type { V3 } from './sdf'
import { Flash, Impulse, route } from './signal'
import { Big } from './ui'
import { onBody } from './world'

const TASKS: Task[] = [
  { id: 'knee', text: '叩击膝盖下方的韧带', note: '小腿突然弹起：膝跳反射，神经中枢在脊髓' },
  { id: 'eat', text: '让他吃一颗梅子', note: '分泌唾液：生来就有的简单反射' },
  { id: 'see', text: '只让他看梅子，不吃', note: '也分泌唾液：吃过梅子才会这样，是复杂反射，有大脑皮层参与' },
  { id: 'talk', text: '只跟他说起梅子', note: '谈梅也生津：和语言有关，是人类特有的复杂反射' },
]
const ORDER: StimKey[] = ['knee', 'eat', 'see', 'talk']
const SHORT: Record<StimKey, string> = { knee: '叩膝盖', eat: '吃梅子', see: '看梅子', talk: '说梅子' }
const GO: Record<StimKey, string> = { knee: '叩一下', eat: '吃一颗', see: '让他看', talk: '说给他听' }
const B = (pts: V3[]) => pts.map(onBody)
// ---------- 冲动走的路 ----------
const KNEE_IN = route(B([...legFront(1)].reverse()))
const KNEE_OUT = route(B([...legFront(1).slice(0, 4), [QUAD.c[0], QUAD.c[1] + 0.1, QUAD.c[2] - 0.6], QUAD.c]))
const KNEE_UP = route(B([cordAt(10.9), ...[...CORD].reverse().filter(p => p[1] > 10.9), inHead([0, -5, -2]), inHead([0, -1, -1]), inHead([2.5, 3.4, 0.2])]))
const STEM = inHead([0.4, -4.6, -1.6])
const TO_GLAND: V3[] = [STEM, inHead([1.2, -4.0, 0.2]), [0.48, 16.1, 0.28], GLAND_AT(1)]
const HEAD: Record<Exclude<StimKey, 'knee'>, { path: ReturnType<typeof route>; areas: TagKey[]; from: V3 }> = {
  eat: { path: route(B([TONGUE_AT, [0.2, 16.05, 0.4], inHead([0.7, -3.4, -0.8]), STEM]), B(TO_GLAND)), areas: ['stem'], from: TONGUE_AT },
  see: { path: route(B([EYE_AT(1), [0.22, 16.6, 0.5], inHead([0.8, -1.4, 3.6]), inHead([1.6, -0.8, -2.5]), inHead([2.2, 0.8, -6.8])]), B([inHead([2.2, 0.8, -6.8]), inHead([2.8, 2.4, -1.0]), inHead([1.6, -1.0, -1.2]), STEM]), B(TO_GLAND)), areas: ['vision', 'stem'], from: EYE_AT(1) },
  talk: { path: route(B([EAR_AT(1), [0.5, 16.45, 0.18], inHead([1.2, -2.4, 1.2]), inHead([4.6, -1.3, 0.6])]), B([inHead([4.6, -1.3, 0.6]), inHead([4.4, 0.2, 4.0]), inHead([2.0, -0.6, 1.0]), STEM]), B(TO_GLAND)), areas: ['hearing', 'speech', 'stem'], from: EAR_AT(1) },
}
/** 叩膝的时间表 */
const TK = { swing: [0, 0.12], in: [0.12, 0.42], out: [0.42, 0.68], kick: [0.68, 0.78], back: [0.82, 0.98], up: [0.45, 0.95] } as const

export default function Lesson4() {
  const [stim, setStim] = useState<StimKey>('knee')
  const [shown, setShown] = useState<StimKey | null>(null)
  const T = useTasks('gewu:nerve:4', TASKS)
  const cur = useRef(stim); cur.current = stim
  const run = useRun(stim === 'knee' ? 6 : 6.5, () => { setShown(cur.current); T.check(id => id === cur.current) })
  const go = () => { if (run.busy) return; setShown(null); run.run() }
  const resetAll = () => { run.snap(0); setStim('knee'); setShown(null); T.reset() }
  const task = T.current
  const want = task?.id as StimKey | undefined
  const { hint, next }: { hint: string; next: 'stim' | 'go' | null } = !task ? { hint: '简单反射生来就有，中枢在大脑皮层以下；复杂反射是后天形成的，要有大脑皮层参与。', next: null }
    : run.busy ? { hint: stim === 'knee' ? '冲动从膝盖下面出发，沿着大腿前面的神经往上走…' : '看冲动走的路：经没经过大脑皮层？', next: null }
    : want && stim !== want ? { hint: `选“${SHORT[want]}”`, next: 'stim' }
    : { hint: `按“${GO[stim]}”`, next: 'go' }
  const k = run.k, on = run.busy || k > 0
  // 膝跳
  const knee = stim === 'knee'
  const swing = knee && on ? (k < TK.swing[1] ? ease(seg(k, ...TK.swing)) : 1 - ease(seg(k, TK.swing[1], TK.swing[1] + 0.1))) : 0
  const kick = knee && on ? ease(seg(k, ...TK.kick)) * (1 - ease(seg(k, ...TK.back))) * 0.62 : 0
  const quad = knee && on && k > TK.out[1] - 0.04 && k < TK.back[0] ? 1 : 0
  // 梅子
  const h = !knee ? HEAD[stim as Exclude<StimKey, 'knee'>] : null
  const hs = h && on ? seg(k, 0.1, 0.86) : 0
  const areaOn = (t: TagKey) => (h && on && h.areas.includes(t) && hs > 0.25 ? 1 : 0)
  const brainHi: Partial<Record<TagKey, number>> = h ? Object.fromEntries(h.areas.map(t => [t, areaOn(t)])) : {}
  const plumAt: V3 | null = stim === 'eat' ? onBody([0, 16.12, on && k > 0.04 ? 0.95 : 2.0]) : stim === 'see' ? onBody([0.25, 16.75, 2.3]) : null
  const st = STIMULI[stim]
  const labels: Label[] = knee ? [
    { id: 'q', at: onBody([0.9, 9.9, 2.2]), ax: 0.5, className: `scene-tag ${quad ? 'key' : ''} -translate-y-full`, children: <><small>效应器</small>大腿前面的肌肉</> },
    { id: 't', at: onBody([0.93, 8.3, 5.0]), ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>感受器</small>膝盖下方的韧带</> },
    { id: 'c', at: onBody([0.3, 10.9, -0.6]), ax: 0, className: `scene-tag ${on && k > TK.in[1] - 0.03 && k < TK.out[0] + 0.1 ? 'key' : ''} -translate-y-1/2`, children: <><small>神经中枢</small>脊髓</> },
  ] : [
    ...(stim === 'talk' ? [{ id: 's', at: onBody([1.5, 16.9, 0.3]), ax: 0, className: 'scene-tag -translate-y-1/2', children: <><small>有人说</small>梅子，酸酸的</> }] : []),
    ...(on && k > 0.85 ? [{ id: 'g', at: onBody([0.65, 15.85, 0.6]), ax: 0, className: 'scene-tag key -translate-y-1/2', children: '分泌唾液' }] : []),
    ...(h && hs > 0.3 && h.areas.includes('vision') ? [{ id: 'v', at: onBody(inHead([2.4, 1.6, -7])), ax: 0, className: 'scene-tag -translate-y-1/2', children: <><small>大脑皮层</small>视觉中枢</> }] : []),
    ...(h && hs > 0.3 && h.areas.includes('speech') ? [{ id: 'sp', at: onBody(inHead([4.4, 1.0, 4.2])), ax: 0, className: 'scene-tag -translate-y-1/2', children: <><small>大脑皮层</small>语言中枢</> }] : []),
  ]
  return (
    <LabShell title="神经调节" lessons={LESSONS} current="4" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['4'], VOICE)} actionsLabel="刺激"
      stage={<Place at={knee ? 'knee' : 'head'} labels={labels} want={{ body: { kick, quad, brainHi, nerves: on ? 0.5 : 1, chatter: !on, shell: 1 } }}>
        {knee && <>
          <Hammer at={onBody([0.93, 8.6, 5.0])} swing={swing} />
          <Impulse path={KNEE_IN} s={on ? seg(k, ...TK.in) : 0} size={0.08} />
          <Impulse path={KNEE_OUT} s={on ? seg(k, ...TK.out) : 0} size={0.08} color="#ffd27a" />
          <Impulse path={KNEE_UP} s={on ? seg(k, ...TK.up) : 0} size={0.06} color="#c9b6ff" />
          <Flash at={onBody([0.93, 8.6, 4.6])} on={on && k > TK.swing[1] - 0.02 && k < TK.in[0] + 0.08} r={0.3} color="#ffb36b" />
        </>}
        {h && <>
          <Impulse path={h.path} s={hs} size={0.035} />
          <Flash at={onBody(h.from)} on={on && k < 0.14} r={0.14} color="#ffb36b" />
          {[1, -1].map(s => <Flash key={s} at={onBody(GLAND_AT(s))} on={on && k > 0.85} r={0.16} color="#9fe8ff" />)}
        </>}
        {plumAt && <Plum at={plumAt} s={0.13} />}
      </Place>}
      lesson={<LessonBlock no="4" title="简单反射和复杂反射" concept="复杂反射要有大脑皮层参与" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p><b className="text-white">简单反射</b>是生来就有的，神经中枢在大脑皮层以下（如脊髓、脑干），比如膝跳反射、缩手反射、吃到食物分泌唾液。</p>
          <p className="mt-3"><b className="text-white">复杂反射</b>是出生以后在生活过程中逐渐形成的，要有大脑皮层参与，比如望梅止渴、谈虎色变。</p>
          <p className="mt-3">与语言、文字有关的反射（如谈梅生津）要有大脑皮层的语言中枢参与，是人类特有的。</p>
          <p className="mt-3 text-[13.5px] text-white/65">叩膝盖时，冲动在脊髓里还会往上传到大脑，所以他知道自己被叩了一下；小腿弹起来不用等大脑。冲动的路线是示意。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四种刺激都试过了</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">膝跳反射、吃梅分泌唾液是简单反射；望梅止渴、谈梅生津是复杂反射</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">简单反射生来就有，中枢在大脑皮层以下；复杂反射后天形成，要有大脑皮层参与。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center"><div className="text-[13px] text-white/60">刺激</div><div className="mt-1 text-[24px] leading-tight font-bold">{st.name}</div><div className="mt-1 text-[14px] text-white/70">反应：{st.reply}</div></div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Big label="反射的类型" value={shown === stim ? kindOf(stim) : '—'} />
            <Big label="生来就有" value={shown === stim ? (inborn(stim) ? '是' : '不是') : '—'} />
          </div>
          <div className="mt-2 rounded-xl bg-white/6 px-3 py-2.5 text-center"><span className="text-[13px] text-white/60">神经中枢 </span><span className="text-[15px] font-semibold">{shown === stim ? st.center : '—'}</span></div>
          <h2 className="mt-4 text-[12.5px] text-white/55">做过的</h2>
          <div className="mt-2 flex flex-col gap-1">{ORDER.filter(s => T.done[s]).map(s => <div key={s} className="flex justify-between rounded-lg bg-white/6 px-3 py-1.5 text-[13.5px]"><span>{STIMULI[s].name}</span><span className={STIMULI[s].kind === 'simple' ? 'text-[#7fe3d4]' : 'text-[#ffd27a]'}>{KINDS[STIMULI[s].kind]}</span></div>)}</div>
        </Glass>
      }
      actions={<LabButton primary pulse={next === 'go'} onClick={go} disabled={run.busy}>{GO[stim]}</LabButton>}
      extras={
        <Control label="刺激">
          <Segmented label="刺激" pulse={next === 'stim'} want={next === 'stim' ? want ?? null : null} value={stim} onChange={v => { setStim(v as StimKey); run.snap(0); setShown(null) }} disabled={run.busy} options={ORDER.map(s => ({ value: s, label: SHORT[s] }))} />
        </Control>
      }
    />
  )
}
