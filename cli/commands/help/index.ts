import readme from '../../../README.md' with { type: 'text' }

function helpChunkFromReadme() {
  const lines = readme.split('\n')

  const start = lines.findIndex(line => {
    return (
      line.startsWith('##') &&
      !line.startsWith('###') &&
      line.toLowerCase().includes('cli')
    )
  })

  if (start === -1) {
    throw new Error('No help found!')
  }

  const end = lines.findIndex((line, i) => {
    return i > start && line.startsWith('#') && !line.startsWith('###')
  })

  return lines
    .slice(start + 1, end === -1 ? void 0 : end)
    .join('\n')
    .trim()
}

export function help() {
  console.info(helpChunkFromReadme())
}
