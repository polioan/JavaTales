import type { LevelJson } from '../../schema'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { die, exists, isDirectory } from '../../utils'
import { parseDocument, isMap, isSeq, isScalar, type Node } from 'yaml'
import {
  type Mat,
  ONE,
  type LevelObject,
  RLEF,
  KEY_END,
  KEY_GEOMETRY,
  KEY_SPRITE,
  KEY_WATER,
  KEY_ENEMY,
  type ImageMap,
  type SpriteDef,
  type Blit,
  type SceneItem,
  KEY_EGG,
  EGG_IMAGE,
  KEY_TRAMPOLINE,
  KEY_CANNON,
  CANNON_SPRITE,
  CANDLE_FRAME_MS,
  CANDLE_IMAGE,
  KEY_PLAYER,
  EYE_UNDER,
  EYE_OVER,
  BLINK_IMAGE,
  type ParallaxLayer,
  TRAMPOLINE_IMAGES,
  type Level,
} from '../../shared/level'

const LEVEL_FILES = [
  'level_campaign01.rlef',
  'level_campaign02.rlef',
  'level_campaign03.rlef',
  'level_campaign04.rlef',
  'level_extra01.rlef',
  'level_campaign05.rlef',
  'level_campaign06.rlef',
  'level_campaign07.rlef',
  'level_campaign08.rlef',
  'level_extra02.rlef',
  'level_campaign09.rlef',
  'level_campaign10.rlef',
  'level_campaign11.rlef',
  'level_campaign12.rlef',
  'level_extra03.rlef',
]

function levelIndexOf(file: string) {
  const index = LEVEL_FILES.indexOf(path.basename(file).toLowerCase())
  if (index < 0) {
    throw new Error(`Unknown level file ${path.basename(file)}`)
  }
  return index
}

function readInt(bytes: Uint8Array, offset: number) {
  return (
    (bytes[offset]! << 24) |
    (bytes[offset + 1]! << 16) |
    (bytes[offset + 2]! << 8) |
    bytes[offset + 3]!
  )
}

function readShort(bytes: Uint8Array, offset: number) {
  return (bytes[offset]! << 8) | bytes[offset + 1]!
}

function readSignedShort(bytes: Uint8Array, offset: number) {
  const value = readShort(bytes, offset)
  return value >= 0x8000 ? value - 0x10000 : value
}

function iMat(): Mat {
  return {
    m00: ONE,
    m01: 0,
    m10: 0,
    m11: ONE,
    tx: 0,
    ty: 0,
  }
}

function readMatrix(
  bytes: Uint8Array,
  offset: number
): {
  mat: Mat
  offset: number
} {
  const flags = bytes[offset]!
  let pos = offset + 1
  const mat = iMat()

  if ((flags & 7) === 7) {
    mat.m00 = readInt(bytes, pos)
    mat.m01 = readInt(bytes, pos + 4)
    mat.tx = readInt(bytes, pos + 8)
    mat.m10 = readInt(bytes, pos + 12)
    mat.m11 = readInt(bytes, pos + 16)
    mat.ty = readInt(bytes, pos + 20)
    pos += 24
  } else {
    if (flags & 1) {
      mat.tx = readSignedShort(bytes, pos) << 16
      mat.ty = readSignedShort(bytes, pos + 2) << 16
      pos += 4
    }
    if (flags & 2) {
      const angle = readInt(bytes, pos) / ONE
      const cos = Math.trunc(Math.cos(angle) * ONE)
      const sin = Math.trunc(Math.sin(angle) * ONE)
      mat.m00 = cos
      mat.m01 = -sin
      mat.m10 = sin
      mat.m11 = cos
      pos += 4
    }
    if (flags & 4) {
      mat.m00 = readInt(bytes, pos)
      mat.m11 = readInt(bytes, pos + 4)
      pos += 8
    }
  }
  return {
    mat,
    offset: pos,
  }
}

