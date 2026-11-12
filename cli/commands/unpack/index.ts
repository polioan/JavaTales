import type { Unpack } from '../../schema'
import { $ } from 'bun'
import process from 'node:process'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { die, exists } from '../../utils'

export async function unpack(options: Unpack) {
  const root = path.join(options.sources, 'cli', 'commands', 'unpack')
  const composeFile = path.join(root, 'compose.yml')
  const project = `javatales-unpack-${process.pid}`

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
      recursive: true,
      force: true,
    })
  }

  await fsp.mkdir(options.output, {
    recursive: true,
  })

  const env = {
    ...process.env,
    UNPACK_UID: String(process.getuid?.() ?? 0),
    UNPACK_GID: String(process.getgid?.() ?? 0),
    JAVA_TALES_SOURCES: options.sources,
    UNPACK_INPUT: options.input,
    UNPACK_OUTPUT: options.output,
    COMPOSE_ANSI: 'never',
  }

  const pending =
    $`docker compose --project-name ${project} --project-directory ${root} --file ${composeFile} run -T --rm --build --no-deps unpack`
      .env(env)
      .nothrow()

  const run = await (options.silent ? pending.quiet() : pending)

  await $`docker compose --project-name ${project} --project-directory ${root} --file ${composeFile} down --volumes --remove-orphans`
    .env(env)
    .nothrow()
    .quiet()

  if (run.exitCode !== 0) {
    die()
  }

  if (!options.silent) {
    console.info(`Unpacked ${options.input} into ${options.output}`)
  }
}
