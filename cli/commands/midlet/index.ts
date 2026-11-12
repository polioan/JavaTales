import type { Midlet } from '../../schema'
import { $ } from 'bun'
import process from 'node:process'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { die, exists } from '../../utils'

function javaWithoutNoise(source: string) {
  return source
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/.*$/gm, '')
}

function sourceRoot(file: string, packageName: string | null) {
  const segments = packageName ? packageName.split('.') : []
  let directory = path.dirname(file)

  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const segment = segments[index]
    if (!segment || path.basename(directory) !== segment) {
      return null
    }
    directory = path.dirname(directory)
  }

  return directory
}

async function describeMidlet(file: string) {
  const base = path.basename(file)

  if (!base.endsWith('.java')) {
    return {
      ok: false as const,
      message: `${file} is not a .java file`,
    }
  }

  const className = base.slice(0, -'.java'.length)

  if (!/^[A-Za-z_]\w*$/.test(className)) {
    return {
      ok: false as const,
      message: `${file} is not named like a Java class`,
    }
  }

  const source = javaWithoutNoise(
    await fsp.readFile(file, {
      encoding: 'utf8',
    })
  )

  const packageMatch = source.match(
    /\bpackage\s+([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)\s*;/
  )

  const packageName = packageMatch?.[1] ?? null

  const pattern = new RegExp(
    `\\bclass\\s+${className}\\s+extends\\s+(?:[A-Za-z_]\\w*\\.)*MIDlet\\b`
  )

  if (!pattern.test(source)) {
    return {
      ok: false as const,
      message: `${file} has no class ${className} that extends MIDlet`,
    }
  }

  const root = sourceRoot(file, packageName)

  if (!root) {
    return {
      ok: false as const,
      message: `${file} declares package ${packageName ?? ''}, so it needs to live in ${path.join(...(packageName ? packageName.split('.') : []), base)}`,
    }
  }

  return {
    ok: true as const,
    root,
    className,
    qualified: packageName ? `${packageName}.${className}` : className,
  }
}

export async function midlet(options: Midlet) {
  const root = path.join(options.sources, 'cli', 'commands', 'midlet')
  const composeFile = path.join(root, 'compose.yml')
  const project = `javatales-midlet-${process.pid}`
  const described = await describeMidlet(options.input)

  if (!described.ok) {
    if (!options.silent) {
      console.error(described.message)
    }
    die()
  }

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
    MIDLET_UID: String(process.getuid?.() ?? 0),
    MIDLET_GID: String(process.getgid?.() ?? 0),
    MIDLET_INPUT: described.root,
    MIDLET_OUTPUT: options.output,
    MIDLET_CLASS: described.qualified,
    MIDLET_NAME: described.className,
    COMPOSE_ANSI: 'never',
  }

  const pending =
    $`docker compose --project-name ${project} --project-directory ${root} --file ${composeFile} run -T --rm --build --no-deps midlet`
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
    console.info(`Built ${options.input} into ${options.output}`)
  }
}
