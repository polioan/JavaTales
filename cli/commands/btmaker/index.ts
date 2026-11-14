import type { Btmaker } from '../../schema'
import { $ } from 'bun'
import process from 'node:process'
import path from 'node:path'
import { die } from '../../utils'

export async function btmaker(options: Btmaker) {
  const root = path.join(options.sources, 'cli', 'commands', 'btmaker')
  const composeFile = path.join(root, 'compose.yml')
  const project = `javatales-btmaker-${process.pid}`

  const env = {
    ...process.env,
    BTMAKER_UID: String(process.getuid?.() ?? 0),
    BTMAKER_GID: String(process.getgid?.() ?? 0),
    BTMAKER_WORK: options.sources,
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
