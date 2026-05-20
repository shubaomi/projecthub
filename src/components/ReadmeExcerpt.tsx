import { FileText } from 'lucide-react'

interface ReadmeExcerptProps {
  readme: string | null
  maxLen?: number
}

export function ReadmeExcerpt({ readme, maxLen = 200 }: ReadmeExcerptProps) {
  if (!readme) return null

  const text = readme.slice(0, maxLen)
  const truncated = readme.length > maxLen ? text + '...' : text

  return (
    <div className="flex items-start gap-1.5 text-xs text-stone-500 mt-2 mb-2 line-clamp-2">
      <FileText size={12} className="mt-0.5 shrink-0" />
      <span>{truncated}</span>
    </div>
  )
}
