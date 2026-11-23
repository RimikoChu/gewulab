// 燃烧和灭火 · 第 5 课 灭火的原理：训练场的灭火实训区，三处火：燃气灶（接着液化气钢瓶）、油锅、一垛木柴。
// 每处火选一种办法灭：关阀门（隔离可燃物）、盖锅盖（隔绝空气）、浇水（降温到着火点以下）。选错了不报错，说明为什么不行。
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { Glove, Hose } from './gear'
import { Bucket, GasCylinder, Lid, STOVE, SteelTable, SteelTray, Stove, TABLE_H, WOK, Wok, WoodCrib } from './yardgear'
import { Blaze, Puffs, SMOKE } from './fx'
import { ease, lerp, liftPath, seg, useRun } from './parts'
import { FIRES5, WAYS, quench, type Fire5, type Way } from './physics'
import { M, YARD, Place, type V3 } from './world'

const TH = TABLE_H * M
const POS: Record<Fire5, { x: number; z: number }> = { gas: YARD.gas, oil: YARD.oil, wood: YARD.wood5 }
const ORDER: Fire5[] = ['gas', 'oil', 'wood']
const WAY_ORDER: Way[] = ['cut', 'cover', 'cool']
const TASKS: Task[] = [
  { id: 'gas', text: '燃气灶着火了：选一种办法灭掉它', note: '关掉燃气阀门：隔离了可燃物' },
  { id: 'oil', text: '油锅着火了：选一种办法灭掉它', note: '盖上锅盖：隔绝了空气（氧气）' },
  { id: 'wood', text: '木柴着火了：选一种办法灭掉它', note: '用水浇：温度降到了着火点以下' },
]
const ACT = 3.6

/** 每处火的火焰底部（世界坐标） */
const base = (f: Fire5): V3 => f === 'gas' ? [POS.gas.x, TH + STOVE.top * M, POS.gas.z] : f === 'oil' ? [POS.oil.x, TH + 0.06 * M + WOK.h * M * 0.4, POS.oil.z] : [POS.wood.x, 0.1 * M, POS.wood.z]

