// 地震 · 拓展课：两个小实验。
// 全球地震带：在太空里的地球上依次点亮环太平洋地震带、地中海—喜马拉雅地震带，再找到汶川。
// 预警响了：小镇的教学楼收到预警，横波还有约 10 s 到，选一选怎么做，看横波到达时的结果。
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Spot from './world'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { SCHOOL_LEAD } from './physics'
import { BELTS, type BeltKey, type LL } from './belts'
import { globePoint } from './globe'
import { SPOTS, TOWN } from './town'
import { buildingHeight } from './building'
import { useClock, useLater } from './clock'

type Part = 'belts' | 'alarm'
type Act = 'run' | 'desk' | 'window'
const TASKS: Task[] = [
  { id: 'pacific', text: '点亮环太平洋地震带', note: '太平洋四周一圈，是全球地震最多的地方' },
  { id: 'alpide', text: '点亮地中海—喜马拉雅地震带', note: '从地中海经喜马拉雅山到印度尼西亚' },
  { id: 'china', text: '找到汶川', note: '我国在两大地震带之间，受挤压强烈，地震多' },
  { id: 'alarm', text: '预警响了：选一选怎么做', note: '在楼里，就近躲到结实的课桌下，护住头' },
]
const FACE: Record<'pacific' | 'alpide' | 'china', LL> = { pacific: [-175, 8], alpide: [62, 28], china: [103.4, 31] }
const ACTS: { key: Act; label: string; ok: boolean; why: string }[] = [
  { key: 'run', label: '冲下楼', ok: false, why: `${SCHOOL_LEAD} s 跑不出三楼；晃起来时人在楼梯上，最容易摔倒、被挤伤` },
  { key: 'desk', label: '躲到课桌下', ok: true, why: '就近躲到结实的课桌下，护住头和脖子，等晃动停下再有序撤离' },
  { key: 'window', label: '到窗边看看', ok: false, why: '窗边最危险：玻璃会震碎飞出来' },
]

