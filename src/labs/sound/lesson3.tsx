// 声现象 · 第 3 课 声音跑得有多快（声速；回声；用回声测距离）：一座音乐厅的缩尺模型，对着远处的墙拍一下手
import { useEffect, useMemo, useState } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { Metal, lathe, useSlide, useTasks, type Label } from '@/lab-kit'
import { ENV, Hall, P, Readout, useWood } from './gear'
import { LESSONS, goLesson } from './lessons'
import { ECHO_GAP, SLOW, V_AIR, V_STEEL, V_WATER, WALLS, canTell, echoDistance, echoTime, frontAt } from './physics'

type D = '17' | '34' | '68'
const TASKS: Task[] = WALLS.map(d => ({ id: String(d), text: `墙在 ${d} m 处：拍一下手，等回声回来，记录`, note: `回声晚到 ${echoTime(d).toFixed(1)} s：声音走了 ${2 * d} m 的来回` }))
/** 模型上 1 m 画多长；拍手的人站在哪 */
const M = 0.085, XS = -2.7, FLOOR = 0.1
const PAWN = lathe([[0, 0], [0.12, 0], [0.13, 0.02], [0.13, 0.05], [0.07, 0.09], [0.055, 0.26], [0.08, 0.3], [0.045, 0.33], [0.085, 0.39], [0.085, 0.45], [0.05, 0.5], [0, 0.51]], { segs: 28 })
const KNOB = lathe([[0, 0], [0.03, 0], [0.03, 0.05], [0.07, 0.08], [0.07, 0.12], [0.04, 0.15], [0, 0.15]], { segs: 20 })

/** 模型地板前沿的标尺：0 到 70 m，每米一道刻线，每 10 m 一个数 */
function makeScale() {
  const W = 2048, H = 64, c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!, px = W / 72
  g.fillStyle = '#f2efe4'; g.fillRect(0, 0, W, H); g.fillStyle = '#1c2024'; g.textAlign = 'center'; g.font = '600 30px sans-serif'
  for (let m = 0; m <= 70; m++) { const x = (m + 1) * px; g.fillRect(x - (m % 10 ? 1 : 2), 0, m % 10 ? 2 : 4, m % 10 ? (m % 5 ? 14 : 22) : 28); if (m % 10 === 0) g.fillText(`${m}`, x, 56) }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}

