// 电路 · 第 2 课 串联和并联：长工作台上，一只电池盒、一只开关、两只规格不同的小灯泡 L₁、L₂。
// 串联：闭合开关两只灯都亮，拧下 L₁，L₂ 也灭了（只有一条路）。并联：两只灯各在一条支路上，拧下 L₁，L₂ 照常亮。
// 换连接方式时，先断开开关、装回灯泡、拆掉导线，两只灯挪到新位置，再重新连好。
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { add } from './gear'
import { LESSONS, goLesson } from './lessons'
import { Bench, Place, toWorld } from './parts'
import { LINK_NAME, twoLamps, type Link } from './physics'
import { BAT, LAMPS, SW, TwoLampRig } from './rig'
import { Schematic } from './views'
import type { V3 } from './world'

const TASKS: Task[] = [
  { id: 's_on', text: '串联：闭合开关，看两只灯', note: '串联：电流只有一条路，依次经过 L₂、L₁' },
  { id: 's_out', text: '拧下 L₁，看 L₂', note: '串联电路里一处断开，整个电路就没有电流：各用电器互相影响' },
  { id: 'p_on', text: '换成并联，闭合开关', note: '并联：电流在分支处分成两股，各走一条支路，到汇合处再合起来' },
  { id: 'p_out', text: '再拧下 L₁，看 L₂', note: '并联电路里各支路互不影响：拧下 L₁，L₂ 照常亮' },
]
const W = (p: V3) => toWorld('l2', p)

