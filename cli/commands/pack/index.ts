import type { Pack } from '../../schema'
import { $ } from 'bun'
import process from 'node:process'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { die, exists } from '../../utils'

export async function pack(options: Pack) {
  const root = path.join(options.sources, 'cli', 'commands', 'pack')
  const composeFile = path.join(root, 'compose.yml')
  const project = `javatales-pack-${process.pid}`

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

  await fsp.mkdir(path.dirname(options.output), {
    recursive: true,
  })

  await fsp.writeFile(options.output, '')

  const env = {
    ...process.env,
    PACK_UID: String(process.getuid?.() ?? 0),
    PACK_GID: String(process.getgid?.() ?? 0),
    JAVA_TALES_SOURCES: options.sources,
    PACK_INPUT: options.input,
    PACK_OUTPUT: options.output,
    COMPOSE_ANSI: 'never',
  }

  const pending =
    $`docker compose --project-name ${project} --project-directory ${root} --file ${composeFile} run -T --rm --build --no-deps pack`
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
    console.info(`Packed ${options.input} into ${options.output}`)
  }
}
