import type { Plugin, RollupLog, LoggingFunction, RollupOutput } from 'rollup'
import typescript from '@rollup/plugin-typescript'
import replace from '@rollup/plugin-replace'
import commonjs from '@rollup/plugin-commonjs'
import resolve, {
  type RollupNodeResolveOptions,
} from '@rollup/plugin-node-resolve'
import terser from '@rollup/plugin-terser'
import json from '@rollup/plugin-json'
import fsp from 'node:fs/promises'
import { exists } from '../utils'

export function onwarn(warn: RollupLog, handler: LoggingFunction) {
  if (warn.code === 'CIRCULAR_DEPENDENCY') {
    return
  }
  if (warn.code === 'MISSING_NAME_OPTION_FOR_IIFE_EXPORT') {
    return
  }
  if (
    warn.code === 'MISSING_NODE_BUILTINS' ||
    (warn.code === 'UNUSED_EXTERNAL_IMPORT' && warn.exporter === 'process')
  ) {
    return
  }
  if (warn.plugin === 'typescript' && warn.code === 'PLUGIN_WARNING') {
    return
  }
  handler(warn)
}

export const plugins = {
  typescript({
    tsconfig,
    rootDir,
    outDir,
  }: {
    tsconfig: string
    rootDir: string
    outDir?: string | null | undefined
  }) {
    return typescript({
      tsconfig,
      rootDir,
      ...(outDir == null
        ? {}
        : {
            outDir,
          }),
    })
  },
  json() {
    return json({})
  },
  replace(additional?: Record<string, string> | null) {
    return replace({
      'process.env.NODE_ENV': JSON.stringify('production'),
      "process.env['NODE_ENV']": JSON.stringify('production'),
      'process.env["NODE_ENV"]': JSON.stringify('production'),
      'process.env.DEV': JSON.stringify('false'),
      "process.env['DEV']": JSON.stringify('false'),
      'process.env["DEV"]': JSON.stringify('false'),
      'process.exit': '(() => {})',
      ...(additional ?? {}),
      sourceMap: false,
      preventAssignment: true,
    })
  },
  stripNodePrefix() {
    return {
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
    }
  },
  commonjs() {
    return commonjs({
      sourceMap: false,
    })
  },
  resolve(options?: RollupNodeResolveOptions | null) {
    return resolve(options ?? {})
  },
  minify() {
    return terser({
      sourceMap: false,
      output: {
        comments: false,
        inline_script: true,
      },
    })
  },
  html(template: string) {
    const bundleToken = '__BUNDLE__'

    const getTemplate = async (templatePathOrCode: string) => {
      if (
        templatePathOrCode.includes(bundleToken) &&
        !(await exists(templatePathOrCode))
      ) {
        return templatePathOrCode
      }

      const code = await fsp.readFile(templatePathOrCode, {
        encoding: 'utf8',
      })

      return code
    }

    const inlineHtml = async (templatePathOrCode: string, code: string) => {
      const html = await getTemplate(templatePathOrCode)

      const parts = html.split(bundleToken)

      const banner = parts[0]
      const footer = parts[1]

      if (banner == null || footer == null || parts.length !== 2) {
        throw new Error(`template.html must contain ${bundleToken} once`)
      }

      return banner + code + footer
    }

    return {
      name: 'inline-html',
      renderChunk(code) {
        return inlineHtml(template, code)
      },
    }
  },
} satisfies Record<string, (...args: any) => Plugin>

export function getCode(build: RollupOutput) {
  const chunk = build.output.find(item => {
    return item.type === 'chunk' && item.isEntry
  })

  if (!chunk) {
    throw new Error('Build did not emit an entry chunk')
  }

  if (!('code' in chunk) || typeof chunk.code !== 'string') {
    throw new Error('Build did not emit an entry chunk with code')
  }

  return chunk.code
}
