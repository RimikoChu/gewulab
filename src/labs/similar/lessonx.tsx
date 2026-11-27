// 相似和测量 · 拓展课 测不到底的时候：两个小实验。
// 两次测角：古塔南面隔着荷塘，量不到塔底。在塔南 50 m 处测一次仰角（31°），往塔走 20 m 再测一次（45°），只量这 20 m，就能算出塔高。
// 手机测角：手机里的测角工具读到 0.1°。在教学楼东山墙外 18 m 处，手机长边对准楼顶，读 36.9°，算出楼高 15.0 m。
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { ANG, Arc, Clinometer, Dot, Person, Phone, Place, RAY, RightMark, SIDE, Seg, Tape, ease, spot, tag, tagStyle, useRun, type V3 } from './parts'
import { BUILD_H, EYE, TOWER, f1, f2, phoneX, twice } from './physics'
import { ST, TER } from './world'

type X = 'twice' | 'phone'
const TW = twice(), PH = phoneX()
const TASKS: Task[] = [
  { id: 'ta', text: '两次测角：在塔南 50 m 处测仰角', note: `仰角 ${TW.far.read}°，tan${TW.far.read}° ≈ ${f2(TW.far.tan)}` },
  { id: 'tb', text: '往塔走 20 m 再测一次，算塔高', note: `20 ÷ (1/${f2(TW.far.tan)} − 1/${f2(TW.near.tan)}) = ${f1(TW.rise)}，塔高 ${f1(TW.h)} m` },
  { id: 'ph', text: '手机测角：离楼 18 m 测仰角，算楼高', note: `仰角 ${PH.read}°，1.50 + 18 × ${f2(PH.tan)} = ${f1(PH.h)} m` },
]
const NAME: Record<X, string> = { twice: '两次测角', phone: '手机测角' }
const TXX = ST.tower.x, TZ = ST.tower.z
/** 塔南那条线上离塔中心 d 米、高 y 的一点 */
const S = (d: number, y: number): V3 => [TXX, TER + y, TZ + d]
/** 教学楼东山墙外那条线上离楼 d 米、高 y 的一点 */
const B = (d: number, y: number): V3 => [ST.l5.x + d, y, ST.l5.z]

