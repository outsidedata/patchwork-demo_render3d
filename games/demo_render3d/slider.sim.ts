// A block of the marks scene that slides back and forth along x, a shapes3d box a rule moves, so the
// marks shot into it are seen to go where it goes. Its definition in `assets/demo_render3d.json` under
// `slider`: `reach`, metres either way of where it was put, and `period`, seconds a there and back. Its
// row carries `pos`, `yaw` and `was` (shapes3d's), `home`, where it was put, and `t`, the steps it has
// slid.
import type { Kind } from '#engine/engine.ts'
import { def } from '#plugins/loader/loader.sim.ts'
import * as math from '#plugins/math/math.sim.ts'
import { move } from '#plugins/shapes3d/shapes3d.sim.ts'

export const slider: Kind = {
  tick(me, dt, w) {
    const { reach, period } = def(w, 'slider')
    if (!me.data.home) me.data.home = me.data.pos.slice()
    me.data.t += 1
    const x = me.data.home[0] + reach * math.sin((2 * Math.PI * me.data.t * dt) / period)
    move(w, me, [x, me.data.home[1], me.data.home[2]], me.data.yaw)
  },
}
