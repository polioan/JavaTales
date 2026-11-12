import type { Blit, Item, Level } from '../../shared/level'
import { Animator, assert, Java, qs, runMain } from '../../utils'

function queryLevel(): Level {
  // @ts-expect-error
  return __LEVEL__
}

function jabs(n: number) {
  return n < 0 ? (n === -2147483648 ? n : -n) : n
}

type Pts = {
  x: number
  y: number
  image: number
}

type Layer = {
  speedNum: number
  speedDenom: number
  groupWidth: number
  stripe: string | null
  pts: Pts[]
  images: Blit[][]
}

async function main() {
  const canvas = qs<HTMLCanvasElement>('#view')
  const ctx = assert(canvas.getContext('2d'), 'canvas 2d content')
  ctx.imageSmoothingEnabled = false

  const level = queryLevel()

  document.documentElement.style.background = level.sky.top
  document.body.style.background = level.sky.top

  const imgs = level.atlases.map(src => {
    const image = new Image()
    image.src = src
    return image
  })

  let camX = level.spawn.x
  let camY = level.spawn.y
  let vx = 0
  let vy = 0
  let dragging = false
  let pointerId: number | null = null
  let lastX = 0
  let lastY = 0
  let lastStamp = 0
  let layers: Layer[] = []
  let lastFrame = performance.now()

  const UNIT = 43266 / 65536

  for (const item of level.items) {
    if (item.k !== 'e') {
      continue
    }
    item.runtime = {
      state: 1,
      propel: 1,
      wait: 2000,
      period: 800,
      peek: 0,
      leg: 0,
      px: item.x,
      py: item.y,
    }
  }

  const layoutParallax = () => {
    const width = window.innerWidth
    const height = window.innerHeight
    const copies =
      Math.floor((width + 239) / 240) * Math.floor((height + 319) / 320)
    const rng = new Java.Random(level.seed)
    layers = level.parallax.map(layer => {
      const count = layer.countMul * copies
      if (count < 1) {
        return {
          speedNum: layer.speedNum,
          speedDenom: layer.speedDenom,
          groupWidth: 0,
          stripe: layer.stripe,
          pts: [],
          images: layer.images,
        }
      }
      const xs = [0]
      const ys = [(layer.yRange ? rng.nextInt() % layer.yRange : 0) + layer.y]
      const image = [0]
      for (let i = 1; i < count + 1; i++) {
        const step = layer.xRange ? jabs(rng.nextInt() % layer.xRange) : 0
        xs.push(step + xs[i - 1]! + layer.spacing)
        ys.push((layer.yRange ? rng.nextInt() % layer.yRange : 0) + layer.y)
        image.push(jabs(rng.nextInt() % layer.images.length))
      }
      const pts: Pts[] = []
      for (let i = 0; i < count; i++) {
        pts.push({
          x: xs[i]!,
          y: ys[i]!,
          image: image[i]!,
        })
      }
      return {
        speedNum: layer.speedNum,
        speedDenom: layer.speedDenom,
        groupWidth: xs[count]!,
        stripe: layer.stripe,
        pts,
        images: layer.images,
      }
    })
  }

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 3)
    canvas.width = Math.round(window.innerWidth * dpr)
    canvas.height = Math.round(window.innerHeight * dpr)
    layoutParallax()
  }

  const clampCam = () => {
    const pad = 160
    camX = Math.min(
      level.bounds.maxX + pad,
      Math.max(level.bounds.minX - pad, camX)
    )
    camY = Math.min(
      level.bounds.maxY + pad,
      Math.max(level.bounds.minY - pad, camY)
    )
  }

  const drawBlit = (blit: Blit, ax: number, ay: number, dpr: number) => {
    const image = imgs[blit.i]
    if (!image || !image.complete) {
      return
    }
    ctx.drawImage(
      image,
      blit.sx,
      blit.sy,
      blit.sw,
      blit.sh,
      Math.round(ax + blit.dx * dpr),
      Math.round(ay + blit.dy * dpr),
      blit.sw * dpr,
      blit.sh * dpr
    )
  }

  const screenOf = (x: number, y: number, dpr: number): [number, number] => {
    return [
      (x - camX) * UNIT * dpr + canvas.width / 2,
      (camY - y) * UNIT * dpr + canvas.height / 2,
    ]
  }

  const drawParallax = (dpr: number) => {
    const height = window.innerHeight
    for (const layer of layers) {
      if (!layer.groupWidth) {
        continue
      }
      const pixelX = (camX + 33000) * UNIT
      const pixelY = (camY - level.spawn.y) * UNIT
      const shiftX = (pixelX * layer.speedNum) / layer.speedDenom
      const shiftY = (pixelY * layer.speedNum) / layer.speedDenom
      const wrapped =
        ((shiftX % layer.groupWidth) + layer.groupWidth) % layer.groupWidth
      const baseX = (layer.groupWidth - wrapped) * dpr
      const baseY = (height + shiftY) * dpr

      const paint = (pt: Pts | undefined, origin: number) => {
        if (!pt) {
          return
        }
        const blits = layer.images[pt.image]
        if (!blits) {
          return
        }
        for (const blit of blits) {
          drawBlit(blit, origin + pt.x * dpr, baseY + pt.y * dpr, dpr)
        }
      }

      for (let i = 0; i < layer.pts.length; i++) {
        const pt = layer.pts[i]
        if (i < 2) {
          paint(pt, baseX)
        }
        if (i > 2) {
          paint(pt, baseX - layer.groupWidth * 2 * dpr)
        }
        paint(pt, baseX - layer.groupWidth * dpr)
      }
      const origin = layer.pts[0]
      if (layer.stripe && origin) {
        const stripeTop = baseY + origin.y * dpr
        ctx.fillStyle = layer.stripe
        ctx.fillRect(0, stripeTop, canvas.width, canvas.height - stripeTop)
      }
    }
  }

  const stepMoles = (dt: number) => {
    const speed = (4000 / 65536) * dt
    for (const item of level.items) {
      if (item.k !== 'e' || !item.runtime) {
        continue
      }
      item.runtime.wait -= dt
      if (item.runtime.wait <= 0) {
        if (item.runtime.propel === 0) {
          item.runtime.propel = 1
          item.runtime.wait = 2000
          item.runtime.state = 1
          item.runtime.period = 800
        } else {
          item.runtime.propel = 0
          item.runtime.wait = 5000
          item.runtime.state = 2
          item.runtime.period = 800
        }
      }
      if (item.runtime.state === 1) {
        item.runtime.peek += dt
        if (item.runtime.peek >= item.runtime.period) {
          if (item.runtime.propel === 0) {
            item.runtime.state = 2
            item.runtime.period = 200
          }
          item.runtime.peek = item.runtime.period
        }
      } else if (item.runtime.state === 2) {
        item.runtime.peek -= dt
        if (item.runtime.peek <= 0) {
          item.runtime.state = 0
          item.runtime.peek = 0
        }
      }
      if (item.runtime.propel === 0 && item.runtime.state === 0) {
        const tx = item.runtime.leg === 0 ? item.ax : item.bx
        const ty = item.runtime.leg === 0 ? item.ay : item.by
        const dx = tx - item.runtime.px
        const dy = ty - item.runtime.py
        const dist = Math.hypot(dx, dy)
        const before = item.runtime.px
        if (dist <= speed || dist === 0) {
          item.runtime.px = tx
          item.runtime.py = ty
          item.runtime.leg = item.runtime.leg === 0 ? 1 : 0
        } else {
          item.runtime.px += (dx / dist) * speed
          item.runtime.py += (dy / dist) * speed
        }
        if (item.runtime.px !== before) {
          item.faceLeft = before < item.runtime.px
        }
      }
    }
  }

  const drawMole = (item: Item, dpr: number, now: number) => {
    if (!item.runtime) {
      return
    }
    const [ax, ay] = screenOf(item.runtime.px, item.runtime.py, dpr)
    const peekPx =
      item.runtime.period > 0
        ? (Math.max(0, item.runtime.peek) / item.runtime.period) * 61
        : 0
    if (item.runtime.state !== 0) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, canvas.width, ay)
      ctx.clip()
      // @ts-expect-error
      const body = item.faceLeft ? item.bodyL : item.bodyR
      for (const blit of body) {
        drawBlit(blit, ax, ay + (61 - peekPx) * dpr, dpr)
      }
      ctx.restore()
    }
    const frame =
      // @ts-expect-error
      item.runtime.state === 0 ? Math.floor(now / 150) % item.hole.length : 0
    // @ts-expect-error
    for (const blit of item.hole[frame]) {
      drawBlit(blit, ax, ay, dpr)
    }
  }

  const drawBall = (item: Item, dpr: number, now: number) => {
    // @ts-expect-error
    const [ax, ay] = screenOf(item.x, item.y, dpr)
    const radius = (((20 * 43266) >> 16) + 1) * dpr
    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.arc(ax, ay, radius + 2 * dpr, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ed1c24'
    ctx.beginPath()
    ctx.arc(ax, ay, radius, 0, Math.PI * 2)
    ctx.fill()
    const inner = Math.floor((radius * 90) / 100)
    ctx.fillStyle = '#af1100'
    ctx.beginPath()
    ctx.arc(ax, ay + 2 * dpr, inner, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ed1c24'
    ctx.beginPath()
    ctx.arc(ax + dpr, ay - dpr, inner, 0, Math.PI * 2)
    ctx.fill()
    // @ts-expect-error
    for (const blit of item.under) {
      drawBlit(blit, ax, ay, dpr)
    }
    const half = radius >> 1
    const reach = radius - half + 1
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(
      ax + Math.cos(5.3) * reach,
      ay + Math.sin(5.3) * reach,
      Math.max(1, half >> 1),
      0,
      Math.PI * 2
    )
    ctx.fill()
    // @ts-expect-error
    for (const blit of item.over) {
      drawBlit(blit, ax, ay, dpr)
    }
    const cycle = now % 3600
    // @ts-expect-error
    if (cycle >= 3000 && item.blink.length > 1) {
      const frame = cycle - 3000 < 300 ? 1 : 0
      // @ts-expect-error
      for (const blit of item.blink[frame]) {
        drawBlit(blit, ax, ay, dpr)
      }
    }
  }

  const draw = (now: number) => {
    const dpr = canvas.width / window.innerWidth
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.imageSmoothingEnabled = false
    const sky = ctx.createLinearGradient(0, 0, 0, canvas.height)
    sky.addColorStop(0, level.sky.top)
    sky.addColorStop(1, level.sky.bottom)
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    drawParallax(dpr)
    const margin = 280 * dpr
    for (const item of level.items) {
      if (item.k === 'm') {
        ctx.beginPath()
        let visible = false
        for (let i = 0; i + 2 < item.f.length; i += 3) {
          const a = item.f[i]! * 2
          const b = item.f[i + 1]! * 2
          const c = item.f[i + 2]! * 2
          const [x1, y1] = screenOf(item.v[a]!, item.v[a + 1]!, dpr)
          const [x2, y2] = screenOf(item.v[b]!, item.v[b + 1]!, dpr)
          const [x3, y3] = screenOf(item.v[c]!, item.v[c + 1]!, dpr)
          if (x1 > -margin || x2 > -margin || x3 > -margin) {
            visible = true
          }
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
          ctx.lineTo(x3, y3)
          ctx.closePath()
        }
        if (!visible) {
          continue
        }
        ctx.fillStyle = item.c
        ctx.fill()
      } else if (item.k === 'b') {
        drawBall(item, dpr, now)
      } else if (item.k === 'e') {
        drawMole(item, dpr, now)
      } else if (item.k === 'w') {
        const [x0, y0] = screenOf(item.x0, item.y0, dpr)
        const [x1, y1] = screenOf(item.x1, item.y1, dpr)
        ctx.beginPath()
        if (item.surface) {
          const steps = 16
          for (let i = 0; i <= steps; i++) {
            const t = i / steps
            const x = x0 + (x1 - x0) * t
            const wave = Math.sin(t * 10 + now / 260) * 2.5 * dpr
            if (i === 0) {
              ctx.moveTo(x, y0 + wave)
            } else {
              ctx.lineTo(x, y0 + wave)
            }
          }
        } else {
          ctx.moveTo(x0, y0)
          ctx.lineTo(x1, y0)
        }
        ctx.lineTo(x1, y1)
        ctx.lineTo(x0, y1)
        ctx.closePath()
        ctx.fillStyle = item.c
        ctx.fill()
      } else {
        const [ax, ay] = screenOf(item.x, item.y, dpr)
        if (
          ax < -margin ||
          ay < -margin ||
          ax > canvas.width + margin ||
          ay > canvas.height + margin
        ) {
          continue
        }
        const blits =
          item.k === 'a'
            ? item.fr[Math.floor(now / item.ms) % item.fr.length]
            : item.b
        for (const blit of blits ?? []) {
          drawBlit(blit, ax, ay, dpr)
        }
      }
    }
  }

  const frame = (now: number) => {
    const dtMs = Math.min(50, now - lastFrame)
    const dt = dtMs / 1000
    lastFrame = now
    stepMoles(dtMs)
    if (!dragging) {
      camX += vx * dt
      camY += vy * dt
      const decay = Math.exp(-3.2 * dt)
      vx *= decay
      vy *= decay
      if (vx * vx + vy * vy < 40) {
        vx = 0
        vy = 0
      }
    }
    clampCam()
    draw(now)
  }

  const animator = new Animator()

  animator.callback = frame

  canvas.addEventListener('pointerdown', event => {
    if (pointerId !== null) {
      return
    }
    pointerId = event.pointerId
    try {
      canvas.setPointerCapture(event.pointerId)
    } catch {}
    dragging = true
    canvas.classList.add('dragging')
    lastX = event.clientX
    lastY = event.clientY
    lastStamp = event.timeStamp
    vx = 0
    vy = 0
    event.preventDefault()
  })

  canvas.addEventListener('pointermove', event => {
    if (!dragging || event.pointerId !== pointerId) {
      return
    }
    const dx = event.clientX - lastX
    const dy = event.clientY - lastY
    const dt = Math.max(8, event.timeStamp - lastStamp)
    lastX = event.clientX
    lastY = event.clientY
    lastStamp = event.timeStamp
    const wx = -dx / UNIT
    const wy = dy / UNIT
    camX += wx
    camY += wy
    vx = (wx / dt) * 1000
    vy = (wy / dt) * 1000
    event.preventDefault()
  })

  const endDrag = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) {
      return
    }
    dragging = false
    pointerId = null
    canvas.classList.remove('dragging')
  }

  canvas.addEventListener('pointerup', endDrag)
  canvas.addEventListener('pointercancel', endDrag)
  window.addEventListener('resize', resize)

  await Promise.all(imgs.map(image => image.decode()))

  resize()
  clampCam()
  animator.start()
}

runMain(main)
