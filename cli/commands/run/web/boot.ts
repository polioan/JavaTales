import { qs } from '../../../utils'
import { CurrentBridge, type ReadableBytes } from './bridge'

type Tempo = {
  tick: number
  us: number
}

type MidiEvent = {
  tick: number
  status: number
  a: number
  b: number
}

type OpenNote = {
  time: number
  note: number
  velocity: number
  program: number
  volume: number
  channel: number
}

type MidiNote = OpenNote & {
  duration: number
}

type Song = {
  notes: MidiNote[]
  seconds: number
}

type Audio = {
  context: AudioContext
  gain: GainNode
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

let audio: Audio | null = null
let midiGeneration = 0
const midiNodes: AudioScheduledSourceNode[] = []

function audioContext(): Audio {
  if (audio) {
    return audio
  }
  const context = new AudioContext()
  const gain = context.createGain()
  gain.gain.value = 0.35
  gain.connect(context.destination)
  audio = {
    context,
    gain,
  }
  return audio
}

function resumeAudio() {
  if (audio?.context.state === 'suspended') {
    void audio.context.resume()
  }
}

window.addEventListener('pointerdown', resumeAudio)
window.addEventListener('keydown', resumeAudio)

function midiArray(bytes: ReadableBytes) {
  const length = bytes.length ?? bytes.getLength?.() ?? 0
  const copy = new Uint8Array(length)
  for (let index = 0; index < length; index += 1) {
    const value = bytes.get ? bytes.get(index) : bytes[index]
    copy[index] = (value ?? 0) & 255
  }
  return copy
}

function byteAt(bytes: Uint8Array, index: number) {
  return bytes[index] ?? 0
}

function readVariable(
  bytes: Uint8Array,
  index: number
): {
  value: number
  next: number
} {
  let value = 0
  while (index < bytes.length) {
    const piece = byteAt(bytes, index)
    index += 1
    value = (value << 7) | (piece & 127)
    if ((piece & 128) === 0) {
      return {
        value,
        next: index,
      }
    }
  }
  return {
    value,
    next: index,
  }
}

function parseMidi(bytes: Uint8Array): Song {
  let index = 14

  const tracks = (byteAt(bytes, 10) << 8) | byteAt(bytes, 11)
  let division = (byteAt(bytes, 12) << 8) | byteAt(bytes, 13)

  if (division <= 0) {
    division = 96
  }

  const events: MidiEvent[] = []
  const tempos: Tempo[] = [
    {
      tick: 0,
      us: 500000,
    },
  ]

  for (let track = 0; track < tracks && index + 8 <= bytes.length; track += 1) {
    const marker =
      byteAt(bytes, index) === 0x4d &&
      byteAt(bytes, index + 1) === 0x54 &&
      byteAt(bytes, index + 2) === 0x72 &&
      byteAt(bytes, index + 3) === 0x6b

    if (!marker) {
      break
    }

    const length =
      (byteAt(bytes, index + 4) << 24) |
      (byteAt(bytes, index + 5) << 16) |
      (byteAt(bytes, index + 6) << 8) |
      byteAt(bytes, index + 7)

    index += 8
    const end = index + length
    let tick = 0
    let status = 0

    while (index < end) {
      const delta = readVariable(bytes, index)
      tick += delta.value
      index = delta.next
      if (byteAt(bytes, index) & 128) {
        status = byteAt(bytes, index)
        index += 1
      }
      if (status === 0xff) {
        const kind = byteAt(bytes, index)
        index += 1
        const size = readVariable(bytes, index)
        index = size.next
        if (kind === 0x51 && size.value === 3) {
          tempos.push({
            tick,
            us:
              (byteAt(bytes, index) << 16) |
              (byteAt(bytes, index + 1) << 8) |
              byteAt(bytes, index + 2),
          })
        }
        index += size.value
      } else if (status === 0xf0 || status === 0xf7) {
        const sysex = readVariable(bytes, index)
        index = sysex.next + sysex.value
      } else {
        const needed =
          (status & 0xf0) === 0xc0 || (status & 0xf0) === 0xd0 ? 1 : 2

        events.push({
          tick,
          status,
          a: byteAt(bytes, index),
          b: needed === 2 ? byteAt(bytes, index + 1) : 0,
        })
        index += needed
      }
    }
  }

  tempos.sort((left, right) => left.tick - right.tick)

  const seconds = (tick: number) => {
    let time = 0
    let previous = 0
    let microseconds = 500000

    for (const tempo of tempos) {
      if (tempo.tick > tick) {
        break
      }
      time += ((tempo.tick - previous) * microseconds) / division / 1000000
      previous = tempo.tick
      microseconds = tempo.us
    }
    return time + ((tick - previous) * microseconds) / division / 1000000
  }

  const programs = Array.from(
    {
      length: 16,
    },
    () => 0
  )
  const volume = Array.from(
    {
      length: 16,
    },
    () => 100
  )
  const notes: MidiNote[] = []
  const open: Record<string, OpenNote> = {}
  let last = 0

  events.sort((left, right) => {
    if (left.tick !== right.tick) {
      return left.tick - right.tick
    }
    const rank = (value: number) => {
      const kind = value & 0xf0
      return kind === 0xc0 || kind === 0xb0 ? 0 : 1
    }
    return rank(left.status) - rank(right.status)
  })

  for (const event of events) {
    const channel = event.status & 15
    const kind = event.status & 0xf0
    const time = seconds(event.tick)
    if (time > last) {
      last = time
    }
    if (kind === 0xc0) {
      programs[channel] = event.a
    } else if (kind === 0xb0 && event.a === 7) {
      volume[channel] = event.b
    } else if (kind === 0x90 && event.b > 0) {
      open[`${channel}:${event.a}`] = {
        time,
        note: event.a,
        velocity: event.b,
        program: programs[channel] ?? 0,
        volume: volume[channel] ?? 100,
        channel,
      }
    } else if (kind === 0x80 || (kind === 0x90 && event.b === 0)) {
      const key = `${channel}:${event.a}`
      const held = open[key]
      if (held) {
        notes.push({
          ...held,
          duration: Math.max(0.03, time - held.time),
        })
        delete open[key]
      }
    }
  }

  for (const held of Object.values(open)) {
    notes.push({
      ...held,
      duration: 0.2,
    })
  }

  return {
    notes,
    seconds: Math.max(0.1, last),
  }
}

function waveFor(program: number): OscillatorType {
  if (program >= 32 && program <= 39) {
    return 'triangle'
  }
  if ((program >= 40 && program <= 55) || (program >= 80 && program <= 87)) {
    return 'sawtooth'
  }
  if (program >= 64 && program <= 71) {
    return 'square'
  }
  if (program >= 72 && program <= 79) {
    return 'sine'
  }
  return 'triangle'
}

function scheduleSong(song: Song, when: number) {
  const { context, gain } = audioContext()
  for (const note of song.notes) {
    const loud = (note.velocity / 127) * (note.volume / 127) * 0.2
    const start = when + note.time
    const stop = start + note.duration
    if (note.channel === 9) {
      const frames = Math.max(1, Math.floor(context.sampleRate * note.duration))
      const buffer = context.createBuffer(1, frames, context.sampleRate)
      const samples = buffer.getChannelData(0)
      for (let frame = 0; frame < frames; frame += 1) {
        samples[frame] = Math.random() * 2 - 1
      }
      const noise = context.createBufferSource()
      const noiseGain = context.createGain()
      noise.buffer = buffer
      noiseGain.gain.setValueAtTime(loud, start)
      noiseGain.gain.exponentialRampToValueAtTime(0.001, stop)
      noise.connect(noiseGain)
      noiseGain.connect(gain)
      noise.start(start)
      noise.stop(stop + 0.01)
      midiNodes.push(noise)
      continue
    }
    const voice = context.createOscillator()
    const voiceGain = context.createGain()
    voice.type = waveFor(note.program)
    voice.frequency.setValueAtTime(440 * 2 ** ((note.note - 69) / 12), start)
    voiceGain.gain.setValueAtTime(0.0001, start)
    voiceGain.gain.exponentialRampToValueAtTime(
      Math.max(0.001, loud),
      start + Math.min(0.02, note.duration / 3)
    )
    voiceGain.gain.exponentialRampToValueAtTime(0.001, stop)
    voice.connect(voiceGain)
    voiceGain.connect(gain)
    voice.start(start)
    voice.stop(stop + 0.02)
    midiNodes.push(voice)
  }
}

bridge.stopMidi = () => {
  midiGeneration += 1
  for (const node of midiNodes) {
    try {
      node.stop()
    } catch {}
  }
  midiNodes.length = 0
}

bridge.midiVolume = level => {
  const { gain } = audioContext()
  gain.gain.value = (Math.max(0, Math.min(100, level)) / 100) * 0.4
}

bridge.playMidi = (bytes, loops, level) => {
  const song = parseMidi(midiArray(bytes))
  bridge.midiDebug = {
    notes: song.notes.length,
    seconds: song.seconds,
    loops,
  }
  bridge.stopMidi()
  const generation = midiGeneration
  bridge.midiVolume(level)
  let remaining = loops < 0 ? -1 : Math.max(0, loops - 1)

  const playFrom = (when: number) => {
    if (generation !== midiGeneration) {
      return
    }
    scheduleSong(song, when)
    if (remaining === 0) {
      return
    }
    const { context } = audioContext()
    const end = when + song.seconds
    const marker = context.createOscillator()

    marker.onended = () => {
      if (generation !== midiGeneration) {
        return
      }
      if (remaining > 0) {
        remaining -= 1
      }
      playFrom(audioContext().context.currentTime + 0.04)
    }

    marker.start(end)
    marker.stop(end + 0.02)
    midiNodes.push(marker)
  }

  const { context } = audioContext()
  playFrom(context.currentTime + 0.05)
  void context.resume()
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