export default function Lesson2() {
  const [link, setLink] = useState<Link>('series')
  const [on, setOn] = useState(false)
  const [out, setOut] = useState(false)
  const T = useTasks('gewu:circuit:2', TASKS)
  const move = useSlide(link === 'parallel' ? 1 : 0, 1.1)
  const wired = move === (link === 'parallel' ? 1 : 0)
  const knife = useSlide(on ? 1 : 0, 2.6)
  const outK = useSlide(out ? 1 : 0, 0.8)
  const c = twoLamps(link, true, out ? 'L1' : null)
  const live = knife > 0.99 && wired && (outK < 0.02 || outK > 0.98)
  useEffect(() => {
    if (!live) return
    if (link === 'series' && !out) T.check(id => id === 's_on')
    if (link === 'series' && out && T.done.s_on) T.check(id => id === 's_out')
    if (link === 'parallel' && !out && T.done.s_out) T.check(id => id === 'p_on')
    if (link === 'parallel' && out && T.done.p_on) T.check(id => id === 'p_out')
  }, [live, link, out])   // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (l: Link) => { if (l === link) return; setOn(false); setOut(false); setLink(l) }
  const resetAll = () => { setLink('series'); setOn(false); setOut(false); T.reset() }
  const task = T.current
  const busy = !wired || (outK > 0.02 && outK < 0.98)
  const want: Link | null = task?.id === 'p_on' && link === 'series' ? 'parallel' : null
  const { hint, next }: { hint: string; next: 'sw' | 'out' | 'link' | null } = !task ? { hint: '串联只有一条路，互相影响；并联有几条路，互不影响。', next: null }
    : busy ? { hint: wired ? '正在拧…' : '断开开关，重新连导线…', next: null }
    : task.id === 's_on' ? (out ? { hint: '先把 L₁ 装回去', next: 'out' } : { hint: '两只灯首尾相接，连成一条路。按“闭合开关”', next: 'sw' })
    : task.id === 's_out' ? { hint: '两只灯都亮了，但不太亮。按“拧下 L₁”，看 L₂', next: 'out' }
    : task.id === 'p_on' ? (link === 'series' ? { hint: 'L₁ 一拧下，L₂ 也灭了。把连接方式换成“并联”', next: 'link' } : { hint: '两只灯各在一条支路上。按“闭合开关”', next: 'sw' })
    : { hint: '两只灯都比串联时亮。按“拧下 L₁”，看 L₂', next: 'out' }
  const L = LAMPS[link]
  const labels: Label[] = [
    { id: 'n1', at: W(add(L.L1, [link === 'series' ? 0 : -4.5, 4.6, 0])), ax: link === 'series' ? 0.5 : 1, name: true, className: 'scene-name -translate-y-full', children: 'L₁' },
    { id: 'n2', at: W(add(L.L2, [link === 'series' ? 0 : -4.5, 4.6, 0])), ax: link === 'series' ? 0.5 : 1, name: true, className: 'scene-name -translate-y-full', children: 'L₂' },
    { id: 'n3', at: W(add(BAT, [0, 4.8, 0])), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '电池盒' },
    { id: 'n4', at: W(add(SW, [0, 3.6, 0])), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '开关' },
    { id: 'L2s', at: W(add(L.L2, [4, 3.4, 0])), ax: 0, className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: live && out ? 1 : 0 }, children: <><small>L₂</small>{c.b2 > 0 ? '还亮着' : '灭了'}</> },
  ]
  return (
    <LabShell title="电路" lessons={LESSONS} current="2" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="电路"
      stage={<Place at="l2" labels={labels}>
        <Bench at="l2"><TwoLampRig link={link} c={live ? c : twoLamps(link, false)} knife={knife} out={outK} move={move} wired={wired} /></Bench>
      </Place>}
      lesson={<LessonBlock no="2" title="串联和并联" concept="串联一条路，并联几条路" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>把元件逐个顺次连接起来，就是<b className="text-white">串联</b>。串联电路中电流只有一条路径，各用电器互相影响：一个断了，其他的也不工作。开关放在哪里都控制整个电路。</p>
          <p className="mt-3">把元件并列地连接起来，就是<b className="text-white">并联</b>。并联电路中有干路和支路，各支路的用电器互不影响。干路上的开关控制整个电路，支路上的开关只控制它所在的那条支路。</p>
          <p className="mt-3 text-[13.5px] text-white/65">看灯亮不亮、亮不亮得一样，不能判断是串联还是并联；拆下一只看另一只，才判断得出来。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">串联、并联都试过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">串联只有一条路，各用电器互相影响；并联各支路互不影响</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">串联时拧下 L₁，L₂ 跟着灭；并联时拧下 L₁，L₂ 照常亮。家里的电灯、插座都是并联的。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">电流的路径</div>
            <div className="mt-1 text-[44px] leading-none font-bold tracking-tight tabular-nums">{c.paths}<span className="ml-1 text-[16px] font-medium text-white/55">条</span></div>
            <div className="mt-1.5 text-[13px] text-white/55">{LINK_NAME[link]}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="L₁" value={!live ? '—' : out ? '拧下' : c.b1 > 0 ? '亮' : '不亮'} unit="小灯泡" />
            <ParamTile symbol="L₂" value={!live ? '—' : c.b2 > 0 ? '亮' : '不亮'} unit="小灯泡" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">电路图</h2>
          <Schematic link={link} on={on} lit1={live ? c.b1 : 0} lit2={live ? c.b2 : 0} off={out ? 'L1' : null} hot={{ main: live && c.I > 0, b1: live && c.I1 > 0, b2: live && c.I2 > 0 }} />
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'sw'} pulse={next === 'sw'} onClick={() => setOn(o => !o)} disabled={busy}>{on ? '断开开关' : '闭合开关'}</LabButton>
        <LabButton primary={next === 'out'} pulse={next === 'out'} onClick={() => setOut(o => !o)} disabled={busy}>{out ? '装回 L₁' : '拧下 L₁'}</LabButton>
      </>}
      extras={
        <Control label="连接方式">
          <Segmented label="连接方式" pulse={next === 'link'} want={want} disabled={busy} value={link} onChange={pick} options={(['series', 'parallel'] as Link[]).map(l => ({ value: l, label: LINK_NAME[l] }))} />
        </Control>
      }
    />
  )
}
