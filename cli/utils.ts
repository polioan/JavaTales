import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import process from 'node:process'
import { ArgvError } from './argv-error'

export async function exists(targetPath: string) {
  try {
    await fsp.access(targetPath, fs.constants.F_OK)
    return true
  } catch {
    return false
  }
}

export async function isDirectory(targetPath: string) {
  if (!(await exists(targetPath))) {
    return false
  }
  try {
    const stat = await fsp.stat(targetPath)
    return stat.isDirectory()
  } catch {
    return false
  }
}

export async function isFile(targetPath: string) {
  if (!(await exists(targetPath))) {
    return false
  }
  try {
    const stat = await fsp.stat(targetPath)
    return stat.isFile()
  } catch {
    return false
  }
}

export function stripPrefix(string: string, prefix: string) {
  return string.startsWith(prefix) ? string.slice(prefix.length) : string
}

export function untildify(relative: string) {
  if (relative === '~') {
    return os.homedir()
  }
  if (relative.startsWith('~/') || relative.startsWith('~\\')) {
    return path.join(os.homedir(), relative.slice(2))
  }
  return relative
}

export function isRecord(
  payload: unknown
): payload is Record<PropertyKey, unknown> {
  return (
    (typeof payload === 'object' || typeof payload === 'function') &&
    payload != null &&
    !Array.isArray(payload)
  )
}

export function isBrowser() {
  if (typeof window === 'undefined') {
    return false
  }
  if (!isRecord(window)) {
    return false
  }
  if (typeof document === 'undefined') {
    return false
  }
  if (!isRecord(document)) {
    return false
  }
  return isRecord(document.documentElement)
}

export async function waitForLoad() {
  if (!isBrowser()) {
    return
  }

  if (document.readyState === 'complete') {
    return
  }

  await new Promise<void>(resolve => {
    window.addEventListener(
      'load',
      () => {
        resolve()
      },
      {
        once: true,
      }
    )
  })
}

export function exit(code?: 0 | 1 | null): never {
  // Not sure here
  if (isBrowser()) {
    throw new Error(`Cannot exit with code ${code ?? 0} in browser`)
  }
  process.exit(code ?? 0)
}

function logErrors(...data: unknown[]) {
  for (const d of data) {
    if (d instanceof ArgvError) {
      console.error(d.message)
      if (d.cause != null) {
        console.error(d.cause)
      }
      continue
    }
    console.error(d)
  }
}

export function die(...data: unknown[]): never {
  logErrors(...data)
  exit(1)
}

export function runMain(main: () => void | PromiseLike<void>) {
  async function runner() {
    await waitForLoad()
    await main()
  }

  runner()
    .then(() => {
      if (isBrowser()) {
        return
      }
      exit()
    })
    .catch(error => {
      if (isBrowser()) {
        logErrors(error)
        return
      }
      die(error)
    })
}

class JavaRandom {
  #seed: bigint

  constructor(seed: number) {
    this.#seed = (BigInt(seed) ^ 0x5deece66dn) & ((1n << 48n) - 1n)
  }

  nextInt() {
    this.#seed = (this.#seed * 0x5deece66dn + 0xbn) & ((1n << 48n) - 1n)
    const value = Number(this.#seed >> 16n)
    return value >= 0x80000000 ? value - 0x100000000 : value
  }
}

export class Java {
  public static readonly Random = JavaRandom
}

export class Animator {
  private animationId: number | null = null
  private running = false
  public callback: FrameRequestCallback | null = null

  constructor() {
    this.animate = this.animate.bind(this)
  }

  private animate(time: number) {
    if (!this.running) {
      return
    }

    this.callback?.(time)

    if (this.running) {
      this.animationId = requestAnimationFrame(this.animate)
    }
  }

  public start() {
    if (this.running) {
      return
    }

    this.running = true
    this.animationId = requestAnimationFrame(this.animate)
  }

  public stop() {
    this.running = false

    if (this.animationId != null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }

    this.callback = null
  }
}

type Qs = {
  <T extends keyof HTMLElementTagNameMap>(
    selectors: T
  ): HTMLElementTagNameMap[T]
  <T extends keyof SVGElementTagNameMap>(selectors: T): SVGElementTagNameMap[T]
  <T extends keyof MathMLElementTagNameMap>(
    selectors: T
  ): MathMLElementTagNameMap[T]
  /**
   * @deprecated
   */
  <T extends keyof HTMLElementDeprecatedTagNameMap>(
    selectors: T
  ): HTMLElementDeprecatedTagNameMap[T]
  <T extends Element = Element>(selectors: string): T
}

export const qs: Qs = (selectors: string) => {
  if (!isBrowser()) {
    throw new Error('Cannot get by selectors in non-browser')
  }
  const result = document.querySelector(selectors)
  if (!result) {
    throw new Error(`Cannot get by selectors: ${selectors}`)
  }
  return result
}

export function assert<T>(value: T, message?: string): NonNullable<T> {
  if (value == null) {
    throw new Error(
      `Assertion failed, value expected to be defined!${typeof message === 'string' ? ` ${message}` : ''}`
    )
  }

  return value
}
