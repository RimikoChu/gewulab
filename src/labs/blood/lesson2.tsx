// 血液循环 · 第 2 课 三种血管：右展台上三段放大的血管（动脉、静脉、毛细血管），纵向剖开，看管壁、管腔和红细胞走得多快；
// 让静脉里的血倒流一下，看静脉瓣合上。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useRef, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { VES } from './bench'
import { LESSONS, goLesson } from './lessons'
import { Place, useRun } from './parts'
import { CAP_UM, VESSELS, singleFile, type VesselKey } from './physics'
import { VES_AT } from './world'

const TASKS: Task[] = [
  { id: 'cut', text: '剖开三段血管', note: '管壁的厚薄、管腔的大小都看得见了' },
  { id: 'artery', text: '看动脉：管壁厚，血流快', note: '动脉管壁厚、弹性大，血随着心跳一冲一冲地快流' },
  { id: 'vein', text: '看静脉：管壁薄，管腔大，里面有瓣膜', note: '静脉管壁薄、管腔大，血流慢；里面有静脉瓣' },
  { id: 'valve', text: '让静脉里的血倒流一下，看静脉瓣', note: '血往回流时静脉瓣合上：静脉瓣防止血倒流' },
  { id: 'capillary', text: '看毛细血管：红细胞单行通过', note: `毛细血管内径只有 ${CAP_UM[0]}–${CAP_UM[1]} µm，红细胞只能一个一个通过，血流最慢` },
]
const KINDS: VesselKey[] = ['artery', 'vein', 'capillary']

