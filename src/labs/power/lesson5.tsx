// 电功率和生活用电 · 第 5 课 家庭电路的组成：客厅。墙被透视开：进户线从楼道的电能表进来，到配电箱里的总开关、漏电保护器，
// 再分成照明、插座几路空气开关。照明这一路的火线先进墙上的开关，再到吸顶灯；插座这一路接到电视插座。合上总开关，开灯、开电视、再关灯，看各支路的电流。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { L5, U_HOME, amps } from './physics'
import { f2 } from './parts'
import { Big } from './views'
import { Place } from './world'
import { BACK, DB, H, LIV, type V3 } from './layout'
import { HouseWire } from './home'
import { BOX_ON, modX } from './panel'

const TASKS: Task[] = [
  { id: 'main', text: '合上配电箱里的总开关', note: '电从进户线经电能表、总开关进到家里' },
  { id: 'lamp', text: '按下墙上的开关，点亮吸顶灯', note: '开关接在火线和灯之间' },
  { id: 'tv', text: '打开电视', note: '两条支路的电流加起来就是干路电流' },
  { id: 'off', text: '关掉灯，看电视还亮不亮', note: '各用电器并联，互不影响' },
]
const Z = BACK + 0.2
/** 墙里的线：火线 L、零线 N、地线 PE 各一种颜色 */
const COL = { L: '#d23a2c', N: '#2f6fd0', PE: '#c9b81e' }
const bx = (k: string) => DB[0] + modX[k] * 0.1
const TOP = 25.6

