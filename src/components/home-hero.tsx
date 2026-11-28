// 首页开头：一面由真实实验室画面铺成的墙，标题压在上面。墙上的每一块都能点进去。
import { useMemo } from 'react'
import { LABS, SUBJECTS, type Lab } from '@/labs'

/** 一间实验室的场景图（去掉界面拍下来的第一眼） */
export const shotUrl = (id: string) => '/assets/shots/' + id + '.webp'

const ROWS = 6, PER_ROW = 8
/** 按天换一种排法：把各学科的实验室穿插开，别一排全是同一科 */
function pickWall(labs: Lab[], seed: number) {
  const by = (Object.keys(SUBJECTS) as Lab['s'][]).map((k, i) => { const a = labs.filter(l => l.s === k); const r = (seed + i * 5) % Math.max(a.length, 1); return [...a.slice(r), ...a.slice(0, r)] })
  const out: Lab[] = []
  for (let i = 0; out.length < ROWS * PER_ROW && i < 40; i++) for (const a of by) if (a[i] && out.length < ROWS * PER_ROW) out.push(a[i])
  return Array.from({ length: ROWS }, (_, r) => out.slice(r * PER_ROW, (r + 1) * PER_ROW))
}

export function HomeHero({ onLog }: { onLog: () => void }) {
  const live = useMemo(() => LABS.filter(l => l.href), [])
  const rows = useMemo(() => pickWall(live, Math.floor(Date.now() / 86400000)), [live])
  const lessons = live.reduce((n, l) => n + (l.n ?? 0) + 2, 0)
  const lucky = () => { const l = live[Math.floor(Math.random() * live.length)]; if (l?.href) location.href = l.href }
  const intro = `${import.meta.env.BASE_URL}intro/index.html`
  // 首屏那一行关键词
  const facts = [`${live.length} 间三维实验室`, `${lessons} 个课次`, '初中到高中 · 五个学科', '一键自动演示 · 带讲解', '不联网也能用']
  return (
    <section className="relative isolate flex h-[88vh] max-h-[860px] min-h-[600px] flex-col overflow-hidden bg-[#0a0c0f] text-white">
      <div className="wall" aria-hidden="true">
        <div className="wall-plane">
          {rows.map((row, r) => (
            <div key={r} className="wall-row">
              {[...row, ...row].map((l, i) => (
                <a key={l.id + i} href={l.href} tabIndex={-1} className="wall-tile">
                  <img src={shotUrl(l.id)} alt="" loading="eager" decoding="async" />
                  <span>{l.name}</span>
                </a>
              ))}
            </div>
          ))}
        </div>
      </div>
      {/* 左边压暗，让字看得清；底下收进页面 */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-0 bg-[linear-gradient(90deg,#0a0c0f_0%,rgb(10_12_15/0.92)_26%,rgb(10_12_15/0.55)_48%,transparent_72%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(transparent,#0a0c0f)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[linear-gradient(#0a0c0f,transparent)]" />

      <header className="relative z-10 flex h-14 items-center gap-1.5 px-4 sm:px-8">
        <a href="#" className="flex h-9 items-center gap-2.5 rounded-md px-2 text-[15.5px] font-semibold tracking-wide hover:bg-white/10">
          <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
            <rect width="24" height="24" rx="6.5" fill="var(--primary)" />
            <path d="M8.9 13.4h6.2l1.7 2.9a1.3 1.3 0 0 1-1.1 2H8.3a1.3 1.3 0 0 1-1.1-2z" fill="var(--brand-warm)" />
            <path d="M10 6.2h4M10.8 6.2v3.9l-3.5 6.1a1.3 1.3 0 0 0 1.1 2h7.2a1.3 1.3 0 0 0 1.1-2l-3.5-6.1V6.2" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          格物实验室
        </a>
        <span className="flex-1" />
        <a href={intro} className="flex h-9 items-center rounded-md px-3 text-sm text-white/70 hover:bg-white/10 hover:text-white">三分钟介绍</a>
        <button type="button" onClick={onLog} className="flex h-9 items-center rounded-md px-3 text-sm text-white/70 hover:bg-white/10 hover:text-white">更新记录</button>
      </header>

      <div className="pointer-events-none relative z-10 mt-auto px-6 pb-14 sm:px-12 sm:pb-20 lg:px-16">
        <h1 className="max-w-[13em] text-[40px] leading-[1.12] font-bold tracking-tight sm:text-[58px] lg:text-[68px]">
          <span className="rise block" style={{ animationDelay: '0.05s' }}>课本里的每个单元，</span>
          <span className="rise block" style={{ animationDelay: '0.2s' }}>都有一间能动手的实验室</span>
        </h1>
        <ul className="rise mt-6 flex max-w-[46em] flex-wrap gap-x-2.5 gap-y-2.5 text-[16px] font-medium sm:text-[17.5px]" style={{ animationDelay: '0.4s' }}>
          {facts.map(t => <li key={t} className="rounded-full border border-white/22 bg-white/8 px-4 py-1.5 backdrop-blur-sm">{t}</li>)}
        </ul>
        <div className="rise pointer-events-auto mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: '0.55s' }}>
          <a href="#labs" className="flex h-12 items-center rounded-xl bg-white px-6 text-[16px] font-semibold text-[#0a0c0f] hover:bg-white/90">挑一间实验室</a>
          <button type="button" onClick={lucky} className="flex h-12 items-center rounded-xl border border-white/25 bg-white/5 px-6 text-[16px] font-medium backdrop-blur hover:bg-white/12">随便进一间</button>
          <a href={intro} className="flex h-12 items-center rounded-xl px-4 text-[16px] font-medium text-white/85 underline-offset-4 hover:text-white hover:underline">三分钟介绍</a>
        </div>
      </div>
    </section>
  )
}
