// 光合作用和呼吸作用 · 第 6、7 课和随堂检测共用的场景：整座大棚。天色跟着时刻变，棚口立着一块二氧化碳读数牌。
import { useMemo } from 'react'
import * as THREE from 'three'
import { LabStage, Led, type Label } from '@/lab-kit'
import { clock, co2At, lampsOn, lightAt, ventOpen, type PlanKey } from './physics'
import { S_HOUSE, T_HOUSE, V_HOUSE } from './spots'
import type { Want } from './world'

const NIGHT = new THREE.Color('#0d1626'), DAY = new THREE.Color('#a9cdea'), DUSK = new THREE.Color('#e8a36a')
const FOG: [number, number] = [120, 600]

export default function House({ t, plan = 'none', labels = [] }: { t: number; plan?: PlanKey; labels?: Label[] }) {
  const light = lightAt(t, 12), glow = Math.max(light, lampsOn(t, plan) ? 0.35 : 0)
  // 天色：夜里深蓝，太阳刚出来和快落下时偏橙，白天浅蓝
  const backdrop = useMemo(() => { const c = NIGHT.clone().lerp(DUSK, Math.min(1, light * 4)); return `#${c.lerp(DAY, Math.min(1, Math.max(0, light * 2.2 - 0.25))).getHexString()}` }, [light])
  const want: Want = { lamps: lampsOn(t, plan), tank: plan === 'co2', vent: ventOpen(t, plan) }
  const all: Label[] = [
    { id: 'time', at: [3, 3.15, 9.6], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>{light > 0 ? '白天' : '夜里'}</small>{clock(t)}</> },
    { id: 'nBoard', at: [3, 1.15, 9.6], ax: 0.5, name: true, className: 'scene-name', children: '二氧化碳读数牌' },
    ...labels,
  ]
  return (
    <LabStage<Want> labels={all} target={T_HOUSE} span={S_HOUSE} view={V_HOUSE} sky={false} backdrop={backdrop} env={0.1 + glow * 1.0} sun={0.15 + light * 3.2} fog={FOG} world={want}>
      {/* 读数牌：立在棚口，显示棚里的二氧化碳浓度（0 时算 100） */}
      <group position={[3, 0, 9.6]} rotation-y={-0.62}>
        <mesh position={[0, 0.9, 0]}><cylinderGeometry args={[0.05, 0.05, 1.8, 10]} /><meshStandardMaterial color="#5a6068" metalness={0.5} roughness={0.4} /></mesh>
        <mesh position={[0, 2.2, 0]} castShadow><boxGeometry args={[2.3, 1.1, 0.14]} /><meshStandardMaterial color="#20262b" roughness={0.6} /></mesh>
        <Led text={co2At(t, plan).toFixed(1)} w={1.9} h={0.72} position={[0, 2.2, 0.08]} />
      </group>
    </LabStage>
  )
}
