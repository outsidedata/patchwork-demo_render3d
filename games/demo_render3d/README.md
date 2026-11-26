# demo_render3d

The demo of the `render3d` plugin's reflections, and of decal3d's marks, in three scenes. Nothing is played: the camera stands
still and the scene moves.

| scene | what it shows |
|---|---|
| main | a room of mirrors: a polished mirror floor, a looking glass on the back wall and a rough mirror on the side wall, glowing balls and a chrome box circling between pedestals; each mirror shows the others |
| glossy | a polished yard of pillars, glowing bars and a chrome ball circling, reflected live in the floor by screen-space reflections |
| marks | decal3d's marks: three guns firing by themselves press bullet holes into the walls, round the pillars and into a sliding block that carries them with it, scorches onto the floor, paint over a crate's corner, and paint onto a swaying skinned frond of kelp that bends with it |

## Controls

None: the scene plays itself.

## The dev page

`dev.html` is the demo's main page. `?scene=<scene>` enters a scene, as the panel's picker does. The
panel tunes, live: the exposure; each mirror's resolution, roughness, metalness and colour; the
floor's roughness, metalness and colour where it is no mirror; and each light's strength, reach and
colour. In glossy, the screen-space reflections folder turns them off to compare (`?ssr=0`, a reload)
and tunes their steps, distance, thickness and roughness live, with "copy ssr JSON".

## Playing it

```
yarn dev
```

then open `/games/demo_render3d/dev.html`, or `/games/demo_render3d/index.html` for the plain page.
Against its server:

```
yarn serve demo_render3d
```

then open `/games/demo_render3d/client.html`.

## Remaking the art

Everything is drawn from three.js shapes by `stage.client.ts`, from the sets in
`assets/demo_render3d.json`, but the marks scene's pictures (`assets/hole.png`, `hole-normal.png`,
`scorch.png`, `splat.png`), drawn from noise by:

```
node --experimental-strip-types games/demo_render3d/assets/marks.ts
```