function unpackBits(
  bytes: Uint8Array,
  offset: number,
  count: number,
  base: number,
  bits: number,
  shift: number
): {
  values: number[]
  offset: number
} {
  let bitBuffer = 0
  let bufIdx = 0
  let pos = offset
  const sign = 1 << (bits - 1)
  const mask = (1 << bits) - 1
  const values: number[] = []
  while (values.length < count) {
    bitBuffer |= (bytes[pos]! & 255) << bufIdx
    pos += 1
    bufIdx += 8
    bitBuffer &= (1 << bufIdx) - 1
    while (bits <= bufIdx) {
      let field = bitBuffer & mask
      if (field & sign) {
        field |= ~mask
      }
      if (values.length < count) {
        values.push((field + base) << shift)
      }
      bufIdx -= bits
      bitBuffer >>>= bits
    }
  }
  return {
    values,
    offset: pos,
  }
}

function parseLevel(bytes: Uint8Array): LevelObject[] {
  const signature = readInt(bytes, 0)

  if (signature !== RLEF) {
    throw new Error('Not an RLEF file')
  }

  const declared = readSignedShort(bytes, 8)
  const objects: LevelObject[] = []
  let pos = 14

  while (pos < bytes.length) {
    const key = bytes[pos]!
    pos += 1
    if (key === KEY_END) {
      break
    }
    const size = readSignedShort(bytes, pos)
    pos += 2
    const payloadStart = pos
    const parent = readSignedShort(bytes, pos)
    const header = readMatrix(bytes, pos + 4)
    const flags = readInt(bytes, header.offset)
    let cursor = header.offset + 4
    const obj: LevelObject = {
      key,
      parent,
      mat: header.mat,
      flags,
      localX: [],
      localY: [],
      faces: [],
      color: 0,
      sprites: [],
      enemyType: 0,
      p1x: 0,
      p1y: 0,
      p2x: 0,
      p2y: 0,
      areaMinX: 0,
      areaMaxX: 0,
      areaMinY: 0,
      areaMaxY: 0,
      waterKind: 0,
    }
    if (key === KEY_GEOMETRY) {
      const vertexCount = readSignedShort(bytes, cursor) + 1
      const faceCount = readSignedShort(bytes, cursor + 2)
      obj.color = readInt(bytes, cursor + 4) >>> 0
      const bits = bytes[cursor + 8]!
      const xBase = readSignedShort(bytes, cursor + 9)
      const xs = unpackBits(
        bytes,
        cursor + 11,
        vertexCount - 1,
        xBase,
        bits,
        16
      )
      const yBase = readSignedShort(bytes, xs.offset)
      const ys = unpackBits(
        bytes,
        xs.offset + 2,
        vertexCount - 1,
        yBase,
        bits,
        16
      )
      const indexBits = bytes[ys.offset]!
      const faces = unpackBits(bytes, ys.offset + 1, faceCount, 0, indexBits, 0)
      obj.localX = [...xs.values, xs.values[0]!]
      obj.localY = [...ys.values, ys.values[0]!]
      obj.faces = faces.values
      cursor = faces.offset
    } else if (key === KEY_SPRITE) {
      const count = bytes[cursor]! & 255
      cursor += 1
      if (count > 0) {
        const bits = bytes[cursor]! & 255
        cursor += 1
        const baseX = readSignedShort(bytes, cursor)
        const baseY = readSignedShort(bytes, cursor + 2)
        cursor += 4
        let xs: number[]
        let ys: number[]
        if (bits > 0) {
          const unpackedX = unpackBits(bytes, cursor, count, baseX, bits, 0)
          const unpackedY = unpackBits(
            bytes,
            unpackedX.offset,
            count,
            baseY,
            bits,
            0
          )
          xs = unpackedX.values
          ys = unpackedY.values
          cursor = unpackedY.offset
        } else {
          xs = Array.from(
            {
              length: count,
            },
            () => baseX
          )
          ys = Array.from(
            {
              length: count,
            },
            () => baseY
          )
        }
        const ids = unpackBits(bytes, cursor, count, 0, 16, 0)
        for (let i = 0; i < count; i++) {
          obj.sprites.push({
            id: ids.values[i]!,
            x: xs[i]!,
            y: ys[i]!,
          })
        }
      }
    } else if (key === KEY_WATER) {
      obj.areaMinX = readSignedShort(bytes, cursor)
      obj.areaMaxY = readSignedShort(bytes, cursor + 2)
      obj.areaMaxX = readSignedShort(bytes, cursor + 4)
      obj.areaMinY = readSignedShort(bytes, cursor + 6)
      const red = bytes[cursor + 15]! & 255
      const green = bytes[cursor + 13]! & 255
      const blue = bytes[cursor + 14]! & 255
      if (red !== 0 || green !== 0 || blue !== 0) {
        obj.waterKind = red === 16 ? 2 : 1
      }
    } else if (key === KEY_ENEMY) {
      obj.p1x = readSignedShort(bytes, cursor)
      obj.p1y = readSignedShort(bytes, cursor + 2)
      obj.p2x = readSignedShort(bytes, cursor + 4)
      obj.p2y = readSignedShort(bytes, cursor + 6)
      obj.enemyType = bytes[cursor + 8]!
    }
    if (cursor > payloadStart + size) {
      throw new Error(`Record key ${key} overran its payload`)
    }
    objects.push(obj)
    pos = payloadStart + size
  }
  if (objects.length !== declared) {
    throw new Error(
      `Object count ${objects.length} does not match header ${declared}`
    )
  }

  const mesh = objects.find(obj => {
    return obj.key === KEY_GEOMETRY
  })

  if (!mesh) {
    throw new Error('Level has no terrain')
  }

  return objects
}

