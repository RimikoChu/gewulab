// 生态系统 · 第 5 课 能量流动：坡顶上一条“草 → 鼠 → 蛇 → 鹰”。阳光照到草上，草把太阳能固定下来；
// 每按一次，光点沿箭头流到下一级，头顶的数字一级比一级小，每一级都有一部分能量随呼吸作用以热的形式散失（往上飘的暖光）。
// 换成 20% 再传一遍；面板里一层层搭出能量金字塔。
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { cn } from '@/lib/utils'
import { Eagle, Mouse, Snake } from './animals'
import { GlowArrow, Halo, Heat, SunBeam } from './fx'
import { Rock, Stump } from './lesson3'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { ENERGY_CHAIN, GRASS_ENERGY, RATES, energyAt, type RateKey } from './physics'
import { useRun, type V3 } from './parts'
import { Finale, H } from './ui'
import { VOICE } from './voice'
import { Room, ST, onGround } from './world'

const X = ST.hill.x, Z = ST.hill.z, STUMP = 0.5
const POS: V3[] = [onGround(X - 0.95, Z + 0.55), onGround(X - 0.38, Z + 0.62), onGround(X + 0.22, Z + 0.5), onGround(X + 0.9, Z + 0.05)]
const LIFT = [0.16, 0.16, 0.14, STUMP + 0.8]
const ROCK5 = onGround(X + 0.5, Z - 0.05)
const TIP: V3[] = POS.map((p, i) => [p[0], p[1] + LIFT[i], p[2]])
const fmt = (e: number) => e.toLocaleString('zh-CN', { maximumFractionDigits: 0 })
const pct = (k: RateKey) => `${Math.round(RATES[k] * 100)}%`

const TASKS: Task[] = [
  { id: 'sun', text: '让阳光照到草上，草把太阳能固定下来', note: `生态系统的能量来自太阳：草固定了 ${fmt(GRASS_ENERGY)} kJ` },
  { id: 'low', text: '按 10% 一级一级传到鹰', note: `传到鹰只剩 ${fmt(energyAt(4, RATES.low))} kJ` },
  { id: 'high', text: '换成 20%，再传一遍', note: `就算按 20%，传到鹰也只有 ${fmt(energyAt(4, RATES.high))} kJ` },
]

