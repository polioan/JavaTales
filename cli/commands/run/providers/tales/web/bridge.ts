import { isRecord } from '../../../../../utils'

export type ReadableBytes = {
  readonly length?: number
  getLength?: () => number
  get?: (index: number) => number
  readonly [index: number]: number | undefined
}

export type Bridge = {
  main: () => void
  jtHash: (bytes: Uint8Array) => string
  resources: Record<string, string>
  key: (code: number, down: boolean) => void
  stopMidi: (id: number) => void
  closeMidi: (id: number) => void
  midiVolume: (id: number, level: number) => void
  midiLoop: (id: number, loops: number) => void
  playMidi: (
    id: number,
    bytes: ReadableBytes,
    loops: number,
    level: number
  ) => void
  images: Record<string, HTMLCanvasElement>
  raw: Record<string, Uint8Array>
  imagesByPath: Record<string, HTMLCanvasElement>
  readSave: (name: string) => string | null
  writeSave: (name: string, value?: string | null) => void
}

export type IndexableObj = Record<string, any>

function getBrowserGlobal() {
  return window as IndexableObj
}

export class CurrentBridge implements Bridge {
  private constructor() {}

  #jtHash(bytes: Uint8Array) {
    let hash = 0x811c9dc5
    for (const byte of bytes) {
      hash ^= byte & 255
      hash = Math.imul(hash, 0x01000193)
    }
    return `${(hash >>> 0).toString(16)}:${bytes.length}`
  }

  private readonly globalKey = 'javatales'

  private getGlobal() {
    const browserGlobal = getBrowserGlobal()

    const global = browserGlobal[this.globalKey]

    if (isRecord(global)) {
      return global as IndexableObj
    }

    browserGlobal[this.globalKey] = {}

    return browserGlobal[this.globalKey] as IndexableObj
  }

  private set<T extends keyof Bridge>(key: T & string, value: Bridge[T]) {
    const global = this.getGlobal()
    global[key] = value
  }

  private get<T extends keyof Bridge>(key: T & string): Bridge[T] {
    const global = this.getGlobal()
    return global[key]
  }

  public set main(toSet: Bridge['main']) {
    this.set('main', toSet)
  }

  private javaMain(): Bridge['main'] | null {
    // @ts-expect-error global exists check
    if (typeof main === 'function' || typeof main === 'object') {
      // @ts-expect-error
      if (main != null && !Array.isArray(main)) {
        // @ts-expect-error
        return main
      }
    }

    const browserGlobal = getBrowserGlobal()

    const browserGlobalMain = browserGlobal.main

    if (
      typeof browserGlobalMain === 'function' ||
      typeof browserGlobalMain === 'object'
    ) {
      if (browserGlobalMain != null && !Array.isArray(browserGlobalMain)) {
        return browserGlobalMain
      }
    }

    return null
  }

  public get main() {
    return this.get('main') ?? this.javaMain()
  }

  public set jtHash(toSet: Bridge['jtHash']) {
    this.set('jtHash', toSet)
  }

  public get jtHash() {
    return this.get('jtHash') ?? this.#jtHash
  }

  public set resources(toSet: Bridge['resources']) {
    this.set('resources', toSet)
  }

  private getResources() {
    if (
      // @ts-expect-error global exists check
      typeof javatalesResources === 'function' ||
      // @ts-expect-error global exists check
      typeof javatalesResources === 'object'
    ) {
      // @ts-expect-error
      if (javatalesResources != null && !Array.isArray(javatalesResources)) {
        // @ts-expect-error
        return javatalesResources
      }
    }

    const browserGlobal = getBrowserGlobal()

    const browserGlobalResources = browserGlobal.javatalesResources

    if (
      typeof browserGlobalResources === 'function' ||
      typeof browserGlobalResources === 'object'
    ) {
      if (
        browserGlobalResources != null &&
        !Array.isArray(browserGlobalResources)
      ) {
        return browserGlobalResources
      }
    }

    return null
  }

  public get resources() {
    return this.get('resources') ?? this.getResources() ?? {}
  }

  public set key(toSet: Bridge['key']) {
    this.set('key', toSet)
  }

  public get key() {
    return this.get('key')
  }

  public set stopMidi(toSet: Bridge['stopMidi']) {
    this.set('stopMidi', toSet)
  }

  public get stopMidi() {
    return this.get('stopMidi') ?? (() => {})
  }

  public set closeMidi(toSet: Bridge['closeMidi']) {
    this.set('closeMidi', toSet)
  }

  public get closeMidi() {
    return this.get('closeMidi') ?? (() => {})
  }

  public set midiVolume(toSet: Bridge['midiVolume']) {
    this.set('midiVolume', toSet)
  }

  public get midiVolume() {
    return this.get('midiVolume') ?? (() => {})
  }

  public set midiLoop(toSet: Bridge['midiLoop']) {
    this.set('midiLoop', toSet)
  }

  public get midiLoop() {
    return this.get('midiLoop') ?? (() => {})
  }

  public set playMidi(toSet: Bridge['playMidi']) {
    this.set('playMidi', toSet)
  }

  public get playMidi() {
    return this.get('playMidi') ?? (() => {})
  }

  public set images(toSet: Bridge['images']) {
    this.set('images', toSet)
  }

  public get images() {
    const current = this.get('images')

    if (current) {
      return current
    }

    this.set('images', {})

    return this.get('images')
  }

  public set raw(toSet: Bridge['raw']) {
    this.set('raw', toSet)
  }

  public get raw() {
    const current = this.get('raw')

    if (current) {
      return current
    }

    this.set('raw', {})

    return this.get('raw')
  }

  public set imagesByPath(toSet: Bridge['imagesByPath']) {
    this.set('imagesByPath', toSet)
  }

  public get imagesByPath() {
    const current = this.get('imagesByPath')

    if (current) {
      return current
    }

    this.set('imagesByPath', {})

    return this.get('imagesByPath')
  }

  private javatalesMem: Record<string, string | null | undefined> | null = null

  public readSave(name: string) {
    try {
      return localStorage.getItem('javatales.rms.' + name)
    } catch {
      if (!this.javatalesMem) {
        this.javatalesMem = {}
      }
      const value = this.javatalesMem[name]
      return value || null
    }
  }

  public writeSave(name: string, value?: string | null) {
    if (!value) {
      return
    }
    if (!this.javatalesMem) {
      this.javatalesMem = {}
    }
    this.javatalesMem[name] = value
    try {
      localStorage.setItem('javatales.rms.' + name, value)
    } catch {}
  }

  public static register(): Bridge {
    const browserGlobal = getBrowserGlobal()
    const current = browserGlobal.bridge
    if (isRecord(current)) {
      // @ts-expect-error
      return current
    }
    const bridge: Bridge = new CurrentBridge()
    browserGlobal.bridge = bridge
    return browserGlobal.bridge
  }
}