async function findGraphics(levelFile: string) {
  let dir = path.dirname(path.resolve(levelFile))

  for (let hop = 0; hop < 4; hop++) {
    const candidate = path.join(dir, 'Graphics')
    if (await isDirectory(candidate)) {
      return candidate
    }
    const parent = path.dirname(dir)
    if (parent === dir) {
      break
    }
    dir = parent
  }

  throw new Error(`No Graphics directory near ${levelFile}`)
}

type YNode = {
  key: string
  value: string
  children: YNode[]
}

function scalarText(node: Node | null) {
  if (!isScalar(node) || node.value == null) {
    return ''
  }
  return String(node.value)
}

function toChildren(node: Node | null): YNode[] {
  if (isMap(node)) {
    return node.items.map(pair => {
      const key = scalarText(pair.key as Node)
      const value = pair.value as Node | null
      if (value == null || isScalar(value)) {
        return {
          key,
          value: scalarText(value),
          children: [],
        }
      }
      return {
        key,
        value: '',
        children: toChildren(value),
      }
    })
  }
  if (isSeq(node)) {
    return node.items.map(item => {
      const value = item as Node | null
      if (value == null || isScalar(value)) {
        return {
          key: 'item',
          value: scalarText(value),
          children: [],
        }
      }
      return {
        key: 'item',
        value: '',
        children: toChildren(value),
      }
    })
  }
  return []
}

function parseRes(text: string): YNode {
  const doc = parseDocument(text, {
    schema: 'failsafe',
    uniqueKeys: false,
  })

  if (doc.errors.length > 0) {
    throw new Error(`Bad resource line: ${doc.errors[0]!.message}`)
  }

  return {
    key: 'root',
    value: '',
    children: toChildren(doc.contents),
  }
}

function child(node: YNode, key: string) {
  return node.children.find(entry => {
    return entry.key === key
  })
}

function num(node: YNode, key: string) {
  const found = child(node, key)
  if (!found) {
    throw new Error(`Missing ${key}`)
  }
  return Number(found.value)
}

function textOf(node: YNode, key: string) {
  const found = child(node, key)
  if (!found) {
    throw new Error(`Missing ${key}`)
  }
  return found.value
}

