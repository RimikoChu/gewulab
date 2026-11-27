// 驾驶台里面：地板、天花板、前面一排操纵台（电子海图屏、雷达屏、卫星定位接收机、车钟、小舵轮）、两把驾驶椅，后部的海图桌（纸海图、分规、平行尺、铅笔、台灯的灯光）。
// 屏幕和纸海图上画什么由这一课交上来的 want 决定，画法在 charts.ts。
import { useEffect, useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, lathe } from '@/lab-kit'
import { BRIDGE } from './ship'
import { ECDIS_PX, PAPER_PX, drawEcdis, drawGnss, drawPaper, ecdisXY, makeCanvas, paperXY, type EcdisState, type PaperState } from './charts'

/** 电子海图屏：中心、宽高（m）。屏幕朝 −x（朝着驾驶员） */
export const ECDIS = { c: new THREE.Vector3(24.18, 17.32, -1.1), w: 0.86, h: 0.6, tilt: 0.32 }
/** 纸海图：铺在海图桌上，桌面中心、宽高（m）。北朝 −z */
export const PAPER_AT = { c: new THREE.Vector3(13.7, 17.008, 4.6), w: 1.2, h: 0.9 }
export const GNSS_AT = new THREE.Vector3(24.3, 17.3, -0.4)

/** 电子海图上的一个经纬度在场景里的位置 */
export function ecdisWorld(lat: number, lon: number): [number, number, number] {
  const [px, py] = ecdisXY(lat, lon), u = px / ECDIS_PX[0] - 0.5, v = 0.5 - py / ECDIS_PX[1]
  const up = v * ECDIS.h
  return [ECDIS.c.x + up * Math.sin(ECDIS.tilt) - 0.01, ECDIS.c.y + up * Math.cos(ECDIS.tilt), ECDIS.c.z + u * ECDIS.w]
}
/** 纸海图上的一个经纬度在场景里的位置 */
export function paperWorld(lat: number, lon: number): [number, number, number] {
  const [px, py] = paperXY(lat, lon)
  return [PAPER_AT.c.x + (px / PAPER_PX[0] - 0.5) * PAPER_AT.w, PAPER_AT.c.y + 0.004, PAPER_AT.c.z + (py / PAPER_PX[1] - 0.5) * PAPER_AT.h]
}

export interface BridgeWant { ecdis?: EcdisState; gnss?: { lat: number; lon: number } | null; paper?: PaperState }

const DARK = '#2a2e33', PANEL = '#3a4047'

/** 一台带边框的屏 */
function Screen({ tex, w, h, ...rest }: { tex: THREE.Texture; w: number; h: number } & Record<string, unknown>) {
  return <group {...rest}>
    <RoundedBox args={[w + 0.06, h + 0.06, 0.05]} radius={0.012} position={[0, 0, -0.026]} castShadow><meshStandardMaterial color="#17191c" roughness={0.45} /></RoundedBox>
    <mesh><planeGeometry args={[w, h]} /><meshBasicMaterial map={tex} toneMapped={false} /></mesh>
  </group>
}