export default function Lesson5() {
  const [main, setMain] = useState(false)
  const [lamp, setLamp] = useState(false)
  const [tv, setTv] = useState(false)
  const T = useTasks('gewu:power:5', TASKS)
  const iL = main && lamp ? amps(L5.lamp) : 0, iT = main && tv ? amps(L5.tv) : 0, iAll = iL + iT
  const toggleMain = () => { const m = !main; setMain(m); if (m) T.check(id => id === 'main') }
  const toggleLamp = () => { const l = !lamp; setLamp(l); if (l && main) T.check(id => id === 'lamp'); if (!l && main && tv && T.done.lamp && T.done.tv) T.check(id => id === 'off') }
  const toggleTv = () => { const t = !tv; setTv(t); if (t && main) T.check(id => id === 'tv') }
  const resetAll = () => { setMain(false); setLamp(false); setTv(false); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'main' | 'lamp' | 'tv' | null } = !task ? { hint: '家里的用电器都是并联的，各自独立工作。', next: null }
    : !main ? { hint: '电从楼道的电能表进到家里。先合上配电箱里的总开关', next: 'main' }
    : task.id === 'lamp' ? { hint: '按下墙上的开关，点亮吸顶灯', next: 'lamp' }
    : task.id === 'tv' ? { hint: '再打开电视', next: 'tv' }
    : lamp ? { hint: '关掉灯，看电视还亮不亮', next: 'lamp' } : { hint: '先开灯，再关灯', next: 'lamp' }

  // 墙里各根线的走向（场景坐标）
  const sw = LIV.sw, lampTop: V3 = [LIV.lamp[0], H - 0.3, LIV.lamp[2]], sock = LIV.tvSocket
  const top = DB[1] + 1.3, bot = DB[1] - 1.3
  const W = {
    inL: [[-100, TOP + 0.9, Z], [bx('main') - 0.1, TOP + 0.9, Z], [bx('main') - 0.1, top, Z]] as V3[],
    inN: [[-100, TOP + 0.5, Z], [bx('main') + 0.1, TOP + 0.5, Z], [bx('main') + 0.1, top, Z]] as V3[],
    swL: [[bx('light'), top, Z], [bx('light'), TOP, Z], [sw[0] + 0.25, TOP, Z], [sw[0] + 0.25, sw[1] + 0.5, Z]] as V3[],
    lampL: [[sw[0] - 0.25, sw[1] + 0.5, Z], [sw[0] - 0.25, TOP - 0.4, Z], [lampTop[0] - 0.2, TOP - 0.4, Z], [lampTop[0] - 0.2, H - 0.2, Z], [lampTop[0] - 0.2, H - 0.2, lampTop[2]]] as V3[],
    lampN: [[bx('light') + 0.3, top, Z], [bx('light') + 0.3, TOP - 0.8, Z], [lampTop[0] + 0.2, TOP - 0.8, Z], [lampTop[0] + 0.2, H - 0.25, Z], [lampTop[0] + 0.2, H - 0.25, lampTop[2]]] as V3[],
    sL: [[bx('socket'), bot, Z], [bx('socket'), 5.2, Z], [sock[0] + 0.1, 5.2, Z], [sock[0] + 0.1, sock[1] + 0.4, Z]] as V3[],
    sN: [[bx('socket') + 0.3, bot, Z], [bx('socket') + 0.3, 4.8, Z], [sock[0] - 0.1, 4.8, Z], [sock[0] - 0.1, sock[1] + 0.4, Z]] as V3[],
    sE: [[bx('socket') + 0.6, bot, Z], [bx('socket') + 0.6, 4.4, Z], [sock[0], 4.4, Z], [sock[0], sock[1] + 0.2, Z]] as V3[],
    tvL: [[sock[0], sock[1] + 0.5, Z], [sock[0], 6.4, Z], [LIV.tv[0] + 3, 6.4, Z], [LIV.tv[0] + 3, LIV.tv[1] - 3, Z]] as V3[],
  }
  const labels: Label[] = [
    { id: 'in', at: [-98, TOP + 1.6, Z], ax: 0, className: 'scene-tag -translate-y-full', children: <><small>进户线</small>来自楼道的电能表</> },
    { id: 'box', at: [DB[0], DB[1] + 1.9, DB[2]], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>配电箱</small>总开关 · 空气开关</> },
    { id: 'sw', at: [sw[0] + 1, sw[1] - 1.4, sw[2]], ax: 0, className: 'scene-tag transition-opacity', style: { opacity: main ? 1 : 0 }, children: <><small>开关</small>接在火线上</> },
    { id: 'iL', at: [lampTop[0], lampTop[1] - 2.2, lampTop[2]], ax: 0.5, className: 'scene-tag key transition-opacity', style: { opacity: iL ? 1 : 0 }, children: <><small>吸顶灯 {L5.lamp} W</small>{f2(iL)} A</> },
    { id: 'iT', at: [LIV.tv[0], LIV.tv[1] + 4.6, LIV.tv[2]], ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: iT ? 1 : 0 }, children: <><small>电视 {L5.tv} W</small>{f2(iT)} A</> },
    { id: 'sock', at: [sock[0] + 1, sock[1], sock[2]], ax: 0, className: 'scene-name -translate-y-1/2', name: true, children: '插座：左零右火上接地' },
  ]
  return (
    <LabShell title="电功率和生活用电" lessons={LESSONS} current="5" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['5'], VOICE)} actionsLabel="开关"
      stage={<Place at={main ? 'l5' : 'l5b'} labels={labels} world={{ lamp: main && lamp, tv: main && tv, box: { ...BOX_ON, main, rcd: true } }}>
        <HouseWire pts={W.inL} color={COL.L} flow={iAll} />
        <HouseWire pts={W.inN} color={COL.N} flow={-iAll} />
        <HouseWire pts={W.swL} color={COL.L} flow={iL} />
        <HouseWire pts={W.lampL} color={COL.L} flow={iL} />
        <HouseWire pts={W.lampN} color={COL.N} flow={-iL} />
        <HouseWire pts={W.sL} color={COL.L} flow={iT} />
        <HouseWire pts={W.sN} color={COL.N} flow={-iT} />
        <HouseWire pts={W.sE} color={COL.PE} />
        <HouseWire pts={W.tvL} color="#e8e6e0" r={0.12} />
      </Place>}
      lesson={<LessonBlock no="5" title="家庭电路的组成" concept="家里的用电器都是并联的" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>家庭电路由进户线、电能表、总开关、保险装置（空气开关或保险丝）、插座、灯和开关等组成。进户线有两根：火线和零线，它们之间的电压是 220 V。</p>
          <p className="mt-3"><b className="text-white">各用电器、插座之间是并联的</b>，一个关掉，别的照常工作；控制灯的开关和灯串联，并且<b className="text-white">接在火线上</b>，断开开关时灯上不带电。</p>
          <p className="mt-3 text-[13.5px] text-white/65">三孔插座“左零右火上接地”，上面那个孔接地线。干路电流等于各支路电流之和：0.16 A + 0.68 A ≈ 0.85 A。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">关了灯，电视照常亮着</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">家里的用电器是并联的，互不影响</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">干路电流等于各支路电流之和；控制灯的开关接在火线上。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          <Big label="干路电流" value={main ? f2(iAll) : '—'} unit="A" />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="I灯" value={f2(iL)} unit={`A · 吸顶灯 ${L5.lamp} W`} />
            <ParamTile symbol="I电视" value={f2(iT)} unit={`A · 电视 ${L5.tv} W`} />
          </div>
          <div className="mt-2"><ParamTile symbol="U" value={String(U_HOME)} unit="V · 火线和零线之间" /></div>
          <p className="mt-3 text-center font-formula text-[15px] italic text-white/65">I = I灯 + I电视，I = P / U</p>
          <p className="mt-2 text-center text-[13px] text-white/60"><span className="text-[#ff7a6a]">红：火线</span>　<span className="text-[#7fa8ff]">蓝：零线</span>　<span className="text-[#e3d04a]">黄绿：地线</span></p>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'main'} pulse={next === 'main'} onClick={toggleMain}>{main ? '断开总开关' : '合上总开关'}</LabButton>
        <LabButton pulse={next === 'lamp'} onClick={toggleLamp} disabled={!main}>{lamp ? '关灯' : '开灯'}</LabButton>
        <LabButton pulse={next === 'tv'} onClick={toggleTv} disabled={!main}>{tv ? '关电视' : '开电视'}</LabButton>
      </>}
      extras={null}
    />
  )
}
