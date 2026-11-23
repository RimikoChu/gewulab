// 压强 · 拓展课：四个课本之外的小实验，共用一页，各在水电站里的一处。
import { useEffect, useRef, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import SceneX, { type Sub } from './scenex'
import { LESSONS, goLesson } from './lessons'
import { BALL, BOIL, JACK, P0, SPOTS, ballHold, kN, kPa, pWater, tonPerM2, type SpotKey } from './physics'
import { useSlide, useTasks } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

const SUBS: Record<Sub, { name: string; title: string; concept: string }> = {
  ball: { name: '半球', title: '马德堡半球', concept: '看不见的空气，力气大得惊人' },
  dive: { name: '下潜', title: '潜到一百米深', concept: '每往下 10 m，多压一个大气压' },
  boil: { name: '高原', title: '高原上煮不熟饭', concept: '气压低了，水不到 100 ℃ 就开' },
  jack: { name: '千斤顶', title: '小力气顶起大石头', concept: '压强传过去，面积大的那头力就大' },
}
const ORDER: Sub[] = ['ball', 'dive', 'boil', 'jack']
const TASKS: Task[] = [
  { id: 'ball', text: '半球：抽成真空，再把它拉开', note: '里面没有空气往外顶，外面的大气把两个半球死死压在一起' },
  { id: 'dive', text: '下潜：把潜水器开到 100 m 深', note: '100 m 深处，每平方米外壳上压着 100 吨' },
  { id: 'boil', text: '高原：在雪山顶烧开水，再换高压锅烧一次', note: '山顶的水 90 ℃ 就开了；高压锅里气压高，要到 120 ℃ 才开' },
  { id: 'jack', text: '千斤顶：把混凝土块顶起来', note: '大活塞的面积是小活塞的 100 倍，顶起来的力也是 100 倍' },
]

export default function LessonX() {
  const [sub, setSub] = useState<Sub>('ball')
  const T = useTasks('gewu:pressure:x', TASKS)
  // 半球
  const [vacGoal, setVacGoal] = useState(0), [pull, setPull] = useState(0), [apart, setApart] = useState(false)
  const vac = useSlide(vacGoal, 0.45), open = useSlide(apart ? 1 : 0, 2.4)
  const hold = ballHold(vac)
  useEffect(() => { if (pull > 0 && pull > hold + 1) { setApart(true); if (vac > 0.99) T.check(id => id === 'ball') } }, [pull, hold])   // eslint-disable-line react-hooks/exhaustive-deps
  // 下潜
  const [hGoal, setHGoal] = useState(0)
  const h = useSlide(hGoal, 16)
  useEffect(() => { if (h >= 99.9) T.check(id => id === 'dive') }, [h])   // eslint-disable-line react-hooks/exhaustive-deps
  // 烧水
  const [spot, setSpot] = useState<SpotKey>('crest'), [lid, setLid] = useState(false), [fire, setFire] = useState(false), [temp, setTemp] = useState(20)
  const got = useRef({ open: false, lid: false })
  const boilAt = lid ? BOIL.cooker : BOIL[spot]
  useEffect(() => {
    if (!fire) return
    let raf = 0, last = performance.now()
    const frame = (now: number) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; setTemp(t => Math.min(boilAt, t + dt * 14)); raf = requestAnimationFrame(frame) }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [fire, boilAt])
  const boiling = fire && temp >= boilAt - 0.05
  useEffect(() => { if (boiling && spot === 'peak') { got.current[lid ? 'lid' : 'open'] = true; if (got.current.open && got.current.lid) T.check(id => id === 'boil') } }, [boiling, spot, lid])   // eslint-disable-line react-hooks/exhaustive-deps
  const cool = () => { setFire(false); setTemp(20) }
  // 千斤顶
  const [push, setPush] = useState(0)
  const out = push * JACK.s2 / JACK.s1, lifted = out > JACK.load
  const lift = useSlide(lifted ? 0.35 : 0, 0.22)
  useEffect(() => { if (lift > 0.34) T.check(id => id === 'jack') }, [lift])   // eslint-disable-line react-hooks/exhaustive-deps

  const resetAll = () => { setSub('ball'); setVacGoal(0); setPull(0); setApart(false); setHGoal(0); setSpot('crest'); setLid(false); cool(); got.current = { open: false, lid: false }; setPush(0); T.reset() }
  const nextSub = ORDER.find(k => !T.done[k])
  const { hint, next }: { hint: string; next: string | null } = (() => {
    if (T.done[sub]) return nextSub ? { hint: `这个做完了。接着做：${SUBS[nextSub].name}`, next: 'sub' } : { hint: '四个拓展实验都做完了。', next: null }
    if (sub === 'ball') {
      if (apart) return vac > 0.99 ? { hint: '拉开了', next: null } : { hint: '没抽气的时候一拉就开。松开，先把球里的空气抽掉', next: 'c' }
      if (vacGoal === 0) return { hint: pull === 0 ? '先不抽气，拉一下试试；再把球里的空气抽掉' : '把球里的空气抽掉', next: 'a' }
      if (vac < 0.99) return { hint: '抽气中…', next: null }
      return { hint: `还拉不开：再加大拉力（要超过 ${kN(hold)} kN）`, next: 'b' }
    }
    if (sub === 'dive') return hGoal < 100 ? { hint: '往下潜：点按钮，或者抓住潜水器往下拖', next: h < 49 ? 'a' : 'b' } : { hint: '下潜中…', next: null }
    if (sub === 'boil') {
      if (spot !== 'peak') return { hint: fire ? `坝顶的水烧到 ${BOIL.crest} ℃ 才开。再把灶带到雪山顶` : '先在坝顶点火烧一次，再把灶带到雪山顶', next: fire ? 'c' : 'a' }
      if (!fire) return { hint: lid ? '点火，看高压锅里的水多少度才开' : '点火，看雪山顶的水多少度就开了', next: 'a' }
      if (!boiling) return { hint: '烧着呢…', next: null }
      return got.current.lid && !lid ? { hint: '', next: null } : lid ? { hint: '', next: null } : { hint: `${BOIL.peak} ℃ 就开了，饭煮不熟。换成高压锅再烧一次`, next: 'b' }
    }
    return push === 0 ? { hint: '先用 100 N 的力压小活塞试试', next: 'a' } : !lifted ? { hint: '顶不动：加到 300 N', next: 'b' } : { hint: '顶起来了…', next: null }
  })()

  const actions = {
    ball: <>
      <LabButton pulse={next === 'a'} onClick={() => { setVacGoal(v => (v ? 0 : 1)); setApart(false); setPull(0) }}>{vacGoal ? '放气进去' : '抽成真空'}</LabButton>
      <LabButton primary pulse={next === 'b'} onClick={() => setPull(p => Math.min(BALL.max, p + BALL.step))} disabled={apart || pull >= BALL.max}>加大拉力</LabButton>
      <LabButton pulse={next === 'c'} onClick={() => { setPull(0); setApart(false) }} disabled={pull === 0 && !apart}>松开</LabButton>
    </>,
    dive: <>
      <LabButton pulse={next === 'a'} onClick={() => setHGoal(50)}>下潜到 50 m</LabButton>
      <LabButton primary pulse={next === 'b'} onClick={() => setHGoal(100)}>下潜到 100 m</LabButton>
      <LabButton onClick={() => setHGoal(0)} disabled={hGoal === 0}>浮上来</LabButton>
    </>,
    boil: <>
      <LabButton primary pulse={next === 'a'} onClick={() => (fire ? cool() : setFire(true))}>{fire ? '关火' : '点火烧水'}</LabButton>
      <LabButton pulse={next === 'b'} onClick={() => { cool(); setLid(v => !v) }}>{lid ? '换回敞口锅' : '换成高压锅'}</LabButton>
      <LabButton pulse={next === 'c'} onClick={() => { cool(); setSpot(s => (s === 'crest' ? 'peak' : 'crest')) }}>{spot === 'crest' ? '带到雪山顶' : '带回坝顶'}</LabButton>
    </>,
    jack: <>
      <LabButton pulse={next === 'a'} onClick={() => setPush(JACK.weak)}>用 {JACK.weak} N 压</LabButton>
      <LabButton primary pulse={next === 'b'} onClick={() => setPush(JACK.strong)}>用 {JACK.strong} N 压</LabButton>
      <LabButton onClick={() => setPush(0)} disabled={push === 0}>松手</LabButton>
    </>,
  }[sub]

  return (
    <LabShell narration={voiced(NARRATION['x'], VOICE)} title="压强" lessons={LESSONS} current="x" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint}
      actionsLabel={{ ball: '半球', dive: '潜水器（也可以直接抓住它拖）', boil: '灶和锅', jack: '压小活塞' }[sub]}
      stage={<SceneX sub={sub} ball={{ vac, pull, open }} dive={{ h, onH: setHGoal }} boil={{ spot, lid, temp, boiling }} jack={{ push, lift }} />}
      lesson={
        <LessonBlock no="拓展" title={SUBS[sub].title} concept={SUBS[sub].concept} tasks={TASKS} done={T.done} current={sub}
          theory={{
            ball: <><p>1654 年，德国马德堡的市长把两个铜半球扣在一起，抽掉里面的空气，两边各用八匹马才把它们拉开。</p><p className="mt-2">球里没有空气往外顶，球外的大气压就把两个半球紧紧压在一起。要拉开，拉力得超过<b className="text-white">大气压 × 球的截面积</b>。</p></>,
            dive: <><p>水每深 10 m，压强大约增加一个大气压（约 100 kPa）。</p><p className="mt-2">我国的“蛟龙号”载人潜水器下潜到 7000 m 以下，那里水的压强约 7×10⁷ Pa，相当于 700 个大气压，每平方米外壳上压着 7000 吨。所以潜水器的舱是又厚又圆的球壳。</p></>,
            boil: <><p>水的沸点和气压有关：<b className="text-white">气压越低，沸点越低</b>。</p><p className="mt-2">海拔高的地方大气压小，水不到 100 ℃ 就开了，再怎么烧温度也上不去，饭煮不熟。高压锅把蒸汽闷在锅里，锅内气压升高，水要到 120 ℃ 左右才开。</p></>,
            jack: <><p>加在密闭液体上的压强，能大小不变地被液体向各个方向传递（帕斯卡定律）。</p><p className="my-3 rounded-xl bg-white/8 py-2.5 text-center font-formula text-[18px] text-white italic">F₁ / S₁ = F₂ / S₂</p><p>两头的压强一样，大活塞的面积大多少倍，顶起来的力就大多少倍。</p></>,
          }[sub]} />
      }
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四个拓展实验都做完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">压强的道理，到处都用得上</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">大气在压、深水在压、锅里的蒸汽在压，液体还能把压强传到别处去。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          {sub === 'ball' && <>
            <div className="text-center"><div className="text-[13px] text-white/60">要拉开它，每边至少要</div>
              <div className="mt-1 text-[44px] leading-none font-bold tracking-tight tabular-nums text-[#7fe3d4]">{kN(hold)}<span className="ml-1 text-[15px] font-medium text-white/55">kN</span></div>
              <div className="mt-2 text-[13px] text-white/55">{apart ? '已经拉开了' : pull > 0 ? `现在每边拉 ${kN(pull)} kN：拉不开` : '还没有拉'}</div></div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <ParamTile symbol={<>p<sub>外</sub></>} value={kPa(P0)} unit="kPa · 大气压" />
              <ParamTile symbol={<>p<sub>内</sub></>} value={kPa(P0 * (1 - vac))} unit="kPa · 球里" />
              <ParamTile symbol="S" value="0.126" unit="m² · 截面积" />
            </div>
            <p className="mt-3 text-[13.5px] leading-snug text-white/65">球的半径 0.2 m。里外的压强差 × 截面积，就是大气把两个半球压在一起的力。</p>
          </>}
          {sub === 'dive' && <>
            <div className="text-center"><div className="text-[13px] text-white/60">水对潜水器的压强</div>
              <div className="mt-1 text-[44px] leading-none font-bold tracking-tight tabular-nums text-[#7fe3d4]">{kPa(pWater(h))}<span className="ml-1 text-[15px] font-medium text-white/55">kPa</span></div>
              <div className="mt-2 text-[13px] text-white/55">约 {(pWater(h) / P0).toFixed(1)} 个大气压</div></div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <ParamTile symbol="h" value={h.toFixed(0)} unit="m · 深度" />
              <ParamTile symbol="p" value={kPa(pWater(h))} unit="kPa" />
              <ParamTile symbol="每 m²" value={tonPerM2(h).toFixed(0)} unit="吨 · 压着" />
            </div>
            <p className="mt-3 text-[13.5px] leading-snug text-white/65">这里是大坝脚下，水库最深的地方。真正的深海比这深得多。</p>
          </>}
          {sub === 'boil' && <>
            <div className="text-center"><div className="text-[13px] text-white/60">{boiling ? '水开了，温度不再升' : '水温'}</div>
              <div key={String(boiling)} className={boiling ? 'pop mt-1 text-[44px] leading-none font-bold tracking-tight tabular-nums text-[#ffb394]' : 'mt-1 text-[44px] leading-none font-bold tracking-tight tabular-nums'}>{temp.toFixed(0)}<span className="ml-1 text-[15px] font-medium text-white/55">℃</span></div></div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <ParamTile symbol="地点" value={SPOTS[spot].name} unit={SPOTS[spot].note} />
              <ParamTile symbol="锅" value={lid ? '高压锅' : '敞口'} unit={lid ? '锅内约 200 kPa' : `约 ${kPa(SPOTS[spot].p0)} kPa`} />
              <ParamTile symbol="沸点" value={String(boilAt)} unit="℃ · 约" />
            </div>
            <p className="mt-3 text-[13.5px] leading-snug text-white/65">水开了以后，再烧温度也不会升高。沸点低，饭就煮不熟。</p>
          </>}
          {sub === 'jack' && <>
            <div className="text-center"><div className="text-[13px] text-white/60">大活塞向上顶的力</div>
              <div key={String(lifted)} className={lifted ? 'pop mt-1 text-[44px] leading-none font-bold tracking-tight tabular-nums text-[#7fe3d4]' : 'mt-1 text-[44px] leading-none font-bold tracking-tight tabular-nums'}>{kN(out)}<span className="ml-1 text-[15px] font-medium text-white/55">kN</span></div>
              <div className="mt-2 text-[13px] text-white/55">{push === 0 ? '还没有压' : lifted ? '超过了混凝土块的重力：顶起来了' : '比混凝土块的重力小：顶不动'}</div></div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <ParamTile symbol={<>F<sub>1</sub></>} value={String(push)} unit="N · 手压" />
              <ParamTile symbol="p" value={kPa(push / JACK.s1)} unit="kPa · 油里" />
              <ParamTile symbol={<>F<sub>2</sub></>} value={kN(out)} unit="kN · 顶起" />
            </div>
            <p className="mt-3 text-[13.5px] leading-snug text-white/65">小活塞 10 cm²，大活塞 1000 cm²。油里的压强处处一样，面积大 100 倍，力也大 100 倍。混凝土块重 {kN(JACK.load)} kN。</p>
          </>}
        </Glass>
      }
      actions={actions}
      extras={
        <Control label="拓展实验">
          <Segmented label="拓展实验" pulse={next === 'sub'} want={nextSub ?? null} value={sub} onChange={k => setSub(k as Sub)} options={ORDER.map(k => ({ value: k, label: SUBS[k].name }))} />
        </Control>
      }
    />
  )
}
