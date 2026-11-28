// 种群和生态系统 · 第 6 课 捕食者和猎物：岛西北的林缘。兔已经长到 K 值，10 只狐上了岛。
// 观察 30 年：屏上上面一格是兔、下面一格是狐，两条曲线一先一后地波动；标出峰值比先后；再把狐移走看兔怎样变。画面里 1 只兔代表 8 只，1 只狐代表 2 只。
import { useCallback, useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { FoxPack, RabbitHerd } from './animals'
import { BoardFace, C, axes, dash, head, line, note, type Draw } from './board'
import { useYears } from './hooks'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { PP, balance, firstPeak, simulate, type Pt } from './physics'
import { Finale, H, Row } from './ui'
import { VOICE } from './voice'
import { Room, SITE, ground, onGround } from './world'

type Mode = 'fox' | 'none'
const S = SITE.edge, RABBITS = S.area(-2, 5, 4.6, 3), FOXES = S.area(5, 4.6, 2.6, 2.6), PER_R = 8, PER_F = 2
const WITH = simulate(true), END = WITH[WITH.length - 1], RUNS: Record<Mode, Pt[]> = { fox: WITH, none: simulate(false, END.H) }
const PH = firstPeak(WITH, 'H'), PF = firstPeak(WITH, 'P'), LOW = WITH.reduce((a, b) => (b.H < a.H ? b : a)), BAL = balance()
const at = (pts: Pt[], t: number) => pts[Math.max(0, Math.min(pts.length - 1, Math.round(t * PP.per)))]
const MODE_NAME: Record<Mode, string> = { fox: '有狐', none: '把狐移走' }
const TASKS: Task[] = [
  { id: 'fox', text: `放 ${PP.P0} 只狐上岛，观察 30 年`, note: `兔先被吃到只剩约 ${Math.round(LOW.H)} 只，狐没了食物也减少；兔又多起来，狐跟着多：此起彼伏` },
  { id: 'mark', text: '标出兔和狐的峰值，比一比先后', note: `兔在第 ${PH.t.toFixed(0)} 年前后到峰值，狐在第 ${PF.t.toFixed(0)} 年前后：捕食者的峰值比猎物晚` },
  { id: 'none', text: '把狐移走，再观察 30 年', note: `没有了天敌，兔又长回 K 值 ${PP.K} 只` },
]

export default function Lesson6() {
  const [mode, setMode] = useState<Mode>('fox'), [ran, setRan] = useState<Record<string, boolean>>({}), [marked, setMarked] = useState(false)
  const Y = useYears(PP.years, 0.42), T = useTasks('gewu:population:6', TASKS)
  useEffect(() => { if (Y.done) { setRan(r => ({ ...r, [mode]: true })); T.check(id => id === mode) } }, [Y.done])   // eslint-disable-line react-hooks/exhaustive-deps
  const pts = RUNS[mode], p = at(pts, Y.t), k = Math.round(Y.t * PP.per)
  const choose = (m: Mode) => { if (Y.running) return; setMode(m); Y.clear() }
  const mark = () => { if (!ran.fox || marked || mode !== 'fox') return; setMarked(true); T.check(id => id === 'mark') }
  const resetAll = () => { setMode('fox'); setRan({}); setMarked(false); Y.clear(); T.reset() }
  const show = marked && mode === 'fox' && Y.t >= PF.t

  const draw = useCallback<Draw>((g, W, H) => {
    const part = pts.slice(0, k + 1)
    const A = axes(g, { x: W * 0.02, y: H * 0.01, w: W * 0.96, h: H * 0.52, xr: [0, PP.years], yr: [0, 2400], xStep: 5, yStep: 600, xName: '时间/年', yName: '兔/只', fs: 24 })
    const B = axes(g, { x: W * 0.02, y: H * 0.52, w: W * 0.96, h: H * 0.47, xr: [0, PP.years], yr: [0, 80], xStep: 5, yStep: 20, xName: '时间/年', yName: '狐/只', fs: 24 })
    if (mode === 'none' && ran.fox) { line(g, A, WITH.map(q => [q.t, q.H]), C.idle, { width: 3.5, alpha: 0.6 }); line(g, B, WITH.map(q => [q.t, q.P]), C.idle, { width: 3.5, alpha: 0.6 }) }
    if (mode === 'none') { dash(g, A, [0, PP.K], [PP.years, PP.K]); note(g, A, [PP.years, PP.K], `K = ${PP.K} 只`, { align: 'right', dy: 44, fs: 26 }) }
    line(g, A, part.map(q => [q.t, q.H]), C.rabbit); head(g, A, p.t, p.H, C.rabbit, 9)
    line(g, B, part.map(q => [q.t, q.P]), C.fox); head(g, B, p.t, p.P, C.fox, 9)
    if (show) {
      dash(g, A, [PH.t, 0], [PH.t, PH.v]); dash(g, B, [PH.t, 0], [PH.t, 80]); dash(g, B, [PF.t, 0], [PF.t, PF.v], C.fox); dash(g, A, [PF.t, 0], [PF.t, 2400], C.fox)
      head(g, A, PH.t, PH.v, '#ffffff', 8); head(g, B, PF.t, PF.v, '#ffffff', 8)
      note(g, A, [PH.t, PH.v], `兔的峰值 · 第 ${PH.t.toFixed(0)} 年`, { color: C.rabbit, align: 'right', dy: -10 }); note(g, B, [PF.t, PF.v], `狐的峰值 · 第 ${PF.t.toFixed(0)} 年`, { color: C.fox, dy: -10 })
    }
  }, [pts, k, mode, ran, show, p])

  const task = T.current
  const { hint, nx }: { hint: string; nx: 'run' | 'mark' | 'mode' | null } = (() => {
    if (!task) return { hint: '捕食者和猎物相互制约：这种负反馈调节，是生态系统自我调节能力的基础。', nx: null }
    if (Y.running) return { hint: `第 ${Math.floor(Y.t)} 年…`, nx: null }
    if (task.id === 'fox') return { hint: `兔已经长到 K 值。现在有 ${PP.P0} 只狐上了岛，按“观察 30 年”`, nx: 'run' }
    if (task.id === 'mark') return { hint: '两条曲线都在波动，但不同步。按“标出峰值”', nx: 'mark' }
    if (mode !== 'none') return { hint: '换成“把狐移走”', nx: 'mode' }
    return { hint: '岛上没有狐了。按“观察 30 年”，看兔怎样变', nx: 'run' }
  })()
  const labels: Label[] = [
    { id: 'r', at: onGround(RABBITS.x, RABBITS.z, 1.5), ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>兔</small>{Math.round(p.H)} 只</> },
    { id: 'f', at: onGround(FOXES.x, FOXES.z, 2), ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>狐</small>{Math.round(p.P)} 只</> },
    { id: 'per', at: onGround(...S.front(-7.2, 3.2), 0.9), name: true, className: 'scene-name -translate-y-full', children: `画面里 1 只兔代表 ${PER_R} 只，1 只狐代表 ${PER_F} 只` },
  ]
  return (
    <LabShell title="种群和生态系统" lessons={LESSONS} current="6" narration={voiced(NARRATION['6'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={MODE_NAME[mode]}
      stage={<Room at="s6" labels={labels}>
        <group position={onGround(S.x, S.z)} rotation-y={S.az}><BoardFace w={S.w} h={S.h} lift={S.lift} draw={draw} dep={draw} /></group>
        <RabbitHerd n={Math.max(1, Math.round(p.H / PER_R))} max={PP.K / PER_R} area={RABBITS} ground={ground} scale={1.2} seed={6} lo />
        <FoxPack n={Math.round(p.P / PER_F)} max={42} area={FOXES} ground={ground} scale={1.5} seed={6} lo />
      </Room>}
      lesson={<LessonBlock no="6" title="捕食者和猎物" concept="捕食者和猎物此起彼伏，相互制约" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>一种生物以另一种生物为食的现象叫<b className="text-white">捕食</b>。猎物增多，捕食者食物充足，数量跟着增多；捕食者多了，猎物减少；猎物少了，捕食者又因缺少食物而减少。两条曲线一先一后地波动，捕食者的变化总比猎物晚。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>这是一种<b className="text-white">负反馈调节</b>：变化的结果反过来抑制最初的变化。负反馈调节是生态系统具备自我调节能力的基础。</li>
            <li>种间关系主要有：原始合作、互利共生、种间竞争、捕食和寄生。种间竞争的两条曲线常是“此消彼长”，一方可能被淘汰；互利共生的两条曲线同增同减。</li>
            <li>气候、食物、天敌、传染病等都会影响种群数量。食物和天敌这类影响随种群密度而变，叫密度制约因素；气候、自然灾害的影响与密度无关，叫非密度制约因素。</li>
          </ul>
        </>} />}
      finale={T.finale && <Finale kicker="有狐、没狐都看过了" title="捕食者和猎物相互制约，数量此起彼伏" text={`狐上岛以后，兔从 ${PP.K} 只降下来，和狐一先一后地波动，慢慢趋向兔 ${BAL.H.toFixed(0)} 只、狐约 ${BAL.P.toFixed(0)} 只；狐的峰值比兔晚约 ${(PF.t - PH.t).toFixed(0)} 年。把狐移走，兔又长回 K 值。`} notes="曲线来自一个简化的捕食模型，年份和只数都是示意。" onClose={() => T.setFinale(false)} />}
      panel={
        <Glass className="px-4 py-4">
          <div className="grid grid-cols-3 gap-2">
            <ParamTile symbol="兔" value={String(Math.round(p.H))} unit="只" />
            <ParamTile symbol="狐" value={String(Math.round(p.P))} unit="只" />
            <ParamTile symbol="t" value={Y.t.toFixed(0)} unit="年" />
          </div>
          <H>{MODE_NAME[mode]}（示意）</H>
          <div className="flex flex-col gap-1.5">
            <Row color={C.rabbit} name="兔的峰值" value={marked ? `第 ${PH.t.toFixed(0)} 年 · ${Math.round(PH.v)} 只` : '—'} dim={!marked} />
            <Row color={C.fox} name="狐的峰值" value={marked ? `第 ${PF.t.toFixed(0)} 年 · ${Math.round(PF.v)} 只` : '—'} dim={!marked} />
            <Row name="有狐，第 30 年" value={ran.fox ? `兔 ${Math.round(END.H)} 只 · 狐 ${Math.round(END.P)} 只` : '—'} dim={!ran.fox} on={mode === 'fox'} />
            <Row name="把狐移走，第 30 年" value={ran.none ? `兔 ${Math.round(RUNS.none[RUNS.none.length - 1].H)} 只` : '—'} dim={!ran.none} on={mode === 'none'} />
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={nx === 'run'} onClick={Y.start} disabled={Y.running || Y.t > 0}>观察 30 年</LabButton>
        <LabButton pulse={nx === 'mark'} onClick={mark} disabled={!ran.fox || marked || mode !== 'fox' || Y.running}>标出峰值</LabButton>
      </>}
      extras={<Control label="岛上"><Segmented label="岛上" pulse={nx === 'mode'} want={nx === 'mode' ? 'none' : null} value={mode} disabled={Y.running} onChange={choose} options={(['fox', 'none'] as Mode[]).map(m => ({ value: m, label: MODE_NAME[m] }))} /></Control>}
    />
  )
}
