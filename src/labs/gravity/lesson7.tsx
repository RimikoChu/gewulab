// 万有引力与航天 · 第 7 课 卫星变轨（近地圆轨道 → 椭圆转移轨道 → 同步圆轨道，在近地点、远地点各加速一次）
import { useEffect, useRef, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Scene7, { type Phase } from './scene7'
import { LESSONS, goLesson } from './lessons'
import { GEO_R, ORBITS, circT, ellipseSpeed, height, km, transfer, transferPos } from './physics'
import { NARRATION } from './narration'
import { VOICE } from './voice'

const TASKS: Task[] = [
  { id: 'launch', text: '点火发射，把卫星送进近地圆轨道', note: '卫星在近地圆轨道上，速度 7.71 km/s' },
  { id: 'perigee', text: '在近地点点火加速，进入转移轨道', note: '加速 2.42 km/s：速度大了，卫星飞离圆轨道，沿椭圆越飞越高、越飞越慢' },
  { id: 'apogee', text: '到远地点再点火加速，进入同步轨道', note: '远地点只剩 1.61 km/s，再加速 1.46 km/s，就在同步轨道上转圆了' },
]
/** 画面时间：发射段按真实时间；太空里近地轨道 1 秒 = 2000 秒，转移轨道 1 秒 = 1200 秒 */
const SIM_LEO = 2000, SIM_TR = 1200
const tr = transfer()

export default function Lesson7() {
  const [phase, setPhase] = useState<Phase>('pad')
  const [rise, setRise] = useState(0)
  const [ang, setAng] = useState(1.2)               // 圆轨道上的角度
  const [frac, setFrac] = useState(0)               // 转移轨道上过近地点后的时间（以转移轨道周期计）
  const [theta0, setTheta0] = useState(0)
  const [burn, setBurn] = useState(0)
  const T = useTasks('gewu:gravity:7', TASKS)
  const live = useRef({ phase, ang, frac }); live.current = { phase, ang, frac }
  // 一个循环推动全部运动
  useEffect(() => {
    let raf = 0, last = performance.now(), t0 = performance.now()
    const f = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const L = live.current
      if (L.phase === 'launch') {
        const t = (now - t0) / 1000
        setRise(1.5 * t * t + 0.4 * t ** 3)
        if (t > 6.5) { setPhase('leo'); T.check(id => id === 'launch') }
      } else t0 = now
      if (L.phase === 'leo') setAng(a => a + 2 * Math.PI * dt * SIM_LEO / circT(ORBITS.leo.r))
      if (L.phase === 'geo') setAng(a => a + 2 * Math.PI * dt * SIM_LEO / circT(GEO_R))
      if (L.phase === 'transfer') setFrac(x => Math.min(0.62, x + dt * SIM_TR / (2 * tr.half)))
      setBurn(b => Math.max(0, b - dt * 0.8))
      raf = requestAnimationFrame(f)
    }
    raf = requestAnimationFrame(f)
    return () => cancelAnimationFrame(raf)
  }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  const atApogee = phase === 'transfer' && Math.abs(frac - 0.5) < 0.05
  // 卫星的位置（m，地心为原点，xz 平面里写成 [x, y]）
  const sat: [number, number] = (() => {
    if (phase === 'transfer') { const [x, y] = transferPos(frac), c = Math.cos(theta0), s = Math.sin(theta0); return [x * c - y * s, x * s + y * c] }
    const r = phase === 'geo' ? GEO_R : ORBITS.leo.r
    return [Math.cos(ang) * r, Math.sin(ang) * r]
  })()
  const r = Math.hypot(...sat)
  const v = phase === 'transfer' ? ellipseSpeed(tr.a, r) : phase === 'geo' ? tr.c2 : tr.c1
  const launch = () => { if (phase === 'pad') setPhase('launch') }
  const fire = () => {
    if (phase === 'leo') { setTheta0(((ang % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)); setFrac(0); setPhase('transfer'); setBurn(1); T.check(id => id === 'perigee') }
    else if (atApogee) { setAng(theta0 + Math.PI); setPhase('geo'); setBurn(1); T.check(id => id === 'apogee') }
  }
  const resetAll = () => { setPhase('pad'); setRise(0); setAng(1.2); setFrac(0); setBurn(0); T.reset() }
  const missed = phase === 'transfer' && frac > 0.555

  const { hint, next }: { hint: string; next: 'launch' | 'fire' | null } = (() => {
    if (phase === 'pad') return { hint: '点火发射', next: 'launch' }
    if (phase === 'launch') return { hint: '火箭升空…', next: null }
    if (phase === 'leo') return { hint: '卫星在近地圆轨道上：在这里点火加速', next: 'fire' }
    if (phase === 'transfer') return missed ? { hint: '错过了远地点：按“重做本课”再来', next: null } : atApogee ? { hint: '到远地点了：再点火加速', next: 'fire' } : { hint: '沿椭圆往上飞：等它到远地点', next: null }
    return { hint: '都做完了。卫星在同步轨道上，速度反而比近地轨道小。', next: null }
  })()
  const ground = phase === 'pad' || phase === 'launch'

  return (
    <LabShell narration={voiced(NARRATION['7'], VOICE)} title="万有引力与航天" lessons={LESSONS} current="7" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="发动机"
      stage={<Scene7 phase={phase} rise={rise} fire={phase === 'launch' ? 1 : 0} sat={sat} theta0={theta0} burn={burn} speedText={`${km(v).toFixed(2)} km/s`} />}
      lesson={<LessonBlock no="7" title="卫星变轨" concept="两次加速，卫星从低轨道换到高轨道" tasks={TASKS} done={T.done} current={T.current?.id}
        theory={<>
          <p>同步卫星一般不直接送到 3.6 万千米高。先进入近地圆轨道，再分两步：</p>
          <ul className="mt-2 flex flex-col gap-1.5 text-[14px] text-white/85">
            <li><b className="text-[#7fe3d4]">近地点加速：</b>速度比圆轨道需要的大，万有引力不够提供向心力，卫星做离心运动，进入椭圆转移轨道。</li>
            <li><b className="text-[#7fe3d4]">沿椭圆上升：</b>离地球越远，引力做负功，速度越来越小（开普勒第二定律）。</li>
            <li><b className="text-[#7fe3d4]">远地点再加速：</b>速度增大到同步轨道需要的值，就在高圆轨道上运行。</li>
          </ul>
          <p className="mt-2">两次都是加速，但到了高轨道，速度（3.07 km/s）反而比近地轨道（7.71 km/s）小。</p>
          <p className="mt-3 text-[13.5px] text-white/65">火箭外形、发射场是示意；转移轨道画在赤道面里，没有画轨道倾角。太空里的运动加快了。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="px-6 py-5">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">卫星进入同步轨道了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">近地点加速进入转移轨道，远地点再加速进入高轨道</p>
          <p className="mt-2 text-[14px] leading-relaxed text-white/70">速度 7.71 → 10.13 km/s（第一次加速），沿椭圆减到 1.61 km/s，再加速到 3.07 km/s。</p>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{ground ? '火箭' : '卫星此刻的速度'}</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{ground ? (phase === 'pad' ? '待发射' : '升空') : km(v).toFixed(2)}{!ground && <span className="ml-1 text-[15px] font-medium text-white/55">km/s</span>}</div>
            {!ground && <div className="mt-2 text-[14px] text-white/70 tabular-nums">离地面 {Math.round(km(height(r))).toLocaleString()} km</div>}
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">两次点火</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="Δv₁" value={T.done.perigee ? `+${km(tr.dv1).toFixed(2)}` : '—'} unit="km/s · 近地点" />
            <ParamTile symbol="Δv₂" value={T.done.apogee ? `+${km(tr.dv2).toFixed(2)}` : '—'} unit="km/s · 远地点" />
          </div>
          <table className="mt-4 w-full text-[13.5px] tabular-nums">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">位置</th><th className="text-right font-normal">速度 km/s</th></tr></thead>
            <tbody>
              <tr className="border-t border-white/12"><td className="py-1.5 text-white/80">近地圆轨道</td><td className="text-right">{km(tr.c1).toFixed(2)}</td></tr>
              {T.done.perigee && <tr className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">近地点（加速后）</td><td className="text-right text-[#ffb347]">{km(tr.vp).toFixed(2)}</td></tr>}
              {T.done.perigee && <tr className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">远地点（加速前）</td><td className="text-right text-[#ffb347]">{km(tr.va).toFixed(2)}</td></tr>}
              {T.done.apogee && <tr className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">同步圆轨道</td><td className="text-right font-semibold text-[#ffd27a]">{km(tr.c2).toFixed(2)}</td></tr>}
            </tbody>
          </table>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'launch'} onClick={launch} disabled={phase !== 'pad'}>点火发射</LabButton>
        <LabButton primary pulse={next === 'fire'} onClick={fire} disabled={!(phase === 'leo' || atApogee)}>点火加速</LabButton>
      </>}
      extras={null}
    />
  )
}
