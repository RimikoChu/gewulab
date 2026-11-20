// 实验室数据与封面线稿。线稿统一画在 320×200 的画板上，画法见 DESIGN.md
export type SubjectKey = 'phys' | 'chem' | 'bio' | 'geo' | 'math'
export const SUBJECTS: Record<SubjectKey, string> = { phys: '物理', chem: '化学', bio: '生物', geo: '地理', math: '数学' }

export interface Lab {
  id: string; name: string; hook: string; desc: string; pts: string[]
  s: SubjectKey; grade: '初中' | '高中'; book: string
  /** 课数：做出来以后才有 */
  n?: number
  /** 入口：做出来以后才有 */
  href?: string; lessons?: string[]; vb?: string; wide?: boolean
  /** 还没做的：它在 GitHub 上的认领议题编号 */
  issue?: number
}

/** 认领议题的地址 */
export const issueUrl = (n: number) => `https://github.com/RimikoChu/gewulab/issues/${n}`

/** 占位图：还没有封面线稿的实验室都用它。一只虚线框里的烧瓶 */
export const PLACEHOLDER = `<rect class="d t" x="70" y="30" width="180" height="140" rx="14"/>
    <path class="a n" d="M141 124h38l9 16a5 5 0 0 1-4.400 7.500h-47.200a5 5 0 0 1-4.400-7.500z"/>
    <path d="M148 62h24M152 62v26l-23.400 42a7 7 0 0 0 6.100 10.400h50.600a7 7 0 0 0 6.100-10.400L168 88V62"/>
    <path class="c" d="M160 100v14M153 107h14"/>`

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
  pressure: `<path class="a" d="M40 62c10-5 20 5 30 0s20 5 30 0 20 5 30 0 20 5 30 0v98H40z"/>
    <path class="w" d="M160 40h22l44 120h-66z"/><path d="M24 160h272"/>
    <path class="t" d="M160 80h-6M160 100h-6M160 120h-6M160 140h-6"/>
    <g class="m flow" style="--t:2.4s"><path class="c" d="M124 84h30M110 112h44M94 142h60"/></g>
    <path class="c" d="M148 79l7 5-7 5M148 107l7 5-7 5M148 137l7 5-7 5"/>
    <text x="236" y="100">p = <tspan>ρgh</tspan></text>`,
  lens: `<path class="t d" d="M26 108h268"/>
    <ellipse class="a" cx="160" cy="108" rx="10" ry="60"/>
    <rect class="w" x="68" y="80" width="12" height="28" rx="2"/><path class="s m flick" style="--t:1.1s" d="M74 60c7 7 6 17 0 19-6-2-7-12 0-19z"/>
    <path class="t" d="M74 66H160L252 142M74 66 252 142"/><path class="t c m flow" style="--t:1.2s" d="M74 66H160L252 142"/>
    <rect class="w" x="246" y="108" width="12" height="24" rx="2"/><path class="s" d="M252 150c-6-6-5-14 0-16 5 2 6 10 0 16z"/>
    <circle class="s n" cx="116" cy="108" r="3"/><circle class="s n" cx="204" cy="108" r="3"/>
    <text x="112" y="126">f</text><text x="200" y="126">f</text>
    <text x="196" y="40">1/u + 1/v = 1/f</text>`,
  battery: `<path class="w" d="M96 80v68a14 14 0 0 0 14 14h100a14 14 0 0 0 14-14V80"/>
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
  { id: 'quake', name: '地震', hook: '一次真实的地震：发生、预警、看穿地球', desc: '用 2008 年汶川地震做主线：先分清震级和烈度，再跟着纵波和横波跑一趟，算出预警能抢到几秒，最后用地震波看穿地球内部。', pts: ['震级与烈度', '纵波与横波', '地震预警', '地球的圈层'], s: 'geo', grade: '高中', book: '必修一', n: 6, wide: true, href: '/labs/quake/index.html', lessons: ['地震发生', '纵波横波', '地震预警', '找到震中', '看穿地球', '房屋抗震'], issue: 42 },
  { id: 'float', name: '浮力', hook: '为什么钢铁做的船能浮在水上', desc: '在一座造船厂里做实验：用吊车把船锚放进港池，看吊秤读数少了多少；接住溢出来的水，称一称有多重。最后弄懂一块会沉的钢铁怎样变成能浮的船，再去太空看浮力为什么消失。', pts: ['称重法测浮力', '阿基米德原理', '浮沉条件'], vb: '0 -8 320 216', s: 'phys', grade: '初中', book: '八年级下册', n: 7, href: '/labs/float/index.html' },
  { id: 'pressure', name: '压强', hook: '大坝为什么要做成上窄下宽', desc: '在一座水电站里做实验：把混凝土块压在沙地上、让卡车开上软土，弄懂压强；把探头伸进水库，量出越深压强越大；再自己开船闸、做托里拆利实验、吹风洞。所有的课都在同一个大场景里，换课时镜头飞过去。', pts: ['压强 p = F/S', '液体压强 p = ρgh', '大气压与流速'], vb: '0 -8 320 216', s: 'phys', grade: '初中', book: '八年级下册', n: 7, href: '/labs/pressure/index.html' },
  { id: 'lens', name: '凸透镜成像', hook: '把蜡烛的像接到光屏上', desc: '移动蜡烛和光屏，找到清晰的像。物距由远到近，像从缩小变成放大，最后成了接不到的虚像。照相机、投影仪、放大镜都在这条线上。', pts: ['成像规律', '焦距', '实像与虚像'], vb: '0 14 320 164', s: 'phys', grade: '初中', book: '八年级上册', n: 6, issue: 5 },
  { id: 'battery', name: '原电池', hook: '化学反应怎样点亮一盏灯', desc: '把锌片和铜片插进稀硫酸，接上导线，灯亮了。放大到微观，看电子从哪里出发、离子往哪里走。', pts: ['氧化还原', '电极反应', '化学电源'], vb: '0 -6 320 206', s: 'chem', grade: '高中', book: '必修二', n: 6, issue: 24 },
  { id: 'pyth', name: '勾股定理', hook: '把两个正方形拼进第三个', desc: '亲手把两个小正方形拼进斜边上的大正方形，再看赵爽的弦图怎样用面积证明它。', pts: ['拼图证明', '赵爽弦图', '勾股数'], vb: '0 -4 320 204', s: 'math', grade: '初中', book: '八年级下册', n: 5, issue: 43 },
  { id: 'ammonia', name: '合成氨工厂', hook: '一座化肥厂里的化学平衡', desc: '走进一座化肥厂。温度高了反应快但产率低，压强大了产率高但设备贵。自己调条件，看一天能多产多少吨氨，理解工业上为什么这样选。', pts: ['化学平衡', '反应速率', '工业条件的选择'], vb: '0 0 320 190', s: 'chem', grade: '高中', book: '选必一', n: 7, issue: 25 },
  { id: 'blood', name: '血液循环', hook: '跟着一个红细胞走一圈', desc: '变成一个红细胞，从左心室出发，走遍全身再回到心脏，接着去肺里换一次气。留意血液的颜色在哪里变了。', pts: ['心脏的结构', '体循环', '肺循环'], vb: '0 34 320 140', s: 'bio', grade: '初中', book: '七年级下册', n: 7, issue: 31 },
  { id: 'leaf', name: '光合作用和呼吸作用', hook: '一片叶子怎样把阳光变成养分', desc: '在一座蔬菜大棚里把课本上的经典实验亲手做一遍：遮住半片叶子看淀粉在哪里生成，数金鱼藻冒出的氧气泡，比较萌发和煮熟的种子，再看大棚里一昼夜的二氧化碳怎么变。', pts: ['光合作用的条件和产物', '叶片的结构', '呼吸作用和增产'], vb: '0 -4 320 204', s: 'bio', grade: '初中', book: '七年级上册', n: 7, href: '/labs/leaf/index.html', issue: 27 },
  { id: 'orbit', name: '地球的运动', hook: '为什么夏天的白天更长', desc: '让地球自己转、绕着太阳转。盯住北京，看它什么时候天亮、夏天的白天有多长、正午旗杆的影子有多短，再弄懂五带是怎么分出来的。所有的课都在同一个太阳和地球的大场景里。', pts: ['自转和公转', '太阳直射点', '昼夜长短和五带'], vb: '0 30 320 150', s: 'geo', grade: '初中', book: '七年级上册', n: 7, href: '/labs/orbit/index.html', issue: 36 },
  // ---------- 以下是总规划表里还没有做的实验室：没有封面线稿，卡片上用占位图，点开是它的认领议题 ----------
  { id: 'motion', name: '机械运动', hook: '怎样量长度和时间', desc: '怎样量长度和时间；速度是什么；运动是相对的。场景设想：高铁站和一段铁路。', pts: ['长度和时间的测量', '速度', '参照物'], s: 'phys', grade: '初中', book: '八年级上册', issue: 1 },
  { id: 'sound', name: '声现象', hook: '声音怎样产生和传播', desc: '声音怎样产生和传播；音调、响度、音色各由什么决定。场景设想：音乐厅和后台。', pts: ['声音的产生和传播', '音调 响度 音色', '噪声'], s: 'phys', grade: '初中', book: '八年级上册', issue: 2 },
  { id: 'phase', name: '物态变化', hook: '熔化、凝固、汽化、液化、升华、凝华', desc: '熔化、凝固、汽化、液化、升华、凝华；温度怎样变。场景设想：高山气象站：从山脚到雪线。', pts: ['熔化和凝固', '汽化和液化', '升华和凝华'], s: 'phys', grade: '初中', book: '八年级上册', issue: 3 },
  { id: 'mirror', name: '光的反射和平面镜', hook: '光沿直线传播', desc: '光沿直线传播；反射定律；平面镜成像的特点。场景设想：湖边和一座灯塔。', pts: ['光的直线传播', '反射定律', '平面镜成像'], s: 'phys', grade: '初中', book: '八年级上册', issue: 4 },
  { id: 'density', name: '质量与密度', hook: '怎样测质量和体积', desc: '怎样测质量和体积；密度是物质的特性。场景设想：金属冶炼厂的化验室和料场。', pts: ['质量', '密度', '测量物质的密度'], s: 'phys', grade: '初中', book: '八年级上册', issue: 6 },
  { id: 'force', name: '力和运动', hook: '力的作用效果', desc: '力的作用效果；牛顿第一定律；二力平衡；摩擦力。场景设想：冰雪运动场：冰壶、雪橇。', pts: ['牛顿第一定律', '二力平衡', '摩擦力'], s: 'phys', grade: '初中', book: '八年级下册', issue: 7 },
  { id: 'energy', name: '功和机械能', hook: '功、功率', desc: '功、功率；动能和势能怎样转化。场景设想：游乐园：过山车、蹦极。', pts: ['功和功率', '动能和势能', '机械能守恒'], s: 'phys', grade: '初中', book: '八年级下册', issue: 8 },
  { id: 'machine', name: '简单机械', hook: '杠杆的平衡条件', desc: '杠杆的平衡条件；滑轮；机械效率。场景设想：建筑工地：塔吊、撬棍、滑轮组。', pts: ['杠杆', '滑轮', '机械效率'], s: 'phys', grade: '初中', book: '八年级下册', issue: 9 },
  { id: 'heat', name: '内能和热机', hook: '分子热运动', desc: '分子热运动；比热容；热机的四个冲程。场景设想：汽车发动机厂。', pts: ['分子热运动', '比热容', '热机'], s: 'phys', grade: '初中', book: '九年级', issue: 10 },
  { id: 'circuit', name: '电路', hook: '串联和并联', desc: '串联和并联；电流、电压、电阻怎样测。场景设想：一栋正在装修的房子。', pts: ['串联和并联', '电流和电压', '电阻'], s: 'phys', grade: '初中', book: '九年级', issue: 11 },
  { id: 'ohm', name: '欧姆定律', hook: '电流与电压、电阻的关系', desc: '电流与电压、电阻的关系；伏安法测电阻。场景设想：电子元件检测车间。', pts: ['欧姆定律', '伏安法测电阻', '串并联电路的规律'], s: 'phys', grade: '初中', book: '九年级', issue: 12 },
  { id: 'power', name: '电功率和生活用电', hook: '电能、电功率', desc: '电能、电功率；焦耳定律；家庭电路和安全用电。场景设想：一户人家和小区配电房。', pts: ['电能和电功率', '焦耳定律', '安全用电'], s: 'phys', grade: '初中', book: '九年级', issue: 13 },
  { id: 'magnet', name: '电与磁', hook: '磁场', desc: '磁场；电生磁；电动机和发电机。场景设想：风力发电场。', pts: ['磁场', '电生磁', '电动机和发电机'], s: 'phys', grade: '初中', book: '九年级', issue: 14 },
  { id: 'air', name: '空气和氧气', hook: '空气里有什么', desc: '空气里有什么；氧气的性质和制法。场景设想：空气分离厂。', pts: ['空气的成分', '氧气的性质', '氧气的制取'], s: 'chem', grade: '初中', book: '九年级上册', issue: 15 },
  { id: 'atom', name: '分子和原子', hook: '分子在运动、有间隔', desc: '分子在运动、有间隔；原子的结构；元素。场景设想：从一滴水一路放大到原子。', pts: ['分子和原子', '原子的结构', '元素'], s: 'chem', grade: '初中', book: '九年级上册', issue: 16 },
  { id: 'water', name: '水的净化和组成', hook: '沉淀、过滤、吸附、消毒', desc: '沉淀、过滤、吸附、消毒；电解水说明水的组成。场景设想：自来水厂。', pts: ['水的净化', '电解水', '硬水和软水'], s: 'chem', grade: '初中', book: '九年级上册', issue: 17 },
  { id: 'mass', name: '质量守恒定律', hook: '反应前后质量为什么不变', desc: '反应前后质量为什么不变；怎样写化学方程式。场景设想：化工厂的称量和反应车间。', pts: ['质量守恒定律', '化学方程式', '化学计算'], s: 'chem', grade: '初中', book: '九年级上册', issue: 18 },
  { id: 'carbon', name: '碳和二氧化碳', hook: '二氧化碳的制取和性质', desc: '二氧化碳的制取和性质；一氧化碳；碳循环。场景设想：汽水厂和温室。', pts: ['二氧化碳的制取', '一氧化碳', '碳循环'], s: 'chem', grade: '初中', book: '九年级上册', issue: 19 },
  { id: 'fire', name: '燃烧和灭火', hook: '燃烧的三个条件', desc: '燃烧的三个条件；灭火的原理。场景设想：消防训练基地。', pts: ['燃烧的条件', '灭火的原理', '燃料'], s: 'chem', grade: '初中', book: '九年级上册', issue: 20 },
  { id: 'metal', name: '金属和炼铁', hook: '金属的活动性顺序', desc: '金属的活动性顺序；铁的冶炼；锈蚀和防护。场景设想：钢铁厂：高炉和轧钢线。', pts: ['金属活动性顺序', '铁的冶炼', '锈蚀和防护'], s: 'chem', grade: '初中', book: '九年级下册', issue: 21 },
  { id: 'solution', name: '溶液', hook: '溶解和结晶', desc: '溶解和结晶；溶解度曲线；溶质的质量分数。场景设想：盐湖和盐场。', pts: ['溶解和结晶', '溶解度曲线', '溶质的质量分数'], s: 'chem', grade: '初中', book: '九年级下册', issue: 22 },
  { id: 'acid', name: '酸、碱和中和', hook: '酸和碱的性质', desc: '酸和碱的性质；pH；中和反应。场景设想：污水处理厂。', pts: ['酸和碱的性质', 'pH', '中和反应'], s: 'chem', grade: '初中', book: '九年级下册', issue: 23 },
  { id: 'cells', name: '细胞', hook: '显微镜怎样用', desc: '显微镜怎样用；植物细胞和动物细胞的结构；细胞分裂。场景设想：走进一个放大的细胞。', pts: ['显微镜', '细胞的结构', '细胞分裂'], s: 'bio', grade: '初中', book: '七年级上册', issue: 26 },
  { id: 'plant', name: '植物的一生', hook: '种子萌发的条件', desc: '种子萌发的条件；根的生长；开花和结果。场景设想：一块试验田，从播种到收获。', pts: ['种子的萌发', '根的生长', '开花和结果'], s: 'bio', grade: '初中', book: '七年级上册', issue: 28 },
  { id: 'digest', name: '消化和吸收', hook: '食物在消化道里经历了什么', desc: '食物在消化道里经历了什么；营养在哪里吸收。场景设想：人体内部：沿消化道走一遍。', pts: ['消化系统', '营养物质', '吸收'], s: 'bio', grade: '初中', book: '七年级下册', issue: 29 },
  { id: 'breath', name: '呼吸', hook: '胸廓怎样带动吸气呼气', desc: '胸廓怎样带动吸气呼气；肺泡里怎样换气。场景设想：人体内部：胸腔和肺。', pts: ['呼吸运动', '肺泡', '气体交换'], s: 'bio', grade: '初中', book: '七年级下册', issue: 30 },
  { id: 'nerve', name: '神经调节', hook: '反射和反射弧', desc: '反射和反射弧；眼和耳怎样感受刺激。场景设想：人体内部：从指尖到大脑。', pts: ['反射弧', '神经系统', '眼和耳'], s: 'bio', grade: '初中', book: '七年级下册', issue: 32 },
  { id: 'gene', name: '遗传和变异', hook: '基因在亲子代之间怎样传递', desc: '基因在亲子代之间怎样传递；显性和隐性；性别决定。场景设想：一座豌豆试验园。', pts: ['基因和性状', '显性和隐性', '性别决定'], s: 'bio', grade: '初中', book: '八年级下册', issue: 33 },
  { id: 'eco', name: '生态系统', hook: '食物链和食物网', desc: '食物链和食物网；物质和能量怎样流动；生态平衡。场景设想：一片草原，或一个湖泊。', pts: ['食物链和食物网', '物质和能量', '生态平衡'], s: 'bio', grade: '初中', book: '七年级上册', issue: 34 },
  { id: 'globe', name: '地球和经纬网', hook: '经线、纬线', desc: '经线、纬线；用经纬度定位；半球的划分。场景设想：一艘远洋科考船和一只大地球仪。', pts: ['经线和纬线', '经纬度定位', '东西半球'], s: 'geo', grade: '初中', book: '七年级上册', issue: 35 },
  { id: 'contour', name: '等高线地形图', hook: '等高线怎样表示地形', desc: '等高线怎样表示地形；山峰、山脊、山谷、鞍部、陡崖。场景设想：一座可以切片的山。', pts: ['等高线', '地形部位', '地形剖面'], s: 'geo', grade: '初中', book: '七年级上册', issue: 37 },
  { id: 'plate', name: '板块运动', hook: '大陆漂移', desc: '大陆漂移；板块怎样运动；火山和地震带。场景设想：海底到高原的一条大剖面。', pts: ['大陆漂移', '板块构造', '火山和地震带'], s: 'geo', grade: '初中', book: '七年级上册', issue: 38 },
  { id: 'climate', name: '天气和气候', hook: '气温和降水怎样量、怎样分布', desc: '气温和降水怎样量、怎样分布；影响气候的因素。场景设想：一座气象站和一条跨越山脉的路线。', pts: ['气温', '降水', '气候类型'], s: 'geo', grade: '初中', book: '七年级上册', issue: 39 },
  { id: 'watercycle', name: '水循环', hook: '跟着一滴水走遍一个流域', desc: '一块从海洋到雪山的地块：一个环节一个环节地打开水循环，比较雨落在林地和水泥地上的不同，修一座水库，给城市下一场暴雨，最后算一算全球一年的水账。', href: '/labs/watercycle/index.html', pts: ['水循环的环节', '陆地水体', '人类活动的影响'], s: 'geo', grade: '高中', book: '必修第一册', issue: 40 },
  { id: 'wind', name: '热力环流和风', hook: '大气怎样受热', desc: '大气怎样受热；热力环流；海陆风、山谷风。场景设想：一座海滨城市。', pts: ['大气受热过程', '热力环流', '海陆风'], s: 'geo', grade: '高中', book: '必修第一册', issue: 41 },
  { id: 'linear', name: '一次函数', hook: '变量之间的对应', desc: '变量之间的对应；k 和 b 怎样决定一条直线。场景设想：一条公路和沿途的里程、油量。', pts: ['变量与函数', 'k 和 b', '图像与性质'], s: 'math', grade: '初中', book: '八年级下册', issue: 44 },
  { id: 'quadratic', name: '二次函数', hook: '抛物线的开口、顶点、对称轴', desc: '抛物线的开口、顶点、对称轴；用它求最值。场景设想：喷泉、投篮和一座拱桥。', pts: ['抛物线', '顶点和对称轴', '最值'], s: 'math', grade: '初中', book: '九年级上册', issue: 45 },
  { id: 'transform', name: '图形的变换', hook: '三种变换各保持了什么', desc: '三种变换各保持了什么；怎样用它们设计图案。场景设想：一间瓷砖和窗花的工坊。', pts: ['平移', '轴对称', '旋转'], s: 'math', grade: '初中', book: '七至九年级', issue: 46 },
  { id: 'similar', name: '相似和测量', hook: '相似三角形的比例', desc: '相似三角形的比例；不上去也能量出旗杆和楼的高度。场景设想：校园操场和一座塔。', pts: ['相似三角形', '测量高度', '锐角三角函数'], s: 'math', grade: '初中', book: '九年级下册', issue: 47 },
  { id: 'chance', name: '概率', hook: '随机事件', desc: '随机事件；做足够多次，频率稳定在概率附近。场景设想：一间做抽样检验的工厂。', pts: ['随机事件', '频率与概率', '用频率估计概率'], s: 'math', grade: '初中', book: '九年级上册', issue: 48 },
];
