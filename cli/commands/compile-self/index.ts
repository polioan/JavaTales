import type { CompileSelf } from '../../schema'
import { $ } from 'bun'
import process from 'node:process'
import fsp from 'node:fs/promises'
import { die, exists } from '../../utils'

export function detectPlatform() {
  const platform = process.platform.trim().toLowerCase()

  if (platform.startsWith('win')) {
    return 'windows'
  }

  if (platform === 'linux') {
    return 'linux'
  }

  if (platform === 'darwin') {
    return 'darwin'
  }

  return null
}

export function detectArch() {
  if (process.arch === 'x64') {
    return 'x64'
  }
  if (process.arch === 'arm64') {
    return 'arm64'
  }
  return null
}

export function detectRuntime() {
  return {
    platform: detectPlatform(),
    arch: detectArch(),
  }
}

function getRuntime(options: CompileSelf) {
  if (!options.target || options.target === 'auto') {
    const { platform, arch } = detectRuntime()

    if (!platform || !arch) {
      if (!options.silent) {
        console.error(
          `Unsupported platform: ${process.platform}/${process.arch}`
        )
      }
      die()
    }

    const target = `bun-${platform}-${arch}`

    return target
  }

  return options.target.startsWith('bun')
    ? options.target
    : `bun-${options.target}`
}

export async function compileSelf(options: CompileSelf) {
  if (options.force) {
    await fsp.rm(options.output, {
      force: true,
    })
  } else {
    if (await exists(options.output)) {
      if (!options.silent) {
        console.error(
          `Output ${options.output} already exists, use --force to override`
        )
      }
      die()
    }
  }

  const target = getRuntime(options)

  const result =
    await $`bun build --compile --target=${target} ${options.input} --outfile=${options.output}`.nothrow()

  if (result.exitCode !== 0) {
    die()
  }

  if (!options.silent) {
    console.info(`Built ${options.output} (${target})`)
  }
}
