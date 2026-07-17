function cleanMarkdown(value: string): string {
  return value
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*$/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/[*_~`]/g, '')
    .replace(/^\s*[-+>]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function isNoiseLine(line: string): boolean {
  const trimmed = line.trim()
  return !trimmed ||
    /^#{1,6}\s/.test(trimmed) ||
    /^!\[/.test(trimmed) ||
    /^<[^>]+>/.test(trimmed) ||
    /^\|?\s*:?-{3,}/.test(trimmed)
}

export function getReadableReadmeExcerpt(readme: string | null, maxLen = 180): string | null {
  if (!readme) return null

  const withoutCodeBlocks = readme.replace(/```[\s\S]*?```/g, '')
  for (const block of withoutCodeBlocks.split(/\r?\n\s*\r?\n/)) {
    const readableLines = block.split(/\r?\n/).filter((line) => !isNoiseLine(line))
    const text = cleanMarkdown(readableLines.join(' '))
    if (!text) continue
    return text.length > maxLen ? `${text.slice(0, maxLen).trimEnd()}…` : text
  }

  return null
}
