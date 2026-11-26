// 神经调节 · 第 6 课 耳和听觉：展馆右下方悬着一个放大的耳剖面，旁边一只小音箱。放出声音，看声波沿外耳道走到鼓膜，
// 鼓膜振动、三块听小骨把振动传到耳蜗，耳蜗里的感觉细胞产生冲动，沿听觉神经传到大脑；再来一声巨响，比较闭着嘴和张开口时鼓膜的受力。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useMemo, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { EAR_AT, inHead } from './body'
import { CANALS, COCHLEA, NERVE_OUT, OSS, TUBE_PTS } from './ear'
import { LESSONS, goLesson } from './lessons'
import { Place, seg, useRun } from './parts'
import { BONES, EAR, SOUND_PATH, drumPush, type EarKey } from './physics'
import type { V3 } from './sdf'
import { Flash, Impulse, route } from './signal'
import { Chain } from './ui'
import { EAR_W, onBody, onEar } from './world'

const TASKS: Task[] = [
  { id: 'drum', text: '放出声音，看声波走到鼓膜', note: '声波沿外耳道传到鼓膜，引起鼓膜振动' },
  { id: 'cochlea', text: '跟着振动走进内耳', note: '听小骨把振动传到内耳，耳蜗里的感觉细胞产生神经冲动' },
  { id: 'brain', text: '跟着冲动走到大脑', note: '听觉神经把冲动传到大脑皮层的听觉中枢，形成听觉' },
  { id: 'shut', text: '闭着嘴，来一声巨响', note: '外面的气压猛地升高，鼓膜被压进去，容易受伤' },
  { id: 'open', text: '张开口，再来一声巨响', note: '咽鼓管张开，鼓膜内外气压平衡，鼓膜不容易受伤' },
]
/** 放一次声音的时间表 */
const TP = { canal: [0, 0.24], bones: [0.24, 0.44], coch: [0.36, 0.5], nerve: [0.52, 0.96] } as const
const PATH = route(([[COCHLEA[0] + 1, COCHLEA[1] + 0.4, -0.3], ...NERVE_OUT] as V3[]).map(onEar),
  [onEar(NERVE_OUT.at(-1)!), [EAR_W.at[0] - 8, EAR_W.at[1] + 4, EAR_W.at[2]], [12, 14, -2.5], [5, 16, -1], onBody(EAR_AT(1))] as V3[],
  ([EAR_AT(1), [0.5, 16.45, 0.18], inHead([1.2, -2.4, 1.2]), inHead([4.6, -1.3, 0.6])] as V3[]).map(onBody))
const stageAt = (k: number): EarKey | null => (k <= 0 ? null : k < TP.canal[1] * 0.85 ? 'canal' : k < TP.canal[1] ? 'drum' : k < TP.bones[1] - 0.06 ? 'bones' : k < TP.nerve[0] ? 'cochlea' : k < 0.93 ? 'nerve' : 'cortex')

