import { Sequencer, WorkletSynthesizer } from 'spessasynth_lib'
import { qs } from '../../../../../utils'
import { CurrentBridge, type ReadableBytes } from './bridge'

type Engine = {
  context: AudioContext
  master: GainNode
}

type Slot = {
  generation: number
  loops: number
  level: number
}

type MidiVoice = {
  synth: WorkletSynthesizer
  seq: Sequencer
  gain: GainNode
  owner: number | null
  songKey: string | null
  playing: boolean
}

type Wave = {
  buffer: AudioBuffer
  gain: GainNode
  context: AudioContext
  source: AudioBufferSourceNode | null
  offset: number
  startedAt: number
  loopsLeft: number
  infinite: boolean
  key: string
  pausing: boolean
}

const bridge = CurrentBridge.register()

const KEY_CODES: Record<string, number> = {
  KeyW: -1,
  ArrowUp: -1,
  KeyS: -2,
  ArrowDown: -2,
  KeyA: -3,
  ArrowLeft: -3,
  KeyD: -4,
  ArrowRight: -4,
  Enter: -5,
  NumpadEnter: -5,
  Space: -5,
  KeyQ: -6,
  F1: -6,
  KeyE: -7,
  F2: -7,
  Backspace: -7,
  Digit0: 48,
  Numpad0: 48,
  Digit1: 49,
  Numpad7: 49,
  Digit2: 50,
  Numpad8: 50,
  Digit3: 51,
  Numpad9: 51,
  Digit4: 52,
  Numpad4: 52,
  Digit5: 53,
  Numpad5: 53,
  Digit6: 54,
  Numpad6: 54,
  Digit7: 55,
  Numpad1: 55,
  Digit8: 56,
  Numpad2: 56,
  Digit9: 57,
  Numpad3: 57,
  Minus: 42,
  NumpadMultiply: 42,
  Equal: 35,
  NumpadSubtract: 35,
}