export default function Lesson3() {
  const [ds, setDs] = useState<D>('34')
  const [t0, setT0] = useState<number | null>(null)       // 这一次拍手的时刻
  const [tr, setTr] = useState(0)                          // 拍手之后过了多久（真实的秒数，画面放慢了 SLOW 倍）
  const [rows, setRows] = useState<D[]>([])
  const T = useTasks('gewu:sound:3', TASKS)
  const wood = useWood('spruce'), scale = useMemo(makeScale, [])
  const d = Number(ds), te = echoTime(d), wall = useSlide(d, 30), moving = Math.abs(wall - d) > 0.01
  const running = t0 != null && tr < te, heardEcho = t0 != null && tr >= te, dup = rows.includes(ds)
  useEffect(() => {
    if (t0 == null) return
    let raf = 0
    const frame = () => { const t = Math.min(te, (performance.now() - t0) / 1000 / SLOW); setTr(t); if (t < te) raf = requestAnimationFrame(frame) }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [t0, te])
  const clap = () => { if (running || moving) return; setTr(0); setT0(performance.now()) }
  const pick = (k: D) => { if (running) return; setDs(k); setT0(null); setTr(0) }
  const record = () => { if (!heardEcho || dup) return; const n = [...rows, ds]; setRows(n); T.check(id => n.includes(id as D)) }
  const resetAll = () => { setDs('34'); setT0(null); setTr(0); setRows([]); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'd' | 'clap' | 'record' | null } = !task ? { hint: '三个距离都测过了。墙越远，回声回来得越晚：时间乘声速再除以 2，就是距离。', next: null }
    : running ? { hint: tr * V_AIR < d ? '声音正朝墙跑过去…（画面放慢了）' : '碰到墙反射回来了…', next: null }
    : moving ? { hint: '墙在移…', next: null }
    : ds !== task.id ? { hint: `把墙移到 ${task.id} m 处`, next: 'd' }
    : heardEcho && !dup ? { hint: `回声回来了，用了 ${te.toFixed(1)} s。按“记录”`, next: 'record' } : { hint: '按“拍一下手”，看声音跑一个来回', next: 'clap' }
  const xw = XS + wall * M
  const labels: Label[] = [
    { id: 'w', at: P('hall', xw, 1.75), ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>墙离人</small>{wall.toFixed(0)} m</> },
    { id: 't', at: P('hall', XS + 0.25, 1.55), ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: t0 != null ? 1 : 0 }, children: <><small>{heardEcho ? '回声晚到' : '已经过了'}</small>{tr.toFixed(2)} s</> },
    { id: 'p', at: P('hall', XS, 0.75), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '拍手的人' },
    { id: 's', at: P('hall', 0.6, 0.05, 1.5), ax: 0.5, className: 'scene-name', children: `音乐厅的模型 · 画面里的声音放慢了 ${SLOW} 倍` },
  ]
  return (
    <LabShell title="声现象" lessons={LESSONS} current="3" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="拍手"
      stage={<Hall at="hall" labels={labels}>
        {/* 模型的底板：一块浅色的木板，前沿贴着标尺，上面两条让墙滑动的铜轨 */}
        <RoundedBox args={[7.9, FLOOR, 2.1]} radius={0.03} position={[0, FLOOR / 2, 0]} castShadow receiveShadow><meshPhysicalMaterial map={wood} roughness={0.6} clearcoat={0.25} /></RoundedBox>
        <mesh position={[XS + 35 * M, FLOOR + 0.002, 0.9]} rotation-x={-Math.PI / 2}><planeGeometry args={[72 * M, 0.2]} /><meshStandardMaterial map={scale} color="#c9c5b8" roughness={0.8} /></mesh>
        {[-0.62, 0.62].map(z => <mesh key={z} position={[XS + 36 * M, FLOOR + 0.008, z]}><boxGeometry args={[70 * M, 0.016, 0.035]} /><Metal kind="brass" rough={0.35} env={ENV} /></mesh>)}
        {/* 舞台这一头：一小块台子、身后的反声板，台口站着拍手的人 */}
        <RoundedBox args={[0.9, 0.1, 1.9]} radius={0.02} position={[XS - 0.6, FLOOR + 0.05, 0]} castShadow><meshPhysicalMaterial color="#3a2518" roughness={0.5} clearcoat={0.4} /></RoundedBox>
        <RoundedBox args={[0.08, 1.15, 1.9]} radius={0.02} position={[XS - 1.05, FLOOR + 0.575, 0]} castShadow><meshStandardMaterial color="#6e1820" roughness={0.9} /></RoundedBox>
        <mesh geometry={PAWN} position={[XS, FLOOR, 0]} castShadow><meshPhysicalMaterial color="#e9e3d2" roughness={0.4} clearcoat={0.6} /></mesh>
        {/* 远处的墙：一块立着的板，坐在滑座上，顶上一只铜钮 */}
        <group position-x={xw}>
          <RoundedBox args={[0.55, 0.07, 1.9]} radius={0.02} position={[0.2, FLOOR + 0.05, 0]} castShadow><meshPhysicalMaterial color="#3a2518" roughness={0.5} clearcoat={0.4} /></RoundedBox>
          <RoundedBox args={[0.12, 1.3, 1.8]} radius={0.02} position={[0.06, FLOOR + 0.085 + 0.65, 0]} castShadow><meshStandardMaterial color="#9aa0a3" roughness={0.85} /></RoundedBox>
          {[-0.45, 0.45].map(z => <mesh key={z} position={[-0.003, FLOOR + 0.735, z]}><boxGeometry args={[0.01, 1.3, 0.012]} /><meshStandardMaterial color="#5f6568" /></mesh>)}
          <mesh geometry={KNOB} position={[0.06, FLOOR + 1.385, 0]}><Metal kind="brass" grain="turned" env={ENV} /></mesh>
        </group>
        {/* 声音的波前：三道竖着的亮带，往外走是蓝的，折回来是黄的 */}
        {running && [0, 1, 2].map(i => { const s = frontAt(Math.max(0, tr - i * 1.6 / V_AIR), d); return tr - i * 1.6 / V_AIR <= 0 ? null : <mesh key={i} position={[XS + s * M, FLOOR + 0.62, 0]} renderOrder={6}><boxGeometry args={[0.03, 1.05, 1.7]} /><meshBasicMaterial color={(tr - i * 1.6 / V_AIR) * V_AIR <= d ? '#8fd3ff' : '#ffd24a'} transparent opacity={[0.5, 0.28, 0.14][i]} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></mesh> })}
        <Readout x={XS + 0.75} z={-1.28} text={t0 == null ? '0.00 s' : `${tr.toFixed(2)} s`} w={1.1} />
      </Hall>}
      lesson={<LessonBlock no="3" title="声音跑得有多快" concept="回声晚到多久，就知道墙有多远" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>声音传播的快慢用<b className="text-white">声速</b>表示：15 ℃ 时空气中的声速是 {V_AIR} m/s。声音碰到障碍物会反射回来，再传进耳朵，就是<b className="text-white">回声</b>。</p>
          <p className="mt-3 font-formula text-[17px] italic text-white">s = v t ÷ 2</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>t 是从发声到听见回声的时间，声音走的是一个来回，所以要除以 2</li>
            <li>回声比原声晚到 {ECHO_GAP} s 以上，人耳才能把它们分开：对应的距离是 {echoDistance(ECHO_GAP).toFixed(0)} m。再近，回声和原声混在一起，只觉得声音更响</li>
            <li>声速和介质有关：水里约 {V_WATER} m/s，钢铁里约 {V_STEEL} m/s。一般固体里最快，液体其次，气体最慢</li>
          </ul>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三个距离都测过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">距离 = 声速 × 时间 ÷ 2</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">17 m 的墙，回声晚到 0.1 s，刚好能和原声分开；68 m 的墙要等 0.4 s。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">t = 2 s ÷ v</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{heardEcho || dup ? te.toFixed(1) : t0 != null ? tr.toFixed(2) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">s</span></div>
            <div className="mt-1 text-[13px] text-white/60">{heardEcho || dup ? '回声比原声晚到这么久' : running ? '计时中' : '拍一下手开始计时'}</div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <ParamTile symbol="v" value={`${V_AIR}`} unit="m/s · 声速" />
            <ParamTile symbol="s" value={`${d}`} unit="m · 墙的距离" />
            <ParamTile symbol="2s" value={`${2 * d}`} unit="m · 一个来回" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">数据表</h2>
          {rows.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">每换一个距离，拍一下手，等回声回来再记。</p>
            : <table className="mt-1 w-full text-[13.5px]">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">墙 / m</th><th className="font-normal">回声 / s</th><th className="font-normal">分得开吗</th></tr></thead>
                <tbody>{rows.map(k => { const t = echoTime(Number(k)); return <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5 tabular-nums text-white/80">{k}</td><td className="tabular-nums">{t.toFixed(1)}</td><td className="font-semibold text-[#7fe3d4]">{!canTell(t) ? '分不开' : t <= ECHO_GAP + 1e-9 ? '刚好能' : '能'}</td></tr> })}</tbody>
              </table>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'clap'} onClick={clap} disabled={running || moving}>拍一下手</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={!heardEcho || dup}>记录</LabButton>
      </>}
      extras={<Control label="墙的距离"><Segmented label="墙的距离" pulse={next === 'd'} want={next === 'd' ? task!.id as D : null} value={ds} disabled={running} onChange={pick} options={WALLS.map(x => ({ value: String(x) as D, label: `${x} m` }))} /></Control>}
    />
  )
}