async function loadLibraries(graphics: string): Promise<{
  maps: Map<number, ImageMap>
  sprites: Map<number, SpriteDef>
}> {
  const maps = new Map<number, ImageMap>()
  const sprites = new Map<number, SpriteDef>()
  const names = (await fsp.readdir(graphics)).filter(name => {
    return name.endsWith('.res')
  })
  for (const name of names) {
    const root = parseRes(
      await fsp.readFile(path.join(graphics, name), {
        encoding: 'utf8',
      })
    )
    const mapList = child(root, 'ImageMaps')
    for (const item of mapList?.children ?? []) {
      if (!child(item, 'ID')) {
        continue
      }
      const id = num(item, 'ID')
      if (maps.has(id)) {
        throw new Error(`Duplicate image map ${id}`)
      }
      maps.set(id, {
        file: textOf(item, 'SrcImage'),
        x: num(item, 'MapX'),
        y: num(item, 'MapY'),
        w: num(item, 'Width'),
        h: num(item, 'Height'),
        ox: num(item, 'OriginX'),
        oy: num(item, 'OriginY'),
      })
    }
    const spriteList = child(root, 'Sprites')
    for (const item of spriteList?.children ?? []) {
      if (!child(item, 'ID')) {
        continue
      }
      const id = num(item, 'ID')
      const type = textOf(item, 'Type')
      if (sprites.has(id)) {
        throw new Error(`Duplicate sprite ${id}`)
      }
      if (type === 'Extended') {
        sprites.set(id, {
          kind: 'extended',
          file: textOf(item, 'SrcImage'),
          x: num(item, 'MapX'),
          y: num(item, 'MapY'),
          w: num(item, 'Width'),
          h: num(item, 'Height'),
          ox: num(item, 'OriginX'),
          oy: num(item, 'OriginY'),
        })
      } else if (type === 'Animated') {
        const frames = child(item, 'FrameImageIDs')
        if (!frames) {
          throw new Error(`Animated sprite ${id} has no frames`)
        }
        sprites.set(id, {
          kind: 'animated',
          frames: frames.children.map(frame => {
            return Number(frame.value)
          }),
        })
      } else if (type === 'Compound') {
        const parts = child(item, 'SubSprites')
        if (!parts) {
          throw new Error(`Compound sprite ${id} has no parts`)
        }
        sprites.set(id, {
          kind: 'compound',
          parts: parts.children.map(part => {
            return {
              id: num(part, 'Sprite'),
              x: num(part, 'DrawX'),
              y: num(part, 'DrawY'),
            }
          }),
        })
      } else {
        throw new Error(`Unknown sprite type ${type}`)
      }
    }
  }
  return {
    maps,
    sprites,
  }
}

function sar16(n: number) {
  return Math.floor(n / ONE)
}

function mulMat(a: Mat, b: Mat): Mat {
  return {
    m00: sar16(a.m00 * b.m00 + a.m01 * b.m10),
    m01: sar16(a.m00 * b.m01 + a.m01 * b.m11),
    m10: sar16(a.m10 * b.m00 + a.m11 * b.m10),
    m11: sar16(a.m10 * b.m01 + a.m11 * b.m11),
    tx: sar16(a.m00 * b.tx + a.m01 * b.ty) + a.tx,
    ty: sar16(a.m10 * b.tx + a.m11 * b.ty) + a.ty,
  }
}

function worldMatrices(objects: LevelObject[]): Mat[] {
  const worlds: Mat[] = []

  const visit = (index: number): Mat => {
    const cached = worlds[index]
    if (cached) {
      return cached
    }
    const obj = objects[index]
    if (!obj) {
      throw new Error(`Missing object ${index}`)
    }
    const world = obj.parent >= 0 ? mulMat(visit(obj.parent), obj.mat) : obj.mat
    worlds[index] = world
    return world
  }

  for (let i = 0; i < objects.length; i++) {
    visit(i)
  }

  return worlds
}

