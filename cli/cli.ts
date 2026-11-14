#!/usr/bin/env bun

import { Argv } from './argv'
import { check } from './commands/check'
import { compileSelf } from './commands/compile-self'
import { help } from './commands/help'
import { levelJson } from './commands/level-json'
import { levelJsonToParallax } from './commands/level-json-to-parallax'
import { midlet } from './commands/midlet'
import { pack } from './commands/pack'
import { run } from './commands/run'
import { unpack } from './commands/unpack'
import { schema } from './schema'
import { runMain, staticAssert, type IsNever } from './utils'

async function main() {
  const argv = new Argv({
    schema,
  })

  const parsed = await argv.parse()

  if (!parsed.success) {
    throw parsed.error
  }

  if (!parsed.data.silent) {
    console.info('This argv parsed:')
    console.info(JSON.stringify(parsed.data, null, 2))
    console.info()
  }

  const action = parsed.data[0]

  if (action === 'help') {
    help()
    return
  }

  if (action === 'compile-self') {
    await compileSelf(parsed.data)
    return
  }

  if (action === 'check') {
    await check(parsed.data)
    return
  }

  if (action === 'unpack') {
    await unpack(parsed.data)
    return
  }

  if (action === 'pack') {
    await pack(parsed.data)
    return
  }

  if (action === 'run') {
    await run(parsed.data)
    return
  }

  if (action === 'level-json') {
    await levelJson(parsed.data)
    return
  }

  if (action === 'level-json-to-parallax') {
    await levelJsonToParallax(parsed.data)
    return
  }

  if (action === 'midlet') {
    await midlet(parsed.data)
    return
  }

  staticAssert<IsNever<typeof action>>()
}

runMain(main)
