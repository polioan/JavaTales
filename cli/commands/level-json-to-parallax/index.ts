import { rollup } from 'rollup'
import type { LevelJsonToParallax } from '../../schema'
import type { Level } from '../../shared/level'
import { die, exists } from '../../utils'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { onwarn, plugins } from '../../shared/rollup'

export async function levelJsonToParallax(options: LevelJsonToParallax) {
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
      force: true,
    })
  }

  const level: Level = JSON.parse(
    await fsp.readFile(options.input, {
      encoding: 'utf8',
    })
  )

  const root = path.join(
    options.sources,
    'cli',
    'commands',
    'level-json-to-parallax'
  )

  const outDir = path.dirname(options.output)

  if (!(await exists(outDir))) {
    await fsp.mkdir(outDir, {
      recursive: true,
    })
  }

  const templatePath = path.join(root, './template.html')

  const instance = await rollup({
    cache: false,
    input: path.join(root, './script.ts'),
    plugins: [
      plugins.typescript({
        tsconfig: path.join(options.sources, './tsconfig.json'),
        rootDir: options.sources,
        outDir,
      }),
      plugins.json(),
      plugins.replace({
        __LEVEL__: JSON.stringify(level),
      }),
      plugins.stripNodePrefix(),
      plugins.commonjs(),
      plugins.resolve(),
      plugins.minify(),
      plugins.html(templatePath),
    ],
    onwarn,
  })

  await instance.write({
    file: options.output,
    format: 'iife',
    sourcemap: false,
    inlineDynamicImports: true,
  })

  await instance.close()
}
