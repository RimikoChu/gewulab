// 光的波动性和光电效应 · 第 5 课 绕过去，和只朝一个方向振动（光的衍射和偏振）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { Beam, Dark, Fan, Laser, Pattern, Rail, SCREEN, Screen, Shaft, SlideBox, useSpace } from './gear'
import { LESSONS, TITLE, goLesson } from './lessons'
import { NARRATION } from './narration'
import { L5, LIGHTS, SLITS, analyzer, centralWidth, fringeGap, singleSlitI } from './physics'
import { LampHouse } from './rig'
import { FringeView } from './views'
import { VOICE } from './voice'
import { JawSlit, Polarizer } from './wave'
import { AX, ST } from './world'

type Mode = 'slit' | 'pol'
const X0 = ST.wave, PER_M = 2.6, XL = X0 - 2.2, XS = X0 - 1.55, XE = XS + L5 * PER_M
const XP = { lamp: X0 - 2.45, p: X0 - 1.25, q: X0 - 0.1 }
const { nm, hex } = LIGHTS.red, WHITE = '#fff0d8'
const W = (a: number) => centralWidth(L5, nm, a)
const TASKS: Task[] = [
  { id: 'slit:0.4', text: '激光穿过 0.40 mm 宽的单缝，记下中央亮纹的宽度', note: `${W(0.4).toFixed(1)} mm：中间一条最宽最亮，两边还有较暗的亮纹` },
  { id: 'slit:0.1', text: '把缝调窄到 0.10 mm，再记一次', note: `${W(0.1).toFixed(1)} mm：缝越窄，光散得越开` },
  { id: 'pol:0', text: '换成两片偏振片，透振方向平行，记下屏上的亮度', note: '最亮：过了第一片的光都能过第二片' },
  { id: 'pol:90', text: '把第二片转 90°，再记一次', note: '全暗：一片只让一个方向的振动过去' },
]