function actOf(index: number) {
  if (index <= 4) {
    return 0
  }
  if (index <= 9) {
    return 1
  }
  return 2
}

function applyMat(m: Mat, x: number, y: number): [number, number] {
  return [
    sar16(m.m00 * x + m.m01 * y) + m.tx,
    sar16(m.m10 * x + m.m11 * y) + m.ty,
  ]
}

function unit(lp: number) {
  return Math.round((lp / ONE) * 100) / 100
}

function byteHex(n: number) {
  return n.toString(16).padStart(2, '0')
}

function colorCss(argb: number) {
  const a = (argb >>> 24) & 255
  const r = (argb >>> 16) & 255
  const g = (argb >>> 8) & 255
  const b = argb & 255
  const rgb = `#${byteHex(r)}${byteHex(g)}${byteHex(b)}`
  return a === 255 ? rgb : `${rgb}${byteHex(a)}`
}

function cssHex(rgb: number) {
  return `#${(rgb & 0xffffff).toString(16).padStart(6, '0')}`
}

function atlasIndex(atlasOf: Map<string, number>, file: string) {
  const existing = atlasOf.get(file)
  if (typeof existing !== 'undefined') {
    return existing
  }
  const index = atlasOf.size
  atlasOf.set(file, index)
  return index
}

function blitOf(
  atlasOf: Map<string, number>,
  file: string,
  x: number,
  y: number,
  w: number,
  h: number,
  ox: number,
  oy: number,
  dx: number,
  dy: number
): Blit {
  return {
    i: atlasIndex(atlasOf, file),
    sx: x,
    sy: y,
    sw: w,
    sh: h,
    dx: dx - ox,
    dy: dy - oy,
  }
}

function staticBlits(
  id: number,
  dx: number,
  dy: number,
  maps: Map<number, ImageMap>,
  sprites: Map<number, SpriteDef>,
  atlasOf: Map<string, number>,
  seen: Set<number>
): Blit[] {
  const map = maps.get(id)
  if (map) {
    return [
      blitOf(
        atlasOf,
        map.file,
        map.x,
        map.y,
        map.w,
        map.h,
        map.ox,
        map.oy,
        dx,
        dy
      ),
    ]
  }
  const sprite = sprites.get(id)
  if (!sprite) {
    throw new Error(`Missing image ${id}`)
  }
  if (seen.has(id)) {
    throw new Error(`Sprite cycle at ${id}`)
  }
  seen.add(id)
  if (sprite.kind === 'extended') {
    return [
      blitOf(
        atlasOf,
        sprite.file,
        sprite.x,
        sprite.y,
        sprite.w,
        sprite.h,
        sprite.ox,
        sprite.oy,
        dx,
        dy
      ),
    ]
  }
  if (sprite.kind === 'compound') {
    const out: Blit[] = []
    for (const part of sprite.parts) {
      out.push(
        ...staticBlits(
          part.id,
          dx + part.x,
          dy + part.y,
          maps,
          sprites,
          atlasOf,
          seen
        )
      )
    }
    return out
  }
  const frame = sprite.frames[0]
  if (typeof frame === 'undefined') {
    return []
  }
  return staticBlits(frame, dx, dy, maps, sprites, atlasOf, seen)
}

function animFrames(
  id: number,
  maps: Map<number, ImageMap>,
  sprites: Map<number, SpriteDef>,
  atlasOf: Map<string, number>
): Blit[][] {
  const sprite = sprites.get(id)
  if (!sprite || sprite.kind !== 'animated') {
    return [staticBlits(id, 0, 0, maps, sprites, atlasOf, new Set())]
  }
  return sprite.frames.map(frame => {
    return staticBlits(frame, 0, 0, maps, sprites, atlasOf, new Set())
  })
}

