// A gun standing in the marks scene that fires by itself, at a point that wanders over what it is aimed
// at, so its shots fall in a moving pattern: hitscan3d's shots, each line from its muzzle to the first
// thing it meets, kept on the row for a page to mark. Its row's `gun` names its definition in
// `assets/demo_render3d.json` under `gunner`:
//   muzzle   [x, y, z]: where its shots leave from, metres
//   aim      `{ at, reach, periods, phases? }`: the point it aims at, `at` [x, y, z] moved `reach` [x, y, z]
//            metres either way along each axis, each a sine of `periods` [x, y, z] seconds from `phases`
//            [x, y, z] radians (0 each when left out)
//   every    steps between shots
//   far      metres a shot reaches
//   hold     seconds a shot stays on the row, so every page, which reads only the last packet it took,
//            sees it
//   marks    `{ <what>: [look, …] }`: the looks of `marks.decal3d.json` a shot that met a thing of that
//            hitscan3d `what` is marked with, taken in turn by the shot's count (`gunner.client.ts`)
//   tracer   the colour of the line a page draws from the muzzle to where a shot ended
//   stand    whether a page draws a post under it down to the floor, or only its barrel, hung in the air
// The row carries what changes: `t`, the steps it has stood; `n`, the shots it has fired; and `shots`,
// the ledger, `[{ n, age, to, normal, what }]`, each shot of the last `hold` seconds that met something,
// its count, its age in seconds, where it ended, the face's normal there and what it met.
import type { Kind, Row, W } from '#engine/engine.ts'
import { def } from '#plugins/loader/loader.sim.ts'
import * as math from '#plugins/math/math.sim.ts'
import { shoot } from '#plugins/hitscan3d/hitscan3d.sim.ts'

export type Gun = {
  muzzle: number[]
  aim: { at: number[]; reach: number[]; periods: number[]; phases?: number[] }
  every: number
  far: number
  hold: number
  marks: Record<string, string[]>
  tracer: string
  stand: boolean
}
export type Shot = { n: number; age: number; to: number[]; normal: number[]; what: string }

export const gunOf = (w: W, row: Row): Gun => {
  const gun = def(w, 'gunner')[row.data.gun]
  if (!gun) throw new Error(`the gunner ${row.id} names the gun ${row.data.gun}, which demo_render3d.json's gunner has not`)
  return gun
}

// Where the gun aims `t` seconds in.
export function aimAt(g: Gun, t: number): number[] {
  return [0, 1, 2].map(i => g.aim.at[i] + g.aim.reach[i] * math.sin((2 * Math.PI * t) / g.aim.periods[i] + (g.aim.phases?.[i] ?? 0)))
}

export const gunner: Kind = {
  tick(me, dt, w) {
    const g = gunOf(w, me)
    me.data.t += 1
    me.data.shots = (me.data.shots as Shot[]).map(s => ({ ...s, age: s.age + dt })).filter(s => s.age < g.hold)
    if (me.data.t % g.every !== 0) return
    const to = aimAt(g, me.data.t * dt)
    const dir = [to[0] - g.muzzle[0], to[1] - g.muzzle[1], to[2] - g.muzzle[2]]
    me.data.n += 1
    const hit = shoot(w, g.muzzle, dir, g.far, { bodies: false })
    if (!hit) return
    me.data.shots = [...me.data.shots, { n: me.data.n, age: 0, to: hit.point, normal: hit.normal, what: hit.what }]
  },
}
