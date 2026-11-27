// 动量和碰撞 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。题目里的数都从计算核心取。
// 背景：冰面上一张器材台，近处是摆动着的牛顿摆和几只冰球，中景是冰面上的几只冰壶和球门，远处是看台。
import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { RoundedBox } from '@react-three/drei'
import { Metal } from '@/lab-kit'
import { Cradle } from './bench'
import { Cone, PuckPile, Stone } from './gear'
import { COL, RINK, TOP } from './layout'
import { benchTex } from './mats'
import { LESSONS, goLesson } from './lessons'
import { BUMPS, CRADLE, DROPS, EGG, G, GLIDER, PUCK, SHOTS, STONE, bumpPlan, burn, clashPlan, cradleAngles, cradleTry, drop, kinetic, momentum, shotP, wallDp } from './physics'
import { num } from './views'
import { Place } from './world'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const H = bumpPlan('heavy'), gH = H.gates.filter(g => g.after), S4 = clashPlan('stick'), D3 = drop('thick'), B = burn('a')
const QS: Q[] = [
  { lesson: '1', q: `${PUCK.m} kg 的冰球以 ${SHOTS.fast.v} m/s 飞行，${STONE.m} kg 的冰壶以 ${SHOTS.stone.v} m/s 滑行。谁的动量大？`, options: ['冰球，因为它快得多', `冰壶：${num(shotP('stone'), 1)} kg·m/s 比 ${num(shotP('fast'), 1)} kg·m/s 大`, '一样大', '没法比，单位不同'], answer: 1, why: `p = mv。冰球 ${PUCK.m} × ${SHOTS.fast.v} = ${num(shotP('fast'), 1)} kg·m/s，冰壶 ${STONE.m} × ${SHOTS.stone.v} = ${num(shotP('stone'), 1)} kg·m/s。动量要看质量和速度的乘积，不能只看速度。` },
  { lesson: '1', q: `${PUCK.m} kg 的冰球以 ${SHOTS.wall.v} m/s 垂直撞上板墙，以 ${SHOTS.wall.back} m/s 反向弹回。取原来的运动方向为正，动量的变化量是多少？`, options: [`${num(momentum(PUCK.m, SHOTS.wall.back - SHOTS.wall.v))} kg·m/s`, `${num(momentum(PUCK.m, SHOTS.wall.v - SHOTS.wall.back))} kg·m/s`, `${num(wallDp())} kg·m/s`, '0'], answer: 2, why: `动量是矢量。弹回后的速度是 −${SHOTS.wall.back} m/s，Δp = p′ − p = ${PUCK.m} × (−${SHOTS.wall.back}) − ${PUCK.m} × ${SHOTS.wall.v} = ${num(wallDp())} kg·m/s。只用速率相减（${SHOTS.wall.back} − ${SHOTS.wall.v}）就错了。` },
  { lesson: '2', q: '鸡蛋从同一高度落到海绵上不碎，落到钢板上就碎了。垫了海绵以后，下面哪个量变小了？', options: ['鸡蛋落到垫子时的动量', '鸡蛋动量的变化量', '鸡蛋受到的冲量', '鸡蛋受到的平均作用力'], answer: 3, why: '高度相同，落到垫子时的速度、动量都一样；停下来动量都变成 0，所以动量的变化量、合力的冲量也一样。海绵只是把作用时间拉长了，力就小了。' },
  { lesson: '2', q: `质量 ${EGG.m} kg 的鸡蛋以 ${num(D3.v, 1)} m/s 的速度落到海绵上，经过 ${DROPS.thick.dt} s 停住。海绵对它的平均作用力约是多少？（g 取 ${G} N/kg）`, options: [`${num(D3.p / DROPS.thick.dt, 1)} N`, `${num(D3.F)} N`, `${num(EGG.m * G)} N`, `${num(D3.p)} N`], answer: 1, why: `取向上为正，(F − mg)Δt = mv，F = mv/Δt + mg = ${num(D3.p / DROPS.thick.dt, 1)} + ${num(EGG.m * G)} = ${num(D3.F)} N。动量定理里用的是合力，别忘了重力。` },
  { lesson: '3', q: '气垫导轨上的两只滑块发生碰撞。下面哪种情况下，两只滑块组成的系统总动量守恒？', options: ['只有两只滑块质量相等时', '只有碰撞是弹性的时', '导轨调平、气量充足，滑块不受阻力时', '任何时候都守恒'], answer: 2, why: '动量守恒的条件是系统不受外力，或者所受外力的矢量和为 0，跟质量是否相等、碰撞是否弹性无关。气量不足时滑块受到阻力，外力不为 0，总动量就变了。' },
  { lesson: '3', q: `遮光条宽 ${GLIDER.flag * 100} cm。${BUMPS.heavy.m1} kg 的滑块 A 撞静止的 ${BUMPS.heavy.m2} kg 的滑块 B，碰后 B、A 先后通过光电门，遮光时间分别是 ${gH[0].ms.toFixed(1)} ms 和 ${gH[1].ms.toFixed(0)} ms。碰后系统的总动量是多少？`, options: [`${num(H.p1, 2)} kg·m/s`, `${num(momentum(BUMPS.heavy.m2, H.w2), 2)} kg·m/s`, `${num(momentum(BUMPS.heavy.m1 + BUMPS.heavy.m2, H.w2), 2)} kg·m/s`, `${num(H.w1 + H.w2, 2)} kg·m/s`], answer: 0, why: `v = d/t：B 的速度 ${num(H.w2, 1)} m/s，A 的速度 ${num(H.w1, 1)} m/s。总动量 = ${BUMPS.heavy.m2} × ${num(H.w2, 1)} + ${BUMPS.heavy.m1} × ${num(H.w1, 1)} = ${num(H.p1, 2)} kg·m/s，和碰前 A 的动量 ${BUMPS.heavy.m1} × ${BUMPS.heavy.v1} 相等。` },
  { lesson: '4', q: `${STONE.m} kg 的冰壶以 ${S4.v1} m/s 撞上一只静止的同样的冰壶，两只粘在一起运动。碰撞中损失了多少动能？`, options: ['0', `${num(S4.loss, 0)} J`, `${num(S4.ek0, 0)} J`, `${num(S4.ek0 * 2, 0)} J`], answer: 1, why: `动量守恒：${STONE.m} × ${S4.v1} = ${STONE.m * 2} × v，v = ${num(S4.w1, 1)} m/s。碰前动能 ${num(S4.ek0, 0)} J，碰后 ½ × ${STONE.m * 2} × ${num(S4.w1, 1)}² = ${num(S4.ek1, 0)} J，损失 ${num(S4.loss, 0)} J。完全非弹性碰撞动量守恒，动能损失最大。` },
  { lesson: '5', q: '牛顿摆拉起 2 颗钢球松手，另一头弹起的是 2 颗，而不是 1 颗以 2 倍的速度飞出去。为什么？', options: ['1 颗以 2 倍速度飞出，动量不守恒', '1 颗以 2 倍速度飞出，动量守恒，但动能会变成原来的 2 倍', '钢球之间有磁力', '中间的钢球太重'], answer: 1, why: `1 颗以 2v 飞出，动量 m·2v 和原来的 2m·v 相等，可动能 ½m(2v)² 是原来的 ${num(cradleTry(2, 1).ek1 / cradleTry(2, 1).ek0, 0)} 倍，不可能凭空多出来。钢球的碰撞接近弹性碰撞，动量和动能要同时守恒，只有弹出 2 颗才行。（每颗 ${CRADLE.m * 1000} g，动能 ${num(kinetic(CRADLE.m, cradleTry(1, 1).u) * 1000, 1)}×10⁻³ J。）` },
  { lesson: '7', q: `火箭发动机每秒喷出 ${B.gas / 10} kg 燃气，喷出的速度是 2500 m/s。下面的说法哪个正确？`, options: [`推力约 ${B.F / 1000} kN，在真空里也一样有`, '推力来自燃气推后面的空气，真空里没有推力', `推力约 ${B.F / 1000} kN，但只有喷到地面上才有`, '推力只跟喷出的质量有关，跟喷速无关'], answer: 0, why: `对喷出的燃气用动量定理：FΔt = Δm·u，F = ${B.gas / 10} kg/s × 2500 m/s = ${B.F / 1000} kN。火箭靠的是反冲：燃气被向后加速，它就反过来推火箭，不需要空气。每秒喷得越多、喷得越快，推力越大。` },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:momentum:q'

/** 一直摆着的牛顿摆：两颗进、两颗出 */
function Swing() {
  const angles = useRef<number[]>(Array(CRADLE.n).fill(0)), t = useRef(0)
  useFrame((_, d) => { t.current += Math.min(d, 1 / 30); cradleAngles(2, t.current).forEach((x, i) => { angles.current[i] = x }) })
  return <Cradle angles={angles} />
}

const QT = RINK.quiz
/** 冰面上的器材台：理化板台面、四条铝腿带橡胶脚垫；台上是牛顿摆、一小堆冰球和一只备用的冰壶。旁边冰面上摆着几只冰壶和标志桶 */
function Desk() {
  const W = 1.5, D = 0.7
  return <>
    <group position={[QT.x, 0, QT.z]}>
      <RoundedBox args={[W, 0.04, D]} radius={0.012} smoothness={3} position={[0, TOP - 0.02, 0]} castShadow receiveShadow><meshPhysicalMaterial map={benchTex()} roughness={0.55} clearcoat={0.25} clearcoatRoughness={0.5} envMapIntensity={0.7} /></RoundedBox>
      {[-1, 1].flatMap(a => [-1, 1].map(b => <group key={`${a}${b}`} position={[a * (W / 2 - 0.06), 0, b * (D / 2 - 0.06)]}>
        <mesh position-y={(TOP - 0.04) / 2 + 0.015} castShadow><boxGeometry args={[0.05, TOP - 0.07, 0.05]} /><Metal kind="aluminum" grain="brushed" /></mesh>
        <mesh position-y={0.015}><cylinderGeometry args={[0.035, 0.04, 0.03, 16]} /><meshStandardMaterial color="#1d1f22" roughness={0.9} /></mesh>
      </group>))}
      {[-1, 1].map(b => <mesh key={b} position={[0, TOP - 0.1, b * (D / 2 - 0.06)]}><boxGeometry args={[W - 0.12, 0.07, 0.03]} /><Metal kind="aluminum" grain="brushed" /></mesh>)}
      <group position={[-0.02, TOP, 0.04]} rotation-y={-0.72}><Swing /></group>
      <group position={[0.38, TOP, 0.12]} rotation-y={0.8}><PuckPile /></group>
      <group position={[-0.5, TOP, -0.1]} rotation-y={2.2}><Stone color="#d8a52a" /></group>
    </group>
    {/* 中景：冰面上的几只冰壶和标志桶，再往后是球门 */}
    <group position={[QT.x + 3.3, 0, QT.z - 3.1]} rotation-y={0.4}><Stone color={COL.A} band="steel" /></group>
    <group position={[QT.x + 4.0, 0, QT.z - 3.3]} rotation-y={2.6}><Stone color={COL.B} band="steel" /></group>
    <group position={[QT.x + 4.7, 0, QT.z - 4.6]} rotation-y={1.2}><Stone color={COL.A} /></group>
    <group position={[QT.x + 3.3, 0, QT.z - 4.9]} rotation-y={0.2}><Stone color={COL.B} /></group>
    <group position={[QT.x + 2.4, 0, QT.z - 4.4]}><Cone /></group>
    <group position={[QT.x + 5.4, 0, QT.z - 3.4]}><Cone /></group>
  </>
}

export default function Quiz() {
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<(number | null)[]>(() => { try { const a = JSON.parse(localStorage.getItem(KEY) || 'null'); return Array.isArray(a) && a.length === QS.length ? a : QS.map(() => null) } catch { return QS.map(() => null) } })
  const [finale, setFinale] = useState(false)
  const q = QS[i], mine = picked[i]
  const answered = picked.filter(x => x !== null).length, right = picked.filter((x, k) => x === QS[k].answer).length
  const choose = (k: number) => {
    if (mine !== null) return
    const n = picked.map((x, j) => j === i ? k : x); setPicked(n); try { localStorage.setItem(KEY, JSON.stringify(n)) } catch { /* 忽略 */ }
    if (n.every(x => x !== null)) setTimeout(() => setFinale(true), 1400)
  }
  const resetAll = () => { setPicked(QS.map(() => null)); setI(0); setFinale(false); try { localStorage.removeItem(KEY) } catch { /* 忽略 */ } }
  const done = { all: answered === QS.length, pass: right >= 7 }
  const hint = mine === null ? '选一个答案' : mine === q.answer ? '答对了' : `答错了：可以回到第 ${q.lesson} 课再做一遍`
  return (
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="动量和碰撞" lessons={LESSONS} current="q" narration={voiced(NARRATION['q'], VOICE)} onLesson={goLesson} onReset={resetAll} hint={hint} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Place at="q" labels={[]}><Desk /></Place>}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。动量和碰撞你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => setFinale(false)}>看每题的讲解</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="flex items-center justify-between text-[12.5px] text-white/55"><span>第 {i + 1} / {QS.length} 题 · 对应第 {q.lesson} 课</span><span className="tabular-nums">答对 {right} / {answered}</span></div>
          <div className="mt-2 flex gap-1">{QS.map((x, k) => <button key={k} onClick={() => setI(k)} aria-label={`第 ${k + 1} 题`} className={cn('h-1.5 flex-1 rounded-full', picked[k] === null ? 'bg-white/15' : picked[k] === x.answer ? 'bg-[#35c7b3]' : 'bg-[#ff6b6b]', k === i && 'ring-2 ring-white/60')} />)}</div>
          <p className="mt-4 text-[16px] leading-relaxed font-medium">{q.q}</p>
          <div className="mt-4 flex flex-col gap-2">
            {q.options.map((o, k) => {
              const isRight = mine !== null && k === q.answer, isWrong = mine === k && k !== q.answer
              return (
                <button key={k} onClick={() => choose(k)} disabled={mine !== null}
                  className={cn('flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-[15px] transition-colors', isRight ? 'bg-[#35c7b3]/25 text-white' : isWrong ? 'bg-[#ff6b6b]/25 text-white' : mine !== null ? 'bg-white/6 text-white/50' : 'bg-white/10 hover:bg-white/18')}>
                  <span className={cn('grid size-6 flex-none place-items-center rounded-full text-[13px] font-semibold', isRight ? 'bg-[#35c7b3] text-[#06231f]' : isWrong ? 'bg-[#ff6b6b] text-white' : 'bg-white/12')}>{isRight ? <Check className="size-3.5" strokeWidth={3.5} /> : isWrong ? <X className="size-3.5" strokeWidth={3.5} /> : 'ABCD'[k]}</span>{o}
                </button>
              )
            })}
          </div>
          {mine !== null && <p className="hint-in mt-4 rounded-xl bg-white/8 px-3.5 py-3 text-[14px] leading-relaxed text-white/85">{q.why}</p>}
        </Glass>
      }
      actions={<>
        <LabButton onClick={() => setI(k => Math.max(0, k - 1))} disabled={i === 0}><ArrowLeft className="size-4" />上一题</LabButton>
        <LabButton primary={mine !== null} pulse={mine !== null && i < QS.length - 1} onClick={() => setI(k => Math.min(QS.length - 1, k + 1))} disabled={i === QS.length - 1}>下一题<ArrowRight className="size-4" /></LabButton>
        {mine !== null && mine !== q.answer && <LabButton onClick={() => goLesson(q.lesson)}>回第 {q.lesson} 课</LabButton>}
      </>}
      extras={null}
    />
  )
}