function buildScene(
  objects: LevelObject[],
  worlds: Mat[],
  maps: Map<number, ImageMap>,
  sprites: Map<number, SpriteDef>,
  atlasOf: Map<string, number>,
  trampolineImage: number,
  cannonMeshes: LevelObject[]
): {
  items: SceneItem[]
  spawn: {
    x: number
    y: number
  }
  bounds: {
    minX: number
    minY: number
    maxX: number
    maxY: number
  }
} {
  const items: SceneItem[] = []
  let spawn = {
    x: 0,
    y: 0,
  }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  const grow = (x: number, y: number) => {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }

  for (let index = 0; index < objects.length; index++) {
    const obj = objects[index]!

    if (obj.flags & 0x80) {
      continue
    }

    const world = worlds[index]!
    const z = (obj.flags & 0x1f) - 16

    const anchor = (x: number, y: number): [number, number] => {
      const [wx, wy] = applyMat(world, x << 16, y << 16)
      return [unit(wx), unit(wy)]
    }

    if (obj.key === KEY_GEOMETRY) {
      const verts: number[] = []
      for (let v = 0; v < obj.localX.length; v++) {
        const [wx, wy] = applyMat(world, obj.localX[v]!, obj.localY[v]!)
        const x = unit(wx)
        const y = unit(wy)
        verts.push(x, y)
        grow(x, y)
      }
      items.push({
        k: 'm',
        z,
        c: colorCss(obj.color),
        v: verts,
        f: obj.faces,
      })
    } else if (obj.key === KEY_SPRITE) {
      for (const sprite of obj.sprites) {
        const [x, y] = anchor(sprite.x, sprite.y)
        grow(x, y)
        items.push({
          k: 's',
          z,
          x,
          y,
          b: staticBlits(sprite.id, 0, 0, maps, sprites, atlasOf, new Set()),
        })
      }
    } else if (obj.key === KEY_EGG) {
      const [x, y] = anchor(0, 0)
      grow(x, y)
      items.push({
        k: 's',
        z,
        x,
        y,
        b: staticBlits(EGG_IMAGE, 0, 0, maps, sprites, atlasOf, new Set()),
      })
    } else if (obj.key === KEY_TRAMPOLINE) {
      const [x, y] = anchor(0, 0)
      grow(x, y)
      items.push({
        k: 's',
        z,
        x,
        y,
        b: staticBlits(
          trampolineImage,
          0,
          0,
          maps,
          sprites,
          atlasOf,
          new Set()
        ),
      })
    } else if (obj.key === KEY_WATER && obj.waterKind !== 0) {
      const [x0, y0] = anchor(obj.areaMinX, obj.areaMinY)
      const [x1, y1] = anchor(obj.areaMaxX, obj.areaMaxY)
      grow(x0, y0)
      grow(x1, y1)
      items.push({
        k: 'w',
        z,
        x0,
        y0,
        x1,
        y1,
        surface: obj.waterKind === 1,
        c: colorCss(0x441111ee),
      })
    } else if (obj.key === KEY_CANNON) {
      if (cannonMeshes.length < 12) {
        throw new Error('Cannon model is missing its rest pose')
      }
      for (const mesh of cannonMeshes.slice(9, 12)) {
        const verts: number[] = []
        for (let v = 0; v < mesh.localX.length; v++) {
          const [wx, wy] = applyMat(world, mesh.localX[v]!, mesh.localY[v]!)
          const vx = unit(wx)
          const vy = unit(wy)
          verts.push(vx, vy)
          grow(vx, vy)
        }
        items.push({
          k: 'm',
          z,
          c: colorCss(mesh.color),
          v: verts,
          f: mesh.faces,
        })
      }
      const [x, y] = anchor(0, 0)
      grow(x, y)
      items.push({
        k: 's',
        z,
        x,
        y,
        b: staticBlits(CANNON_SPRITE, 0, 0, maps, sprites, atlasOf, new Set()),
      })
    } else if (obj.key === KEY_ENEMY && obj.enemyType === 0) {
      const [x, y] = anchor(0, 0)
      grow(x, y)
      items.push({
        k: 'a',
        z,
        x,
        y,
        ms: CANDLE_FRAME_MS,
        fr: animFrames(CANDLE_IMAGE, maps, sprites, atlasOf),
      })
    } else if (obj.key === KEY_ENEMY && obj.enemyType === 2) {
      const [x, y] = anchor(0, 0)
      const parentWorld = obj.parent >= 0 ? worlds[obj.parent] : void 0

      const endpoint = (dx: number, dy: number): [number, number] => {
        const local: Mat = {
          ...obj.mat,
          tx: obj.mat.tx + (dx << 16),
          ty: obj.mat.ty + (dy << 16),
        }
        const placed = parentWorld ? mulMat(parentWorld, local) : local
        return [unit(placed.tx), unit(placed.ty)]
      }

      const [ax, ay] = endpoint(obj.p1x, obj.p1y)
      const [bx, by] = endpoint(obj.p2x, obj.p2y)
      grow(x, y)
      grow(ax, ay)
      grow(bx, by)
      items.push({
        k: 'e',
        z,
        x,
        y,
        faceLeft: obj.p1x < obj.p2x,
        ax,
        ay,
        bx,
        by,
        bodyL: staticBlits(189, 0, 0, maps, sprites, atlasOf, new Set()),
        bodyR: staticBlits(194, 0, 0, maps, sprites, atlasOf, new Set()),
        hole: animFrames(504, maps, sprites, atlasOf),
      })
    } else if (obj.key === KEY_PLAYER) {
      const [x, y] = anchor(0, 0)
      spawn = {
        x,
        y,
      }
      grow(x - 20, y - 20)
      grow(x + 20, y + 20)
      items.push({
        k: 'b',
        z,
        x,
        y,
        under: staticBlits(EYE_UNDER, 0, 0, maps, sprites, atlasOf, new Set()),
        over: staticBlits(EYE_OVER, 0, 0, maps, sprites, atlasOf, new Set()),
        blink: animFrames(BLINK_IMAGE, maps, sprites, atlasOf),
      })
    }
  }
  items.sort((a, b) => b.z - a.z)
  return {
    items,
    spawn,
    bounds: {
      minX,
      minY,
      maxX,
      maxY,
    },
  }
}