function decodeBase64(text: string) {
  const binary = atob(text)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

function isImage(bytes: Uint8Array) {
  const png =
    bytes.length > 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47

  const jpeg = bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8

  return png || jpeg
}

function bindKeys() {
  const canvas = qs<HTMLCanvasElement>('#screen')

  const held: Record<string, number> = {}

  canvas.focus()

  const press = (name: string, code: number, down: boolean) => {
    const previous = held[name]

    if (down) {
      if (previous != null) {
        return
      }
      held[name] = code
    } else {
      if (previous == null) {
        return
      }
      code = previous
      delete held[name]
    }
    bridge.key(code, down)
  }

  window.addEventListener('keydown', event => {
    const code = KEY_CODES[event.code] ?? null
    if (code == null) {
      return
    }
    event.preventDefault()
    press(event.code, code, true)
  })

  window.addEventListener('keyup', event => {
    if (held[event.code] == null) {
      return
    }
    event.preventDefault()
    press(event.code, 0, false)
  })

  window.addEventListener('blur', () => {
    for (const name of Object.keys(held)) {
      const code = held[name]
      if (code == null) {
        continue
      }
      bridge.key(code, false)
      delete held[name]
    }
  })

  canvas.addEventListener('pointerdown', () => {
    canvas.focus()
  })
}

const slots = new Map<number, Slot>()
const voices: MidiVoice[] = []
const waves = new Map<number, Wave>()
let queue: Promise<void> = Promise.resolve()
let enginePromise: Promise<Engine> | null = null
let bankPromise: Promise<ArrayBuffer> | null = null
let songListener = 0

function slot(id: number) {
  const current = slots.get(id)
  if (current) {
    return current
  }
  const created: Slot = {
    generation: 0,
    loops: 1,
    level: 100,
  }
  slots.set(id, created)
  return created
}

function clampLevel(level: number) {
  if (level < 0) {
    return 0
  }
  if (level > 100) {
    return 100
  }
  return level
}

function loopCount(loops: number) {
  if (loops < 0) {
    return Number.POSITIVE_INFINITY
  }
  return Math.max(0, loops - 1)
}

function songKey(bytes: Uint8Array) {
  let hash = 0x811c9dc5
  for (const byte of bytes) {
    hash ^= byte
    hash = Math.imul(hash, 0x01000193)
  }
  return `${hash >>> 0}:${bytes.length}`
}

function isMidi(bytes: Uint8Array) {
  return (
    bytes.length > 14 &&
    bytes[0] === 0x4d &&
    bytes[1] === 0x54 &&
    bytes[2] === 0x68 &&
    bytes[3] === 0x64
  )
}

function isWave(bytes: Uint8Array) {
  return (
    bytes.length > 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x41 &&
    bytes[10] === 0x56 &&
    bytes[11] === 0x45
  )
}

function midiArray(bytes: ReadableBytes) {
  const length = bytes.length ?? bytes.getLength?.() ?? 0
  const copy = new Uint8Array(length)
  for (let index = 0; index < length; index += 1) {
    const value = bytes.get ? bytes.get(index) : bytes[index]
    copy[index] = (value ?? 0) & 255
  }
  return copy
}

function enqueue<T>(job: () => Promise<T>) {
  const run = queue.then(job, job)
  queue = run.then(
    () => void 0,
    () => void 0
  )
  return run
}

function bankFile() {
  if (!bankPromise) {
    bankPromise = fetch('/soundbank.sf2')
      .then(response => {
        if (!response.ok) {
          throw new Error('General MIDI soundbank failed to load')
        }
        return response.arrayBuffer()
      })
      .catch(error => {
        bankPromise = null
        throw error
      })
  }
  return bankPromise
}

function getSpessasynthWorklet() {
  // @ts-expect-error
  return __SPESSASYNTH_WORKLET__
}

function engine() {
  if (!enginePromise) {
    enginePromise = (async () => {
      const context = new AudioContext()
      const master = context.createGain()
      master.gain.value = 0.9
      master.connect(context.destination)
      const url = URL.createObjectURL(
        new Blob([getSpessasynthWorklet()], {
          type: 'text/javascript',
        })
      )
      try {
        await context.audioWorklet.addModule(url)
      } finally {
        URL.revokeObjectURL(url)
      }
      return {
        context,
        master,
      }
    })().catch(error => {
      enginePromise = null
      throw error
    })
  }
  return enginePromise
}

function resumeAudio() {
  void engine()
    .then(audio => {
      if (audio.context.state === 'suspended') {
        return audio.context.resume()
      }
      return void 0
    })
    .catch(() => void 0)
}

window.addEventListener('pointerdown', resumeAudio)
window.addEventListener('keydown', resumeAudio)

void bankFile().catch(error => {
  console.warn(error)
})

void engine().catch(error => {
  console.warn(error)
})

function songReady(seq: Sequencer) {
  songListener += 1
  const id = `song-${songListener}`
  return new Promise<void>((resolve, reject) => {
    let settled = false
    const finish = (error?: Error) => {
      if (settled) {
        return
      }
      settled = true
      seq.eventHandler.removeEvent('songChange', id)
      seq.eventHandler.removeEvent('midiError', id)
      if (error) {
        reject(error)
        return
      }
      resolve()
    }
    seq.eventHandler.addEvent('songChange', id, () => {
      finish()
    })
    seq.eventHandler.addEvent('midiError', id, error => {
      finish(error instanceof Error ? error : new Error('MIDI failed to load'))
    })
  })
}

async function createVoice(audio: Engine) {
  const bank = await bankFile()
  const synth = new WorkletSynthesizer(audio.context)
  const gain = audio.context.createGain()
  gain.gain.value = 1
  synth.connect(gain)
  gain.connect(audio.master)
  try {
    await synth.soundBankManager.addSoundBank(bank.slice(0), 'gm')
    await synth.isReady
  } catch (error) {
    synth.destroy()
    gain.disconnect()
    throw error
  }
  const seq = new Sequencer(synth, {
    skipToFirstNoteOn: false,
  })
  const voice: MidiVoice = {
    synth,
    seq,
    gain,
    owner: null,
    songKey: null,
    playing: false,
  }
  voices.push(voice)
  return voice
}

function ended(voice: MidiVoice) {
  if (voice.seq.isFinished) {
    return true
  }
  const duration = voice.seq.duration
  return duration > 0 && voice.seq.currentTime >= duration - 0.05
}

function releaseMidi(id: number) {
  const voice = voices.find(item => {
    return item.owner === id
  })
  if (!voice) {
    return
  }
  voice.seq.pause()
  voice.playing = false
  voice.owner = null
  voice.songKey = null
}

async function acquire(id: number, live: () => boolean, level: number) {
  return enqueue(async () => {
    if (!live()) {
      return null
    }
    const owned = voices.find(item => {
      return item.owner === id
    })
    if (owned) {
      owned.gain.gain.value = level / 100
      return owned
    }
    const audio = await engine()
    if (!live()) {
      return null
    }
    let voice = voices.find(item => {
      return item.owner == null
    })
    if (!voice) {
      voice = await createVoice(audio)
      if (!live()) {
        return null
      }
    }
    voice.owner = id
    voice.gain.gain.value = level / 100
    return voice
  })
}

async function playGeneralMidi(
  id: number,
  bytes: Uint8Array,
  live: () => boolean
) {
  const current = slot(id)
  const audio = await engine()
  if (!live()) {
    return
  }
  await audio.context.resume()
  releaseWave(id, true)
  const voice = await acquire(id, live, current.level)
  if (!voice || !live()) {
    return
  }
  const key = songKey(bytes)
  let restart = voice.songKey !== key
  if (restart) {
    const ready = songReady(voice.seq)
    voice.seq.loadNewSongList([
      {
        binary: bytes.slice().buffer,
      },
    ])
    await ready
    if (!live()) {
      return
    }
    voice.songKey = key
    voice.seq.currentTime = 0
  } else if (ended(voice)) {
    voice.seq.currentTime = 0
    restart = true
  } else if (voice.playing && !voice.seq.paused) {
    return
  }
  if (!live()) {
    return
  }
  if (restart) {
    voice.seq.loopCount = loopCount(current.loops)
  }
  voice.gain.gain.value = current.level / 100
  voice.seq.play()
  voice.playing = true
}

function pauseWave(wave: Wave) {
  const source = wave.source
  if (!source) {
    return
  }
  const elapsed = wave.context.currentTime - wave.startedAt
  wave.offset = Math.min(
    wave.buffer.duration,
    wave.offset + Math.max(0, elapsed)
  )
  wave.pausing = true
  wave.source = null
  source.stop()
}

function releaseWave(id: number, drop: boolean) {
  const wave = waves.get(id)
  if (!wave) {
    return
  }
  pauseWave(wave)
  if (!drop) {
    return
  }
  wave.gain.disconnect()
  waves.delete(id)
}

function startWave(wave: Wave, live: () => boolean) {
  const source = wave.context.createBufferSource()
  source.buffer = wave.buffer
  source.connect(wave.gain)
  wave.source = source
  wave.pausing = false
  wave.startedAt = wave.context.currentTime
  source.onended = () => {
    if (wave.pausing || wave.source !== source) {
      return
    }
    wave.source = null
    wave.offset = 0
    if (!live() || wave.infinite) {
      return
    }
    wave.loopsLeft -= 1
    if (wave.loopsLeft > 0) {
      startWave(wave, live)
    }
  }
  if (wave.infinite) {
    source.loop = true
  }
  const offset = Math.min(wave.offset, Math.max(0, wave.buffer.duration - 0.01))
  source.start(0, offset)
}

async function playWave(id: number, bytes: Uint8Array, live: () => boolean) {
  const current = slot(id)
  const audio = await engine()
  if (!live()) {
    return
  }
  await audio.context.resume()
  if (!live()) {
    return
  }
  releaseMidi(id)
  const key = songKey(bytes)
  let wave = waves.get(id)
  if (!wave || wave.key !== key) {
    const buffer = await audio.context.decodeAudioData(bytes.slice().buffer)
    if (!live()) {
      return
    }
    if (wave) {
      pauseWave(wave)
      wave.gain.disconnect()
    }
    const gain = audio.context.createGain()
    gain.connect(audio.master)
    wave = {
      buffer,
      gain,
      context: audio.context,
      source: null,
      offset: 0,
      startedAt: 0,
      loopsLeft: 0,
      infinite: false,
      key,
      pausing: false,
    }
    waves.set(id, wave)
  } else if (wave.source) {
    return
  } else if (wave.offset >= wave.buffer.duration - 0.02) {
    wave.offset = 0
  }
  wave.gain.gain.value = current.level / 100
  wave.infinite = current.loops < 0
  wave.loopsLeft = current.loops < 0 ? 0 : current.loops
  startWave(wave, live)
}

async function dispatch(id: number, bytes: Uint8Array, generation: number) {
  const live = () => {
    const current = slots.get(id)
    return current != null && current.generation === generation
  }
  try {
    if (isMidi(bytes)) {
      await playGeneralMidi(id, bytes, live)
      return
    }
    if (isWave(bytes)) {
      await playWave(id, bytes, live)
      return
    }
    try {
      await playWave(id, bytes, live)
    } catch {
      if (!live()) {
        return
      }
      await playGeneralMidi(id, bytes, live)
    }
  } catch (error) {
    if (live()) {
      console.warn(error)
    }
  }
}

bridge.stopMidi = id => {
  const current = slots.get(id)
  if (current) {
    current.generation += 1
  }
  const voice = voices.find(item => {
    return item.owner === id
  })
  if (voice) {
    voice.seq.pause()
    voice.playing = false
  }
  releaseWave(id, false)
}

bridge.closeMidi = id => {
  const current = slots.get(id)
  if (current) {
    current.generation += 1
  }
  releaseMidi(id)
  releaseWave(id, true)
  slots.delete(id)
}

bridge.midiVolume = (id, level) => {
  const current = slot(id)
  current.level = clampLevel(level)
  const voice = voices.find(item => {
    return item.owner === id
  })
  if (voice) {
    voice.gain.gain.value = current.level / 100
  }
  const wave = waves.get(id)
  if (wave) {
    wave.gain.gain.value = current.level / 100
  }
}

bridge.midiLoop = (id, loops) => {
  const current = slot(id)
  current.loops = loops
  const voice = voices.find(item => {
    return item.owner === id
  })
  if (voice) {
    voice.seq.loopCount = loopCount(loops)
  }
  const wave = waves.get(id)
  if (!wave) {
    return
  }
  wave.infinite = loops < 0
  if (wave.source) {
    wave.source.loop = loops < 0
  }
  if (loops < 0) {
    wave.loopsLeft = 0
    return
  }
  wave.loopsLeft = loops
}

bridge.playMidi = (id, bytes, loops, level) => {
  const current = slot(id)
  current.generation += 1
  current.loops = loops
  current.level = clampLevel(level)
  void dispatch(id, midiArray(bytes), current.generation)
}

async function decodeImage(path: string, bytes: Uint8Array) {
  try {
    const packed = new ArrayBuffer(bytes.byteLength)
    new Uint8Array(packed).set(bytes)
    const bitmap = await createImageBitmap(new Blob([packed]))
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext('2d')
    if (!context) {
      bitmap.close()
      throw new Error(`No 2D context (path - ${path})`)
    }
    context.imageSmoothingEnabled = false
    context.drawImage(bitmap, 0, 0)
    bitmap.close()
    bridge.images[bridge.jtHash(bytes)] = canvas
    bridge.imagesByPath[path] = canvas
  } catch (error) {
    console.warn(error)
  }
}

async function boot() {
  const resources = bridge.resources
  const raw: Record<string, Uint8Array> = {}
  const images: Record<string, HTMLCanvasElement> = {}
  const imagesByPath: Record<string, HTMLCanvasElement> = {}
  bridge.raw = raw
  bridge.images = images
  bridge.imagesByPath = imagesByPath

  const jobs: Promise<void>[] = []

  for (const [path, encoded] of Object.entries(resources)) {
    const bytes = decodeBase64(encoded)
    raw[path] = bytes
    if (isImage(bytes)) {
      jobs.push(decodeImage(path, bytes))
    }
  }

  try {
    await Promise.all(jobs)
    bridge.main()
    bindKeys()
  } catch (error) {
    console.error(error)
  }
}

void boot()
