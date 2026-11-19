// 实验页统一外壳（沉浸式）：三维场景铺满全屏，课次条、课程块、读数面板、操作条都是叠在上面的半透明浮层。各实验室共用。
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, Check, ChevronDown, Play, RotateCcw, Square } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface LessonTab { key: string; no: string; name: string; disabled?: boolean }
export interface Task { id: string; text: string; note: string }

/**
 * actions：这一课最主要的两三个按钮（手机上固定在屏幕底部）；extras：其余的选项；
 * hint：一句话告诉学生下一步做什么；finale：全部任务完成时弹出的结论卡。
 *
 * 自动演示：顶栏有一个“自动演示”，按下去先重做本课，然后每隔一秒替学生做下一步，一直做到结论卡。
 * “下一步”就是现在在闪的那个控件：闪着的按钮直接点；闪着的分段选择点它 want 指的那一项。
 * 下一步不是按钮的（比如要点场景里的东西），这一课用 autoStep 自己做，做了就返回 true。
 */
export function LabShell({ title, lessons, current, onLesson, stage, lesson, panel, actions, actionsLabel = '吊车（按住连续升降，也可以直接拖物块）', extras, hint, banner, finale, onReset, autoStep }: {
  title: string; lessons: LessonTab[]; current: string; onLesson: (key: string) => void
  stage: ReactNode; lesson: ReactNode; panel: ReactNode; actions: ReactNode; actionsLabel?: string; extras: ReactNode; hint: string
  banner?: string | null; finale?: ReactNode; onReset: () => void; autoStep?: () => boolean
}) {
  const root = useRef<HTMLDivElement>(null)
  const [auto, setAuto] = useState(false)
  const live = useRef({ autoStep, done: !!finale }); live.current = { autoStep, done: !!finale }
  useEffect(() => {
    if (!auto) return
    const t = setInterval(() => {
      if (live.current.done) { setAuto(false); return }
      if (live.current.autoStep?.()) return
      const el = root.current?.querySelector<HTMLButtonElement>('[data-auto]:not(:disabled)') ?? root.current?.querySelector<HTMLButtonElement>('button.lab-pulse:not(:disabled)')
      el?.click()
    }, 1100)
    return () => clearInterval(t)
  }, [auto])
  const toggleAuto = () => { if (auto) setAuto(false); else { onReset(); setAuto(true) } }
  const hintLine = <p key={hint} className="hint-in text-center text-[14px] font-medium text-[#ffe9a8]">{hint}</p>
  return (
    <div ref={root} className="lab-dark relative flex min-h-dvh flex-col bg-[#0f1418] text-white lg:h-dvh lg:overflow-hidden">
      <div className="relative h-[58svh] flex-none touch-none lg:absolute lg:inset-0 lg:h-auto">
        {stage}
        {/* 上下两道渐变，让叠在画面上的字看得清 */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/45 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-40 bg-gradient-to-t from-black/40 to-transparent lg:block" />
        <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[440px] bg-gradient-to-r from-black/55 to-transparent lg:block" />
      </div>

      <header className="absolute inset-x-0 top-0 z-30 flex h-14 items-center gap-2 px-3 sm:px-4">
        <a href="/" className="flex h-10 flex-none items-center gap-2 rounded-lg px-2.5 text-[15px] font-semibold hover:bg-white/10"><ArrowLeft className="size-4" />{title}</a>
        <nav className="glass flex min-w-0 items-center gap-0.5 overflow-x-auto rounded-xl p-1 [scrollbar-width:none]" aria-label="课次">
          {lessons.map(l => (
            <button key={l.key} disabled={l.disabled} aria-current={l.key === current} onClick={() => l.key !== current && onLesson(l.key)}
              className={cn('flex h-9 flex-none items-center gap-1.5 rounded-lg px-2.5 text-[13.5px] whitespace-nowrap text-white/75',
                'aria-[current=true]:bg-white aria-[current=true]:font-semibold aria-[current=true]:text-[#10151a]',
                l.disabled ? 'opacity-45' : 'hover:bg-white/10')}>
              <span className="text-[12px] tabular-nums opacity-60">{l.no}</span>{l.name}
            </button>
          ))}
        </nav>
        <button onClick={toggleAuto} aria-pressed={auto} className={cn('ml-auto flex h-10 flex-none items-center gap-1.5 rounded-lg px-2.5 text-[13.5px] hover:bg-white/10', auto ? 'bg-[#35c7b3]/20 text-[#7fe3d4]' : 'text-white/80')}>{auto ? <Square className="size-3.5" /> : <Play className="size-3.5" />}<span className="hidden sm:inline">{auto ? '停止演示' : '自动演示'}</span></button>
        <button onClick={() => { setAuto(false); onReset() }} className="flex h-10 flex-none items-center gap-1.5 rounded-lg px-2.5 text-[13.5px] text-white/80 hover:bg-white/10"><RotateCcw className="size-3.5" /><span className="hidden sm:inline">重做本课</span></button>
      </header>

      {banner && (
        <div className="pointer-events-none absolute inset-x-0 top-16 z-40 flex justify-center px-3">
          <div className="flex items-center gap-2 rounded-xl bg-[#35c7b3] px-4 py-2.5 text-[15px] font-semibold text-[#06231f] shadow-lg"><Check className="size-4" strokeWidth={3} />{banner}</div>
        </div>
      )}

      {/* 窄屏：场景下面依次是操作条、读数面板、课程块；宽屏：各自浮在画面四周 */}
      <div className="relative z-20 flex flex-col gap-3 p-3 pb-36 lg:pointer-events-none lg:absolute lg:inset-0 lg:block lg:p-0">
        <div className="lg:pointer-events-auto lg:absolute lg:bottom-4 lg:left-[300px] lg:right-[350px] lg:flex lg:justify-center">
          <div className="glass flex flex-col gap-2.5 rounded-2xl px-3.5 py-3">
            <div className="hidden lg:block">{hintLine}</div>
            <div className="flex flex-wrap items-end justify-center gap-x-4 gap-y-3">
              <div className="hidden lg:block"><Control label={actionsLabel}>{actions}</Control></div>
              {extras}
            </div>
          </div>
        </div>
        <div className="lg:pointer-events-auto lg:absolute lg:top-[68px] lg:right-4 lg:bottom-4 lg:w-[322px] lg:overflow-y-auto lg:[scrollbar-width:none]">{panel}</div>
        <div className="lg:pointer-events-auto lg:absolute lg:top-[76px] lg:left-5 lg:w-[272px]">{lesson}</div>
      </div>

      {/* 手机：主按钮固定在屏幕底部，按的时候不挡读数 */}
      <div className="glass fixed inset-x-0 bottom-0 z-40 flex flex-col gap-2 rounded-t-2xl px-3 pt-2.5 pb-[max(12px,env(safe-area-inset-bottom))] lg:hidden">
        {hintLine}
        <div className="grid grid-cols-3 gap-2 [&>button]:px-2">{actions}</div>
      </div>

      {finale && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">{finale}</div>}
    </div>
  )
}

/** 课程块：大标题、一句概念、任务清单；原理默认收起 */
export function LessonBlock({ no, title, concept, tasks, done, current, theory }: {
  no: string; title: string; concept: string; tasks: Task[]; done: Record<string, boolean>; current?: string; theory: ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <section>
      <p className="text-[12.5px] tracking-[0.18em] text-white/60">{/^\d+$/.test(no) ? `第 ${no} 课` : no === '拓展' ? '拓展课' : no}</p>
      <h1 className="mt-1 text-[34px] leading-[1.1] font-bold tracking-tight [text-shadow:0_2px_18px_rgb(0_0_0/0.45)]">{title}</h1>
      <p className="mt-2 text-[16px] leading-snug font-medium text-[#7fe3d4] [text-shadow:0_1px_10px_rgb(0_0_0/0.5)]">{concept}</p>
      <ul className="glass mt-4 flex flex-col rounded-2xl p-1.5">
        {tasks.map(t => (
          <li key={t.id} className={cn('rounded-xl px-2.5 py-2 text-[14px] leading-snug transition-colors', t.id === current && 'bg-white/10')}>
            <div className="flex items-start gap-2.5">
              <span className={cn('mt-[2px] grid size-[17px] flex-none place-items-center rounded-full border-[1.5px]', done[t.id] ? 'border-[#35c7b3] bg-[#35c7b3] text-[#06231f]' : 'border-white/40')}>
                {done[t.id] && <Check className="size-2.5" strokeWidth={4} />}
              </span>
              <span className={done[t.id] || t.id === current ? 'text-white' : 'text-white/60'}>{t.text}</span>
            </div>
            {done[t.id] && <p className="mt-1 pl-[27px] text-[13px] text-[#7fe3d4]">{t.note}</p>}
          </li>
        ))}
      </ul>
      {/* 原理：默认收起；展开后是一张单独的卡片，不挤在任务清单里 */}
      <button onClick={() => setOpen(o => !o)} aria-expanded={open}
        className="glass mt-2 flex h-10 w-full items-center justify-between rounded-xl px-3.5 text-[13.5px] text-white/75 hover:text-white">
        {open ? '收起原理' : '看原理'}<ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="glass hint-in mt-2 rounded-2xl px-4 py-4 text-[14.5px] leading-[1.7] text-white/90">{theory}</div>}
    </section>
  )
}

/** 半透明面板 */
export function Glass({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('glass rounded-2xl', className)}>{children}</div>
}

/** 关键参数格：数值变化时闪一下 */
export function ParamTile({ symbol, value, unit }: { symbol: ReactNode; value: string; unit: string }) {
  return (
    <div key={value} className="param-flash rounded-xl bg-white/8 px-3 py-2.5">
      <div className="font-formula text-[17px] italic text-white/65">{symbol}</div>
      <div className="mt-0.5 text-[22px] leading-tight font-bold tabular-nums">{value}</div>
      <div className="text-[12px] text-white/55">{unit}</div>
    </div>
  )
}

/** 操作条里的一组控件：上面是名字，下面是控件本身 */
export function Control({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex max-w-full flex-col gap-1.5">
      <span className="text-[12px] text-white/55">{label}</span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

/** 操作按钮：primary 是主按钮；pulse 表示“现在该按它”，会轻轻闪 */
export function LabButton({ primary, pulse, className, ...rest }: { primary?: boolean; pulse?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...rest} className={cn('flex h-11 items-center justify-center gap-1.5 rounded-xl px-4 text-[15px] font-medium whitespace-nowrap transition-colors select-none disabled:opacity-35',
    primary ? 'bg-[#35c7b3] text-[#06231f] hover:bg-[#4fd6c3] disabled:hover:bg-[#35c7b3]' : 'bg-white/10 text-white hover:bg-white/18 disabled:hover:bg-white/10',
    pulse && !rest.disabled && 'lab-pulse', className)} />
}

/** 点一下走一步；按住不放就连续走，松手停下 */
export function HoldButton({ onStep, onHold, onRelease, ...rest }: { onStep: () => void; onHold: () => void; onRelease: () => void; pulse?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const timer = useRef(0), held = useRef(false)
  const end = () => { clearTimeout(timer.current); if (held.current) onRelease() }
  return <LabButton {...rest} className="touch-none"
    onPointerDown={() => { held.current = false; timer.current = window.setTimeout(() => { held.current = true; onHold() }, 320) }}
    onPointerUp={end} onPointerLeave={end} onPointerCancel={end} onContextMenu={e => e.preventDefault()}
    onClick={() => { if (held.current) held.current = false; else onStep() }} />
}

/** 分段选择 */
/** pulse：现在该选它；want：该选的是哪一项（自动演示靠它知道点哪个） */
export function Segmented<T extends string>({ value, options, onChange, label, disabled, pulse, want }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string; disabled?: boolean; pulse?: boolean; want?: T | null }) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('flex rounded-xl bg-white/8 p-1', pulse && !disabled && 'lab-pulse', disabled && 'opacity-50')}>
      {options.map(o => (
        <button key={o.value} role="radio" aria-checked={o.value === value} disabled={disabled} onClick={() => onChange(o.value)} data-auto={pulse && !disabled && want === o.value && want !== value ? '' : undefined}
          className={cn('h-9 rounded-lg px-3 text-[14px] whitespace-nowrap text-white/75', o.value === value ? 'bg-white font-semibold text-[#10151a]' : 'hover:bg-white/10')}>{o.label}</button>
      ))}
    </div>
  )
}
