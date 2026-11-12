import { $ } from 'bun'
import type { Check } from '../../schema'
import { die, isDirectory } from '../../utils'
import path from 'node:path'

const dockerLength = 'Docker'.length

export async function getDockerVersion() {
  const docker = await $`docker --version`.nothrow().quiet()

  if (
    docker.exitCode !== 0 ||
    (docker.exitCode === 0 &&
      docker.stdout.toString().trim().length <= dockerLength)
  ) {
    return {
      success: false,
      stdout: docker.stdout.toString().trim(),
      stderr: docker.stderr.toString().trim(),
      code: docker.exitCode,
    } as const
  }

  return {
    success: true,
    stdout: docker.stdout.toString().trim(),
    stderr: docker.stderr.toString().trim(),
    code: docker.exitCode,
  } as const
}

export async function getDockerComposeVersion() {
  const dockerCompose = await $`docker compose version`.nothrow().quiet()

  if (
    dockerCompose.exitCode !== 0 ||
    (dockerCompose.exitCode === 0 &&
      dockerCompose.stdout.toString().trim().length <= dockerLength)
  ) {
    return {
      success: false,
      stdout: dockerCompose.stdout.toString().trim(),
      stderr: dockerCompose.stderr.toString().trim(),
      code: dockerCompose.exitCode,
    } as const
  }

  return {
    success: true,
    stdout: dockerCompose.stdout.toString().trim(),
    stderr: dockerCompose.stderr.toString().trim(),
    code: dockerCompose.exitCode,
  } as const
}

export async function check(options: Check) {
  let errored = false

  const xStandard = path.join(
    options.sources,
    'BounceTales',
    'BounceTools',
    'submodules',
    'XStandard',
    'src'
  )

  if (await isDirectory(xStandard)) {
    if (!options.silent) {
      console.info(`JavaTales sources are at ${options.sources}`)
    }
  } else {
    if (!options.silent) {
      console.error(
        `Sources for JavaTales is not valid, did you cloned with --recursive? (Checked ${xStandard})`
      )
      console.error(
        'As an alternative set path for sources using --sources flag or JAVA_TALES_SOURCES env variable'
      )
    }
    errored = true
  }

  for (const fn of [getDockerVersion, getDockerComposeVersion]) {
    const result = await fn()

    if (result.success) {
      if (!options.silent) {
        console.info(result.stdout)
      }
    } else {
      if (!options.silent) {
        console.error(result)
      }
      errored = true
    }
  }

  if (errored) {
    die()
  }
}
