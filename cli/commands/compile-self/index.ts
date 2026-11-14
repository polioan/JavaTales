// Hell

import type { CompileSelf } from '../../schema'
import type { BunPlugin } from 'bun'
import { $ } from 'bun'
import process from 'node:process'
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { die, exists, isFile, isRecord } from '../../utils'

const typescriptExecutable = '/$bunfs/root/lib/typescript.js'
const tslibEntrypoint = '/$bunfs/root/tslib/tslib.es6.js'

const typescriptExecutableMarker =
  'const executingFilePath = __filename.endsWith("sys.js") ? _path.join(_path.dirname(__dirname), "__fake__.js") : __filename;'

const caseSensitiveMarker = `function isFileSystemCaseSensitive() {
      if (platform === "win32" || platform === "win64") {
        return false;
      }
      return !fileExists(swapCase(__filename));
    }`

const rollupBaseByTarget: Record<string, string> = {
  'bun-linux-x64': 'linux-x64-gnu',
  'bun-linux-arm64': 'linux-arm64-gnu',
  'bun-linux-x64-musl': 'linux-x64-musl',
  'bun-linux-arm64-musl': 'linux-arm64-musl',
  'bun-darwin-x64': 'darwin-x64',
  'bun-darwin-arm64': 'darwin-arm64',
  'bun-windows-x64': 'win32-x64-msvc',
  'bun-windows-arm64': 'win32-arm64-msvc',
}

export function detectPlatform() {
  const platform = process.platform.trim().toLowerCase()

  if (platform.startsWith('win')) {
    return 'windows'
  }

  if (platform === 'linux') {
    return 'linux'
  }

  if (platform === 'darwin') {
    return 'darwin'
  }

  return null
}

export function detectArch() {
  if (process.arch === 'x64') {
    return 'x64'
  }
  if (process.arch === 'arm64') {
    return 'arm64'
  }
  return null
}

export function detectRuntime() {
  return {
    platform: detectPlatform(),
    arch: detectArch(),
  } as const
}

function linuxIsMusl() {
  if (process.platform !== 'linux') {
    return false
  }

  try {
    const report = process.report.getReport() as {
      header?: {
        glibcVersionRuntime?: string
      }
    }

    if (!report.header) {
      return false
    }

    return !report.header.glibcVersionRuntime
  } catch {
    return false
  }
}

function getRuntime(options: CompileSelf) {
  if (options.target === 'auto') {
    const { platform, arch } = detectRuntime()

    if (!platform || !arch) {
      if (!options.silent) {
        console.error(
          `Unsupported platform: ${process.platform}/${process.arch}`
        )
      }
      die()
    }

    const libc = platform === 'linux' && linuxIsMusl() ? '-musl' : ''

    return `bun-${platform}-${arch}${libc}`
  }

  return options.target.startsWith('bun')
    ? options.target
    : `bun-${options.target}`
}

function replaceOnce(source: string, marker: string, replacement: string) {
  const count = source.split(marker).length - 1

  if (count !== 1) {
    return null
  }

  return source.replace(marker, replacement)
}

function redirectTypescript(source: string) {
  const withExecutable = replaceOnce(
    source,
    typescriptExecutableMarker,
    `const executingFilePath = ${JSON.stringify(typescriptExecutable)};`
  )

  if (!withExecutable) {
    throw new Error(
      'TypeScript no longer records its lib path in a way compile-self can redirect'
    )
  }

  const withCaseCheck = replaceOnce(
    withExecutable,
    caseSensitiveMarker,
    `function isFileSystemCaseSensitive() {
      return platform !== "win32" && platform !== "win64" && platform !== "darwin";
    }`
  )

  if (!withCaseCheck) {
    throw new Error(
      'TypeScript no longer detects a case-sensitive filesystem in a way compile-self can redirect'
    )
  }

  return withCaseCheck
}

function redirectTerser(source: string) {
  const markers = [
    `const { code: result, nameCache, sourceMap } = await pool.addAsync({
                    code,
                    options: merge({}, options || {}, defaultOptions)
                });`,
    `const { code: result, nameCache, sourceMap } = await pool.addAsync({
                    code,
                    options: smob.merge({}, options || {}, defaultOptions)
                });`,
  ]

  const minify = source.includes('terser$1.minify')
    ? 'terser$1.minify'
    : 'minify'

  const merge = source.includes('smob.merge') ? 'smob.merge' : 'merge'

  const replacement = `const mergedOptions = ${merge}({}, options || {}, defaultOptions);
                const minified = await ${minify}(code, mergedOptions);
                const result = minified.code || code;
                const nameCache = mergedOptions.nameCache;
                const sourceMap = typeof minified.map === "string" ? JSON.parse(minified.map) : minified.map;`

  for (const marker of markers) {
    const next = replaceOnce(source, marker, replacement)
    if (next) {
      return next
    }
  }

  throw new Error(
    '@rollup/plugin-terser no longer minifies on a worker in a way compile-self can redirect'
  )
}

