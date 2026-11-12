export const RLEF = 0x524c4546
export const KEY_END = 127
export const ONE = 65536
export const KEY_GEOMETRY = 4
export const KEY_SPRITE = 9
export const KEY_WATER = 10
export const KEY_CANNON = 11
export const KEY_ENEMY = 15
export const KEY_EGG = 13
export const EGG_IMAGE = 208
export const KEY_TRAMPOLINE = 12
export const TRAMPOLINE_IMAGES = [497, 509, 490]
export const CANNON_SPRITE = 48
export const CANDLE_FRAME_MS = 50
export const CANDLE_IMAGE = 467
export const KEY_PLAYER = 8
export const EYE_UNDER = 17
export const EYE_OVER = 28
export const BLINK_IMAGE = 462

export type Mat = {
  m00: number
  m01: number
  m10: number
  m11: number
  tx: number
  ty: number
}

export type LevelObject = {
  key: number
  parent: number
  mat: Mat
  flags: number
  localX: number[]
  localY: number[]
  faces: number[]
  color: number
  sprites: {
    id: number
    x: number
    y: number
  }[]
  enemyType: number
  p1x: number
  p1y: number
  p2x: number
  p2y: number
  areaMinX: number
  areaMaxX: number
  areaMinY: number
  areaMaxY: number
  waterKind: number
}

export type ImageMap = {
  file: string
  x: number
  y: number
  w: number
  h: number
  ox: number
  oy: number
}

export type SpriteDef =
  | {
      kind: 'extended'
      file: string
      x: number
      y: number
      w: number
      h: number
      ox: number
      oy: number
    }
  | {
      kind: 'animated'
      frames: number[]
    }
  | {
      kind: 'compound'
      parts: {
        id: number
        x: number
        y: number
      }[]
    }

export type Blit = {
  i: number
  sx: number
  sy: number
  sw: number
  sh: number
  dx: number
  dy: number
}

export type SceneItem =
  | {
      k: 'm'
      z: number
      c: string
      v: number[]
      f: number[]
    }
  | {
      k: 's'
      z: number
      x: number
      y: number
      b: Blit[]
    }
  | {
      k: 'a'
      z: number
      x: number
      y: number
      ms: number
      fr: Blit[][]
    }
  | {
      k: 'b'
      z: number
      x: number
      y: number
      under: Blit[]
      over: Blit[]
      blink: Blit[][]
    }
  | {
      k: 'e'
      z: number
      x: number
      y: number
      faceLeft: boolean
      ax: number
      ay: number
      bx: number
      by: number
      bodyL: Blit[]
      bodyR: Blit[]
      hole: Blit[][]
    }
  | {
      k: 'w'
      z: number
      x0: number
      y0: number
      x1: number
      y1: number
      surface: boolean
      c: string
    }

export type ParallaxLayer = {
  speedNum: number
  speedDenom: number
  spacing: number
  xRange: number
  y: number
  yRange: number
  countMul: number
  stripe: string | null
  images: Blit[][]
}

export type Item = SceneItem & {
  runtime?: {
    state: number
    propel: number
    wait: number
    period: number
    peek: number
    leg: number
    px: number
    py: number
  }
}

export type Level = {
  sky: {
    top: string
    bottom: string
  }
  seed: number
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
  items: Item[]
  atlases: string[]
  parallax: ParallaxLayer[]
}
