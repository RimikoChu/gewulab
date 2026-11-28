import { useEffect, useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { HomeHero } from '@/components/home-hero'
import { LabMap } from '@/components/lab-map'
import { SiteFooter } from '@/components/site-footer'
import { CHANGES } from '@/changelog'
import { LABS, SUBJECTS, type SubjectKey, hasOffline, offlineUrl } from '@/labs'
import './home.css'

export default function App() {
  const [subject, setSubject] = useState<'all' | SubjectKey>('all')
  const [grade, setGrade] = useState('all')
  const [q, setQ] = useState('')
  const [log, setLog] = useState(false)
  useEffect(() => {
    if (!log) return
    const on = (e: KeyboardEvent) => { if (e.key === 'Escape') setLog(false) }
    window.addEventListener('keydown', on); return () => window.removeEventListener('keydown', on)
  }, [log])
  const day = (d: string) => `${Number(d.slice(5, 7))} 月 ${Number(d.slice(8, 10))} 日`

  const pool = useMemo(() => LABS.filter(l =>
    (grade === 'all' || l.grade === grade) &&
    (!q.trim() || (l.name + l.desc + l.pts.join('') + l.book + SUBJECTS[l.s]).includes(q.trim()))), [grade, q])
  // 离线包的下载入口：看着哪个学科就给哪个学科的包；看“全部”时给全部和各学科的
  const packs: [string, string][] = subject === 'all'
    ? [['all', '全部'], ...(Object.keys(SUBJECTS) as SubjectKey[]).filter(k => LABS.some(l => l.s === k && hasOffline(l))).map((k): [string, string] => [k, SUBJECTS[k]])]
    : LABS.some(l => l.s === subject && hasOffline(l)) ? [[subject, `${SUBJECTS[subject]}（${LABS.filter(l => l.s === subject && hasOffline(l)).length} 间）`]] : []
  const count = (k: 'all' | SubjectKey) => pool.filter(l => k === 'all' || l.s === k).length

  return (
    <>
      <HomeHero onLog={() => setLog(true)} />

      <main id="labs" className="mx-auto max-w-[1360px] scroll-mt-0 px-4 pb-24 sm:px-10">
        <div className="sticky top-0 z-20 -mx-4 flex items-center gap-2 border-b bg-background/92 px-4 pt-3 backdrop-blur sm:-mx-10 sm:px-10">
          <Tabs value={subject} onValueChange={v => setSubject(v as typeof subject)} className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none]">
            <TabsList variant="line" className="h-11 gap-1 p-0">
              {(['all', ...Object.keys(SUBJECTS)] as ('all' | SubjectKey)[]).map(k => (
                <TabsTrigger key={k} value={k} className="h-11 flex-none px-3 text-[15.5px] font-normal data-[state=active]:font-semibold after:bottom-[-1px]!">
                  {k === 'all' ? '全部' : SUBJECTS[k]}<span className="text-[12.5px] font-normal text-faint">{count(k)}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <ToggleGroup type="single" size="sm" value={grade} onValueChange={v => v && setGrade(v)} className="hidden md:flex" aria-label="学段">
            {[['all', '全部学段'], ['初中', '初中'], ['高中', '高中']].map(([v, t]) => (
              <ToggleGroupItem key={v} value={v} className="h-7 px-2.5 text-[13.5px] font-normal text-muted-foreground data-[state=on]:font-semibold data-[state=on]:text-foreground">{t}</ToggleGroupItem>
            ))}
          </ToggleGroup>
          <label className="relative hidden md:block">
            <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-faint" />
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="搜索" aria-label="搜索实验"
              className="h-7 w-28 border-0 bg-transparent pl-7 text-[13.5px] shadow-none transition-[width,background] hover:bg-accent focus-visible:w-44 focus-visible:bg-accent focus-visible:ring-0" />
          </label>
        </div>

        {packs.length > 0 && (
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
            <span>离线包：下载后解压，双击就能用，不用联网</span>
            {packs.map(([k, t]) => <a key={k} href={offlineUrl(k)} className="text-foreground underline-offset-2 hover:text-primary hover:underline">{t}</a>)}
          </p>
        )}
        {pool.some(l => subject === 'all' || l.s === subject) ? <LabMap labs={pool} subject={subject} full={!!q.trim()} /> : <p className="w-full py-14 text-center text-faint">没有找到相关的实验</p>}
        <SiteFooter />
      </main>
      {log && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4" onClick={() => setLog(false)}>
          <div role="dialog" aria-modal="true" aria-label="更新记录" onClick={e => e.stopPropagation()} className="flex max-h-[84vh] w-full max-w-[600px] flex-col overflow-hidden rounded-xl border bg-background shadow-[0_18px_50px_rgb(15_15_15/0.2)]">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-[19px] font-bold tracking-tight">更新记录</h2>
              <button type="button" onClick={() => setLog(false)} aria-label="关闭" className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-accent"><X className="size-4.5" /></button>
            </div>
            <ol className="overflow-y-auto px-6 py-2">
              {CHANGES.map((c, i) => (
                <li key={i} className="border-b py-4 last:border-b-0">
                  <div className="flex items-baseline gap-3">
                    <time dateTime={c.date} className="flex-none text-[13px] tabular-nums text-faint">{day(c.date)}</time>
                    <h3 className="text-[15.5px] font-semibold">{c.title}</h3>
                  </div>
                  <ul className="mt-1.5 flex flex-col gap-1 text-[14px] leading-[1.65] text-muted-foreground">{c.notes.map(n => <li key={n}>{n}</li>)}</ul>
                  {c.labs && (
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {c.labs.map(id => LABS.find(l => l.id === id)).filter(l => l?.href).map(l => <a key={l!.id} href={l!.href} className="rounded-md border px-2.5 py-1 text-[13px] hover:border-primary hover:text-primary">{l!.name}</a>)}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </>
  )
}