export default function Lesson6() {
  const [mouth, setMouth] = useState<'shut' | 'open'>('shut')
  const T = useTasks('gewu:nerve:6', TASKS)
  const play = useRun(12)
  const bang = useRun(3, () => T.check(id => id === mouth))
  const busy = play.busy || bang.busy
  const k = play.k
  // 声音走到哪一站，就把那一站的任务打勾
  useEffect(() => { if (!play.busy && k < 1) return; T.check(id => (id === 'drum' && k >= TP.canal[1]) || (id === 'cochlea' && k >= TP.coch[1]) || (id === 'brain' && k >= 1)) }, [k >= TP.canal[1], k >= TP.coch[1], k >= 1])   // eslint-disable-line react-hooks/exhaustive-deps
  const doPlay = () => { if (busy) return; bang.snap(0); play.run() }
  const doBang = () => { if (busy || !T.done.brain) return; play.snap(0); bang.run() }
  const resetAll = () => { play.snap(0); bang.snap(0); setMouth('shut'); T.reset() }
  const task = T.current
  const wantM = task?.id === 'shut' || task?.id === 'open' ? task.id as 'shut' | 'open' : null
  const st = play.busy ? stageAt(k) : null
  const { hint, next }: { hint: string; next: 'play' | 'mouth' | 'bang' | null } = !task ? { hint: '声波 → 外耳道 → 鼓膜 → 听小骨 → 耳蜗 → 听觉神经 → 大脑皮层的听觉中枢。', next: null }
    : play.busy ? { hint: `声音走到了${EAR[st ?? 'canal'].name}…`, next: null }
    : bang.busy ? { hint: mouth === 'open' ? '张着口：看咽鼓管和鼓膜…' : '闭着嘴：看鼓膜…', next: null }
    : ['drum', 'cochlea', 'brain'].includes(task.id) ? { hint: '按“放出声音”，跟着声音走一遍', next: 'play' }
    : wantM && mouth !== wantM ? { hint: wantM === 'shut' ? '选“闭着嘴”' : '选“张开口”', next: 'mouth' }
    : { hint: '按“来一声巨响”，看鼓膜被压进去多少', next: 'bang' }
  const loud = bang.busy ? 1 : 0
  const bk = bang.k, inBang = bang.busy && bk > 0.15 && bk < 0.75
  const push = inBang ? drumPush(true, mouth === 'open') : 0
  const vib = play.busy && k > TP.canal[1] * 0.85 && k < TP.coch[1] + 0.05 ? 1 : bang.busy ? 0.4 : 0
  const glow = play.busy && k > TP.coch[0] && k < TP.nerve[0] + 0.1 ? 1 : 0
  const spot = play.busy ? (k < TP.canal[1] * 0.7 ? 'ear' : k < TP.nerve[0] + 0.04 ? 'earIn' : 'earBrain') : bang.busy ? 'earIn' : 'ear'
  const L = (id: string, p: V3, name: string, key: boolean, ax = 0.5, cls = '-translate-y-[140%]'): Label => ({ id, at: onEar(p), ax, className: `scene-tag ${key ? 'key' : ''} ${cls}`, children: name })
  const labels: Label[] = useMemo(() => spot === 'earBrain' ? [
    { id: 'h', at: onBody(inHead([5, 0.6, 0.6])), ax: 0, className: `scene-tag ${k > 0.92 ? 'key' : ''} -translate-y-1/2`, children: <><small>大脑皮层</small>听觉中枢</> },
    L('n', [-20, -1, 0], '听觉神经', st === 'nerve', 0.5, 'translate-y-3'),
  ] : [
    L('c', [11, 0.5, 0], '外耳道', st === 'canal', 0.5, 'translate-y-4'),
    L('d', [1.5, -4.8, 0], '鼓膜', st === 'drum' || push > 0.5, 0, 'translate-y-1'),
    L('b', [OSS.incus[0] - 0.5, OSS.incus[1] + 2.4, 0], '听小骨', st === 'bones', 0, '-translate-y-full'),
    L('co', [COCHLEA[0], COCHLEA[1] - 6.4, 0], '耳蜗', st === 'cochlea', 0.5, 'translate-y-1'),
    L('sc', [CANALS[0] - 3.5, CANALS[1] + 4.8, 0], '半规管', false, 1),
    ...(bang.busy || T.done.brain ? [L('t', [TUBE_PTS[2][0] - 1.5, TUBE_PTS[2][1], 0], '咽鼓管', mouth === 'open' && bang.busy, 1, '-translate-y-1/2')] : []),
  ], [spot, st, push, k, bang.busy, mouth, T.done.brain])   // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <LabShell title="神经调节" lessons={LESSONS} current="6" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['6'], VOICE)} actionsLabel="耳"
      stage={<Place at={spot} labels={labels} want={{ ear: { vib, push, glow, tube: bang.busy && mouth === 'open', sound: (play.busy && k < TP.bones[1]) || bang.busy, loud } }}>
        <Impulse path={PATH} s={play.busy ? seg(k, ...TP.nerve) : 0} size={0.1} />
        <Flash at={onBody(inHead([4.6, -1.3, 0.6]))} on={play.busy && k > 0.93} r={0.28} />
      </Place>}
      lesson={<LessonBlock no="6" title="耳和听觉" concept="耳蜗产生冲动，听觉在大脑形成" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>耳由外耳、中耳、内耳组成。外耳包括耳廓和外耳道；中耳包括鼓膜、鼓室和{BONES.join('、')}三块听小骨；内耳包括半规管、前庭和耳蜗。</p>
          <p className="mt-3">外界的声波经外耳道传到<b className="text-white">鼓膜</b>，引起鼓膜振动；振动通过<b className="text-white">听小骨</b>传到内耳，刺激<b className="text-white">耳蜗</b>内对声波敏感的感觉细胞，产生神经冲动；冲动通过<b className="text-white">听觉神经</b>传到<b className="text-white">大脑皮层的听觉中枢</b>，形成听觉。</p>
          <p className="mt-3">遇到巨大声响时，要迅速张开口，使咽鼓管张开，或闭嘴、堵耳，保持鼓膜两侧大气压力平衡。不要用尖锐的东西挖耳朵；长时间听很响的声音会损伤听力。</p>
          <p className="mt-3 text-[13.5px] text-white/65">半规管和前庭里有感受头部位置变动的感受器，和身体的平衡有关。耳放大了约 15 倍，耳廓画小了。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">声音走完了一遍</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">鼓膜振动，听小骨传到耳蜗，耳蜗产生冲动，听觉在大脑皮层的听觉中枢形成</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">遇到巨响，张开口让咽鼓管张开，鼓膜两侧气压平衡，就不容易受伤。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          <h2 className="text-[12.5px] text-white/55">声音的路线</h2>
          <div className="mt-2"><Chain items={SOUND_PATH.map(p => ({ name: EAR[p].name, state: st === p ? 'now' : (st && SOUND_PATH.indexOf(p) < SOUND_PATH.indexOf(st)) || (!play.busy && T.done.brain) ? 'on' : 'off' }))} /></div>
          {st && <p className="mt-2 text-[13px] leading-relaxed text-white/70">{EAR[st].job}。</p>}
          <h2 className="mt-4 text-[12.5px] text-white/55">巨响时鼓膜被压进去</h2>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#ff8a8f] transition-all duration-300" style={{ width: `${push * 100}%` }} /></div>
          <div className="mt-1 flex justify-between text-[12px] text-white/50"><span>两侧平衡</span><span>压进去很多</span></div>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'play'} pulse={next === 'play'} onClick={doPlay} disabled={busy}>放出声音</LabButton>
        <LabButton primary={next === 'bang'} pulse={next === 'bang'} onClick={doBang} disabled={busy || !T.done.brain}>来一声巨响</LabButton>
      </>}
      extras={
        <Control label="巨响时">
          <Segmented label="巨响时" pulse={next === 'mouth'} want={next === 'mouth' ? wantM : null} value={mouth} onChange={v => setMouth(v as 'shut' | 'open')} disabled={busy || !T.done.brain} options={[{ value: 'shut', label: '闭着嘴' }, { value: 'open', label: '张开口' }]} />
        </Control>
      }
    />
  )
}