export default function Lesson5() {
  const [mode, setMode] = useState<Mode>('slit')
  const [a, setA] = useState<number>(SLITS[0])
  const [ang, setAng] = useState(0)
  const [rows, setRows] = useState<string[]>([])
  const T = useTasks('gewu:light:5', TASKS)
  const aa = useSlide(a, 0.12), deg = useSlide(ang, 50), steady = aa === a && deg === ang
  const key = mode === 'slit' ? `slit:${a}` : `pol:${ang}`, dup = rows.includes(key)
  const record = () => { if (!steady || dup) return; const next = [...rows, key]; setRows(next); T.check(k => next.includes(k)) }
  useSpace(record)
  const resetAll = () => { setMode('slit'); setA(SLITS[0]); setAng(0); setRows([]); T.reset() }
  const task = T.current, [tm, tv] = (task?.id ?? ':').split(':')
  const { hint, next }: { hint: string; next: 'mode' | 'a' | 'ang' | 'record' | null } = !task ? { hint: '都做完了。衍射说明光是波，偏振说明光是横波。', next: null }
    : mode !== tm ? { hint: tm === 'pol' ? '把器材换成“偏振片”' : '把器材换成“单缝”', next: 'mode' }
    : tm === 'slit' && a !== Number(tv) ? { hint: Number(tv) < a ? '按“把缝调窄”' : '按“把缝调宽”', next: 'a' }
    : tm === 'pol' && ang !== Number(tv) ? { hint: Number(tv) ? '按“把第二片转 90°”' : '按“把第二片转回去”', next: 'ang' }
    : !steady ? { hint: tm === 'slit' ? '缝在变…' : '偏振片在转…', next: null }
    : { hint: tm === 'slit' ? '读出中央亮纹的宽度，按“记录”' : '看屏上的光斑有多亮，按“记录”', next: 'record' }
  const bright = analyzer(deg), slit = mode === 'slit'
  const labels: Label[] = slit ? [
    { id: 'laser', at: [XL - 0.3, AX + 0.3, 0], ax: 0.2, name: true, className: 'scene-name -translate-y-full', children: `激光器 · 红光 ${nm} nm` },
    { id: 'a', at: [XS, AX + 0.42, 0], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>缝宽 a</small>{aa.toFixed(2)} mm</> },
    { id: 'w', at: [XE - 0.02, AX + 0.5, 0], ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>中央亮纹宽</small>{W(aa).toFixed(1)} mm</> },
  ] : [
    { id: 'lamp', at: [XP.lamp, AX + 0.5, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '白炽灯（自然光）' },
    { id: 'p', at: [XP.p, AX + 0.46, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '第一片（起偏器）' },
    { id: 'q', at: [XP.q, AX + 0.46, 0], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>第二片转过</small>{deg.toFixed(0)}°</> },
    { id: 'b', at: [XE - 0.02, AX + 0.5, 0], ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>屏上亮度</small>{(bright * 100).toFixed(0)}%</> },
  ]
  return (
    <LabShell narration={voiced(NARRATION['5'], VOICE)} title={TITLE} lessons={LESSONS} current="5" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={slit ? '可调单缝' : '偏振片'}
      stage={<Dark at="wave" dx={-0.45} dy={0.12} span={[4.6, 2.35]} view={[-0.72, 0.25]} lamp={60} labels={labels}>
        <Rail x0={X0 - 3.4} x1={X0 + 2.2} perM={PER_M} />
        <SlideBox x={X0 - 0.9} z={0.95} />
        {slit ? <>
          <Laser x={XL} color={hex} />
          <Beam a={[XL, AX, 0]} b={[XS - 0.008, AX, 0]} color={hex} />
          <JawSlit x={XS} a={aa} spot={hex} />
          <Fan x0={XS} x1={XE} half={Math.min(SCREEN.w / 2, W(aa) / 2 / SCREEN.mm * SCREEN.w / 2 * 1.6)} color={hex} />
          <Screen x={XE}><Pattern mode="single" color={hex} env={fringeGap(L5, nm, aa)} gain={1.25} /></Screen>
          <pointLight position={[XE - 0.5, AX, 0]} intensity={0.8} distance={3.2} decay={1.6} color={hex} />
        </> : <>
          <LampHouse x={XP.lamp} />
          <Shaft a={[XP.lamp + 0.41, AX, 0]} b={[XP.p, AX, 0]} r={0.1} color={WHITE} k={1.8} />
          <Polarizer x={XP.p} deg={0} />
          <Shaft a={[XP.p, AX, 0]} b={[XP.q, AX, 0]} r={0.1} color={WHITE} k={0.9} />
          <Polarizer x={XP.q} deg={deg} lit={bright} />
          <Shaft a={[XP.q, AX, 0]} b={[XE, AX, 0]} r={0.1} color={WHITE} k={0.9 * bright} />
          <Screen x={XE}><Pattern mode="spot" color={WHITE} env={3.4} gain={bright * 0.9} /></Screen>
          <pointLight position={[XE - 0.5, AX, 0]} intensity={0.7 * bright} distance={3.2} decay={1.6} color={WHITE} />
        </>}
      </Dark>}
      lesson={<LessonBlock no="5" title="光的衍射和偏振" concept="衍射说明光是波，偏振说明光是横波" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p><b className="text-white">衍射</b>：光通过很窄的缝时，不再沿直线走，会绕到缝的“影子”里去，在屏上散成一片，中央亮纹最宽最亮，两侧是较窄较暗的亮纹。缝越窄，衍射越明显。</p>
          <p className="mt-2 text-[14px] text-white/80">这套器材里，中央亮纹的宽度是 2<i>L</i>λ/<i>a</i>（<i>a</i> 是缝宽）。</p>
          <p className="mt-3"><b className="text-white">偏振</b>：光是横波，振动方向垂直于传播方向。白炽灯发出的自然光里各个方向的振动都有；偏振片只让沿它透振方向的振动通过。</p>
          <ul className="mt-2 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>两片的透振方向平行，过了第一片的光都能过第二片：最亮</li>
            <li>两片的透振方向垂直，过了第一片的光过不了第二片：全暗</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">只有横波才有偏振现象。屏上亮度是和两片平行时相比的。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四次都记完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">缝越窄光散得越开；两片偏振片垂直时光过不去</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">缝宽从 0.40 mm 调到 0.10 mm，中央亮纹从 {W(0.4).toFixed(1)} mm 变宽到 {W(0.1).toFixed(1)} mm。衍射是波特有的现象，偏振说明光是横波。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          {slit ? <>
            <div className="text-center">
              <div className="text-[13px] text-white/60">中央亮纹的宽度</div>
              <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{W(aa).toFixed(1)}<span className="ml-1 text-[15px] font-medium text-white/55">mm</span></div>
            </div>
            <FringeView I={x => singleSlitI(x, L5, nm, aa)} hex={hex} />
            <div className="mt-3 grid grid-cols-3 gap-2">
              <ParamTile symbol="λ" value={String(nm)} unit="nm · 波长" />
              <ParamTile symbol="a" value={aa.toFixed(2)} unit="mm · 缝宽" />
              <ParamTile symbol="L" value={L5.toFixed(2)} unit="m · 屏距" />
            </div>
          </> : <>
            <div className="text-center">
              <div className="text-[13px] text-white/60">屏上的亮度（和两片平行时比）</div>
              <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{(bright * 100).toFixed(0)}<span className="ml-1 text-[15px] font-medium text-white/55">%</span></div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <ParamTile symbol="夹角" value={`${deg.toFixed(0)}°`} unit="两片透振方向的夹角" />
              <ParamTile symbol="光斑" value={bright > 0.98 ? '最亮' : bright < 0.02 ? '全暗' : '变暗'} unit={bright < 0.02 ? '光过不了第二片' : '过了第一片的光再过第二片'} />
            </div>
          </>}
          <h2 className="mt-5 text-[12.5px] text-white/55">数据表</h2>
          {rows.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">单缝记两次，偏振片记两次。</p>
            : <table className="mt-1 w-full text-[13.5px]">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">器材</th><th className="font-normal">条件</th><th className="text-right font-normal">结果</th></tr></thead>
                <tbody>{rows.map(k => { const [m, v] = k.split(':'); return <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{m === 'slit' ? '单缝' : '偏振片'}</td><td className="text-white/80 tabular-nums">{m === 'slit' ? `缝宽 ${Number(v).toFixed(2)} mm` : `夹角 ${v}°`}</td><td className="text-right font-semibold text-[#7fe3d4] tabular-nums">{m === 'slit' ? `亮纹宽 ${W(Number(v)).toFixed(1)} mm` : `亮度 ${(analyzer(Number(v)) * 100).toFixed(0)}%`}</td></tr> })}</tbody>
              </table>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'a'} onClick={() => setA(v => v === SLITS[0] ? SLITS[1] : SLITS[0])} disabled={!slit || !steady}>{a === SLITS[0] ? '把缝调窄' : '把缝调宽'}</LabButton>
        <LabButton pulse={next === 'ang'} onClick={() => setAng(v => v ? 0 : 90)} disabled={slit || !steady}>{ang ? '把第二片转回去' : '把第二片转 90°'}</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={!steady || dup}>记录</LabButton>
      </>}
      extras={<Control label="器材"><Segmented label="器材" pulse={next === 'mode'} want={next === 'mode' ? tm as Mode : null} value={mode} onChange={setMode} options={[{ value: 'slit', label: '单缝' }, { value: 'pol', label: '偏振片' }]} /></Control>}
    />
  )
}
