// The marks scene as the game boots it, the manager's entry turned to it in the test's own copy, as
// `dev.html?scene=marks` enters it. Its rules: each gun's shots meet what it is aimed at, the rifle's the
// walls, the pillars and the sliding block, the mortar's the floor, the paint's the crate, every one
// facing back at its gun; the block slides its reach either way. Its look: a page on it, as `dev.html`
// makes one, with render3d handed a canvas stand-in and no renderer, presses a mark of decal3d's for each
// shot that met something, of the look the gun names, hung from what it hit, and paints the kelp, the
// marks on it bound to its skin.
import { expect, test } from 'vitest'
import { boot, type Row, type Scene } from '#engine/engine.ts'
import { accept, connection, link, load, manager, view } from '#addons/scenemanager/scenemanager.addon.ts'
import { loopback } from '#addons/loopback/loopback.addon.ts'
import { sim } from './demo_render3d.sim.ts'
import file from './demo_render3d.scene.json'
import defs from './assets/demo_render3d.json'
import type { Shot } from './gunner.sim.ts'

const DT = file.prefabs.engine.dt
const here = new URL('./', import.meta.url).href
;(globalThis as any).addEventListener ??= () => {}
;(globalThis as any).removeEventListener ??= () => {}

async function entered() {
  const top = structuredClone(file) as Scene
  top.prefabs.scenemanager.entry = 'marks'
  const truth = boot(top, sim)
  const marks = (await load(truth, here)).get('marks')!
  return { top, truth, marks }
}

test('each gun\'s shots meet what it is aimed at, facing back at it, and the block slides its reach either way', async () => {
  const { truth, marks } = await entered()
  connection(manager(truth), () => {})
  const seen = new Map<string, Shot[]>()
  const xs: number[] = []
  for (let i = 0; i < 60 * 12; i++) {
    truth.step(DT)
    for (const g of marks.rows.filter(r => r.kind === 'gunner')) {
      const all = seen.get(g.data.gun) ?? []
      for (const s of g.data.shots as Shot[]) if (!all.some(a => a.n === s.n)) all.push(s)
      seen.set(g.data.gun, all)
    }
    xs.push(marks.rows.find(r => r.kind === 'slider')!.data.pos[0])
  }
  const facing = (gun: keyof typeof defs.gunner, s: Shot) => {
    const m = defs.gunner[gun].muzzle
    const back = [m[0] - s.to[0], m[1] - s.to[1], m[2] - s.to[2]]
    return back[0] * s.normal[0] + back[1] * s.normal[1] + back[2] * s.normal[2]
  }
  // the rifle, a shot every 6 steps for 12 s: 120, each on the far wall's face, a pillar or the block
  const rifle = seen.get('rifle')!
  expect(rifle.length).toBe(120)
  for (const s of rifle) {
    expect(s.what).toBe('solid')
    expect(facing('rifle', s)).toBeGreaterThan(0)
    // nearer the gun than the front of the nearer pillar, at z −4 and 0.7 round, none
    expect(s.to[2]).toBeLessThanOrEqual(-3.3 + 1e-6)
  }
  expect(rifle.filter(s => Math.abs(s.to[2] + 7.75) < 1e-6).length).toBeGreaterThan(30)
  expect(rifle.filter(s => s.to[2] > -7.7).length).toBeGreaterThan(5)
  // the mortar's on the floor, face up, or on a top it fell on
  const mortar = seen.get('mortar')!
  expect(mortar.length).toBe(16)
  for (const s of mortar) {
    expect(s.normal[1]).toBeCloseTo(1, 6)
    expect(facing('mortar', s)).toBeGreaterThan(0)
  }
  expect(mortar.filter(s => Math.abs(s.to[1]) < 1e-6).length).toBeGreaterThan(10)
  // the paint's on the crate it is aimed at: within its corners' reach of its middle
  const paint = seen.get('paint')!
  expect(paint.length).toBe(40)
  for (const s of paint) {
    expect(Math.hypot(s.to[0] - 4.6, s.to[2] + 1)).toBeLessThan(0.8 * Math.SQRT2 + 1e-6)
    expect(s.to[1]).toBeLessThanOrEqual(1.6 + 1e-6)
    expect(facing('paint', s)).toBeGreaterThan(0)
  }
  // the block, put at x 0, slides 3.5 m either way
  expect(Math.min(...xs)).toBeCloseTo(-defs.slider.reach, 2)
  expect(Math.max(...xs)).toBeCloseTo(defs.slider.reach, 2)
})

test('a page presses a mark for each shot, hung from what it hit, and paints the kelp on its skin', async () => {
  const { top, truth } = await entered()
  const surface = (s: Scene) => ({ addEventListener: () => {}, removeEventListener: () => {}, style: {} as any, width: s.prefabs.engine.width, height: s.prefabs.engine.height, remove() {} })
  const page = view(link(loopback(accept(manager(truth)))), top, here, (me, s) => { me.plugins.render3d.canvas = surface(s) })
  const frame = async () => { truth.step(DT); await page.frame() }
  for (let i = 0; i < 20 && !page.client; i++) await frame()
  const client = page.client!
  // a few seconds, every frame a step, as dev.html plays it
  for (let i = 0; i < 60 * 4; i++) await frame()
  const decals = client.plugins.decal3d
  const drawn = decals.drawn() as { look: string; mesh: any }[]
  const rifle = (client.rows as Row[]).find(r => r.kind === 'gunner' && r.data.gun === 'rifle')!
  // every rifle shot fired since the page began marked a hole, each hung from a solid of the yard
  const holes = drawn.filter(d => d.look === 'hole')
  expect(holes.length).toBeGreaterThan(rifle.data.n - 8)
  for (const h of holes) expect(h.mesh.parent.isMesh).toBe(true)
  expect(drawn.some(d => d.look === 'scorch' && d.mesh.parent.name === 'floor')).toBe(true)
  expect(drawn.some(d => d.look.startsWith('splat') && !d.mesh.isSkinnedMesh)).toBe(true)
  // the kelp, painted every 0.7 s, its marks bound to its own skeleton
  const kelp = client.plugins.render3d.scene.getObjectByName('kelp')
  const onKelp = drawn.filter(d => d.mesh.isSkinnedMesh)
  expect(onKelp.length).toBeGreaterThan(3)
  for (const k of onKelp) {
    expect(k.mesh.parent).toBe(kelp)
    expect(k.mesh.skeleton).toBe(kelp.skeleton)
  }
})
