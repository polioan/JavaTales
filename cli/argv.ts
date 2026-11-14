import process from 'node:process'
import path from 'node:path'
import { z } from 'zod'
import { ArgvError } from './argv-error'
import {
  exists,
  isDirectory,
  isFile,
  staticAssert,
  stripPrefix,
  untildify,
  type IsNever,
} from './utils'

export type ArgvOptions<T extends z.ZodType> = {
  schema: T
  argv?: string[] | null | undefined
}

export type ArgvResult<T extends z.ZodType> =
  | {
      success: true
      data: z.output<T>
    }
  | {
      success: false
      error: ArgvError
    }

export class Argv<T extends z.ZodType> {
  private readonly marker = '--'
  private readonly delimiter = '='
  private readonly isSomeValidFlagName = /^[a-zA-Z-]+$/

  private readonly schema: T

  private readonly args: string[]

  constructor(options: ArgvOptions<T>) {
    this.schema = options.schema
    this.args = [...(options.argv ?? process.argv.slice(2))].filter(Boolean)
  }

  public async parse(): Promise<ArgvResult<T>> {
    const argv = this.args.filter(a => {
      return !a.startsWith(this.marker)
    })

    const seen = new Set<string>()

    const flags: [string, string][] = []

    for (const a of this.args.filter(a => {
      return a.startsWith(this.marker)
    })) {
      const [rawKey = '', rawValue = 'true', ...other] = a.split(this.delimiter)

      const key = stripPrefix(rawKey.trim(), this.marker).trim()

      if (!key) {
        return {
          success: false,
          error: new ArgvError(
            `Flag with marker of "${this.marker}" should have name, check your flags`
          ),
        } as const
      }

      if (!this.isSomeValidFlagName.test(key)) {
        return {
          success: false,
          error: new ArgvError(
            `Flag with marker of "${this.marker}" has not valid name of "${key}" (valid is - ${String(this.isSomeValidFlagName)}). This is not critical, but parsing stopped to make sure further parsing is properly validated`
          ),
        } as const
      }

      if (seen.has(key)) {
        return {
          success: false,
          error: new ArgvError(
            `Flag with marker of "${this.marker}" and name "${key}" was already detected, duplicate flags are not supported`
          ),
        } as const
      }

      seen.add(key)

      if (other.length > 0) {
        return {
          success: false,
          error: new ArgvError(
            `Got extra ${other.length} parts while parsing flag with marker of "${this.marker}" and delimiter of "${this.delimiter}". This is probably not intended`
          ),
        } as const
      }

      flags.push([key, rawValue])
    }

    const obj = Object.assign(argv, Object.fromEntries(flags))

    const validated = await this.schema.safeParseAsync(obj)

    if (!validated.success) {
      return {
        success: false,
        error: new ArgvError(
          'No overload for this argv found or provided data is not valid',
          {
            cause: validated.error,
          }
        ),
      } as const
    }

    return {
      success: true,
      data: validated.data,
    } as const
  }
}

function formatType(payload: unknown) {
  const type = typeof payload
  switch (type) {
    case 'undefined': {
      return 'nothing'
    }
    case 'string': {
      return `String(${payload})`
    }
    case 'number': {
      return `Number(${payload})`
    }
    case 'bigint': {
      return `Bigint(${payload})`
    }
    case 'boolean': {
      return `Boolean(${payload})`
    }
    case 'symbol': {
      return `Symbol(${String(payload)})`
    }
    case 'function': {
      return 'function'
    }
    case 'object': {
      if (payload == null) {
        return 'null'
      }
      if (Array.isArray(payload)) {
        return 'array'
      }
      return 'object'
    }
    default: {
      staticAssert<IsNever<typeof type>>()
      return 'never'
    }
  }
}

