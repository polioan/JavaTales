import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import process from 'node:process'
import { ArgvError } from './argv'

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
  if (isBrowser()) {
    throw new Error(`Cannot exit with code ${code ?? 0} in browser`)
  }
  process.exit(code ?? 0)
}

export function die(...data: unknown[]): never {
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
  exit(1)
}

export function runMain(main: () => void | PromiseLike<void>) {
  async function runner() {
    await waitForLoad()
    await main()
  }

  runner()
    .then(() => {
      exit()
    })
    .catch(error => {
      die(error)
    })
}