export default function Lesson5() {
  const [fire, setFire] = useState<Fire5>('gas')
  const [out, setOut] = useState<Partial<Record<Fire5, Way>>>({})
  const [tried, setTried] = useState<{ f: Fire5; w: Way } | null>(null)
  const T = useTasks('gewu:fire:5', TASKS)
  const act = useRun(ACT, () => { if (!tried) return; const q = quench(tried.f, tried.w); if (q.ok) { setOut(o => ({ ...o, [tried.f]: tried.w })); T.check(id => id === tried.f) } })
  const t = act.t, doing = act.busy ? tried : null
  const go = (w: Way) => { if (act.busy || out[fire]) return; setTried({ f: fire, w }); act.run() }
  const pick = (f: Fire5) => { if (act.busy) return; act.snap(0); setTried(null); setFire(f) }
  const resetAll = () => { act.snap(0); setTried(null); setFire('gas'); setOut({}); T.reset() }
  // 每处火此刻有多大：灭掉了是 0；正在用对的办法灭，慢慢变小；油锅泼水，火猛地蹿起来
  const lvl = (f: Fire5) => {
    if (out[f]) return 0
    if (doing && doing.f === f) {
      const ok = quench(f, doing.w).ok
      if (ok) return 1 - ease(seg(t, doing.w === 'cool' ? 1.6 : 1.4, ACT - 0.3))
      if (f === 'oil' && doing.w === 'cool') return 1 + 1.3 * Math.sin(Math.PI * seg(t, 1.5, 3.2))
    }
    return 1
  }
  const result = tried && !act.busy ? quench(tried.f, tried.w) : null
  const task = T.current, want = (task?.id as Fire5 | undefined) ?? null
  const { hint, next }: { hint: string; next: 'fire' | null } = !task ? { hint: '灭火的原理：清除或隔离可燃物，隔绝氧气，使温度降到着火点以下。', next: null }
    : act.busy ? { hint: `${WAYS[doing!.w].name}…`, next: null }
    : fire !== want ? { hint: `去“${FIRES5[want!].name}”那里`, next: 'fire' }
    : result && !result.ok ? { hint: '换一种办法试试', next: null }
    : { hint: `${FIRES5[fire].name}着火了。想一想，用哪种办法灭它？`, next: null }
  // 自动演示：到了该去的那处火，就用对的办法
  const autoStep = () => { if (act.busy) return true; if (task && fire === want && !out[fire]) { go(FIRES5[fire].fix); return true } return false }

  // 关阀门：手套伸到钢瓶顶上，把手轮拧紧
  const cyl: V3 = [POS.gas.x + 0.95 * M, 0, POS.gas.z - 0.15 * M]
  const valveTurn = doing?.w === 'cut' && doing.f === 'gas' ? ease(seg(t, 0.6, 1.6)) : out.gas ? 1 : 0
  const handAtValve = doing?.w === 'cut' && doing.f === 'gas' ? seg(t, 0, 0.6) - seg(t, 2.4, 3.2) : 0
  // 盖锅盖：手套从台边拿起锅盖，盖到锅上
  const lidHome: V3 = [POS.oil.x - 0.42 * M, TH + 0.005 * M, POS.oil.z + 0.12 * M], lidOn: V3 = [POS.oil.x, TH + 0.06 * M + WOK.h * M + 0.002, POS.oil.z]
  const lidK = out.oil === 'cover' ? 1 : doing?.w === 'cover' && doing.f === 'oil' ? seg(t, 0, 1.4) : 0
  const lidP = liftPath(lidHome, lidOn, lidOn[1] + 0.25 * M, lidK)
  // 浇水：手套提着水桶走到火边，桶一倾，水泼出去
  const target = base(doing?.f ?? fire)
  const pourK = doing?.w === 'cool' ? seg(t, 0, 1.0) - seg(t, 2.8, ACT) : 0
  const bucketHome: V3 = [POS.wood.x + 0.9 * M, 0, POS.wood.z + 0.6 * M]
  const bucketAt: V3 = [target[0] + 0.55 * M, target[1] + 0.35 * M, target[2] + 0.25 * M]
  const bp: V3 = [lerp(bucketHome[0], bucketAt[0], ease(pourK)), lerp(bucketHome[1], bucketAt[1], ease(pourK)), lerp(bucketHome[2], bucketAt[2], ease(pourK))]
  const tilt = doing?.w === 'cool' ? ease(seg(t, 1.0, 1.5)) * (1 - ease(seg(t, 2.4, 2.8))) * 1.9 : 0
  const splash = doing?.w === 'cool' && t > 1.2 && t < 2.6

  const labels: Label[] = [
    ...ORDER.filter(f => out[f]).map(f => ({ id: `o${f}`, at: [base(f)[0] + 0.35 * M, base(f)[1] + 0.35 * M, base(f)[2]] as V3, className: 'scene-tag key -translate-y-1/2', children: <><small>{WAYS[out[f]!].name}</small>{WAYS[out[f]!].principle}</> })),
    { id: 'n1', at: [cyl[0] + 0.25 * M, 0.5 * M, cyl[2]], name: true, className: 'scene-name', children: '液化气钢瓶 · 阀门' },
    { id: 'n2', at: [lidHome[0], lidHome[1] + 0.12 * M, lidHome[2] + 0.2], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '锅盖' },
    { id: 'n3', at: [bucketHome[0] + 0.25 * M, 0.35 * M, bucketHome[2]], name: true, className: 'scene-name', children: '水桶' },
  ]
  const lab = <Place at={fire === 'gas' ? 'gas' : fire === 'oil' ? 'oil' : 'wood5'} labels={labels}>
    {/* 燃气灶：不锈钢台上一只灶，一根胶管接到旁边的液化气钢瓶 */}
    <group position={[POS.gas.x, TH, POS.gas.z]}><SteelTable w={1.1} d={0.65} /></group>
    <group position={[POS.gas.x, TH, POS.gas.z]}><Stove /></group>
    <group position={cyl}><GasCylinder open={1 - valveTurn} /></group>
    <Hose pts={[[cyl[0] - 0.03 * M, 0.62 * M, cyl[2]], [cyl[0] - 0.2 * M, 0.5 * M, cyl[2] + 0.05 * M], [POS.gas.x + 0.4 * M, TH - 0.1 * M, POS.gas.z], [POS.gas.x + 0.2 * M, TH + 0.025 * M, POS.gas.z - 0.08 * M]]} r={0.008 * M} color="#c79a2e" />
    <Blaze at={base('gas')} w={0.16 * M} h={0.42 * M} spread={0.07 * M} kind="gas" level={lvl('gas')} n={5} light={22} seed={1} />
    {handAtValve > 0 && <group position={[cyl[0], 0.68 * M + (1 - handAtValve) * 0.3 * M, cyl[2] + 0.03 * M]} rotation={[0.25, valveTurn * 2.4, 0]}><Glove kind="fire" s={0.009 * M} /></group>}
    {/* 油锅：灶上一口铁锅，锅盖放在台边 */}
    <group position={[POS.oil.x, TH, POS.oil.z]}><SteelTable w={1.2} d={0.7} /></group>
    <group position={[POS.oil.x, TH, POS.oil.z]}><Stove /></group>
    <group position={[POS.oil.x, TH + 0.06 * M, POS.oil.z]}><Wok oil={out.oil ? '#2a1d10' : '#7a5418'} /></group>
    <group position={lidP}><Lid />{doing?.w === 'cover' && lidK < 1 && <group position={[0, 0.1 * M, 0]} rotation={[0.4, 0, 0]}><group rotation-z={Math.PI / 2}><Glove kind="fire" s={0.009 * M} /></group></group>}</group>
    <Blaze at={base('oil')} w={0.2 * M} h={0.55 * M} spread={0.08 * M} kind="oil" level={Math.min(2.3, lvl('oil'))} n={5} light={24} seed={3} />
    <Puffs at={[base('oil')[0], base('oil')[1] + 0.6 * M, base('oil')[2]]} on={lvl('oil') > 0.2} opt={SMOKE.dark(1.0)} seed={4} />
    <Puffs at={[base('oil')[0], base('oil')[1] + 0.1 * M, base('oil')[2]]} on={doing?.f === 'oil' && doing.w === 'cool' && t > 1.4 && t < 2.6} opt={{ rate: 40, life: 0.9, size: [0.03 * M, 0.06 * M], speed: 1.6 * M, spread: 0.9, color: '#ffae4a', opacity: 0.9, accel: [0, -9 * M, 0], additive: true }} seed={5} />
    {/* 木柴：钢盘里一垛木柴 */}
    <group position={[POS.wood.x, 0, POS.wood.z]}><SteelTray w={1.0} d={1.0} /></group>
    <group position={[POS.wood.x, 0.02 * M, POS.wood.z]}><WoodCrib n={5} len={0.7} sec={0.08} char={out.wood ? 0.8 : 0.5} glow={lvl('wood') * 0.8} /></group>
    <Blaze at={[POS.wood.x, 0.15 * M, POS.wood.z]} w={0.5 * M} h={1.0 * M} spread={0.25 * M} kind="wood" level={lvl('wood')} n={7} light={36} seed={6} />
    <Puffs at={[POS.wood.x, 1.1 * M, POS.wood.z]} on={lvl('wood') > 0.2} opt={SMOKE.dark(1.6)} seed={7} />
    {/* 水桶和泼出去的水；水落到火上变成白汽 */}
    <group position={bp}>
      <group rotation-z={tilt}><Bucket water={tilt > 1 ? 0.15 : 0.7} /></group>
      {doing?.w === 'cool' && <group position={[0.02 * M, 0.34 * M, 0]} rotation={[0.3, 0, -0.2]}><Glove kind="fire" s={0.009 * M} /></group>}
    </group>
    <Puffs at={[bp[0] - 0.15 * M, bp[1] + 0.3 * M, bp[2]]} on={splash} opt={{ rate: 50, life: 0.8, size: [0.05 * M, 0.14 * M], speed: 2.0 * M, dir: [-0.9, 0.25, -0.2], spread: 0.18, color: '#cfe6f2', opacity: 0.6, accel: [0, -9 * M, 0] }} seed={8} />
    <Puffs at={[target[0], target[1] + 0.2 * M, target[2]]} on={doing?.w === 'cool' && t > 1.6 && t < 3.4 && doing.f !== 'oil'} opt={SMOKE.steam(1.2)} seed={9} />
  </Place>
  return (
    <LabShell autoStep={autoStep} title="燃烧和灭火" lessons={LESSONS} current="5" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="灭火的办法"
      stage={lab}
      lesson={<LessonBlock no="5" title="灭火的原理" concept="破坏燃烧的条件，就能灭火" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>燃烧需要三个条件同时具备，只要破坏其中一个，火就灭了。灭火的原理：</p>
          <ul className="mt-2 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>（1）清除或隔离可燃物：关闭燃气阀门；扑灭森林火灾时开辟隔离带</li>
            <li>（2）隔绝氧气（或空气）：油锅着火盖上锅盖；用灯帽盖灭酒精灯</li>
            <li>（3）使温度降到着火点以下：用水浇灭木材着的火</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">油锅着火千万不能浇水。燃气泄漏着火，先关阀门。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,460px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三处火都灭了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">灭火，就是破坏燃烧的条件</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">关阀门隔离可燃物，盖锅盖隔绝氧气，浇水把温度降到着火点以下。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{FIRES5[fire].name}</div>
            <div className="mt-1 text-[38px] leading-none font-bold tracking-tight">{out[fire] ? '灭了' : '着火'}</div>
            {out[fire] && <div className="mt-1.5 text-[13px] text-[#7fe3d4]">{WAYS[out[fire]!].principle}</div>}
          </div>
          {result && tried && tried.f === fire && <p className={`hint-in mt-4 rounded-xl px-3 py-3 text-[14px] leading-relaxed ${result.ok ? 'bg-[#35c7b3]/15 text-white/90' : 'bg-[#ff6b6b]/15 text-white/90'}`}>{result.why}</p>}
          <h2 className="mt-4 text-[12.5px] text-white/55">三处火</h2>
          <table className="mt-2 w-full text-center text-[13.5px]">
            <tbody>{ORDER.map(f => <tr key={f} className={f === fire ? 'bg-white/10' : 'bg-white/[0.04]'}>
              <td className="rounded-l-lg px-2 py-1.5 text-left">{FIRES5[f].name}</td><td>{out[f] ? WAYS[out[f]!].name : '—'}</td>
              <td className="rounded-r-lg py-1.5 text-[13px] text-[#7fe3d4]">{out[f] ? WAYS[out[f]!].principle : ''}</td></tr>)}</tbody>
          </table>
        </Glass>
      }
      actions={<>
        {WAY_ORDER.map(w => <LabButton key={w} onClick={() => go(w)} disabled={act.busy || !!out[fire]}>{WAYS[w].name}</LabButton>)}
      </>}
      extras={
        <Control label="哪处火">
          <Segmented label="哪处火" pulse={next === 'fire'} want={next === 'fire' ? want : null} disabled={act.busy} value={fire} onChange={f => pick(f as Fire5)} options={ORDER.map(f => ({ value: f, label: FIRES5[f].name }))} />
        </Control>
      }
    />
  )
}
