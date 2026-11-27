// 相似和测量 · 第 5 课 镜子和标杆：从教学楼东山墙脚往东一条线上量楼高（山墙顶和女儿墙顶一样高）。
// 镜子法：小镜子平放在离楼 18 m（再试 12 m）处，学生往后退，直到在镜子里看见楼顶；反射角等于入射角，两个直角三角形相似。
// 标杆法：离楼 15 m 立一根 2.5 m 的标杆，学生往后退到眼睛、杆顶、楼顶三点一线；过眼睛画水平线，得到两个相似三角形。
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { ANG, Arc, Dot, Mirror, Person, Place, RAY, RangeRod, RightMark, SIDE, SIGHT, Seg, Tape, ease, spot, tag, tagStyle, useRun, type V3 } from './parts'
import { BUILD_H, EYE, ROD, f1, f2, mirror5, rod5 } from './physics'
import { ST } from './world'

type M = 'm18' | 'm12' | 'rod'
const KEYS: M[] = ['m18', 'm12', 'rod']
const NAME: Record<M, string> = { m18: '镜子 18 m', m12: '镜子 12 m', rod: '标杆' }
const R18 = mirror5(18), R12 = mirror5(12), RR = rod5()
const TASKS: Task[] = [
  { id: 'm18', text: '镜子放在离楼 18 m 处：退到看见楼顶，算楼高', note: `1.50 × 18 ÷ ${f2(R18.d1)} = ${f1(R18.h)} m` },
  { id: 'm12', text: '镜子挪到离楼 12 m 处，再测一次', note: `人到镜子 ${f2(R12.d1)} m，楼高还是 ${f1(R12.h)} m` },
  { id: 'rod', text: '换标杆法：退到眼睛、杆顶、楼顶三点一线', note: `1.50 + 1.00 × ${f2(RR.total)} ÷ ${f2(RR.d)} = ${f1(RR.h)} m` },
]
const GX = ST.l5.x, ZL = ST.l5.z, Z0 = 0
/** 离楼 z 米、高 y 的一点：从教学楼东山墙往东一条线 */
const P3 = (z: number, y = 0): V3 => [GX + z, y, ZL]
/** 这一种做法里：放东西的位置（离楼）、人最后站的位置（离楼）、人从哪里开始退 */
const plan = (m: M) => m === 'rod' ? { put: ROD.D, stand: ROD.D + RR.d, from: ROD.D + 0.6 } : { put: m === 'm18' ? 18 : 12, stand: (m === 'm18' ? 18 : 12) + (m === 'm18' ? R18 : R12).d1, from: (m === 'm18' ? 18 : 12) + 0.35 }
const YAW = Math.PI                                       // 面朝西（朝楼）
/** 远景：侧面看整条线（楼、镜子或标杆、人）；近景：摆东西和往后退时推近到人和镜子（标杆） */
const VIEW5 = spot(GX + 10, 7.4, ZL, 26, 16.5, 0.12, 0.08)
const NEAR5: Record<M, ReturnType<typeof spot>> = {
  m18: spot(GX + 19, 1.0, ZL, 5.2, 3.0, 0.12, 0.1), m12: spot(GX + 12.8, 1.0, ZL, 4.4, 3.0, 0.12, 0.1), rod: spot(GX + 15.6, 1.5, ZL, 4.6, 3.6, 0.12, 0.1),
}