function redirectTsLib(source: string) {
  const start = source.indexOf('const getTsLibPath = () => {')
  const end = source.indexOf('const getPluginOptions = ')

  if (start < 0 || end < start) {
    throw new Error(
      '@rollup/plugin-typescript no longer resolves tslib in a way compile-self can redirect'
    )
  }

  return (
    source.slice(0, start) +
    `const getTsLibPath = () => {\n    return ${JSON.stringify(tslibEntrypoint)};\n};\n` +
    source.slice(end)
  )
}

function standalonePlugin(
  rollupNodeFile: string,
  embedded: {
    native: boolean
    typescript: boolean
    tslib: boolean
    terser: boolean
  }
): BunPlugin {
  return {
    name: 'standalone-runtime',
    setup(build) {
      build.onLoad(
        {
          filter: /[/\\]rollup[/\\]dist[/\\]native\.js$/,
        },
        () => {
          embedded.native = true

          const specifier = JSON.stringify(rollupNodeFile)

          return {
            contents: `
              const nativeModule = require(${specifier});
              module.exports = {
                parse: nativeModule.parse,
                parseAsync: nativeModule.parseAsync,
                xxhashBase64Url: nativeModule.xxhashBase64Url,
                xxhashBase36: nativeModule.xxhashBase36,
                xxhashBase16: nativeModule.xxhashBase16,
              };
            `,
            loader: 'js',
          }
        }
      )

      build.onLoad(
        {
          filter: /[/\\]typescript[/\\]lib[/\\]typescript\.js$/,
        },
        async args => {
          embedded.typescript = true
          const source = await fsp.readFile(args.path, 'utf8')

          return {
            contents: redirectTypescript(source),
            loader: 'js',
          }
        }
      )

      build.onLoad(
        {
          filter:
            /[/\\]plugin-typescript[/\\]dist[/\\](?:es|cjs)[/\\]index\.js$/,
        },
        async args => {
          embedded.tslib = true
          const source = await fsp.readFile(args.path, 'utf8')

          return {
            contents: redirectTsLib(source),
            loader: 'js',
          }
        }
      )

      build.onLoad(
        {
          filter: /[/\\]plugin-terser[/\\]dist[/\\](?:es|cjs)[/\\]index\.js$/,
        },
        async args => {
          embedded.terser = true
          const source = await fsp.readFile(args.path, 'utf8')

          return {
            contents: redirectTerser(source),
            loader: 'js',
          }
        }
      )

      build.onLoad(
        {
          filter: /\.md$/,
        },
        async args => {
          const text = await fsp.readFile(args.path, 'utf8')

          return {
            contents: `export default ${JSON.stringify(text)};\n`,
            loader: 'js',
          }
        }
      )
    },
  }
}

function bindingFile(modules: string, rollupBase: string) {
  return path.join(
    modules,
    '@rollup',
    `rollup-${rollupBase}`,
    `rollup.${rollupBase}.node`
  )
}

async function modulesReady(modules: string, rollupBase: string) {
  return (
    (await isFile(bindingFile(modules, rollupBase))) &&
    (await isFile(path.join(modules, 'tslib', 'tslib.es6.js'))) &&
    (await isFile(
      path.join(modules, 'typescript', 'lib', 'lib.esnext.full.d.ts')
    ))
  )
}

function includeInStage(sources: string, file: string) {
  const relative = path.relative(sources, file)

  if (!relative || relative === '.') {
    return true
  }

  const top = relative.split(path.sep)[0]

  return top !== 'node_modules' && top !== '.git'
}

async function stageProject(sources: string) {
  const stage = await fsp.mkdtemp(path.join(os.tmpdir(), 'java-tales-compile-'))

  await fsp.cp(sources, stage, {
    recursive: true,
    filter(source) {
      return includeInStage(sources, source)
    },
  })

  return stage
}