export function Bridge({ want }: { want: BridgeWant }) {
  const W = BRIDGE.x1 - BRIDGE.x0
  const ecdis = useMemo(() => makeCanvas(ECDIS_PX), [])
  const gnss = useMemo(() => makeCanvas([640, 360]), [])
  const radar = useMemo(() => {
    // 雷达屏：同心距离圈和几处回波，静态
    const m = makeCanvas([640, 640]), g = m.g
    g.fillStyle = '#05100a'; g.fillRect(0, 0, 640, 640); g.strokeStyle = 'rgba(120,255,170,0.35)'; g.lineWidth = 2
    for (const r of [80, 160, 240, 300]) { g.beginPath(); g.arc(320, 320, r, 0, Math.PI * 2); g.stroke() }
    for (let a = 0; a < 360; a += 30) { const t = a * Math.PI / 180; g.beginPath(); g.moveTo(320, 320); g.lineTo(320 + Math.sin(t) * 300, 320 - Math.cos(t) * 300); g.stroke() }
    const grd = g.createRadialGradient(320, 320, 0, 320, 320, 300); grd.addColorStop(0, 'rgba(90,255,150,0.25)'); grd.addColorStop(1, 'rgba(90,255,150,0)')
    g.fillStyle = grd; g.beginPath(); g.moveTo(320, 320); g.arc(320, 320, 300, -1.9, -1.3); g.fill()
    m.t.needsUpdate = true; return m
  }, [])
  const paper = useMemo(() => makeCanvas(PAPER_PX), [])
  // 柚木纹：浅底上一道道深色的木纹
  const teak = useMemo(() => {
    const m = makeCanvas([512, 512]), g = m.g
    g.fillStyle = '#b07a4c'; g.fillRect(0, 0, 512, 512)
    let sd = 5; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647
    for (let i = 0; i < 140; i++) { const y = r() * 512; g.strokeStyle = r() > 0.5 ? `rgba(70,38,16,${0.12 + r() * 0.25})` : `rgba(220,170,120,${0.1 + r() * 0.15})`; g.lineWidth = 0.8 + r() * 3; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= 512; x += 32) g.lineTo(x, y + Math.sin(x * 0.012 + i) * 4); g.stroke() }
    m.t.wrapS = m.t.wrapT = THREE.RepeatWrapping; m.t.needsUpdate = true; return m.t
  }, [])
  // 操纵台正面和斜台面的面板纹理：画出分缝、螺钉和通风格栅
  const front = useMemo(() => {
    const m = makeCanvas([2048, 196]), g = m.g
    g.fillStyle = '#3c4249'; g.fillRect(0, 0, 2048, 196)
    for (let x = 0; x <= 2048; x += 2048 / 12) { g.fillStyle = '#1e2226'; g.fillRect(x - 2, 0, 4, 196); g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(x + 2, 0, 2, 196) }
    g.fillStyle = '#1e2226'; g.fillRect(0, 20, 2048, 3); g.fillRect(0, 172, 2048, 3)
    for (let x = 0; x < 2048; x += 2048 / 12) { for (const [dx, dy] of [[14, 34], [2048 / 12 - 14, 34], [14, 160], [2048 / 12 - 14, 160]]) { g.fillStyle = '#8a9096'; g.beginPath(); g.arc(x + dx, dy, 3, 0, Math.PI * 2); g.fill() } for (let k = 0; k < 9; k++) { g.fillStyle = '#23272b'; g.fillRect(x + 40 + k * 10, 130, 5, 26) } }
    m.t.needsUpdate = true; return m.t
  }, [])
  const deck = useMemo(() => {
    const m = makeCanvas([128, 2048]), g = m.g
    g.fillStyle = '#30353b'; g.fillRect(0, 0, 128, 2048)
    for (let y = 0; y <= 2048; y += 2048 / 10) { g.fillStyle = '#16191c'; g.fillRect(0, y - 2, 128, 4) }
    for (let y = 0; y < 2048; y += 2048 / 10) { g.fillStyle = '#1b1f23'; g.fillRect(14, y + 18, 100, 22); for (let k = 0; k < 5; k++) { g.fillStyle = ['#3ddc84', '#f2c14e', '#3ddc84', '#5aa9ff', '#3a3f45'][(k + y) % 5 | 0]; g.fillRect(20 + k * 19, y + 25, 10, 8) } for (const [dx, dy] of [[8, 8], [120, 8], [8, 196], [120, 196]]) { g.fillStyle = '#7d848b'; g.beginPath(); g.arc(dx, y + dy, 2.5, 0, Math.PI * 2); g.fill() } }
    m.t.needsUpdate = true; return m.t
  }, [])
  const e = want.ecdis, p = want.paper, gp = want.gnss
  useEffect(() => { drawEcdis(ecdis.g, e ?? { ship: null, picked: null, track: [], sailing: 0 }); ecdis.t.needsUpdate = true }, [e, ecdis])
  useEffect(() => { drawGnss(gnss.g, gp ?? null); gnss.t.needsUpdate = true }, [gp, gnss])
  useEffect(() => { drawPaper(paper.g, p ?? { start: { lat: 20, lon: 120 }, goals: [], lines: [], drawing: null }); paper.t.needsUpdate = true }, [p, paper])

  const floor = useMemo(() => {
    // 驾驶台地板：深灰的橡胶地板，细小颗粒
    const m = makeCanvas([256, 256]), g = m.g; g.fillStyle = '#3d4247'; g.fillRect(0, 0, 256, 256)
    let s = 3; const r = () => (s = (s * 16807) % 2147483647) / 2147483647
    for (let i = 0; i < 2500; i++) { g.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.12)'; g.fillRect(r() * 256, r() * 256, 1.5, 1.5) }
    m.t.wrapS = m.t.wrapT = THREE.RepeatWrapping; m.t.repeat.set(W / 1.5, BRIDGE.z * 2 / 1.5); m.t.needsUpdate = true; return m.t
  }, [W])
  const parts = useMemo(() => ({
    // 分规的一条腿：细长的锥
    leg: lathe([[0.001, 0], [0.004, 0.004], [0.006, 0.14], [0.004, 0.16], [0.001, 0.165]], { segs: 16 }),
  }), [])

  return (
    <group>
      {/* 地板、天花板、前窗下的墙面、窗间的内衬 */}
      <mesh position={[(BRIDGE.x0 + BRIDGE.x1) / 2, BRIDGE.y0 + 0.11, 0]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[W, BRIDGE.z * 2]} /><meshStandardMaterial map={floor} roughness={0.85} /></mesh>
      <mesh position={[(BRIDGE.x0 + BRIDGE.x1) / 2, BRIDGE.y1 - 0.5, 0]} rotation-x={Math.PI / 2}><planeGeometry args={[W, BRIDGE.z * 2]} /><meshStandardMaterial color="#e9e8e3" roughness={0.9} /></mesh>
      <mesh position={[BRIDGE.x1 - 0.16, BRIDGE.y0 + 0.6, 0]} rotation-y={-Math.PI / 2}><planeGeometry args={[BRIDGE.z * 2, 1.0]} /><meshStandardMaterial color="#d9d8d2" roughness={0.8} /></mesh>
      <mesh position={[BRIDGE.x0 + 0.08, 17.7, 0]} rotation-y={Math.PI / 2}><planeGeometry args={[BRIDGE.z * 2, 2.4]} /><meshStandardMaterial color="#d9d8d2" roughness={0.8} /></mesh>
      {[-1, 1].map(s => <mesh key={s} position={[(BRIDGE.x0 + BRIDGE.x1) / 2, 16.85, s * (BRIDGE.z + 0.18)]} rotation-y={s > 0 ? Math.PI : 0}><planeGeometry args={[W, 1.0]} /><meshStandardMaterial color="#d9d8d2" roughness={0.8} /></mesh>)}
      {/* 顶上的灯 */}
      {[14, 18, 22].flatMap(x => [-3, 3].map(z => <mesh key={`${x}${z}`} position={[x, BRIDGE.y1 - 0.51, z]} rotation-x={Math.PI / 2}><circleGeometry args={[0.16, 24]} /><meshBasicMaterial color="#fff4e2" toneMapped={false} /></mesh>))}
      <pointLight position={[18, 18.3, 0]} intensity={10} distance={10} decay={2} color="#fff1dc" />
      <pointLight position={[14, 18.3, 3.5]} intensity={8} distance={6} decay={2} color="#fff1dc" />

      {/* 前面一排操纵台：底座加一块斜面板 */}
      <group position={[24.45, BRIDGE.y0 + 0.11, 0]}>
        <RoundedBox args={[0.9, 0.95, 9.6]} radius={0.04} position={[0, 0.475, 0]} castShadow receiveShadow><meshStandardMaterial color={PANEL} roughness={0.55} metalness={0.2} /></RoundedBox>
        {/* 操纵台正面：一块块可拆的面板，面板之间有缝，下面一排通风格栅 */}
        <mesh position={[-0.452, 0.48, 0]} rotation-y={-Math.PI / 2}><planeGeometry args={[9.5, 0.9]} /><meshStandardMaterial map={front} roughness={0.6} metalness={0.25} /></mesh>
        {/* 斜台面：深灰面板，分成几块，有分缝和指示灯条 */}
        <group position={[-0.2, 1.0, 0]} rotation-z={0.28}>
          <RoundedBox args={[0.7, 0.06, 9.6]} radius={0.02} castShadow><meshStandardMaterial color={DARK} roughness={0.5} /></RoundedBox>
          <mesh position={[0, 0.0305, 0]} rotation-x={-Math.PI / 2}><planeGeometry args={[0.66, 9.5]} /><meshStandardMaterial map={deck} roughness={0.55} metalness={0.3} /></mesh>
          {/* 台面前沿的拉丝铝压条 */}
          <mesh position={[-0.36, 0.0, 0]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.022, 0.022, 9.6, 12]} /><Metal kind="aluminum" grain="brushed" /></mesh>
          {/* 海图屏前面的操作盒：轨迹球和一排排按键 */}
          <group position={[-0.22, 0.045, -1.8]}>
            <RoundedBox args={[0.3, 0.04, 0.46]} radius={0.012}><meshStandardMaterial color="#1d2024" roughness={0.45} /></RoundedBox>
            <mesh position={[-0.04, 0.03, 0.12]}><sphereGeometry args={[0.032, 24, 16]} /><meshPhysicalMaterial color="#3d4a5a" roughness={0.15} clearcoat={1} /></mesh>
            <mesh position={[-0.04, 0.021, 0.12]} rotation-x={-Math.PI / 2}><ringGeometry args={[0.034, 0.048, 32]} /><Metal kind="aluminum" /></mesh>
            {Array.from({ length: 15 }, (_, i) => <RoundedBox key={i} args={[0.034, 0.014, 0.034]} radius={0.004} position={[-0.09 + (i % 3) * 0.05 + 0.03, 0.025, -0.18 + Math.floor(i / 3) * 0.048]}><meshStandardMaterial color={i === 4 ? '#c8432e' : '#40454c'} roughness={0.5} /></RoundedBox>)}
            {[0.06, 0.12].map(x => <mesh key={x} position={[x, 0.024, 0.12]}><cylinderGeometry args={[0.018, 0.02, 0.016, 20]} /><Metal kind="aluminum" grain="turned" /></mesh>)}
          </group>
          {/* 舵轮那一段：一组拨动开关 */}
          {Array.from({ length: 6 }, (_, i) => <group key={i} position={[0.05, 0.035, 0.7 + i * 0.07]}><mesh><boxGeometry args={[0.03, 0.01, 0.04]} /><meshStandardMaterial color="#2a2d31" /></mesh><mesh position={[0, 0.015, 0]} rotation-z={0.4}><cylinderGeometry args={[0.004, 0.004, 0.03, 8]} /><Metal kind="chrome" /></mesh></group>)}
        </group>
        {/* 面板上的旋钮和按键 */}
        {Array.from({ length: 18 }, (_, i) => <mesh key={i} position={[-0.26, 1.04, -4.2 + i * 0.5 + (i > 8 ? 0.3 : 0)]} rotation-z={0.28}><cylinderGeometry args={[0.022, 0.024, 0.03, 16]} /><meshStandardMaterial color={i % 4 === 0 ? '#c8432e' : '#1b1d20'} roughness={0.4} /></mesh>)}
        {/* 车钟：两根拉杆 */}
        <group position={[-0.25, 1.05, 1.0]}>
          <RoundedBox args={[0.22, 0.08, 0.3]} radius={0.02}><meshStandardMaterial color="#1b1d20" roughness={0.4} /></RoundedBox>
          {[-0.06, 0.06].map(z => <group key={z} position={[0, 0.04, z]} rotation-z={0.35}><mesh position={[0, 0.09, 0]}><cylinderGeometry args={[0.009, 0.009, 0.18, 10]} /><Metal kind="chrome" /></mesh><mesh position={[0, 0.19, 0]}><sphereGeometry args={[0.026, 16, 12]} /><meshStandardMaterial color="#c8432e" roughness={0.35} /></mesh></group>)}
        </group>
        {/* 小舵轮 */}
        <group position={[-0.42, 1.12, 0.1]} rotation-z={Math.PI / 2 - 0.3}>
          <mesh><torusGeometry args={[0.16, 0.016, 10, 40]} /><meshStandardMaterial color="#1b1d20" roughness={0.35} /></mesh>
          {[0, 1, 2].map(i => <mesh key={i} rotation-y={i * Math.PI / 3}><boxGeometry args={[0.32, 0.012, 0.012]} /><Metal kind="chrome" /></mesh>)}
          <mesh rotation-x={Math.PI / 2}><cylinderGeometry args={[0.03, 0.03, 0.04, 16]} /><Metal kind="chrome" /></mesh>
        </group>
      </group>
      {/* 电子海图屏、雷达屏：立在操纵台后沿，朝着驾驶员 */}
      <Screen tex={ecdis.t} w={ECDIS.w} h={ECDIS.h} position={ECDIS.c.toArray()} rotation={[-ECDIS.tilt, -Math.PI / 2, 0, 'YXZ']} />
      <Screen tex={radar.t} w={0.6} h={0.6} position={[24.18, 17.32, 1.9]} rotation={[-ECDIS.tilt, -Math.PI / 2, 0, 'YXZ']} />
      {/* 卫星定位接收机：放在海图屏旁边的小盒子 */}
      <group position={GNSS_AT.toArray()} rotation={[-0.1, -Math.PI / 2, 0, 'YXZ']}>
        <RoundedBox args={[0.34, 0.24, 0.12]} radius={0.02} position={[0, 0, -0.06]} castShadow><meshStandardMaterial color="#e8e6df" roughness={0.5} /></RoundedBox>
        <mesh position={[-0.03, 0.01, 0.001]}><planeGeometry args={[0.22, 0.124]} /><meshBasicMaterial map={gnss.t} toneMapped={false} /></mesh>
        {[-0.06, 0, 0.06].map(y => <mesh key={y} position={[0.13, y, 0.004]}><boxGeometry args={[0.035, 0.03, 0.01]} /><meshStandardMaterial color="#3a3d42" /></mesh>)}
      </group>
      {/* 两把驾驶椅 */}
      {[0.4, 3.4].map(z => <group key={z} position={[23.1, BRIDGE.y0 + 0.11, z]}>
        <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.32, 0.36, 0.04, 28]} /><Metal kind="aluminum" grain="brushed" /></mesh>
        <mesh position={[0, 0.4, 0]}><cylinderGeometry args={[0.05, 0.05, 0.76, 16]} /><Metal kind="chrome" /></mesh>
        <RoundedBox args={[0.56, 0.12, 0.56]} radius={0.05} position={[0, 0.84, 0]} castShadow><meshStandardMaterial color="#2b2f35" roughness={0.75} /></RoundedBox>
        <RoundedBox args={[0.1, 0.7, 0.54]} radius={0.05} position={[-0.3, 1.24, 0]} rotation-z={0.12} castShadow><meshStandardMaterial color="#2b2f35" roughness={0.75} /></RoundedBox>
        {[-1, 1].map(s => <RoundedBox key={s} args={[0.42, 0.06, 0.08]} radius={0.02} position={[-0.04, 1.06, s * 0.3]}><meshStandardMaterial color="#1e2126" roughness={0.6} /></RoundedBox>)}
      </group>)}

      {/* 海图桌：靠后墙，上面铺纸海图，桌沿一圈木条压着 */}
      <group>
        {/* 桌身：柚木，前面三层抽屉，每层两只黄铜拉手；底下一圈踢脚 */}
        <RoundedBox args={[PAPER_AT.w + 0.3, 0.84, PAPER_AT.h + 0.3]} radius={0.02} position={[PAPER_AT.c.x, PAPER_AT.c.y - 0.465, PAPER_AT.c.z]} castShadow receiveShadow><meshPhysicalMaterial map={teak} color="#d8a878" roughness={0.42} clearcoat={0.5} clearcoatRoughness={0.3} /></RoundedBox>
        <mesh position={[PAPER_AT.c.x, BRIDGE.y0 + 0.16, PAPER_AT.c.z + 0.02]}><boxGeometry args={[PAPER_AT.w + 0.22, 0.1, PAPER_AT.h + 0.3]} /><meshStandardMaterial color="#2a1c12" roughness={0.6} /></mesh>
        {Array.from({ length: 3 }, (_, i) => <group key={i} position={[PAPER_AT.c.x, BRIDGE.y0 + 0.36 + i * 0.2, PAPER_AT.c.z + PAPER_AT.h / 2 + 0.152]}>
          <RoundedBox args={[PAPER_AT.w + 0.18, 0.17, 0.02]} radius={0.006}><meshPhysicalMaterial map={teak} color="#e2b486" roughness={0.4} clearcoat={0.5} /></RoundedBox>
          {[-0.38, 0.38].map(x => <group key={x} position={[x, 0, 0.02]}>
            <mesh rotation-z={Math.PI / 2}><cylinderGeometry args={[0.008, 0.008, 0.12, 12]} /><Metal kind="brass" grain="turned" /></mesh>
            {[-0.055, 0.055].map(dx => <mesh key={dx} position={[dx, 0, -0.01]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.012, 0.012, 0.02, 12]} /><Metal kind="brass" /></mesh>)}
          </group>)}
        </group>)}
        <mesh position={[PAPER_AT.c.x, PAPER_AT.c.y, PAPER_AT.c.z]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[PAPER_AT.w, PAPER_AT.h]} /><meshStandardMaterial map={paper.t} roughness={0.9} /></mesh>
        {/* 桌沿的压条：四边一圈实木条，压着海图，内沿倒角 */}
        {[-1, 1].map(s => <RoundedBox key={s} args={[PAPER_AT.w + 0.32, 0.035, 0.14]} radius={0.012} position={[PAPER_AT.c.x, PAPER_AT.c.y + 0.012, PAPER_AT.c.z + s * (PAPER_AT.h / 2 + 0.07)]} castShadow><meshPhysicalMaterial map={teak} color="#c79466" roughness={0.38} clearcoat={0.6} /></RoundedBox>)}
        {[-1, 1].map(s => <RoundedBox key={s} args={[0.14, 0.035, PAPER_AT.h]} radius={0.012} position={[PAPER_AT.c.x + s * (PAPER_AT.w / 2 + 0.07), PAPER_AT.c.y + 0.012, PAPER_AT.c.z]} castShadow><meshPhysicalMaterial map={teak} color="#c79466" roughness={0.38} clearcoat={0.6} /></RoundedBox>)}
        {/* 压条上的黄铜角片 */}
        {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => <mesh key={`${sx}${sz}`} position={[PAPER_AT.c.x + sx * (PAPER_AT.w / 2 + 0.07), PAPER_AT.c.y + 0.031, PAPER_AT.c.z + sz * (PAPER_AT.h / 2 + 0.07)]}><boxGeometry args={[0.12, 0.004, 0.12]} /><Metal kind="brass" grain="brushed" /></mesh>)}
        {/* 平行尺：两条透明有机玻璃尺，中间两根铜连杆 */}
        <group position={[PAPER_AT.c.x + 0.25, PAPER_AT.c.y + 0.006, PAPER_AT.c.z + 0.36]} rotation-y={0.08}>
          {[0, 0.09].map(z => <mesh key={z} position={[0, 0, z]}><boxGeometry args={[0.6, 0.008, 0.06]} /><meshPhysicalMaterial color="#e9f3f0" transparent opacity={0.45} roughness={0.08} depthWrite={false} /></mesh>)}
          {[-0.2, 0.2].map(x => <mesh key={x} position={[x, 0.008, 0.045]}><boxGeometry args={[0.012, 0.004, 0.1]} /><Metal kind="brass" /></mesh>)}
        </group>
        {/* 分规：两条钢腿张开，顶上一个黄铜铰 */}
        <group position={[PAPER_AT.c.x - 0.42, PAPER_AT.c.y + 0.008, PAPER_AT.c.z + 0.3]} rotation={[-Math.PI / 2 + 0.05, 0, 0.6]}>
          {[-1, 1].map(s => <mesh key={s} geometry={parts.leg} rotation-z={s * 0.22 + Math.PI} position={[0, 0.16, 0]}><Metal kind="stainless" grain="brushed" /></mesh>)}
          <mesh position={[0, 0.165, 0]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.012, 0.012, 0.012, 20]} /><Metal kind="brass" /></mesh>
        </group>
        {/* 铅笔 */}
        <group position={[PAPER_AT.c.x - 0.1, PAPER_AT.c.y + 0.006, PAPER_AT.c.z + 0.4]} rotation-y={-0.4}>
          <mesh rotation-z={Math.PI / 2}><cylinderGeometry args={[0.0045, 0.0045, 0.17, 6]} /><meshStandardMaterial color="#e3b32b" roughness={0.5} /></mesh>
          <mesh position={[0.095, 0, 0]} rotation-z={-Math.PI / 2}><coneGeometry args={[0.0045, 0.02, 6]} /><meshStandardMaterial color="#d9b48c" roughness={0.6} /></mesh>
        </group>
        {/* 海图桌的台灯装在头顶的舱壁上（画面外），这里只有它的灯光 */}
        <spotLight position={[PAPER_AT.c.x - 0.3, PAPER_AT.c.y + 0.9, PAPER_AT.c.z - 0.2]} target-position={PAPER_AT.c.toArray()} angle={0.9} penumbra={0.9} intensity={9} distance={3.5} decay={2} color="#fff0d6" />
      </group>
    </group>
  )
}