function parallaxLayer(
  imageIds: number[],
  speedNum: number,
  spacing: number,
  xRange: number,
  y: number,
  yRange: number,
  countMul: number,
  stripe: string | null,
  maps: Map<number, ImageMap>,
  sprites: Map<number, SpriteDef>,
  atlasOf: Map<string, number>
): ParallaxLayer {
  return {
    speedNum,
    speedDenom: 100,
    spacing,
    xRange,
    y,
    yRange,
    countMul,
    stripe,
    images: imageIds.map(imageId => {
      return staticBlits(imageId, 0, 0, maps, sprites, atlasOf, new Set())
    }),
  }
}

function imageWidth(
  id: number,
  maps: Map<number, ImageMap>,
  sprites: Map<number, SpriteDef>
) {
  const map = maps.get(id)
  if (map) {
    return map.w
  }
  const sprite = sprites.get(id)
  if (sprite && sprite.kind === 'extended') {
    return sprite.w
  }
  throw new Error(`No width for image ${id}`)
}

function parallaxOf(
  index: number,
  maps: Map<number, ImageMap>,
  sprites: Map<number, SpriteDef>,
  atlasOf: Map<string, number>
) {
  const act = actOf(index)

  const paint = (
    imageIds: number[],
    speedNum: number,
    spacing: number,
    xRange: number,
    y: number,
    yRange: number,
    countMul: number,
    stripe: string | null
  ) => {
    return parallaxLayer(
      imageIds,
      speedNum,
      spacing,
      xRange,
      y,
      yRange,
      countMul,
      stripe,
      maps,
      sprites,
      atlasOf
    )
  }
  if (act === 2) {
    return [
      paint([353], 5, 600, 100, -80, 50, 2, null),
      paint(
        [114],
        20,
        imageWidth(114, maps, sprites),
        0,
        -50,
        0,
        3,
        cssHex(0x15113c)
      ),
      paint(
        [113],
        50,
        imageWidth(113, maps, sprites),
        0,
        -30,
        0,
        3,
        cssHex(0x02021a)
      ),
    ]
  }
  if (act === 1) {
    return [
      paint([159, 160], 20, 200, 140, -200, 200, 5, null),
      paint([161], 50, 100, 70, -70, 300, 5, null),
      paint([373], 80, 150, 100, -70, 300, 5, null),
    ]
  }
  return [
    paint([252], 20, 200, 140, -200, 200, 5, null),
    paint([251], 50, 100, 70, -70, 300, 5, null),
    paint([388], 80, 150, 100, -70, 300, 5, null),
  ]
}

