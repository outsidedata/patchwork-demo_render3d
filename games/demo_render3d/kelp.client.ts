// A frond of kelp drawn: a tube `height` metres tall and `radius` round, skinned to a chain of `bones`
// bones standing one over the next from the row's `pos`, each turned `sway` degrees at most about x and
// z, the turn running up the chain a little later at each bone, a sway of `period` seconds, so the
// frond bends and whips. Every `every` seconds it is painted: a mark of decal3d's pressed into the tube
// where it stands that moment, at a height and a side that go round the frond in turn, of the next of
// its definition's `marks`. The marks are cut from the skin and bound to its bones, so they bend with
// it. Its definition is `kelp` in `assets/demo_render3d.json`: `height`, `radius`, `bones`, `sway`,
// `period`, `colour`, `every` and `marks`.
// It moves by the steps' clock, the moment drawn (`(n − 1 + between) × dt`), and every turn is set as a
// whole quaternion. What it draws is kept by the client's plugins, since one module serves every client
// of the page; `remove`, which names no row, takes away every frond the client drew.
import type * as THREE from 'three'
import type { Row } from '#engine/engine.ts'
import type { Plugins } from '#engine/browser.ts'
import { def } from '#plugins/loader/loader.sim.ts'

type Kelp = { height: number; radius: number; bones: number; sway: number; period: number; colour: string; every: number; marks: string[] }
type Drawn = { mesh: THREE.SkinnedMesh; bones: THREE.Bone[]; painted: number }
const drawnBy = new WeakMap<Plugins, Map<number, Drawn>>()

const drawn = (plugins: Plugins) => (plugins.wire.n - 1 + (plugins.wire.between ?? 1)) * plugins.wire.scene.prefabs.engine.dt

export function setup(row: Row, plugins: Plugins) {
  const { THREE: T, scene, dress } = plugins.render3d
  const k: Kelp = def(plugins.wire, 'kelp')
  const step = k.height / k.bones
  const g = new T.CylinderGeometry(k.radius * 0.7, k.radius, k.height, 32, k.bones * 6, false) as THREE.CylinderGeometry
  g.translate(0, k.height / 2, 0)
  // each corner on the two bones it lies between, by how far up it is
  const pos = g.getAttribute('position')
  const si: number[] = [], sw: number[] = []
  for (let i = 0; i < pos.count; i++) {
    const at = Math.min(k.bones - 1e-6, Math.max(0, pos.getY(i) / step - 0.5))
    const b = Math.floor(at), f = at - b
    si.push(b, Math.min(k.bones - 1, b + 1), 0, 0)
    sw.push(1 - f, f, 0, 0)
  }
  g.setAttribute('skinIndex', new T.Uint16BufferAttribute(si, 4))
  g.setAttribute('skinWeight', new T.Float32BufferAttribute(sw, 4))
  const bones: THREE.Bone[] = []
  for (let b = 0; b < k.bones; b++) {
    const bone = new T.Bone() as THREE.Bone
    bone.position.y = b === 0 ? 0 : step
    if (b > 0) bones[b - 1].add(bone)
    bones.push(bone)
  }
  const mesh = new T.SkinnedMesh(g, dress(new T.MeshStandardMaterial({ color: k.colour, roughness: 0.55 }))) as THREE.SkinnedMesh
  mesh.add(bones[0])
  mesh.bind(new T.Skeleton(bones))
  mesh.position.set(row.data.pos[0], row.data.pos[1], row.data.pos[2])
  mesh.castShadow = mesh.receiveShadow = true
  mesh.frustumCulled = false
  mesh.name = 'kelp'
  scene.add(mesh)
  let mine = drawnBy.get(plugins)
  if (!mine) drawnBy.set(plugins, (mine = new Map()))
  mine.set(row.id, { mesh, bones, painted: Math.floor(drawn(plugins) / k.every) })
  tick(row, plugins)
}

export function tick(row: Row, plugins: Plugins) {
  const d = drawnBy.get(plugins)?.get(row.id)
  if (!d) return
  const { THREE: T } = plugins.render3d
  const k: Kelp = def(plugins.wire, 'kelp')
  const t = drawn(plugins)
  const sway = (k.sway * Math.PI) / 180
  const e = new T.Euler()
  d.bones.forEach((bone, b) => {
    const a = (2 * Math.PI * t) / k.period - b * 0.45
    bone.quaternion.setFromEuler(e.set(Math.sin(a) * sway, 0, Math.cos(a * 0.7) * sway * 0.6))
  })
  d.mesh.updateMatrixWorld(true)
  // painted once each `every` seconds that has passed since the last
  const due = Math.floor(t / k.every)
  if (due <= d.painted || !plugins.decal3d.ready()) return
  d.painted = due
  // a height and a side round the frond, taken in turn
  const b = 1 + (due % (k.bones - 1))
  const side = due * 2.4
  const bone = d.bones[b]
  const centre = new T.Vector3().setFromMatrixPosition(bone.matrixWorld)
  const out = new T.Vector3(Math.cos(side), 0, Math.sin(side)).transformDirection(bone.matrixWorld)
  const at = centre.clone().addScaledVector(out, k.radius * 0.85)
  plugins.decal3d.stamp(k.marks[due % k.marks.length], at.toArray(), out.toArray())
}

export function remove(plugins: Plugins) {
  const mine = drawnBy.get(plugins)
  if (!mine) return
  for (const d of mine.values()) {
    plugins.render3d.scene.remove(d.mesh)
    d.mesh.geometry.dispose()
  }
  drawnBy.delete(plugins)
}
