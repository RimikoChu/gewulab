// 血液循环 · 第 3 课 心脏的结构：胸腔里的心脏，先看外面（冠状血管、连着的大血管），再剖开，逐个认四个腔和连着的血管，找两种瓣膜。
import { useEffect, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { CH_AT, VALVE_AT, beat, stubEnd } from './heart'
import { LESSONS, goLesson } from './lessons'
import { Place, useRun } from './parts'
import { BLOOD, CHAMBERS, L3_ORDER, thickest, type ChamberKey } from './physics'
import { onHeart } from './world'

const TASKS: Task[] = [
  { id: 'cut', text: '剖开心脏，数一数有几个腔', note: '心脏有四个腔：左心房、左心室、右心房、右心室' },
  { id: 'four', text: '逐个认出四个腔和连着的血管', note: '心房连静脉，心室连动脉' },
  { id: 'thick', text: '找出壁最厚的那个腔', note: '左心室的壁最厚：它要把血送到全身' },
  { id: 'valves', text: '找出房室瓣和动脉瓣', note: '房室瓣在心房和心室之间，动脉瓣在心室和动脉之间' },
]
/** 各腔连着的血管，标签挂在哪根血管的断口上 */
const VESSEL_TAG: Record<ChamberKey, { at: string; name: string }[]> = {
  ra: [{ at: 'svc', name: '上腔静脉' }, { at: 'ivc', name: '下腔静脉' }],
  rv: [{ at: 'pa', name: '肺动脉' }],
  la: [{ at: 'pv1', name: '肺静脉' }],
  lv: [{ at: 'aorta', name: '主动脉' }],
}

export default function Lesson3() {
  const [idx, setIdx] = useState(-1)
  const [valves, setValves] = useState(false)
  const T = useTasks('gewu:blood:3', TASKS)
  const cut = useRun(2.4, () => T.check(id => id === 'cut'))
  useEffect(() => { beat.mode = 'still'; return () => { beat.mode = 'auto' } }, [])
  const isCut = cut.k >= 1
  const focus: ChamberKey | null = idx >= 0 && !valves ? L3_ORDER[idx] : null
  const nextCh = () => {
    if (!isCut || idx >= 3) return
    const n = idx + 1; setIdx(n); setValves(false)
    if (n === 3) T.check(id => id === 'four' || (id === 'thick' && L3_ORDER[n] === thickest()))
  }
  const showValves = () => { if (idx < 3) return; setValves(true); T.check(id => id === 'valves') }
  const resetAll = () => { cut.snap(0); setIdx(-1); setValves(false); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'cut' | 'ch' | 'valves' | null } = !task ? { hint: '心房连静脉，心室连动脉；瓣膜让血只能从心房流向心室、从心室流向动脉。', next: null }
    : cut.busy ? { hint: '剖开心脏，前半边拿开…', next: null }
    : !isCut ? { hint: '心脏表面爬着冠状血管，黄色的是脂肪。按“剖开心脏”，看看里面', next: 'cut' }
    : idx < 3 ? { hint: idx < 0 ? '剖面上看得见四个空腔。按“看下一个腔”，一个一个认' : `这是${CHAMBERS[L3_ORDER[idx]].name}。再按“看下一个腔”`, next: 'ch' }
    : { hint: '四个腔都认过了。按“看瓣膜”，找心房和心室之间、心室和动脉之间的瓣膜', next: 'valves' }
  const labels: Label[] = [
    ...(isCut ? L3_ORDER.map(k => ({ id: k, at: onHeart(CH_AT[k]), ax: 0.5, className: `scene-tag ${focus === k ? 'key' : ''} -translate-y-1/2 transition-opacity`, style: { opacity: focus && focus !== k ? 0.55 : 1 }, children: CHAMBERS[k].name })) : []),
    ...(focus ? VESSEL_TAG[focus].map(v => ({ id: `v${v.at}`, at: onHeart(stubEnd(v.at)), ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>连着</small>{v.name}</> })) : []),
    ...(valves ? [
      { id: 'avR', at: onHeart([VALVE_AT.avR[0] - 0.9, VALVE_AT.avR[1], 0]), ax: 1, className: 'scene-tag key -translate-y-1/2', children: '房室瓣' },
      { id: 'avL', at: onHeart([VALVE_AT.avL[0] + 0.9, VALVE_AT.avL[1], 0]), ax: 0, className: 'scene-tag key -translate-y-1/2', children: '房室瓣' },
      { id: 'sl', at: onHeart([VALVE_AT.slA[0] + 0.1, VALVE_AT.slA[1] + 0.9, 0]), ax: 0, className: 'scene-tag key -translate-y-1/2', children: '动脉瓣' },
    ] : []),
    { id: 'n1', at: onHeart([-4.6, -3.6, 0.5]), ax: 1, name: true, className: 'scene-name', children: '心脏 · 和拳头差不多大' },
    { id: 'n2', at: onHeart([1.6, -1.2, 2.6]), ax: 0, name: true, className: 'scene-name', children: '冠状血管' },
  ]
  const ch = focus ? CHAMBERS[focus] : null
  return (
    <LabShell title="血液循环" lessons={LESSONS} current="3" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="心脏"
      stage={<Place at="heart" labels={labels} want={{ look: { shell: 0.12, lungs: 0, tree: 0 }, heart: { cut: cut.k, focus: valves ? 'valves' : focus }, stream: 'none' }} />}
      lesson={<LessonBlock no="3" title="心脏的结构" concept="心脏有四个腔，心房连静脉，心室连动脉" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>心脏主要由<b className="text-white">心肌</b>构成，能够收缩和舒张。它有四个腔：上面两个是<b className="text-white">心房</b>，下面两个是<b className="text-white">心室</b>。</p>
          <p className="mt-3">同侧的心房和心室相通，左右两侧不相通。心房连着静脉，心室连着动脉：右心房连上、下腔静脉，右心室连肺动脉，左心房连肺静脉，左心室连主动脉。</p>
          <p className="mt-3">四个腔里左心室的壁最厚，因为它要把血一直送到全身。心房和心室之间有<b className="text-white">房室瓣</b>，心室和动脉之间有<b className="text-white">动脉瓣</b>。</p>
          <p className="mt-3 text-[13.5px] text-white/65">剖面按课本上的四腔图摆：从正面看，心脏的左右和你的左右相反。真实心脏的左心房在后面，一刀切不全四个腔。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四个腔、两种瓣膜都找到了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">心房连静脉，心室连动脉；左心室的壁最厚</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">右心房 — 上、下腔静脉；右心室 — 肺动脉；左心房 — 肺静脉；左心室 — 主动脉。房室瓣和动脉瓣只朝一个方向开。</p>
          <p className="mt-2 text-[12.5px] text-white/50">画面里的剖面按课本的四腔图摆，和真实解剖略有出入。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{valves ? '瓣膜' : '正在看的腔'}</div>
            <div className="mt-1 text-[34px] leading-none font-bold tracking-tight">{valves ? '房室瓣 · 动脉瓣' : ch ? ch.name : isCut ? '四个腔' : '—'}</div>
            <div className="mt-2 text-[14px] text-white/70">{valves ? '只朝一个方向开' : ch ? `连着${ch.vessel}（${ch.kind}）` : isCut ? '中间有一道隔，左右不相通' : '先剖开看看'}</div>
          </div>
          <table className="mt-4 w-full text-center text-[13px]">
            <thead><tr className="text-white/55"><th className="pb-1 font-medium">腔</th><th className="pb-1 font-medium">连着</th><th className="pb-1 font-medium">里面的血</th></tr></thead>
            <tbody>{L3_ORDER.map((k, i) => <tr key={k} className={k === focus ? 'row-in bg-white/10' : 'bg-white/[0.04]'}>
              <td className="rounded-l-lg px-1 py-1.5 font-semibold">{CHAMBERS[k].name}</td>
              <td className="px-1 py-1.5">{i <= idx ? CHAMBERS[k].vessel : '—'}</td>
              <td className={`rounded-r-lg px-1 py-1.5 ${i <= idx ? (CHAMBERS[k].blood === 'artery' ? 'text-[#ff8a8f]' : 'text-[#8fb0ff]') : ''}`}>{i <= idx ? BLOOD[CHAMBERS[k].blood].name : '—'}</td>
            </tr>)}</tbody>
          </table>
          <p className="mt-3 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] leading-relaxed text-white/70">血管按里面的血上色：红的是动脉血，蓝的是静脉血。</p>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'cut'} pulse={next === 'cut'} onClick={() => cut.run()} disabled={cut.busy || isCut}>剖开心脏</LabButton>
        <LabButton primary={next === 'ch'} pulse={next === 'ch'} onClick={nextCh} disabled={!isCut || idx >= 3}>看下一个腔</LabButton>
        <LabButton primary={next === 'valves'} pulse={next === 'valves'} onClick={showValves} disabled={idx < 3 || valves}>看瓣膜</LabButton>
      </>}
      extras={null}
    />
  )
}
