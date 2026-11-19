// 结构检查：每个实验室该有的文件齐不齐、有没有违反规范里能自动查的条目。规范见 docs/lab-standard.md。
// 用法：node scripts/check-labs.mjs        （npm run check:labs）
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const read = p => readFileSync(join(root, p), 'utf8')
const has = p => existsSync(join(root, p))
const errors = [], warns = []
const err = (lab, msg) => errors.push(`[${lab}] ${msg}`), warn = (lab, msg) => warns.push(`[${lab}] ${msg}`)

// 早期做的实验室，有几条后来才定的规矩没有回头改；新实验室不许进这张表
const LEGACY = {}
const labs = readdirSync(join(root, 'src/labs')).filter(d => !d.startsWith('_') && statSync(join(root, 'src/labs', d)).isDirectory())
const cards = read('src/labs.ts')
/** 去掉注释，只留会运行的代码（界面上的字也在里面） */
const strip = s => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')

for (const id of labs) {
  if (!/^[a-z][a-z0-9-]*$/.test(id)) err(id, '目录名只能用小写字母、数字、连字符')
  const dir = `src/labs/${id}`, files = readdirSync(join(root, dir))
  // 1. 必须有的文件
  for (const f of ['main.tsx', 'lessons.ts', 'physics.ts', 'physics.test.ts']) if (!files.includes(f)) err(id, `缺少 ${dir}/${f}`)
  if (!has(`labs/${id}/index.html`)) err(id, `缺少入口页 labs/${id}/index.html`)
  if (!has(`docs/specs/${id}.md`)) err(id, `缺少规格卡 docs/specs/${id}.md`)
  if (!new RegExp(`id: '${id}'[^\\n]*href: '/labs/${id}/index.html'`).test(cards)) warn(id, '首页清单 src/labs.ts 里还没有这一间的卡片（或没有写 href）')
  if (!LEGACY[id]?.includes('one-world') && !files.some(f => /StageHost/.test(read(`${dir}/${f}`)))) err(id, '没有用常驻舞台 StageHost：一个实验室要做成一个大场景，换课时镜头飞过去')

  for (const f of files.filter(f => /\.tsx?$/.test(f))) {
    const src = read(`${dir}/${f}`), code = strip(src), where = `${dir}/${f}`
    // 2. 只能引用自己目录、lab-kit、lab-shell 和公共组件，不能引用别的实验室
    for (const m of code.matchAll(/from '([^']+)'/g)) {
      const p = m[1]
      if (/^\.\.\//.test(p) || /^@\/labs\//.test(p)) err(id, `${where} 引用了别的实验室的文件（${p}）：公共的东西放进 src/lab-kit`)
    }
    // 3. 不用的东西
    if (/import \{[^}]*\bHtml\b[^}]*\} from '@react-three\/drei'/.test(code)) err(id, `${where} 用了 drei 的 Html：在 React 19 下会出错，文字标签用舞台的 labels`)
    if (/\b(fetch|XMLHttpRequest|WebSocket)\s*\(/.test(code)) err(id, `${where} 里有联网请求：实验页要能离线运行`)
    // 4. 本地存储的键要带实验室名
    for (const m of code.matchAll(/'(gewu:[^']*)'/g)) if (!m[1].startsWith(`gewu:${id}:`)) err(id, `${where} 的存储键 ${m[1]} 要以 gewu:${id}: 开头`)
    if (/localStorage\.(get|set|remove)Item\('(?!gewu:)/.test(code)) err(id, `${where} 的 localStorage 键要以 gewu:${id}: 开头`)
    // 5. 界面上不能出现写给开发者看的话
    const bad = code.match(/[>'"`][^<>'"`\n]*(TODO|FIXME|待确认|待核实|演示数据|开发中|占位)[^<>'"`\n]*[<'"`]/)
    if (bad) err(id, `${where} 的界面文字里有给开发者看的话：${bad[0].slice(0, 40)}`)
    // 6. 主操作区最多三个按钮
    for (const m of src.matchAll(/actions=\{<>([\s\S]*?)<\/>\}/g)) {
      const n = (m[1].match(/<(LabButton|HoldButton)\b/g) || []).length
      if (n > 3) err(id, `${where} 的主操作区有 ${n} 个按钮，最多三个`)
    }
    // 6b. 在闪的分段选择要写明该选哪一项，自动演示才知道点哪个
    for (const m of src.matchAll(/<Segmented\b[^\n]*?\/>/g)) if (/pulse=/.test(m[0]) && !/want=/.test(m[0])) err(id, `${where} 里有一个会闪的分段选择没有写 want：自动演示不知道该选哪一项`)
    // 7. 计算不能写在界面文件里：g 的取值只出现在 physics.ts
    if (f !== 'physics.ts' && f !== 'physics.test.ts' && /\b9\.8\b/.test(code) && !/\{G\}|\bG\b/.test(code)) warn(id, `${where} 里直接写了 9.8：取值放在 physics.ts`)
  }
  // 8. 每一课有测试覆盖
  if (files.includes('physics.test.ts') && (read(`${dir}/physics.test.ts`).match(/\bit\(/g) || []).length < 3) err(id, 'physics.test.ts 里的核对太少：至少三条，数字要和规格卡对得上')
}

// 9. 外部素材都登记了来源和许可
if (has('public/assets')) {
  const list = has('public/assets/README.md') ? read('public/assets/README.md') : ''
  const walk = d => readdirSync(join(root, d)).flatMap(f => statSync(join(root, d, f)).isDirectory() ? walk(`${d}/${f}`) : [`${d}/${f}`])
  for (const f of walk('public/assets')) { const name = f.split('/').pop(); if (name !== 'README.md' && !list.includes(name)) err('素材', `${f} 没有登记在 public/assets/README.md（来源和许可）`) }
}

for (const w of warns) console.log('提醒 ' + w)
for (const e of errors) console.log('不通过 ' + e)
console.log(`\n检查了 ${labs.length} 间实验室：${errors.length} 处不通过，${warns.length} 处提醒。`)
process.exit(errors.length ? 1 : 0)
