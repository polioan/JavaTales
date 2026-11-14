import type { Run } from '../../schema'
import { $ } from 'bun'
import process from 'node:process'
import path from 'node:path'
import { die, staticAssert, type IsNever } from '../../utils'
import { rollup } from 'rollup'
import { getCode, onwarn, plugins } from '../../shared/rollup'
import os from 'node:os'
import fsp from 'node:fs/promises'

async function bundleTemplate({
  root,
  tsconfig,
}: {
  root: string
  tsconfig: string
}) {
  const web = path.join(root, 'web')

  const instance = await rollup({
    cache: false,
    input: path.join(web, './boot.ts'),
    plugins: [
      plugins.typescript({
        tsconfig,
        rootDir: path.dirname(tsconfig),
      }),
      plugins.json(),
      plugins.replace({}),
      plugins.stripNodePrefix(),
      plugins.commonjs(),
      plugins.resolve(),
      plugins.minify(),
      plugins.html(path.join(web, 'template.html')),
    ],
    onwarn,
  })

  const generated = await instance.generate({
    format: 'iife',
    sourcemap: false,
    inlineDynamicImports: true,
  })

  await instance.close()

  return getCode(generated)
}

async function tales(options: Run) {
  const root = path.join(
    options.sources,
    'cli',
    'commands',
    'run',
    'providers',
    'tales'
  )
  const composeFile = path.join(root, 'compose.yml')
  const project = `javatales-run-${process.pid}`

  const tsconfig = path.join(options.sources, './tsconfig.json')

  const template = await bundleTemplate({
    root,
    tsconfig,
  })

  const page = path.join(os.tmpdir(), `${project}.html`)

  await fsp.writeFile(page, template, {
    encoding: 'utf8',
  })

  const env = {
    ...process.env,
    RUN_UID: String(process.getuid?.() ?? 0),
    RUN_GID: String(process.getgid?.() ?? 0),
    RUN_INPUT: options.input,
    RUN_PAGE: page,
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

async function freej2me(options: Run) {
  const root = path.join(
    options.sources,
    'cli',
    'commands',
    'run',
    'providers',
    'freej2me'
  )
  const composeFile = path.join(root, 'compose.yml')
  const project = `javatales-run-freej2me-${process.pid}`

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

export async function run(options: Run) {
  if (options.provider === 'tales') {
    await tales(options)
    return
  }

  if (options.provider === 'freej2me') {
    await freej2me(options)
    return
  }

  staticAssert<IsNever<typeof options.provider>>()
}