export default function Lesson5() {
  const [sun, setSun] = useState(false), [rate, setRate] = useState<RateKey>('low'), [level, setLevel] = useState(0)
  const T = useTasks('gewu:eco:5', TASKS)
  const k = useRun(level, 1.3), beam = useRun(sun ? 1 : 0, 1.2)
  useEffect(() => { T.check(id => id === 'sun' ? k >= 1 : id === 'low' ? rate === 'low' && level === 4 && k >= 4 : id === 'high' ? rate === 'high' && level === 4 && k >= 4 : false) }, [k >= 1, k >= 4, rate, level])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setSun(false); setRate('low'); setLevel(0); T.reset() }
  const busy = Math.abs(k - level) > 0.001 || (sun && beam < 1)
  const task = T.current, r = RATES[rate]
  const { hint, nx }: { hint: string; nx: 'sun' | 'pass' | 'rate' | null } = (() => {
    if (!task) return { hint: '能量沿食物链流动，逐级递减。营养级越高，得到的能量越少。', nx: null }
    if (busy) return { hint: '能量往上走…', nx: null }
    if (!sun) return { hint: '能量从哪里来？按“阳光照射”', nx: 'sun' }
    if (task.id === 'high' && rate !== 'high') return { hint: `传到鹰只剩 ${fmt(energyAt(4, RATES.low))} kJ。换成 20% 再传一遍`, nx: 'rate' }
    if (level < 4) return { hint: `${ENERGY_CHAIN[level - 1]}得到 ${fmt(energyAt(level, r))} kJ。按“传给下一级”`, nx: 'pass' }
    return { hint: '…', nx: null }
  })()
  const labels: Label[] = ENERGY_CHAIN.map((nm, i) => {
    const got = k >= i + 1 - 0.02
    return { id: nm, at: [TIP[i][0], TIP[i][1] + 0.2, TIP[i][2]] as V3, ax: 0.5, className: `scene-tag ${got ? 'key' : ''} -translate-y-full`, children: got ? <><small>{nm}</small>{fmt(energyAt(i + 1, r))} kJ</> : nm }
  })
  return (
    <LabShell title="生态系统" lessons={LESSONS} current="5" narration={voiced(NARRATION['5'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={`传递比例 ${pct(rate)}`}
      stage={<Room at="s5" labels={labels} bloom={0.7} span={[2.4, 1.15]} shift={[0.05, -0.3, 0.35]}>
        <Mouse position={POS[1]} rotation-y={-0.4} scale={1.7} />
        <Snake position={POS[2]} rotation-y={Math.PI - 0.2} len={0.5} scale={1.8} />
        <Rock at={ROCK5} s={[0.26, 0.17, 0.22]} />
        <Stump at={POS[3]} h={STUMP} />
        <Eagle position={[POS[3][0], POS[3][1] + STUMP, POS[3][2]]} rotation-y={-2.5} />
        <Halo at={POS[0]} r={0.22} />
        <SunBeam at={POS[0]} on={beam} r={0.45} />
        {TIP.slice(1).map((p, i) => <GlowArrow key={i} from={TIP[i]} to={p} lift={0.25} on={k - 1 - i} flow={k >= i + 2 ? 0.8 * Math.pow(r, i) / 1 + 0.15 : 0} width={0.03 * Math.pow(0.72, i)} />)}
        {TIP.map((p, i) => k >= i + 1 && <Heat key={i} at={[p[0], p[1] + 0.05, p[2]]} k={0.9 - i * 0.12} />)}
      </Room>}
      lesson={<LessonBlock no="5" title="能量流动" concept="能量沿食物链逐级递减" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>生态系统的能量最终来自<b className="text-white">太阳</b>：生产者通过光合作用把太阳能固定在有机物里，再沿着食物链一级一级往上传。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>每一级的生物都要通过呼吸作用消耗能量，还有一部分随遗体、粪便流向分解者，所以只有一小部分（大约 10%–20%）传到下一级。</li>
            <li>能量是单向流动、逐级递减的。把各级的能量画成一层层，就像一座金字塔。</li>
          </ul>
        </>} />}
      finale={T.finale && <Finale kicker="两遍都传到了鹰" title="能量沿食物链单向流动、逐级递减" text={`草固定了 ${fmt(GRASS_ENERGY)} kJ，传到鹰时按 10% 只剩 ${fmt(energyAt(4, RATES.low))} kJ，按 20% 也只有 ${fmt(energyAt(4, RATES.high))} kJ。大部分能量在每一级的呼吸作用中散失了。`} notes={`草固定的 ${fmt(GRASS_ENERGY)} kJ 是示意的数；暖色的光表示散失的热；鼠和蛇画得比真的大一些。`} onClose={() => T.setFinale(false)} />}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center"><div className="text-[13px] text-white/60">能量金字塔 · {pct(rate)}</div></div>
          <div className="mt-3 flex flex-col items-center gap-1.5">
            {[...ENERGY_CHAIN].reverse().map((nm, j) => {
              const i = ENERGY_CHAIN.length - 1 - j, got = k >= i + 1 - 0.02, w = 30 + (ENERGY_CHAIN.length - i) * 17
              return (
                <div key={nm} className={cn('flex h-9 items-center justify-between rounded-md px-2.5 text-[13px] transition-all duration-700', got ? 'bg-[#e8b84a]/85 text-[#2a1d05]' : 'bg-white/8 text-white/40')} style={{ width: `${w}%` }}>
                  <span className="font-semibold">{nm}</span><span className="tabular-nums">{got ? `${fmt(energyAt(i + 1, r))} kJ` : '—'}</span>
                </div>
              )
            })}
          </div>
          <p className="mt-2 text-center text-[12px] text-white/45">各层宽度只是示意，不按比例</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="传到下一级" value={pct(rate)} unit="大约 10%–20%" />
            <ParamTile symbol="鹰" value={k >= 4 ? `${fmt(energyAt(4, r))} kJ` : '—'} unit="第四营养级" />
          </div>
          <H>其余的能量去哪了</H>
          <p className="text-[13.5px] leading-snug text-white/75">大部分在呼吸作用中以热的形式散失；还有一部分随遗体、粪便流向分解者。</p>
        </Glass>
      }
      actions={<>
        <LabButton pulse={nx === 'sun'} onClick={() => { setSun(true); setLevel(1) }} disabled={busy || sun}>阳光照射</LabButton>
        <LabButton primary pulse={nx === 'pass'} onClick={() => setLevel(l => Math.min(4, l + 1))} disabled={busy || !sun || level >= 4}>传给下一级</LabButton>
      </>}
      extras={<Control label="传到下一级的比例"><Segmented label="传到下一级的比例" pulse={nx === 'rate'} want={nx === 'rate' ? 'high' : null} value={rate} onChange={v => { if (busy) return; setRate(v); if (sun) setLevel(1) }} options={[{ value: 'low', label: '10%' }, { value: 'high', label: '20%' }]} /></Control>}
    />
  )
}