async function installDependencies(
  stage: string,
  rollupBase: string,
  silent: boolean
) {
  if (!silent) {
    console.info('Installing dependencies')
  }

  const installed = await $`bun install --frozen-lockfile`
    .cwd(stage)
    .quiet()
    .nothrow()

  if (installed.exitCode !== 0) {
    if (!silent) {
      console.error(installed.stderr.toString() || installed.stdout.toString())
    }
    throw new Error('Could not install dependencies')
  }

  const modules = path.join(stage, 'node_modules')

  if (await modulesReady(modules, rollupBase)) {
    return
  }

  const manifest: unknown = JSON.parse(
    await fsp.readFile(path.join(modules, 'rollup', 'package.json'), 'utf8')
  )

  if (!isRecord(manifest) || typeof manifest.version !== 'string') {
    throw new Error('Installed Rollup package has no version')
  }

  const spec = `@rollup/rollup-${rollupBase}@${manifest.version}`
  const added = await $`bun add --no-save ${spec}`.cwd(stage).quiet().nothrow()

  if (added.exitCode !== 0) {
    if (!silent) {
      console.error(added.stderr.toString() || added.stdout.toString())
    }
    throw new Error(`Could not install Rollup native binding ${spec}`)
  }
}

async function dependencyRoot(options: CompileSelf, rollupBase: string) {
  const local = path.join(options.sources, 'node_modules')

  if (await modulesReady(local, rollupBase)) {
    return {
      root: options.sources,
      input: options.input,
      temporary: null,
    }
  }

  const relativeInput = path.relative(options.sources, options.input)

  if (
    !relativeInput ||
    relativeInput.startsWith('..') ||
    path.isAbsolute(relativeInput)
  ) {
    if (!options.silent) {
      console.error(
        `CLI entry ${options.input} is outside sources ${options.sources}`
      )
    }
    die()
  }

  const stage = await stageProject(options.sources)

  try {
    await installDependencies(stage, rollupBase, options.silent)
  } catch (error) {
    await fsp.rm(stage, {
      recursive: true,
      force: true,
    })
    throw error
  }

  return {
    root: stage,
    input: path.join(stage, relativeInput),
    temporary: stage,
  }
}

export async function compileSelf(options: CompileSelf) {
  if (options.force) {
    await fsp.rm(options.output, {
      force: true,
    })
  } else {
    if (await exists(options.output)) {
      if (!options.silent) {
        console.error(
          `Output ${options.output} already exists, use --force to override`
        )
      }
      die()
    }
  }

  const target = getRuntime(options)
  const rollupBase = rollupBaseByTarget[target]

  if (!rollupBase) {
    if (!options.silent) {
      console.error(`Unsupported compile target: ${target}`)
    }
    die()
  }

  const dependencies = await dependencyRoot(options, rollupBase)

  try {
    const modules = path.join(dependencies.root, 'node_modules')
    const rollupNodeFile = bindingFile(modules, rollupBase)

    if (!(await modulesReady(modules, rollupBase))) {
      throw new Error(
        `Rollup native binding, TypeScript standard library, or tslib is missing from ${modules}`
      )
    }

    await fsp.mkdir(path.dirname(options.output), {
      recursive: true,
    })

    const embedded = {
      native: false,
      typescript: false,
      tslib: false,
      terser: false,
    }

    const result = await Bun.build({
      entrypoints: [dependencies.input],
      packages: 'bundle',
      compile: {
        target: target as Bun.Build.CompileTarget,
        outfile: options.output,
        assets: [
          path.join(modules, 'tslib'),
          path.join(modules, 'typescript', 'lib'),
        ],
      },
      plugins: [standalonePlugin(rollupNodeFile, embedded)],
    })

    if (!result.success) {
      for (const log of result.logs) {
        console.error(log.message)
      }
      throw new Error('Build failed')
    }

    if (
      !embedded.native ||
      !embedded.typescript ||
      !embedded.tslib ||
      !embedded.terser
    ) {
      await fsp.rm(options.output, {
        force: true,
      })
      throw new Error(
        'Standalone executable did not embed the Rollup native binding, TypeScript standard library, tslib, and terser'
      )
    }

    if (!(await isFile(options.output))) {
      throw new Error(
        `Build reported success but ${options.output} was not written`
      )
    }

    if (!options.silent) {
      console.info(`Built ${options.output} (${target})`)
    }
  } catch (error) {
    if (dependencies.temporary) {
      await fsp.rm(dependencies.temporary, {
        recursive: true,
        force: true,
      })
    }
    die(error)
  }

  if (dependencies.temporary) {
    await fsp.rm(dependencies.temporary, {
      recursive: true,
      force: true,
    })
  }
}