function toBase64(bytes: Uint8Array) {
  let binary = ''
  const step = 0x8000
  for (let offset = 0; offset < bytes.length; offset += step) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + step))
  }
  return btoa(binary)
}

async function getAtlases(graphics: string, atlasOf: Map<string, number>) {
  const files = [...atlasOf.keys()]

  const atlases: string[] = []

  for (const file of files) {
    const png = new Uint8Array(await fsp.readFile(path.join(graphics, file)))
    atlases.push(`data:image/png;base64,${toBase64(png)}`)
  }

  return atlases
}

function skyOf(index: number) {
  if (index === 4 || index === 9 || index === 14) {
    return {
      top: cssHex(0xb400bd),
      bottom: cssHex(0xfd8c13),
    }
  }
  const colors = [
    [5413606, 7460351],
    [7263689, 10485759],
    [7737588, 131610],
  ]
  const pair = colors[actOf(index)]!
  return {
    top: cssHex(pair[0]!),
    bottom: cssHex(pair[1]!),
  }
}

export async function levelToObject(inputFile: string) {
  const index = levelIndexOf(inputFile)
  const levelBytes = new Uint8Array(await fsp.readFile(inputFile))

  const objects = parseLevel(levelBytes)

  const graphics = await findGraphics(inputFile)

  const { maps, sprites } = await loadLibraries(graphics)

  const worlds = worldMatrices(objects)

  const atlasOf = new Map<string, number>()

  let cannonMeshes: LevelObject[] = []

  if (
    objects.some(obj => {
      return obj.key === KEY_CANNON && (obj.flags & 0x80) === 0
    })
  ) {
    const cannonPath = path.join(
      path.dirname(graphics),
      'Levels',
      'level_obj01_cannon.rlef'
    )
    cannonMeshes = parseLevel(
      new Uint8Array(await fsp.readFile(cannonPath))
    ).filter(obj => {
      return obj.key === KEY_GEOMETRY
    })
  }

  const scene = buildScene(
    objects,
    worlds,
    maps,
    sprites,
    atlasOf,
    TRAMPOLINE_IMAGES[actOf(index)]!,
    cannonMeshes
  )

  const parallax = parallaxOf(index, maps, sprites, atlasOf)

  const atlases = await getAtlases(graphics, atlasOf)

  const level: Level = {
    sky: skyOf(index),
    seed: index + 1,
    spawn: scene.spawn,
    bounds: scene.bounds,
    items: scene.items,
    atlases,
    parallax,
  }

  return level
}

export async function levelJson(options: LevelJson) {
  if (await exists(options.output)) {
    if (!options.force) {
      if (!options.silent) {
        console.error(
          `Output ${options.output} already exists, use --force to override`
        )
      }
      die()
    }

    await fsp.rm(options.output, {
      force: true,
    })
  }

  const level = await levelToObject(options.input)

  await fsp.writeFile(options.output, JSON.stringify(level), {
    encoding: 'utf8',
  })
}