export default function LessonX() {
  const [part, setPart] = useState<Part>('belts')
  const [lit, setLit] = useState<BeltKey[]>([])
  const [mark, setMark] = useState(false)
  const [act, setAct] = useState<Act | null>(null)
  const T = useTasks('gewu:quake:x', TASKS)
  const t = useClock(act !== null, 2, SCHOOL_LEAD + 4)
  const hit = act !== null && t >= SCHOOL_LEAD, over = act !== null && t >= SCHOOL_LEAD + 4
  const choice = ACTS.find(a => a.key === act)
  useLater(lit.includes('pacific'), 1800, () => T.check(id => id === 'pacific'), [lit.length])
  useLater(lit.includes('alpide'), 1800, () => T.check(id => id === 'alpide'), [lit.length])
  useLater(mark, 1800, () => T.check(id => id === 'china'), [mark])
  useLater(over && !!choice?.ok, 400, () => T.check(id => id === 'alarm'), [over])
  const resetAll = () => { setPart('belts'); setLit([]); setMark(false); setAct(null); T.reset() }
  const stepBelts = () => { if (!lit.includes('pacific')) setLit(['pacific']); else if (!lit.includes('alpide')) setLit(['pacific', 'alpide']); else setMark(true) }

  const task = T.current, going = act !== null && !over
  const { hint, next }: { hint: string; next: 'step' | 'part' | 'act' | null } = (() => {
    if (!task) return { hint: '都做完了。', next: null }
    if (task.id === 'alarm') {
      if (part !== 'alarm') return { hint: '这个做完了。接着做：预警响了', next: 'part' }
      if (going) return hit ? { hint: '横波到了，教学楼晃起来…', next: null } : { hint: `预警响了：横波还有 ${Math.max(0, SCHOOL_LEAD - t).toFixed(0)} 秒到…`, next: null }
      if (choice && !choice.ok) return { hint: '这样不安全。再选一次', next: 'act' }
      return { hint: '你在三楼的教室里，手机和广播响起地震预警。选一选怎么做', next: 'act' }
    }
    if (part !== 'belts') return { hint: '实验换成“全球地震带”', next: 'part' }
    if ((task.id === 'pacific' && lit.includes('pacific')) || (task.id === 'alpide' && lit.includes('alpide')) || (task.id === 'china' && mark)) return { hint: '看地球上亮起来的地方…', next: null }
    if (task.id === 'pacific') return { hint: '点亮环太平洋地震带', next: 'step' }
    if (task.id === 'alpide') return { hint: '再点亮地中海—喜马拉雅地震带', next: 'step' }
    return { hint: '在地球上找到汶川', next: 'step' }
  })()

  const face: LL = !lit.length ? FACE.china : mark ? FACE.china : lit.includes('alpide') ? FACE.alpide : FACE.pacific
  const sp = SPOTS.school
  const labels: Label[] = part === 'belts' ? [
    { id: 'p', at: globePoint([-150, 45], face), ax: 0.5, className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: lit.includes('pacific') && !lit.includes('alpide') ? 1 : 0 }, children: BELTS.pacific.name },
    { id: 'a', at: globePoint([58, 36], face), ax: 0.5, className: 'scene-tag -translate-y-full transition-opacity', style: { opacity: lit.includes('alpide') && !mark ? 1 : 0 }, children: BELTS.alpide.name },
    { id: 'w', at: globePoint([103.4, 31], face, 1.03), ax: 0, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: mark ? 1 : 0 }, children: '汶川' },
  ] : [
    { id: 'sc', at: [TOWN.x + sp[0], TOWN.y + buildingHeight('school') + 1.6, TOWN.z + sp[2]], ax: 0.5, className: `${act !== null && !hit ? 'scene-tag key' : 'scene-name'} -translate-y-full`, children: act !== null && !hit ? <><small>预警</small>横波还有 {Math.max(0, SCHOOL_LEAD - t).toFixed(0)} s</> : '教学楼' },
  ]
  return (
    <LabShell title="地震" lessons={LESSONS} current="x" narration={voiced(NARRATION['x'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={part === 'belts' ? '全球地震带' : '你会怎么做'}
      autoStep={() => { if (next === 'act') { setAct(null); requestAnimationFrame(() => setAct('desk')); return true } return false }}
      stage={part === 'belts'
        ? <Spot at="globe" labels={labels} want={{ globe: { face, belts: lit, mark } }} />
        : <Spot at="school" labels={labels} want={{ town: { school: hit && !over ? 0.12 : hit ? 0.03 : 0 } }} />}
      lesson={<LessonBlock no="拓展" title="地震带 · 预警响了" concept="地震多发生在两大地震带上；预警响了就近躲避" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>全球的地震主要分布在两条带上：<b className="text-white">环太平洋地震带</b>，沿太平洋四周；<b className="text-white">地中海—喜马拉雅地震带</b>，从地中海经过喜马拉雅山到印度尼西亚。它们大多在板块交界的地方。我国位于两大地震带之间，地震多。</p>
          <p className="mt-2">收到预警时，往往只有几秒到十几秒。在楼里，就近躲到结实的桌子下或墙角，护住头和脖子；不要跳楼、不要乘电梯，不要跑到阳台、窗边。晃动停了，再按顺序撤到空旷的地方。</p>
          <p className="mt-3 text-[13.5px] text-white/65">地球上地震带的走向和红点都是示意，不是真实的地震目录。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,420px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两个小实验都做完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">地震多发生在两大地震带上；预警响了就近躲避</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">我国在环太平洋地震带和地中海—喜马拉雅地震带之间。在楼里收到预警，就近躲到结实的课桌下，护住头。</p>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          {part === 'belts' ? <>
            <div className="text-center">
              <div className="text-[13px] text-white/60">点亮的地震带</div>
              <div className="mt-1 text-[40px] leading-none font-bold tabular-nums">{lit.length}<span className="ml-1 text-[15px] font-medium text-white/55">/ 2 条</span></div>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              {(Object.keys(BELTS) as BeltKey[]).map(k => <div key={k} className="flex items-center gap-2.5 rounded-xl bg-white/8 px-3 py-2.5 text-[14px]"><span className="h-2.5 w-6 rounded-full" style={{ background: BELTS[k].color, opacity: lit.includes(k) ? 1 : 0.25 }} /><span className={lit.includes(k) ? 'text-white' : 'text-white/50'}>{BELTS[k].name}</span></div>)}
            </div>
          </> : <>
            <div className="text-center">
              <div className="text-[13px] text-white/60">横波还有</div>
              <div className="mt-1 text-[46px] leading-none font-bold tabular-nums">{act === null ? SCHOOL_LEAD : Math.max(0, SCHOOL_LEAD - t).toFixed(0)}<span className="ml-1 text-[15px] font-medium text-white/55">s</span></div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <ParamTile symbol="所在" value="三楼" unit="教室" />
              <ParamTile symbol="提前" value={`约 ${SCHOOL_LEAD}`} unit="s · 收到预警" />
            </div>
            {choice && over && <p className={`hint-in mt-3 rounded-xl px-3.5 py-3 text-[14px] leading-relaxed ${choice.ok ? 'bg-[#35c7b3]/20 text-white' : 'bg-[#ff6b6b]/20 text-white'}`}>{choice.why}</p>}
          </>}
        </Glass>
      }
      actions={part === 'belts' ? <>
        <LabButton primary pulse={next === 'step'} onClick={stepBelts} disabled={mark}>{!lit.includes('pacific') ? '点亮环太平洋' : !lit.includes('alpide') ? '点亮地中海—喜马拉雅' : '找到汶川'}</LabButton>
      </> : <>
        {ACTS.map(a => <LabButton key={a.key} pulse={false} onClick={() => { setAct(null); requestAnimationFrame(() => setAct(a.key)) }} disabled={going || T.done.alarm}>{a.label}</LabButton>)}
      </>}
      extras={<Control label="实验"><Segmented label="实验" pulse={next === 'part'} want={next === 'part' ? (task?.id === 'alarm' ? 'alarm' : 'belts') : null} value={part} disabled={going} onChange={v => setPart(v as Part)} options={[{ value: 'belts', label: '全球地震带' }, { value: 'alarm', label: '预警响了' }]} /></Control>}
    />
  )
}
