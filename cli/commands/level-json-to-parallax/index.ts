import type { LevelJsonToParallax } from '../../schema'
import type { Level } from '../../shared/level'
import { die, exists } from '../../utils'
import fsp from 'node:fs/promises'
import {
  rollup,
  type Plugin,
  type RollupLog,
  type LoggingFunction,
} from 'rollup'
import typescript from '@rollup/plugin-typescript'
import replace from '@rollup/plugin-replace'
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import terser from '@rollup/plugin-terser'
import json from '@rollup/plugin-json'
import path from 'node:path'

function getPlugins(level: Level) {
  const plugins: Plugin[] = [
    json({}),
    replace({
      'process.env.NODE_ENV': JSON.stringify('production'),
      "process.env['NODE_ENV']": JSON.stringify('production'),
      'process.env["NODE_ENV"]': JSON.stringify('production'),
      'process.env.DEV': JSON.stringify('false'),
      "process.env['DEV']": JSON.stringify('false'),
      'process.env["DEV"]': JSON.stringify('false'),
      'process.exit': '(() => {})',
      __LEVEL__: JSON.stringify(level),
      sourceMap: false,
      preventAssignment: true,
    }),
    {
      name: 'strip-node-prefix',
      resolveId(source) {
        if (source.startsWith('node:')) {
          return {
            id: source.replace('node:', ''),
            external: true,
          }
        }
        return null
      },
    },
    commonjs({
      sourceMap: false,
    }),
    resolve({}),
    terser({
      sourceMap: false,
      output: {
        comments: false,
        inline_script: true,
      },
    }),
  ]

  return plugins
}

function onwarn(warn: RollupLog, handler: LoggingFunction) {
  if (warn.code === 'CIRCULAR_DEPENDENCY') {
    return
  }
  if (warn.code === 'MISSING_NAME_OPTION_FOR_IIFE_EXPORT') {
    return
  }
  handler(warn)
}

async function inlineHtml(templatePath: string, code: string) {
  const template = await fsp.readFile(templatePath, {
    encoding: 'utf8',
  })

  const bundleToken = '__BUNDLE__'
  const parts = template.split(bundleToken)
  const banner = parts[0]
  const footer = parts[1]

  if (banner == null || footer == null || parts.length !== 2) {
    throw new Error('template.html must contain __BUNDLE__ once')
  }

  return banner + code + footer
}

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

  const plugins = getPlugins(level)

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
      typescript({
        tsconfig: path.join(options.sources, './tsconfig.json'),
        outDir,
        rootDir: outDir,
      }),
      ...plugins,
      {
        name: 'inline-html',
        renderChunk(code) {
          return inlineHtml(templatePath, code)
        },
      },
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
