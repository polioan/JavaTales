import type { Run } from '../../schema'
import { $ } from 'bun'
import process from 'node:process'
import path from 'node:path'
import { die } from '../../utils'

export async function run(options: Run) {
  const root = path.join(options.sources, 'cli', 'commands', 'run')
  const composeFile = path.join(root, 'compose.yml')
  const project = `javatales-run-${process.pid}`

  const env = {
    ...process.env,
    RUN_UID: String(process.getuid?.() ?? 0),
    RUN_GID: String(process.getgid?.() ?? 0),
    RUN_INPUT: options.input,
    COMPOSE_ANSI: 'never',
  }

  process.on('SIGINT', () => {})
  process.on('SIGTERM', () => {})

  const pending =
    $`docker compose --project-name ${project} --project-directory ${root} --file ${composeFile} up --build --abort-on-container-exit --remove-orphans`
      .env(env)
      .nothrow()

  const result = await (options.silent ? pending.quiet() : pending)

  await $`docker compose --project-name ${project} --project-directory ${root} --file ${composeFile} down --volumes --remove-orphans`
    .env(env)
    .nothrow()
    .quiet()

  if (result.exitCode !== 0 && result.exitCode !== 130) {
    die()
  }
}