export default function Lesson5() {
  const [m, setM] = useState<M>('m18')
  const [done, setDone] = useState<M[]>([])
  const T = useTasks('gewu:similar:5', TASKS)
  const put = useRun(1.2), walk = useRun(3.2), calc = useRun(2.2, () => { const n = [...done, m]; setDone(n); T.check(id => n.includes(id as M)) })
  const busy = put.busy || walk.busy || calc.busy
  const placed = put.k >= 1, backed = walk.k >= 1, computed = done.includes(m) && calc.k >= 1
  const pick = (v: M) => { if (busy) return; setM(v); put.snap(0); walk.snap(0); calc.snap(0) }
  const resetAll = () => { setM('m18'); setDone([]); put.snap(0); walk.snap(0); calc.snap(0); T.reset() }
  const pl = plan(m), isRod = m === 'rod', res = isRod ? RR : m === 'm18' ? R18 : R12

  const task = T.current
  const { hint, next }: { hint: string; next: 'm' | 'put' | 'walk' | 'calc' | null } = (() => {
    if (!task) return { hint: '镜子、标杆都是在找两个相似三角形。', next: null }
    if (busy) return { hint: put.busy ? (isRod ? '把标杆立直…' : '把镜子平放在地上…') : walk.busy ? '一边看一边往后退…' : '量距离、列比例…', next: null }
    if (m !== task.id) return { hint: `换成“${NAME[task.id as M]}”`, next: 'm' }
    if (!placed) return { hint: isRod ? '在离楼 15 m 处立一根 2.5 m 的标杆' : `把小镜子平放在离楼 ${pl.put} m 处`, next: 'put' }
    if (!backed) return { hint: isRod ? '往后退，直到眼睛、杆顶、楼顶在一条直线上' : '往后退，直到在镜子里正好看见楼顶', next: 'walk' }
    if (!computed) return { hint: isRod ? '三点一线了：量人到标杆、标杆到楼的距离，算楼高' : '看见楼顶了：量人到镜子、镜子到楼的距离，算楼高', next: 'calc' }
    return { hint: `换成“${NAME[task.id as M]}”`, next: 'm' }
  })()

  // 人的位置：放好以后从放东西的地方往后退
  const zPut = Z0 + pl.put, zFrom = Z0 + pl.from, zStand = Z0 + pl.stand
  const zEye = placed ? zFrom + (zStand - zFrom) * ease(walk.k) : zFrom + 1.2
  const E = P3(zEye, EYE), top = P3(Z0, BUILD_H), foot = P3(Z0, 0.03), M0 = P3(zPut, 0.03)
  const show = calc.k > 0, kc = Math.min(1, calc.k * 1.4)
  const near = (put.k > 0 || placed) && !computed && !calc.busy
  const labels: Label[] = [
    { id: 'H', at: P3(Z0 + 0.6, BUILD_H * 0.55), ax: 0, className: `${tag} ${computed ? 'key' : ''}`, style: computed ? undefined : tagStyle(SIDE[0]), children: <><small style={{ color: '#fff' }}>楼高</small>{computed ? `${f1(res.h)} m` : '?'}</> },
    { id: 'e', at: P3(zEye + 0.35, EYE / 2), ax: 0, className: tag, style: tagStyle(SIDE[0], { opacity: placed ? 1 : 0 }), children: <><small style={{ color: '#fff' }}>眼高</small>1.50 m</> },
    { id: 'd1', at: P3((zEye + zPut) / 2, 0), ax: 0.5, className: `${tag} translate-y-4 transition-opacity`, style: tagStyle(SIDE[1], { opacity: show ? 1 : 0 }), children: <><small style={{ color: '#3a2600' }}>{isRod ? '人到标杆' : '人到镜子'}</small>{f2(isRod ? RR.d : (m === 'm18' ? R18 : R12).d1)} m</> },
    { id: 'd2', at: P3((Z0 + zPut) / 2, 0), ax: 0.5, className: `${tag} translate-y-4 transition-opacity`, style: tagStyle(SIDE[1], { opacity: show && kc >= 1 ? 1 : 0 }), children: <><small style={{ color: '#3a2600' }}>{isRod ? '标杆到楼' : '镜子到楼'}</small>{f2(pl.put)} m</> },
    ...(isRod ? [{ id: 'rh', at: P3(zPut - 0.3, ROD.h + 0.15), ax: 1, className: tag, style: tagStyle(SIDE[0], { opacity: placed ? 1 : 0 }), children: <><small style={{ color: '#fff' }}>标杆</small>{f2(ROD.h)} m</> } as Label] : []),
    { id: 'n', at: P3(zPut, isRod ? ROD.h + 0.5 : 0.35), ax: 0.5, className: `${tag} -translate-y-full transition-opacity`, style: { opacity: put.k > 0 ? 1 : 0 }, children: isRod ? '标杆' : '小镜子' },
  ]
  // 镜子法的光线：楼顶 → 镜子 → 斜着向上反射出去（人退到位时正好进眼睛）
  const tanI = BUILD_H / pl.put, out = P3(zPut + 6 / tanI * 0.6, 6 * 0.6)
  return (
    <LabShell title="相似和测量" lessons={LESSONS} current="5" narration={voiced(NARRATION['5'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={isRod ? '标杆和卷尺' : '镜子和卷尺'}
      stage={<Place view={near ? NEAR5[m] : VIEW5} labels={labels} elev={46} shadow={26}>
        <Person at={P3(zEye + 0.09)} yaw={YAW} pitch={isRod ? 0.22 : -0.32} stride={walk.busy ? walk.k * 22 : 0}
          rh={isRod ? undefined : [0.05, 0.86, 0.22]} />
        {!isRod && put.k > 0 && <><Mirror at={P3(zPut, 0.002 + (1 - ease(put.k)) * 0.8)} />
          <mesh position={P3(zPut, 0.02)} rotation-x={-Math.PI / 2} renderOrder={9}><ringGeometry args={[0.2, 0.24, 40]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.85 * put.k} depthTest={false} toneMapped={false} /></mesh></>}
        {isRod && put.k > 0 && <group position={[0, (1 - ease(put.k)) * 0.6, 0]}><RangeRod at={P3(zPut)} h={ROD.h} /></group>}
        {/* 楼高（蓝） */}
        <Seg a={foot} b={top} color={SIDE[0]} r={0.035} opacity={0.85} />
        <Dot at={top} color={SIDE[0]} r={0.12} />
        {placed && <Seg a={P3(zEye, 0.03)} b={E} color={SIDE[0]} r={0.018} opacity={0.85} />}
        {!isRod && placed && <>
          {/* 入射光线、反射光线，和地面的夹角相等 */}
          <Seg a={top} b={M0} color={RAY} r={0.03} />
          <Seg a={M0} b={backed ? E : out} color={RAY} r={0.025} opacity={backed ? 1 : 0.6} />
          <Arc v={M0} p={foot} q={top} rad={0.9} color={ANG[0]} r={0.025} />
          <Arc v={M0} p={P3(zEye, 0.03)} q={backed ? E : out} rad={0.9} color={ANG[0]} r={0.025} />
          {backed && <>
            <Seg a={foot} b={M0} color={SIDE[1]} r={0.02} /><Seg a={M0} b={P3(zEye, 0.03)} color={SIDE[1]} r={0.02} />
            <RightMark v={foot} p={top} q={M0} s={0.8} /><RightMark v={P3(zEye, 0.03)} p={E} q={M0} s={0.3} />
          </>}
        </>}
        {isRod && placed && <>
          {/* 过眼睛的水平线；视线过杆顶 */}
          <Seg a={E} b={P3(Z0, EYE)} color={SIGHT} r={0.015} dash={0.3} opacity={0.75} />
          <Seg a={E} b={backed ? top : P3(Z0, EYE + (ROD.h - EYE) * (zEye - Z0) / (zEye - zPut))} color={RAY} r={0.025} opacity={backed ? 1 : 0.6} />
          <Dot at={P3(zPut, ROD.h)} color={RAY} r={0.06} />
          {backed && <>
            <Seg a={P3(zPut, EYE)} b={P3(zPut, ROD.h)} color={SIDE[0]} r={0.03} />
            <Seg a={P3(Z0, EYE)} b={top} color={SIDE[0]} r={0.05} />
            <Seg a={E} b={P3(zPut, EYE)} color={SIDE[1]} r={0.025} /><Seg a={P3(zPut, EYE)} b={P3(Z0, EYE)} color={SIDE[1]} r={0.025} opacity={0.7} />
            <Arc v={E} p={P3(zPut, EYE)} q={top} rad={1.1} color={ANG[0]} r={0.022} />
            <RightMark v={P3(zPut, EYE)} p={P3(zPut, ROD.h)} q={E} s={0.3} /><RightMark v={P3(Z0, EYE)} p={top} q={E} s={0.8} />
          </>}
        </>}
        {/* 量距离：卷尺量近的一段，皮尺量到楼脚 */}
        {show && <Tape a={P3(zEye - 0.05)} b={P3(zEye - 0.05 - (zEye - zPut - 0.12) * kc)} />}
        {show && calc.k > 0.4 && <Tape a={P3(zPut - 0.12)} b={P3(zPut - 0.12 - (pl.put - 0.12) * Math.min(1, (calc.k - 0.4) / 0.5))} reel />}
      </Place>}
      lesson={<LessonBlock no="5" title="镜子和标杆" concept="找到两个相似三角形，就能算楼高" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p><b className="text-white">镜子法</b>：光照到镜面上，反射角等于入射角，所以两条光线和地面的夹角相等。人和楼都垂直于地面，两个直角三角形有一个锐角相等，相似：</p>
          <p className="mt-2 font-formula text-[17px] italic">楼高 ∶ 镜子到楼 = 眼高 ∶ 人到镜子</p>
          <p className="mt-3"><b className="text-white">标杆法</b>：眼睛、杆顶、楼顶在一条直线上。过眼睛画一条水平线，杆顶以上、楼顶以上各是一个直角三角形，它们相似：</p>
          <p className="mt-2 font-formula text-[17px] italic">(楼高 − 眼高) ∶ 人到楼 = (杆高 − 眼高) ∶ 人到标杆</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[17px] leading-snug font-bold">镜子法、标杆法都算出教学楼高 15.0 m</p>
        <p className="mt-1 text-[14px] text-white/70">都是先找两个相似的直角三角形，再用对应边成比例算出够不着的高度。</p>
      </>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[16px] italic text-white/65">{isRod ? '楼高 = 1.50 + 1.00 × 人到楼 ÷ 人到标杆' : '楼高 = 眼高 × 镜子到楼 ÷ 人到镜子'}</div>
            <div className="mt-1 text-[44px] leading-none font-bold tracking-tight tabular-nums">{computed ? f1(res.h) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">m</span></div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <ParamTile symbol="眼高" value="1.50" unit="m" />
            <ParamTile symbol={isRod ? '人到杆' : '人到镜'} value={show && kc >= 1 ? f2(isRod ? RR.d : (m === 'm18' ? R18 : R12).d1) : '—'} unit="m" />
            <ParamTile symbol={isRod ? '杆到楼' : '镜到楼'} value={calc.k > 0.9 ? f2(pl.put) : '—'} unit="m" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">记录</h2>
          <div className="mt-1.5 flex flex-col gap-1 text-[14px] tabular-nums">{KEYS.map(x => <div key={x} className={done.includes(x) ? 'text-white' : 'text-white/30'}>{NAME[x]}：{done.includes(x) ? `${f1(x === 'rod' ? RR.h : x === 'm18' ? R18.h : R12.h)} m` : '—'}</div>)}</div>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'put'} onClick={put.run} disabled={busy || placed}>{isRod ? '立标杆' : '放镜子'}</LabButton>
        <LabButton pulse={next === 'walk'} onClick={walk.run} disabled={busy || !placed || backed}>往后退</LabButton>
        <LabButton primary pulse={next === 'calc'} onClick={calc.run} disabled={busy || !backed || computed}>量距离算楼高</LabButton>
      </>}
      extras={<Control label="做法"><Segmented label="做法" pulse={next === 'm'} want={next === 'm' ? task!.id as M : null} disabled={busy} value={m} onChange={pick} options={KEYS.map(x => ({ value: x, label: NAME[x] }))} /></Control>}
    />
  )
}