export default function Lesson2() {
  const [kind, setKind] = useState<VesselKey | null>(null)
  const [rev, setRev] = useState(false)
  const T = useTasks('gewu:blood:2', TASKS)
  const cut = useRun(2.0, () => T.check(id => id === 'cut'))
  const timer = useRef(0)
  const isCut = cut.k >= 1
  const pick = (k: VesselKey) => { if (!isCut || rev) return; setKind(k); if (k !== 'vein' || T.done.artery) T.check(id => id === k && (k !== 'capillary' || !!T.done.valve)) }
  const back = () => { if (kind !== 'vein' || rev) return; setRev(true); timer.current = window.setTimeout(() => { setRev(false); T.check(id => id === 'valve') }, 3800) }
  const resetAll = () => { clearTimeout(timer.current); cut.snap(0); setKind(null); setRev(false); T.reset() }
  const task = T.current
  const want: VesselKey | null = task && (KINDS as string[]).includes(task.id) ? task.id as VesselKey : null
  const { hint, next }: { hint: string; next: 'cut' | 'pick' | 'back' | null } = !task ? { hint: '动脉把血送出心脏，静脉把血送回心脏，毛细血管连通最小的动脉和静脉。', next: null }
    : cut.busy ? { hint: '纵向剖开，前半边拿开…', next: null }
    : !isCut ? { hint: '三段放大的血管：后面是动脉，中间是静脉，前面是毛细血管。按“剖开血管”', next: 'cut' }
    : rev ? { hint: '血往回流，静脉瓣被冲得合上了，血过不去…', next: null }
    : task.id === 'valve' ? { hint: kind === 'vein' ? '静脉里的瓣膜开口朝着心脏。按“让血倒流”，看看会怎样' : '选“静脉”', next: kind === 'vein' ? 'back' : 'pick' }
    : { hint: `选“${VESSELS[want!].name}”，看它的管壁、管腔和血流`, next: 'pick' }
  const v = kind ? VESSELS[kind] : null
  const labels: Label[] = [
    ...KINDS.map(k => ({ id: k, at: [VES_AT(k)[0] + VES[k].len / 2 + 0.15, VES_AT(k)[1], VES_AT(k)[2]] as [number, number, number], ax: 0, className: `scene-tag ${kind === k ? 'key' : ''} -translate-y-1/2`, children: VESSELS[k].name })),
    ...(kind === 'vein' && isCut ? [{ id: 'vv', at: [VES_AT('vein')[0] + 1.0, VES_AT('vein')[1] + VES.vein.R + 0.25, VES_AT('vein')[2]] as [number, number, number], ax: 0.5, className: 'scene-tag -translate-y-full', children: rev ? '静脉瓣合上了' : '静脉瓣' }] : []),
    { id: 'dir', at: [VES_AT('capillary')[0] + 0.8, VES_AT('capillary')[1] - 0.55, VES_AT('capillary')[2] - 0.2], ax: 0, name: true, className: 'scene-name', children: '箭头是血流的方向' },
    { id: 'mag', at: [VES_AT('capillary')[0] + 2.3, VES_AT('capillary')[1] + 0.3, VES_AT('capillary')[2]], ax: 0, name: true, className: 'scene-name', children: '都是放大的；毛细血管放大得更多' },
  ]
  return (
    <LabShell title="血液循环" lessons={LESSONS} current="2" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['2'], VOICE)} actionsLabel="血管"
      stage={<Place at="ves" labels={labels} want={{ ves: { cut: cut.k, hl: kind, rev } }} />}
      lesson={<LessonBlock no="2" title="三种血管" concept="毛细血管最细最薄，血流最慢" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <ul className="flex flex-col gap-2 text-[14px] text-white/80">
            {KINDS.map(k => <li key={k}><b className="text-white">{VESSELS[k].name}</b>：管壁{VESSELS[k].wall}；管腔{VESSELS[k].lumen}；血流{VESSELS[k].speed}；{VESSELS[k].flow}。</li>)}
          </ul>
          <p className="mt-3">四肢静脉里有<b className="text-white">静脉瓣</b>，开口朝着心脏，血往回流时合上，防止血倒流。</p>
          <p className="mt-3">毛细血管管壁只有一层上皮细胞，血流最慢，便于血液和组织细胞进行物质交换。</p>
          <p className="mt-3 text-[13.5px] text-white/65">在显微镜下看小鱼尾鳍：血从主干流向分支的是动脉，从分支汇集到主干的是静脉，红细胞单行通过的是毛细血管。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三种血管都看过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">动脉壁厚血流快，静脉有瓣膜，毛细血管最细最薄、血流最慢</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">毛细血管内径 {CAP_UM[0]}–{CAP_UM[1]} µm，红细胞只能 {singleFile(CAP_UM[0])} 个 {singleFile(CAP_UM[0])} 个地通过。</p>
          <p className="mt-2 text-[12.5px] text-white/50">三段血管都是放大的模型，毛细血管放大得更多；画面里的流速只表示快慢。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">正在看</div>
            <div className="mt-1 text-[34px] leading-none font-bold tracking-tight">{v ? v.name : '—'}</div>
            <div className="mt-2 text-[14px] text-white/70">{v ? v.flow : '选一段血管'}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="管壁" value={v ? v.wall.split('，')[0] : '—'} unit={v && v.wall.includes('，') ? v.wall.split('，')[1] : '厚薄'} />
            <ParamTile symbol="管腔" value={v ? v.lumen.split('，')[0] : '—'} unit="大小" />
            <ParamTile symbol="血流" value={v ? v.speed : '—'} unit="快慢" />
            <ParamTile symbol="瓣膜" value={kind === 'vein' ? '有' : v ? '没有' : '—'} unit={kind === 'vein' ? '静脉瓣' : '管腔里'} />
          </div>
          {kind === 'capillary' && <p className="hint-in mt-3 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] leading-relaxed text-white/75">内径 {CAP_UM[0]}–{CAP_UM[1]} µm，只允许红细胞单行通过；管壁只有一层上皮细胞。</p>}
          {kind !== 'capillary' && <p className="mt-3 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] leading-relaxed text-white/70">手背上一条条“青筋”是静脉。用手按住一端往心脏方向推，血推得动；反过来推不动：里面有静脉瓣。</p>}
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'cut'} pulse={next === 'cut'} onClick={() => cut.run()} disabled={cut.busy || isCut}>剖开血管</LabButton>
        <LabButton primary={next === 'back'} pulse={next === 'back'} onClick={back} disabled={kind !== 'vein' || rev || !isCut}>让血倒流</LabButton>
      </>}
      extras={
        <Control label="看哪一段">
          <Segmented label="看哪一段" pulse={next === 'pick'} want={next === 'pick' ? (want ?? 'vein') : null} disabled={!isCut || rev} value={kind ?? ('' as VesselKey)} onChange={k => pick(k as VesselKey)} options={KINDS.map(k => ({ value: k, label: VESSELS[k].name }))} />
        </Control>
      }
    />
  )
}
