// 实验室数据与封面线稿。线稿统一画在 320×200 的画板上，画法见 DESIGN.md
export type SubjectKey = 'phys' | 'chem' | 'bio' | 'geo' | 'math'
export const SUBJECTS: Record<SubjectKey, string> = { phys: '物理', chem: '化学', bio: '生物', geo: '地理', math: '数学' }

export interface Lab {
  id: string; name: string; hook: string; desc: string; pts: string[]
  s: SubjectKey; grade: '初中' | '高中'; book: string; n: number
  href?: string; lessons?: string[]; vb?: string; wide?: boolean
}

export const ART: Record<string, string> = {
  // 宽幅画板 640×360：地面剖面、震源与波、地震台、小镇、一条地震记录
  quake: `<defs><clipPath id="qg"><path d="M0 176C120 166 210 184 330 172S530 162 640 174V360H0z"/></clipPath></defs>
    <rect class="w n" width="640" height="360"/>
    <path class="a n" opacity=".55" d="M0 176C120 166 210 184 330 172S530 162 640 174V360H0z"/>
    <path class="t d" d="M0 236C140 226 240 246 360 234S540 224 640 236"/><path class="t d" d="M0 302C160 292 260 310 380 300S560 290 640 302"/>
    <g clip-path="url(#qg)">
      <circle class="m ring c" style="--t:2.4s;--a:.1;--b:1;--oa:0" cx="176" cy="268" r="30"/>
      <circle class="m ring c" style="--t:2.4s;--b:1.933" cx="176" cy="268" r="30"/>
      <circle class="m ring" style="--t:2.4s;--b:1.586" cx="176" cy="268" r="58"/>
      <circle class="m ring t" style="--t:2.4s;--b:1.5;--ob:0" cx="176" cy="268" r="92"/>
    </g>
    <g class="m sway" style="--t:2.4s">
      <path class="w" d="M452 168v-48h26v48zM484 168V96h30v72zM520 168v-38h24v38zM550 168v-58h30v58z"/>
      <path class="t" d="M459 132h12M459 144h12M459 156h12M492 110h14M492 123h14M492 136h14M492 149h14M527 142h10M527 154h10M558 123h14M558 136h14M558 149h14"/>
    </g>
    <path d="M0 176C120 166 210 184 330 172S530 162 640 174"/>
    <path class="t d" d="M176 260v-78"/>
    <circle class="s" cx="176" cy="268" r="6"/><path class="s" d="M176 172l-7-13h14z"/>
    <path d="M318 172v-22"/><path class="m blink" style="--t:2.4s;animation-delay:-1.5s" d="M318 134l10 16h-20z" fill="#fff"/>
    <path class="t c" d="M335 133a10 10 0 0 1 0 14M342 127a18 18 0 0 1 0 26"/>
    <path class="t" opacity=".3" d="M250 74h360"/>
    <path class="m draw" style="--t:4.8s" pathLength="1" d="M250 74h88l4-8 4 14 4-11 4 9 4-6 4 4 4-2h62l5-30 6 56 6-48 6 40 6-32 6 24 6-16 6 10 6-6 6 2h120"/>
    <path class="t c" d="M338 106v6h92v-6"/>
    <text class="lbl" x="333" y="52">P</text><text class="lbl" x="427" y="34">S</text><text class="lbl" x="374" y="130">Δt</text>
    <text class="lbl" x="184" y="206" font-size="14">14 km</text>
    <text class="zh lbl" x="190" y="290">震源</text><text class="zh lbl" x="162" y="150">震中</text><text class="zh lbl" x="298" y="124">地震台</text>`,
  float: `<path class="w" d="M100 44v104a14 14 0 0 0 14 14h92a14 14 0 0 0 14-14V44"/>
    <path class="a" d="M100 94c10-5 20 5 30 0s20 5 30 0 20 5 30 0 20 5 30 0v54a14 14 0 0 1-14 14h-92a14 14 0 0 1-14-14z"/>
    <path d="M92 44h16M212 44h16"/><path class="t" d="M206 112h8M206 128h8M206 144h8"/>
    <g class="m bob" style="--t:2.6s"><rect class="w" x="136" y="72" width="48" height="46" rx="3"/><path class="t" d="M146 94h28"/>
      <path class="c" d="M160 156v-26M152 138l8-9 8 9"/><path d="M160 32v26M152 50l8 9 8-9"/></g>
    <text x="236" y="100">F<tspan class="zh" dy="4" font-size="9">浮</tspan><tspan dy="-4"> = G</tspan><tspan class="zh" dy="4" font-size="9">排</tspan></text>`,
  lens: `<path class="t d" d="M26 108h268"/>
    <ellipse class="a" cx="160" cy="108" rx="10" ry="60"/>
    <rect class="w" x="68" y="80" width="12" height="28" rx="2"/><path class="s m flick" style="--t:1.1s" d="M74 60c7 7 6 17 0 19-6-2-7-12 0-19z"/>
    <path class="t" d="M74 66H160L252 142M74 66 252 142"/><path class="t c m flow" style="--t:1.2s" d="M74 66H160L252 142"/>
    <rect class="w" x="246" y="108" width="12" height="24" rx="2"/><path class="s" d="M252 150c-6-6-5-14 0-16 5 2 6 10 0 16z"/>
    <circle class="s n" cx="116" cy="108" r="3"/><circle class="s n" cx="204" cy="108" r="3"/>
    <text x="112" y="126">f</text><text x="200" y="126">f</text>
    <text x="196" y="40">1/u + 1/v = 1/f</text>`,
  cell: `<path class="w" d="M96 80v68a14 14 0 0 0 14 14h100a14 14 0 0 0 14-14V80"/>
    <path class="a" d="M96 106h128v42a14 14 0 0 1-14 14H110a14 14 0 0 1-14-14z"/>
    <rect class="w" x="120" y="64" width="14" height="84" rx="2"/><rect class="s" x="186" y="64" width="14" height="84" rx="2"/>
    <path d="M127 64V40h22M193 64V40h-22"/><path class="c m flow" style="--t:.9s" d="M127 64V40h22M171 40h22v24"/>
    <circle class="m glow" style="--t:1.8s" cx="160" cy="40" r="11" fill="#fff"/><path class="t" d="M155 45l10-10M155 35l10 10"/>
    <path class="t" d="M160 21v-6M177 25l4-4M143 25l-4-4"/>
    <text class="zh" x="118" y="180">Zn</text><text class="zh" x="185" y="180">Cu</text>
    <text x="232" y="62">Zn − 2e⁻ → Zn²⁺</text>`.replace('x="232" y="62"', 'x="204" y="22" font-size="12"'),
  ammonia: `<path d="M34 164h252"/>
    <path class="w" d="M78 164V74a14 14 0 0 1 28 0v90z"/><path class="a" d="M136 164v-54a23 23 0 0 1 46 0v54z"/><path class="w" d="M212 164v-38a12 12 0 0 1 24 0v38z"/><rect class="w" x="252" y="140" width="26" height="24" rx="3"/>
    <path d="M106 98h30M182 124h30M236 150h16"/><path class="c m flow" style="--t:1s" d="M106 98h30M182 124h30M236 150h16"/>
    <rect class="s" x="151" y="126" width="16" height="16" rx="3"/>
    <path class="t m rise" style="--t:2.2s" d="M92 54c-4-6 4-8 0-14"/><path class="t m rise" style="--t:2.2s;animation-delay:-1.1s" d="M92 34c-3-5 3-7 0-12"/>
    <path class="t" d="M86 86h12M86 110h12M86 134h12M218 136h12"/>
    <text x="150" y="30" font-size="13">N₂ + 3H₂ ⇌ 2NH₃</text>`,
  blood: `<path class="w" d="M160 104C132 60 58 58 58 104s74 44 102 0c28-44 102-46 102 0s-74 44-102 0z"/>
    <path class="c m flow" style="--t:1.2s" d="M160 104C132 60 58 58 58 104s74 44 102 0c28-44 102-46 102 0s-74 44-102 0z"/>
    <path class="s m beat" style="--t:1.2s" d="M160 126c-24-16-23-39-11-39 7 0 11 6 11 11 0-5 4-11 11-11 12 0 13 23-11 39z"/>
    <circle class="a" cx="58" cy="104" r="8"/><circle class="a" cx="262" cy="104" r="8"/>
    <text class="zh" x="48" y="140">肺</text><text class="zh" x="250" y="140">全身</text>`,
  pyth: `<path class="w" d="M138 128V68H78v60z"/><path class="w" d="M138 128h45v45h-45z"/>
    <path class="a" d="M138 68l45 60 60-45-45-60z"/>
    <path class="s m beat" style="--t:2.4s" d="M138 128V68l45 60z"/>
    <path class="t" d="M138 118h10v10"/>
    <path class="t d" d="M98 68v60M118 68v60M78 88h60M78 108h60M153 128v45M168 128v45M138 143h45M138 158h45"/>
    <text x="100" y="52">b²</text><text x="188" y="162">a²</text><text x="214" y="72" style="fill:#183347">c²</text>
    <text x="218" y="178">a² + b² = c²</text>`,
  orbit: `<ellipse class="d" cx="160" cy="102" rx="112" ry="46"/>
    <circle class="s" cx="160" cy="102" r="17"/>
    <g class="m spin" style="--t:14s"><path class="t" d="M160 72v-8M160 140v-8M190 102h8M122 102h8M181 81l6-6M139 123l-6 6M181 123l6 6M139 81l-6-6"/></g>
    <g class="m orb" style="--t:9s"><circle class="w" r="13"/><path class="a" d="M0-13a13 13 0 0 0 0 26z"/><path d="M-6 20 6-20"/></g>
    <text x="246" y="170" font-size="13">23°26′</text>`,
  leaf: `<path class="a" d="M92 158C86 96 138 44 232 46c6 78-50 128-140 112z"/>
    <path class="t" d="M92 158c40-40 84-76 140-112M122 132l-4-32M150 108l-2-36M180 84l0-30M128 126l34 6M156 102l40 4M184 80l36-2"/>
    <circle class="s" cx="62" cy="50" r="14"/><g class="m spin" style="--t:12s"><path class="t" d="M62 26v-7M62 81v-7M38 50h-7M93 50h-7M45 33l-5-5M84 72l-5-5M79 33l5-5M40 72l5-5" transform="translate(0 0)"/></g>
    <circle class="w m rise" style="--t:2.4s" cx="250" cy="100" r="5"/><circle class="w m rise" style="--t:2.4s;animation-delay:-.8s" cx="264" cy="122" r="3.5"/><circle class="w m rise" style="--t:2.4s;animation-delay:-1.6s" cx="244" cy="130" r="3"/>
    <text x="238" y="160" font-size="13">O₂</text><text x="44" y="150" font-size="13">CO₂</text><path class="t" d="M72 140l14-6M80 129l7 5-5 7"/>`,
};