export const o = {
  flags<T extends z.ZodType, U extends z.ZodObject>(t: T, u: U) {
    return z.unknown().transform(async (arg, ctx) => {
      if (typeof arg !== 'object' || arg == null) {
        ctx.addIssue({
          code: 'custom',
          message: `Expected object+array for flags, got ${formatType(arg)}`,
        })
        return z.NEVER
      }

      if (!Array.isArray(arg)) {
        ctx.addIssue({
          code: 'custom',
          message: `Expected object+array for flags, got ${formatType(arg)}`,
        })
        return z.NEVER
      }

      const arrayPart: unknown[] = [...arg]

      const parsedArrayPart = await t.safeParseAsync(arrayPart)

      if (!parsedArrayPart.success) {
        for (const issue of parsedArrayPart.error.issues) {
          ctx.addIssue({
            ...issue,
          })
        }
        return z.NEVER
      }

      if (!Array.isArray(parsedArrayPart.data)) {
        ctx.addIssue({
          code: 'custom',
          message: `Array part of flags should be array, got ${formatType(parsedArrayPart.data)}. Probably developer fault`,
        })
        return z.NEVER
      }

      const objectPart: Record<string, unknown> = Object.fromEntries(
        Object.entries(arg).filter(([key]) => {
          return !/^\d+$/.test(key)
        })
      )

      const parsedObjectPart = await u.safeParseAsync(objectPart)

      if (!parsedObjectPart.success) {
        for (const issue of parsedObjectPart.error.issues) {
          ctx.addIssue({
            ...issue,
            continue: true,
          })
        }
        return z.NEVER
      }

      const result = Object.assign(parsedArrayPart.data, parsedObjectPart.data)

      return Object.assign(result, {
        toJSON(): any {
          return {
            ...Object.fromEntries(
              Array.isArray(parsedArrayPart.data)
                ? parsedArrayPart.data.map((value, index) => {
                    return [String(index), value] as const
                  })
                : []
            ),
            ...parsedObjectPart.data,
          }
        },
      })
    })
  },
  inputPath() {
    return z.unknown().transform(async (arg, ctx) => {
      if (typeof arg !== 'string') {
        ctx.addIssue({
          code: 'custom',
          message: `Expected string for inputPath, got ${formatType(arg)}`,
        })
        return z.NEVER
      }

      const resolved = untildify(arg.trim()).trim()

      if (!resolved) {
        ctx.addIssue({
          code: 'custom',
          message: 'Resolved inputPath is empty',
        })
        return z.NEVER
      }

      const full = path.resolve(resolved)

      if (!(await exists(full))) {
        ctx.addIssue({
          code: 'custom',
          message: `No inputPath exists for ${full}`,
        })
        return z.NEVER
      }

      return full
    })
  },
  inputFolder() {
    return z.unknown().transform(async (arg, ctx) => {
      if (typeof arg !== 'string') {
        ctx.addIssue({
          code: 'custom',
          message: `Expected string for inputFolder, got ${formatType(arg)}`,
        })
        return z.NEVER
      }

      const resolved = untildify(arg.trim()).trim()

      if (!resolved) {
        ctx.addIssue({
          code: 'custom',
          message: 'Resolved inputFolder path is empty',
        })
        return z.NEVER
      }

      const full = path.resolve(resolved)

      if (!(await isDirectory(full))) {
        ctx.addIssue({
          code: 'custom',
          message: `No inputFolder exists for ${full} or is not directory`,
        })
        return z.NEVER
      }

      return full
    })
  },
  inputFile() {
    return z.unknown().transform(async (arg, ctx) => {
      if (typeof arg !== 'string') {
        ctx.addIssue({
          code: 'custom',
          message: `Expected string for inputFile, got ${formatType(arg)}`,
        })
        return z.NEVER
      }

      const resolved = untildify(arg.trim()).trim()

      if (!resolved) {
        ctx.addIssue({
          code: 'custom',
          message: 'Resolved inputFile path is empty',
        })
        return z.NEVER
      }

      const full = path.resolve(resolved)

      if (!(await isFile(full))) {
        ctx.addIssue({
          code: 'custom',
          message: `No inputFile exists for ${full} or is not file`,
        })
        return z.NEVER
      }

      return full
    })
  },
  outputPath() {
    return z.unknown().transform((arg, ctx) => {
      if (typeof arg !== 'string') {
        ctx.addIssue({
          code: 'custom',
          message: `Expected string for outputPath, got ${formatType(arg)}`,
        })
        return z.NEVER
      }

      const resolved = untildify(arg.trim()).trim()

      if (!resolved) {
        ctx.addIssue({
          code: 'custom',
          message: 'Resolved outputPath is empty',
        })
        return z.NEVER
      }

      const full = path.resolve(resolved)

      return full
    })
  },
  booleanish() {
    const yes = ['yes', 'true', '1', 'on', 'enabled']
    const no = ['no', 'false', '0', 'off', 'disabled']

    return z.unknown().transform((arg, ctx) => {
      if (typeof arg === 'boolean') {
        return arg
      }

      if (arg === 0) {
        return false
      }
      if (arg === 1) {
        return true
      }

      if (typeof arg === 'string') {
        const normalized = arg.trim().toLowerCase()

        if (!normalized) {
          return true
        }

        if (yes.includes(normalized)) {
          return true
        }

        if (no.includes(normalized)) {
          return false
        }

        ctx.addIssue({
          code: 'custom',
          message: `Unknown value of ${arg} for booleanish value`,
        })
        return z.NEVER
      }

      ctx.addIssue({
        code: 'custom',
        message: `Expected string, boolean or 0/1 for booleanish, got ${formatType(arg)}`,
      })
      return z.NEVER
    })
  },
} as const
