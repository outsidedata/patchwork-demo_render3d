// A gunner drawn: a barrel at its muzzle, on a post down to the floor where its definition's `stand` says, turned toward where its last shot went; a tracer,
// a line from the muzzle to where each shot ended, shown for the first `TRACE` seconds of the shot's
// age; and a mark of decal3d's pressed where each shot ended, once each, into the face it met, of the
// look its definition's `marks` names for what it met, taken in turn by the shot's count. A shot is
// marked the first frame a packet brings it, once decal3d has read its looks.
// What it draws for each of its rows is kept by the client's plugins, since one module serves every
// client of the page; `remove`, which names no row, takes away every gunner the client drew, as they go
// together when the scene does.
import type * as THREE from 'three'
import type { Row } from '#engine/engine.ts'
import type { Plugins } from '#engine/browser.ts'
import { def } from '#plugins/loader/loader.sim.ts'
import type { Gun, Shot } from './gunner.sim.ts'

const TRACE = 0.06

type Drawn = { post: THREE.Group; tracers: Map<number, THREE.Line>; marked: number; ink: THREE.LineBasicMaterial }
const drawnBy = new WeakMap<Plugins, Map<number, Drawn>>()

const gunOf = (plugins: Plugins, row: Row): Gun => def(plugins.wire, 'gunner')[row.data.gun]

export function setup(row: Row, plugins: Plugins) {
  const { THREE: T, scene, dress } = plugins.render3d
  const g = gunOf(plugins, row)
  const post = new T.Group() as THREE.Group
  const metal = dress(new T.MeshStandardMaterial({ color: '#2c2f36', roughness: 0.4, metalness: 0.8 }))
  const stand = new T.Mesh(new T.CylinderGeometry(0.08, 0.12, g.muzzle[1], 12), metal)
  stand.position.y = -g.muzzle[1] / 2
  const barrel = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 0.7, 12), metal)
  // along the post's +z, which `lookAt` turns toward the shot
  barrel.quaternion.setFromAxisAngle(new T.Vector3(1, 0, 0), Math.PI / 2)
  barrel.position.z = 0.35
  // the stand down to the floor only where the gun's definition says it stands on it
  for (const m of g.stand ? [stand, barrel] : [barrel]) { m.castShadow = true; m.userData.decal = false; post.add(m) }
  post.position.set(g.muzzle[0], g.muzzle[1], g.muzzle[2])
  post.name = `gunner ${row.data.gun}`
  scene.add(post)
  let mine = drawnBy.get(plugins)
  if (!mine) drawnBy.set(plugins, (mine = new Map()))
  mine.set(row.id, { post, tracers: new Map(), marked: row.data.n, ink: new T.LineBasicMaterial({ color: g.tracer, transparent: true, opacity: 0.7 }) })
}

export function tick(row: Row, plugins: Plugins) {
  const d = drawnBy.get(plugins)?.get(row.id)
  if (!d) return
  const { THREE: T, scene } = plugins.render3d
  const g = gunOf(plugins, row)
  const shots = row.data.shots as Shot[]
  const last = shots[shots.length - 1]
  if (last) d.post.lookAt(last.to[0], last.to[1], last.to[2])
  // the tracers: one for each shot young enough, gone once it is older or off the row
  const young = new Set(shots.filter(s => s.age < TRACE).map(s => s.n))
  for (const [n, line] of d.tracers) if (!young.has(n)) { scene.remove(line); line.geometry.dispose(); d.tracers.delete(n) }
  for (const s of shots) {
    if (!young.has(s.n) || d.tracers.has(s.n)) continue
    const line = new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(...g.muzzle), new T.Vector3(...s.to)]), d.ink)
    line.userData.decal = false
    scene.add(line)
    d.tracers.set(s.n, line)
  }
  // the marks
  const decals = plugins.decal3d
  if (!decals.ready()) return
  for (const s of shots) {
    if (s.n <= d.marked) continue
    const looks = g.marks[s.what]
    if (looks) decals.stamp(looks[s.n % looks.length], s.to, s.normal)
  }
  d.marked = Math.max(d.marked, ...shots.map(s => s.n))
}

export function remove(plugins: Plugins) {
  const mine = drawnBy.get(plugins)
  if (!mine) return
  for (const d of mine.values()) {
    plugins.render3d.scene.remove(d.post)
    for (const line of d.tracers.values()) { plugins.render3d.scene.remove(line); line.geometry.dispose() }
    d.ink.dispose()
  }
  drawnBy.delete(plugins)
}