export const LABS: Lab[] = [
  { id: 'quake', name: '地震', hook: '一次真实的地震：发生、预警、看穿地球', desc: '用 2008 年汶川地震做主线：先分清震级和烈度，再跟着纵波和横波跑一趟，算出预警能抢到几秒，最后用地震波看穿地球内部。', pts: ['震级与烈度', '纵波与横波', '地震预警', '地球的圈层'], s: 'geo', grade: '高中', book: '必修一', n: 6, wide: true, href: '/labs/quake/index.html', lessons: ['地震发生', '纵波横波', '地震预警', '找到震中', '看穿地球', '房屋抗震'] },
  { id: 'float', name: '浮力', hook: '为什么钢铁做的船能浮在水上', desc: '把挂在测力计下的金属块浸进水里，看示数少了多少；用溢水杯接住排开的水，称一称有多重。最后弄懂一块会沉的钢铁怎样变成能浮的船，再去太空看浮力为什么消失。', pts: ['称重法测浮力', '阿基米德原理', '浮沉条件'], vb: '0 -8 320 216', s: 'phys', grade: '初中', book: '八年级下册', n: 7 },
  { id: 'lens', name: '凸透镜成像', hook: '把蜡烛的像接到光屏上', desc: '移动蜡烛和光屏，找到清晰的像。物距由远到近，像从缩小变成放大，最后成了接不到的虚像。照相机、投影仪、放大镜都在这条线上。', pts: ['成像规律', '焦距', '实像与虚像'], vb: '0 14 320 164', s: 'phys', grade: '初中', book: '八年级上册', n: 6 },
  { id: 'cell', name: '原电池', hook: '化学反应怎样点亮一盏灯', desc: '把锌片和铜片插进稀硫酸，接上导线，灯亮了。放大到微观，看电子从哪里出发、离子往哪里走。', pts: ['氧化还原', '电极反应', '化学电源'], vb: '0 -6 320 206', s: 'chem', grade: '高中', book: '必修二', n: 6 },
  { id: 'pyth', name: '勾股定理', hook: '把两个正方形拼进第三个', desc: '亲手把两个小正方形拼进斜边上的大正方形，再看赵爽的弦图怎样用面积证明它。', pts: ['拼图证明', '赵爽弦图', '勾股数'], vb: '0 -4 320 204', s: 'math', grade: '初中', book: '八年级下册', n: 5 },
  { id: 'ammonia', name: '合成氨工厂', hook: '一座化肥厂里的化学平衡', desc: '走进一座化肥厂。温度高了反应快但产率低，压强大了产率高但设备贵。自己调条件，看一天能多产多少吨氨，理解工业上为什么这样选。', pts: ['化学平衡', '反应速率', '工业条件的选择'], vb: '0 0 320 190', s: 'chem', grade: '高中', book: '选必一', n: 7 },
  { id: 'blood', name: '血液循环', hook: '跟着一个红细胞走一圈', desc: '变成一个红细胞，从左心室出发，走遍全身再回到心脏，接着去肺里换一次气。留意血液的颜色在哪里变了。', pts: ['心脏的结构', '体循环', '肺循环'], vb: '0 34 320 140', s: 'bio', grade: '初中', book: '七年级下册', n: 7 },
  { id: 'leaf', name: '光合作用', hook: '一片叶子怎样把阳光变成养分', desc: '给一片叶子不同的光照、二氧化碳和水，数它放出的氧气泡。再把叶片遮住一半，看淀粉只在哪里生成。', pts: ['光合作用的条件', '产物的检验', '有机物与氧气'], vb: '0 -4 320 204', s: 'bio', grade: '初中', book: '七年级上册', n: 6 },
  { id: 'orbit', name: '地球的运动', hook: '为什么夏天的白天更长', desc: '让地球绕太阳转一年。盯住你所在的城市，看正午的太阳高度和白天的长短怎样随季节变化。', pts: ['公转与自转', '太阳直射点', '昼夜长短'], vb: '0 30 320 150', s: 'geo', grade: '高中', book: '选必一', n: 6 },
];
