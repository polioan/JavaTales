import { z } from 'zod'
import { o } from './argv'
import process from 'node:process'
import path from 'node:path'
import { isDirectory, untildify } from './utils'

async function readSourcesPathFromEnv() {
  const sourcesPath = process.env.JAVA_TALES_SOURCES?.trim()

  if (!sourcesPath) {
    return null
  }

  const resolved = path.resolve(untildify(sourcesPath))

  if (await isDirectory(resolved)) {
    return resolved
  }

  return null
}

const common = {
  silent: o
    .booleanish()
    .nullable()
    .optional()
    .transform(arg => {
      return arg ?? false
    }),
  sources: o
    .inputFolder()
    .nullable()
    .optional()
    .transform(async arg => {
      return arg ?? (await readSourcesPathFromEnv()) ?? process.cwd()
    }),
}

const compileSelf = o.flags(
  z.tuple([z.literal('compile-self')]),
  z.strictObject({
    target: z
      .enum([
        'bun-linux-x64',
        'bun-linux-arm64',
        'bun-windows-x64',
        'bun-windows-arm64',
        'bun-darwin-x64',
        'bun-darwin-arm64',
        'bun-linux-x64-musl',
        'bun-linux-arm64-musl',
        'linux-x64',
        'linux-arm64',
        'windows-x64',
        'windows-arm64',
        'darwin-x64',
        'darwin-arm64',
        'linux-x64-musl',
        'linux-arm64-musl',
        'auto',
      ])
      .nullable()
      .optional(),
    input: o
      .inputFile()
      .nullable()
      .optional()
      .transform(arg => {
        return arg ?? path.join(process.cwd(), 'cli', 'cli.ts')
      }),
    output: o
      .outputPath()
      .nullable()
      .optional()
      .transform(arg => {
        return arg ?? path.join(process.cwd(), 'java-tales')
      }),
    force: o
      .booleanish()
      .nullable()
      .optional()
      .transform(arg => {
        return arg ?? false
      }),
    ...common,
  })
)

export type CompileSelf = z.output<typeof compileSelf>

const help = o.flags(
  z
    .tuple([])
    .or(z.tuple([z.literal('help')]))
    .transform(arg => {
      return [arg[0] ?? 'help'] as const
    }),
  z.strictObject({
    help: z.string().nullable().optional(),
    ...common,
  })
)

export type Help = z.output<typeof help>

const check = o.flags(
  z.tuple([z.literal('check')]),
  z.strictObject({
    ...common,
  })
)

export type Check = z.output<typeof check>

const unpack = o.flags(
  z.tuple([z.literal('unpack')]),
  z.strictObject({
    input: o.inputFile(),
    output: o.outputPath(),
    force: o
      .booleanish()
      .nullable()
      .optional()
      .transform(arg => {
        return arg ?? false
      }),
    ...common,
  })
)

export type Unpack = z.output<typeof unpack>

const pack = o.flags(
  z.tuple([z.literal('pack')]),
  z.strictObject({
    input: o.inputFolder(),
    output: o.outputPath(),
    force: o
      .booleanish()
      .nullable()
      .optional()
      .transform(arg => {
        return arg ?? false
      }),
    ...common,
  })
)

export type Pack = z.output<typeof pack>

const run = o.flags(
  z.tuple([z.literal('run')]),
  z.strictObject({
    input: o.inputFile(),
    ...common,
  })
)

export type Run = z.output<typeof run>

const levelJson = o.flags(
  z.tuple([z.literal('level-json')]),
  z.strictObject({
    input: o.inputFile(),
    output: o.outputPath(),
    force: o
      .booleanish()
      .nullable()
      .optional()
      .transform(arg => {
        return arg ?? false
      }),
    ...common,
  })
)

export type LevelJson = z.output<typeof levelJson>

const levelJsonToParallax = o.flags(
  z.tuple([z.literal('level-json-to-parallax')]),
  z.strictObject({
    input: o.inputFile(),
    output: o.outputPath(),
    force: o
      .booleanish()
      .nullable()
      .optional()
      .transform(arg => {
        return arg ?? false
      }),
    ...common,
  })
)

export type LevelJsonToParallax = z.output<typeof levelJsonToParallax>

const midlet = o.flags(
  z.tuple([z.literal('midlet')]),
  z.strictObject({
    input: o.inputFile(),
    output: o.outputPath(),
    force: o
      .booleanish()
      .nullable()
      .optional()
      .transform(arg => {
        return arg ?? false
      }),
    ...common,
  })
)

export type Midlet = z.output<typeof midlet>

export const schema = z.union([
  help,
  compileSelf,
  check,
  unpack,
  pack,
  run,
  levelJson,
  levelJsonToParallax,
  midlet,
])

export type Schema = z.output<typeof schema>
