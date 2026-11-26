// The kinds of marks and the marks.scene.json file next to this one: a yard of walls, pillars, crates,
// a sliding block and a frond of kelp, shot at by three guns that fire by themselves, every shot pressing
// a mark of decal3d's where it ended: bullet holes in the walls and the pillars, scorches on the floor,
// paint splashed over a crate's corner, and paint on the kelp as it sways. The walls, pillars, crates and
// block are shapes3d's, which hitscan3d's shots meet and solids draws; the floor is a shapes3d plane the
// shots meet and the stage draws. Every number of them that never changes is its definition in
// `assets/demo_render3d.json`, which the scene's `world.defs` names, or a field of `world`.
import type { Kind, Scene, Sim } from '#engine/engine.ts'
import { scenemanager } from '#plugins/scenemanager/scenemanager.sim.ts'
import { loader } from '#plugins/loader/loader.sim.ts'
import { player } from './player.sim.ts'
import { stage } from './stage.sim.ts'
import { gunner } from './gunner.sim.ts'
import { slider } from './slider.sim.ts'
import { kelp } from './kelp.sim.ts'
import file from './marks.scene.json' with { type: 'json' }

// The shapes that stand still: shapes3d's rows, with no rule of their own.
const still: Kind = {}

export const sim: Sim = { scenemanager, loader, player, stage, gunner, slider, kelp, ground: still, wall: still, side: still, pillar: still, crate: still }

export const scene = file as Scene