export default function LessonX() {
  const [x, setX] = useState<X>('twice')
  const [log, setLog] = useState<string[]>([])
  const T = useTasks('gewu:similar:x', TASKS)
  const add = (s: string) => { const n = [...log, s]; setLog(n); T.check(id => id === 'ta' ? n.includes('t1') : id === 'tb' ? n.includes('t3') : n.includes('p3')) }
  const s1 = useRun(2.4, () => add(x === 'twice' ? 't1' : 'p1')), s2 = useRun(x === 'twice' ? 4.2 : 2.4, () => add(x === 'twice' ? 't2' : 'p2')), s3 = useRun(1.8, () => add(x === 'twice' ? 't3' : 'p3'))
  const busy = s1.busy || s2.busy || s3.busy
  const pre = x === 'twice' ? 't' : 'p', has = (n: number) => log.includes(`${pre}${n}`)
  const pick = (v: X) => { if (busy) return; setX(v); s1.snap(log.includes(`${v === 'twice' ? 't' : 'p'}1`) ? 1 : 0); s2.snap(0); s3.snap(0) }
  const resetAll = () => { setX('twice'); setLog([]); s1.snap(0); s2.snap(0); s3.snap(0); T.reset() }

  const task = T.current
  const LBL: Record<X, [string, string, string]> = { twice: ['测仰角', '往前走 20 m 再测', '算塔高'], phone: ['量到楼的距离', '手机测仰角', '算楼高'] }
  const { hint, next }: { hint: string; next: 'x' | 1 | 2 | 3 | null } = (() => {
    if (!task) return { hint: '量不到底，就在一条线上测两次角；角度读得越准，算得越准。', next: null }
    if (busy) return { hint: s1.busy ? (x === 'twice' ? '瞄准塔刹顶…' : '拉皮尺…') : s2.busy ? (x === 'twice' ? '朝塔走 20 m，再瞄一次…' : '手机长边对准楼顶…') : '列式计算…', next: null }
    if (task.id === 'ph' && x !== 'phone') return { hint: '换到“手机测角”', next: 'x' }
    if (task.id !== 'ph' && x !== 'twice' && !has(1)) return { hint: '换到“两次测角”', next: 'x' }
    if (x === 'twice') {
      if (!has(1)) return { hint: '塔前有荷塘，量不到塔底。先在这里测一次仰角', next: 1 }
      if (!has(2)) return { hint: `仰角 ${TW.far.read}°。朝塔走 20 m，再测一次`, next: 2 }
      if (!has(3)) return { hint: `仰角 ${TW.near.read}°。只用这 20 m 和两个角，算塔高`, next: 3 }
      return { hint: '换到“手机测角”', next: 'x' }
    }
    if (!has(1)) return { hint: '量出到教学楼的水平距离', next: 1 }
    if (!has(2)) return { hint: '把手机长边对准楼顶，读测角工具上的角度', next: 2 }
    if (!has(3)) return { hint: `仰角 ${PH.read}°：算楼高`, next: 3 }
    return { hint: '换到“两次测角”', next: 'x' }
  })()

  let stage = null, labels: Label[] = [], panel = null
  if (x === 'twice') {
    const walk = has(2) ? 1 : ease(s2.k), d = 50 - 20 * walk
    const p1 = has(1) ? 1 : ease(s1.k), pa = TW.far.exact * Math.PI / 180, pb = TW.near.exact * Math.PI / 180
    const pitch = s2.busy ? pa * (1 - Math.min(1, s2.k * 4)) + pb * Math.max(0, (s2.k - 0.75) * 4) : has(2) ? pb : pa * p1
    const E = (dd: number) => S(dd - 0.09, EYE), top = S(0, TOWER.h)
    const C: V3 = [TXX, TER + EYE - 0.025 + Math.sin(pitch) * 0.2, TZ + d - 0.09 - Math.cos(pitch) * 0.2]
    const done3 = has(3) || s3.busy
    labels = [
      { id: 'a', at: S(50 - 4, EYE + 0.9), ax: 0, className: `${tag} transition-opacity`, style: tagStyle(ANG[0], { opacity: has(1) ? 1 : 0 }), children: `${TW.far.read}°` },
      { id: 'b', at: S(30 - 4, EYE + 1.6), ax: 0, className: `${tag} transition-opacity`, style: tagStyle(ANG[1], { opacity: has(2) ? 1 : 0 }), children: `${TW.near.read}°` },
      { id: 'd', at: S(40, 0), ax: 0.5, className: `${tag} translate-y-4 transition-opacity`, style: tagStyle(SIDE[1], { opacity: has(2) ? 1 : 0 }), children: <><small style={{ color: '#3a2600' }}>走了</small>20.00 m</> },
      { id: 'H', at: S(5, TOWER.h * 0.62), ax: 0, className: `${tag} ${has(3) ? 'key' : ''}`, style: has(3) ? undefined : tagStyle(SIDE[0]), children: <><small style={{ color: '#fff' }}>塔高</small>{has(3) ? `${f1(TW.h)} m` : '?'}</> },
      { id: 'p', at: [TXX + 11, TER + 0.4, TZ + 16.5], ax: 0, className: `${tag} -translate-y-1/2`, style: { opacity: 0.92 }, children: <><small>荷塘</small>量不到塔底</> },
    ]
    stage = <Place view={V_TWICE} labels={labels} elev={47} shadow={45}>
      <Person at={S(d, 0)} yaw={Math.PI / 2} pitch={pitch * 0.85} stride={s2.busy && s2.k > 0.25 && s2.k < 0.75 ? s2.k * 40 : 0}
        rh={[0.09 + 0.11 * Math.cos(pitch), EYE - 0.035 + 0.11 * Math.sin(pitch), 0.045]} lh={[0.09 + 0.29 * Math.cos(pitch), EYE - 0.035 + 0.29 * Math.sin(pitch), 0.045]} />
      <Clinometer at={C} yaw={Math.PI / 2} pitch={pitch} />
      {has(1) && <><Seg a={E(50)} b={top} color={RAY} r={0.06} /><Arc v={E(50)} p={E(0)} q={top} rad={4} color={ANG[0]} r={0.06} /></>}
      {has(2) && <><Seg a={E(30)} b={top} color={RAY} r={0.06} /><Arc v={E(30)} p={E(0)} q={top} rad={3} color={ANG[1]} r={0.06} />
        <Tape a={S(50, 0.01)} b={S(30, 0.01)} reel /></>}
      {(has(1) || s2.busy) && <Seg a={E(50)} b={S(0, EYE)} color={SIDE[1]} r={0.05} dash={0.4} opacity={0.8} />}
      {done3 && <><Seg a={S(0, EYE)} b={top} color={SIDE[0]} r={0.08} /><RightMark v={S(0, EYE)} p={top} q={E(30)} s={1.6} /></>}
      <Dot at={top} color={RAY} r={0.25} />
    </Place>
    panel = <>
      <div className="text-center"><div className="font-formula text-[16px] italic text-white/65">h − 1.50 = d ÷ (1/tanα − 1/tanβ)</div>
        <div className="mt-1 text-[44px] leading-none font-bold tabular-nums">{has(3) ? f1(TW.h) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">m</span></div></div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <ParamTile symbol="α" value={has(1) ? `${TW.far.read}°` : '—'} unit={has(1) ? `tan ≈ ${f2(TW.far.tan)}` : '远处'} />
        <ParamTile symbol="β" value={has(2) ? `${TW.near.read}°` : '—'} unit={has(2) ? `tan ≈ ${f2(TW.near.tan)}` : '近处'} />
        <ParamTile symbol="d" value={has(2) ? '20.00' : '—'} unit="m · 两处之间" />
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-white/60">设塔顶比眼睛高 x：远处到塔 x ÷ tanα，近处到塔 x ÷ tanβ，两者相差 20 m。</p>
    </>
  } else {
    const p1 = has(1) ? 1 : s1.k, pitchT = Math.atan((BUILD_H - EYE) / PH.D), pitch = has(2) ? pitchT : pitchT * ease(s2.k)
    const E = B(PH.D - 0.09, EYE), top = B(0, BUILD_H)
    const Cp: V3 = [E[0] - Math.cos(pitch) * 0.24, E[1] - 0.03 + Math.sin(pitch) * 0.24, ST.l5.z]
    const close = (s2.busy || has(2)) && !has(3) && !s3.busy
    const Cf = PC
    labels = close ? [{ id: 'r', at: [Cf[0] - 0.12, Cf[1] + 0.1, Cf[2]], ax: 1, className: `${tag} key transition-opacity`, style: { opacity: has(2) ? 1 : 0 }, children: <><small>手机读数 · 仰角</small>{PH.read}°</> }] : [
      { id: 'H', at: B(0.8, BUILD_H * 0.55), ax: 0, className: `${tag} ${has(3) ? 'key' : ''}`, style: has(3) ? undefined : tagStyle(SIDE[0]), children: <><small style={{ color: '#fff' }}>楼高</small>{has(3) ? `${f1(PH.h)} m` : '?'}</> },
      { id: 'D', at: B(PH.D / 2, 0), ax: 0.5, className: `${tag} translate-y-4 transition-opacity`, style: tagStyle(SIDE[1], { opacity: has(1) ? 1 : 0 }), children: <><small style={{ color: '#3a2600' }}>到楼</small>18.00 m</> },
      { id: 'A', at: B(PH.D - 3.6, EYE + 1.2), ax: 1, className: `${tag} transition-opacity`, style: tagStyle(ANG[0], { opacity: has(2) ? 1 : 0 }), children: `${PH.read}°` },
    ]
    stage = <Place view={close ? V_PHONE_NEAR : V_PHONE} labels={labels} elev={46} shadow={close ? 6 : 26}>
      <Person at={B(PH.D, 0)} yaw={Math.PI} pitch={pitch * 0.85} rh={pitch > 0.01 ? [0.09 + 0.2 * Math.cos(pitch), EYE - 0.07 + 0.2 * Math.sin(pitch), 0.03] : undefined} />
      {pitch > 0.01 && <Phone at={Cp} yaw={Math.PI} pitch={pitch} flip text={has(2) ? `${PH.read}°` : `${(pitch * 180 / Math.PI).toFixed(1)}°`} />}
      {p1 > 0 && <Tape a={B(PH.D - 0.15, 0.01)} b={B(PH.D - 0.15 - (PH.D - 0.15) * p1, 0.01)} reel />}
      {has(2) && !close && <><Seg a={E} b={top} color={RAY} r={0.03} /><Seg a={E} b={B(0, EYE)} color={SIDE[1]} r={0.025} dash={0.3} /><Arc v={E} p={B(0, EYE)} q={top} rad={2} color={ANG[0]} r={0.03} /></>}
      {(has(3) || s3.busy) && <><Seg a={B(0, EYE)} b={top} color={SIDE[0]} r={0.04} /><RightMark v={B(0, EYE)} p={top} q={E} s={0.8} /></>}
    </Place>
    panel = <>
      <div className="text-center"><div className="font-formula text-[16px] italic text-white/65">h = 1.50 + D · tanα</div>
        <div className="mt-1 text-[44px] leading-none font-bold tabular-nums">{has(3) ? f1(PH.h) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">m</span></div></div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <ParamTile symbol="D" value={has(1) ? '18.00' : '—'} unit="m" />
        <ParamTile symbol="α" value={has(2) ? `${PH.read}°` : '—'} unit="读到 0.1°" />
        <ParamTile symbol="tanα" value={has(2) ? f2(PH.tan) : '—'} unit="两位小数" />
      </div>
    </>
  }
  return (
    <LabShell title="相似和测量" lessons={LESSONS} current="x" narration={voiced(NARRATION['x'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={NAME[x]}
      stage={stage}
      lesson={<LessonBlock no="拓展" title="测不到底的时候" concept="量不到底，就在一条线上测两次角" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>塔底被荷塘隔开，量不到到塔中心的距离。在同一条直线上先后两处测仰角 α、β，只量两处之间的距离 d。</p>
          <p className="mt-3">设塔顶比眼睛高 x：远处到塔 x ÷ tanα，近处到塔 x ÷ tanβ，两者之差是 d，所以 x = d ÷ (1/tanα − 1/tanβ)。</p>
          <p className="mt-3">手机里的测角工具用的是手机里的传感器，能读到 0.1°。用法一样：长边对准目标，读出仰角。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[17px] leading-snug font-bold">量不到底也能测：两次测角算出塔高 31.5 m，手机测出楼高 15.0 m</p>
        <p className="mt-1 text-[14px] text-white/70">和前面几课的结果一样。测角越准、距离量得越准，算出来越准。</p>
      </>}
      panel={<Glass className="px-4 py-4">{panel}</Glass>}
      actions={<>
        <LabButton pulse={next === 1} onClick={s1.run} disabled={busy || has(1)}>{LBL[x][0]}</LabButton>
        <LabButton pulse={next === 2} onClick={s2.run} disabled={busy || !has(1) || has(2)}>{LBL[x][1]}</LabButton>
        <LabButton primary pulse={next === 3} onClick={s3.run} disabled={busy || !has(2) || has(3)}>{LBL[x][2]}</LabButton>
      </>}
      extras={<Control label="小实验"><Segmented label="小实验" pulse={next === 'x'} want={next === 'x' ? (task?.id === 'ph' ? 'phone' : 'twice') : null} disabled={busy} value={x} onChange={pick} options={(['twice', 'phone'] as X[]).map(v => ({ value: v, label: NAME[v] }))} /></Control>}
    />
  )
}

/** 机位：两次测角看塔南那条线；手机测角看教学楼东山墙外那条线，读数时推近到手机屏幕 */
const V_TWICE = spot(TXX - 2, TER + 11, TZ + 25, 60, 36, -0.95, 0.3)
const V_PHONE = spot(ST.l5.x + 9.5, 7.4, ST.l5.z, 29, 17, 0.22, 0.08)
const PT = Math.atan((BUILD_H - EYE) / PH.D), PE = B(PH.D - 0.09, EYE)
const PC: V3 = [PE[0] - Math.cos(PT) * 0.24, PE[1] - 0.03 + Math.sin(PT) * 0.24, ST.l5.z]
const V_PHONE_NEAR = spot(PC[0] + 0.05, PC[1] - 0.04, PC[2], 0.75, 0.5, -0.9, 0.05)
